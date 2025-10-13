
import { useState } from 'react';
import type { HelioClient } from '../core/types';

export function useMutation<TVars, TRes>(client: HelioClient, params: {
  request: (vars: TVars) => Promise<TRes>;
  optimistic?: (draft: HelioClient['draft'], vars: TVars) => void;
  onSuccess?: (res: TRes, draft: HelioClient['draft']) => void;
  onError?: (err: any, draft: HelioClient['draft']) => void;
}) {
  const [pending, setPending] = useState(false);
  const mutate = async (vars: TVars) => {
    setPending(true);
    try {
      params.optimistic?.(client.draft, vars);
      const res = await params.request(vars);
      params.onSuccess?.(res, client.draft);
      return res;
    } catch (e) {
      params.onError?.(e, client.draft);
      throw e;
    } finally {
      setPending(false);
    }
  };
  return { mutate, pending };
}
