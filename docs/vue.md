# Vue Integration

```vue
<script setup lang="ts">
import { useQuery, useMutation, useInfiniteQuery } from 'fynk/vue';
</script>
```

## useQuery

```ts
const query = useQuery(client, {
  key: ['user', userId],
  request: () => client.get(`/users/${userId}`),
  enabled: Boolean(userId),
  initialData: null,
  select: user => user.name,
  staleTime: 30_000,
  refetchInterval: 60_000,
});
```

`data`, `pending`, and `error` are Vue refs.

## useMutation

```ts
const mutation = useMutation(client, {
  request: vars => client.post('/users', { body: vars }),
  optimistic: (draft, vars) => {
    draft.insert(UserModel, { id: -1, ...vars });
  },
  invalidate: [['users']],
});
```

Optimistic changes are committed after success and rolled back after failure.

## useInfiniteQuery

```ts
const users = useInfiniteQuery(client, {
  key: ['users'],
  initialPageParam: 1,
  request: page => client.get('/users', { params: { page } }),
  getNextPageParam: lastPage => lastPage.nextPage,
});
```

`pages`, `pageParams`, `pending`, `fetchingNextPage`, and `error` are Vue refs.
