"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScheduler = createScheduler;
function createScheduler() {
    const inflight = new Map();
    return {
        run(key, fn) {
            if (inflight.has(key))
                return inflight.get(key);
            const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
            inflight.set(key, p);
            return p;
        }
    };
}
