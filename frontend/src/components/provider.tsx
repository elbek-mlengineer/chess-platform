"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { dictionaries, type TextKey } from "@/lib/i18n";
import {
  loadLocal,
  saveLocal,
  preferenceKey,
  dataKey,
  defaultPreferences,
  emptyData,
  type LocalData,
  type Preferences,
} from "@/lib/storage";
interface AppContextValue {
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  data: LocalData;
  setData: Dispatch<SetStateAction<LocalData>>;
  t: (key: TextKey) => string;
  ready: boolean;
  storageError: boolean;
  reportStorageError: () => void;
  dismissError: () => void;
  clearData: () => void;
}
const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [data, setData] = useState(emptyData);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const reportStorageError = useCallback(() => setStorageError(true), []);
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = loadLocal();
      setPreferences(saved.preferences);
      setData(saved.data);
      setStorageError(saved.error);
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = preferences.locale;
    document.documentElement.dataset.reduced = String(preferences.reduced);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      let theme = preferences.theme;
      if (theme === "system") theme = media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
    };
    update();
    media.addEventListener("change", update);
    const saveTimer = setTimeout(() => {
      if (!saveLocal(preferenceKey, preferences)) setStorageError(true);
    }, 0);
    return () => {
      clearTimeout(saveTimer);
      media.removeEventListener("change", update);
    };
  }, [preferences, ready]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      if (!saveLocal(dataKey, data)) setStorageError(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [data, ready]);
  const value: AppContextValue = {
    preferences,
    setPreferences,
    data,
    setData,
    ready,
    storageError,
    reportStorageError,
    dismissError: () => setStorageError(false),
    t: (key) => dictionaries[preferences.locale][key],
    clearData: () => {
      setData(structuredClone(emptyData));
      setPreferences({ ...defaultPreferences });
    },
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppProvider is required");
  return context;
}
