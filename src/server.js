require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api', apiRoutes);

// Fallback to index.html for undefined frontend routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(` KEBABISTAN BACKEND RUNNING ON PORT ${PORT}`);
    console.log(` Access Landing Page: http://localhost:${PORT}`);
    console.log(` Access Admin Panel:  http://localhost:${PORT}/admin.html`);
    console.log(`=================================================`);
  });
}

module.exports = app;
