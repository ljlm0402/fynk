import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';

const alovaInstance = createAlova({
  baseURL: 'http://localhost:4000',
  requestAdapter: adapterFetch(),
  responded: response => response.json()
});

export async function runAlova() {
  const t0 = performance.now();
  const reqs = Array.from({ length: 10 }).map(() => 
    alovaInstance.Get('/users/1').send()
  );
  await Promise.all(reqs);
  const t1 = performance.now();
  return { label: 'alova', duration: t1 - t0, calls: 10 };
}

export async function runAlovaCached() {
  // 첫 번째 요청으로 캐시 생성
  const getUserMethod = alovaInstance.Get('/users/1');
  await getUserMethod.send();
  
  const t0 = performance.now();
  const reqs = Array.from({ length: 10 }).map(() => 
    getUserMethod.send()
  );
  await Promise.all(reqs);
  const t1 = performance.now();
  return { label: 'alova (cached)', duration: t1 - t0, calls: 'cache≈1' };
}