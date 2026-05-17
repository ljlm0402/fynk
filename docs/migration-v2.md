# Migrating to Fynk 2.0

Fynk 2.0 is a major release. It removes the old `Helio*` public type names and standardizes the public API around the Fynk package name.

## Type Rename

Update type imports:

```ts
// Before
import type { HelioClient, HelioRequestConfig, HelioResponse } from 'fynk';

// After
import type { FynkClient, FynkRequestConfig, FynkResponse } from 'fynk';
```

Mapping:

| Removed in 2.0 | Use instead |
| -------------- | ----------- |
| `HelioClient` | `FynkClient` |
| `HelioRequestConfig` | `FynkRequestConfig` |
| `HelioResponse` | `FynkResponse` |

No deprecated aliases are provided in 2.0. This keeps the public API clean and avoids carrying the old internal project name forward.

## HTTP Behavior Changes

- `client.get()` now uses Fynk's scheduler by default for GET request dedupe/cache behavior.
- The fetch adapter throws `FynkError` for invalid HTTP status codes by default.
- Empty responses such as `204 No Content` return `undefined`.
- Non-JSON responses return text instead of always attempting `response.json()`.

## New Capabilities

- Request options: `params`, `timeout`, `signal`, `retry`, `dedupe`, `dedupeKey`
- Standardized errors: `FynkError`, `isFynkError`
- Cache controls: `invalidate`, `clearCache`, `inspect`
- Persistence: `persist`, `hydrate`
- Normalized relations: `relations`, `resolve`
- React/Vue `useInfiniteQuery`

## Recommended Checks

After upgrading:

```bash
npm test
npm run build
```

If your app imported the removed `Helio*` types, replace them with the corresponding `Fynk*` types and rerun TypeScript.
