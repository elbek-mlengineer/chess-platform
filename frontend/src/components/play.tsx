"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Chess, type Color } from "chess.js";
import {
  ArrowLeftRight,
  Flag,
  Download,
  Plus,
  Volume2,
  VolumeX,
  Handshake,
  Clock3,
  RotateCcw,
  X,
} from "lucide-react";
import { useApp } from "./provider";
import { Board, Piece } from "./board";
import { Dialog, ConfirmDialog } from "./dialog";
import { GameSetup } from "./game-setup";
import { GameStatus } from "./game-status";
import { MoveHistory } from "./move-history";
import { Replay } from "./replay";
import { useGame } from "@/hooks/use-game";
import {
  position,
  resultLabel,
  downloadPgn,
  type GameMode,
  type GameSession,
} from "@/lib/chess";
import { clockAt, clockText } from "@/lib/clock";
function Captures({ session, color }: { session: GameSession; color: Color }) {
  const { t } = useApp();
  const captured = position(session.moves)
    .history({ verbose: true })
    .flatMap((move) =>
      move.color === color && move.captured ? [move.captured] : [],
    );
  return (
    <span className="captured-pieces" aria-label={t("captured")}>
      {captured.map((type, index) => (
        <Piece key={index} type={type} color={color === "w" ? "b" : "w"} />
      ))}
    </span>
  );
}
export function Play() {
  const { t, data, setData, preferences, setPreferences } = useApp();
  const game = useGame();
  const { session } = game;
  const [setup, setSetup] = useState(false);
  const [setupMode, setSetupMode] = useState<GameMode>("computer");
  const [confirm, setConfirm] = useState<"new" | "resign" | "draw" | null>(
    null,
  );
  const [flipped, setFlipped] = useState(false);
  const [dismissedResult, setDismissedResult] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<GameSession | null>(
    null,
  );
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("mode");
    if (requested === "local" || requested === "computer") {
      const timer = setTimeout(() => {
        setSetupMode(requested);
        setSetup(true);
        window.history.replaceState(null, "", "/play");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);
  const chess = session ? position(session.moves) : new Chess();
  const orientation: Color = (session?.human === "b") !== flipped ? "b" : "w";
  const last = chess.history({ verbose: true }).at(-1);
  const remaining = session
    ? clockAt(session.clock, game.now, !session.paused && !session.result)
    : { w: 0, b: 0 };
  function start(next: GameSession) {
    game.unlockSound();
    // A replacement confirmation may stay open; charge time only after it is accepted.
    const startedAt = Date.now();
    const active = {
      ...next,
      startedAt,
      clock: { ...next.clock, since: startedAt },
    };
    setData((previous) => ({ ...previous, active }));
    setSetup(false);
    setFlipped(false);
    setDismissedResult(null);
  }
  function requestNew() {
    setSetup(true);
  }
  function player(color: Color) {
    if (!session) return t(color === "w" ? "white" : "black");
    if (session.mode === "local") return t(color === "w" ? "white" : "black");
    if (color === session.human) return data.profile.name || t("guest");
    return t("computer");
  }
  function strip(color: Color) {
    const colorName = color === "w" ? "white" : "black";
    return (
      <div className="player-strip">
        <span className={`player-icon ${color}`}>
          <Piece type="k" color={color} />
        </span>
        <div className="player-info">
          <strong>{player(color)}</strong>
          <small>
            {session?.mode === "computer" && color !== session.human
              ? t(session.difficulty)
              : t(colorName)}
          </small>
          {session && <Captures session={session} color={color} />}
        </div>
        <div
          className={`player-clock ${session && !session.paused && !session.result && chess.turn() === color ? "clock-active" : ""}`}
          aria-label={`${t(color === "w" ? "white" : "black")} ${t("clock")}`}
        >
          <Clock3 size={17} />
          {session?.clock.timed ? clockText(remaining[color]) : "∞"}
        </div>
      </div>
    );
  }
  return (
    <div className="page play-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("ready")}</p>
          <h1>
            {t("play")}
            <span className="heading-dot">.</span>
          </h1>
        </div>
        <button className="button secondary" onClick={requestNew}>
          <Plus size={17} />
          {t("newGame")}
        </button>
      </div>
      <div className="play-layout">
        <section className="board-column">
          {strip(orientation === "w" ? "b" : "w")}
          <div onPointerDown={game.unlockSound}>
            <Board
              key={session?.id || "new"}
              chess={chess}
              orientation={orientation}
              onMove={game.move}
              allowPremoves
              playerColor={
                session?.mode === "computer" ? session.human : undefined
              }
              premove={session?.premove}
              onCancelPremove={game.cancelPremove}
              lastMove={last}
              disabled={
                !session ||
                !!session.result ||
                session.paused ||
                game.engineError
              }
            />
          </div>
          {strip(orientation)}
          <div className="board-toolbar">
            <button
              className="icon-button"
              title={t("flip")}
              aria-label={t("flip")}
              onClick={() => setFlipped((value) => !value)}
            >
              <ArrowLeftRight size={18} />
            </button>
            <button
              className="icon-button"
              title={t("sound")}
              aria-label={t("sound")}
              aria-pressed={preferences.sound}
              onClick={() => {
                game.unlockSound();
                setPreferences((p) => ({ ...p, sound: !p.sound }));
              }}
            >
              {preferences.sound ? (
                <Volume2 size={18} />
              ) : (
                <VolumeX size={18} />
              )}
            </button>
            <span>{t("demo")}</span>
            <button
              className="icon-button"
              title={t("export")}
              aria-label={t("export")}
              disabled={!session}
              onClick={() => session && downloadPgn(session)}
            >
              <Download size={18} />
            </button>
          </div>
          {session && !session.result && !session.paused && (
            <div className="premove-panel" aria-live="polite">
              {session.premove ? (
                <>
                  <span>
                    <strong>{t("premoveQueued")}</strong> {session.premove.from}{" "}
                    → {session.premove.to}
                    {session.premove.promotion !== "q"
                      ? ` =${session.premove.promotion.toUpperCase()}`
                      : ""}
                  </span>
                  <button
                    className="icon-button"
                    onClick={game.cancelPremove}
                    aria-label={t("cancelPremove")}
                    title={t("cancelPremove")}
                  >
                    <X size={17} />
                  </button>
                </>
              ) : (
                <p>{t("premoveHelp")}</p>
              )}
            </div>
          )}
        </section>
        <aside className="game-panel panel">
          <div className="game-panel-top">
            <span className="pill">
              <i />
              {session ? t(session.mode) : t("localOnly")}
            </span>
            <span>
              {session?.time === "untimed" ? t("untimed") : session?.time}
            </span>
          </div>
          <div className="game-status" aria-live="polite">
            <GameStatus
              session={session}
              thinking={game.thinking}
              onStart={() => setSetup(true)}
              onResume={() => {
                game.unlockSound();
                game.resume();
              }}
            />
          </div>
          {game.engineError && (
            <div role="alert" className="hint-box">
              <p>{t("engineError")}</p>
              <button
                className="button secondary"
                onClick={() => window.location.reload()}
              >
                {t("retry")}
              </button>
            </div>
          )}
          <MoveHistory moves={session?.moves || []} />
          <div className="game-controls">
            <button
              className="button secondary"
              disabled={!session || !!session.result || session.paused}
              onClick={() => setConfirm("resign")}
            >
              <Flag size={16} />
              {t("resign")}
            </button>
            {session?.mode === "local" && (
              <button
                className="button text-button"
                disabled={!!session.result || session.paused}
                onClick={() => setConfirm("draw")}
              >
                <Handshake size={16} />
                {t("offerDraw")}
              </button>
            )}
          </div>
          <p className="fine-print">{t("device")}</p>
        </aside>
      </div>
      {setup && (
        <GameSetup
          defaultMode={setupMode}
          onClose={() => setSetup(false)}
          onStart={(next) => {
            if (session && !session.result) {
              setPendingSession(next);
              setSetup(false);
              setConfirm("new");
            } else start(next);
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          message={t(
            (
              {
                new: "replace",
                resign: "resignConfirm",
                draw: "drawConfirm",
              } as const
            )[confirm],
          )}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm === "new") {
              if (pendingSession) start(pendingSession);
              setPendingSession(null);
            } else if (confirm === "draw") {
              game.finish({ winner: null, reason: "agreement" });
            } else {
              const resigningColor =
                session?.mode === "computer" ? session.human : chess.turn();
              game.finish({
                winner: resigningColor === "w" ? "b" : "w",
                reason: "resignation",
              });
            }
          }}
        />
      )}
      {session?.result && dismissedResult !== session.id && (
        <Dialog
          title={t("result")}
          onClose={() => setDismissedResult(session.id)}
        >
          <div className="result-dialog">
            <span>♔</span>
            <h2>{t(resultLabel(session.result))}</h2>
            <p>{t(session.result.reason)}</p>
            <button
              className="button primary full-width"
              onClick={() => {
                setDismissedResult(session.id);
                setSetup(true);
              }}
            >
              <RotateCcw size={17} />
              {t("again")}
            </button>
            <button
              className="button secondary full-width"
              onClick={() => {
                setDismissedResult(session.id);
                setReviewing(true);
              }}
            >
              {t("review")}
            </button>
            <Link href="/" onClick={() => setDismissedResult(session.id)}>
              {t("backHome")}
            </Link>
          </div>
        </Dialog>
      )}
      {reviewing && session && (
        <Replay session={session} onClose={() => setReviewing(false)} />
      )}
    </div>
  );
}
