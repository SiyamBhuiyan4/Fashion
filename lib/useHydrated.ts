"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * False while the server-rendered markup is still on screen, true once React has taken over.
 * Used for anything that only exists in the browser (the cart lives in localStorage), so the
 * first client render matches the server and hydration never mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
