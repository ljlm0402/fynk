"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.runQuery = runQuery;
const normalized_js_1 = require("./cache/normalized.js");
const scheduler_js_1 = require("./scheduler.js");
const interceptors_js_1 = require("./interceptors.js");
function createClient(opts) {
    const cache = (0, normalized_js_1.createNormalizedCache)();
    const scheduler = (0, scheduler_js_1.createScheduler)();
    const requestInterceptors = new interceptors_js_1.InterceptorManager();
    const responseInterceptors = new interceptors_js_1.InterceptorManager();
    let draftSnapshot = null;
    const draft = {
        insert: (m, e) => { draftSnapshot !== null && draftSnapshot !== void 0 ? draftSnapshot : (draftSnapshot = cache.snapshot()); cache.upsert(m, e); },
        upsert: (m, e) => { draftSnapshot !== null && draftSnapshot !== void 0 ? draftSnapshot : (draftSnapshot = cache.snapshot()); cache.upsert(m, e); },
        patch: (m, id, p) => { draftSnapshot !== null && draftSnapshot !== void 0 ? draftSnapshot : (draftSnapshot = cache.snapshot()); cache.patch(m, id, p); },
        commit: () => { draftSnapshot = null; },
        rollback: () => {
            if (draftSnapshot)
                cache.restore(draftSnapshot);
            draftSnapshot = null;
        }
    };
    function defineModel(def) { return def; }
    function normalize(model, payload) { cache.normalize(model, payload); }
    function watchVersion(cb) { return cache.subscribe(cb); }
    async function pipeline(config) {
        var _a, _b, _c;
        config = await requestInterceptors.runForRequest(config);
        if ((_a = config.hooks) === null || _a === void 0 ? void 0 : _a.beforeRequest)
            config = await config.hooks.beforeRequest(config);
        let response;
        try {
            response = await opts.adapter.send(config);
        }
        catch (err) {
            if ((_b = config.hooks) === null || _b === void 0 ? void 0 : _b.respondedError) {
                throw await config.hooks.respondedError(err);
            }
            await responseInterceptors.runForResponse(err, true);
            throw err;
        }
        if ((_c = config.hooks) === null || _c === void 0 ? void 0 : _c.responded)
            response = await config.hooks.responded(response);
        response = await responseInterceptors.runForResponse(response, false);
        return response;
    }
    async function core(method, url, opts) {
        var _a;
        const config = { method, url, ...(opts || {}) };
        const run = async () => {
            const res = await pipeline(config);
            return res.data;
        };
        if (method === 'GET') {
            const staleMs = typeof ((_a = config.meta) === null || _a === void 0 ? void 0 : _a.staleTime) === 'number' ? config.meta.staleTime : 30000;
            return scheduler.run(requestCacheKey(config), run, staleMs);
        }
        const res = await pipeline(config);
        return res.data;
    }
    return {
        adapter: opts.adapter,
        scheduler, cache, draft,
        defineModel, normalize, watchVersion,
        get: (u, o) => core('GET', u, o),
        post: (u, o) => core('POST', u, o),
        put: (u, o) => core('PUT', u, o),
        patch: (u, o) => core('PATCH', u, o),
        delete: (u, o) => core('DELETE', u, o),
        interceptors: {
            request: { use: requestInterceptors.use.bind(requestInterceptors), eject: (id) => requestInterceptors.eject(id) },
            response: { use: responseInterceptors.use.bind(responseInterceptors), eject: (id) => responseInterceptors.eject(id) }
        }
    };
}
async function runQuery(client, key, request, model, staleMs = 30000) {
    // 키를 미리 계산해서 문자열 연산 최소화
    const cacheKey = key.join(':');
    return client.scheduler.run(cacheKey, async () => {
        const res = await request();
        // 정규화가 필요한 경우에만 실행
        if (model)
            client.normalize(model, res);
        return res;
    }, staleMs);
}
function requestCacheKey(config) {
    return [
        config.method,
        config.baseURL || '',
        config.url,
        stringifyCachePart(config.params),
        stringifyCachePart(config.headers),
        stringifyCachePart(config.body)
    ].join(':');
}
function stringifyCachePart(value) {
    if (value === undefined || value === null)
        return '';
    if (value instanceof URLSearchParams)
        return value.toString();
    if (typeof value !== 'object')
        return String(value);
    if (Array.isArray(value))
        return `[${value.map(stringifyCachePart).join(',')}]`;
    return `{${Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => `${key}:${stringifyCachePart(entry)}`)
        .join(',')}}`;
}
