const baseURL = 'http://localhost:4000';

export async function runKy() {
  try {
    const { default: ky } = await import('ky');
    const t0 = performance.now();
    await Promise.all(Array.from({ length: 10 }).map(() => ky.get(`${baseURL}/users/1`).json()));
    const t1 = performance.now();
    return { label: 'ky', duration: t1 - t0, calls: 10, scenario: '10 concurrent identical GETs' };
  } catch {
    return { label: 'ky', duration: 'skipped', calls: 'install ky to run', scenario: 'optional dependency' };
  }
}

export async function runGot() {
  try {
    const { default: got } = await import('got');
    const t0 = performance.now();
    await Promise.all(Array.from({ length: 10 }).map(() => got(`${baseURL}/users/1`).json()));
    const t1 = performance.now();
    return { label: 'got', duration: t1 - t0, calls: 10, scenario: '10 concurrent identical GETs' };
  } catch {
    return { label: 'got', duration: 'skipped', calls: 'install got to run', scenario: 'optional dependency' };
  }
}
