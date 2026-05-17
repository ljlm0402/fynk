import { useEffect, useState } from 'react';
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
  const [pages, setPages] = useState<TPage[]>([]);
  const [pageParams, setPageParams] = useState<TParam[]>([]);
  const [pending, setPending] = useState(enabled);
  const [fetchingNextPage, setFetchingNextPage] = useState(false);
  const [error, setError] = useState<any>(null);

  async function fetchPage(pageParam: TParam, index: number, force = false) {
    const cacheKey = [...key, 'page', index, String(pageParam)].join(':');
    return client.scheduler.run(cacheKey, async () => {
      const page = await request(pageParam);
      if (model) client.normalize(model, page as any);
      return page;
    }, force ? 0 : staleTime);
  }

  async function loadFirstPage(force = false) {
    setPending(true);
    setError(null);
    try {
      const page = await fetchPage(initialPageParam, 0, force);
      setPages([page]);
      setPageParams([initialPageParam]);
      onSuccess?.([page]);
      return page;
    } catch (err) {
      setError(err);
      onError?.(err);
      throw err;
    } finally {
      setPending(false);
    }
  }

  async function fetchNextPage() {
    const nextPageParam = pages.length === 0
      ? initialPageParam
      : getNextPageParam(pages[pages.length - 1], pages);
    if (nextPageParam === undefined || nextPageParam === null) return undefined;

    setFetchingNextPage(true);
    setError(null);
    try {
      const page = await fetchPage(nextPageParam, pages.length, true);
      const nextPages = [...pages, page];
      setPages(nextPages);
      setPageParams([...pageParams, nextPageParam]);
      onSuccess?.(nextPages);
      return page;
    } catch (err) {
      setError(err);
      onError?.(err);
      throw err;
    } finally {
      setFetchingNextPage(false);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    loadFirstPage().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  const hasNextPage = pages.length === 0
    ? true
    : getNextPageParam(pages[pages.length - 1], pages) !== undefined && getNextPageParam(pages[pages.length - 1], pages) !== null;

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
