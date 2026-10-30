"use client";
import { useEffect, useRef, useState } from "react";
import type { Square } from "chess.js";
import { position, type GameSession } from "@/lib/chess";
import { engineResponseIsCurrent } from "@/lib/engine";
export interface PositionIdentity {
  id: string;
  fen: string;
}
type ApplyComputerMove = (
  from: Square,
  to: Square,
  promotion: string,
  engine: boolean,
  expected: PositionIdentity,
) => void;
export function useComputer(
  session: GameSession | null,
  onMove: ApplyComputerMove,
) {
  const [failedGame, setFailedGame] = useState<string | null>(null);
  const current = useRef(session);
  useEffect(() => {
    current.current = session;
  }, [session]);
  const thinking =
    !!session &&
    session.mode === "computer" &&
    !session.paused &&
    !session.result &&
    position(session.moves).turn() !== session.human;
  useEffect(() => {
    if (!session || !thinking) return;
    const request = { id: session.id, fen: position(session.moves).fen() };
    let worker: Worker | null = null;
    let cancelled = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (!cancelled) setFailedGame(request.id);
      worker?.terminate();
    };
    // A short delay lets the previous move paint before the local worker begins its search.
    const timer = setTimeout(() => {
      try {
        worker = new Worker(
          new URL("../lib/engine.worker.ts", import.meta.url),
        );
        worker.onmessage = (
          event: MessageEvent<
            PositionIdentity & { move: string | null; error?: boolean }
          >,
        ) => {
          clearTimeout(watchdog);
          const game = current.current;
          if (
            cancelled ||
            !game ||
            game.paused ||
            game.result ||
            !engineResponseIsCurrent(event.data, {
              id: game.id,
              fen: position(game.moves).fen(),
            })
          )
            return;
          if (event.data.error || !event.data.move) {
            fail();
            return;
          }
          try {
            const chess = position(game.moves);
            const next = chess.move(event.data.move);
            onMove(next.from, next.to, next.promotion || "q", true, request);
          } catch {
            fail();
          }
        };
        worker.onerror = fail;
        watchdog = setTimeout(fail, 6000);
        worker.postMessage({ ...request, difficulty: session.difficulty });
      } catch {
        fail();
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(watchdog);
      worker?.terminate();
    };
  }, [session, thinking, onMove]);
  const engineError = session?.id === failedGame;
  return { thinking: thinking && !engineError, engineError };
}
