import { Chess, type Color, type Square } from "chess.js";
export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "computer" | "local";
export type ResultReason =
  | "checkmate"
  | "stalemate"
  | "insufficient"
  | "repetition"
  | "fifty"
  | "timeout"
  | "resignation"
  | "agreement";
export interface GameResult {
  winner: Color | null;
  reason: ResultReason;
}
export interface ClockState {
  w: number;
  b: number;
  active: Color;
  since: number;
  increment: number;
  timed: boolean;
}
export interface Premove {
  from: Square;
  to: Square;
  promotion: string;
  color: Color;
}
export interface GameSession {
  premoves?: Premove[];
  id: string;
  mode: GameMode;
  human: Color;
  difficulty: Difficulty;
  time: string;
  moves: string[];
  clock: ClockState;
  result: GameResult | null;
  paused: boolean;
  startedAt: number;
}
export const timeControls = [
  "1+0",
  "3+0",
  "5+0",
  "10+0",
  "3+2",
  "untimed",
] as const;
export function position(moves: string[], initialFen?: string): Chess {
  const chess = new Chess(initialFen);
  for (const move of moves) chess.move(move);
  return chess;
}
export function legalMove(
  chess: Chess,
  from: Square,
  to: Square,
  promotion = "q",
) {
  try {
    return chess.move({ from, to, promotion });
  } catch {
    return null;
  }
}
export function boardResult(chess: Chess): GameResult | null {
  if (chess.isCheckmate())
    return { winner: chess.turn() === "w" ? "b" : "w", reason: "checkmate" };
  if (chess.isStalemate()) return { winner: null, reason: "stalemate" };
  if (chess.isInsufficientMaterial())
    return { winner: null, reason: "insufficient" };
  if (chess.isThreefoldRepetition())
    return { winner: null, reason: "repetition" };
  if (chess.isDrawByFiftyMoves()) return { winner: null, reason: "fifty" };
  return null;
}
export function createSession(
  mode: GameMode,
  human: Color,
  difficulty: Difficulty,
  time: string,
  now = Date.now(),
): GameSession {
  const [minutes, increment] = time.split("+").map(Number);
  const initial = time === "untimed" ? 0 : minutes * 60_000;
  return {
    id: crypto.randomUUID(),
    mode,
    human,
    difficulty,
    time,
    moves: [],
    premoves: [],
    result: null,
    paused: false,
    startedAt: now,
    clock: {
      w: initial,
      b: initial,
      active: "w",
      since: now,
      increment: (increment || 0) * 1000,
      timed: time !== "untimed",
    },
  };
}
