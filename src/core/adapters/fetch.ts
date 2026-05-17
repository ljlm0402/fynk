
import type { Adapter, FetchLike, FynkRequestConfig, FynkResponse } from '../types.js';
import { FynkError } from '../errors.js';

export function fetchAdapter(baseURL = '', fetchLike?: FetchLike): Adapter {
  const f = fetchLike ?? (globalThis.fetch as FetchLike);

  const send = async <T>(config: FynkRequestConfig): Promise<FynkResponse<T>> => {
    const url = buildUrl(config.baseURL ?? baseURL, config.url, config.params);
    const headers = normalizeHeaders(config.headers);
    const requestSignal = createRequestSignal(config);
    
    const fetchOptions: RequestInit = {
      method: config.method,
      headers,
      keepalive: true,
      signal: requestSignal.signal,
    };
    
    if (config.body !== undefined) {
      if (isJsonBody(config.body)) {
        headers['Content-Type'] ??= 'application/json';
        fetchOptions.body = JSON.stringify(config.body);
      } else {
        fetchOptions.body = config.body;
      }
    }
    
    try {
      let res: Response;
      try {
        res = await f(url, fetchOptions);
      } catch (error) {
        throw new FynkError('Request failed before receiving a response', {
          config,
          cause: error
        });
      }
      
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => (responseHeaders[k] = v));
      
      let data: T;
      try {
        data = await parseResponse<T>(res);
      } catch (error) {
        throw new FynkError('Failed to parse response body', {
          config,
          response: {
            status: res.status,
            ok: res.ok,
            statusText: res.statusText,
            headers: responseHeaders,
            data: undefined as T,
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

      const shouldThrow = config.throwHttpErrors ?? true;
      const validateStatus = config.validateStatus ?? ((status: number) => status >= 200 && status < 300);
      if (shouldThrow && !validateStatus(res.status)) {
        throw new FynkError(`Request failed with status ${res.status}`, {
          config,
          response
        });
      }

      return response;
    } finally {
      requestSignal.cleanup?.();
    }
  };

  const call = async <T>(method: FynkRequestConfig['method'], url: string, opts?: Partial<FynkRequestConfig>) => {
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

function buildUrl(baseURL: string, url: string, params?: FynkRequestConfig['params']): string {
  const joined = !baseURL || /^https?:\/\//i.test(url)
    ? url
    : `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;

  const searchParams = serializeParams(params);
  if (!searchParams) return joined;

  const separator = joined.includes('?') ? '&' : '?';
  return `${joined}${separator}${searchParams}`;
}

function serializeParams(params?: FynkRequestConfig['params']): string {
  if (!params) return '';
  if (params instanceof URLSearchParams) return params.toString();

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) searchParams.append(key, String(item));
      }
      continue;
    }
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

function normalizeHeaders(headers?: Record<string, string | undefined>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (value !== undefined) normalized[key] = value;
  }
  return normalized;
}

function isJsonBody(body: unknown): boolean {
  if (typeof body === 'string') return false;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return false;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return false;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  return true;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 205) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    return JSON.parse(text) as T;
  }

  return text as T;
}

function createRequestSignal(config: FynkRequestConfig): { signal?: AbortSignal; cleanup?: () => void } {
  if (config.timeout === undefined) return { signal: config.signal };

  if (config.timeout <= 0) {
    throw new FynkError('timeout must be greater than 0', { config });
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
    clearTimeout(timeoutId);
    controller.abort(config.signal?.reason);
  };

  if (config.signal?.aborted) abort();
  else config.signal?.addEventListener('abort', abort, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      config.signal?.removeEventListener('abort', abort);
    }
  };
}
