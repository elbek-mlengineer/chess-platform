"use client";
import { useRef, useEffect } from "react";
import { Swords } from "lucide-react";
import { useApp } from "./provider";
export function MoveHistory({ moves }: { moves: string[] }) {
  const { t } = useApp();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [moves.length]);
  return (
    <section className="move-panel">
      <h3>
        {t("moves")}
        <span>{moves.length}</span>
      </h3>
      <div className="move-scroll">
        {moves.length ? (
          Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => (
            <div className="move-row" key={index}>
              <span>{index + 1}.</span>
              <span>{moves[index * 2]}</span>
              <span>{moves[index * 2 + 1] || "—"}</span>
            </div>
          ))
        ) : (
          <div className="move-empty">
            <Swords size={26} />
            <p>{t("noMoves")}</p>
          </div>
        )}
        <div ref={end} />
      </div>
    </section>
  );
}
