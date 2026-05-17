"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMutation = useMutation;
const react_1 = require("react");
function useMutation(client, params) {
    const [pending, setPending] = (0, react_1.useState)(false);
    const mutate = async (vars) => {
        var _a, _b, _c, _d, _e, _f;
        setPending(true);
        const didOptimistic = Boolean(params.optimistic);
        try {
            (_a = params.optimistic) === null || _a === void 0 ? void 0 : _a.call(params, client.draft, vars);
            const res = await params.request(vars);
            if (didOptimistic)
                client.draft.commit();
            (_b = params.invalidate) === null || _b === void 0 ? void 0 : _b.forEach(key => client.invalidate(key));
            (_c = params.onSuccess) === null || _c === void 0 ? void 0 : _c.call(params, res, client.draft);
            (_d = params.onSettled) === null || _d === void 0 ? void 0 : _d.call(params, res, null, client.draft);
            return res;
        }
        catch (e) {
            if (didOptimistic)
                client.draft.rollback();
            (_e = params.onError) === null || _e === void 0 ? void 0 : _e.call(params, e, client.draft);
            (_f = params.onSettled) === null || _f === void 0 ? void 0 : _f.call(params, null, e, client.draft);
            throw e;
        }
        finally {
            setPending(false);
        }
    };
    return { mutate, pending };
}
