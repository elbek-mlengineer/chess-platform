"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Dialog } from "./dialog";
import { useApp } from "./provider";
import {
  createSession,
  timeControls,
  type GameSession,
  type GameMode,
  type Difficulty,
} from "@/lib/chess";
export function GameSetup({
  onStart,
  onClose,
  defaultMode = "computer",
}: {
  onStart: (session: GameSession) => void;
  onClose: () => void;
  defaultMode?: GameMode;
}) {
  const { t } = useApp();
  const [mode, setMode] = useState<GameMode>(defaultMode);
  const [color, setColor] = useState<"w" | "b" | "random">("w");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [time, setTime] = useState("10+0");
  return (
    <Dialog title={t("setup")} onClose={onClose}>
      <div className="setup-form">
        <fieldset>
          <legend>{t("opponent")}</legend>
          <div className="segmented">
            {(["computer", "local"] as const).map((option) => (
              <button
                key={option}
                className={mode === option ? "chosen" : ""}
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
              >
                {t(option)}
              </button>
            ))}
          </div>
        </fieldset>
        {mode === "local" ? (
          <p className="help-text">{t("localHelp")}</p>
        ) : (
          <>
            <fieldset>
              <legend>{t("color")}</legend>
              <div className="segmented">
                {(["w", "b", "random"] as const).map((option) => (
                  <button
                    key={option}
                    className={color === option ? "chosen" : ""}
                    onClick={() => setColor(option)}
                    aria-pressed={color === option}
                  >
                    {t(
                      option === "w"
                        ? "white"
                        : option === "b"
                          ? "black"
                          : "random",
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{t("difficulty")}</legend>
              <div className="segmented">
                {(["easy", "medium", "hard"] as const).map((option) => (
                  <button
                    key={option}
                    className={difficulty === option ? "chosen" : ""}
                    onClick={() => setDifficulty(option)}
                    aria-pressed={difficulty === option}
                  >
                    {t(option)}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <fieldset>
          <legend>{t("time")}</legend>
          <div className="time-options">
            {timeControls.map((option) => (
              <button
                key={option}
                className={time === option ? "chosen" : ""}
                onClick={() => setTime(option)}
                aria-pressed={time === option}
              >
                {option === "untimed" ? t("untimed") : option}
              </button>
            ))}
          </div>
        </fieldset>
        <button
          className="button primary full-width"
          onClick={() =>
            onStart(
              createSession(
                mode,
                color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color,
                difficulty,
                time,
              ),
            )
          }
        >
          {t("begin")}
          <ArrowRight size={18} />
        </button>
      </div>
    </Dialog>
  );
}
