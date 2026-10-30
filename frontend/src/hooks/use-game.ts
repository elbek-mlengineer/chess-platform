"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Square } from "chess.js";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/provider";
import {
  boardResult,
  legalMove,
  position,
  type GameResult,
  type GameSession,
} from "@/lib/chess";
import { clockAt, switchClock } from "@/lib/clock";
import { engineResponseIsCurrent } from "@/lib/engine";
import { useComputer, type PositionIdentity } from "./use-computer";
import { useMoveSound } from "./use-move-sound";
import { dataKey, saveLocal } from "@/lib/storage";
function withResult(
  game: GameSession,
  result: GameResult,
  now: number,
): GameSession {
  return {
    ...game,
    clock: {
      ...game.clock,
      ...clockAt(game.clock, now, !game.paused),
      since: now,
    },
    result,
    paused: false,
  };
}
export function useGame() {
  const { data, setData, preferences, reportStorageError } = useApp();
  const session = data.active;
  const [now, setNow] = useState(() => Date.now());
  const pathname = usePathname();
  const current = useRef(session);
  useEffect(() => {
    current.current = session;
  }, [session]);
  const commit = useCallback(
    (change: (game: GameSession) => GameSession) => {
      setData((previous) => {
        if (!previous.active) return previous;
        const next = change(previous.active);
        if (next === previous.active) return previous;
        const history =
          next.result && !previous.history.some((g) => g.id === next.id)
            ? [next, ...previous.history].slice(0, 100)
            : previous.history;
        return { ...previous, active: next, history };
      });
    },
    [setData],
  );
  const finish = useCallback(
    (result: GameResult) =>
      commit((game) =>
        game.result ? game : withResult(game, result, Date.now()),
      ),
    [commit],
  );
  const move = useCallback(
    (
      from: Square,
      to: Square,
      promotion: string,
      engine = false,
      expected?: PositionIdentity,
    ) => {
      commit((game) => {
        if (game.result || game.paused) return game;
        const chess = position(game.moves);
        if (
          expected &&
          !engineResponseIsCurrent(expected, { id: game.id, fen: chess.fen() })
        )
          return game;
        if (
          game.mode === "computer" &&
          (engine ? chess.turn() === game.human : chess.turn() !== game.human)
        )
          return game;
        const timestamp = Date.now();
        if (
          game.clock.timed &&
          clockAt(game.clock, timestamp)[game.clock.active] <= 0
        )
          return withResult(
            game,
            {
              winner: game.clock.active === "w" ? "b" : "w",
              reason: "timeout",
            },
            timestamp,
          );
        const moved = legalMove(chess, from, to, promotion);
        if (!moved) return game;
        const next = {
          ...game,
          moves: [...game.moves, moved.san],
          clock: switchClock(game.clock, timestamp),
        };
        const result = boardResult(chess);
        return result ? withResult(next, result, timestamp) : next;
      });
    },
    [commit],
  );
  const unlockSound = useMoveSound(
    session?.moves.length || 0,
    preferences.sound,
  );
  useEffect(() => {
    if (!session || session.paused || session.result) return;
    const interval = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      const game = current.current;
      if (
        game &&
        !game.result &&
        !game.paused &&
        game.clock.timed &&
        clockAt(game.clock, timestamp)[game.clock.active] <= 0
      )
        finish({
          winner: game.clock.active === "w" ? "b" : "w",
          reason: "timeout",
        });
    }, 100);
    return () => window.clearInterval(interval);
  }, [session, finish]);
  useEffect(() => {
    if (!session || session.result || session.paused) return;
    const snapshot = () => {
      const timestamp = Date.now();
      const saved = saveLocal(dataKey, {
        ...data,
        active: {
          ...session,
          clock: {
            ...session.clock,
            ...clockAt(session.clock, timestamp),
            since: timestamp,
          },
          paused: true,
        },
      });
      if (!saved) reportStorageError();
    };
    const interval = window.setInterval(snapshot, 1000);
    window.addEventListener("pagehide", snapshot);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", snapshot);
    };
  }, [data, session, reportStorageError]);
  useEffect(() => {
    // Leaving the playing surface pauses both clocks and cancels its worker via effect cleanup.
    return () => {
      commit((game) =>
        game.result || game.paused
          ? game
          : {
              ...game,
              paused: true,
              clock: {
                ...game.clock,
                ...clockAt(game.clock, Date.now()),
                since: Date.now(),
              },
            },
      );
    };
  }, [commit, pathname]);
  const { thinking, engineError } = useComputer(session, move);
  return {
    session,
    now,
    move,
    finish,
    thinking,
    engineError,
    unlockSound,
    resume: () =>
      commit((game) => ({
        ...game,
        paused: false,
        clock: { ...game.clock, since: Date.now() },
      })),
  };
}
