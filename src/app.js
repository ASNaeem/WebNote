const express = require('express');
const cors = require('cors');
const path = require('path');
const notesRouter = require('./routes/notes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static assets from public/ folder
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/notes', notesRouter);

// Fallback to static html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
