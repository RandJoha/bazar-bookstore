const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const port = 3000;

app.use(express.json());


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
  });

// API: /info/:id
app.get('/info/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const book = books.find(b => b.id === id);

  if (book) {
    res.json({
      id: book.id,
      title: book.title,
      topic: book.topic,
      quantity: book.quantity,
      price: book.price
    });
  } else {
    res.status(404).json({ error: "Book not found" });
  }
});

app.listen(port, () => {
  console.log(`Catalog Service running on http://localhost:${port}`);
});
