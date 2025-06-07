const axios = require('axios');

const requestCount = 3;
const bookId = 3;

const frontendUrl = 'http://localhost:3002/purchase/' + bookId;

const requests = [];

for (let i = 0; i < requestCount; i++) {
  requests.push(
    axios.post(frontendUrl).catch(err => {
      return { error: true, message: err.message, status: err.response?.status };
    })
  );
}

console.log(`🚀 Sending ${requestCount} concurrent requests to ${frontendUrl}...`);

Promise.all(requests)
  .then(responses => {
    responses.forEach((res, i) => {
      if (res.error) {
        console.log(`❌ Request ${i + 1}: Error - ${res.message} (Status: ${res.status})`);
      } else {
        console.log(`✅ Request ${i + 1}:`, res.data);
      }
    });
  })
  .catch(err => {
    console.error('🔥 Global error:', err);
  });
