
const express = require('express');
const axios = require('axios');
const app = express();

const port = process.env.PORT || 3001;
const sourceReplica = process.env.SERVICE_NAME || "unknown";

app.use(express.json());

app.post('/purchase/:id', async (req, res) => {
  const id = req.params.id;

  try {
    console.log(`[${sourceReplica}] 🔎 Trying to contact catalog with: http://catalog2:3000/info/${id}`);

    const catalogResponse = await axios.get(`http://catalog2:3000/info/${id}`);
    const { quantity, title } = catalogResponse.data;

    if (quantity > 0) {
      console.log(`✅ [${sourceReplica}] bought book: ${title}`);

      await axios.put(`http://catalog2:3000/update/${id}`, {
        quantity: quantity - 1,
        source: sourceReplica
      });

      res.json({
        success: true,
        message: `Book purchased successfully by ${sourceReplica}`
      });
    } else {
      console.log(`❌ [${sourceReplica}] Book "${title}" is out of stock`);

      res.json({
        success: false,
        message: "Book is out of stock"
      });
    }
  } catch (error) {
    console.error(`[${sourceReplica}] ❌ Error:`, error.message);
    res.status(500).json({
      success: false,
      message: "Error processing purchase",
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Order Service ${sourceReplica} running on http://localhost:${port}`);
});
