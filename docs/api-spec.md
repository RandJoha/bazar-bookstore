 
# API Specification

###  Get book by ID
- Method: GET  
- Endpoint: /info/{id}  
- Response:
```json
{
  "id": 1,
  "title": "RPCs for Noobs",
  "topic": "distributed systems",
  "price": 50,
  "quantity": 5
}



##  Get books by topic
- Method: GET  
- Endpoint: /search/{topic}
- Response:
[
  {
    "id": 1,
    "title": "How to get a good grade in DOS in 40 minutes a day",
    "topic": "distributed systems"
  },
  {
    "id": 2,
    "title": "RPCs for Noobs",
    "topic": "distributed systems"
  }
]





##  Order Service
##  Purchase a book
- Method: POST
- Endpoint: /purchase/{id}
- Response:
Response (success):
{
  "success": true,
  "message": "Book purchased successfully"
}
Response (failure):
{
  "success": false,
  "message": "Book is out of stock"
}




##  Front-end Service (Client API)
##  Look up book by ID
- Method: GET
- Endpoint: /info/{id}
- Response:
{
  "id": 1,
  "title": "RPCs for Noobs",
  "topic": "distributed systems",
  "price": 50,
  "quantity": 5
}
##  Search books by topic
- Method: GET
- Endpoint: /search/{topic}
- Response:
[
  {
    "id": 1,
    "title": "How to get a good grade in DOS in 40 minutes a day",
    "topic": "distributed systems"
  },
  {
    "id": 2,
    "title": "RPCs for Noobs",
    "topic": "distributed systems"
  }
]
##  Purchase book
- Method: PUT
- Endpoint: /purchase/{id}
- Response:
Response (success):
{
  "success": true,
  "message": "Book purchased successfully"
}
Response (failure):
{
  "success": false,
  "message": "Book is out of stock"
}