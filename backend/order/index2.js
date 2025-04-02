const express = require('express');
const axios = require('axios');
const app = express();
const port = 3001;

app.use(express.json());

app.put('/purchase/:id', async (req, res) => {
  const id = req.params.id;
 

  try {
    console.log("Trying to contact catalog with:", `http://localhost:3000/info/${id}`);

    const catalogResponse = await axios.get(`http://localhost:3000/info/${id}`);

    const { quantity } = catalogResponse.data;

    if (quantity > 0) {
      await axios.put(`http://localhost:3000/update/${id}`, {
        quantity: quantity - 1
      });

      res.json({
        success: true,
        message: "Book purchased successfully"
      });
    } 
    else {
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
