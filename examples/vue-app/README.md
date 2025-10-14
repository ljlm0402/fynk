# 🩷 Fynk Vue Example

> Modern Vue 3 application showcasing Fynk's ultra-fast HTTP client with automatic deduplication

## ⚡ What You'll See

- **0.04ms response times** with intelligent caching
- **Automatic request deduplication** - multiple components requesting same data = 1 network call
- **Optimistic updates** - instant UI feedback with rollback on errors  
- **Beautiful modern UI** with loading states and error handling

## 🚀 Features Demonstrated

### Performance Magic
- **5 concurrent requests → 1 network call** via automatic deduplication
- **Sub-millisecond cache hits** for instant data access
- **HTTP/2 optimization** with keep-alive connections

### Developer Experience
- **Zero configuration** - just import and use
- **TypeScript-first** with full type safety
- **Vue 3 Composition API** with reactive composables
- **Normalized caching** for consistent data across components

## 🏃‍♂️ Running the Example

```bash
# Install dependencies  
npm install

# Start the development server
npm run dev

# The app will open at http://localhost:5175
```

## 🔧 API Server

The example connects to `http://localhost:4000`. Make sure to run the API server:

```bash
# From the main fynk directory
npm run bench  # This starts the API server as well
```

## 📱 What to Test

1. **Open DevTools Network tab**
2. **Click "Fire 5 Concurrent Requests"** - watch only 1 HTTP call happen!
3. **Multiple UserCards** - same user ID shares cached data
4. **Optimistic Updates** - add users and see instant UI feedback
5. **Error Handling** - stop API server and see graceful error states

## 🎯 Key Code Patterns

```vue
<script setup lang="ts">
// Automatic deduplication - multiple calls = 1 request
const { data, pending, error } = useQuery(client, {
  key: ['user', userId],
  request: () => client.get(`/users/${userId}`),
  model: UserModel  // Enables normalized caching
});

// Optimistic updates for instant UX
const { mutate } = useMutation(client, {
  request: (vars) => client.post('/users', { body: vars }),
  optimistic: (draft, vars) => {
    // UI updates instantly, rolls back if request fails
    draft.insert(UserModel, { id: -1, ...vars });
  }
});
</script>

<template>
  <!-- Reactive UI with automatic updates -->
  <div v-if="pending">Loading...</div>
  <div v-else>{{ data?.name }}</div>
</template>
```

## 🍃 Vue-Specific Features

- **Reactive refs** - data automatically updates UI when changed
- **Scoped slots** - clean component composition
- **Component-based architecture** - reusable UserCard components
- **Vue 3 Composition API** - modern reactive programming

Enjoy exploring the power of Fynk with Vue! 🚀