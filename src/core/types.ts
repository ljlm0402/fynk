
export type EntityId = string | number;

export type ModelDef<T> = {
  key: string;
  id: (v: T) => EntityId;
  relations?: Record<string, string | string[]>;
};

export type HelioRequestConfig = {
  url: string;
  method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE';
  baseURL?: string;
  headers?: Record<string, string | undefined>;
  body?: any;
  meta?: Record<string, any>;
  hooks?: {
    beforeRequest?: (c: HelioRequestConfig) => HelioRequestConfig | Promise<HelioRequestConfig>;
    responded?:  <T>(r: HelioResponse<T>) => HelioResponse<T> | Promise<HelioResponse<T>>;
    respondedError?: (e: any) => any | Promise<any>;
  };
};

export type HelioResponse<T = any> = {
  status: number;
  headers: Record<string, string>;
  data: T;
  config: HelioRequestConfig;
};

export type RequestFn<T> = () => Promise<T>;

export type Scheduler = {
  run<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
  clearCache?: () => void;
  getCacheSize?: () => number;
};

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type Adapter = {
  send<T = unknown>(config: HelioRequestConfig): Promise<HelioResponse<T>>;
  get<T = unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  post<T = unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  put?<T = unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  patch?<T = unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  delete?<T = unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
};

export type EventSync = { on(type: string, fn: (p: any) => void): void; };

export type DraftApi = {
  insert<T>(model: ModelDef<T>, entity: T): void;
  upsert<T>(model: ModelDef<T>, entity: T): void;
  patch<T>(model: ModelDef<T>, id: EntityId, partial: Partial<T>): void;
  rollback(): void;
};

export type NormalizedCache = {
  upsert<T>(model: ModelDef<T>, entity: T): void;
  patch<T>(model: ModelDef<T>, id: EntityId, partial: Partial<T>): void;
  get<T>(model: ModelDef<T>, id: EntityId): T | undefined;
  normalize<T>(model: ModelDef<T>, data: T | T[]): void;
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

export type HelioClient = {
  adapter: Adapter;
  scheduler: Scheduler;
  cache: NormalizedCache;
  draft: DraftApi;
  defineModel<T>(def: ModelDef<T>): ModelDef<T>;
  normalize<T>(model: ModelDef<T>, payload: T | T[]): void;
  watchVersion(cb: () => void): () => void;
  get<T=unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  post<T=unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  put<T=unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  patch<T=unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  delete<T=unknown>(url: string, opts?: Partial<HelioRequestConfig>): Promise<T>;
  interceptors: {
    request: { use: Function; eject: (id: number) => void };
    response:{ use: Function; eject: (id: number) => void };
  };
};
