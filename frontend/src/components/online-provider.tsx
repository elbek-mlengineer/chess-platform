"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { OnlineAction, OnlineState } from "@/lib/online";
import { onlineDictionaries, onlineErrorText } from "@/lib/online-i18n";
import { useApp } from "./provider";

interface OnlineContextValue {
  state: OnlineState | null;
  loading: boolean;
  busy: boolean;
  connected: boolean;
  error: string | null;
  search: string;
  searching: boolean;
  setSearch: (query: string) => void;
  act: (action: OnlineAction) => Promise<boolean>;
  refresh: () => Promise<void>;
  text: (typeof onlineDictionaries)["en"];
  serverTime: () => number;
}
const OnlineContext = createContext<OnlineContextValue | null>(null);
export function OnlineProvider({ children }: { children: React.ReactNode }) {
  const { preferences } = useApp();
  const [state, setState] = useState<OnlineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resultQuery, setResultQuery] = useState("");
  const writing = useRef(false);
  const pollDelay = useRef(1500);
  const sequence = useRef(0);
  const clock = useRef({ server: 0, received: 0 });
  const alive = useRef(true);
  const query = useRef(search);
  const load = useCallback(
    async (action?: OnlineAction, signal?: AbortSignal) => {
      const current = ++sequence.current;
      const requestedQuery = query.current;
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (signal?.aborted) abort();
      signal?.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(abort, 10_000);
      try {
        const response = await fetch(
          `/api/online?q=${encodeURIComponent(requestedQuery)}`,
          {
            method: action ? "POST" : "GET",
            cache: "no-store",
            signal: controller.signal,
            ...(action
              ? {
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(action),
                }
              : {}),
          },
        );
        // The same-origin API is the typed boundary; server input and database records are validated independently.
        const body: { state?: OnlineState; error?: string } =
          await response.json();
        if (!alive.current || current !== sequence.current) return false;
        setConnected(response.status < 500);
        if (!response.ok || !body.state) {
          setErrorCode(body.error || "serverError");
          if (response.status === 401) setState(null);
          return false;
        }
        clock.current = {
          server: body.state.serverNow,
          received: performance.now(),
        };
        pollDelay.current =
          body.state.games.some((game) => !game.result) ||
          body.state.sentInvitations.length > 0
            ? 400
            : 1500;
        setState(body.state);
        setResultQuery(requestedQuery);
        // A successful heartbeat must not erase a failed action before the user can read it.
        setErrorCode((previous) =>
          action || previous === "networkError" ? null : previous,
        );
        return true;
      } catch (error) {
        if (signal?.aborted || !alive.current || current !== sequence.current)
          return false;
        console.error("Online request failed", error);
        setConnected(false);
        setErrorCode("networkError");
        return false;
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
        if (alive.current) setLoading(false);
      }
    },
    [],
  );
  const refresh = useCallback(async () => {
    if (!writing.current) await load();
  }, [load]);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!writing.current) await load(undefined, controller.signal);
      if (!controller.signal.aborted)
        timer = setTimeout(
          poll,
          document.visibilityState === "hidden" ? 4000 : pollDelay.current,
        );
    }
    const initial = setTimeout(poll, 0);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      alive.current = false;
      controller.abort();
      clearTimeout(initial);
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, refresh]);
  useEffect(() => {
    query.current = search;
    const timer = setTimeout(() => {
      void refresh();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, refresh]);
  const act = useCallback(
    async (action: OnlineAction) => {
      if (writing.current) return false;
      writing.current = true;
      setBusy(true);
      const success = await load(action);
      writing.current = false;
      if (alive.current) setBusy(false);
      if (!success) await refresh();
      return success;
    },
    [load, refresh],
  );
  const serverTime = useCallback(
    () =>
      clock.current.server +
      Math.max(0, performance.now() - clock.current.received),
    [],
  );
  return (
    <OnlineContext.Provider
      value={{
        state,
        loading,
        busy,
        connected,
        error: errorCode
          ? onlineErrorText(preferences.locale, errorCode)
          : null,
        search,
        searching: search.trim().length >= 2 && search !== resultQuery,
        setSearch,
        act,
        refresh,
        text: onlineDictionaries[preferences.locale],
        serverTime,
      }}
    >
      {children}
    </OnlineContext.Provider>
  );
}
export function useOnline() {
  const value = useContext(OnlineContext);
  if (!value) throw new Error("OnlineProvider is required");
  return value;
}
