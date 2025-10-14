
import type { Adapter, FetchLike, HelioRequestConfig, HelioResponse } from '../types';

export function fetchAdapter(baseURL = '', fetchLike?: FetchLike): Adapter {
  const f = fetchLike ?? (globalThis.fetch as FetchLike);

  const send = async <T>(config: HelioRequestConfig): Promise<HelioResponse<T>> => {
    const url = (config.baseURL ?? baseURL) + config.url;
    const res = await f(url, {
      method: config.method,
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      body: config.body !== undefined ? JSON.stringify(config.body) : undefined
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    const data = await res.json() as T;
    return { status: res.status, headers, data, config };
  };

  const call = async <T>(method: HelioRequestConfig['method'], url: string, opts?: Partial<HelioRequestConfig>) => {
    const resp = await send<T>({ method, url, ...(opts || {}) });
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
