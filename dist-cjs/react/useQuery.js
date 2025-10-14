"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useQuery = useQuery;
const react_1 = require("react");
const client_1 = require("../core/client");
function useQuery(client, params) {
    const { key, request, model, staleTime = 30000 } = params;
    const [data, setData] = (0, react_1.useState)(null);
    const [pending, setPending] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const unsub = (0, react_1.useRef)(() => { });
    (0, react_1.useEffect)(() => {
        setPending(true);
        setError(null);
        (0, client_1.runQuery)(client, key, request, model, staleTime)
            .then(res => setData(res))
            .catch(setError)
            .finally(() => setPending(false));
        unsub.current = client.watchVersion(() => { });
        return () => { var _a; (_a = unsub.current) === null || _a === void 0 ? void 0 : _a.call(unsub); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, key);
    const refetch = () => {
        setPending(true);
        return (0, client_1.runQuery)(client, key, request, model, 0)
            .then(res => setData(res))
            .catch(setError)
            .finally(() => setPending(false));
    };
    return { data, pending, error, refetch };
}
