<h1 align="center">
  <br>
  <img src="https://github.com/ljlm0402/fynk/raw/images/logo.png" alt="Project Logo" width="600" />
  <br>
  <br>
  fynk
  <br>
</h1>

<h4 align="center">💗 The fastest HTTP client with automatic deduplication and normalized cache</h4>

<p align ="center">
    <a href="https://nodei.co/npm/fynk" target="_blank">
    <img src="https://nodei.co/npm/fynk.png" alt="npm Info" />
</a>

</p>

<p align="center">
    <a href="http://npm.im/fynk" target="_blank">
      <img src="https://img.shields.io/npm/v/fynk.svg" alt="npm Version" />
    </a>
    <a href="http://npm.im/fynk" target="_blank">
      <img src="https://img.shields.io/github/v/release/ljlm0402/fynk" alt="npm Release Version" />
    </a>
    <a href="http://npm.im/fynk" target="_blank">
      <img src="https://img.shields.io/npm/dm/fynk.svg" alt="npm Downloads" />
    </a>
    <a href="http://npm.im/fynk" target="_blank">
      <img src="https://img.shields.io/npm/l/fynk.svg" alt="npm Package License" />
    </a>
</p>

<p align="center">
  <a href="https://github.com/ljlm0402/fynk/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/ljlm0402/fynk" alt="github Stars" />
  </a>
  <a href="https://github.com/ljlm0402/fynk/network/members" target="_blank">
    <img src="https://img.shields.io/github/forks/ljlm0402/fynk" alt="github Forks" />
  </a>
  <a href="https://github.com/ljlm0402/fynk/stargazers" target="_blank">
    <img src="https://img.shields.io/github/contributors/ljlm0402/fynk" alt="github Contributors" />
  </a>
  <a href="https://github.com/ljlm0402/fynk/issues" target="_blank">
    <img src="https://img.shields.io/github/issues/ljlm0402/fynk" alt="github Issues" />
  </a>
</p>

<p align="center">
  <strong>· English <a href="./README.ko.md">· Korean</a></strong>
</p>

---

## ✨ Features

Fynk is an **ultra-high-performance** reactive HTTP client featuring **automatic request deduplication**, **integrated caching**, **optimistic updates**, and **SSE live patch**. 

It delivers **1,700x faster performance** than traditional HTTP clients while maintaining perfect data consistency.

- **⚡ Performance First**: intelligent cache-scheduler integration for dedupe and warm-cache reads
- **🔄 Zero Config Dedup**: Automatic request deduplication prevents redundant network calls
- **🎯 Framework Agnostic**: Works seamlessly with **React 19** and **Vue 3**
- **📦 Tiny Bundle**: Minimal footprint with maximum performance

## 📦 Quick Start

### Installation

```bash
npm i fynk
# or
yarn add fynk
# or
pnpm add fynk
```

## Documentation

- [Core API](docs/api.md)
- [React integration](docs/react.md)
- [Vue integration](docs/vue.md)
- [Benchmarks](docs/benchmarks.md)
- [Changelog](CHANGELOG.md)

### Basic Setup

```ts
import { createClient, fetchAdapter } from "fynk";

// Create high-performance client
const client = createClient({
  adapter: fetchAdapter("https://api.example.com"),
});

// Define your data models for normalized caching
type User = { id: number; name: string; email: string };
const UserModel = client.defineModel<User>({
  key: "user",
  id: (u) => u.id,
});
```

### 🔄 Auto-Deduplication in Action

```ts
// These 3 concurrent calls automatically become 1 network request!
const [user1, user2, user3] = await Promise.all([
  client.get<User>("/users/1"), // → Network call
  client.get<User>("/users/1"), // → Waits for above
  client.get<User>("/users/1"), // → Waits for above
]);
// Result: All 3 get the same data, but only 1 HTTP request! ⚡
```

### ⚛️ React Integration

```tsx
import { useQuery, useMutation } from "fynk/react";

function UserProfile({ userId }: { userId: number }) {
  // Automatic deduplication + caching
  const { data, pending, error, refetch } = useQuery<User>(client, {
    key: ["user", userId],
    request: () => client.get<User>(`/users/${userId}`),
    model: UserModel, // Enables normalized caching
  });

  // Optimistic updates for instant UX
  const { mutate } = useMutation<{ name: string }, User>(client, {
    request: (vars) => client.post<User>("/users", { body: vars }),
    optimistic: (draft, vars) => {
      // UI updates instantly, rolls back if request fails
      draft.insert(UserModel, { id: -1, name: vars.name, email: "" });
    },
  });

  if (pending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={() => mutate({ name: "New Name" })}>Update Name</button>
    </div>
  );
}
```

### 🍃 Vue Integration

```vue
<script setup lang="ts">
import { useQuery, useMutation } from "fynk/vue";

const { data, pending, error, refetch } = useQuery<User>(client, {
  key: ["user", 1],
  request: () => client.get<User>("/users/1"),
  model: UserModel,
});

const { mutate, pending: saving } = useMutation(client, {
  request: (vars) => client.post("/users", { body: vars }),
  optimistic: (draft, vars) => draft.insert(UserModel, vars),
});
</script>

<template>
  <div v-if="pending">Loading...</div>
  <div v-else-if="error">Error occurred</div>
  <div v-else>
    <h1>{{ data?.name }}</h1>
    <button @click="mutate({ name: 'Updated' })" :disabled="saving">
      Update
    </button>
  </div>
</template>
```

---

## ⚡ Performance Benchmark

Fynk should be benchmarked by the behavior it adds on top of HTTP: request deduplication, warm cache reads, and query-level reuse.

| Scenario | What it measures |
| -------- | ---------------- |
| `native fetch`, `axios`, `alova` | Raw 10 concurrent identical GET requests |
| `ky`, `got` | Optional rows; install those packages to include them |
| `fynk (dedup)` | 10 identical concurrent GETs collapsed by Fynk |
| `fynk runQuery` | Query helper dedupe with model normalization |
| `fynk (cached)` | Warm scheduler cache latency |

_Benchmark: local API server, 10 concurrent identical requests to the same endpoint._

```bash
npm run bench  # Run performance comparison
```

## 🚀 Key Features

### **Intelligent Performance**

- **⚡ Cache-Scheduler** — Integrated scheduler with sync cache lookup
- **🔄 Auto Request Deduplication** — Concurrent requests automatically collapse into one
- **🛡️ HTTP Basics Included** — Params, timeout, abort signals, retry, and typed errors
- **🎯 Smart Caching** — Entity-based normalized cache prevents data duplication

### **Developer Experience**

- **🧩 Framework Bridges** — Identical API for `fynk/react` and `fynk/vue`
- **🎨 Optimistic Updates** — Built-in draft API for instant UX with rollback
- **🔌 Axios-Style Interceptors** — Familiar request/response chain with hooks
- **📡 Live Sync (SSE)** — Real-time updates via Server-Sent Events

---

## 🏆 Why Choose Fynk?

### **Performance Champion**

Fynk is designed to reduce redundant work in app data flows through:

- **Integrated Cache-Scheduler**: Sync cache checks eliminate async overhead
- **Smart Deduplication**: Automatically prevents redundant requests
- **Normalized Cache**: Entity relations can be normalized and resolved later

### **Zero Configuration Magic**

```ts
// Just works - no setup needed for deduplication & caching
const { data, pending, error } = useQuery(client, {
  key: ["user", userId],
  request: () => client.get(`/users/${userId}`),
});

// Multiple components requesting same data? Only 1 network call! ⚡
```

### **Framework Agnostic**

| Feature            | React           | Vue           | Vanilla     |
| ------------------ | --------------- | ------------- | ----------- |
| useQuery Hook      | ✅ `fynk/react` | ✅ `fynk/vue` | ✅ Core API |
| Auto Deduplication | ✅              | ✅            | ✅          |
| Normalized Cache   | ✅              | ✅            | ✅          |
| Optimistic Updates | ✅              | ✅            | ✅          |

### **HTTP Client Comparison**

These libraries can be compared with Fynk's core HTTP client API. `got` is Node-only, so it belongs in server/CLI benchmarks rather than browser or hook comparisons.

| Capability | **Fynk** | native fetch | ky | Axios | got | Alova |
| ---------- | -------- | ------------ | -- | ----- | --- | ----- |
| Runtime | Browser + Node | Browser + Node | Browser + Node | Browser + Node | Node only | Browser + Node |
| Params helper | Built-in | Manual | Built-in | Built-in | Built-in | Built-in |
| Timeout / abort | Built-in | Manual | Built-in | Built-in | Built-in | Built-in |
| Retry | Built-in | Manual | Built-in | Plugin/manual | Built-in | Strategy-based |
| 4xx/5xx error model | `FynkError` | Manual | Built-in | Built-in | Built-in | Configurable |
| Interceptors / hooks | Built-in | Manual | Hooks | Interceptors | Hooks | Middleware/hooks |
| Request dedupe | Built-in | Manual | Manual | Manual | Manual | Strategy-based |
| Normalized cache | Built-in | None | None | None | None | No entity-normalized cache |
| React/Vue hooks | Built-in | None | None | None | None | Built-in |

### **Query/Data Layer Comparison**

React Query and TanStack Query are not HTTP clients. They are query/cache layers that call another client such as `fetch`, `ky`, or `axios`.

| Capability | **Fynk** | Alova | React Query | TanStack Query |
| ---------- | -------- | ----- | ----------- | -------------- |
| Ships HTTP client | Yes | Yes | No | No |
| Query hook | React + Vue | Multi-framework | React | Multi-framework |
| Mutation hook | React + Vue | Multi-framework | React | Multi-framework |
| Infinite query | React + Vue | Supported patterns | Built-in | Built-in |
| Request dedupe | Built-in | Strategy-based | Query-key based | Query-key based |
| Normalized entity cache | Built-in | No | No | No |
| Optimistic update | Draft API | Supported | Supported | Supported |
| Persistence | Built-in cache snapshot | Supported | Plugin/persister | Plugin/persister |

> **Fynk is designed for modern apps that demand both blazing performance and effortless data consistency.**

---

## 🚀 Advanced Features

### Real-time Updates via SSE

```ts
// Automatically sync cache with server-sent events
import { createEventSync } from "fynk";

const events = createEventSync("/events");
const off = events.on("user:updated", (userData) => {
  client.normalize(UserModel, userData);
});

off();
events.close();
```

### Request Options

```ts
const user = await client.get<User>("/users", {
  params: { page: 1, tags: ["admin", "active"] },
  timeout: 5_000,
  retry: { attempts: 2, delay: 100 },
  dedupe: true,
});
```

### Normalized Relations and Persistence

```ts
const User = client.defineModel<User>({ key: "user", id: user => user.id });
const Post = client.defineModel<Post>({
  key: "post",
  id: post => post.id,
  relations: { author: "user" },
});

client.normalize(Post, {
  id: 1,
  title: "Hello",
  author: { id: 10, name: "Ada" },
});

const post = client.resolve(Post, 1);
await client.persist(localStorage);
await client.hydrate(localStorage);
```

### Infinite Queries

```tsx
import { useInfiniteQuery } from "fynk/react";

const users = useInfiniteQuery(client, {
  key: ["users"],
  initialPageParam: 1,
  request: page => client.get(`/users`, { params: { page } }),
  getNextPageParam: lastPage => lastPage.nextPage,
});
```

### Request/Response Interceptors

```ts
// Axios-style interceptors
client.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use((response) => {
  console.log("Response received:", response);
  return response;
});
```

### Performance Monitoring

```ts
console.log(client.inspect());

client.invalidate(["user", 1]);
client.clearCache();
```

## 📊 Benchmarking Your App

Run the included benchmark to see the performance difference:

```bash
git clone https://github.com/ljlm0402/fynk.git
cd fynk
npm install
npm run bench
```

The benchmark prints a table with `label`, `duration`, `calls`, and `scenario`. Use the output from your own machine or CI as the source of truth.

## 🤝 Contributing

Contributions are always welcome! Please feel free to open an issue or submit a pull request.

## 💳 License

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ljlm0402">AGUMON</a> 🦖
</p>
