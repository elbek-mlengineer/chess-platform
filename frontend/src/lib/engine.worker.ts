import { findBestMove } from "./engine";
import type { Difficulty } from "./chess";
self.onmessage = (
  event: MessageEvent<{ fen: string; difficulty: Difficulty; id: string }>,
) => {
  const { fen, difficulty, id } = event.data;
  try {
    self.postMessage({ id, fen, move: findBestMove(fen, difficulty) });
  } catch {
    self.postMessage({ id, fen, move: null, error: true });
  }
};
