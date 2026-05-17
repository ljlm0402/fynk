# Changelog

## Unreleased

- Added request options for params, timeout, abort signals, retry, dedupe, and custom dedupe keys.
- Added `FynkError` and `isFynkError` for standardized error handling.
- Added normalized relation support with `client.resolve`.
- Added cache inspection and persistence with `client.inspect`, `client.persist`, and `client.hydrate`.
- Added React and Vue `useInfiniteQuery`.
- Added package import smoke tests for ESM/CJS outputs.
- Expanded benchmarks to include native fetch and optional ky/got rows.
- Renamed public client types to `FynkClient`, `FynkRequestConfig`, and `FynkResponse`.
