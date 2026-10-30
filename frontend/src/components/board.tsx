"use client";
import { useState, useRef, type KeyboardEvent } from "react";
import { SQUARES, type Chess, type Color, type Square } from "chess.js";
import { useApp } from "./provider";
import { Dialog } from "./dialog";
import { Piece, pieceNames } from "./piece";
export { Piece } from "./piece";
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
