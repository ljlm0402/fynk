# Changelog

## 2.0.0

### Breaking Changes

- Removed the old `Helio*` public type names. Use the Fynk-named types instead:
  - `HelioClient` -> `FynkClient`
  - `HelioRequestConfig` -> `FynkRequestConfig`
  - `HelioResponse` -> `FynkResponse`
- `client.get()` now uses Fynk's scheduler for GET dedupe/cache behavior by default.
- Fetch adapter HTTP error handling now throws `FynkError` for invalid status codes by default.
- Empty and non-JSON response handling is now explicit.

### Added

- Added request options for params, timeout, abort signals, retry, dedupe, and custom dedupe keys.
- Added `FynkError` and `isFynkError` for standardized error handling.
- Added normalized relation support with `client.resolve`.
- Added cache inspection and persistence with `client.inspect`, `client.persist`, and `client.hydrate`.
- Added React and Vue `useInfiniteQuery`.
- Added package import smoke tests for ESM/CJS outputs.
- Expanded benchmarks to include native fetch and optional ky/got rows.
- Renamed public client types to `FynkClient`, `FynkRequestConfig`, and `FynkResponse`.
