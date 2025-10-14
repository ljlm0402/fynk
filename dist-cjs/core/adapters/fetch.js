"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAdapter = fetchAdapter;
function fetchAdapter(baseURL = '', fetchLike) {
    const f = fetchLike !== null && fetchLike !== void 0 ? fetchLike : globalThis.fetch;
    const send = async (config) => {
        var _a;
        const url = ((_a = config.baseURL) !== null && _a !== void 0 ? _a : baseURL) + config.url;
        const res = await f(url, {
            method: config.method,
            headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
            body: config.body !== undefined ? JSON.stringify(config.body) : undefined
        });
        const headers = {};
        res.headers.forEach((v, k) => (headers[k] = v));
        const data = await res.json();
        return { status: res.status, headers, data, config };
    };
    const call = async (method, url, opts) => {
        const resp = await send({ method, url, ...(opts || {}) });
        return resp.data;
    };
    return {
        send,
        get: (url, opts) => call('GET', url, opts),
        post: (url, opts) => call('POST', url, opts),
        put: (url, opts) => call('PUT', url, opts),
        patch: (url, opts) => call('PATCH', url, opts),
        delete: (url, opts) => call('DELETE', url, opts)
    };
}
