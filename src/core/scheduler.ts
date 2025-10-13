
import type { Scheduler } from './types';

export function createScheduler(): Scheduler {
  const inflight = new Map<string, Promise<any>>();
  return {
    run<T>(key: string, fn: () => Promise<T>) {
      if (inflight.has(key)) return inflight.get(key)! as Promise<T>;
      const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
      inflight.set(key, p);
      return p;
    }
  };
}
