require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns').promises;
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

// Temporary diagnostics endpoint for deployment debugging.
app.get('/api/_diag/db', async (req, res) => {
  const databaseUrl = process.env.DATABASE_URL || '';
  let parsedHost = null;
  let parsedPort = null;
  let parseError = null;
  let dnsResult = null;
  let dnsError = null;

  try {
    const url = new URL(databaseUrl);
    parsedHost = url.hostname;
    parsedPort = url.port || null;
  } catch (err) {
    parseError = err.message;
  }

  if (parsedHost) {
    try {
      dnsResult = await dns.lookup(parsedHost, { all: true });
    } catch (err) {
      dnsError = err.message;
    }
  }

  res.json({
    hasDatabaseUrl: Boolean(databaseUrl),
    parsedHost,
    parsedPort,
    parseError,
    dnsResult,
    dnsError,
    runtime: process.env.VERCEL ? 'vercel' : 'local'
  });
});

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
