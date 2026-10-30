"use client";
import { ArrowRight, Clock3, Swords } from "lucide-react";
import { useApp } from "./provider";
import { position, resultLabel, type GameSession } from "@/lib/chess";
interface GameStatusProps {
  session: GameSession | null;
  thinking: boolean;
  onStart: () => void;
  onResume: () => void;
}
export function GameStatus({
  session,
  thinking,
  onStart,
  onResume,
}: GameStatusProps) {
  const { t } = useApp();
  if (!session)
    return (
      <>
        <Swords size={35} />
        <h2>{t("ready")}</h2>
        <button className="button primary" onClick={onStart}>
          {t("start")}
          <ArrowRight size={18} />
        </button>
      </>
    );
  if (session.result)
    return (
      <>
        <span className="result-icon">♔</span>
        <h2>{t(resultLabel(session.result))}</h2>
        <p>{t(session.result.reason)}</p>
      </>
    );
  if (session.paused)
    return (
      <>
        <Clock3 size={30} />
        <p>{t("paused")}</p>
        <button className="button primary" onClick={onResume}>
          {t("resume")}
        </button>
      </>
    );
  const chess = position(session.moves);
  return (
    <>
      <span className={`turn-indicator ${chess.turn()}`} />
      <h2>
        {t(chess.turn() === "w" ? "white" : "black")} {t("turn")}
      </h2>
      {chess.isCheck() && <span className="tag check-tag">! {t("check")}</span>}
      {thinking && (
        <p className="thinking">
          <span />
          {t("thinking")}
        </p>
      )}
    </>
  );
}
