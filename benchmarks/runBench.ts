
import './server/api-server.js';
// import './server/sse-server.js'; // if needed
import { runAxios } from './clients/axiosClient.js';
import { runFynk } from './clients/fynkClient.js';

(async () => {
  // small delay to ensure server up (if you spawn separately, remove this)
  await new Promise(r => setTimeout(r, 100));

  const results = [];
  results.push(await runAxios());
  results.push(await runFynk());

  console.table(results);
})();
