"use client";

import { useCallback, useSyncExternalStore } from "react";

/** The current time, refreshed every `intervalMs`. Safe for countdowns: no impure calls during render. */
export function useNow(intervalMs = 30_000): number {
  const subscribe = useCallback(
    (onTick: () => void) => {
      const id = setInterval(onTick, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs],
  );

  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}
