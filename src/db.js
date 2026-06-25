const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../kebabistan.db');

// Ensure db connection is established
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    initDb();
  }
});

// Initialize database schema
function initDb() {
  db.serialize(() => {
    // 1. Reservations Table
    db.run(`
      CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        guests INTEGER NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Menu Items Table
    db.run(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT,
        category TEXT NOT NULL,
        available INTEGER DEFAULT 1
      )
    `, (err) => {
      if (!err) {
        seedMenuItems();
      }
    });

    // 3. Orders Table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        type TEXT NOT NULL, -- 'delivery' or 'pickup'
        address TEXT,       -- null if pickup
        branch TEXT NOT NULL,
        total_price REAL NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Order Items Table
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        menu_item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
      )
    `);
  });
}

// Seed default menu items if table is empty
function seedMenuItems() {
  db.get('SELECT COUNT(*) AS count FROM menu_items', [], (err, row) => {
    if (err) {
      console.error('Error checking menu items count:', err.message);
      return;
    }

    if (row.count === 0) {
      console.log('Seeding default menu items...');
      const defaultItems = [
        {
          name: 'Sizzling Beef Seekh',
          description: 'Char-grilled minced beef kebabs, slow-marinated in our house spice blend and cooked over open coals.',
          price: 850,
          image_url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=500&q=80',
          category: 'Seekh & Tikka'
        },
        {
          name: 'Murgh Tikka Skewers',
          description: 'Tender chicken breast chunks marinated in tandoori spices and strained yogurt, grilled to perfection.',
          price: 750,
          image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80',
          category: 'Seekh & Tikka'
        },
        {
          name: 'Kebabistan Special Platter',
          description: 'A feast for sharing: 4 seekh kebabs, 4 chicken tikka skewers, and 2 flame-grilled lamb chops. Served with fresh naan and chutneys.',
          price: 2850,
          image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=80',
          category: 'BBQ Platters'
        },
        {
          name: 'Family Flame Feast',
          description: 'Our ultimate platter with assorted kebabs, rotisserie lamb pieces, roasted vegetables, and saffron rice.',
          price: 4950,
          image_url: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=500&q=80',
          category: 'BBQ Platters'
        },
        {
          name: 'Flame-Grilled Shawarma',
          description: 'Tender shaved rotisserie chicken, rolled in warm pita bread with pickled cucumbers and garlic toum sauce.',
          price: 450,
          image_url: 'https://images.unsplash.com/photo-1662116765994-4e4cf1904797?auto=format&fit=crop&w=500&q=80',
          category: 'Shawarma & Wraps'
        },
        {
          name: 'Spicy Lamb Wrap',
          description: 'Flame-roasted spiced lamb shoulder shredded and wrapped with chopped red onions, mint, and fire chilli sauce.',
          price: 650,
          image_url: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=500&q=80',
          category: 'Shawarma & Wraps'
        },
        {
          name: 'Dum Biryani (Chicken)',
          description: 'Aromatic long-grain basmati rice, layered with spiced chicken masala, fried onions, and fresh mint, slow-cooked in a sealed pot.',
          price: 790,
          image_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=500&q=80',
          category: 'Biryani & Rice'
        },
        {
          name: 'Saffron Pilaf Rice',
          description: 'Basmati rice steamed with real saffron, cardamom, cloves, and garnished with toasted almonds and raisins.',
          price: 350,
          image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=500&q=80',
          category: 'Biryani & Rice'
        }
      ];

      const insertSql = `
        INSERT INTO menu_items (name, description, price, image_url, category, available)
        VALUES (?, ?, ?, ?, ?, 1)
      `;

      db.serialize(() => {
        const stmt = db.prepare(insertSql);
        defaultItems.forEach(item => {
          stmt.run([item.name, item.description, item.price, item.image_url, item.category]);
        });
        stmt.finalize((err) => {
          if (err) console.error('Error finalising seed statement:', err.message);
          else console.log('Successfully seeded menu items.');
        });
      });
    }
  });
}

// Wrapper database functions returning promises
const dbOperations = {
  // --- RESERVATIONS ---
  createReservation: (reservation) => {
    return new Promise((resolve, reject) => {
      const { name, phone, date, time, guests, location } = reservation;
      const sql = `
        INSERT INTO reservations (name, phone, date, time, guests, location, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `;
      db.run(sql, [name, phone, date, time, guests, location], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...reservation, status: 'pending' });
        }
      });
    });
  },

  getReservations: (filters = {}) => {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM reservations WHERE 1=1';
      const params = [];

      if (filters.status && filters.status !== 'all') {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.location && filters.location !== 'all') {
        sql += ' AND location = ?';
        params.push(filters.location);
      }
      if (filters.date) {
        sql += ' AND date = ?';
        params.push(filters.date);
      }
      if (filters.search) {
        sql += ' AND (name LIKE ? OR phone LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      sql += ' ORDER BY date ASC, time ASC';

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  updateReservationStatus: (id, status) => {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE reservations SET status = ? WHERE id = ?';
      db.run(sql, [status, id], function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Reservation not found'));
        else resolve({ id, status });
      });
    });
  },

  deleteReservation: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM reservations WHERE id = ?';
      db.run(sql, [id], function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Reservation not found'));
        else resolve({ id, deleted: true });
      });
    });
  },

  // --- MENU ITEMS ---
  getMenuItems: (includeUnavailable = true) => {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM menu_items';
      if (!includeUnavailable) {
        sql += ' WHERE available = 1';
      }
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  createMenuItem: (item) => {
    return new Promise((resolve, reject) => {
      const { name, description, price, image_url, category } = item;
      const sql = `
        INSERT INTO menu_items (name, description, price, image_url, category, available)
        VALUES (?, ?, ?, ?, ?, 1)
      `;
      db.run(sql, [name, description, price, image_url, category], function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...item, available: 1 });
      });
    });
  },

  updateMenuItemAvailability: (id, available) => {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE menu_items SET available = ? WHERE id = ?';
      db.run(sql, [available, id], function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Menu item not found'));
        else resolve({ id, available });
      });
    });
  },

  updateMenuItemPrice: (id, price) => {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE menu_items SET price = ? WHERE id = ?';
      db.run(sql, [price, id], function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Menu item not found'));
        else resolve({ id, price });
      });
    });
  },

  // --- ORDERS ---
  createOrder: (order, items) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const { customer_name, customer_phone, type, address, branch, total_price } = order;
        const orderSql = `
          INSERT INTO orders (customer_name, customer_phone, type, address, branch, total_price, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `;

        db.run(orderSql, [customer_name, customer_phone, type, address, branch, total_price], function (err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          const orderId = this.lastID;
          const itemSql = `
            INSERT INTO order_items (order_id, menu_item_id, quantity, price)
            VALUES (?, ?, ?, ?)
          `;

          const stmt = db.prepare(itemSql);
          let errorOccurred = false;

          for (const item of items) {
            stmt.run([orderId, item.menu_item_id, item.quantity, item.price], (runErr) => {
              if (runErr) {
                errorOccurred = true;
              }
            });
          }

          stmt.finalize((finalizeErr) => {
            if (finalizeErr || errorOccurred) {
              db.run('ROLLBACK');
              return reject(finalizeErr || new Error('Failed to insert order items'));
            }

            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                db.run('ROLLBACK');
                return reject(commitErr);
              }
              resolve({ id: orderId, ...order, status: 'pending' });
            });
          });
        });
      });
    });
  },

  getOrders: (filters = {}) => {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM orders WHERE 1=1';
      const params = [];

      if (filters.status && filters.status !== 'all') {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.branch && filters.branch !== 'all') {
        sql += ' AND branch = ?';
        params.push(filters.branch);
      }
      if (filters.date) {
        sql += ' AND date(created_at) = ?';
        params.push(filters.date);
      }
      if (filters.search) {
        sql += ' AND (customer_name LIKE ? OR customer_phone LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      sql += ' ORDER BY created_at DESC';

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getOrderDetails: (orderId) => {
    return new Promise((resolve, reject) => {
      const orderSql = 'SELECT * FROM orders WHERE id = ?';
      db.get(orderSql, [orderId], (err, order) => {
        if (err) return reject(err);
        if (!order) return reject(new Error('Order not found'));

        const itemsSql = `
          SELECT oi.*, mi.name, mi.image_url, mi.category 
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE oi.order_id = ?
        `;
        db.all(itemsSql, [orderId], (err, items) => {
          if (err) return reject(err);
          order.items = items;
          resolve(order);
        });
      });
    });
  },

  updateOrderStatus: (id, status) => {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE orders SET status = ? WHERE id = ?';
      db.run(sql, [status, id], function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Order not found'));
        else resolve({ id, status });
      });
    });
  },

  // --- ANALYTICS / STATS ---
  getAdminStats: () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        const stats = {};

        // 1. Core KPIs
        db.get(`
          SELECT 
            COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0) AS totalRevenue,
            COUNT(*) AS totalOrders,
            COALESCE(AVG(CASE WHEN status != 'cancelled' THEN total_price ELSE NULL END), 0) AS avgOrderValue
          FROM orders
        `, [], (err, row) => {
          if (err) return reject(err);
          stats.totalRevenue = row.totalRevenue;
          stats.totalOrders = row.totalOrders;
          stats.avgOrderValue = Math.round(row.avgOrderValue);
        });

        db.get('SELECT COUNT(*) AS totalReservations FROM reservations', [], (err, row) => {
          if (err) return reject(err);
          stats.totalReservations = row.totalReservations;
        });

        // 2. Orders by Branch
        db.all(`
          SELECT branch, COUNT(*) AS orderCount, SUM(total_price) AS revenue 
          FROM orders 
          WHERE status != 'cancelled' 
          GROUP BY branch
        `, [], (err, rows) => {
          if (err) return reject(err);
          stats.branchStats = rows;
        });

        // 3. Sales trend (Last 7 days with data)
        db.all(`
          SELECT date(created_at) AS date, COUNT(*) AS count, SUM(total_price) AS revenue
          FROM orders
          WHERE status != 'cancelled'
          GROUP BY date(created_at)
          ORDER BY date(created_at) ASC
          LIMIT 7
        `, [], (err, rows) => {
          if (err) return reject(err);
          stats.salesTrend = rows;
        });

        // 4. Top selling items
        db.all(`
          SELECT mi.name, SUM(oi.quantity) AS totalQty, SUM(oi.quantity * oi.price) AS totalRevenue
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.status != 'cancelled'
          GROUP BY oi.menu_item_id
          ORDER BY totalQty DESC
          LIMIT 5
        `, [], (err, rows) => {
          if (err) return reject(err);
          stats.topItems = rows;
          resolve(stats);
        });
      });
    });
  }
};

module.exports = dbOperations;
