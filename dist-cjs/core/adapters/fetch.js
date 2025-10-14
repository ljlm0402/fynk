"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAdapter = fetchAdapter;
function fetchAdapter(baseURL = '', fetchLike) {
    const f = fetchLike !== null && fetchLike !== void 0 ? fetchLike : globalThis.fetch;
    // 최적화된 기본 헤더 (재사용)
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    const send = async (config) => {
        var _a;
        const url = ((_a = config.baseURL) !== null && _a !== void 0 ? _a : baseURL) + config.url;
        // 최적화된 fetch 옵션
        const fetchOptions = {
            method: config.method,
            headers: { ...defaultHeaders, ...(config.headers || {}) },
            keepalive: true, // HTTP/2 keep-alive
        };
        // body가 있는 경우에만 직렬화
        if (config.body !== undefined) {
            fetchOptions.body = JSON.stringify(config.body);
        }
        const res = await f(url, fetchOptions);
        // 헤더 변환 최적화 (for..of 대신 forEach)
        const headers = {};
        res.headers.forEach((v, k) => (headers[k] = v));
        // JSON 파싱
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
