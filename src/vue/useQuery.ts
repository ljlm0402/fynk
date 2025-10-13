
import { shallowRef, onScopeDispose } from 'vue';
import type { HelioClient, ModelDef, RequestFn } from '../core/types';
import { runQuery } from '../core/client';

export function useQuery<T>(client: HelioClient, params: {
  key: (string|number)[];
  request: RequestFn<T>;
  model?: ModelDef<any>;
  staleTime?: number;
}) {
  const { key, request, model, staleTime = 30_000 } = params;
  const data = shallowRef<T | null>(null);
  const pending = shallowRef(true);
  const error = shallowRef<any>(null);
  const stop = client.watchVersion(() => { /* optional reselect */ });

  async function exec(force = false) {
    pending.value = true; error.value = null;
    try {
      const res = await runQuery(client, key, request, model, force ? 0 : staleTime);
      data.value = res;
    } catch (e) { error.value = e; }
    finally { pending.value = false; }
  }
  exec(false);
  onScopeDispose(() => stop?.());

  return { data, pending, error, refetch: () => exec(true) };
}
