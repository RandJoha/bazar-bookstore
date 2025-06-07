const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3001;
const sourceReplica = process.env.SERVICE_NAME || "unknown";
const replicaId = process.env.REPLICA_ID || "1";

app.use(express.json());

let logicalClock = 0;
let pendingReplies = 0;
let deferredRequests = [];
let isPurchasing = false;
let wantsToPurchase = false;
let pendingPurchase = null;
let purchaseResponseRes = null;

const allReplicas = ['1', '2']; 


app.post('/purchase', async (req, res) => {
  const { bookId, catalogUrl } = req.body;

  logicalClock++;
  wantsToPurchase = true;
  pendingPurchase = { id: bookId, catalogUrl };
  pendingReplies = allReplicas.length - 1;
  purchaseResponseRes = res;

  for (const r of allReplicas) {
    if (r !== replicaId) {
      try {
        await axios.post(`http://order${r}:3001/request-access`, {
          from: replicaId,
          clock: logicalClock,
          bookId
        });
      } catch (err) {
        console.error(`❌ Failed to contact replica ${r}: ${err.message}`);
      }
    }
  }

  if (pendingReplies === 0) {
    proceedToPurchase(bookId);
  }
});


app.post('/request-access', (req, res) => {
  const { from, clock, bookId } = req.body;

  logicalClock = Math.max(logicalClock, clock) + 1;
  
 const shouldDefer =
    isPurchasing ||
    (wantsToPurchase && (clock < logicalClock || (clock === logicalClock && parseInt(from) < parseInt(replicaId))));

  if (shouldDefer) {
    deferredRequests.push({ from, bookId });
    console.log(`⏳ Deferred access for replica ${from} on book ${bookId}`);
  } else {
    console.log(`✅ Granted access to replica ${from} for book ${bookId}`);
    axios.post(`http://order${from}:3001/reply-access`, {
      from: replicaId,
      bookId
    });
  }

  res.json({ status: 'ok' });
});


app.post('/reply-access', (req, res) => {
  const { from, bookId } = req.body;

  console.log(`📩 Received OK from replica ${from} for book ${bookId}`);
  pendingReplies--;

  if (pendingReplies === 0) {
    proceedToPurchase(bookId);
  }

  res.json({ status: 'ok' });
});

async function proceedToPurchase(bookId) {
  isPurchasing = true;

  const { catalogUrl } = pendingPurchase;

  try {
    console.log(`[${sourceReplica}] 🔎 Contacting catalog: ${catalogUrl}/info/${bookId}`);

    const catalogResponse = await axios.get(`${catalogUrl}/info/${bookId}`);
    const { quantity, title } = catalogResponse.data;

    if (quantity > 0) {
      console.log(`✅ [${sourceReplica}] Bought book: ${title}`);

      await axios.put(`${catalogUrl}/update/${bookId}`, {
        delta: -1,
        source: sourceReplica,
        clock: logicalClock
      });

      purchaseResponseRes?.json({
        success: true,
        message: `Book purchased successfully by ${sourceReplica}`
      });
    } else {
      console.log(`❌ [${sourceReplica}] Book "${title}" is out of stock`);
      purchaseResponseRes?.json({
        success: false,
        message: "Book is out of stock"
      });
    }
  } catch (error) {
    console.error(`[${sourceReplica}] ❌ Error:`, error.message);
    purchaseResponseRes?.status(500).json({
      success: false,
      message: "Error processing purchase",
      error: error.message
    });
  }


  for (const req of deferredRequests) {
    await axios.post(`http://order${req.from}:3001/reply-access`, {
      from: replicaId,
      bookId: req.bookId
    });
  }

  
  isPurchasing = false;
  wantsToPurchase = false;
  pendingPurchase = null;
  deferredRequests = [];
  purchaseResponseRes = null;
}

app.listen(port, () => {
  console.log(`🚀 Order Service ${sourceReplica} running on http://localhost:${port}`);
});
