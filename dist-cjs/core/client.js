"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.runQuery = runQuery;
const normalized_1 = require("./cache/normalized");
const scheduler_1 = require("./scheduler");
const interceptors_1 = require("./interceptors");
function createClient(opts) {
    const cache = (0, normalized_1.createNormalizedCache)();
    const scheduler = (0, scheduler_1.createScheduler)();
    const requestInterceptors = new interceptors_1.InterceptorManager();
    const responseInterceptors = new interceptors_1.InterceptorManager();
    const draft = {
        insert: (m, e) => cache.upsert(m, e),
        upsert: (m, e) => cache.upsert(m, e),
        patch: (m, id, p) => cache.patch(m, id, p),
        rollback: () => { cache.version.value++; }
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
        const res = await pipeline({ method, url, ...(opts || {}) });
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
            request: { use: (...args) => requestInterceptors.use(...args), eject: (id) => requestInterceptors.eject(id) },
            response: { use: (...args) => responseInterceptors.use(...args), eject: (id) => responseInterceptors.eject(id) }
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
