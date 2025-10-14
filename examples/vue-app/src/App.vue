
<script setup lang="ts">
import { createClient, fetchAdapter } from 'fynk';
import { useQuery, useMutation } from 'fynk/vue';

const client = createClient({ adapter: fetchAdapter('http://localhost:4000') });

type User = { id: number; name: string; email: string; };
const UserModel = client.defineModel<User>({ key: 'user', id: u => u.id });

const { data, pending, error, refetch } = useQuery<User>(client, {
  key: ['user', 1],
  request: () => client.get<User>('/users/1'),
  model: UserModel,
  staleTime: 60000
});

// 디버깅을 위한 로그
console.log('Vue - pending:', pending.value, 'data:', data.value, 'error:', error.value);

const { mutate, pending: saving } = useMutation<{ name: string }, User>(client, {
  request: (vars) => client.post<User>('/users', { body: vars }),
  optimistic: (draft, vars) => draft.insert(UserModel, { id: -1, name: vars.name, email: '' }),
  onSuccess: (res, draft) => draft.upsert(UserModel, res)
});
</script>

<template>
  <div v-if="pending">Loading…</div>
  <div v-else-if="error">Error</div>
  <div v-else>
    <h3>{{ data?.name }}</h3>
    <p>{{ data?.email }}</p>
    <button @click="refetch()">Refetch</button>
    <button :disabled="saving" @click="mutate({ name: 'New User' })">
      {{ saving ? 'Saving…' : 'Add User' }}
    </button>
  </div>
</template>
