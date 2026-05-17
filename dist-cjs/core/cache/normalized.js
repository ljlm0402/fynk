"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNormalizedCache = createNormalizedCache;
function createNormalizedCache() {
    const tables = new Map();
    const listeners = new Set();
    const version = { value: 0 };
    const tableOf = (key) => (tables.has(key) ? tables.get(key) : tables.set(key, new Map()).get(key));
    const bump = () => { version.value++; listeners.forEach(fn => fn()); };
    function upsert(model, entity) {
        tableOf(model.key).set(model.id(entity), entity);
        bump();
    }
    function patch(model, id, partial) {
        const t = tableOf(model.key), cur = t.get(id);
        if (cur) {
            t.set(id, { ...cur, ...partial });
            bump();
        }
    }
    function get(model, id) { return tableOf(model.key).get(id); }
    function normalize(model, data) {
        const arr = Array.isArray(data) ? data : [data];
        const t = tableOf(model.key);
        for (const e of arr)
            t.set(model.id(e), e);
        bump();
    }
    function snapshot() {
        return new Map([...tables].map(([key, table]) => [key, new Map(table)]));
    }
    function restore(snapshot) {
        tables.clear();
        for (const [key, table] of snapshot)
            tables.set(key, new Map(table));
        bump();
    }
    function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    return { upsert, patch, get, normalize, snapshot, restore, version, subscribe };
}
