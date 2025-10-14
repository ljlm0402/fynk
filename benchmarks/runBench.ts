
import './server/api-server.ts';
// import './server/sse-server.ts'; // if needed
import { runAxios } from './clients/axiosClient.ts';
import { runFynk, runFynkCached } from './clients/fynkClient.ts';
import { runAlova, runAlovaCached } from './clients/alovaClient.ts';

(async () => {
  // small delay to ensure server up (if you spawn separately, remove this)
  await new Promise(r => setTimeout(r, 100));

  console.log('🚀 HTTP Client Performance Benchmark\n');

  const results = [];
  
  console.log('Running benchmarks...');
  results.push(await runAxios());
  results.push(await runAlova());
  results.push(await runFynk());
  results.push(await runFynkCached());
  results.push(await runAlovaCached());

  console.log('\n📊 Results:');
  console.table(results);
  
  console.log('\n📝 Notes:');
  console.log('- axios: Standard HTTP client, no deduplication');
  console.log('- alova: Modern request library with basic caching');
  console.log('- fynk: Request deduplication + normalized cache');  
  console.log('- fynk (optimized): Enhanced scheduler + HTTP/2 + cache');
  console.log('- alova (cached): Alova with pre-warmed cache');
  
  console.log('\n⚡ Optimizations Applied to Fynk:');
  console.log('  • Integrated cache-scheduler (sync cache check)');
  console.log('  • HTTP/2 keep-alive connections');
  console.log('  • Reduced Promise overhead');
  console.log('  • Pre-computed cache keys');
})();
