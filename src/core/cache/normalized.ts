
import type {
  CacheSnapshot,
  EntityId,
  ModelDef,
  ModelRegistry,
  NormalizedCache,
  SerializableCacheSnapshot
} from '../types.js';

export function createNormalizedCache(): NormalizedCache {
  const tables = new Map<string, Map<EntityId, any>>();
  const listeners = new Set<() => void>();
  const version = { value: 0 };

  const tableOf = (key: string) => (tables.has(key) ? tables.get(key)! : tables.set(key, new Map()).get(key)!);
  const bump = () => { version.value++; listeners.forEach(fn => fn()); };

  function upsert<T>(model: ModelDef<T>, entity: T) {
    tableOf(model.key).set(model.id(entity), entity); bump();
  }
  function patch<T>(model: ModelDef<T>, id: EntityId, partial: Partial<T>) {
    const t = tableOf(model.key), cur = t.get(id);
    if (cur) { t.set(id, { ...cur, ...partial }); bump(); }
  }
  function get<T>(model: ModelDef<T>, id: EntityId) {
    const table = tableOf(model.key);
    return table.get(id) ?? table.get(String(id));
  }
  function normalize<T>(model: ModelDef<T>, data: T | T[], registry: ModelRegistry = {}) {
    const arr = Array.isArray(data) ? data : [data];
    const t = tableOf(model.key);
    for (const e of arr) t.set(model.id(e), normalizeEntity(model, e, registry));
    bump();
  }
  function resolve<T>(model: ModelDef<T>, idOrEntity: EntityId | T, registry: ModelRegistry): T | undefined {
    const entity = typeof idOrEntity === 'object' && idOrEntity !== null
      ? idOrEntity as T
      : get(model, idOrEntity as EntityId);
    if (!entity) return undefined;
    return resolveEntity(model, entity, registry);
  }
  function snapshot(): CacheSnapshot {
    return new Map([...tables].map(([key, table]) => [key, new Map(table)]));
  }
  function toJSON(): SerializableCacheSnapshot {
    const json: SerializableCacheSnapshot = {};
    for (const [key, table] of tables) json[key] = Object.fromEntries(table);
    return json;
  }
  function restore(snapshot: CacheSnapshot) {
    tables.clear();
    for (const [key, table] of snapshot) tables.set(key, new Map(table));
    bump();
  }
  function restoreJSON(snapshot: SerializableCacheSnapshot) {
    tables.clear();
    for (const [key, table] of Object.entries(snapshot)) {
      tables.set(key, new Map(Object.entries(table)));
    }
    bump();
  }
  function inspect() {
    const tableInfo: Record<string, { size: number; ids: string[] }> = {};
    for (const [key, table] of tables) tableInfo[key] = { size: table.size, ids: [...table.keys()].map(String) };
    return { version: version.value, tables: tableInfo };
  }
  function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }

  return { upsert, patch, get, normalize, resolve, snapshot, toJSON, restore, restoreJSON, inspect, version, subscribe };

  function normalizeEntity<T>(model: ModelDef<T>, entity: T, registry: ModelRegistry): T {
    if (!model.relations || typeof entity !== 'object' || entity === null) return entity;

    const next: Record<string, any> = { ...(entity as Record<string, any>) };
    for (const [field, relationKey] of Object.entries(model.relations)) {
      const value = next[field];
      if (value === undefined || value === null) continue;

      const relatedModel = registry[Array.isArray(relationKey) ? relationKey[0] : relationKey];
      if (!relatedModel) continue;

      if (Array.isArray(value)) {
        next[field] = value.map(item => {
          if (typeof item !== 'object' || item === null) return item;
          const normalized = normalizeEntity(relatedModel, item, registry);
          const id = relatedModel.id(normalized);
          tableOf(relatedModel.key).set(id, normalized);
          return id;
        });
        continue;
      }

      if (typeof value !== 'object') continue;
      const normalized = normalizeEntity(relatedModel, value, registry);
      const id = relatedModel.id(normalized);
      tableOf(relatedModel.key).set(id, normalized);
      next[field] = id;
    }
    return next as T;
  }

  function resolveEntity<T>(model: ModelDef<T>, entity: T, registry: ModelRegistry): T {
    if (!model.relations || typeof entity !== 'object' || entity === null) return entity;

    const next: Record<string, any> = { ...(entity as Record<string, any>) };
    for (const [field, relationKey] of Object.entries(model.relations)) {
      const value = next[field];
      if (value === undefined || value === null) continue;

      const relatedModel = registry[Array.isArray(relationKey) ? relationKey[0] : relationKey];
      if (!relatedModel) continue;

      if (Array.isArray(value)) {
        next[field] = value
          .map(id => get(relatedModel, id))
          .filter(Boolean)
          .map(related => resolveEntity(relatedModel, related, registry));
        continue;
      }

      const related = get(relatedModel, value);
      if (related) next[field] = resolveEntity(relatedModel, related, registry);
    }
    return next as T;
  }
}
