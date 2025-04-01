 
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());


const books = [
  {
    id: 1,
    title: "How to get a good grade in DOS in 40 minutes a day",
    topic: "distributed systems",
    price: 60,
    quantity: 4
  },
  {
    id: 2,
    title: "RPCs for Noobs",
    topic: "distributed systems",
    price: 50,
    quantity: 5
  },
  {
    id: 3,
    title: "Xen and the Art of Surviving Undergraduate School",
    topic: "undergraduate school",
    price: 40,
    quantity: 3
  },
  {
    id: 4,
    title: "Cooking for the Impatient Undergrad",
    topic: "undergraduate school",
    price: 30,
    quantity: 6
  }
];

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
