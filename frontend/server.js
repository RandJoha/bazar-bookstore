const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3100;

const CATALOG_SERVER = 'http://catalog:3000';
const ORDER_SERVER = 'http://order:3001';

// Search books by topic
app.get('/search/:topic', async (req, res) => {
    try {
        const response = await axios.get(`${CATALOG_SERVER}/search/${req.params.topic}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching data from catalog server' });
    }
});

// Get book details by item number
app.get('/info/:id', async (req, res) => {
    try {
        const response = await axios.get(`${CATALOG_SERVER}/info/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching item details' });
    }
});

// Purchase a book by item number
app.post('/purchase/:id', async (req, res) => {
    try {
        const response = await axios.post(`${ORDER_SERVER}/purchase/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error processing purchase request' });
       
    }
});

app.listen(PORT, () => {
    console.log(`Front-end server running on port ${PORT}`);
});
