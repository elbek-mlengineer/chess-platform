import type { Square } from "chess.js";
import {
  boardResult,
  legalMove,
  position,
  type GameResult,
  type GameSession,
} from "./chess";
import { clockAt, switchClock } from "./clock";
import { engineResponseIsCurrent } from "./engine";
import { premoveDestinations } from "./premove";
export interface MoveInput {
  from: Square;
  to: Square;
  promotion: string;
  engine?: boolean;
  expected?: { id: string; fen: string };
}
export function finishGame(
  game: GameSession,
  result: GameResult,
  now: number,
): GameSession {
  return {
    ...game,
    clock: {
      ...game.clock,
      ...clockAt(game.clock, now, !game.paused),
      since: now,
    },
    result,
    paused: false,
    premove: null,
  };
}
function timeoutResult(game: GameSession, now: number): GameSession | null {
  if (!game.clock.timed || clockAt(game.clock, now)[game.clock.active] > 0)
    return null;
  return finishGame(
    game,
    { winner: game.clock.active === "w" ? "b" : "w", reason: "timeout" },
    now,
  );
}
function applyLegalMove(
  game: GameSession,
  input: MoveInput,
  now: number,
): GameSession {
  const expired = timeoutResult(game, now);
  if (expired) return expired;
  const chess = position(game.moves);
  const move = legalMove(chess, input.from, input.to, input.promotion);
  if (!move) return game;
  const next = {
    ...game,
    moves: [...game.moves, move.san],
    clock: switchClock(game.clock, now),
  };
  const result = boardResult(chess);
  return result ? finishGame(next, result, now) : next;
}
/** One transaction records the opponent's move and, if legal, one queued reply. */
export function playOrQueueMove(
  game: GameSession,
  input: MoveInput,
  now: number,
): GameSession {
  if (game.result || game.paused) return game;
  const chess = position(game.moves);
  if (
    input.expected &&
    !engineResponseIsCurrent(input.expected, { id: game.id, fen: chess.fen() })
  )
    return game;
  const piece = chess.get(input.from);
  if (!piece) return game;
  if (game.mode === "computer") {
    if (input.engine && chess.turn() === game.human) return game;
    if (!input.engine && piece.color !== game.human) return game;
  }
  const expired = timeoutResult(game, now);
  if (expired) return expired;
  if (piece.color !== chess.turn()) {
    if (
      input.engine ||
      !["q", "r", "b", "n"].includes(input.promotion) ||
      !premoveDestinations(chess, input.from, piece.color).includes(input.to)
    )
      return game;
    return {
      ...game,
      premove: {
        from: input.from,
        to: input.to,
        promotion: input.promotion,
        color: piece.color,
      },
    };
  }
  const next = applyLegalMove(game, input, now);
  if (next === game || next.result) return next;
  const queued = game.premove;
  if (!queued) return next;
  // Consume exactly once, including when a capture/check makes the plan illegal.
  const withoutPremove = { ...next, premove: null };
  if (position(next.moves).turn() !== queued.color) return withoutPremove;
  return applyLegalMove(withoutPremove, queued, now);
}
