const express = require('express');
const axios = require('axios');
const app = express();
const port = 3001;

app.use(express.json());

app.post('/purchase/:id', async (req, res) => {
  const id = req.params.id;
 

  try {
    console.log("Trying to contact catalog with:", `http://catalog:3000/info/${id}`);

    const catalogResponse = await axios.get(`http://catalog:3000/info/${id}`);

    const { quantity } = catalogResponse.data;

    if (quantity > 0) {
      console.log(`✅ bought book: ${catalogResponse.data.title}`);
      await axios.put(`http://catalog:3000/update/${id}`, {
        quantity: quantity - 1
      });

      res.json({
        success: true,
        message: "Book purchased successfully"
      });
    } 
    else {
      console.log(`❌ Book "${catalogResponse.data.title}" is out of stock`);
      res.json({
        success: false,
        message: "Book is out of stock"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing purchase",
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Order Service running on http://localhost:${port}`);
});
