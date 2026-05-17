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
    function get(model, id) {
        var _a;
        const table = tableOf(model.key);
        return (_a = table.get(id)) !== null && _a !== void 0 ? _a : table.get(String(id));
    }
    function normalize(model, data, registry = {}) {
        const arr = Array.isArray(data) ? data : [data];
        const t = tableOf(model.key);
        for (const e of arr)
            t.set(model.id(e), normalizeEntity(model, e, registry));
        bump();
    }
    function resolve(model, idOrEntity, registry) {
        const entity = typeof idOrEntity === 'object' && idOrEntity !== null
            ? idOrEntity
            : get(model, idOrEntity);
        if (!entity)
            return undefined;
        return resolveEntity(model, entity, registry);
    }
    function snapshot() {
        return new Map([...tables].map(([key, table]) => [key, new Map(table)]));
    }
    function toJSON() {
        const json = {};
        for (const [key, table] of tables)
            json[key] = Object.fromEntries(table);
        return json;
    }
    function restore(snapshot) {
        tables.clear();
        for (const [key, table] of snapshot)
            tables.set(key, new Map(table));
        bump();
    }
    function restoreJSON(snapshot) {
        tables.clear();
        for (const [key, table] of Object.entries(snapshot)) {
            tables.set(key, new Map(Object.entries(table)));
        }
        bump();
    }
    function inspect() {
        const tableInfo = {};
        for (const [key, table] of tables)
            tableInfo[key] = { size: table.size, ids: [...table.keys()].map(String) };
        return { version: version.value, tables: tableInfo };
    }
    function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    return { upsert, patch, get, normalize, resolve, snapshot, toJSON, restore, restoreJSON, inspect, version, subscribe };
    function normalizeEntity(model, entity, registry) {
        if (!model.relations || typeof entity !== 'object' || entity === null)
            return entity;
        const next = { ...entity };
        for (const [field, relationKey] of Object.entries(model.relations)) {
            const value = next[field];
            if (value === undefined || value === null)
                continue;
            const relatedModel = registry[Array.isArray(relationKey) ? relationKey[0] : relationKey];
            if (!relatedModel)
                continue;
            if (Array.isArray(value)) {
                next[field] = value.map(item => {
                    if (typeof item !== 'object' || item === null)
                        return item;
                    const normalized = normalizeEntity(relatedModel, item, registry);
                    const id = relatedModel.id(normalized);
                    tableOf(relatedModel.key).set(id, normalized);
                    return id;
                });
                continue;
            }
            if (typeof value !== 'object')
                continue;
            const normalized = normalizeEntity(relatedModel, value, registry);
            const id = relatedModel.id(normalized);
            tableOf(relatedModel.key).set(id, normalized);
            next[field] = id;
        }
        return next;
    }
    function resolveEntity(model, entity, registry) {
        if (!model.relations || typeof entity !== 'object' || entity === null)
            return entity;
        const next = { ...entity };
        for (const [field, relationKey] of Object.entries(model.relations)) {
            const value = next[field];
            if (value === undefined || value === null)
                continue;
            const relatedModel = registry[Array.isArray(relationKey) ? relationKey[0] : relationKey];
            if (!relatedModel)
                continue;
            if (Array.isArray(value)) {
                next[field] = value
                    .map(id => get(relatedModel, id))
                    .filter(Boolean)
                    .map(related => resolveEntity(relatedModel, related, registry));
                continue;
            }
            const related = get(relatedModel, value);
            if (related)
                next[field] = resolveEntity(relatedModel, related, registry);
        }
        return next;
    }
}
