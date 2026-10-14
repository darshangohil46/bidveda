"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueryResult } from "@/types/api";

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Something went wrong. Please try again.");
}

/**
 * Loads data through a service method and keeps it fresh when `key` changes.
 *
 * - `key` is a string that identifies the request (e.g. JSON.stringify(filters)).
 * - Older requests are aborted, so a slow response can never overwrite a newer one.
 * - Previous data stays on screen while the next page loads (`loading` is still true).
 * - `reload()` refetches with the same key.
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  key: string,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  const fetcherRef = useRef(fetcher);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<QueryResult<T> | null>(null);
  const requestKey = `${key}#${version}`;

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    fetcherRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setResult({ requestKey, data, error: null });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ requestKey, data: null, error: toError(error) });
      },
    );
    return () => controller.abort();
  }, [requestKey, enabled]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const isCurrent = result?.requestKey === requestKey;

  return {
    data: result?.data ?? null,
    error: isCurrent ? (result?.error ?? null) : null,
    loading: enabled && !isCurrent,
    reload,
  };
}
