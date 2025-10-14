
import type { Scheduler } from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function createScheduler(): Scheduler {
  const inflight = new Map<string, Promise<any>>();
  const cache = new Map<string, CacheEntry<any>>();
  
  return {
    run<T>(key: string, fn: () => Promise<T>, ttl = 30000) {
      // 1. 캐시 우선 확인 (동기적)
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return Promise.resolve(cached.data as T);
      }
      
      // 2. 진행 중인 요청 확인
      const existing = inflight.get(key);
      if (existing) return existing as Promise<T>;
      
      // 3. 새 요청 실행 + 캐싱
      const promise = fn().then(result => {
        // 캐시에 저장
        cache.set(key, {
          data: result,
          timestamp: Date.now(),
          ttl
        });
        return result;
      }).finally(() => {
        inflight.delete(key);
      });
      
      inflight.set(key, promise);
      return promise;
    },
    
    // 캐시 관리 메서드 추가
    clearCache: () => cache.clear(),
    getCacheSize: () => cache.size
  };
}
