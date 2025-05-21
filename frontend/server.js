
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3100;

const CATALOG_SERVER = 'http://catalog:3000';
const ORDER_SERVER = 'http://order:3001';

// Simple in-memory cache
const cache = {};
const CACHE_TTL = 60 * 1000; // 1 minute TTL

// Helper: Get from cache or return null
function getFromCache(key) {
    const entry = cache[key];
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp < CACHE_TTL) {
        return entry.data;
    } else {
        // Cache expired
        delete cache[key];
        return null;
    }
}

// Helper: Set cache
function setCache(key, data) {
    cache[key] = {
        data,
        timestamp: Date.now(),
    };
}

// Search books by topic (cached)
app.get('/search/:topic', async (req, res) => {
    const cacheKey = `search:${req.params.topic}`;
    const cached = getFromCache(cacheKey);

    if (cached) {
        console.log(`🧠 Serving from cache: ${cacheKey}`);
        return res.json(cached);
    }

    try {
        const response = await axios.get(`${CATALOG_SERVER}/search/${req.params.topic}`);
        setCache(cacheKey, response.data);

        const books = response.data;
        console.log(`✅ Search results for topic '${req.params.topic}':`);
        books.forEach(b => {
            console.log(`- [${b.id}] ${b.title}`);
        });

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching data from catalog server' });
    }
});

// Get book details by item number (cached)
app.get('/info/:id', async (req, res) => {
    const cacheKey = `info:${req.params.id}`;
    const cached = getFromCache(cacheKey);

    if (cached) {
        console.log(`🧠 Serving from cache: ${cacheKey}`);
        return res.json(cached);
    }

    try {
        const response = await axios.get(`${CATALOG_SERVER}/info/${req.params.id}`);
        setCache(cacheKey, response.data);

        const b = response.data;
        console.log(`Book details:\nID: ${b.id}\n📚 Topic: ${b.Topic}\n📘 Title: ${b.title}\n📦 Quantity: ${b.quantity}\n💵 Price: ${b.price}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching item details' });
    }
});

// Purchase a book by item number (no caching)
app.post('/purchase/:id', async (req, res) => {
    try {
        const response = await axios.post(`${ORDER_SERVER}/purchase/${req.params.id}`);
        console.log(`✅ Bought book with ID: ${req.params.id}`);

        // Optionally clear cache for this book since its quantity likely changed
        delete cache[`info:${req.params.id}`];
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error processing purchase request' });
    }
});

app.listen(PORT, () => {
    console.log(`Front-end server running on port ${PORT}`);
});
 