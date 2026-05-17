import type { HelioRequestConfig, HelioResponse } from './types.js';

export class FynkError<T = unknown> extends Error {
  readonly name = 'FynkError';
  readonly config: HelioRequestConfig;
  readonly response?: HelioResponse<T>;
  readonly status?: number;
  readonly headers?: Record<string, string>;
  readonly data?: T;
  readonly cause?: unknown;

  constructor(message: string, options: {
    config: HelioRequestConfig;
    response?: HelioResponse<T>;
    cause?: unknown;
  }) {
    super(message);
    this.config = options.config;
    this.response = options.response;
    this.status = options.response?.status;
    this.headers = options.response?.headers;
    this.data = options.response?.data;
    this.cause = options.cause;
  }
}

export function isFynkError(value: unknown): value is FynkError {
  return value instanceof FynkError;
}
