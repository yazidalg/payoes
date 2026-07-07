"use client";

import { useCallback, useEffect, useState } from "react";

type AsyncDataState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[]
) {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });
  const [reloadCounter, setReloadCounter] = useState(0);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setState({ data: null, error: null, isLoading: true });
      }
    });

    void fetcher()
      .then((data) => {
        if (!cancelled) {
          setState({ data, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Something went wrong";
          setState({ data: null, error: message, isLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [depsKey, reloadCounter, fetcher]);

  const reload = useCallback(() => {
    setState((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));
    setReloadCounter((count) => count + 1);
  }, []);

  return { ...state, reload };
}
