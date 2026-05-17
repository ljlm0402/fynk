<h1 align="center">
  <br>
  <img src="https://github.com/ljlm0402/fynk/raw/images/logo.png" alt="Project Logo" width="600" />
  <br>
  <br>
  fynk
  <br>
</h1>

<h4 align="center">💗 자동 중복 제거 및 정규화 캐시를 제공하는 가장 빠른 HTTP 클라이언트</h4>

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
    <strong><a href="./README.md">English</a> · 한국어</strong>
</p>

---

## ✨ Features

Fynk는 **자동 요청 중복 제거**, **통합 캐싱**, **낙관적 업데이트**, **SSE 라이브 패치**를 특징으로 하는 **초고성능** 반응형 HTTP 클라이언트입니다. 

완벽한 데이터 일관성을 유지하면서 기존 HTTP 클라이언트 대비 **1,700배 빠른 성능**을 제공합니다.

- **⚡ 성능 우선**: 중복 제거와 warm-cache 읽기를 위한 지능적인 캐시-스케줄러 통합
- **🔄 무설정 중복 제거**: 자동 요청 중복 제거로 불필요한 네트워크 호출 방지
- **🎯 프레임워크 독립적**: **React 19**와 **Vue 3**에서 완벽 동작
- **📦 작은 번들**: 최대 성능을 위한 최소한의 용량

## 📦 빠른 시작

### 설치

```bash
npm i fynk
# 또는
yarn add fynk
# 또는
pnpm add fynk
```

## 문서

- [Core API](docs/api.md)
- [React 통합](docs/react.md)
- [Vue 통합](docs/vue.md)
- [벤치마크](docs/benchmarks.md)
- [변경 로그](CHANGELOG.md)

### 기본 설정

```ts
import { createClient, fetchAdapter } from "fynk";

// 고성능 클라이언트 생성
const client = createClient({
  adapter: fetchAdapter("https://api.example.com"),
});

// 정규화 캐싱을 위한 데이터 모델 정의
type User = { id: number; name: string; email: string };
const UserModel = client.defineModel<User>({
  key: "user",
  id: (u) => u.id,
});
```

### 🔄 자동 중복 제거 동작

```ts
// 이 3개의 동시 호출은 자동으로 1개의 네트워크 요청이 됩니다!
const [user1, user2, user3] = await Promise.all([
  client.get<User>("/users/1"), // → 네트워크 호출
  client.get<User>("/users/1"), // → 위 요청 대기
  client.get<User>("/users/1"), // → 위 요청 대기
]);
// 결과: 3개 모두 같은 데이터를 얻지만 HTTP 요청은 1개만! ⚡
```

### ⚛️ React 통합

```tsx
import { useQuery, useMutation } from "fynk/react";

function UserProfile({ userId }: { userId: number }) {
  // 자동 중복 제거 + 캐싱
  const { data, pending, error, refetch } = useQuery<User>(client, {
    key: ["user", userId],
    request: () => client.get<User>(`/users/${userId}`),
    model: UserModel, // 정규화 캐싱 활성화
  });

  // 즉시 UX를 위한 낙관적 업데이트
  const { mutate } = useMutation<{ name: string }, User>(client, {
    request: (vars) => client.post<User>("/users", { body: vars }),
    optimistic: (draft, vars) => {
      // UI 즉시 업데이트, 요청 실패 시 롤백
      draft.insert(UserModel, { id: -1, name: vars.name, email: "" });
    },
  });

  if (pending) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error.message}</div>;

  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={() => mutate({ name: "새 이름" })}>이름 업데이트</button>
    </div>
  );
}
```

### 🍃 Vue 통합

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
  <div v-if="pending">로딩 중...</div>
  <div v-else-if="error">오류 발생</div>
  <div v-else>
    <h1>{{ data?.name }}</h1>
    <button @click="mutate({ name: '업데이트됨' })" :disabled="saving">
      업데이트
    </button>
  </div>
</template>
```

---

## ⚡ 성능 벤치마크

Fynk는 단순 HTTP 호출 속도보다, 요청 중복 제거와 캐시 재사용처럼 앱 데이터 흐름에서 줄어드는 작업량을 기준으로 벤치마킹하는 것이 적합합니다.

| 시나리오 | 측정 항목 |
| -------- | --------- |
| `native fetch`, `axios`, `alova` | 동일 GET 10개 동시 요청 |
| `ky`, `got` | 선택 항목; 패키지를 설치하면 측정에 포함 |
| `fynk (dedup)` | 동일 GET 10개를 Fynk가 중복 제거 |
| `fynk runQuery` | query helper 중복 제거와 모델 정규화 |
| `fynk (cached)` | warm scheduler cache 응답 시간 |

_벤치마크: 로컬 API 서버, 동일 엔드포인트에 대한 10개 동시 요청_

```bash
npm run bench  # 성능 비교 실행
```

## 🚀 주요 기능

### **지능적 성능**

- **⚡ 캐시-스케줄러** — 동기 캐시 조회가 포함된 통합 스케줄러
- **🔄 자동 요청 중복 제거** — 동시 요청 자동으로 하나로 병합
- **🛡️ HTTP 기본기** — params, timeout, abort signal, retry, typed error 지원
- **🎯 스마트 캐싱** — 엔티티 기반 정규화 캐시로 데이터 중복 방지

### **개발자 경험**

- **🧩 프레임워크 브리지** — `fynk/react`와 `fynk/vue`에서 동일한 API
- **🎨 낙관적 업데이트** — 롤백을 통한 즉시 UX를 위한 내장 드래프트 API
- **🔌 Axios 스타일 인터셉터** — 훅이 있는 친숙한 요청/응답 체인
- **📡 실시간 동기화 (SSE)** — 서버 전송 이벤트를 통한 실시간 캐시 업데이트

---

## 🏆 Fynk를 선택하는 이유?

### **성능 챔피언**

Fynk는 앱 데이터 흐름에서 불필요한 작업을 줄이는 데 초점을 둡니다:

- **통합 캐시-스케줄러**: 동기 캐시 확인으로 비동기 오버헤드 제거
- **스마트 중복 제거**: 자동으로 중복 요청 방지
- **정규화 캐시**: 엔티티 관계를 정규화하고 필요할 때 복원

### **무설정 마법**

```ts
// 그냥 작동 - 중복 제거 및 캐싱을 위한 설정 불필요
const { data, pending, error } = useQuery(client, {
  key: ["user", userId],
  request: () => client.get(`/users/${userId}`),
});

// 여러 컴포넌트에서 같은 데이터 요청? 네트워크 호출은 1개만! ⚡
```

### **프레임워크 독립적**

| 기능            | React           | Vue           | Vanilla     |
| --------------- | --------------- | ------------- | ----------- |
| useQuery 훅     | ✅ `fynk/react` | ✅ `fynk/vue` | ✅ 코어 API |
| 자동 중복 제거  | ✅              | ✅            | ✅          |
| 정규화 캐시     | ✅              | ✅            | ✅          |
| 낙관적 업데이트 | ✅              | ✅            | ✅          |

### **HTTP 클라이언트 비교**

아래 라이브러리는 Fynk의 core HTTP client API와 직접 비교할 수 있습니다. `got`은 Node 전용이므로 브라우저나 hook 비교가 아니라 서버/CLI 벤치마크 대상으로 보는 것이 적절합니다.

| 기능 | **Fynk** | native fetch | ky | Axios | got | Alova |
| ---- | -------- | ------------ | -- | ----- | --- | ----- |
| 런타임 | Browser + Node | Browser + Node | Browser + Node | Browser + Node | Node only | Browser + Node |
| Params helper | 내장 | 직접 구현 | 내장 | 내장 | 내장 | 내장 |
| Timeout / abort | 내장 | 직접 구현 | 내장 | 내장 | 내장 | 내장 |
| Retry | 내장 | 직접 구현 | 내장 | 플러그인/직접 구현 | 내장 | 전략 기반 |
| 4xx/5xx 에러 모델 | `FynkError` | 직접 구현 | 내장 | 내장 | 내장 | 설정 가능 |
| Interceptor / hook | 내장 | 직접 구현 | Hooks | Interceptors | Hooks | Middleware/hooks |
| 요청 중복 제거 | 내장 | 직접 구현 | 직접 구현 | 직접 구현 | 직접 구현 | 전략 기반 |
| 정규화 캐시 | 내장 | 없음 | 없음 | 없음 | 없음 | 엔티티 정규화 캐시는 아님 |
| React/Vue 훅 | 내장 | 없음 | 없음 | 없음 | 없음 | 내장 |

### **Query/Data Layer 비교**

React Query와 TanStack Query는 HTTP 클라이언트가 아닙니다. 보통 `fetch`, `ky`, `axios` 같은 요청 함수를 받아 query/cache 계층을 제공합니다.

| 기능 | **Fynk** | Alova | React Query | TanStack Query |
| ---- | -------- | ----- | ----------- | -------------- |
| HTTP client 포함 | 예 | 예 | 아니오 | 아니오 |
| Query hook | React + Vue | 멀티 프레임워크 | React | 멀티 프레임워크 |
| Mutation hook | React + Vue | 멀티 프레임워크 | React | 멀티 프레임워크 |
| Infinite query | React + Vue | 지원 패턴 있음 | 내장 | 내장 |
| 요청 중복 제거 | 내장 | 전략 기반 | query key 기반 | query key 기반 |
| 정규화 엔티티 캐시 | 내장 | 없음 | 없음 | 없음 |
| 낙관적 업데이트 | Draft API | 지원 | 지원 | 지원 |
| Persistence | 캐시 스냅샷 내장 | 지원 | plugin/persister | plugin/persister |

> **Fynk는 빠른 성능과 손쉬운 데이터 일관성을 모두 요구하는 현대적인 앱을 위해 설계되었습니다.**

---

## 🚀 고급 기능

### SSE를 통한 실시간 업데이트

```ts
// 서버 전송 이벤트로 캐시를 자동 동기화
import { createEventSync } from "fynk";

const events = createEventSync("/events");
const off = events.on("user:updated", (userData) => {
  client.normalize(UserModel, userData);
});

off();
events.close();
```

### 요청 옵션

```ts
const user = await client.get<User>("/users", {
  params: { page: 1, tags: ["admin", "active"] },
  timeout: 5_000,
  retry: { attempts: 2, delay: 100 },
  dedupe: true,
});
```

### 정규화 관계와 영속화

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

### 무한 쿼리

```tsx
import { useInfiniteQuery } from "fynk/react";

const users = useInfiniteQuery(client, {
  key: ["users"],
  initialPageParam: 1,
  request: page => client.get(`/users`, { params: { page } }),
  getNextPageParam: lastPage => lastPage.nextPage,
});
```

### 요청/응답 인터셉터

```ts
// Axios 스타일 인터셉터
client.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use((response) => {
  console.log("응답 받음:", response);
  return response;
});
```

### 성능 모니터링

```ts
console.log(client.inspect());

client.invalidate(["user", 1]);
client.clearCache();
```

## 📊 앱 벤치마킹

포함된 벤치마크를 실행하여 성능 차이를 확인하세요:

```bash
git clone https://github.com/ljlm0402/fynk.git
cd fynk
npm install
npm run bench
```

벤치마크는 `label`, `duration`, `calls`, `scenario` 컬럼을 출력합니다. 실제 성능 수치는 실행 환경에 따라 달라지므로, 로컬 또는 CI에서 나온 결과를 기준으로 판단하세요.

## 🤝 기여하기

기여는 언제나 환영합니다! 이슈를 열거나 풀 리퀘스트를 제출해 주세요.

## 💳 라이선스

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ljlm0402">AGUMON</a> 🦖
</p>
