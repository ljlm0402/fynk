
import { createClient } from 'fynk';
import { fetchAdapter } from 'fynk';
import { runQuery } from 'fynk';

const client = createClient({ adapter: fetchAdapter('http://localhost:4000') });
type User = { id: number; name: string; email: string; };
const UserModel = client.defineModel<User>({ key: 'user', id: u => u.id });

export async function runFynk() {
  const key = ['user', 1];
  const req = () => client.get<User>('/users/1');
  const t0 = performance.now();
  await Promise.all(Array.from({ length: 10 }).map(() => runQuery(client, key, req, UserModel)));
  const t1 = performance.now();
  return { label: 'fynk', duration: t1 - t0, calls: 'dedup≈1' };
}
