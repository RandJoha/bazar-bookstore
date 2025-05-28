const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;
const serviceName = process.env.SERVICE_NAME || 'catalog';
const replicaId = process.env.REPLICA_ID || '1';
//const sourceReplica = process.env.SERVICE_NAME || "unknown";
const allReplicas = ['1', '2']; 

const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const booksFilePath = path.join(__dirname, 'books.csv');

app.use(express.json());

console.log(`Starting ${serviceName} (Replica ${replicaId}) on port ${port}`);


const getOtherReplicaUrl = () => {
  const otherReplicaId = replicaId === '1' ? '2' : '1';
  return `http://catalog${otherReplicaId}:3000`;
};


const syncWithOtherReplica = async (bookId, updatedData) => {
  try {
    const otherReplicaUrl = getOtherReplicaUrl();
    console.log(`🔄 Syncing update for book ID ${bookId} with ${otherReplicaUrl}`);
    
    
    await axios.put(`${otherReplicaUrl}/sync/${bookId}`, updatedData);
    console.log(`✅ Successfully synced with other replica`);
  } catch (error) {
    console.error(`❌ Failed to sync with other replica: ${error.message}`);
  }
};

let books = [];
let logicalClock = 0;
let pendingReplies = 0;
let deferredRequests = [];
let isUpdating = false;
let wantsToUpdate = false;
let pendingUpdate = null;



fs.createReadStream('books.csv')
  .pipe(csv())
  .on('data', (row) => {
    books.push({
      id: parseInt(row.id),
      title: row.title,
      topic: row.topic,
      price: parseFloat(row.price),
      quantity: parseInt(row.quantity)
  //    source: row.source || '' 
    });
  })
  .on('end', () => {
    console.log('Books data loaded from CSV');

    app.listen(port, () => {
        console.log(`Catalog Service ${serviceName} (Replica ${replicaId}) running on http://localhost:${port}`);
      });
      
  });
  

// API: /info/:id
app.get('/info/:id', (req, res) => {

  const id = parseInt(req.params.id);
  const book = books.find(b => parseInt(b.id) === id);

  if (book) {
    console.log(`✅ Info for book ID ${book.id}`);
    console.log(`📘 Title: ${book.title}`);
    console.log(`📚 Topic: ${book.topic}`);
    console.log(`💵 Price: ${book.price}`);
    console.log(`📦 Quantity: ${book.quantity}`);
  
    res.json({
      id: book.id,
      title: book.title,
      topic: book.topic,
      quantity: book.quantity,
      price: book.price
    });
  }
   else {
    console.log(`❌ Book with ID ${id} not found.`);
    res.status(404).json({ error: "Book not found" });
  }
});


// GET /search/:topic
app.get('/search/:topic', (req, res) => {
    const topic = req.params.topic.toLowerCase();
  
    const matchedBooks = books.filter(b => b.topic.toLowerCase() === topic);
  
    if (matchedBooks.length > 0) {
      console.log(`🔎 Search request for topic: "${topic}"`);
      matchedBooks.forEach(book => {
        console.log(`➡️ ID: ${book.id}, Title: ${book.title}`);
      });
    
      const result = matchedBooks.map(b => ({
        id: b.id,
        title: b.title
      }));
    
      res.json(result);
    }
     else {
      console.log(`❌ "No books found for the ${topic} topic`);
      res.status(404).json({ message: "No books found for this topic" });
    }
  });
  

  app.put('/sync/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedData = req.body;
    
    console.log(`🔄 Received sync request for book ID ${id} from other replica`);
    console.log(`📝 Sync data:`, updatedData);
    
    const book = books.find(b => parseInt(b.id) === id);

    if (updatedData.clock <= logicalClock) {
      console.log(`⏱️ Ignored sync for book ID ${id}: incoming clock ${updatedData.clock} <= local clock ${logicalClock}`);
      return res.json({ status: 'ignored', reason: 'outdated update' });
    }

   logicalClock = updatedData.clock;
   console.log(`⏱️ Logical clock updated to ${logicalClock} from incoming sync`);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found for sync' });
    }
  
    if (updatedData.price !== undefined) {
      book.price = updatedData.price;
    }
  
    if (updatedData.quantity !== undefined) {
      book.quantity = updatedData.quantity;
    }
    
    
  
   
    const writer = csvWriter({
      path: booksFilePath,
      header: [
        { id: 'id', title: 'id' },
        { id: 'title', title: 'title' },
        { id: 'topic', title: 'topic' },
        { id: 'quantity', title: 'quantity' },
        { id: 'price', title: 'price' }
        //{ id: 'source', title: 'source' } 
      ]
    });
  
    writer.writeRecords(books)
      .then(() => {
        res.json({
          status: 'success',
          message: 'Book updated via sync',
          updated: {
            id: book.id,
            price: book.price,
            quantity: book.quantity
          }
        });
      })
      .catch(error => {
        console.error("Error writing CSV during sync:", error);
        res.status(500).json({ error: "Failed to update CSV file during sync" });
      });
  });


  app.put('/update/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const updatedData = req.body;

  logicalClock++;
  wantsToUpdate = true;
  console.log(`⏳ Wants to update book ${id} — Clock: ${logicalClock}`);

  pendingUpdate = { id, updatedData }; 

  pendingReplies = allReplicas.length - 1;

  for (const replica of allReplicas) {
    if (replica !== replicaId) {
      try {
        await axios.post(`http://catalog${replica}:3000/request-access`, {
          from: replicaId,
          clock: logicalClock,
          bookId: id
        });
      } catch (err) {
        console.error(`❌ Failed to contact replica ${replica}: ${err.message}`);
      }
    }
  }
  res.json({ status: 'waiting', message: `Waiting for OKs from replicas for book ${id}` });
});


async function proceedToUpdate(bookId) {
  isUpdating = true;

  const { updatedData } = pendingUpdate;
  const book = books.find(b => parseInt(b.id) === bookId);
  if (!book) return;

  if (updatedData.price !== undefined) {
    book.price = updatedData.price;
  }
  if (updatedData.quantity !== undefined) {
    book.quantity = updatedData.quantity;
  }

  try {
    await axios.post('http://frontend:3100/invalidate', { id: bookId });
    console.log(`🧹 Sent invalidate for book ${bookId}`);
  } catch (err) {
    console.error(`⚠️ Failed to invalidate: ${err.message}`);
  }

  const writer = csvWriter({
    path: booksFilePath,
    header: [
      { id: 'id', title: 'id' },
      { id: 'title', title: 'title' },
      { id: 'topic', title: 'topic' },
      { id: 'quantity', title: 'quantity' },
      { id: 'price', title: 'price' }
    ]
  });

  await writer.writeRecords(books);

  for (const replica of allReplicas) {
    if (replica !== replicaId) {
      await axios.put(`http://catalog${replica}:3000/sync/${bookId}`, {
        quantity: book.quantity,
        price: book.price,
        clock: logicalClock
      });
    }
  }

  isUpdating = false;
  wantsToUpdate = false;
  pendingUpdate = null;

  for (const req of deferredRequests) {
    await axios.post(`http://catalog${req.from}:3000/reply-access`, {
      from: replicaId,
      bookId: req.bookId
    });
  }

  deferredRequests = [];
  console.log(`✅ Update complete for book ${bookId}`);
}





  app.post('/request-access', (req, res) => {
  const { from, clock, bookId } = req.body;

  
  logicalClock = Math.max(logicalClock, clock) + 1;

  const shouldDefer =
    isUpdating ||
    (wantsToUpdate && (clock < logicalClock || (clock === logicalClock && from < replicaId)));

  if (shouldDefer) {
    deferredRequests.push({ from, bookId });
    console.log(`⏳ Deferred access for replica ${from} on book ${bookId}`);
  } else {
    console.log(`✅ Granted access to replica ${from} for book ${bookId}`);
    axios.post(`http://catalog${from}:3000/reply-access`, {
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
    console.log(`🔐 All OKs received. Safe to update book ${bookId}`);
    
    proceedToUpdate(bookId);
  }

  res.json({ status: 'ok' });
});

