"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventSync = createEventSync;
function createEventSync(url) {
    const listeners = new Map();
    const es = new EventSource(url);
    es.onmessage = (e) => {
        var _a;
        try {
            const { type, payload } = JSON.parse(e.data);
            (_a = listeners.get(type)) === null || _a === void 0 ? void 0 : _a.forEach(fn => fn(payload));
        }
        catch { }
    };
    return {
        on(type, fn) {
            if (!listeners.has(type))
                listeners.set(type, new Set());
            listeners.get(type).add(fn);
        }
    };
}
