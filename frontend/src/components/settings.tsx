"use client";
import { useState } from "react";
import { SlidersHorizontal, Trash2, Sun, Moon, Laptop } from "lucide-react";
import { useApp } from "./provider";
import { ConfirmDialog } from "./dialog";
import { LanguageSelect } from "./language-select";
export function Settings() {
  const { t, preferences, setPreferences, clearData } = useApp();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SHATRANJ / {t("settings")}</p>
          <h1>{t("preferences")}</h1>
          <p>{t("preferencesSub")}</p>
        </div>
        <SlidersHorizontal size={30} />
      </div>
      <section className="panel settings-panel">
        <div className="setting-row">
          <div>
            <h3>{t("language")}</h3>
            <p>O‘zbekcha · English · Русский</p>
          </div>
          <LanguageSelect />
        </div>
        <div className="setting-row theme-setting">
          <div>
            <h3>{t("theme")}</h3>
          </div>
          <div className="theme-options">
            {(
              [
                { value: "light", Icon: Sun },
                { value: "dark", Icon: Moon },
                { value: "system", Icon: Laptop },
              ] as const
            ).map(({ value, Icon }) => (
              <button
                className={preferences.theme === value ? "chosen" : ""}
                key={value}
                aria-pressed={preferences.theme === value}
                onClick={() => setPreferences((p) => ({ ...p, theme: value }))}
              >
                <Icon size={22} />
                {t(value)}
              </button>
            ))}
          </div>
        </div>
        {(["sound", "highlights", "coordinates", "reduced"] as const).map(
          (key) => (
            <div className="setting-row" key={key}>
              <h3>{t(key)}</h3>
              <button
                role="switch"
                aria-label={t(key)}
                aria-checked={preferences[key]}
                className={`switch ${preferences[key] ? "enabled" : ""}`}
                onClick={() =>
                  setPreferences((p) => ({ ...p, [key]: !p[key] }))
                }
              >
                <span />
              </button>
            </div>
          ),
        )}
      </section>
      <section className="panel danger-zone">
        <div>
          <h3>{t("clear")}</h3>
          <p>{t("clearHelp")}</p>
        </div>
        <button className="button danger" onClick={() => setConfirm(true)}>
          <Trash2 size={17} />
          {t("clear")}
        </button>
      </section>
      {confirm && (
        <ConfirmDialog
          message={t("clearConfirm")}
          onConfirm={clearData}
          onClose={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
