import {useCallback, useEffect, useRef, useState} from 'react';
import {ApiError} from '../api/client';

export type Resource<T> = {
  data: T | undefined;
  error: ApiError | undefined;
  /** True only for the first load, so refreshes never blank the screen. */
  loading: boolean;
  refreshing: boolean;
  reload: () => Promise<void>;
};

type Options = {
  /** Poll interval in ms. Live equipment screens re-read confirmed state. */
  pollMs?: number;
  enabled?: boolean;
};

/**
 * Loads an API resource, keeps the last good value while refreshing, and can
 * poll so that displayed equipment state stays close to the device feedback the
 * service has actually confirmed.
 */
export function useResource<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  options: Options = {},
): Resource<T> {
  const {pollMs, enabled = true} = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const hasData = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (!enabled) {
      return;
    }
    if (hasData.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const next = await loaderRef.current();
      if (!mounted.current) {
        return;
      }
      hasData.current = true;
      setData(next);
      setError(undefined);
    } catch (cause) {
      if (!mounted.current) {
        return;
      }
      setError(
        cause instanceof ApiError
          ? cause
          : new ApiError(0, 'UNEXPECTED_ERROR', 'Something went wrong while reading the service.'),
      );
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled]);

  // The caller owns this dependency array: it names the identifiers the loader
  // closes over, so a change of site, device or command reloads the resource.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    hasData.current = false;
    setData(undefined);
    setError(undefined);
    if (!enabled) {
      setLoading(false);
      return;
    }
    run();
  }, deps);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!pollMs || !enabled) {
      return;
    }
    const timer = setInterval(run, pollMs);
    return () => clearInterval(timer);
  }, [pollMs, enabled, run]);

  return {data, error, loading, refreshing, reload: run};
}
