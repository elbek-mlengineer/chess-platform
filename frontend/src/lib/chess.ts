import { Chess, type Color, type Square } from "chess.js";
import type { TextKey } from "./i18n";
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
  premove?: Premove | null;
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
export function resultLabel(result: GameResult): TextKey {
  if (result.winner === "w") return "whiteWins";
  if (result.winner === "b") return "blackWins";
  return "draw";
}
function pgnResult(result: GameResult | null): string {
  if (!result) return "*";
  if (result.winner === "w") return "1-0";
  if (result.winner === "b") return "0-1";
  return "1/2-1/2";
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
export function exportPgn(session: GameSession) {
  const chess = position(session.moves);
  chess.header(
    "Event",
    "Shatranj local demo",
    "Date",
    new Date(session.startedAt).toISOString().slice(0, 10).replaceAll("-", "."),
    "White",
    session.mode === "computer" && session.human === "b"
      ? "Shatranj computer"
      : "Local player",
    "Black",
    session.mode === "computer" && session.human === "w"
      ? "Shatranj computer"
      : "Local player",
    "Result",
    pgnResult(session.result),
  );
  return chess.pgn();
}
export function downloadPgn(session: GameSession) {
  const url = URL.createObjectURL(
    new Blob([exportPgn(session)], { type: "application/x-chess-pgn" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `shatranj-${session.id.slice(0, 8)}.pgn`;
  a.click();
  URL.revokeObjectURL(url);
}
