const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'kebabistan.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }
  
  db.run("UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80' WHERE name = 'Spicy Lamb Wrap'", function(err) {
    if (err) console.error(err.message);
    else console.log(`Updated ${this.changes} rows in db.`);
    db.close();
  });
});
