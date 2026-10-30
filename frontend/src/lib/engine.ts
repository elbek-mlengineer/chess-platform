import { Chess, type Move } from "chess.js";
import type { Difficulty } from "./chess";
const values = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -100_000 : 100_000;
  if (chess.isDraw()) return 0;
  let score = 0;
  for (const row of chess.board())
    for (const piece of row) {
      if (!piece) continue;
      const file = piece.square.charCodeAt(0) - 97;
      const rank = Number(piece.square[1]) - 1;
      const center = 7 - Math.abs(3.5 - file) - Math.abs(3.5 - rank);
      const advancement = piece.color === "w" ? rank : 7 - rank;
      let bonus = center * 8;
      if (piece.type === "p") bonus = advancement * 7 + center * 2;
      if (piece.type === "k") bonus = -center * 3;
      score += (values[piece.type] + bonus) * (piece.color === "w" ? 1 : -1);
    }
  return score;
}
function orderedMoves(chess: Chess): Move[] {
  return chess
    .moves({ verbose: true })
    .sort(
      (a, b) =>
        (b.captured ? values[b.captured] : 0) -
        (a.captured ? values[a.captured] : 0),
    );
}
export function findBestMove(
  fen: string,
  difficulty: Difficulty,
  budgetMs = 1200,
): string | null {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;
  const maxDepth = { easy: 1, medium: 2, hard: 4 }[difficulty];
  const deadline = Date.now() + budgetMs;
  function search(depth: number, alpha: number, beta: number): number {
    if (depth === 0 || chess.isGameOver() || Date.now() > deadline)
      return evaluate(chess);
    const maximize = chess.turn() === "w";
    let best = maximize ? -Infinity : Infinity;
    for (const move of orderedMoves(chess)) {
      chess.move(move);
      const score = search(depth - 1, alpha, beta);
      chess.undo();
      best = maximize ? Math.max(best, score) : Math.min(best, score);
      if (maximize) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha || Date.now() > deadline) break;
    }
    return best;
  }
  const moves = orderedMoves(chess);
  let chosen = moves[0].san;
  for (let depth = 1; depth <= maxDepth; depth++) {
    let best = chess.turn() === "w" ? -Infinity : Infinity;
    const maximize = chess.turn() === "w";
    let candidate = chosen;
    for (const move of moves) {
      chess.move(move);
      let score = search(depth - 1, -Infinity, Infinity);
      chess.undo();
      if (difficulty === "easy") score += Math.random() * 160 - 80;
      if (maximize ? score > best : score < best) {
        best = score;
        candidate = move.san;
      }
      if (Date.now() > deadline) break;
    }
    if (Date.now() <= deadline || depth === 1) chosen = candidate;
    if (Date.now() > deadline) break;
  }
  return chosen;
}
export function engineResponseIsCurrent(
  request: { id: string; fen: string },
  current: { id: string; fen: string },
): boolean {
  return request.id === current.id && request.fen === current.fen;
}
