
# 🩷 Fynk

> Your data, perfectly in sync.

Fynk is a reactive HTTP client with **normalized cache**, **request deduplication**, **optimistic updates**, **SSE live patch**, and **Axios-style interceptors**.  
It works the same in **React 19** and **Vue 3** via `fynk/react` and `fynk/vue` entry points.

---

## Install

```bash
npm i fynk
# or
yarn add fynk
# or
pnpm add fynk
```

## Usage

### Core
```ts
import { createClient, fetchAdapter } from 'fynk';

const client = createClient({ adapter: fetchAdapter('https://api.example.com') });

type User = { id: number; name: string; email: string; };
const UserModel = client.defineModel<User>({ key: 'user', id: u => u.id });

// direct calls
const user = await client.get<User>('/users/1');
```

### React
```tsx
import { useQuery, useMutation } from 'fynk/react';

const { data, pending, error, refetch } = useQuery<User>(client, {
  key: ['user', 1],
  request: () => client.get<User>('/users/1'),
  model: UserModel
});

const { mutate } = useMutation<{ name: string }, User>(client, {
  request: (v) => client.post<User>('/users', { body: v }),
  optimistic: (draft, v) => draft.insert(UserModel, { id: -1, name: v.name, email: '' })
});
```

### Vue
```ts
import { useQuery, useMutation } from 'fynk/vue';
const { data, pending, error, refetch } = useQuery<User>(client, {
  key: ['user', 1],
  request: () => client.get<User>('/users/1'),
  model: UserModel
});
```

---

## Features
- **Normalized Cache** — Entity/ID based, avoids duplication and keeps UI consistent.
- **Dedup Scheduler** — Concurrent same-key requests collapse into one network call.
- **Optimistic Updates** — Draft API for instant UX with rollback.
- **Interceptors** — Axios-style request/response chain with `use/eject` and per-request hooks.
- **Live Sync (SSE)** — Push updates to cache for real-time UI.
- **Framework Bridges** — `fynk/react` and `fynk/vue` with identical API shape.

---

## Bench (Quick Comparison)

```bash
npm run bench
```
Outputs a small table comparing **Axios** (baseline) vs **Fynk** (dedup + cache).

---

## Why Fynk vs Others

| Topic | Fynk | Axios | Alova | React Query / SWR |
|------|------|------|------|--------------------|
| Interceptors | ✅ Axios-style chain | ✅ Strong | ◑ 3 global hooks | ❌ (custom) |
| Dedup | ✅ Key-based scheduler | ❌ | ✅ | ◑ depends |
| Cache Model | ✅ Normalized (entity/ID) | ❌ | ◑ method-level | ✅ key cache (no normalize) |
| Optimistic | ✅ built-in draft | ❌ | ◑ | ✅ |
| Live Updates | ✅ SSE patch | ❌ | ◑ | ❌ polling |
| API Surface | small & consistent | request-focused | strategy-focused | view-focused |

> Fynk targets **REST/Fetch** apps that need **coherent data & fast UX** with minimal code.

---

## License
MIT
