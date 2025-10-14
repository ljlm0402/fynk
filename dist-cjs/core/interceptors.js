"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterceptorManager = void 0;
class InterceptorManager {
    constructor() {
        this.handlers = [];
    }
    use(fulfilled, rejected, runWhen) {
        this.handlers.push({ fulfilled, rejected, runWhen });
        return this.handlers.length - 1;
    }
    eject(id) {
        if (this.handlers[id])
            this.handlers[id] = null;
    }
    async runForRequest(config) {
        let acc = config;
        for (const h of this.handlers) {
            if (!h)
                continue;
            if (h.runWhen && !h.runWhen(acc))
                continue;
            if (h.fulfilled) {
                try {
                    acc = await h.fulfilled(acc);
                }
                catch (e) {
                    if (h.rejected)
                        acc = await h.rejected(e);
                    else
                        throw e;
                }
            }
        }
        return acc;
    }
    async runForResponse(responseOrError, isError = false) {
        let acc = responseOrError;
        for (const h of this.handlers) {
            if (!h)
                continue;
            if (h.runWhen && !h.runWhen(acc))
                continue;
            const fn = isError ? h.rejected : h.fulfilled;
            if (fn) {
                acc = await fn(acc);
            }
        }
        return acc;
    }
}
exports.InterceptorManager = InterceptorManager;
