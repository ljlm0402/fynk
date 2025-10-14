
import { createClient } from 'fynk';
import { fetchAdapter } from 'fynk';
import { runQuery } from 'fynk';

const client = createClient({ adapter: fetchAdapter('http://localhost:4000') });
// 임시로 간단한 캐시된 클라이언트 생성 (타입 이슈 회피)
const clientCached = createClient({ adapter: fetchAdapter('http://localhost:4000') });

type User = { id: number; name: string; email: string; };
const UserModel = client.defineModel<User>({ key: 'user', id: u => u.id });
const UserModelCached = clientCached.defineModel<User>({ key: 'user', id: u => u.id });

export async function runFynk() {
  const key = ['user', 1];
  const req = () => client.get<User>('/users/1');
  const t0 = performance.now();
  await Promise.all(Array.from({ length: 10 }).map(() => runQuery(client, key, req, UserModel)));
  const t1 = performance.now();
  return { label: 'fynk', duration: t1 - t0, calls: 'dedup≈1' };
}

export async function runFynkCached() {
  const key = ['user', 1];
  const req = () => clientCached.get<User>('/users/1');
  
  // 첫 번째 요청으로 캐시 생성 (짧은 TTL로 즉시 캐시 활용)
  await runQuery(clientCached, key, req, UserModelCached, 60000);
  
  const t0 = performance.now();
  // 캐시된 스케줄러를 활용한 10개 요청
  await Promise.all(Array.from({ length: 10 }).map(() => 
    runQuery(clientCached, key, req, UserModelCached, 60000)
  ));
  const t1 = performance.now();
  return { label: 'fynk (optimized)', duration: t1 - t0, calls: 'cache+dedup' };
}
