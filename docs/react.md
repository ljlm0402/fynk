# React Integration

```tsx
import { useQuery, useMutation, useInfiniteQuery } from 'fynk/react';
```

## useQuery

```tsx
const query = useQuery(client, {
  key: ['user', userId],
  request: () => client.get(`/users/${userId}`),
  enabled: Boolean(userId),
  initialData: null,
  select: user => user.name,
  staleTime: 30_000,
  refetchInterval: 60_000,
  onSuccess: name => console.log(name),
});
```

Returns:

```ts
{
  data,
  pending,
  error,
  refetch
}
```

## useMutation

```tsx
const mutation = useMutation(client, {
  request: vars => client.post('/users', { body: vars }),
  optimistic: (draft, vars) => {
    draft.insert(UserModel, { id: -1, ...vars });
  },
  invalidate: [['users']],
  onSuccess: user => console.log(user),
  onError: error => console.error(error),
  onSettled: (result, error) => console.log(result, error),
});
```

Optimistic changes are committed after success and rolled back after failure.

## useInfiniteQuery

```tsx
const users = useInfiniteQuery(client, {
  key: ['users'],
  initialPageParam: 1,
  request: page => client.get('/users', { params: { page } }),
  getNextPageParam: lastPage => lastPage.nextPage,
});
```

Returns:

```ts
{
  pages,
  pageParams,
  data,
  pending,
  fetchingNextPage,
  error,
  hasNextPage,
  fetchNextPage,
  refetch
}
```
