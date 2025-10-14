
import axios from 'axios';

export async function runAxios() {
  const t0 = performance.now();
  const reqs = Array.from({ length: 10 }).map(() => axios.get('http://localhost:4000/users/1'));
  await Promise.all(reqs);
  const t1 = performance.now();
  return { label: 'axios', duration: t1 - t0, calls: reqs.length };
}
