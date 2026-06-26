const express = require('express');
const router = express.Router();
const db = require('./db');
const sms = require('./sms');

// Authentication Helper
const getExpectedToken = () => {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  return Buffer.from(password).toString('base64');
};

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Missing authentication token.' });
  }

  const token = authHeader.split(' ')[1];
  if (token === getExpectedToken()) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden. Invalid authentication token.' });
  }
};

// Admin Login
router.post('/auth/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (password === adminPassword) {
    res.json({
      success: true,
      token: getExpectedToken()
    });
  } else {
    res.status(401).json({ error: 'Incorrect password' });
  }
});

// --- ADMIN STATS ENDPOINT ---
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

// --- REVIEWS ENDPOINTS ---
router.get('/reviews', async (req, res) => {
  try {
    const list = await db.getReviews();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

router.post('/reviews', async (req, res) => {
  try {
    const { name, rating, text } = req.body;
    if (!name || !rating || !text) {
      return res.status(400).json({ error: 'Name, rating, and text are required.' });
    }
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    const created = await db.createReview({ name: name.trim(), rating: numRating, text: text.trim() });
    res.status(201).json(created);
  } catch (err) {
    console.error('Review error:', err.message);
    res.status(500).json({ error: 'Failed to save review.' });
  }
});

// --- RESERVATIONS ENDPOINTS ---
router.post('/reservations', async (req, res) => {
  try {
    const { name, phone, date, time, guests, location } = req.body;

    if (!name || !phone || !date || !time || !guests || !location) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const numGuests = parseInt(guests, 10);
    if (isNaN(numGuests) || numGuests < 1) {
      return res.status(400).json({ error: 'Guests must be a positive number.' });
    }

    if (phone.length < 7) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      return res.status(400).json({ error: 'Cannot make reservations for past dates.' });
    }

    const newReservation = {
      name: name.trim(),
      phone: phone.trim(),
      date,
      time,
      guests: numGuests,
      location: location.trim()
    };

    const savedReservation = await db.createReservation(newReservation);
    
    // Send SMS confirmation
    const smsMsg = `Hi ${savedReservation.name}, your reservation for ${savedReservation.guests} at Kebabistan on ${savedReservation.date} at ${savedReservation.time} is confirmed!`;
    await sms.sendSMS(savedReservation.phone, smsMsg).catch(console.error);

    res.status(201).json(savedReservation);
  } catch (err) {
    console.error('Reservation error:', err.message);
    res.status(500).json({ error: 'Failed to save reservation.' });
  }
});

router.get('/reservations', requireAdmin, async (req, res) => {
  try {
    const { status, date, location, search } = req.query;
    const list = await db.getReservations({ status, date, location, search });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
});

router.patch('/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await db.updateReservationStatus(id, status);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reservation status.' });
  }
});

router.delete('/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteReservation(id);
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete reservation.' });
  }
});

// --- MENU ITEM ENDPOINTS ---
router.get('/menu', async (req, res) => {
  try {
    // Public route: defaults to available items only. Admins can request includeUnavailable
    const includeUnavailable = req.query.admin === 'true';
    const list = await db.getMenuItems(includeUnavailable);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
});

router.post('/menu', requireAdmin, async (req, res) => {
  try {
    const { name, description, price, image_url, category } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required.' });
    }
    const created = await db.createMenuItem({ name, description, price: parseFloat(price), image_url, category });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add menu item.' });
  }
});

router.patch('/menu/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { available, price } = req.body;

    if (available !== undefined) {
      const updated = await db.updateMenuItemAvailability(id, parseInt(available, 10));
      return res.json(updated);
    }

    if (price !== undefined) {
      const updated = await db.updateMenuItemPrice(id, parseFloat(price));
      return res.json(updated);
    }

    res.status(400).json({ error: 'Nothing to update.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
});

// --- ORDERS ENDPOINTS ---
router.post('/orders', async (req, res) => {
  try {
    const { customer_name, customer_phone, type, address, branch, items } = req.body;

    // Validation
    if (!customer_name || !customer_phone || !type || !branch || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order details.' });
    }

    if (type === 'delivery' && !address) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
    }

    // Verify prices and availability from DB
    const menuItems = await db.getMenuItems(true);
    const menuMap = {};
    menuItems.forEach(item => {
      menuMap[item.id] = item;
    });

    let calculatedTotal = 0;
    const orderItems = [];

    for (const orderItem of items) {
      const dbItem = menuMap[orderItem.menu_item_id];
      if (!dbItem) {
        return res.status(400).json({ error: `Menu item with ID ${orderItem.menu_item_id} not found.` });
      }
      if (dbItem.available === 0) {
        return res.status(400).json({ error: `Item "${dbItem.name}" is currently out of stock.` });
      }

      const qty = parseInt(orderItem.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity for item "${dbItem.name}".` });
      }

      calculatedTotal += dbItem.price * qty;
      orderItems.push({
        menu_item_id: dbItem.id,
        quantity: qty,
        price: dbItem.price
      });
    }

    // Add flat delivery fee
    const deliveryFee = type === 'delivery' ? 150 : 0;
    calculatedTotal += deliveryFee;

    const newOrder = {
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      type,
      address: type === 'delivery' ? address.trim() : null,
      branch: branch.trim(),
      total_price: calculatedTotal
    };

    const savedOrder = await db.createOrder(newOrder, orderItems);
    
    // Send SMS confirmation
    const smsMsg = `Hi ${savedOrder.customer_name}, your order at Kebabistan is confirmed! Total: Rs.${savedOrder.total_price}. Type: ${savedOrder.type}.`;
    await sms.sendSMS(savedOrder.customer_phone, smsMsg).catch(console.error);

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Order submission error:', err.message);
    res.status(500).json({ error: 'Failed to place order.' });
  }
});

router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { status, branch, date, search } = req.query;
    const list = await db.getOrders({ status, branch, date, search });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

router.get('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const details = await db.getOrderDetails(id);
    res.json(details);
  } catch (err) {
    console.error('Fetch order details error:', err.message);
    if (err.message === 'Order not found') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Failed to load order details.' });
    }
  }
});

router.patch('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }
    const updated = await db.updateOrderStatus(id, status);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// --- ADMIN STATS ENDPOINT ---
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Failed to generate metrics.' });
  }
});

module.exports = router;
