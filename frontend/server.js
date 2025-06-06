
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3100;
const ADMIN_SECRET = "secret123"; 


// Simple in-memory cache
const cache = {};
const CACHE_TTL = 60 * 1000; // 1 minute TTL
const MAX_CACHE_SIZE = 4;

let accessCounter = 0;

const { getCatalogServer, getOrderServer } = require('./balancer');

app.use(express.json());
// Helper: Get from cache or return null
function getFromCache(key) {
    const entry = cache[key];
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp < CACHE_TTL) {
        entry.lastUsed = ++accessCounter; 
        return entry.data;
    } else {
        delete cache[key]; 
        return null;
    }
}


function setCache(key, data) {
    const now = Date.now();

    if (Object.keys(cache).length >= MAX_CACHE_SIZE) {
        let leastUsedKey = null;
        let minAccess = Infinity;

        for (const k in cache) {
            if (cache[k].lastUsed < minAccess) {
                minAccess = cache[k].lastUsed;
                leastUsedKey = k;
            }
        }
        if (leastUsedKey !== null) {
            console.log(`🗑️ Cache full. Removing least recently used: ${leastUsedKey}`);
            delete cache[leastUsedKey];
        }
    }
    cache[key] = {
        data,
        timestamp: now,
        lastUsed: ++accessCounter 
    };
}


app.post('/invalidate', (req, res) => {

    console.log("Invalidate request body:", req.body);  
    const id = req.body.id;
    const key = `info:${id}`;
    if (cache[key]) {
        delete cache[key];
        console.log(`🧹 Cache invalidated for book ID: ${id}`);
    }
    res.json({ status: 'ok', message: `Cache cleared for book ${id}` });
});

// Search books by topic (cached)
app.get('/search/:topic', async (req, res) => {
    const cacheKey = `search:${req.params.topic}`;
    const cached = getFromCache(cacheKey);

    if (cached) {
        console.log(`🧠 Serving from cache: ${cacheKey}`);
        return res.json(cached);
    }

    try {
        const response = await axios.get(`${getCatalogServer()}/search/${req.params.topic}`);
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
        const response = await axios.get(`${getCatalogServer()}/info/${req.params.id}`);
        setCache(cacheKey, response.data);

        const b = response.data;
        console.log(`Book details:\nID: ${b.id}\n📚 topic: ${b.topic}\n📘 Title: ${b.title}\n📦 Quantity: ${b.quantity}\n💵 Price: ${b.price}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching item details' });
    }
});



// Purchase a book by item number (no caching)
app.post('/purchase/:id', async (req, res) => {
    try {
       const catalogUrl = getCatalogServer(); 
       const response = await axios.post(`${getOrderServer()}/purchase`, {
       bookId: req.params.id,
       catalogUrl: catalogUrl
      });

        console.log(`✅ Bought book with ID: ${req.params.id}`);

        // Optionally clear cache for this book since its quantity likely changed
        // delete cache[`info:${req.params.id}`];
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Error processing purchase request' });
    }
});



app.listen(PORT, () => {
    console.log(`Front-end server running on port ${PORT}`);
});
 

app.put('/admin/update/:id', async (req, res) => {
    const adminToken = req.headers['x-admin-secret'];
    if (adminToken !== ADMIN_SECRET) {
        return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const bookId = req.params.id;
    const updateData = req.body;

    try {
        const catalogUrl = getCatalogServer();
        const response = await axios.put(`${catalogUrl}/update/${bookId}`, updateData);

        console.log(`🛠️ Admin updated book ID ${bookId} via ${catalogUrl}`);
        res.json({
            result: response.data
        });
    } catch (error) {
        console.error(`❌ Failed to update book ${bookId}:`, error.message);
        res.status(500).json({ error: 'Failed to update book data' });
    }
});

app.post('/cache/clear', (req, res) => {
  const adminToken = req.headers['x-admin-secret'];

  if (adminToken !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: "Unauthorized access" });
  }

  Object.keys(cache).forEach(k => delete cache[k]);
  accessCounter = 0;

  console.log("🧹 Cache manually cleared by admin");
  res.json({ success: true, message: "Cache cleared successfully" });
});
