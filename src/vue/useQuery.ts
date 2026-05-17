
// @ts-ignore
import { ref, onUnmounted } from 'vue';
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
  const data = ref<TSelected | null>(initialData as TSelected | null);
  const pending = ref(enabled && initialData === null);
  const error = ref<any>(null);
  const stop = client.watchVersion(() => { /* optional reselect */ });
  let disposed = false;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  async function exec(force = false) {
    pending.value = true; error.value = null;
    try {
      const res = await runQuery(client, key, request, model, force ? 0 : staleTime);
      const selected = select ? select(res) : (res as unknown as TSelected);
      if (!disposed) {
        data.value = selected;
        onSuccess?.(selected);
        onSettled?.(selected, null);
      }
      return selected;
    } catch (e) {
      if (!disposed) {
        error.value = e;
        onError?.(e);
        onSettled?.(null, e);
      }
      throw e;
    }
    finally {
      if (!disposed) pending.value = false;
    }
  }
  if (enabled) {
    exec(false).catch(() => {});
    if (refetchInterval && refetchInterval > 0) intervalId = setInterval(() => exec(true).catch(() => {}), refetchInterval);
  }
  onUnmounted(() => {
    disposed = true;
    if (intervalId) clearInterval(intervalId);
    stop?.();
  });

  return { data, pending, error, refetch: () => exec(true) };
}
