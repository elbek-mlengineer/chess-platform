"use client";
import { useState, useEffect } from "react";
import { type Square } from "chess.js";
import {
  ArrowRight,
  Lightbulb,
  RotateCcw,
  Check,
  Target,
  ChevronRight,
} from "lucide-react";
import { useApp } from "./provider";
import { Board } from "./board";
import { puzzles, tryPuzzleMove, puzzleHintSquare } from "@/lib/puzzles";
import { position } from "@/lib/chess";
export function Puzzles() {
  const { t, data, setData } = useApp();
  const [index, setIndex] = useState(0);
  const [moves, setMoves] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<
    "correct" | "incorrect" | "complete" | null
  >(null);
  const [hint, setHint] = useState(0);
  const puzzle = puzzles[index];
  const chess = position(moves, puzzle.fen);
  const replying =
    moves.length % 2 === 1 &&
    moves.length < puzzle.line.length &&
    feedback !== "complete";
  useEffect(() => {
    if (!replying) return;
    const timeout = setTimeout(
      () => setMoves((previous) => [...previous, puzzle.line[previous.length]]),
      550,
    );
    return () => clearTimeout(timeout);
  }, [replying, puzzle]);
  function choose(next: number) {
    setIndex(next);
    setMoves([]);
    setFeedback(null);
    setHint(0);
  }
  function move(from: Square, to: Square, promotion: string) {
    const attempt = tryPuzzleMove(puzzle, moves, from, to, promotion);
    if (!attempt.correct) {
      setFeedback("incorrect");
      return;
    }
    setMoves(attempt.moves);
    setHint(0);
    setFeedback(attempt.complete ? "complete" : "correct");
    if (attempt.complete)
      setData((previous) => ({
        ...previous,
        solved: [...new Set([...previous.solved, puzzle.id])],
      }));
  }
  const last = chess.history({ verbose: true }).at(-1);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("puzzleDay")}</p>
          <h1>{t("puzzleTitle")}</h1>
          <p>{t("puzzleSub")}</p>
        </div>
        <span className="pill">
          <Target size={15} />
          {data.solved.length} / 6
        </span>
      </div>
      <div className="play-layout">
        <section className="board-column">
          <div className="player-strip">
            <span className="player-icon">♙</span>
            <strong>
              {feedback === "complete" ? (
                t("complete")
              ) : (
                <>
                  {t(chess.turn() === "w" ? "white" : "black")} {t("turn")}
                </>
              )}
            </strong>
            <span className="pill">{t(puzzle.difficulty)}</span>
          </div>
          <Board
            key={index}
            chess={chess}
            onMove={move}
            disabled={replying || feedback === "complete"}
            lastMove={last}
          />
        </section>
        <aside className="puzzle-panel panel">
          <p className="eyebrow">
            {t("puzzle")} {index + 1} / 6
          </p>
          <h2>{t(puzzle.title)}</h2>
          <span className="tag">{t(puzzle.theme)}</span>
          <div className="puzzle-status" aria-live="polite">
            {feedback ? (
              <>
                <span className={`status-symbol ${feedback}`}>
                  {feedback === "complete" ? <Check /> : <Target />}
                </span>
                <h3>{t(feedback)}</h3>
                {feedback === "complete" && <p>{t(puzzle.explanation)}</p>}
              </>
            ) : (
              <>
                <Target size={34} />
                <p>{t(puzzle.explanation)}</p>
              </>
            )}
          </div>
          {hint > 0 && (
            <div className="hint-box">
              <Lightbulb size={18} />
              <p>
                {hint === 1
                  ? t("hintFirst")
                  : `${t("hintFrom")} ${puzzleHintSquare(puzzle, moves) || ""}`}
              </p>
            </div>
          )}
          <div className="puzzle-actions">
            {feedback === "complete" ? (
              <button
                className="button primary"
                onClick={() => choose((index + 1) % puzzles.length)}
              >
                {t("next")}
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                className="button secondary"
                onClick={() => setHint((h) => Math.min(2, h + 1))}
                disabled={replying}
              >
                <Lightbulb size={17} />
                {t("hint")}
              </button>
            )}
            <button
              className="button text-button"
              onClick={() => choose(index)}
            >
              <RotateCcw size={16} />
              {t("retry")}
            </button>
          </div>
          <p className="fine-print">{t("puzzleLimit")}</p>
          <div className="puzzle-selector">
            {puzzles.map((p, i) => (
              <button
                key={p.id}
                className={i === index ? "active" : ""}
                onClick={() => choose(i)}
                aria-label={`${t("puzzle")} ${i + 1}`}
                aria-pressed={i === index}
              >
                {data.solved.includes(p.id) ? <Check size={16} /> : i + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>
      <div className="section-caption">
        <span>{t("practice")}</span>
        <ChevronRight size={16} />
      </div>
    </div>
  );
}
