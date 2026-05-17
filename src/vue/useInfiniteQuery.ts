// @ts-ignore
import { ref, onUnmounted } from 'vue';
import type { FynkClient, ModelDef } from '../core/types.js';

export function useInfiniteQuery<TPage, TParam = unknown>(client: FynkClient, params: {
  key: (string | number)[];
  initialPageParam: TParam;
  request: (pageParam: TParam) => Promise<TPage>;
  getNextPageParam: (lastPage: TPage, pages: TPage[]) => TParam | undefined | null;
  model?: ModelDef<any>;
  enabled?: boolean;
  staleTime?: number;
  onSuccess?: (pages: TPage[]) => void;
  onError?: (error: any) => void;
}) {
  const {
    key,
    initialPageParam,
    request,
    getNextPageParam,
    model,
    enabled = true,
    staleTime = 30_000,
    onSuccess,
    onError
  } = params;
  const pages = ref<TPage[]>([]);
  const pageParams = ref<TParam[]>([]);
  const pending = ref(enabled);
  const fetchingNextPage = ref(false);
  const error = ref<any>(null);
  let disposed = false;

  async function fetchPage(pageParam: TParam, index: number, force = false) {
    const cacheKey = [...key, 'page', index, String(pageParam)].join(':');
    return client.scheduler.run(cacheKey, async () => {
      const page = await request(pageParam);
      if (model) client.normalize(model, page as any);
      return page;
    }, force ? 0 : staleTime);
  }

  async function loadFirstPage(force = false) {
    pending.value = true;
    error.value = null;
    try {
      const page = await fetchPage(initialPageParam, 0, force);
      if (!disposed) {
        pages.value = [page];
        pageParams.value = [initialPageParam];
        onSuccess?.(pages.value);
      }
      return page;
    } catch (err) {
      if (!disposed) {
        error.value = err;
        onError?.(err);
      }
      throw err;
    } finally {
      if (!disposed) pending.value = false;
    }
  }

  async function fetchNextPage() {
    const nextPageParam = pages.value.length === 0
      ? initialPageParam
      : getNextPageParam(pages.value[pages.value.length - 1], pages.value);
    if (nextPageParam === undefined || nextPageParam === null) return undefined;

    fetchingNextPage.value = true;
    error.value = null;
    try {
      const page = await fetchPage(nextPageParam, pages.value.length, true);
      if (!disposed) {
        pages.value = [...pages.value, page];
        pageParams.value = [...pageParams.value, nextPageParam];
        onSuccess?.(pages.value);
      }
      return page;
    } catch (err) {
      if (!disposed) {
        error.value = err;
        onError?.(err);
      }
      throw err;
    } finally {
      if (!disposed) fetchingNextPage.value = false;
    }
  }

  if (enabled) loadFirstPage().catch(() => {});
  onUnmounted(() => { disposed = true; });

  const hasNextPage = () => pages.value.length === 0
    ? true
    : getNextPageParam(pages.value[pages.value.length - 1], pages.value) !== undefined
      && getNextPageParam(pages.value[pages.value.length - 1], pages.value) !== null;

  return {
    pages,
    pageParams,
    data: pages,
    pending,
    fetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    refetch: () => loadFirstPage(true)
  };
}
