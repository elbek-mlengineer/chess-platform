"use client";
import { useId } from "react";
import type { Color, PieceSymbol } from "chess.js";
import type { TextKey } from "@/lib/i18n";
export const pieceNames: Record<PieceSymbol, TextKey> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
const sourceColumns: Record<PieceSymbol, number> = {
  r: 0,
  n: 1,
  b: 2,
  q: 3,
  k: 4,
  p: 3,
};
const squareSize = 74;
const sourceSize = { width: 602, height: 606 };

export function Piece({ type, color }: { type: PieceSymbol; color: Color }) {
  const filterId = useId();
  const clipId = useId();
  const x = 4 + sourceColumns[type] * squareSize;
  const isPawn = type === "p";
  let y = color === "w" ? 525 : 7;
  if (isPawn) y = color === "w" ? 451 : 81;
  // Keep the supplied artwork unchanged. The SVG color key removes both board
  // pigments while preserving the neutral pieces. Corner clips exclude source
  // coordinate glyphs, whose antialiased edges may contain neutral pixels.
  // sRGB is required because the key is calibrated to the source image colors.
  return (
    <svg
      className={`piece piece-${color}`}
      viewBox={`${x} ${y} ${squareSize} ${squareSize}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          {type === "r" ? (
            <polygon
              points={`${x + 16},${y} ${x + 74},${y} ${x + 74},${y + 56} ${x + 60},${y + 56} ${x + 60},${y + 74} ${x},${y + 74} ${x},${y + 26} ${x + 16},${y + 26}`}
            />
          ) : (
            <polygon
              points={`${x},${y} ${x + 74},${y} ${x + 74},${y + 56} ${x + 60},${y + 56} ${x + 60},${y + 74} ${x},${y + 74}`}
            />
          )}
        </clipPath>
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          x={x}
          y={y}
          width={squareSize}
          height={squareSize}
          colorInterpolationFilters="sRGB"
        >
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -18.214286 0 18.214286 0 1.714286"
          />
        </filter>
      </defs>
      <image
        href="/pieces/reference-board.png"
        width={sourceSize.width}
        height={sourceSize.height}
        filter={`url(#${filterId})`}
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
