const axios = require('axios');

const ADMIN_SECRET = 'secret123';
const baseUrl = 'http://localhost:3002';
const bookIds = [1, 2, 3, 4, 5, 6, 7];
const withoutCache = [];
const withCache = [];

async function measureBuy(bookId) {
  const start = Date.now();
  await axios.post(`${baseUrl}/purchase/${bookId}`);
  const end = Date.now();
  return end - start;
}

(async () => {
  console.log(' Clearing cache...');
  await axios.post(`${baseUrl}/cache/clear`, {}, {
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });

  console.log(' Measuring BUY WITHOUT cache...');
  for (const id of bookIds) {
    const t = await measureBuy(id);
    withoutCache.push(t);
  }

  console.log(' Measuring BUY WITH cache...');
  for (const id of bookIds) {
    const t = await measureBuy(id);
    withCache.push(t);
  }

  console.log('\n Buy Results:');
  console.log('ID\tWithoutCache(ms)\tWithCache(ms)');
  for (let i = 0; i < bookIds.length; i++) {
    console.log(`${bookIds[i]}\t${withoutCache[i]}\t\t${withCache[i]}`);
  }

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  console.log('\nAVERAGES:');
  console.log(`Buy Without Cache: ${avg(withoutCache).toFixed(2)} ms`);
  console.log(`Buy With Cache:    ${avg(withCache).toFixed(2)} ms`);
})();
