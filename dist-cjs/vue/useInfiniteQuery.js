"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInfiniteQuery = useInfiniteQuery;
// @ts-ignore
const vue_1 = require("vue");
function useInfiniteQuery(client, params) {
    const { key, initialPageParam, request, getNextPageParam, model, enabled = true, staleTime = 30000, onSuccess, onError } = params;
    const pages = (0, vue_1.ref)([]);
    const pageParams = (0, vue_1.ref)([]);
    const pending = (0, vue_1.ref)(enabled);
    const fetchingNextPage = (0, vue_1.ref)(false);
    const error = (0, vue_1.ref)(null);
    let disposed = false;
    async function fetchPage(pageParam, index, force = false) {
        const cacheKey = [...key, 'page', index, String(pageParam)].join(':');
        return client.scheduler.run(cacheKey, async () => {
            const page = await request(pageParam);
            if (model)
                client.normalize(model, page);
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
                onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(pages.value);
            }
            return page;
        }
        catch (err) {
            if (!disposed) {
                error.value = err;
                onError === null || onError === void 0 ? void 0 : onError(err);
            }
            throw err;
        }
        finally {
            if (!disposed)
                pending.value = false;
        }
    }
    async function fetchNextPage() {
        const nextPageParam = pages.value.length === 0
            ? initialPageParam
            : getNextPageParam(pages.value[pages.value.length - 1], pages.value);
        if (nextPageParam === undefined || nextPageParam === null)
            return undefined;
        fetchingNextPage.value = true;
        error.value = null;
        try {
            const page = await fetchPage(nextPageParam, pages.value.length, true);
            if (!disposed) {
                pages.value = [...pages.value, page];
                pageParams.value = [...pageParams.value, nextPageParam];
                onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(pages.value);
            }
            return page;
        }
        catch (err) {
            if (!disposed) {
                error.value = err;
                onError === null || onError === void 0 ? void 0 : onError(err);
            }
            throw err;
        }
        finally {
            if (!disposed)
                fetchingNextPage.value = false;
        }
    }
    if (enabled)
        loadFirstPage().catch(() => { });
    (0, vue_1.onUnmounted)(() => { disposed = true; });
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
