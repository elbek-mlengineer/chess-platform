"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, Users, Swords, UserPlus, X, ShieldBan } from "lucide-react";
import type { OnlineAction, OnlineUser } from "@/lib/online";
import { timeControls } from "@/lib/chess";
import { useApp } from "./provider";
import { useOnline } from "./online-provider";
import { OnlineAccount } from "./online-account";
import { OnlineStatus } from "./online-status";
import { Dialog, ConfirmDialog } from "./dialog";

function UserIdentity({ user }: { user: OnlineUser }) {
  const { text } = useOnline();
  return (
    <div className="online-identity">
      <span className="avatar">{user.username.slice(0, 2).toUpperCase()}</span>
      <span>
        <strong>{user.username}</strong>
        <small className={`presence ${user.online ? "online" : ""}`}>
          {user.online ? text.online : text.offline}
        </small>
      </span>
    </div>
  );
}
function InviteDialog({
  user,
  onClose,
}: {
  user: OnlineUser;
  onClose: () => void;
}) {
  const { text, act, busy, error } = useOnline();
  const { t } = useApp();
  const [time, setTime] = useState("5+0");
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  return (
    <Dialog title={`${text.challenge} · ${user.username}`} onClose={onClose}>
      <form
        className="online-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act({ action: "invite", userId: user.id, time, color }))
            onClose();
        }}
      >
        <label>
          {text.time}
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            {timeControls.map((value) => (
              <option key={value} value={value}>
                {value === "untimed" ? text.untimed : value}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>{text.color}</legend>
          <div className="online-tabs">
            {(["w", "random", "b"] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={color === value}
                onClick={() => setColor(value)}
              >
                {value === "random"
                  ? text.random
                  : t(value === "w" ? "white" : "black")}
              </button>
            ))}
          </div>
        </fieldset>
        <p>{text.inviteHelp}</p>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>
          {text.sendInvite}
        </button>
      </form>
    </Dialog>
  );
}
export function Friends() {
  const { state, text, search, searching, setSearch, act, busy, loading } =
    useOnline();
  const { t } = useApp();
  const [invite, setInvite] = useState<OnlineUser | null>(null);
  const [confirm, setConfirm] = useState<{
    message: string;
    action: OnlineAction;
  } | null>(null);
  const active = state?.games.find((game) => !game.result);
  function send(action: OnlineAction) {
    void act(action);
  }
  const pendingInvites = new Set(
    state?.sentInvitations.map((item) => item.user.id),
  );
  function challengeButton(user: OnlineUser) {
    return (
      <button
        className="button primary"
        disabled={busy || !!active || pendingInvites.has(user.id)}
        onClick={() => setInvite(user)}
      >
        <Swords size={15} />
        {pendingInvites.has(user.id) ? text.pending : text.challenge}
      </button>
    );
  }
  return (
    <div className="page friends-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SHATRANJ · {text.friends}</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <Users size={35} />
      </div>
      <OnlineStatus />
      {!state?.me ? (
        !loading && <OnlineAccount />
      ) : (
        <>
          <div className="online-me panel">
            <UserIdentity user={state.me} />
            <span className="tag">{text.you}</span>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => send({ action: "logout" })}
            >
              {text.logout}
            </button>
          </div>
          {active && (
            <Link href={`/online?game=${active.id}`} className="resume-banner">
              <Swords size={19} />
              <strong>
                {text.activeGame} · {active.white.username} —{" "}
                {active.black.username}
              </strong>
              <span>{text.openGame} →</span>
            </Link>
          )}
          {!!state.invitations.length && (
            <section className="panel social-panel">
              <h2>
                {text.invitations}
                <span className="tag">{state.invitations.length}</span>
              </h2>
              <p>{text.inviteHelp}</p>
              {state.invitations.map((item) => (
                <div className="social-row" key={item.id}>
                  <UserIdentity user={item.user} />
                  <span className="tag">
                    {item.time === "untimed" ? text.untimed : item.time}
                  </span>
                  <div className="social-actions">
                    <button
                      className="button primary"
                      disabled={busy || !!active}
                      onClick={() =>
                        send({ action: "accept-invite", id: item.id })
                      }
                    >
                      {text.accept}
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        send({ action: "decline-invite", id: item.id })
                      }
                    >
                      {text.decline}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
          {!!state.sentInvitations.length && (
            <section className="panel social-panel">
              <h2>{text.sentInvitations}</h2>
              {state.sentInvitations.map((item) => (
                <div className="social-row" key={item.id}>
                  <UserIdentity user={item.user} />
                  <span>
                    {item.time === "untimed" ? text.untimed : item.time}
                  </span>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      send({ action: "cancel-invite", id: item.id })
                    }
                  >
                    {text.cancel}
                  </button>
                </div>
              ))}
            </section>
          )}
          <div className="friends-grid">
            <div className="social-column">
              <section className="panel social-panel">
                <h2>
                  <Search size={20} />
                  {text.search}
                </h2>
                <label className="search-field">
                  <span className="sr-only">{text.search}</span>
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    maxLength={24}
                    placeholder={text.searchHint}
                    aria-label={text.search}
                    autoComplete="off"
                  />
                  {search && (
                    <button
                      className="icon-button"
                      aria-label={text.cancel}
                      onClick={() => setSearch("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </label>
                {search.trim().length < 2 ? (
                  <p className="social-empty">{text.searchIdle}</p>
                ) : searching ? (
                  <p className="social-empty" role="status">
                    {text.syncing}
                  </p>
                ) : !state.users.length ? (
                  <p className="social-empty">{text.searchEmpty}</p>
                ) : (
                  state.users.map((user) => (
                    <div className="social-row" key={user.id}>
                      <UserIdentity user={user} />
                      {user.relationship === "none" && (
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() =>
                            send({ action: "request", userId: user.id })
                          }
                        >
                          <UserPlus size={15} />
                          {text.add}
                        </button>
                      )}
                      {user.relationship === "friend" && (
                        <span className="tag">{text.friend}</span>
                      )}
                      {user.relationship === "outgoing" && (
                        <span className="tag">{text.pending}</span>
                      )}
                      {user.relationship === "incoming" && (
                        <span className="tag">{text.incomingShort}</span>
                      )}
                      {user.relationship === "blocked" && (
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            send({ action: "unblock", userId: user.id })
                          }
                        >
                          {text.unblock}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </section>
              <section className="panel social-panel">
                <h2>
                  <Users size={20} />
                  {text.friendList}
                  <span className="tag">{state.friends.length}</span>
                </h2>
                {!state.friends.length && (
                  <p className="social-empty">{text.noFriends}</p>
                )}
                {state.friends.map((user) => (
                  <div className="social-row friend-row" key={user.id}>
                    <UserIdentity user={user} />
                    <div className="social-actions">
                      {challengeButton(user)}
                      <details>
                        <summary aria-label={t("settings")}>•••</summary>
                        <div className="friend-menu">
                          <button
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                message: text.confirmRemove,
                                action: { action: "remove", userId: user.id },
                              })
                            }
                          >
                            {text.remove}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                message: text.confirmBlock,
                                action: { action: "block", userId: user.id },
                              })
                            }
                          >
                            {text.block}
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </section>
            </div>
            <div className="social-column">
              <section className="panel social-panel">
                <h2>
                  {text.incoming}
                  <span className="tag">{state.incoming.length}</span>
                </h2>
                {!state.incoming.length && (
                  <p className="social-empty">{text.noRequests}</p>
                )}
                {state.incoming.map((item) => (
                  <div className="social-row" key={item.id}>
                    <UserIdentity user={item.user} />
                    <div className="social-actions">
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={() =>
                          send({ action: "accept-request", id: item.id })
                        }
                      >
                        {text.accept}
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          send({ action: "decline-request", id: item.id })
                        }
                      >
                        {text.decline}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={text.block}
                        title={text.block}
                        disabled={busy}
                        onClick={() =>
                          setConfirm({
                            message: text.confirmBlock,
                            action: { action: "block", userId: item.user.id },
                          })
                        }
                      >
                        <ShieldBan size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
              <section className="panel social-panel">
                <h2>
                  {text.outgoing}
                  <span className="tag">{state.outgoing.length}</span>
                </h2>
                {!state.outgoing.length && (
                  <p className="social-empty">{text.noRequests}</p>
                )}
                {state.outgoing.map((item) => (
                  <div className="social-row" key={item.id}>
                    <UserIdentity user={item.user} />
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        send({ action: "cancel-request", id: item.id })
                      }
                    >
                      {text.cancel}
                    </button>
                  </div>
                ))}
              </section>
              {!!state.blocked.length && (
                <section className="panel social-panel">
                  <h2>{text.blocked}</h2>
                  {state.blocked.map((user) => (
                    <div className="social-row" key={user.id}>
                      <UserIdentity user={user} />
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          send({ action: "unblock", userId: user.id })
                        }
                      >
                        {text.unblock}
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
          <section className="panel social-panel">
            <h2>{text.history}</h2>
            {!state.games.some((game) => game.result) && (
              <p className="social-empty">{text.noGames}</p>
            )}
            {state.games
              .filter((game) => game.result)
              .map((game) => (
                <Link
                  className="social-row online-history"
                  key={game.id}
                  href={`/online?game=${game.id}`}
                >
                  <strong>
                    {game.white.username} — {game.black.username}
                  </strong>
                  <span>
                    {game.result?.winner === "w"
                      ? "1–0"
                      : game.result?.winner === "b"
                        ? "0–1"
                        : "½–½"}
                  </span>
                  <small>
                    {game.time === "untimed" ? text.untimed : game.time} ·{" "}
                    {game.moves.length} {t("moves")}
                  </small>
                  <span>→</span>
                </Link>
              ))}
          </section>
        </>
      )}
      {invite && <InviteDialog user={invite} onClose={() => setInvite(null)} />}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onClose={() => setConfirm(null)}
          onConfirm={() => send(confirm.action)}
        />
      )}
    </div>
  );
}
