
import './server/api-server.ts';
// import './server/sse-server.ts'; // if needed
import { runAxios } from './clients/axiosClient.ts';
import { runFynk } from './clients/fynkClient.ts';

(async () => {
  // small delay to ensure server up (if you spawn separately, remove this)
  await new Promise(r => setTimeout(r, 100));

  const results = [];
  results.push(await runAxios());
  results.push(await runFynk());

  console.table(results);
})();
