"use client";
import { useState, useRef, type KeyboardEvent } from "react";
import {
  SQUARES,
  type Chess,
  type Color,
  type PieceSymbol,
  type Square,
} from "chess.js";
import { useApp } from "./provider";
import { Dialog } from "./dialog";
import type { TextKey } from "@/lib/i18n";
export const pieceNames: Record<PieceSymbol, TextKey> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
// Original vector silhouettes styled to match the supplied classic-piece reference.
const shapes: Record<PieceSymbol, React.ReactNode> = {
  p: (
    <>
      <path d="M15 54c0-7 4-10 8-15l3-7c-5 0-7-2-7-4 0-2 3-3 5-4-3-2-4-5-4-8a10 10 0 0 1 20 0c0 3-1 6-4 8 2 1 5 2 5 4 0 2-2 4-7 4l3 7c4 5 8 8 8 15Z" />
      <path className="piece-detail" d="M24 32h12" />
    </>
  ),
  r: (
    <>
      <path d="M11 54v-7c1-3 4-5 7-6l2-21-5-2-2-12h8v6h6V6h7v6h6V6h8l-2 12-5 2 2 21c4 1 6 3 7 6v7Z" />
      <path className="piece-detail" d="M20 20h20M18 41h24M12 47h36" />
    </>
  ),
  n: (
    <>
      <path d="M11 54v-7c0-5 4-8 8-9 0-6 5-11 10-16-5 3-8 7-13 9l-7-5 4-10 8-7 4-7 5 5c9 1 15 7 17 15 2 8 2 16-1 24l3 2v6Z" />
      <path
        className="piece-detail"
        d="M12 46h34M19 38h22M28 23c5-1 7-5 7-8M14 25l3 1"
      />
      <circle className="piece-eye" cx="24" cy="14" r="1.7" />
    </>
  ),
  b: (
    <>
      <path d="M10 54v-6c1-4 7-7 13-8l2-6c-7-1-10-5-10-10 0-7 7-14 12-18 0-5 7-6 8-1 0 3-2 4-4 5 8 6 12 11 12 17 0 5-4 8-10 9l2 5c7 1 13 4 14 8v5Z" />
      <path className="piece-detail" d="M31 11l-5 18M23 40h12M11 48h37" />
    </>
  ),
  q: (
    <>
      <path d="M12 54v-6l6-6-6-23 10 10 8-20 8 20 10-10-6 23 6 6v6Z" />
      <circle cx="11" cy="16" r="4.5" />
      <circle cx="23" cy="10" r="4.5" />
      <circle cx="37" cy="10" r="4.5" />
      <circle cx="49" cy="16" r="4.5" />
      <path className="piece-detail" d="M18 42h24M13 48h34" />
    </>
  ),
  k: (
    <>
      <path d="M27 5h6v5h5v6h-5v8h-6v-8h-5v-6h5Z" />
      <path
        fillRule="evenodd"
        d="M12 54v-6c1-4 4-7 8-9-7-5-12-11-12-17 0-8 8-11 14-7 4 2 6 5 8 9 2-4 4-7 8-9 6-4 14-1 14 7 0 6-5 12-12 17 4 2 7 5 8 9v6ZM18 23c-1 0-2 1-1 3 1 3 4 5 7 6l-1-7ZM42 23l-5 2-1 7c3-1 6-3 7-6 1-2 0-3-1-3Z"
      />
      <path className="piece-detail" d="M20 39h20M13 48h34" />
    </>
  ),
};
export function Piece({ type, color }: { type: PieceSymbol; color: Color }) {
  return (
    <svg
      className={`piece piece-${color}`}
      viewBox="0 0 60 60"
      aria-hidden="true"
    >
      <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="1.8">
        {shapes[type]}
      </g>
    </svg>
  );
}
interface BoardProps {
  chess: Chess;
  orientation?: Color;
  onMove?: (from: Square, to: Square, promotion: string) => void;
  disabled?: boolean;
  lastMove?: { from: Square; to: Square };
  small?: boolean;
}
export function Board({
  chess,
  orientation = "w",
  onMove,
  disabled = false,
  lastMove,
  small = false,
}: BoardProps) {
  const { t, preferences } = useApp();
  const [selection, setSelection] = useState<{
    square: Square;
    fen: string;
  } | null>(null);
  const [promotion, setPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [focus, setFocus] = useState(56);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = selection?.fen === chess.fen() ? selection.square : null;
  const squares = orientation === "w" ? SQUARES : [...SQUARES].reverse();
  const legal = selected
    ? chess.moves({ square: selected, verbose: true })
    : [];
  function attempt(from: Square, to: Square) {
    const candidates = chess
      .moves({ square: from, verbose: true })
      .filter((m) => m.to === to);
    if (!candidates.length) return false;
    if (candidates.some((m) => m.promotion)) setPromotion({ from, to });
    else onMove?.(from, to, "q");
    setSelection(null);
    return true;
  }
  function activate(square: Square) {
    if (disabled || !onMove) return;
    if (selected && attempt(selected, square)) return;
    const piece = chess.get(square);
    setSelection(
      piece?.color === chess.turn() ? { square, fen: chess.fen() } : null,
    );
  }
  function key(event: KeyboardEvent, index: number) {
    const offsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowUp: -8,
      ArrowDown: 8,
    };
    if (event.key in offsets) {
      event.preventDefault();
      const next = Math.max(0, Math.min(63, index + offsets[event.key]));
      setFocus(next);
      buttons.current[next]?.focus();
    }
    if (event.key === "Escape") setSelection(null);
  }
  return (
    <>
      <div
        className={`chessboard ${small ? "mini-board" : ""}`}
        role="group"
        aria-hidden={small || undefined}
        aria-label={t("board")}
        aria-describedby={small ? undefined : "board-help"}
      >
        {squares.map((square, index) => {
          const piece = chess.get(square);
          const isLegal = legal.some((move) => move.to === square);
          const isCheck =
            chess.isCheck() &&
            piece?.type === "k" &&
            piece.color === chess.turn();
          const dark = (square.charCodeAt(0) + Number(square[1])) % 2 === 0;
          return (
            <button
              key={square}
              ref={(el) => {
                buttons.current[index] = el;
              }}
              type="button"
              tabIndex={small ? -1 : index === focus ? 0 : -1}
              className={`square ${dark ? "square-dark" : "square-light"} ${selected === square ? "selected" : ""} ${lastMove && (lastMove.from === square || lastMove.to === square) ? "last-move" : ""} ${isCheck ? "in-check" : ""}`}
              aria-label={`${square}, ${piece ? `${t(piece.color === "w" ? "white" : "black")} ${t(pieceNames[piece.type])}` : t("empty")}${selected === square ? `, ${t("selected")}` : ""}${isLegal ? `, ${t("legal")}` : ""}${isCheck ? `, ${t("check")}` : ""}`}
              aria-pressed={selected === square}
              onFocus={() => setFocus(index)}
              onKeyDown={(e) => key(e, index)}
              onClick={() => activate(square)}
              draggable={!disabled && !!onMove && piece?.color === chess.turn()}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", square);
                setSelection({ square, fen: chess.fen() });
              }}
              onDragOver={(e) => {
                if (!disabled) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const droppedSquare = e.dataTransfer.getData("text/plain");
                const from = SQUARES.find((square) => square === droppedSquare);
                if (!disabled && from) attempt(from, square);
              }}
            >
              {piece && <Piece type={piece.type} color={piece.color} />}
              {preferences.highlights && isLegal && (
                <span className={piece ? "capture-dot" : "legal-dot"} />
              )}
              {isCheck && <span className="check-mark">!</span>}
              {preferences.coordinates && index % 8 === 0 && (
                <span className="rank-label">{square[1]}</span>
              )}
              {preferences.coordinates && index >= 56 && (
                <span className="file-label">{square[0]}</span>
              )}
            </button>
          );
        })}
      </div>
      {!small && (
        <p id="board-help" className="sr-only">
          {t("boardHelp")}
        </p>
      )}
      {promotion && (
        <Dialog title={t("promotion")} onClose={() => setPromotion(null)}>
          <div className="promotion-options">
            {(["q", "r", "b", "n"] as const).map((type) => (
              <button
                key={type}
                aria-label={t(pieceNames[type])}
                onClick={() => {
                  onMove?.(promotion.from, promotion.to, type);
                  setPromotion(null);
                }}
              >
                <Piece type={type} color={chess.turn()} />
                <span>{t(pieceNames[type])}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}
