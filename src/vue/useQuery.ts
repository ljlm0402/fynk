
// @ts-ignore
import { ref, onUnmounted } from 'vue';
import type { HelioClient, ModelDef, RequestFn } from '../core/types.js';
import { runQuery } from '../core/client.js';

export function useQuery<T>(client: HelioClient, params: {
  key: (string|number)[];
  request: RequestFn<T>;
  model?: ModelDef<any>;
  staleTime?: number;
}) {
  const { key, request, model, staleTime = 30_000 } = params;
  const data = ref<T | null>(null);
  const pending = ref(true);
  const error = ref<any>(null);
  const stop = client.watchVersion(() => { /* optional reselect */ });
  let disposed = false;

  async function exec(force = false) {
    pending.value = true; error.value = null;
    try {
      const res = await runQuery(client, key, request, model, force ? 0 : staleTime);
      if (!disposed) data.value = res;
    } catch (e) {
      if (!disposed) error.value = e;
    }
    finally {
      if (!disposed) pending.value = false;
    }
  }
  exec(false);
  onUnmounted(() => {
    disposed = true;
    stop?.();
  });

  return { data, pending, error, refetch: () => exec(true) };
}
