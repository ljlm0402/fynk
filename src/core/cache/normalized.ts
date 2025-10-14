
import type { EntityId, ModelDef, NormalizedCache } from '../types';

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
  function get<T>(model: ModelDef<T>, id: EntityId) { return tableOf(model.key).get(id); }
  function normalize<T>(model: ModelDef<T>, data: T | T[]) {
    const arr = Array.isArray(data) ? data : [data];
    const t = tableOf(model.key);
    for (const e of arr) t.set(model.id(e), e);
    bump();
  }
  function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }

  return { upsert, patch, get, normalize, version, subscribe };
}
