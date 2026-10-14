"use client";

import { useEffect, useMemo, useState } from "react";
import type { ToastAction, ToastInput, ToastItem } from "@/types/ui";

const TOAST_LIMIT = 3;
const REMOVE_DELAY_MS = 300;

let memoryState: ToastItem[] = [];
const listeners = new Set<(toasts: ToastItem[]) => void>();
let counter = 0;

function dispatch(action: ToastAction): void {
  switch (action.type) {
    case "ADD":
      memoryState = [action.toast, ...memoryState].slice(0, TOAST_LIMIT);
      break;
    case "DISMISS":
      memoryState = memoryState.map((item) =>
        item.id === action.id ? { ...item, open: false } : item,
      );
      break;
    case "REMOVE":
      memoryState = memoryState.filter((item) => item.id !== action.id);
      break;
  }
  listeners.forEach((listener) => listener(memoryState));
}

function dismiss(id: string): void {
  dispatch({ type: "DISMISS", id });
  // Let the close animation play before the toast leaves the list.
  setTimeout(() => dispatch({ type: "REMOVE", id }), REMOVE_DELAY_MS);
}

function toast(input: ToastInput): { id: string; dismiss: () => void } {
  counter += 1;
  const id = `toast-${counter}`;
  dispatch({ type: "ADD", toast: { ...input, id, open: true } });
  return { id, dismiss: () => dismiss(id) };
}

/**
 * Toasts from anywhere in the client tree:
 *   const { success, error } = useToast();
 *   success("RFQ published", "Vendors can quote now.");
 * The returned object is memoised, so it is safe in dependency arrays.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(memoryState);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return useMemo(
    () => ({
      toasts,
      toast,
      dismiss,
      success: (title: string, description?: string) =>
        toast({ title, description, variant: "success" }),
      error: (title: string, description?: string) =>
        toast({ title, description, variant: "destructive", duration: 7000 }),
      info: (title: string, description?: string) =>
        toast({ title, description }),
    }),
    [toasts],
  );
}
