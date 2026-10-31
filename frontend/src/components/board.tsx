"use client";
import { useState, useRef, useMemo, type KeyboardEvent } from "react";
import {
  SQUARES,
  Chess,
  type Color,
  type Square,
  type PieceSymbol,
} from "chess.js";
import type { Premove } from "@/lib/chess";
import { premoveDestinations } from "@/lib/premove";
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
  allowPremoves?: boolean;
  playerColor?: Color;
  premove?: Premove | null;
  onCancelPremove?: () => void;
}
export function Board({
  chess,
  orientation = "w",
  onMove,
  disabled = false,
  lastMove,
  small = false,
  allowPremoves = false,
  playerColor,
  premove,
  onCancelPremove,
}: BoardProps) {
  const { t, preferences } = useApp();
  const [selection, setSelection] = useState<{
    square: Square;
    color: Color;
    type: PieceSymbol;
  } | null>(null);
  const [promotion, setPromotion] = useState<{
    from: Square;
    to: Square;
    color: Color;
  } | null>(null);
  const [focus, setFocus] = useState(56);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedPiece = selection ? chess.get(selection.square) : undefined;
  const selected =
    !disabled &&
    selection &&
    selectedPiece?.color === selection.color &&
    selectedPiece.type === selection.type
      ? selection.square
      : null;
  const selectedColor = selection?.color;
  const isPlanning = !!selected && selectedColor !== chess.turn();
  const fen = chess.fen();
  const plannedDestinations = useMemo(
    () =>
      isPlanning && selected && selectedColor
        ? premoveDestinations(new Chess(fen), selected, selectedColor)
        : [],
    [fen, selected, selectedColor, isPlanning],
  );
  const squares = orientation === "w" ? SQUARES : [...SQUARES].reverse();
  const legal =
    selected && !isPlanning
      ? chess.moves({ square: selected, verbose: true })
      : [];
  function attempt(from: Square, to: Square) {
    const piece = chess.get(from);
    if (!piece || (playerColor && piece.color !== playerColor)) return false;
    const planning = piece.color !== chess.turn();
    if (planning) {
      if (
        !allowPremoves ||
        !premoveDestinations(chess, from, piece.color).includes(to)
      )
        return false;
      if (piece.type === "p" && (to[1] === "1" || to[1] === "8"))
        setPromotion({ from, to, color: piece.color });
      else onMove?.(from, to, "q");
      setSelection(null);
      return true;
    }
    const candidates = chess
      .moves({ square: from, verbose: true })
      .filter((m) => m.to === to);
    if (!candidates.length) return false;
    if (candidates.some((m) => m.promotion))
      setPromotion({ from, to, color: piece.color });
    else onMove?.(from, to, "q");
    setSelection(null);
    return true;
  }
  function activate(square: Square) {
    if (disabled || !onMove) return;
    if (selected === square) {
      setSelection(null);
      onCancelPremove?.();
      return;
    }
    if (selected && attempt(selected, square)) return;
    const piece = chess.get(square);
    if (
      !piece ||
      (playerColor && piece.color !== playerColor) ||
      (piece.color !== chess.turn() && !allowPremoves)
    ) {
      setSelection(null);
      return;
    }
    if (premove?.color === piece.color) onCancelPremove?.();
    setSelection({ square, color: piece.color, type: piece.type });
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
    if (event.key === "Escape") {
      setSelection(null);
      onCancelPremove?.();
    }
  }
  return (
    <>
      <div
        className={`chessboard ${small ? "mini-board" : ""}`}
        role="group"
        aria-hidden={small || undefined}
        aria-label={t("board")}
        aria-describedby={small ? undefined : "board-help"}
        onContextMenu={(event) => {
          if (!disabled && onMove) {
            event.preventDefault();
            setSelection(null);
            onCancelPremove?.();
          }
        }}
      >
        {squares.map((square, index) => {
          const piece = chess.get(square);
          const isLegal = legal.some((move) => move.to === square);
          const isPlannedDestination = plannedDestinations.includes(square);
          const isQueuedFrom = premove?.from === square;
          const isQueuedTo = premove?.to === square;
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
              className={`square ${dark ? "square-dark" : "square-light"} ${selected === square ? "selected" : ""} ${selected === square && isPlanning ? "premove-selected" : ""} ${isQueuedFrom || isQueuedTo ? "premove-square" : ""} ${lastMove && (lastMove.from === square || lastMove.to === square) ? "last-move" : ""} ${isCheck ? "in-check" : ""}`}
              aria-label={`${square}, ${piece ? `${t(piece.color === "w" ? "white" : "black")} ${t(pieceNames[piece.type])}` : t("empty")}${selected === square ? `, ${t("selected")}` : ""}${isLegal ? `, ${t("legal")}` : ""}${isPlannedDestination ? `, ${t("premoveTarget")}` : ""}${isQueuedFrom ? `, ${t("premoveFrom")}` : ""}${isQueuedTo ? `, ${t("premoveTo")}` : ""}${isCheck ? `, ${t("check")}` : ""}`}
              aria-pressed={selected === square}
              onFocus={() => setFocus(index)}
              onKeyDown={(e) => key(e, index)}
              onClick={() => activate(square)}
              draggable={
                !disabled &&
                !!onMove &&
                !!piece &&
                (!playerColor || piece.color === playerColor) &&
                (piece.color === chess.turn() || allowPremoves)
              }
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", square);
                if (piece && premove?.color === piece.color)
                  onCancelPremove?.();
                if (piece)
                  setSelection({
                    square,
                    color: piece.color,
                    type: piece.type,
                  });
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
              {preferences.highlights && (isLegal || isPlannedDestination) && (
                <span
                  className={`${piece ? "capture-dot" : "legal-dot"} ${isPlannedDestination ? "premove-dot" : ""}`}
                />
              )}
              {isQueuedTo && (
                <span className="premove-marker" aria-hidden="true">
                  ↝
                </span>
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
          {allowPremoves && ` ${t("premoveHelp")}`}
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
                <Piece type={type} color={promotion.color} />
                <span>{t(pieceNames[type])}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}
