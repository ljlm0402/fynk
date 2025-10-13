
import type { InterceptorHandler } from './types';

export class InterceptorManager<V> {
  private handlers: Array<InterceptorHandler<V> | null> = [];

  use(
    fulfilled?: (value: V) => V | Promise<V>,
    rejected?: (error: any) => any,
    runWhen?: (input: any) => boolean
  ): number {
    this.handlers.push({ fulfilled, rejected, runWhen });
    return this.handlers.length - 1;
  }

  eject(id: number) {
    if (this.handlers[id]) this.handlers[id] = null;
  }

  async runForRequest(config: any): Promise<any> {
    let acc = config;
    for (const h of this.handlers) {
      if (!h) continue;
      if (h.runWhen && !h.runWhen(acc)) continue;
      if (h.fulfilled) {
        try { acc = await h.fulfilled(acc); }
        catch (e) { if (h.rejected) acc = await h.rejected(e); else throw e; }
      }
    }
    return acc;
  }

  async runForResponse(responseOrError: any, isError = false): Promise<any> {
    let acc = responseOrError;
    for (const h of this.handlers) {
      if (!h) continue;
      if (h.runWhen && !h.runWhen(acc)) continue;
      const fn = isError ? h.rejected : h.fulfilled;
      if (fn) { acc = await fn(acc); }
    }
    return acc;
  }
}
