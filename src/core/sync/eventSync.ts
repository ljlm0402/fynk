
import type { EventSync } from '../types';

export function createEventSync(url: string): EventSync {
  const listeners = new Map<string, Set<(p: any) => void>>();
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try {
      const { type, payload } = JSON.parse(e.data);
      listeners.get(type)?.forEach(fn => fn(payload));
    } catch {}
  };
  return {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    }
  };
}
