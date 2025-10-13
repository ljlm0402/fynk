
import React from 'react';
import { createClient, fetchAdapter } from 'fynk';
import { useQuery, useMutation } from 'fynk/react';

const client = createClient({ adapter: fetchAdapter('http://localhost:4000') });

type User = { id: number; name: string; email: string; };
const UserModel = client.defineModel<User>({ key: 'user', id: u => u.id });

export default function App() {
  const { data, pending, error, refetch } = useQuery<User>(client, {
    key: ['user', 1],
    request: () => client.get<User>('/users/1'),
    model: UserModel,
    staleTime: 60000
  });

  const { mutate, pending: saving } = useMutation<{ name: string }, User>(client, {
    request: (vars) => client.post<User>('/users', { body: vars }),
    optimistic: (draft, vars) => draft.insert(UserModel, { id: -1, name: vars.name, email: '' }),
    onSuccess: (res, draft) => draft.upsert(UserModel, res)
  });

  if (pending) return <div>Loading…</div>;
  if (error) return <div>Error</div>;

  return (
    <div>
      <h3>{data?.name}</h3>
      <p>{data?.email}</p>
      <button onClick={() => refetch()}>Refetch</button>
      <button disabled={saving} onClick={() => mutate({ name: 'New User' })}>
        {saving ? 'Saving…' : 'Add User'}
      </button>
    </div>
  );
}
