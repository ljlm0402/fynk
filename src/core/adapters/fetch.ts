
import type { Adapter, FetchLike, HelioRequestConfig, HelioResponse } from '../types';

export function fetchAdapter(baseURL = '', fetchLike?: FetchLike): Adapter {
  const f = fetchLike ?? (globalThis.fetch as FetchLike);
  
  // 최적화된 기본 헤더 (재사용)
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const send = async <T>(config: HelioRequestConfig): Promise<HelioResponse<T>> => {
    const url = (config.baseURL ?? baseURL) + config.url;
    
    // 최적화된 fetch 옵션
    const fetchOptions: RequestInit = {
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
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    
    // JSON 파싱
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
