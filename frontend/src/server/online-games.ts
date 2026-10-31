import { SQUARES, type Color, type Square } from "chess.js";
import type { DatabaseSync } from "node:sqlite";
import {
  boardResult,
  legalMove,
  position,
  type GameResult,
  type Premove,
} from "@/lib/chess";
import { clockAt, switchClock } from "@/lib/clock";
import { premoveDestinations } from "@/lib/premove";
import { OnlineError, type OnlineGame } from "@/lib/online";
import { publicUser } from "./auth";
import { numberColumn, textColumn } from "./database";

export interface StoredGame extends OnlineGame {
  whitePremove: Premove | null;
  blackPremove: Premove | null;
}
export function square(value: unknown): Square {
  const found = SQUARES.find((item) => item === value);
  if (!found) throw new OnlineError("invalidMove");
  return found;
}
function color(value: unknown): Color {
  if (value === "w" || value === "b") return value;
  throw new Error("Invalid stored color");
}
function readPremove(value: unknown): Premove | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("Invalid stored premove");
  const parsed: unknown = JSON.parse(value);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("from" in parsed) ||
    !("to" in parsed) ||
    !("color" in parsed) ||
    !("promotion" in parsed) ||
    typeof parsed.promotion !== "string"
  )
    throw new Error("Invalid stored premove");
  return {
    from: square(parsed.from),
    to: square(parsed.to),
    color: color(parsed.color),
    promotion: parsed.promotion,
  };
}
function readResult(row: Record<string, unknown>): GameResult | null {
  if (row.reason === null) return null;
  const reason = row.reason;
  if (
    reason !== "checkmate" &&
    reason !== "stalemate" &&
    reason !== "insufficient" &&
    reason !== "repetition" &&
    reason !== "fifty" &&
    reason !== "timeout" &&
    reason !== "resignation" &&
    reason !== "agreement"
  )
    throw new Error("Invalid stored result");
  return { winner: row.winner === null ? null : color(row.winner), reason };
}
export function readGame(
  db: DatabaseSync,
  row: Record<string, unknown>,
  now: number,
): StoredGame {
  const moves: unknown = JSON.parse(textColumn(row, "moves"));
  if (
    !Array.isArray(moves) ||
    !moves.every((move): move is string => typeof move === "string")
  )
    throw new Error("Invalid stored moves");
  const white = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(textColumn(row, "white_id"));
  const black = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(textColumn(row, "black_id"));
  if (!white || !black) throw new Error("Missing game participant");
  return {
    id: textColumn(row, "id"),
    white: publicUser(white, now),
    black: publicUser(black, now),
    moves,
    time: textColumn(row, "time"),
    startedAt: numberColumn(row, "started_at"),
    clock: {
      w: numberColumn(row, "white_ms"),
      b: numberColumn(row, "black_ms"),
      active: color(row.active),
      since: numberColumn(row, "since"),
      increment: numberColumn(row, "increment_ms"),
      timed: row.time !== "untimed",
    },
    result: readResult(row),
    drawOffer: row.draw_offer === null ? null : color(row.draw_offer),
    premove: null,
    whitePremove: readPremove(row.white_premove),
    blackPremove: readPremove(row.black_premove),
  };
}
export function saveGame(db: DatabaseSync, game: StoredGame) {
  db.prepare(
    `UPDATE games SET moves = ?, white_ms = ?, black_ms = ?, active = ?, since = ?, winner = ?, reason = ?, draw_offer = ?, white_premove = ?, black_premove = ? WHERE id = ?`,
  ).run(
    JSON.stringify(game.moves),
    game.clock.w,
    game.clock.b,
    game.clock.active,
    game.clock.since,
    game.result?.winner ?? null,
    game.result?.reason ?? null,
    game.drawOffer,
    game.whitePremove ? JSON.stringify(game.whitePremove) : null,
    game.blackPremove ? JSON.stringify(game.blackPremove) : null,
    game.id,
  );
}
export function finishOnlineGame(
  game: StoredGame,
  result: GameResult,
  now: number,
): StoredGame {
  return {
    ...game,
    clock: { ...game.clock, ...clockAt(game.clock, now), since: now },
    result,
    drawOffer: null,
    whitePremove: null,
    blackPremove: null,
  };
}
export function expireGame(game: StoredGame, now: number): StoredGame {
  if (
    game.result ||
    !game.clock.timed ||
    clockAt(game.clock, now)[game.clock.active] > 0
  )
    return game;
  const winner = game.clock.active === "w" ? "b" : "w";
  const chess = position(game.moves);
  // A bare king cannot win on time. Full FIDE mating-possibility adjudication is outside this casual mode.
  const hasMaterial = chess
    .board()
    .flat()
    .some((piece) => piece?.color === winner && piece.type !== "k");
  return finishOnlineGame(
    game,
    { winner: hasMaterial ? winner : null, reason: "timeout" },
    now,
  );
}
export function publicGame(game: StoredGame, userId: string): OnlineGame {
  const { whitePremove, blackPremove, ...view } = game;
  return {
    ...view,
    premove: game.white.id === userId ? whitePremove : blackPremove,
  };
}
export function participantColor(game: StoredGame, userId: string): Color {
  if (game.white.id === userId) return "w";
  if (game.black.id === userId) return "b";
  throw new OnlineError("forbidden", 403);
}
function applyMove(
  game: StoredGame,
  from: Square,
  to: Square,
  promotion: string,
  now: number,
): StoredGame | null {
  const chess = position(game.moves);
  const move = legalMove(chess, from, to, promotion);
  if (!move) return null;
  const next = {
    ...game,
    moves: [...game.moves, move.san],
    clock: switchClock(game.clock, now),
    drawOffer: null,
  };
  const result = boardResult(chess);
  return result ? finishOnlineGame(next, result, now) : next;
}
export function moveOnlineGame(
  game: StoredGame,
  userId: string,
  from: Square,
  to: Square,
  promotion: string,
  ply: number,
  now: number,
): StoredGame {
  const ownColor = participantColor(game, userId);
  if (game.result) throw new OnlineError("gameFinished", 409);
  if (ply !== game.moves.length) throw new OnlineError("stalePosition", 409);
  const chess = position(game.moves);
  if (
    chess.get(from)?.color !== ownColor ||
    !["q", "r", "b", "n"].includes(promotion)
  )
    throw new OnlineError("invalidMove");
  if (chess.turn() !== ownColor) {
    if (!premoveDestinations(chess, from, ownColor).includes(to))
      throw new OnlineError("invalidMove");
    const premove = { from, to, promotion, color: ownColor };
    return ownColor === "w"
      ? { ...game, whitePremove: premove }
      : { ...game, blackPremove: premove };
  }
  let next = applyMove(game, from, to, promotion, now);
  if (!next) throw new OnlineError("invalidMove");
  if (next.result) return next;
  const queued = ownColor === "w" ? next.blackPremove : next.whitePremove;
  if (!queued) return next;
  next =
    queued.color === "w"
      ? { ...next, whitePremove: null }
      : { ...next, blackPremove: null };
  // Both plies commit together; a plan made illegal by the opponent is consumed without moving.
  return applyMove(next, queued.from, queued.to, queued.promotion, now) ?? next;
}
