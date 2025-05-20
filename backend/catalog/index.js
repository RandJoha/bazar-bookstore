const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const port = 3000;

const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const booksFilePath = path.join(__dirname, 'books.csv');

app.use(express.json());

// إنشاء كائنات التخزين المؤقت في الذاكرة
const infoCache = new Map(); // تخزين مؤقت لاستعلامات /info/:id
const searchCache = new Map(); // تخزين مؤقت لاستعلامات /search/:topic

const CACHE_TTL = 5 * 60 * 1000;            //5 * 60second  *1000 milisecond


function setCache(cache, key, value) {  //add item to cache after cache time
  const item = {
    value,
    expiry: Date.now() + CACHE_TTL
  };
  cache.set(key, item);
  console.log(`🔄 Data is stored in the key cache: ${key}`);
}


function getCache(cache, key) { //get item from cache
  const item = cache.get(key);
  
    if (!item) {
    return null;
  }
  
 
  if (Date.now() > item.expiry) {
    console.log(`⏱️ The key cache has expired: ${key}`);
    cache.delete(key);
    return null;
  }
  
  console.log(`✅ Data retrieved from key cache: ${key}`);
  return item.value;
}

// cancle stored some times
function invalidateBookCache(id) {
  
  if (infoCache.has(id.toString())) {
    infoCache.delete(id.toString());
    console.log(`🗑️ The book has been cached: ${id}`);
  }
  
  //update is affect the search so cancel the search temporarly
  searchCache.clear();
  console.log('🗑️All cached searches have been canceled.');
}

let books = [];

fs.createReadStream('books.csv')
  .pipe(csv())
  .on('data', (row) => {
    books.push({
      id: parseInt(row.id),
      title: row.title,
      topic: row.topic,
      price: parseFloat(row.price),
      quantity: parseInt(row.quantity)
    });
  })
  .on('end', () => {
    console.log('Books data loaded from CSV');

    app.listen(port, () => {
        console.log(`Catalog Service running on http://localhost:${port}`);
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
      console.log(`❌ "No books found for the ${title} topic`);
      res.status(404).json({ message: "No books found for this topic" });
    }
  });
  

  app.put('/update/:id', (req, res) => {
    

    const id = parseInt(req.params.id);
    const updatedData = req.body;
    
     console.log(`✅ Received update request for ID: ${id}`);
     console.log(`📝 New data:`, updatedData);
    const book = books.find(b => parseInt(b.id) === id);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found to update' });
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
      ]
    });
  
    writer.writeRecords(books)
      .then(() => {
        res.json({
          status: 'success',
          updated: {
            id: book.id,
            price: book.price,
            quantity: book.quantity
          }
        });
      })
      .catch(error => {
        console.error("Error writing CSV:", error);
        res.status(500).json({ error: "Failed to update CSV file" });
      });
  });