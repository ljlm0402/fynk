
import { createNormalizedCache } from './cache/normalized';
import { createScheduler } from './scheduler';
import { InterceptorManager } from './interceptors';
import type {
  Adapter, DraftApi, HelioClient, HelioRequestConfig, HelioResponse, ModelDef, RequestFn
} from './types';

export function createClient(opts: { adapter: Adapter }) : HelioClient {
  const cache = createNormalizedCache();
  const scheduler = createScheduler();

  const requestInterceptors = new InterceptorManager<HelioRequestConfig>();
  const responseInterceptors = new InterceptorManager<HelioResponse>();

  const draft: DraftApi = {
    insert: (m, e) => cache.upsert(m, e),
    upsert: (m, e) => cache.upsert(m, e),
    patch: (m, id, p) => cache.patch(m, id, p),
    rollback: () => { cache.version.value++; }
  };

  function defineModel<T>(def: ModelDef<T>): ModelDef<T> { return def; }
  function normalize<T>(model: ModelDef<T>, payload: T | T[]) { cache.normalize(model, payload); }
  function watchVersion(cb: () => void) { return cache.subscribe(cb); }

  async function pipeline<T>(config: HelioRequestConfig): Promise<HelioResponse<T>> {
    config = await requestInterceptors.runForRequest(config);
    if (config.hooks?.beforeRequest) config = await config.hooks.beforeRequest(config);

    let response: HelioResponse<T>;
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

  async function core<T>(method: HelioRequestConfig['method'], url: string, opts?: Partial<HelioRequestConfig>) {
    const res = await pipeline<T>({ method, url, ...(opts || {}) });
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
      request: { use: (...args:any[]) => requestInterceptors.use(...args), eject: (id:number)=>requestInterceptors.eject(id) },
      response:{ use: (...args:any[]) => responseInterceptors.use(...args), eject: (id:number)=>responseInterceptors.eject(id) }
    }
  };
}

export async function runQuery<T>(client: HelioClient, key: (string|number)[], request: RequestFn<T>, model?: ModelDef<any>, staleMs = 30_000) {
  // 키를 미리 계산해서 문자열 연산 최소화
  const cacheKey = key.join(':');
  
  return client.scheduler.run(cacheKey, async () => {
    const res = await request();
    // 정규화가 필요한 경우에만 실행
    if (model) client.normalize(model as any, res as any);
    return res;
  }, staleMs);
}
