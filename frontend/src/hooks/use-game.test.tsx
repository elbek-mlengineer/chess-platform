import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppProvider, useApp } from "@/components/provider";
import { useGame } from "./use-game";
import { createSession, position } from "@/lib/chess";
import { dataKey, emptyData } from "@/lib/storage";
vi.mock("next/navigation", () => ({ usePathname: () => "/play" }));
class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    MockWorker.instances.push(this);
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-29T12:00:00Z"));
  MockWorker.instances = [];
  vi.stubGlobal("Worker", MockWorker);
});
function mount(mode: "computer" | "local" = "local", human: "w" | "b" = "w") {
  const game = createSession(mode, human, "medium", "3+2");
  localStorage.setItem(dataKey, JSON.stringify({ ...emptyData, active: game }));
  const hook = renderHook(() => ({ game: useGame(), app: useApp() }), {
    wrapper: AppProvider,
  });
  act(() => vi.advanceTimersByTime(1));
  return hook;
}
describe("game lifecycle", () => {
  it("restores paused, resumes explicitly, switches clocks, and applies increment", () => {
    const { result } = mount();
    expect(result.current.game.session?.paused).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.game.session?.clock.w).toBe(180000);
    act(() => result.current.game.resume());
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.game.move("e2", "e4", "q"));
    expect(result.current.game.session?.moves).toEqual(["e4"]);
    expect(result.current.game.session?.clock.w).toBe(179000);
    expect(result.current.game.session?.clock.active).toBe("b");
  });
  it("adjudicates timeout once and blocks further moves", () => {
    const { result } = mount();
    act(() => result.current.game.resume());
    act(() => vi.advanceTimersByTime(181000));
    expect(result.current.game.session?.result).toEqual({
      winner: "b",
      reason: "timeout",
    });
    expect(result.current.app.data.history).toHaveLength(1);
    act(() => result.current.game.move("e2", "e4", "q"));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.game.session?.moves).toHaveLength(0);
    expect(result.current.app.data.history).toHaveLength(1);
  });
  it("pauses on unmount and clears clock and snapshot intervals", () => {
    const clear = vi.spyOn(window, "clearInterval");
    const hook = mount();
    act(() => hook.result.current.game.resume());
    hook.unmount();
    expect(clear.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("terminates the worker and ignores a late response after reset", () => {
    const { result } = mount("computer", "b");
    act(() => result.current.game.resume());
    act(() => vi.advanceTimersByTime(350));
    const oldWorker = MockWorker.instances.at(-1)!;
    const previous = result.current.game.session!;
    const oldFen = position(previous.moves).fen();
    act(() =>
      result.current.app.setData((data) => ({
        ...data,
        active: createSession("local", "w", "easy", "untimed"),
      })),
    );
    expect(oldWorker.terminate).toHaveBeenCalled();
    act(() =>
      oldWorker.onmessage?.(
        new MessageEvent("message", {
          data: { id: previous.id, fen: oldFen, move: "e4" },
        }),
      ),
    );
    expect(result.current.game.session?.moves).toEqual([]);
  });
  it("accepts one computer move and rejects duplicate responses", () => {
    const { result } = mount("computer", "b");
    act(() => result.current.game.resume());
    act(() => vi.advanceTimersByTime(350));
    const worker = MockWorker.instances.at(-1)!;
    const session = result.current.game.session!;
    const response = new MessageEvent("message", {
      data: { id: session.id, fen: position(session.moves).fen(), move: "e4" },
    });
    act(() => worker.onmessage?.(response));
    act(() => worker.onmessage?.(response));
    expect(result.current.game.session?.moves).toEqual(["e4"]);
    expect(result.current.game.thinking).toBe(false);
  });
  it("saves the elapsed clock snapshot and preserves the game on reload", () => {
    const hook = mount();
    act(() => hook.result.current.game.resume());
    act(() => vi.advanceTimersByTime(4500));
    const saved = JSON.parse(localStorage.getItem(dataKey) || "{}");
    expect(saved.active.clock.w).toBeLessThan(177000);
    expect(saved.active.paused).toBe(true);
  });
  it("blocks a move after background time elapsed before an interval runs", () => {
    const { result } = mount();
    act(() => result.current.game.resume());
    vi.setSystemTime(Date.now() + 181000);
    act(() => result.current.game.move("e2", "e4", "q"));
    expect(result.current.game.session?.result?.reason).toBe("timeout");
    expect(result.current.game.session?.moves).toEqual([]);
  });
  it("stops thinking and offers recovery when a worker never replies", () => {
    const { result } = mount("computer", "b");
    act(() => result.current.game.resume());
    act(() => vi.advanceTimersByTime(6400));
    expect(result.current.game.engineError).toBe(true);
    expect(result.current.game.thinking).toBe(false);
    expect(MockWorker.instances.at(-1)?.terminate).toHaveBeenCalled();
  });
  it("keeps the same worker search when a premove is queued or cancelled", () => {
    const { result } = mount("computer", "w");
    act(() => result.current.game.resume());
    act(() => result.current.game.move("e2", "e4", "q"));
    act(() => vi.advanceTimersByTime(350));
    const worker = MockWorker.instances.at(-1)!;
    const count = MockWorker.instances.length;
    act(() => result.current.game.move("g1", "f3", "q"));
    expect(result.current.game.session?.premoves?.[0]?.to).toBe("f3");
    expect(MockWorker.instances).toHaveLength(count);
    expect(worker.terminate).not.toHaveBeenCalled();
    act(() => result.current.game.cancelPremove());
    expect(result.current.game.session?.premoves).toEqual([]);
    expect(worker.terminate).not.toHaveBeenCalled();
    act(() => result.current.game.move("g1", "f3", "q"));
    const game = result.current.game.session!;
    act(() =>
      worker.onmessage?.(
        new MessageEvent("message", {
          data: { id: game.id, fen: position(game.moves).fen(), move: "Nc6" },
        }),
      ),
    );
    expect(result.current.game.session?.moves).toEqual(["e4", "Nc6", "Nf3"]);
    expect(result.current.game.session?.premoves).toEqual([]);
  });
});
