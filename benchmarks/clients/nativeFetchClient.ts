const baseURL = 'http://localhost:4000';

export async function runNativeFetch() {
  const t0 = performance.now();
  const reqs = Array.from({ length: 10 }).map(async () => {
    const response = await fetch(`${baseURL}/users/1`);
    return response.json();
  });
  await Promise.all(reqs);
  const t1 = performance.now();
  return { label: 'native fetch', duration: t1 - t0, calls: 10, scenario: '10 concurrent identical GETs' };
}
