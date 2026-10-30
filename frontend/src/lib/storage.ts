import type { GameSession } from "./chess";
import { position, timeControls } from "./chess";
import type { Locale } from "./i18n";
export interface Preferences {
  locale: Locale;
  theme: "light" | "dark" | "system";
  sound: boolean;
  highlights: boolean;
  coordinates: boolean;
  reduced: boolean;
}
export interface ProfileData {
  name: string;
  avatar: number;
}
export interface LocalData {
  profile: ProfileData;
  history: GameSession[];
  solved: number[];
  active: GameSession | null;
}
export const defaultPreferences: Preferences = {
  locale: "uz",
  theme: "system",
  sound: true,
  highlights: true,
  coordinates: true,
  reduced: false,
};
export const emptyData: LocalData = {
  profile: { name: "", avatar: 0 },
  history: [],
  solved: [],
  active: null,
};
export const preferenceKey = "shatranj.preferences.v1";
export const dataKey = "shatranj.data.v1";
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function isColor(value: unknown): value is "w" | "b" {
  return value === "w" || value === "b";
}
export function validSession(value: unknown): value is GameSession {
  if (!isObject(value)) return false;
  const {
    id,
    mode,
    human,
    difficulty,
    time,
    moves,
    startedAt,
    paused,
    clock,
    result,
  } = value;
  if (
    typeof id !== "string" ||
    id.length > 100 ||
    (mode !== "computer" && mode !== "local") ||
    !isColor(human) ||
    (difficulty !== "easy" &&
      difficulty !== "medium" &&
      difficulty !== "hard") ||
    !timeControls.some((control) => control === time) ||
    !Array.isArray(moves) ||
    moves.length > 2000 ||
    !moves.every((move: unknown) => typeof move === "string") ||
    !isNonNegativeNumber(startedAt) ||
    startedAt > 8.64e15 ||
    typeof paused !== "boolean" ||
    !isObject(clock)
  )
    return false;
  if (
    !isColor(clock.active) ||
    typeof clock.timed !== "boolean" ||
    !isNonNegativeNumber(clock.w) ||
    !isNonNegativeNumber(clock.b) ||
    !isNonNegativeNumber(clock.since) ||
    !isNonNegativeNumber(clock.increment)
  )
    return false;
  if (result !== null) {
    if (
      !isObject(result) ||
      (result.winner !== null && !isColor(result.winner))
    )
      return false;
    if (
      ![
        "checkmate",
        "stalemate",
        "insufficient",
        "repetition",
        "fifty",
        "timeout",
        "resignation",
        "agreement",
      ].includes(String(result.reason))
    )
      return false;
  }
  try {
    return position(moves).turn() === clock.active;
  } catch {
    return false;
  }
}
function isPreferences(value: unknown): value is Preferences {
  if (!isObject(value)) return false;
  return (
    (value.locale === "uz" || value.locale === "en" || value.locale === "ru") &&
    (value.theme === "light" ||
      value.theme === "dark" ||
      value.theme === "system") &&
    typeof value.sound === "boolean" &&
    typeof value.highlights === "boolean" &&
    typeof value.coordinates === "boolean" &&
    typeof value.reduced === "boolean"
  );
}
export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return { ...defaultPreferences };
  const value: unknown = JSON.parse(raw);
  if (!isPreferences(value)) throw new Error("Invalid preferences");
  return value;
}
function isLocalData(value: unknown): value is LocalData {
  if (!isObject(value) || !isObject(value.profile)) return false;
  const { profile, history, solved, active } = value;
  if (
    typeof profile.name !== "string" ||
    profile.name.length > 30 ||
    typeof profile.avatar !== "number" ||
    !Number.isInteger(profile.avatar) ||
    profile.avatar < 0 ||
    profile.avatar > 3
  )
    return false;
  if (
    !Array.isArray(history) ||
    history.length > 100 ||
    !history.every(
      (game: unknown) => validSession(game) && game.result !== null,
    )
  )
    return false;
  if (
    !Array.isArray(solved) ||
    !solved.every(
      (id: unknown) =>
        typeof id === "number" && Number.isInteger(id) && id >= 0 && id < 6,
    ) ||
    new Set(solved).size !== solved.length
  )
    return false;
  return active === null || validSession(active);
}
export function parseData(raw: string | null): LocalData {
  if (!raw) return structuredClone(emptyData);
  const value: unknown = JSON.parse(raw);
  if (!isLocalData(value)) throw new Error("Invalid saved data");
  return value;
}
export function loadLocal(): {
  preferences: Preferences;
  data: LocalData;
  error: boolean;
} {
  let preferences = { ...defaultPreferences };
  let data = structuredClone(emptyData);
  let error = false;
  try {
    preferences = parsePreferences(localStorage.getItem(preferenceKey));
  } catch {
    error = true;
  }
  try {
    data = parseData(localStorage.getItem(dataKey));
    if (data.active && !data.active.result) data.active.paused = true;
  } catch {
    error = true;
  }
  return { preferences, data, error };
}
export function saveLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
