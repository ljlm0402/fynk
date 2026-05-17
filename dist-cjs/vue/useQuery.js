"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useQuery = useQuery;
// @ts-ignore
const vue_1 = require("vue");
const client_js_1 = require("../core/client.js");
function useQuery(client, params) {
    const { key, request, model, enabled = true, initialData = null, select, staleTime = 30000, refetchInterval, onSuccess, onError, onSettled } = params;
    const data = (0, vue_1.ref)(initialData);
    const pending = (0, vue_1.ref)(enabled && initialData === null);
    const error = (0, vue_1.ref)(null);
    const stop = client.watchVersion(() => { });
    let disposed = false;
    let intervalId;
    async function exec(force = false) {
        pending.value = true;
        error.value = null;
        try {
            const res = await (0, client_js_1.runQuery)(client, key, request, model, force ? 0 : staleTime);
            const selected = select ? select(res) : res;
            if (!disposed) {
                data.value = selected;
                onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(selected);
                onSettled === null || onSettled === void 0 ? void 0 : onSettled(selected, null);
            }
            return selected;
        }
        catch (e) {
            if (!disposed) {
                error.value = e;
                onError === null || onError === void 0 ? void 0 : onError(e);
                onSettled === null || onSettled === void 0 ? void 0 : onSettled(null, e);
            }
            throw e;
        }
        finally {
            if (!disposed)
                pending.value = false;
        }
    }
    if (enabled) {
        exec(false).catch(() => { });
        if (refetchInterval && refetchInterval > 0)
            intervalId = setInterval(() => exec(true).catch(() => { }), refetchInterval);
    }
    (0, vue_1.onUnmounted)(() => {
        disposed = true;
        if (intervalId)
            clearInterval(intervalId);
        stop === null || stop === void 0 ? void 0 : stop();
    });
    return { data, pending, error, refetch: () => exec(true) };
}
