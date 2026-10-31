import { position, type GameResult, type GameSession } from "@shatranj/shared";
import type { TextKey } from "./i18n";
export {
  boardResult,
  createSession,
  legalMove,
  position,
  timeControls,
  type Difficulty,
  type GameMode,
  type ResultReason,
  type GameResult,
  type ClockState,
  type Premove,
  type GameSession,
} from "@shatranj/shared";
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
