// src/index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());


// Health check
app.get('/', (req, res) => res.send('TimeBank API is running'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
