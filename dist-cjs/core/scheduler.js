"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScheduler = createScheduler;
function createScheduler() {
    const inflight = new Map();
    const cache = new Map();
    return {
        run(key, fn, ttl = 30000, options = {}) {
            const { dedupe = true, cache: shouldCache = true } = options;
            // 1. 캐시 우선 확인 (동기적)
            const cached = shouldCache ? cache.get(key) : undefined;
            if (cached && Date.now() - cached.timestamp < cached.ttl) {
                return Promise.resolve(cached.data);
            }
            // 2. 진행 중인 요청 확인
            const existing = inflight.get(key);
            if (dedupe && existing)
                return existing;
            // 3. 새 요청 실행 + 캐싱
            const promise = fn().then(result => {
                // 캐시에 저장
                if (shouldCache) {
                    cache.set(key, {
                        data: result,
                        timestamp: Date.now(),
                        ttl
                    });
                }
                return result;
            }).finally(() => {
                if (inflight.get(key) === promise)
                    inflight.delete(key);
            });
            if (dedupe)
                inflight.set(key, promise);
            return promise;
        },
        invalidate: (keyOrPredicate) => {
            if (keyOrPredicate === undefined) {
                cache.clear();
                return;
            }
            if (typeof keyOrPredicate === 'string') {
                for (const key of cache.keys()) {
                    if (key === keyOrPredicate || key.startsWith(keyOrPredicate))
                        cache.delete(key);
                }
                return;
            }
            for (const key of cache.keys()) {
                if (keyOrPredicate(key))
                    cache.delete(key);
            }
        },
        clearCache: () => cache.clear(),
        getCacheSize: () => cache.size
    };
}
