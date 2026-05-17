
// @ts-ignore
import { ref } from 'vue';
import type { HelioClient } from '../core/types.js';

export function useMutation<TVars, TRes>(client: HelioClient, params: {
  request: (vars: TVars) => Promise<TRes>;
  optimistic?: (draft: HelioClient['draft'], vars: TVars) => void;
  onSuccess?: (res: TRes, draft: HelioClient['draft']) => void;
  onError?: (err: any, draft: HelioClient['draft']) => void;
}) {
  const pending = ref(false);
  async function mutate(vars: TVars) {
    pending.value = true;
    const didOptimistic = Boolean(params.optimistic);
    try {
      params.optimistic?.(client.draft, vars);
      const res = await params.request(vars);
      if (didOptimistic) client.draft.commit();
      params.onSuccess?.(res, client.draft);
      return res;
    } catch (e) {
      if (didOptimistic) client.draft.rollback();
      params.onError?.(e, client.draft);
      throw e;
    } finally {
      pending.value = false;
    }
  }
  return { mutate, pending };
}
