
import './server/api-server.ts';
// import './server/sse-server.ts'; // if needed
import { runNativeFetch } from './clients/nativeFetchClient.ts';
import { runAxios } from './clients/axiosClient.ts';
import { runFynk, runFynkCached, runFynkQuery } from './clients/fynkClient.ts';
import { runAlova, runAlovaCached } from './clients/alovaClient.ts';
import { runGot, runKy } from './clients/optionalClients.ts';

(async () => {
  // small delay to ensure server up (if you spawn separately, remove this)
  await new Promise(r => setTimeout(r, 100));

  console.log('HTTP Client Performance Benchmark\n');

  const results = [];
  
  console.log('Running benchmarks...');
  results.push(await runNativeFetch());
  results.push(await runAxios());
  results.push(await runKy());
  results.push(await runGot());
  results.push(await withoutConsoleNoise(runAlova));
  results.push(await runFynk());
  results.push(await runFynkQuery());
  results.push(await runFynkCached());
  results.push(await withoutConsoleNoise(runAlovaCached));

  console.log('\n📊 Results:');
  console.table(results);
  
  console.log('\nNotes:');
  console.log('- native fetch, axios, ky, got, and alova rows measure raw concurrent request behavior.');
  console.log('- fynk rows measure its core value: deduplication and warm scheduler cache.');
  console.log('- ky and got are optional in this repo; install them to include those rows.');
  
  console.log('\nBenchmark dimensions worth tracking:');
  console.log('  - raw concurrent GET latency');
  console.log('  - actual network call reduction via dedupe');
  console.log('  - warm cache latency');
  console.log('  - retry/timeout/error handling overhead');
  process.exit(0);
})();

async function withoutConsoleNoise<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = originalLog;
  }
}
