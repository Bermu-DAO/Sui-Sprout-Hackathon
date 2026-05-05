"use client";

import { useCallback, useEffect, useState } from "react";

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string; code?: number };

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { state: FetchState<T>; refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ status: "idle" });

  const run = useCallback(() => {
    setState({ status: "loading" });
    fetcher()
      .then((data) => setState({ status: "success", data }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        const code = message.includes("403") ? 403 : message.includes("404") ? 404 : undefined;
        setState({ status: "error", message, code });
      });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
  }, [run]);

  return { state, refetch: run };
}
