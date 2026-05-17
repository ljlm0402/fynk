"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useQuery = useQuery;
// @ts-ignore
const vue_1 = require("vue");
const client_js_1 = require("../core/client.js");
function useQuery(client, params) {
    const { key, request, model, staleTime = 30000 } = params;
    const data = (0, vue_1.ref)(null);
    const pending = (0, vue_1.ref)(true);
    const error = (0, vue_1.ref)(null);
    const stop = client.watchVersion(() => { });
    let disposed = false;
    async function exec(force = false) {
        pending.value = true;
        error.value = null;
        try {
            const res = await (0, client_js_1.runQuery)(client, key, request, model, force ? 0 : staleTime);
            if (!disposed)
                data.value = res;
        }
        catch (e) {
            if (!disposed)
                error.value = e;
        }
        finally {
            if (!disposed)
                pending.value = false;
        }
    }
    exec(false);
    (0, vue_1.onUnmounted)(() => {
        disposed = true;
        stop === null || stop === void 0 ? void 0 : stop();
    });
    return { data, pending, error, refetch: () => exec(true) };
}
