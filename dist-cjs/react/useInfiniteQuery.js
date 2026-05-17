"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInfiniteQuery = useInfiniteQuery;
const react_1 = require("react");
function useInfiniteQuery(client, params) {
    const { key, initialPageParam, request, getNextPageParam, model, enabled = true, staleTime = 30000, onSuccess, onError } = params;
    const [pages, setPages] = (0, react_1.useState)([]);
    const [pageParams, setPageParams] = (0, react_1.useState)([]);
    const [pending, setPending] = (0, react_1.useState)(enabled);
    const [fetchingNextPage, setFetchingNextPage] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
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
        setPending(true);
        setError(null);
        try {
            const page = await fetchPage(initialPageParam, 0, force);
            setPages([page]);
            setPageParams([initialPageParam]);
            onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess([page]);
            return page;
        }
        catch (err) {
            setError(err);
            onError === null || onError === void 0 ? void 0 : onError(err);
            throw err;
        }
        finally {
            setPending(false);
        }
    }
    async function fetchNextPage() {
        const nextPageParam = pages.length === 0
            ? initialPageParam
            : getNextPageParam(pages[pages.length - 1], pages);
        if (nextPageParam === undefined || nextPageParam === null)
            return undefined;
        setFetchingNextPage(true);
        setError(null);
        try {
            const page = await fetchPage(nextPageParam, pages.length, true);
            const nextPages = [...pages, page];
            setPages(nextPages);
            setPageParams([...pageParams, nextPageParam]);
            onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(nextPages);
            return page;
        }
        catch (err) {
            setError(err);
            onError === null || onError === void 0 ? void 0 : onError(err);
            throw err;
        }
        finally {
            setFetchingNextPage(false);
        }
    }
    (0, react_1.useEffect)(() => {
        if (!enabled)
            return;
        loadFirstPage().catch(() => { });
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
