"use client";
import Link from "next/link";
import { useState } from "react";
import {
  History,
  ArrowRight,
  Monitor,
  Users,
  ChevronRight,
} from "lucide-react";
import { useApp } from "./provider";
import { Replay } from "./replay";
import { resultLabel, type GameSession } from "@/lib/chess";
import { dateLocales } from "@/lib/i18n";
export function GameList({
  games,
  compact = false,
}: {
  games: GameSession[];
  compact?: boolean;
}) {
  const { t, preferences } = useApp();
  const [selected, setSelected] = useState<GameSession | null>(null);
  return (
    <>
      {!games.length ? (
        <div className={`empty-games ${compact ? "compact" : ""}`}>
          <div className="empty-icon">
            <History size={26} />
          </div>
          <h3>{t("emptyGames")}</h3>
          <p>{t("emptyGamesHelp")}</p>
          <Link href="/play">
            {t("play")}
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="game-list">
          {games.map((game) => (
            <button
              className="history-row"
              key={game.id}
              onClick={() => setSelected(game)}
            >
              <span className="history-icon">
                {game.mode === "computer" ? (
                  <Monitor size={20} />
                ) : (
                  <Users size={20} />
                )}
              </span>
              <span>
                <strong>{t(game.mode)}</strong>
                <small>
                  {new Intl.DateTimeFormat(dateLocales[preferences.locale], {
                    dateStyle: "medium",
                  }).format(game.startedAt)}{" "}
                  · {game.time === "untimed" ? t("untimed") : game.time}
                </small>
              </span>
              <span className="history-result">
                {game.result && t(resultLabel(game.result))}
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      )}
      {selected && (
        <Replay session={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
