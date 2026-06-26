require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query("UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80' WHERE name = 'Spicy Lamb Wrap'")
  .then(res => {
    console.log(`Updated ${res.rowCount} rows in db.`);
  })
  .catch(err => {
    console.error(err.message);
  })
  .finally(() => {
    pool.end();
  });
