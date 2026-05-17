# Benchmarks

Run:

```bash
npm run bench
```

The benchmark starts a local API server and compares these scenarios:

| Row | Meaning |
| --- | ------- |
| `native fetch` | 10 concurrent identical GET requests using platform fetch |
| `axios` | 10 concurrent identical GET requests using Axios |
| `ky` | Optional; install `ky` to include this row |
| `got` | Optional; install `got` to include this row |
| `alova` | 10 concurrent identical GET requests using Alova |
| `fynk (dedup)` | 10 identical GETs collapsed through Fynk dedupe |
| `fynk runQuery` | Query helper dedupe plus model normalization |
| `fynk (cached)` | Warm scheduler cache latency |
| `alova (cached)` | Alova warm cache latency |

Use local or CI output as the source of truth. Avoid hard-coding benchmark numbers in documentation because they vary by machine, Node version, and system load.

## Recommended Tracking

- Raw concurrent GET latency
- Network call reduction through dedupe
- Warm cache latency
- Retry and timeout overhead
- Error handling overhead
- Memory growth after repeated cache writes and invalidations

## Optional Clients

`ky` and `got` are intentionally optional in this repository. Install them locally when you want those rows:

```bash
npm install -D ky got
npm run bench
```
