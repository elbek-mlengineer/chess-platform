import {
  Chess,
  SQUARES,
  type Color,
  type Square,
  type PieceSymbol,
} from "chess.js";
import type { Premove } from "./chess";

export const maxPremoves = 5;

export function isPremove(value: unknown): value is Premove {
  if (
    !value ||
    typeof value !== "object" ||
    !("from" in value) ||
    !("to" in value) ||
    !("color" in value) ||
    !("promotion" in value)
  )
    return false;
  return (
    SQUARES.some((square) => square === value.from) &&
    SQUARES.some((square) => square === value.to) &&
    (value.color === "w" || value.color === "b") &&
    typeof value.promotion === "string" &&
    ["q", "r", "b", "n"].includes(value.promotion)
  );
}

function promotedType(value: string): PieceSymbol {
  if (value === "q" || value === "r" || value === "b" || value === "n")
    return value;
  return "q";
}

/** Only a preview. Opponent replies are unknown; never use this position to adjudicate a real move. */
export function projectPremoves(
  chess: Chess,
  queue: readonly Premove[],
): Chess {
  const preview = new Chess(chess.fen());
  for (const move of queue) {
    const piece = preview.get(move.from);
    if (!piece || piece.color !== move.color) break;
    const target = preview.get(move.to);
    if (target?.color === move.color || target?.type === "k") break;
    preview.remove(move.from);
    preview.remove(move.to);
    if (piece.type === "p" && move.from[0] !== move.to[0] && !target) {
      const captured = SQUARES.find(
        (square) => square === `${move.to[0]}${move.from[1]}`,
      );
      if (
        captured &&
        preview.get(captured)?.type === "p" &&
        preview.get(captured)?.color !== move.color
      )
        preview.remove(captured);
    }
    const promotes =
      piece.type === "p" && (move.to[1] === "1" || move.to[1] === "8");
    preview.put(
      {
        type: promotes ? promotedType(move.promotion) : piece.type,
        color: piece.color,
      },
      move.to,
    );
    if (
      piece.type === "k" &&
      Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0)) === 2
    ) {
      const kingSide = move.to[0] === "g";
      const rookFrom = SQUARES.find(
        (square) => square === `${kingSide ? "h" : "a"}${move.from[1]}`,
      );
      const rookTo = SQUARES.find(
        (square) => square === `${kingSide ? "f" : "d"}${move.from[1]}`,
      );
      const rook = rookFrom ? preview.get(rookFrom) : undefined;
      if (
        rookFrom &&
        rookTo &&
        rook?.type === "r" &&
        rook.color === move.color
      ) {
        preview.remove(rookFrom);
        preview.put(rook, rookTo);
      }
    }
  }
  return preview;
}

export function canAppendPremove(
  chess: Chess,
  queue: readonly Premove[],
  move: Premove,
): boolean {
  if (
    queue.length >= maxPremoves ||
    queue.some((queued) => queued.color !== move.color)
  )
    return false;
  if (!["q", "r", "b", "n"].includes(move.promotion)) return false;
  return premoveDestinations(
    projectPremoves(chess, queue),
    move.from,
    move.color,
  ).includes(move.to);
}

/** Planning hints only: chess.js checks the actual position again at execution. */
export function premoveDestinations(
  chess: Chess,
  from: Square,
  color: Color,
): Square[] {
  const piece = chess.get(from);
  if (!piece || piece.color !== color) return [];
  const fields = chess.fen().split(" ");
  fields[1] = color;
  fields[3] = "-";
  const planning = new Chess(fields.join(" "));
  for (const square of SQUARES) {
    const occupant = planning.get(square);
    if (occupant && occupant.color !== color && occupant.type !== "k")
      planning.remove(square);
  }
  const destinations = new Set(
    planning.moves({ square: from, verbose: true }).map((move) => move.to),
  );
  if (piece.type === "p") {
    // A pawn may plan a capture on a square the opponent has not occupied yet.
    const rank = Number(from[1]) + (color === "w" ? 1 : -1);
    for (const offset of [-1, 1]) {
      const file = String.fromCharCode(from.charCodeAt(0) + offset);
      const target = SQUARES.find((square) => square === `${file}${rank}`);
      if (!target || planning.get(target)) continue;
      planning.put({ type: "p", color: color === "w" ? "b" : "w" }, target);
      if (
        planning
          .moves({ square: from, verbose: true })
          .some((move) => move.to === target)
      )
        destinations.add(target);
      planning.remove(target);
    }
  }
  return [...destinations];
}
