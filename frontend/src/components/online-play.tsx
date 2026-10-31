"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Download,
  Flag,
  Handshake,
  Swords,
  X,
} from "lucide-react";
import type { Color } from "chess.js";
import { position, resultLabel } from "@/lib/chess";
import { clockAt, clockText } from "@/lib/clock";
import type { OnlineGame } from "@/lib/online";
import { Board } from "./board";
import { MoveHistory } from "./move-history";
import { ConfirmDialog } from "./dialog";
import { useApp } from "./provider";
import { useOnline } from "./online-provider";
import { OnlineAccount } from "./online-account";
import { OnlineStatus } from "./online-status";

function downloadOnlinePgn(game: OnlineGame) {
  const chess = position(game.moves);
  let score = "*";
  if (game.result) {
    score = "1/2-1/2";
    if (game.result.winner === "w") score = "1-0";
    if (game.result.winner === "b") score = "0-1";
  }
  chess.header(
    "Event",
    "Shatranj friendly online game",
    "White",
    game.white.username,
    "Black",
    game.black.username,
    "Date",
    new Date(game.startedAt).toISOString().slice(0, 10).replaceAll("-", "."),
    "Result",
    score,
  );
  const url = URL.createObjectURL(
    new Blob([chess.pgn()], { type: "application/x-chess-pgn" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `shatranj-online-${game.id}.pgn`;
  link.click();
  URL.revokeObjectURL(url);
}
function GameBoard({ game, ownColor }: { game: OnlineGame; ownColor: Color }) {
  const { text, act, busy, connected, serverTime } = useOnline();
  const { t } = useApp();
  const [flipped, setFlipped] = useState(false);
  const [resigning, setResigning] = useState(false);
  const [now, setNow] = useState(0);
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(serverTime()), 100);
    return () => clearInterval(timer);
  }, [serverTime]);
  const chess = useMemo(
    () =>
      position(
        game.result && reviewPly !== null
          ? game.moves.slice(0, reviewPly)
          : game.moves,
      ),
    [game.moves, game.result, reviewPly],
  );
  const opponentColor = ownColor === "w" ? "b" : "w";
  const orientation: Color = flipped ? opponentColor : ownColor;
  const last = chess.history({ verbose: true }).at(-1);
  const remaining = clockAt(game.clock, now || game.clock.since, !game.result);
  const opposite = ownColor === "w" ? game.black : game.white;
  function player(color: Color) {
    const user = color === "w" ? game.white : game.black;
    return (
      <div className="online-player">
        <span className="avatar">{color === "w" ? "♔" : "♚"}</span>
        <div>
          <strong>
            {user.username}
            {color === ownColor ? ` · ${text.you}` : ""}
          </strong>
          <small className={`presence ${user.online ? "online" : ""}`}>
            {user.online ? text.online : text.offline}
          </small>
        </div>
        <span
          className={`online-clock ${!game.result && game.clock.active === color ? "active" : ""}`}
        >
          {game.clock.timed ? clockText(remaining[color]) : "∞"}
        </span>
      </div>
    );
  }
  const colorOnTop = orientation === "w" ? "b" : "w";
  return (
    <div className="online-game-grid">
      <div className="online-board-column">
        {player(colorOnTop)}
        <Board
          key={game.id}
          chess={chess}
          orientation={orientation}
          playerColor={ownColor}
          allowPremoves
          disabled={busy || !connected || !!game.result}
          lastMove={last}
          premove={game.premove}
          onMove={(from, to, promotion) =>
            void act({
              action: "move",
              gameId: game.id,
              from,
              to,
              promotion,
              ply: game.moves.length,
            })
          }
          onCancelPremove={() => {
            if (game.premove)
              void act({ action: "cancel-premove", gameId: game.id });
          }}
        />
        {player(orientation)}
        <div className="board-toolbar">
          <button
            className="icon-button"
            title={t("flip")}
            aria-label={t("flip")}
            onClick={() => setFlipped(!flipped)}
          >
            <ArrowLeftRight size={19} />
          </button>
          <span>
            {game.time === "untimed" ? text.untimed : game.time} ·{" "}
            {game.result ? text.finished : text.live}
          </span>
          <button
            className="icon-button"
            title={text.download}
            aria-label={text.download}
            onClick={() => downloadOnlinePgn(game)}
          >
            <Download size={19} />
          </button>
        </div>
        {!game.result && (
          <div className="premove-panel">
            {game.premove ? (
              <>
                <strong>
                  {t("premoveQueued")} · {game.premove.from} → {game.premove.to}
                </strong>
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label={t("cancelPremove")}
                  onClick={() =>
                    void act({ action: "cancel-premove", gameId: game.id })
                  }
                >
                  <X size={17} />
                </button>
              </>
            ) : (
              <p>{t("premoveHelp")}</p>
            )}
          </div>
        )}
        {game.result && (
          <label className="online-review">
            {t("moves")} · {reviewPly ?? game.moves.length} /{" "}
            {game.moves.length}
            <input
              type="range"
              min={0}
              max={game.moves.length}
              value={reviewPly ?? game.moves.length}
              onChange={(e) => setReviewPly(Number(e.target.value))}
            />
          </label>
        )}
      </div>
      <aside className="online-game-side">
        <section className="panel online-game-status" aria-live="polite">
          <Swords size={28} />
          <h2>
            {game.result
              ? t(resultLabel(game.result))
              : chess.turn() === ownColor
                ? text.yourTurn
                : text.opponentTurn}
          </h2>
          {game.result ? (
            <>
              <p>{t(game.result.reason)}</p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void act({
                    action: "invite",
                    userId: opposite.id,
                    time: game.time,
                    color: ownColor === "w" ? "b" : "w",
                  })
                }
              >
                {text.rematch}
              </button>
              <Link className="button secondary" href="/friends">
                {text.invitations} →
              </Link>
            </>
          ) : (
            <>
              {chess.isCheck() && (
                <span className="tag check-tag">{t("check")}</span>
              )}
              <p>{text.watchHelp}</p>
              {game.drawOffer ? (
                <div className="online-draw">
                  <p>
                    {game.drawOffer === ownColor
                      ? text.drawSent
                      : text.drawReceived}
                  </p>
                  {game.drawOffer !== ownColor && (
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() =>
                        void act({ action: "accept-draw", gameId: game.id })
                      }
                    >
                      {text.accept}
                    </button>
                  )}
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      void act({ action: "decline-draw", gameId: game.id })
                    }
                  >
                    {game.drawOffer === ownColor
                      ? text.withdrawDraw
                      : text.decline}
                  </button>
                </div>
              ) : (
                <button
                  className="button secondary"
                  disabled={busy || !connected}
                  onClick={() =>
                    void act({ action: "offer-draw", gameId: game.id })
                  }
                >
                  <Handshake size={17} />
                  {text.offerDraw}
                </button>
              )}
              <button
                className="button secondary"
                disabled={busy || !connected}
                onClick={() => setResigning(true)}
              >
                <Flag size={17} />
                {text.resign}
              </button>
            </>
          )}
        </section>
        <MoveHistory moves={game.moves} />
      </aside>
      {resigning && (
        <ConfirmDialog
          message={text.resignConfirm}
          onClose={() => setResigning(false)}
          onConfirm={() => void act({ action: "resign", gameId: game.id })}
        />
      )}
    </div>
  );
}
export function OnlinePlay({ gameId }: { gameId?: string }) {
  const { state, text, loading } = useOnline();
  const game = state?.games.find((item) =>
    gameId ? item.id === gameId : !item.result,
  );
  const ownColor = game && state?.me?.id === game.white.id ? "w" : "b";
  return (
    <div className="page online-play-page">
      <div className="page-heading">
        <div>
          <Link className="online-back" href="/friends">
            <ArrowLeft size={16} />
            {text.back}
          </Link>
          <h1>
            {game
              ? `${game.white.username} — ${game.black.username}`
              : text.activeGame}
          </h1>
        </div>
      </div>
      <OnlineStatus />
      {!state?.me ? (
        !loading && <OnlineAccount />
      ) : game ? (
        <GameBoard key={game.id} game={game} ownColor={ownColor} />
      ) : (
        <section className="panel social-panel">
          <p>{text.noGames}</p>
          <Link className="button primary" href="/friends">
            {text.viewFriends}
          </Link>
        </section>
      )}
    </div>
  );
}
