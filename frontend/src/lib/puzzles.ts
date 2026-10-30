import { Chess, type Square } from "chess.js";
import type { TextKey } from "./i18n";
import { legalMove, position } from "./chess";
export interface PuzzleDefinition {
  id: number;
  fen: string;
  line: string[];
  title: TextKey;
  theme: TextKey;
  explanation: TextKey;
  difficulty: TextKey;
}
// Original instructional compositions, verified by the test suite (including every reply).
export const puzzles: PuzzleDefinition[] = [
  {
    id: 0,
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    line: ["Re8#"],
    title: "puzzleOne",
    theme: "mate",
    explanation: "explainMate",
    difficulty: "beginner",
  },
  {
    id: 1,
    fen: "7k/5K2/6Q1/8/8/8/8/8 w - - 0 1",
    line: ["Qg7#"],
    title: "puzzleTwo",
    theme: "mate",
    explanation: "explainMate",
    difficulty: "beginner",
  },
  {
    id: 2,
    fen: "7k/5K2/8/8/8/8/8/6R1 w - - 0 1",
    line: ["Rh1#"],
    title: "puzzleThree",
    theme: "mate",
    explanation: "explainMate",
    difficulty: "beginner",
  },
  {
    id: 3,
    fen: "q3k3/8/8/3N4/8/8/8/6K1 w - - 0 1",
    line: ["Nc7+", "Kd8", "Nxa8"],
    title: "puzzleFour",
    theme: "fork",
    explanation: "explainFork",
    difficulty: "intermediate",
  },
  {
    id: 4,
    fen: "8/4P1k1/8/8/8/8/8/K7 w - - 0 1",
    line: ["e8=Q"],
    title: "puzzleFive",
    theme: "promotionTheme",
    explanation: "explainPromotion",
    difficulty: "beginner",
  },
  {
    id: 5,
    fen: "7k/8/5K2/4Q3/8/8/8/8 w - - 0 1",
    line: ["Qc7", "Kg8", "Qg7#"],
    title: "puzzleSix",
    theme: "mate",
    explanation: "explainNet",
    difficulty: "advanced",
  },
];
export interface PuzzleAttempt {
  moves: string[];
  complete: boolean;
  correct: boolean;
}
export function tryPuzzleMove(
  puzzle: PuzzleDefinition,
  moves: string[],
  from: Square,
  to: Square,
  promotion: string,
): PuzzleAttempt {
  const chess = position(moves, puzzle.fen);
  const move = legalMove(chess, from, to, promotion);
  if (!move || (!chess.isCheckmate() && move.san !== puzzle.line[moves.length]))
    return { moves, complete: false, correct: false };
  const next = [...moves, move.san];
  return {
    moves: next,
    complete: chess.isCheckmate() || next.length === puzzle.line.length,
    correct: true,
  };
}
export function puzzleHintSquare(
  puzzle: PuzzleDefinition,
  moves: string[],
): Square | undefined {
  const chess = position(moves, puzzle.fen);
  const expected = puzzle.line[moves.length];
  if (!expected) return;
  return new Chess(chess.fen()).move(expected).from;
}
