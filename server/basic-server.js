import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Careerate API is running!' });
});

// Serve static files from client folder for development
app.use(express.static(path.join(__dirname, '../client')));

// Serve the index.html file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Basic server setup
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started successfully on port ${PORT}`);
});