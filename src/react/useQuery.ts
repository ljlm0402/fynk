
import { useEffect, useRef, useState } from 'react';
import type { HelioClient, ModelDef, RequestFn } from '../core/types.js';
import { runQuery } from '../core/client.js';

export function useQuery<T>(client: HelioClient, params: {
  key: (string|number)[];
  request: RequestFn<T>;
  model?: ModelDef<any>;
  staleTime?: number;
}) {
  const { key, request, model, staleTime = 30_000 } = params;
  const [data, setData] = useState<T | null>(null);
  const [pending, setPending] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const unsub = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    setPending(true); setError(null);
    runQuery(client, key, request, model, staleTime)
      .then(res => { if (!disposed) setData(res); })
      .catch(err => { if (!disposed) setError(err); })
      .finally(() => { if (!disposed) setPending(false); });

    unsub.current = client.watchVersion(() => { /* optionally reselect cache */ });
    return () => { disposed = true; unsub.current?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  const refetch = () => {
    setPending(true);
    return runQuery(client, key, request, model, 0)
      .then(res => { setData(res); return res; })
      .catch(err => { setError(err); throw err; })
      .finally(() => setPending(false));
  };

  return { data, pending, error, refetch };
}
