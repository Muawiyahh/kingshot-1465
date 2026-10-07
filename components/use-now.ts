"use client";

import { useSyncExternalStore } from "react";

type Clock = { subscribe: (cb: () => void) => () => void; getSnapshot: () => number };
const clocks = new Map<number, Clock>();

/** One shared ticking clock per interval, so many components don't each run a timer. */
function getClock(intervalMs: number): Clock {
  let clock = clocks.get(intervalMs);
  if (clock) return clock;

  let now = Date.now();
  let timer: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();

  clock = {
    subscribe(cb) {
      listeners.add(cb);
      if (!timer) {
        now = Date.now();
        timer = setInterval(() => {
          now = Date.now();
          for (const l of listeners) l();
        }, intervalMs);
      }
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },
    getSnapshot: () => now,
  };
  clocks.set(intervalMs, clock);
  return clock;
}

const serverSnapshot = () => null;

/** Current time, ticking every `intervalMs`. Null during server render and hydration so markup matches. */
export function useNow(intervalMs = 30_000): number | null {
  const clock = getClock(intervalMs);
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, serverSnapshot);
}
