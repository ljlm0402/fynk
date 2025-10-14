
import { useEffect, useRef, useState } from 'react';
import type { HelioClient, ModelDef, RequestFn } from '../core/types';
import { runQuery } from '../core/client';

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
    setPending(true); setError(null);
    runQuery(client, key, request, model, staleTime)
      .then(res => setData(res))
      .catch(setError)
      .finally(() => setPending(false));

    unsub.current = client.watchVersion(() => { /* optionally reselect cache */ });
    return () => { unsub.current?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  const refetch = () => {
    setPending(true);
    return runQuery(client, key, request, model, 0)
      .then(res => setData(res))
      .catch(setError)
      .finally(() => setPending(false));
  };

  return { data, pending, error, refetch };
}
