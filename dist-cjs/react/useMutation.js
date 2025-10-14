"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMutation = useMutation;
const react_1 = require("react");
function useMutation(client, params) {
    const [pending, setPending] = (0, react_1.useState)(false);
    const mutate = async (vars) => {
        var _a, _b, _c;
        setPending(true);
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
            setPending(false);
        }
    };
    return { mutate, pending };
}
