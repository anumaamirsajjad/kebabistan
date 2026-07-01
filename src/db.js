const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to PostgreSQL database');
  initDb();
  release();
});

// Initialize database schema
async function initDb() {
  try {
    // 1. Reservations Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        guests INTEGER NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS email TEXT');

    // 2. Menu Items Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        image_url TEXT,
        category TEXT NOT NULL,
        available INTEGER DEFAULT 1
      )
    `);
    await seedMenuItems();

    // 3. Orders Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        type TEXT NOT NULL,
        address TEXT,
        branch TEXT NOT NULL,
        total_price NUMERIC NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT');

    // 4. Order Items Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
        quantity INTEGER NOT NULL,
        price NUMERIC NOT NULL
      )
    `);

    // 5. Reviews Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT,
        rating INTEGER NOT NULL,
        text TEXT NOT NULL,
        image_url TEXT,
        status TEXT DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await seedReviews();

  } catch (err) {
    console.error('Error initializing DB schema:', err);
  }
}

async function seedReviews() {
  try {
    const res = await pool.query('SELECT COUNT(*) AS count FROM reviews');
    if (parseInt(res.rows[0].count) === 0) {
      const defaultReviews = [
        ['Hira Khan', 'Food Blogger', 5, 'The seekh kebabs here are unmatched — smoky, juicy, and full of flavor. The ambience makes it perfect for family dinners.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'],
        ['Ahmed Raza', 'Regular Guest', 5, 'Best BBQ platter in the city, hands down. The staff are warm and the service is incredibly fast even on busy nights.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'],
        ['Sara Malik', 'Event Planner', 5, 'We hosted a private dinner here and it was flawless. The shawarma wraps and biryani were the highlight of the night.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80']
      ];
      
      for (const review of defaultReviews) {
        await pool.query(`
          INSERT INTO reviews (name, role, rating, text, image_url, status)
          VALUES ($1, $2, $3, $4, $5, 'approved')
        `, review);
      }
    }
  } catch (err) {
    console.error('Error seeding reviews:', err);
  }
}

async function seedMenuItems() {
  try {
    const res = await pool.query('SELECT COUNT(*) AS count FROM menu_items');
    if (parseInt(res.rows[0].count) === 0) {
      console.log('Seeding default menu items...');
      const defaultItems = [
        ['Sizzling Beef Seekh', 'Char-grilled minced beef kebabs, slow-marinated in our house spice blend and cooked over open coals.', 850, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=500&q=80', 'Seekh & Tikka'],
        ['Murgh Tikka Skewers', 'Tender chicken breast chunks marinated in tandoori spices and strained yogurt, grilled to perfection.', 750, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80', 'Seekh & Tikka'],
        ['Kebabistan Special Platter', 'A feast for sharing: 4 seekh kebabs, 4 chicken tikka skewers, and 2 flame-grilled lamb chops. Served with fresh naan and chutneys.', 2850, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=80', 'BBQ Platters'],
        ['Family Flame Feast', 'Our ultimate platter with assorted kebabs, rotisserie lamb pieces, roasted vegetables, and saffron rice.', 4950, 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=500&q=80', 'BBQ Platters'],
        ['Flame-Grilled Shawarma', 'Tender shaved rotisserie chicken, rolled in warm pita bread with pickled cucumbers and garlic toum sauce.', 450, 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=500&q=80', 'Shawarma & Wraps'],
        ['Spicy Lamb Wrap', 'Flame-roasted spiced lamb shoulder shredded and wrapped with chopped red onions, mint, and fire chilli sauce.', 650, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80', 'Shawarma & Wraps'],
        ['Dum Biryani (Chicken)', 'Aromatic long-grain basmati rice, layered with spiced chicken masala, fried onions, and fresh mint, slow-cooked in a sealed pot.', 790, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=500&q=80', 'Biryani & Rice'],
        ['Saffron Pilaf Rice', 'Basmati rice steamed with real saffron, cardamom, cloves, and garnished with toasted almonds and raisins.', 350, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=500&q=80', 'Biryani & Rice']
      ];
      
      for (const item of defaultItems) {
        await pool.query(`
          INSERT INTO menu_items (name, description, price, image_url, category, available)
          VALUES ($1, $2, $3, $4, $5, 1)
        `, item);
      }
      console.log('Successfully seeded menu items.');
    }
  } catch (err) {
    console.error('Error seeding menu items:', err);
  }
}

// Wrapper database functions returning promises
const dbOperations = {
  getAdminStats: async () => {
    const stats = {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      totalReservations: 0,
      salesTrend: [],
      branchStats: [],
      topItems: []
    };

    try {
      const coreKpi = await pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0) AS "totalRevenue",
          COUNT(*) AS "totalOrders",
          COALESCE(AVG(CASE WHEN status != 'cancelled' THEN total_price ELSE NULL END), 0) AS "avgOrderValue"
        FROM orders
      `);
      if (coreKpi.rows.length > 0) {
        stats.totalRevenue = parseFloat(coreKpi.rows[0].totalRevenue);
        stats.totalOrders = parseInt(coreKpi.rows[0].totalOrders);
        stats.avgOrderValue = Math.round(parseFloat(coreKpi.rows[0].avgOrderValue));
      }

      const resvQuery = await pool.query("SELECT COUNT(*) AS count FROM reservations WHERE status != 'cancelled'");
      if (resvQuery.rows.length > 0) {
        stats.totalReservations = parseInt(resvQuery.rows[0].count);
      }

      const salesTrendQuery = await pool.query(`
        SELECT DATE(created_at) as date, SUM(total_price) as revenue 
        FROM orders 
        WHERE status != 'cancelled' 
        GROUP BY DATE(created_at) 
        ORDER BY date ASC 
        LIMIT 7
      `);
      stats.salesTrend = salesTrendQuery.rows;

      const branchStatsQuery = await pool.query(`
        SELECT branch, SUM(total_price) as revenue 
        FROM orders 
        WHERE status != 'cancelled' 
        GROUP BY branch
      `);
      stats.branchStats = branchStatsQuery.rows;

      const topItemsQuery = await pool.query(`
        SELECT m.name, SUM(oi.quantity) as "totalQty"
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE o.status != 'cancelled'
        GROUP BY m.name
        ORDER BY "totalQty" DESC
        LIMIT 5
      `);
      stats.topItems = topItemsQuery.rows;
    } catch (e) {
      console.error(e);
      throw e;
    }

    return stats;
  },

  getReviews: async () => {
    const res = await pool.query("SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC");
    return res.rows;
  },

  createReview: async (review) => {
    const { name, rating, text } = review;
    const image_url = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80';
    const role = 'Guest';
    const res = await pool.query(`
      INSERT INTO reviews (name, role, rating, text, image_url, status)
      VALUES ($1, $2, $3, $4, $5, 'approved')
      RETURNING id
    `, [name, role, rating, text, image_url]);
    return { id: res.rows[0].id, name, role, rating, text, image_url, status: 'approved' };
  },

  createReservation: async (reservation) => {
    const { name, phone, email, date, time, guests, location } = reservation;
    const res = await pool.query(`
      INSERT INTO reservations (name, phone, email, date, time, guests, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING id
    `, [name, phone, email, date, time, guests, location]);
    return { id: res.rows[0].id, ...reservation, status: 'pending' };
  },

  getReservations: async (filters = {}) => {
    let sql = 'SELECT * FROM reservations WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.status && filters.status !== 'all') {
      sql += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.location && filters.location !== 'all') {
      sql += ` AND location = $${paramIndex++}`;
      params.push(filters.location);
    }
    if (filters.date) {
      sql += ` AND date = $${paramIndex++}`;
      params.push(filters.date);
    }
    if (filters.search) {
      sql += ` AND (name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex + 1})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      paramIndex += 2;
    }

    sql += ' ORDER BY date ASC, time ASC';
    const res = await pool.query(sql, params);
    return res.rows;
  },

  updateReservationStatus: async (id, status) => {
    const res = await pool.query('UPDATE reservations SET status = $1 WHERE id = $2', [status, id]);
    if (res.rowCount === 0) throw new Error('Reservation not found');
    return { id, status };
  },

  deleteReservation: async (id) => {
    const res = await pool.query('DELETE FROM reservations WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new Error('Reservation not found');
    return { id, deleted: true };
  },

  getMenuItems: async (includeUnavailable = true) => {
    let sql = 'SELECT * FROM menu_items';
    if (!includeUnavailable) {
      sql += ' WHERE available = 1';
    }
    const res = await pool.query(sql);
    return res.rows;
  },

  createMenuItem: async (item) => {
    const { name, description, price, image_url, category } = item;
    const res = await pool.query(`
      INSERT INTO menu_items (name, description, price, image_url, category, available)
      VALUES ($1, $2, $3, $4, $5, 1)
      RETURNING id
    `, [name, description, price, image_url, category]);
    return { id: res.rows[0].id, ...item, available: 1 };
  },

  updateMenuItemAvailability: async (id, available) => {
    const res = await pool.query('UPDATE menu_items SET available = $1 WHERE id = $2', [available, id]);
    if (res.rowCount === 0) throw new Error('Menu item not found');
    return { id, available };
  },

  updateMenuItemPrice: async (id, price) => {
    const res = await pool.query('UPDATE menu_items SET price = $1 WHERE id = $2', [price, id]);
    if (res.rowCount === 0) throw new Error('Menu item not found');
    return { id, price };
  },

  createOrder: async (order, items) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { customer_name, customer_phone, customer_email, type, address, branch, total_price } = order;
      
      const orderRes = await client.query(`
        INSERT INTO orders (customer_name, customer_phone, customer_email, type, address, branch, total_price, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING id
      `, [customer_name, customer_phone, customer_email, type, address, branch, total_price]);
      
      const orderId = orderRes.rows[0].id;
      
      for (const item of items) {
        await client.query(`
          INSERT INTO order_items (order_id, menu_item_id, quantity, price)
          VALUES ($1, $2, $3, $4)
        `, [orderId, item.menu_item_id, item.quantity, item.price]);
      }
      
      await client.query('COMMIT');
      return { id: orderId, ...order, status: 'pending' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  getOrders: async (filters = {}) => {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.status && filters.status !== 'all') {
      sql += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.branch && filters.branch !== 'all') {
      sql += ` AND branch = $${paramIndex++}`;
      params.push(filters.branch);
    }
    if (filters.date) {
      sql += ` AND date(created_at) = $${paramIndex++}`;
      params.push(filters.date);
    }
    if (filters.search) {
      sql += ` AND (customer_name ILIKE $${paramIndex} OR customer_phone ILIKE $${paramIndex + 1})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      paramIndex += 2;
    }

    sql += ' ORDER BY created_at DESC';
    const res = await pool.query(sql, params);
    return res.rows;
  },

  getOrderDetails: async (orderId) => {
    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) throw new Error('Order not found');
    const order = orderRes.rows[0];

    const itemsRes = await pool.query(`
      SELECT oi.*, mi.name, mi.image_url, mi.category 
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
    `, [orderId]);
    
    order.items = itemsRes.rows;
    return order;
  },

  updateOrderStatus: async (id, status) => {
    const res = await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    if (res.rowCount === 0) throw new Error('Order not found');
    return { id, status };
  },

  testConnection: async () => {
    const res = await pool.query('SELECT 1 AS ok');
    return res.rows[0];
  }
};

module.exports = dbOperations;
