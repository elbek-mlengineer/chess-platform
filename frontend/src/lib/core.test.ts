import { describe, it, expect, vi } from "vitest";
import { Chess } from "chess.js";
import {
  boardResult,
  legalMove,
  position,
  createSession,
  exportPgn,
} from "./chess";
import { clockAt, switchClock } from "./clock";
import { puzzles, tryPuzzleMove } from "./puzzles";
import {
  parseData,
  parsePreferences,
  validSession,
  emptyData,
  loadLocal,
  dataKey,
  preferenceKey,
  defaultPreferences,
  saveLocal,
} from "./storage";
import { findBestMove, engineResponseIsCurrent } from "./engine";
describe("chess rules", () => {
  it("rejects illegal moves without changing position", () => {
    const chess = new Chess();
    const before = chess.fen();
    expect(legalMove(chess, "e2", "e5")).toBeNull();
    expect(chess.fen()).toBe(before);
  });
  it("allows castling and rejects castling through check", () => {
    const chess = position(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]);
    expect(legalMove(chess, "e1", "g1")?.isKingsideCastle()).toBe(true);
    expect(
      legalMove(
        new Chess("r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1"),
        "e1",
        "g1",
      ),
    ).toBeNull();
  });
  it("handles en passant", () => {
    const chess = position(["e4", "a6", "e5", "d5"]);
    expect(legalMove(chess, "e5", "d6")?.isEnPassant()).toBe(true);
    expect(chess.get("d5")).toBeUndefined();
  });
  it("allows every promotion including underpromotion", () => {
    for (const promotion of ["q", "r", "b", "n"]) {
      const chess = new Chess("8/P6k/8/8/8/8/8/7K w - - 0 1");
      expect(legalMove(chess, "a7", "a8", promotion)?.promotion).toBe(
        promotion,
      );
    }
  });
  it("detects mate, stalemate, and material draws", () => {
    expect(boardResult(position(["f3", "e5", "g4", "Qh4#"]))).toEqual({
      winner: "b",
      reason: "checkmate",
    });
    expect(
      boardResult(new Chess("7k/5K2/6Q1/8/8/8/8/8 b - - 0 1"))?.reason,
    ).toBe("stalemate");
    expect(boardResult(new Chess("7k/8/5K2/8/8/8/8/8 w - - 0 1"))?.reason).toBe(
      "insufficient",
    );
  });
  it("detects repetition", () => {
    expect(
      boardResult(
        position(["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]),
      )?.reason,
    ).toBe("repetition");
  });
});
describe("timestamp clocks", () => {
  const clock = {
    w: 180_000,
    b: 180_000,
    active: "w" as const,
    since: 1000,
    increment: 2000,
    timed: true,
  };
  it("charges elapsed time and switches with increment", () => {
    const next = switchClock(clock, 6000);
    expect(next.w).toBe(177_000);
    expect(next.active).toBe("b");
    expect(clockAt(next, 9000)).toEqual({ w: 177_000, b: 177_000 });
  });
  it("clamps timeout and does not charge a paused clock", () => {
    expect(clockAt(clock, 500_000).w).toBe(0);
    expect(clockAt(clock, 500_000, false).w).toBe(180_000);
  });
});
describe("computer engine", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "returns a legal move at %s level",
    (level) => {
      const chess = new Chess();
      const move = findBestMove(chess.fen(), level, 100);
      expect(move).not.toBeNull();
      expect(chess.moves()).toContain(move);
    },
  );
  it("returns no move for terminal positions", () =>
    expect(
      findBestMove(position(["f3", "e5", "g4", "Qh4#"]).fen(), "easy"),
    ).toBeNull());
  it("rejects results from another game or position", () => {
    const request = { id: "old", fen: "before" };
    expect(engineResponseIsCurrent(request, { id: "new", fen: "before" })).toBe(
      false,
    );
    expect(engineResponseIsCurrent(request, { id: "old", fen: "after" })).toBe(
      false,
    );
    expect(engineResponseIsCurrent(request, request)).toBe(true);
  });
});
describe("tactical puzzles", () => {
  it.each(puzzles)("verifies every move in puzzle $id", (puzzle) => {
    const chess = new Chess(puzzle.fen);
    expect(chess.isCheck()).toBe(false);
    for (const move of puzzle.line)
      expect(() => chess.move(move)).not.toThrow();
    if (puzzle.theme === "mate") expect(chess.isCheckmate()).toBe(true);
  });
  it("leaves incorrect attempts unchanged and completes a solution", () => {
    const puzzle = puzzles[0];
    expect(tryPuzzleMove(puzzle, [], "e1", "e2", "q")).toEqual({
      moves: [],
      correct: false,
      complete: false,
    });
    expect(tryPuzzleMove(puzzle, [], "e1", "e8", "q").complete).toBe(true);
  });
  it("accepts alternative immediate mates", () => {
    expect(tryPuzzleMove(puzzles[1], [], "g6", "h6", "q").complete).toBe(true);
  });
  it("completes a multi-move fork after the opponent reply", () => {
    const p = puzzles[3];
    expect(tryPuzzleMove(p, [], "d5", "c7", "q")).toMatchObject({
      correct: true,
      complete: false,
    });
    expect(tryPuzzleMove(p, ["Nc7+", "Kd8"], "c7", "a8", "q").complete).toBe(
      true,
    );
  });
});
describe("versioned persistence", () => {
  it("recovers clean defaults for a new visitor", () => {
    expect(parseData(null)).toEqual(emptyData);
    expect(parsePreferences(null).locale).toBe("uz");
  });
  it("rejects invalid JSON, preferences, positions, and unbounded history", () => {
    expect(() => parseData("{")).toThrow();
    expect(() => parsePreferences('{"locale":"xx"}')).toThrow();
    expect(() =>
      parseData(JSON.stringify({ ...emptyData, history: Array(101).fill({}) })),
    ).toThrow();
    expect(validSession({ moves: ["invalid"] })).toBe(false);
  });
});

describe("data recovery and export", () => {
  it("recovers corrupted preferences independently of valid game data", () => {
    const game = createSession("local", "w", "medium", "untimed");
    localStorage.setItem(preferenceKey, "{");
    localStorage.setItem(
      dataKey,
      JSON.stringify({ ...emptyData, active: game }),
    );
    const saved = loadLocal();
    expect(saved.error).toBe(true);
    expect(saved.preferences).toEqual(defaultPreferences);
    expect(saved.data.active?.id).toBe(game.id);
    expect(saved.data.active?.paused).toBe(true);
  });
  it("keeps playing when browser storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    expect(loadLocal()).toMatchObject({ data: emptyData, error: true });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota");
    });
    expect(saveLocal(dataKey, emptyData)).toBe(false);
  });
  it("exports a complete, importable game with its actual result", () => {
    const game = createSession("local", "w", "medium", "untimed");
    game.moves = ["f3", "e5", "g4", "Qh4#"];
    game.result = { winner: "b", reason: "checkmate" };
    const pgn = exportPgn(game);
    const restored = new Chess();
    restored.loadPgn(pgn);
    expect(restored.history()).toEqual(game.moves);
    expect(restored.getHeaders().Result).toBe("0-1");
  });
  it("recognizes the fifty-move rule at its boundary", () => {
    expect(
      boardResult(new Chess("7k/8/5K2/8/8/8/8/R7 w - - 100 80"))?.reason,
    ).toBe("fifty");
  });
});
