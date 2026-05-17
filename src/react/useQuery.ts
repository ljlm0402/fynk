
import { useEffect, useRef, useState } from 'react';
import type { FynkClient, ModelDef, RequestFn } from '../core/types.js';
import { runQuery } from '../core/client.js';

export function useQuery<T, TSelected = T>(client: FynkClient, params: {
  key: (string|number)[];
  request: RequestFn<T>;
  model?: ModelDef<any>;
  enabled?: boolean;
  initialData?: TSelected;
  select?: (data: T) => TSelected;
  staleTime?: number;
  refetchInterval?: number;
  onSuccess?: (data: TSelected) => void;
  onError?: (error: any) => void;
  onSettled?: (data: TSelected | null, error: any) => void;
}) {
  const {
    key,
    request,
    model,
    enabled = true,
    initialData = null,
    select,
    staleTime = 30_000,
    refetchInterval,
    onSuccess,
    onError,
    onSettled
  } = params;
  const [data, setData] = useState<TSelected | null>(initialData as TSelected | null);
  const [pending, setPending] = useState<boolean>(enabled && initialData === null);
  const [error, setError] = useState<any>(null);
  const unsub = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (!enabled) return () => { disposed = true; };

    const exec = (force = false) => {
      setPending(true); setError(null);
      return runQuery(client, key, request, model, force ? 0 : staleTime)
        .then(res => {
          const selected = select ? select(res) : (res as unknown as TSelected);
          if (!disposed) {
            setData(selected);
            onSuccess?.(selected);
            onSettled?.(selected, null);
          }
          return selected;
        })
        .catch(err => {
          if (!disposed) {
            setError(err);
            onError?.(err);
            onSettled?.(null, err);
          }
          throw err;
        })
        .finally(() => { if (!disposed) setPending(false); });
    };

    setPending(true); setError(null);
    exec().catch(() => {});
    if (refetchInterval && refetchInterval > 0) intervalId = setInterval(() => exec(true).catch(() => {}), refetchInterval);

    unsub.current = client.watchVersion(() => { /* optionally reselect cache */ });
    return () => {
      disposed = true;
      if (intervalId) clearInterval(intervalId);
      unsub.current?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  const refetch = () => {
    setPending(true);
    return runQuery(client, key, request, model, 0)
      .then(res => {
        const selected = select ? select(res) : (res as unknown as TSelected);
        setData(selected);
        onSuccess?.(selected);
        onSettled?.(selected, null);
        return selected;
      })
      .catch(err => {
        setError(err);
        onError?.(err);
        onSettled?.(null, err);
        throw err;
      })
      .finally(() => setPending(false));
  };

  return { data, pending, error, refetch };
}
