import type { Color } from "chess.js";
import type { ClockState } from "./chess";
export function clockAt(
  clock: ClockState,
  now: number,
  running = true,
): Record<Color, number> {
  const remaining = { w: clock.w, b: clock.b };
  if (clock.timed && running)
    remaining[clock.active] = Math.max(
      0,
      remaining[clock.active] - Math.max(0, now - clock.since),
    );
  return remaining;
}
export function switchClock(clock: ClockState, now: number): ClockState {
  const remaining = clockAt(clock, now);
  if (clock.timed) remaining[clock.active] += clock.increment;
  return {
    ...clock,
    ...remaining,
    active: clock.active === "w" ? "b" : "w",
    since: now,
  };
}
export function clockText(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
