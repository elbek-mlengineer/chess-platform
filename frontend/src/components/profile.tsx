"use client";
import { useState } from "react";
import { Check, Trophy, Handshake, Users, Swords, Target } from "lucide-react";
import { useApp } from "./provider";
import { GameList } from "./game-list";
export function Profile() {
  const { t, data, setData } = useApp();
  const [name, setName] = useState(data.profile.name);
  const [avatar, setAvatar] = useState(data.profile.avatar);
  const [status, setStatus] = useState<"saved" | "nameError" | null>(null);
  const computer = data.history.filter((game) => game.mode === "computer");
  const wins = computer.filter(
    (game) => game.result?.winner === game.human,
  ).length;
  const draws = computer.filter((game) => game.result?.winner === null).length;
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("device")}</p>
          <h1>{t("profileTitle")}</h1>
          <p>{t("profileSub")}</p>
        </div>
      </div>
      <div className="profile-grid">
        <section className="panel profile-card">
          <span className="profile-avatar">{["♞", "♜", "♝", "♛"][avatar]}</span>
          <h2>{data.profile.name || t("guest")}</h2>
          <span className="pill">{t("demo")}</span>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim().length < 1 || name.trim().length > 30) {
                setStatus("nameError");
                return;
              }
              setData((previous) => ({
                ...previous,
                profile: { name: name.trim(), avatar },
              }));
              setStatus("saved");
            }}
          >
            <label className="field-label" htmlFor="display-name">
              {t("name")}
            </label>
            <input
              id="display-name"
              value={name}
              maxLength={30}
              onChange={(e) => {
                setName(e.target.value);
                setStatus(null);
              }}
              placeholder={t("guest")}
            />
            <fieldset>
              <legend>{t("avatar")}</legend>
              <div className="avatar-options">
                {["♞", "♜", "♝", "♛"].map((symbol, index) => (
                  <button
                    type="button"
                    key={symbol}
                    aria-label={`${t("avatar")} ${index + 1}`}
                    aria-pressed={avatar === index}
                    className={avatar === index ? "chosen" : ""}
                    onClick={() => setAvatar(index)}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="button primary full-width" type="submit">
              {t("save")}
              <Check size={17} />
            </button>
            {status && <p role="status">{t(status)}</p>}
          </form>
        </section>
        <div>
          <div className="profile-stats">
            {(
              [
                { label: "wins", value: wins, icon: Trophy },
                { label: "draws", value: draws, icon: Handshake },
                {
                  label: "losses",
                  value: computer.length - wins - draws,
                  icon: Swords,
                },
                { label: "solved", value: data.solved.length, icon: Target },
              ] as const
            ).map(({ label, value, icon: Icon }) => (
              <div className="panel stat-card" key={label}>
                <Icon size={21} />
                <strong>{value}</strong>
                <span>{t(label)}</span>
              </div>
            ))}
          </div>
          <div className="local-summary">
            <Users size={19} />
            <span>{t("localGames")}</span>
            <strong>
              {data.history.filter((game) => game.mode === "local").length}
            </strong>
          </div>
          <div className="section-heading">
            <h2>{t("history")}</h2>
            <span>{data.history.length} / 100</span>
          </div>
          <GameList games={data.history} />
        </div>
      </div>
    </div>
  );
}
