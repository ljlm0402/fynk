
// @ts-ignore
import { ref, onUnmounted } from 'vue';
import type { HelioClient, ModelDef, RequestFn } from '../core/types';
import { runQuery } from '../core/client';

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

  async function exec(force = false) {
    pending.value = true; error.value = null;
    try {
      const res = await runQuery(client, key, request, model, force ? 0 : staleTime);
      data.value = res;
    } catch (e) { error.value = e; }
    finally { pending.value = false; }
  }
  exec(false);
  onUnmounted(() => stop?.());

  return { data, pending, error, refetch: () => exec(true) };
}
