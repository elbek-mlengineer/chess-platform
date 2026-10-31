import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { createSession, position, type GameSession } from "./chess";
import { playOrQueueMove, finishGame } from "./game";
import { premoveDestinations } from "./premove";
import { loadLocal, emptyData, dataKey } from "./storage";
function gameAfter(
  moves: string[],
  mode: "computer" | "local" = "computer",
): GameSession {
  const game = createSession(mode, "w", "medium", "3+2", 1000);
  return {
    ...game,
    moves,
    clock: { ...game.clock, active: position(moves).turn() },
  };
}
describe("premove transactions", () => {
  it("queues without moving pieces or changing either clock", () => {
    const game = gameAfter(["e4"]);
    const next = playOrQueueMove(
      game,
      { from: "g1", to: "f3", promotion: "q" },
      2000,
    );
    expect(next.moves).toEqual(game.moves);
    expect(next.clock).toEqual(game.clock);
    expect(next.premove).toEqual({
      from: "g1",
      to: "f3",
      promotion: "q",
      color: "w",
    });
  });
  it("executes a legal reply once and applies both increments", () => {
    const queued = playOrQueueMove(
      gameAfter(["e4"]),
      { from: "g1", to: "f3", promotion: "q" },
      1500,
    );
    const next = playOrQueueMove(
      queued,
      { from: "b8", to: "c6", promotion: "q", engine: true },
      3000,
    );
    expect(next.moves).toEqual(["e4", "Nc6", "Nf3"]);
    expect(next.premove).toBeNull();
    expect(next.clock).toMatchObject({
      w: 182000,
      b: 180000,
      active: "b",
      since: 3000,
    });
    expect(
      playOrQueueMove(
        next,
        { from: "b8", to: "c6", promotion: "q", engine: true },
        3000,
      ),
    ).toBe(next);
  });
  it("discards a premove when its piece is captured", () => {
    const queued = playOrQueueMove(
      gameAfter(["e4", "d5", "a3"]),
      { from: "e4", to: "e5", promotion: "q" },
      1500,
    );
    const next = playOrQueueMove(
      queued,
      { from: "d5", to: "e4", promotion: "q", engine: true },
      2000,
    );
    expect(next.moves).toEqual(["e4", "d5", "a3", "dxe4"]);
    expect(next.premove).toBeNull();
  });
  it("discards a premove that does not answer a new check", () => {
    const moves = ["e4", "e5", "Bc4", "Nc6", "d3"];
    const queued = playOrQueueMove(
      gameAfter(moves),
      { from: "g1", to: "f3", promotion: "q" },
      1500,
    );
    const next = playOrQueueMove(
      queued,
      { from: "f8", to: "b4", promotion: "q", engine: true },
      2000,
    );
    expect(next.moves).toEqual([...moves, "Bb4+"]);
    expect(next.premove).toBeNull();
    expect(position(next.moves).isCheck()).toBe(true);
  });
  it("never executes a reply after checkmate or timeout", () => {
    const queued = playOrQueueMove(
      gameAfter(["f3", "e5", "g4"]),
      { from: "b1", to: "c3", promotion: "q" },
      1500,
    );
    const mate = playOrQueueMove(
      queued,
      { from: "d8", to: "h4", promotion: "q", engine: true },
      2000,
    );
    expect(mate.result?.reason).toBe("checkmate");
    expect(mate.moves).toHaveLength(4);
    expect(mate.premove).toBeNull();
    const expired = playOrQueueMove(
      queued,
      { from: "d8", to: "h4", promotion: "q", engine: true },
      200000,
    );
    expect(expired.result?.reason).toBe("timeout");
    expect(expired.moves).toHaveLength(3);
    expect(expired.premove).toBeNull();
  });
  it("permits conditional pawn captures and validates them after the opponent moves", () => {
    const game = gameAfter(["e4"]);
    expect(premoveDestinations(position(game.moves), "e4", "w")).toContain(
      "d5",
    );
    const queued = playOrQueueMove(
      game,
      { from: "e4", to: "d5", promotion: "q" },
      1500,
    );
    const next = playOrQueueMove(
      queued,
      { from: "d7", to: "d5", promotion: "q", engine: true },
      2000,
    );
    expect(next.moves).toEqual(["e4", "d5", "exd5"]);
  });
  it("supports en passant and castling premoves using actual chess.js legality", () => {
    let queued = playOrQueueMove(
      gameAfter(["e4", "a6", "e5"]),
      { from: "e5", to: "d6", promotion: "q" },
      1500,
    );
    let next = playOrQueueMove(
      queued,
      { from: "d7", to: "d5", promotion: "q", engine: true },
      2000,
    );
    expect(
      position(next.moves).history({ verbose: true }).at(-1)?.isEnPassant(),
    ).toBe(true);
    queued = playOrQueueMove(
      gameAfter(["e4", "e5", "Nf3", "Nc6", "Bc4"]),
      { from: "e1", to: "g1", promotion: "q" },
      1500,
    );
    next = playOrQueueMove(
      queued,
      { from: "g8", to: "f6", promotion: "q", engine: true },
      2000,
    );
    expect(
      position(next.moves)
        .history({ verbose: true })
        .at(-1)
        ?.isKingsideCastle(),
    ).toBe(true);
  });
  it("preserves a chosen underpromotion in the queued reply", () => {
    const moves = ["a4", "h5", "a5", "h4", "a6", "h3", "axb7"];
    const queued = playOrQueueMove(
      gameAfter(moves),
      { from: "b7", to: "c8", promotion: "n" },
      1500,
    );
    const next = playOrQueueMove(
      queued,
      { from: "h3", to: "g2", promotion: "q", engine: true },
      2000,
    );
    expect(position(next.moves).get("c8")).toEqual({ type: "n", color: "w" });
    expect(next.premove).toBeNull();
  });
  it("supports the waiting side in local two-player mode", () => {
    const queued = playOrQueueMove(
      gameAfter([], "local"),
      { from: "g8", to: "f6", promotion: "q" },
      1500,
    );
    const next = playOrQueueMove(
      queued,
      { from: "e2", to: "e4", promotion: "q" },
      2000,
    );
    expect(next.moves).toEqual(["e4", "Nf6"]);
  });
  it("rejects opponent-piece input, impossible plans, and plans while paused", () => {
    const game = gameAfter(["e4"]);
    expect(
      playOrQueueMove(game, { from: "e7", to: "e5", promotion: "q" }, 1500),
    ).toBe(game);
    expect(
      playOrQueueMove(game, { from: "g1", to: "g5", promotion: "q" }, 1500),
    ).toBe(game);
    const paused = { ...game, paused: true };
    expect(
      playOrQueueMove(paused, { from: "g1", to: "f3", promotion: "q" }, 1500),
    ).toBe(paused);
  });
  it("clears queued intent after completion and reload recovery", () => {
    const queued = playOrQueueMove(
      gameAfter(["e4"]),
      { from: "g1", to: "f3", promotion: "q" },
      1500,
    );
    expect(
      finishGame(queued, { winner: "b", reason: "resignation" }, 2000).premove,
    ).toBeNull();
    localStorage.setItem(
      dataKey,
      JSON.stringify({ ...emptyData, active: queued }),
    );
    expect(loadLocal().data.active?.premove).toBeNull();
  });
  it("never treats speculative hints as real position changes", () => {
    const chess = new Chess();
    const fen = chess.fen();
    premoveDestinations(chess, "g8", "b");
    expect(chess.fen()).toBe(fen);
  });
});
