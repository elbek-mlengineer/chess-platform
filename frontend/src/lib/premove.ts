import { Chess, SQUARES, type Color, type Square } from "chess.js";

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
