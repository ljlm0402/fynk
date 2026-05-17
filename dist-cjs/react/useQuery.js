"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useQuery = useQuery;
const react_1 = require("react");
const client_js_1 = require("../core/client.js");
function useQuery(client, params) {
    const { key, request, model, enabled = true, initialData = null, select, staleTime = 30000, refetchInterval, onSuccess, onError, onSettled } = params;
    const [data, setData] = (0, react_1.useState)(initialData);
    const [pending, setPending] = (0, react_1.useState)(enabled && initialData === null);
    const [error, setError] = (0, react_1.useState)(null);
    const unsub = (0, react_1.useRef)(() => { });
    (0, react_1.useEffect)(() => {
        let disposed = false;
        let intervalId;
        if (!enabled)
            return () => { disposed = true; };
        const exec = (force = false) => {
            setPending(true);
            setError(null);
            return (0, client_js_1.runQuery)(client, key, request, model, force ? 0 : staleTime)
                .then(res => {
                const selected = select ? select(res) : res;
                if (!disposed) {
                    setData(selected);
                    onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(selected);
                    onSettled === null || onSettled === void 0 ? void 0 : onSettled(selected, null);
                }
                return selected;
            })
                .catch(err => {
                if (!disposed) {
                    setError(err);
                    onError === null || onError === void 0 ? void 0 : onError(err);
                    onSettled === null || onSettled === void 0 ? void 0 : onSettled(null, err);
                }
                throw err;
            })
                .finally(() => { if (!disposed)
                setPending(false); });
        };
        setPending(true);
        setError(null);
        exec().catch(() => { });
        if (refetchInterval && refetchInterval > 0)
            intervalId = setInterval(() => exec(true).catch(() => { }), refetchInterval);
        unsub.current = client.watchVersion(() => { });
        return () => {
            var _a;
            disposed = true;
            if (intervalId)
                clearInterval(intervalId);
            (_a = unsub.current) === null || _a === void 0 ? void 0 : _a.call(unsub);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, key);
    const refetch = () => {
        setPending(true);
        return (0, client_js_1.runQuery)(client, key, request, model, 0)
            .then(res => {
            const selected = select ? select(res) : res;
            setData(selected);
            onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(selected);
            onSettled === null || onSettled === void 0 ? void 0 : onSettled(selected, null);
            return selected;
        })
            .catch(err => {
            setError(err);
            onError === null || onError === void 0 ? void 0 : onError(err);
            onSettled === null || onSettled === void 0 ? void 0 : onSettled(null, err);
            throw err;
        })
            .finally(() => setPending(false));
    };
    return { data, pending, error, refetch };
}
