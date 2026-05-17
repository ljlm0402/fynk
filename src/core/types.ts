
export type EntityId = string | number;

export type ModelDef<T> = {
  key: string;
  id: (v: T) => EntityId;
  relations?: Record<string, string | string[]>;
};

export type ModelRegistry = Record<string, ModelDef<any>>;

export type FynkRequestConfig = {
  url: string;
  method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE';
  baseURL?: string;
  headers?: Record<string, string | undefined>;
  params?: Record<string, unknown> | URLSearchParams;
  body?: any;
  signal?: AbortSignal;
  timeout?: number;
  retry?: number | RetryOptions;
  dedupe?: boolean;
  dedupeKey?: string | ((config: FynkRequestConfig) => string);
  throwHttpErrors?: boolean;
  validateStatus?: (status: number) => boolean;
  meta?: Record<string, any>;
  hooks?: {
    beforeRequest?: (c: FynkRequestConfig) => FynkRequestConfig | Promise<FynkRequestConfig>;
    responded?:  <T>(r: FynkResponse<T>) => FynkResponse<T> | Promise<FynkResponse<T>>;
    respondedError?: (e: any) => any | Promise<any>;
  };
};

export type RetryOptions = {
  attempts?: number;
  delay?: number | ((attempt: number, error: unknown) => number);
  statusCodes?: number[];
  methods?: FynkRequestConfig['method'][];
  shouldRetry?: (error: unknown, attempt: number, config: FynkRequestConfig) => boolean | Promise<boolean>;
};

export type FynkResponse<T = any> = {
  status: number;
  ok: boolean;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  config: FynkRequestConfig;
};

export type RequestFn<T> = () => Promise<T>;

export type Scheduler = {
  run<T>(key: string, fn: () => Promise<T>, ttl?: number, options?: { dedupe?: boolean; cache?: boolean }): Promise<T>;
  invalidate(keyOrPredicate?: string | ((key: string) => boolean)): void;
  clearCache(): void;
  getCacheSize(): number;
};

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type CacheSnapshot = Map<string, Map<EntityId, any>>;
export type SerializableCacheSnapshot = Record<string, Record<string, any>>;

export type FynkStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem?(key: string): void | Promise<void>;
};

export type Adapter = {
  send<T = unknown>(config: FynkRequestConfig): Promise<FynkResponse<T>>;
  get<T = unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  post<T = unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  put?<T = unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  patch?<T = unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  delete?<T = unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
};

export type EventSync = {
  on(type: string, fn: (p: any) => void): () => void;
  close(): void;
};

export type DraftApi = {
  insert<T>(model: ModelDef<T>, entity: T): void;
  upsert<T>(model: ModelDef<T>, entity: T): void;
  patch<T>(model: ModelDef<T>, id: EntityId, partial: Partial<T>): void;
  commit(): void;
  rollback(): void;
};

export type NormalizedCache = {
  upsert<T>(model: ModelDef<T>, entity: T): void;
  patch<T>(model: ModelDef<T>, id: EntityId, partial: Partial<T>): void;
  get<T>(model: ModelDef<T>, id: EntityId): T | undefined;
  normalize<T>(model: ModelDef<T>, data: T | T[], registry?: ModelRegistry): void;
  resolve<T>(model: ModelDef<T>, idOrEntity: EntityId | T, registry: ModelRegistry): T | undefined;
  snapshot(): CacheSnapshot;
  toJSON(): SerializableCacheSnapshot;
  restore(snapshot: CacheSnapshot): void;
  restoreJSON(snapshot: SerializableCacheSnapshot): void;
  inspect(): { version: number; tables: Record<string, { size: number; ids: string[] }> };
  version: { value: number };
  subscribe(fn: () => void): () => void;
};

export type InterceptorFulfilled<V> = (value: V) => V | Promise<V>;
export type InterceptorRejected = (error: any) => any;

export type InterceptorHandler<V> = {
  fulfilled?: InterceptorFulfilled<V>;
  rejected?: InterceptorRejected;
  runWhen?: (input: any) => boolean;
};

export type InterceptorUse<V> = (
  fulfilled?: InterceptorFulfilled<V>,
  rejected?: InterceptorRejected,
  runWhen?: (input: V) => boolean
) => number;

export type FynkClient = {
  adapter: Adapter;
  scheduler: Scheduler;
  cache: NormalizedCache;
  draft: DraftApi;
  defineModel<T>(def: ModelDef<T>): ModelDef<T>;
  normalize<T>(model: ModelDef<T>, payload: T | T[]): void;
  resolve<T>(model: ModelDef<T>, idOrEntity: EntityId | T): T | undefined;
  watchVersion(cb: () => void): () => void;
  invalidate(keyOrPredicate?: string | (string|number)[] | ((key: string) => boolean)): void;
  clearCache(): void;
  inspect(): { scheduler: { cacheSize: number }; normalized: ReturnType<NormalizedCache['inspect']> };
  persist(storage: FynkStorage, key?: string): Promise<void>;
  hydrate(storage: FynkStorage, key?: string): Promise<void>;
  get<T=unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  post<T=unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  put<T=unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  patch<T=unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  delete<T=unknown>(url: string, opts?: Partial<FynkRequestConfig>): Promise<T>;
  interceptors: {
    request: { use: InterceptorUse<FynkRequestConfig>; eject: (id: number) => void };
    response:{ use: InterceptorUse<FynkResponse>; eject: (id: number) => void };
  };
};
