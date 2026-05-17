
import { createNormalizedCache } from './cache/normalized.js';
import { createScheduler } from './scheduler.js';
import { InterceptorManager } from './interceptors.js';
import { FynkError } from './errors.js';
import type {
  Adapter, CacheSnapshot, DraftApi, EntityId, FynkStorage, FynkClient, FynkRequestConfig, FynkResponse, ModelDef, ModelRegistry, RequestFn, RetryOptions
} from './types.js';

export function createClient(opts: { adapter: Adapter }) : FynkClient {
  const cache = createNormalizedCache();
  const scheduler = createScheduler();

  const requestInterceptors = new InterceptorManager<FynkRequestConfig>();
  const responseInterceptors = new InterceptorManager<FynkResponse>();
  const models: ModelRegistry = {};
  let draftSnapshot: CacheSnapshot | null = null;

  const draft: DraftApi = {
    insert: (m, e) => { draftSnapshot ??= cache.snapshot(); cache.upsert(m, e); },
    upsert: (m, e) => { draftSnapshot ??= cache.snapshot(); cache.upsert(m, e); },
    patch: (m, id, p) => { draftSnapshot ??= cache.snapshot(); cache.patch(m, id, p); },
    commit: () => { draftSnapshot = null; },
    rollback: () => {
      if (draftSnapshot) cache.restore(draftSnapshot);
      draftSnapshot = null;
    }
  };

  function defineModel<T>(def: ModelDef<T>): ModelDef<T> {
    models[def.key] = def;
    return def;
  }
  function normalize<T>(model: ModelDef<T>, payload: T | T[]) {
    models[model.key] = model;
    cache.normalize(model, payload, models);
  }
  function resolve<T>(model: ModelDef<T>, idOrEntity: EntityId | T) {
    models[model.key] = model;
    return cache.resolve(model, idOrEntity as any, models);
  }
  function watchVersion(cb: () => void) { return cache.subscribe(cb); }
  function invalidate(keyOrPredicate?: string | (string|number)[] | ((key: string) => boolean)) {
    if (Array.isArray(keyOrPredicate)) scheduler.invalidate(queryCacheKey(keyOrPredicate));
    else scheduler.invalidate(keyOrPredicate);
  }
  function clearCache() { scheduler.clearCache(); }
  function inspect() {
    return {
      scheduler: { cacheSize: scheduler.getCacheSize() },
      normalized: cache.inspect()
    };
  }
  async function persist(storage: FynkStorage, key = 'fynk:cache') {
    await storage.setItem(key, JSON.stringify(cache.toJSON()));
  }
  async function hydrate(storage: FynkStorage, key = 'fynk:cache') {
    const value = await storage.getItem(key);
    if (!value) return;
    try {
      cache.restoreJSON(JSON.parse(value));
    } catch (error) {
      throw new FynkError('Failed to hydrate cache snapshot', {
        config: { method: 'GET', url: key },
        cause: error
      });
    }
  }

  async function pipeline<T>(config: FynkRequestConfig): Promise<FynkResponse<T>> {
    config = await requestInterceptors.runForRequest(config);
    if (config.hooks?.beforeRequest) config = await config.hooks.beforeRequest(config);

    let response: FynkResponse<T>;
    try {
      response = await opts.adapter.send<T>(config);
    } catch (err) {
      if (config.hooks?.respondedError) { throw await config.hooks.respondedError(err); }
      await responseInterceptors.runForResponse(err, true);
      throw err;
    }

    if (config.hooks?.responded) response = await config.hooks.responded<T>(response);
    response = await responseInterceptors.runForResponse(response, false);
    return response;
  }

  async function core<T>(method: FynkRequestConfig['method'], url: string, opts?: Partial<FynkRequestConfig>) {
    const config = { method, url, ...(opts || {}) };
    const run = async () => {
      const res = await withRetry(config, () => pipeline<T>(config));
      return res.data;
    };

    const shouldUseScheduler = config.dedupe ?? method === 'GET';
    if (shouldUseScheduler) {
      const staleMs = typeof config.meta?.staleTime === 'number' ? config.meta.staleTime : 30_000;
      const key = typeof config.dedupeKey === 'function'
        ? config.dedupeKey(config)
        : config.dedupeKey ?? requestCacheKey(config);
      const shouldCache = method === 'GET' && staleMs > 0;
      return scheduler.run(key, run, staleMs, { dedupe: config.dedupe ?? true, cache: shouldCache });
    }

    const res = await withRetry(config, () => pipeline<T>(config));
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
      request: { use: requestInterceptors.use.bind(requestInterceptors), eject: (id:number)=>requestInterceptors.eject(id) },
      response:{ use: responseInterceptors.use.bind(responseInterceptors), eject: (id:number)=>responseInterceptors.eject(id) }
    }
  };
}

export async function runQuery<T>(client: FynkClient, key: (string|number)[], request: RequestFn<T>, model?: ModelDef<any>, staleMs = 30_000) {
  // 키를 미리 계산해서 문자열 연산 최소화
  const cacheKey = queryCacheKey(key);
  
  return client.scheduler.run(cacheKey, async () => {
    const res = await request();
    // 정규화가 필요한 경우에만 실행
    if (model) client.normalize(model as any, res as any);
    return res;
  }, staleMs);
}

function queryCacheKey(key: (string|number)[]) {
  return key.join(':');
}

function requestCacheKey(config: FynkRequestConfig): string {
  return [
    config.method,
    config.baseURL || '',
    config.url,
    stringifyCachePart(config.params),
    stringifyCachePart(config.headers),
    stringifyCachePart(config.body)
  ].join(':');
}

function stringifyCachePart(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (value instanceof URLSearchParams) return value.toString();
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stringifyCachePart).join(',')}]`;

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${key}:${stringifyCachePart(entry)}`)
    .join(',')}}`;
}

async function withRetry<T>(
  config: FynkRequestConfig,
  run: () => Promise<FynkResponse<T>>
): Promise<FynkResponse<T>> {
  const retry = normalizeRetry(config.retry);
  let attempt = 0;

  while (true) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retry.attempts || !(await shouldRetry(error, attempt + 1, config, retry))) throw error;
      attempt += 1;
      const delay = resolveRetryDelay(retry, attempt, error);
      if (delay > 0) await sleep(delay);
    }
  }
}

function normalizeRetry(retry: FynkRequestConfig['retry']): Required<Pick<RetryOptions, 'attempts' | 'statusCodes' | 'methods'>> & RetryOptions {
  const defaults = {
    attempts: 0,
    delay: 100,
    statusCodes: [408, 425, 429, 500, 502, 503, 504],
    methods: ['GET', 'PUT', 'DELETE'] as FynkRequestConfig['method'][]
  };

  if (retry === undefined) return defaults;
  if (typeof retry === 'number') return { ...defaults, attempts: retry };
  return { ...defaults, ...retry, attempts: retry.attempts ?? defaults.attempts };
}

async function shouldRetry(
  error: unknown,
  attempt: number,
  config: FynkRequestConfig,
  retry: ReturnType<typeof normalizeRetry>
): Promise<boolean> {
  if (config.signal?.aborted) return false;
  if (retry.shouldRetry) return retry.shouldRetry(error, attempt, config);
  if (!retry.methods.includes(config.method)) return false;
  if (error instanceof FynkError && error.status !== undefined) return retry.statusCodes.includes(error.status);
  return true;
}

function resolveRetryDelay(retry: ReturnType<typeof normalizeRetry>, attempt: number, error: unknown): number {
  if (typeof retry.delay === 'function') return retry.delay(attempt, error);
  return (retry.delay ?? 0) * Math.max(1, attempt);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
