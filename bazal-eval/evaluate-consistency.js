
const axios = require('axios');

const ADMIN_SECRET = 'secret123';
const baseUrl = 'http://localhost:3002'; 
const bookId = 1;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function measure(label, func) {
  const start = Date.now();
  await func();
  const end = Date.now();
  const time = end - start;
  console.log(`${label} took ${time} ms`);
  return time;
}

(async () => {
  console.log(' Clearing cache...');
  await axios.post(`${baseUrl}/cache/clear`, {}, {
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });

  console.log('\nInitial request (should be MISS)');
  const t1 = await measure('GET info (miss)', () =>
    axios.get(`${baseUrl}/info/${bookId}`)
  );

  console.log('\nRepeated request (should be HIT)');
  const t2 = await measure('GET info (hit)', () =>
    axios.get(`${baseUrl}/info/${bookId}`)
  );

  console.log('\n Performing BUY (triggers invalidation)');
  const t3 = await measure('BUY', () =>
    axios.post(`${baseUrl}/purchase/${bookId}`)
  );

  console.log('\n Request after BUY (should be MISS)');
  const t4 = await measure('GET info after BUY (miss)', () =>
    axios.get(`${baseUrl}/info/${bookId}`)
  );

  console.log('\nRequest again (should be HIT)');
  const t5 = await measure('GET info (hit again)', () =>
    axios.get(`${baseUrl}/info/${bookId}`)
  );

  console.log('\n Summary:');
  console.log(`First MISS: ${t1} ms`);
  console.log(`First HIT: ${t2} ms`);
  console.log(`Buy (write): ${t3} ms`);
  console.log(`Post-BUY MISS: ${t4} ms`);
  console.log(`Final HIT: ${t5} ms`);

  console.log(`\n Overhead of cache consistency ${t3} ms`);
  console.log(`\n latency of a subsequent request that sees a cache miss ${t4} ms`);
})();
