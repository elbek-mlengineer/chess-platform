"use client";
import { useEffect, useRef } from "react";
export function useMoveSound(moveCount: number, enabled: boolean) {
  const context = useRef<AudioContext | null>(null);
  useEffect(() => {
    const audio = context.current;
    if (!enabled || !moveCount || !audio || audio.state !== "running") return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.frequency.value = 420;
    gain.gain.setValueAtTime(0.04, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.08);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.09);
  }, [moveCount, enabled]);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  function unlockSound() {
    if (!enabled) return;
    // Browser autoplay rules require this to run inside a user gesture.
    try {
      if (!context.current) context.current = new AudioContext();
      if (context.current.state === "suspended")
        void context.current.resume().catch(() => {
          /* Sound is optional; visual status always remains available. */
        });
    } catch {
      /* Web Audio may be disabled by the browser. */
    }
  }
  return unlockSound;
}
