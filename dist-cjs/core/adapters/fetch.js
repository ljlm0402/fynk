"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAdapter = fetchAdapter;
const errors_js_1 = require("../errors.js");
function fetchAdapter(baseURL = '', fetchLike) {
    const f = fetchLike !== null && fetchLike !== void 0 ? fetchLike : globalThis.fetch;
    const send = async (config) => {
        var _a, _b, _c, _d, _e;
        const url = buildUrl((_a = config.baseURL) !== null && _a !== void 0 ? _a : baseURL, config.url, config.params);
        const headers = normalizeHeaders(config.headers);
        const requestSignal = createRequestSignal(config);
        const fetchOptions = {
            method: config.method,
            headers,
            keepalive: true,
            signal: requestSignal.signal,
        };
        if (config.body !== undefined) {
            if (isJsonBody(config.body)) {
                (_b = headers['Content-Type']) !== null && _b !== void 0 ? _b : (headers['Content-Type'] = 'application/json');
                fetchOptions.body = JSON.stringify(config.body);
            }
            else {
                fetchOptions.body = config.body;
            }
        }
        try {
            let res;
            try {
                res = await f(url, fetchOptions);
            }
            catch (error) {
                throw new errors_js_1.FynkError('Request failed before receiving a response', {
                    config,
                    cause: error
                });
            }
            const responseHeaders = {};
            res.headers.forEach((v, k) => (responseHeaders[k] = v));
            let data;
            try {
                data = await parseResponse(res);
            }
            catch (error) {
                throw new errors_js_1.FynkError('Failed to parse response body', {
                    config,
                    response: {
                        status: res.status,
                        ok: res.ok,
                        statusText: res.statusText,
                        headers: responseHeaders,
                        data: undefined,
                        config
                    },
                    cause: error
                });
            }
            const response = {
                status: res.status,
                ok: res.ok,
                statusText: res.statusText,
                headers: responseHeaders,
                data,
                config
            };
            const shouldThrow = (_c = config.throwHttpErrors) !== null && _c !== void 0 ? _c : true;
            const validateStatus = (_d = config.validateStatus) !== null && _d !== void 0 ? _d : ((status) => status >= 200 && status < 300);
            if (shouldThrow && !validateStatus(res.status)) {
                throw new errors_js_1.FynkError(`Request failed with status ${res.status}`, {
                    config,
                    response
                });
            }
            return response;
        }
        finally {
            (_e = requestSignal.cleanup) === null || _e === void 0 ? void 0 : _e.call(requestSignal);
        }
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
function buildUrl(baseURL, url, params) {
    const joined = !baseURL || /^https?:\/\//i.test(url)
        ? url
        : `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
    const searchParams = serializeParams(params);
    if (!searchParams)
        return joined;
    const separator = joined.includes('?') ? '&' : '?';
    return `${joined}${separator}${searchParams}`;
}
function serializeParams(params) {
    if (!params)
        return '';
    if (params instanceof URLSearchParams)
        return params.toString();
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null)
            continue;
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item !== undefined && item !== null)
                    searchParams.append(key, String(item));
            }
            continue;
        }
        searchParams.set(key, String(value));
    }
    return searchParams.toString();
}
function normalizeHeaders(headers) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers || {})) {
        if (value !== undefined)
            normalized[key] = value;
    }
    return normalized;
}
function isJsonBody(body) {
    if (typeof body === 'string')
        return false;
    if (typeof FormData !== 'undefined' && body instanceof FormData)
        return false;
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
        return false;
    if (typeof Blob !== 'undefined' && body instanceof Blob)
        return false;
    if (body instanceof ArrayBuffer)
        return false;
    return true;
}
async function parseResponse(res) {
    if (res.status === 204 || res.status === 205)
        return undefined;
    const text = await res.text();
    if (!text)
        return undefined;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('+json')) {
        return JSON.parse(text);
    }
    return text;
}
function createRequestSignal(config) {
    var _a, _b;
    if (config.timeout === undefined)
        return { signal: config.signal };
    if (config.timeout <= 0) {
        throw new errors_js_1.FynkError('timeout must be greater than 0', { config });
    }
    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal && !config.signal) {
        return { signal: AbortSignal.timeout(config.timeout) };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        const reason = typeof DOMException !== 'undefined'
            ? new DOMException('Request timed out', 'TimeoutError')
            : new Error('Request timed out');
        controller.abort(reason);
    }, config.timeout);
    const abort = () => {
        var _a;
        clearTimeout(timeoutId);
        controller.abort((_a = config.signal) === null || _a === void 0 ? void 0 : _a.reason);
    };
    if ((_a = config.signal) === null || _a === void 0 ? void 0 : _a.aborted)
        abort();
    else
        (_b = config.signal) === null || _b === void 0 ? void 0 : _b.addEventListener('abort', abort, { once: true });
    return {
        signal: controller.signal,
        cleanup: () => {
            var _a;
            clearTimeout(timeoutId);
            (_a = config.signal) === null || _a === void 0 ? void 0 : _a.removeEventListener('abort', abort);
        }
    };
}
