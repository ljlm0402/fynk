"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.runQuery = runQuery;
const normalized_js_1 = require("./cache/normalized.js");
const scheduler_js_1 = require("./scheduler.js");
const interceptors_js_1 = require("./interceptors.js");
const errors_js_1 = require("./errors.js");
function createClient(opts) {
    const cache = (0, normalized_js_1.createNormalizedCache)();
    const scheduler = (0, scheduler_js_1.createScheduler)();
    const requestInterceptors = new interceptors_js_1.InterceptorManager();
    const responseInterceptors = new interceptors_js_1.InterceptorManager();
    const models = {};
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
    function defineModel(def) {
        models[def.key] = def;
        return def;
    }
    function normalize(model, payload) {
        models[model.key] = model;
        cache.normalize(model, payload, models);
    }
    function resolve(model, idOrEntity) {
        models[model.key] = model;
        return cache.resolve(model, idOrEntity, models);
    }
    function watchVersion(cb) { return cache.subscribe(cb); }
    function invalidate(keyOrPredicate) {
        if (Array.isArray(keyOrPredicate))
            scheduler.invalidate(queryCacheKey(keyOrPredicate));
        else
            scheduler.invalidate(keyOrPredicate);
    }
    function clearCache() { scheduler.clearCache(); }
    function inspect() {
        return {
            scheduler: { cacheSize: scheduler.getCacheSize() },
            normalized: cache.inspect()
        };
    }
    async function persist(storage, key = 'fynk:cache') {
        await storage.setItem(key, JSON.stringify(cache.toJSON()));
    }
    async function hydrate(storage, key = 'fynk:cache') {
        const value = await storage.getItem(key);
        if (!value)
            return;
        try {
            cache.restoreJSON(JSON.parse(value));
        }
        catch (error) {
            throw new errors_js_1.FynkError('Failed to hydrate cache snapshot', {
                config: { method: 'GET', url: key },
                cause: error
            });
        }
    }
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
        var _a, _b, _c, _d;
        const config = { method, url, ...(opts || {}) };
        const run = async () => {
            const res = await withRetry(config, () => pipeline(config));
            return res.data;
        };
        const shouldUseScheduler = (_a = config.dedupe) !== null && _a !== void 0 ? _a : method === 'GET';
        if (shouldUseScheduler) {
            const staleMs = typeof ((_b = config.meta) === null || _b === void 0 ? void 0 : _b.staleTime) === 'number' ? config.meta.staleTime : 30000;
            const key = typeof config.dedupeKey === 'function'
                ? config.dedupeKey(config)
                : (_c = config.dedupeKey) !== null && _c !== void 0 ? _c : requestCacheKey(config);
            const shouldCache = method === 'GET' && staleMs > 0;
            return scheduler.run(key, run, staleMs, { dedupe: (_d = config.dedupe) !== null && _d !== void 0 ? _d : true, cache: shouldCache });
        }
        const res = await withRetry(config, () => pipeline(config));
        return res.data;
    }
    return {
        adapter: opts.adapter,
        scheduler, cache, draft,
        defineModel, normalize, resolve, watchVersion, invalidate, clearCache, inspect, persist, hydrate,
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
    const cacheKey = queryCacheKey(key);
    return client.scheduler.run(cacheKey, async () => {
        const res = await request();
        // 정규화가 필요한 경우에만 실행
        if (model)
            client.normalize(model, res);
        return res;
    }, staleMs);
}
function queryCacheKey(key) {
    return key.join(':');
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
async function withRetry(config, run) {
    const retry = normalizeRetry(config.retry);
    let attempt = 0;
    while (true) {
        try {
            return await run();
        }
        catch (error) {
            if (attempt >= retry.attempts || !(await shouldRetry(error, attempt + 1, config, retry)))
                throw error;
            attempt += 1;
            const delay = resolveRetryDelay(retry, attempt, error);
            if (delay > 0)
                await sleep(delay);
        }
    }
}
function normalizeRetry(retry) {
    var _a;
    const defaults = {
        attempts: 0,
        delay: 100,
        statusCodes: [408, 425, 429, 500, 502, 503, 504],
        methods: ['GET', 'PUT', 'DELETE']
    };
    if (retry === undefined)
        return defaults;
    if (typeof retry === 'number')
        return { ...defaults, attempts: retry };
    return { ...defaults, ...retry, attempts: (_a = retry.attempts) !== null && _a !== void 0 ? _a : defaults.attempts };
}
async function shouldRetry(error, attempt, config, retry) {
    var _a;
    if ((_a = config.signal) === null || _a === void 0 ? void 0 : _a.aborted)
        return false;
    if (retry.shouldRetry)
        return retry.shouldRetry(error, attempt, config);
    if (!retry.methods.includes(config.method))
        return false;
    if (error instanceof errors_js_1.FynkError && error.status !== undefined)
        return retry.statusCodes.includes(error.status);
    return true;
}
function resolveRetryDelay(retry, attempt, error) {
    var _a;
    if (typeof retry.delay === 'function')
        return retry.delay(attempt, error);
    return ((_a = retry.delay) !== null && _a !== void 0 ? _a : 0) * Math.max(1, attempt);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
