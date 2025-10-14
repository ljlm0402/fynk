"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMutation = useMutation;
// @ts-ignore
const vue_1 = require("vue");
function useMutation(client, params) {
    const pending = (0, vue_1.ref)(false);
    async function mutate(vars) {
        var _a, _b, _c;
        pending.value = true;
        try {
            (_a = params.optimistic) === null || _a === void 0 ? void 0 : _a.call(params, client.draft, vars);
            const res = await params.request(vars);
            (_b = params.onSuccess) === null || _b === void 0 ? void 0 : _b.call(params, res, client.draft);
            return res;
        }
        catch (e) {
            (_c = params.onError) === null || _c === void 0 ? void 0 : _c.call(params, e, client.draft);
            throw e;
        }
        finally {
            pending.value = false;
        }
    }
    return { mutate, pending };
}
