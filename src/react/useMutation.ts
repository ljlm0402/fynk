
import { useState } from 'react';
import type { HelioClient } from '../core/types.js';

export function useMutation<TVars, TRes>(client: HelioClient, params: {
  request: (vars: TVars) => Promise<TRes>;
  optimistic?: (draft: HelioClient['draft'], vars: TVars) => void;
  onSuccess?: (res: TRes, draft: HelioClient['draft']) => void;
  onError?: (err: any, draft: HelioClient['draft']) => void;
  onSettled?: (res: TRes | null, err: any, draft: HelioClient['draft']) => void;
  invalidate?: (string | (string|number)[])[];
}) {
  const [pending, setPending] = useState(false);
  const mutate = async (vars: TVars) => {
    setPending(true);
    const didOptimistic = Boolean(params.optimistic);
    try {
      params.optimistic?.(client.draft, vars);
      const res = await params.request(vars);
      if (didOptimistic) client.draft.commit();
      params.invalidate?.forEach(key => client.invalidate(key));
      params.onSuccess?.(res, client.draft);
      params.onSettled?.(res, null, client.draft);
      return res;
    } catch (e) {
      if (didOptimistic) client.draft.rollback();
      params.onError?.(e, client.draft);
      params.onSettled?.(null, e, client.draft);
      throw e;
    } finally {
      setPending(false);
    }
  };
  return { mutate, pending };
}
