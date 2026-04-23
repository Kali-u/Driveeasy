const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_key_123';

app.use(cors());
app.use(express.json());

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- Auth Routes ---
app.post('/api/auth/register', (req, res) => {
  const { first_name, last_name, email, password, phone, dob, license_number } = req.body;
  if (!first_name || !last_name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

  // Generate an internal username backward compatible string
  const username = `${first_name.toLowerCase()}.${last_name.toLowerCase()}${Math.floor(Math.random() * 100)}`;

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, phone, dob, license_number, first_name, last_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, email, passwordHash, phone || null, dob || null, license_number || null, first_name, last_name);
    
    const token = jwt.sign({ id: result.lastInsertRowid, username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, username, role: 'user', dob } });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, dob: user.dob } });
});

app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { username, password } = req.body;
  const userId = req.user.id;

  try {
    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?').run(username, passwordHash, userId);
    } else {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
    }
    
    res.json({ message: 'Profile updated successfully', username });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// --- User Admin Routes ---
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, role, phone, dob, license_number FROM users ORDER BY id DESC').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userIdToDelete = req.params.id;

  try {
    // Cannot delete yourself
    if (userIdToDelete == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    const checkUser = db.prepare('SELECT role FROM users WHERE id = ?').get(userIdToDelete);
    if (!checkUser) return res.status(404).json({ error: 'User not found' });
    if (checkUser.role === 'admin') return res.status(400).json({ error: 'Cannot delete another admin' });

    // Safe cascading deletion wrapped in transaction
    const deleteUserTransaction = db.transaction((id) => {
      db.prepare("DELETE FROM bookings WHERE user_id = ?").run(id);
      db.prepare('DELETE FROM reviews WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    });
    deleteUserTransaction(userIdToDelete);

    res.json({ message: 'User cleanly deleted and active bookings cancelled.' });
  } catch (error) {
    console.error("Deletion error:", error);
    res.status(500).json({ error: 'Failed to delete user: ' + error.message });
  }
});

// --- Car Routes ---
app.get('/api/cars', (req, res) => {
  const { q, fuel_type, max_price, seats, class: carClass } = req.query;
  let query = 'SELECT * FROM cars WHERE 1=1';
  let params = [];

  if (q) {
    query += ' AND (brand LIKE ? OR model LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (fuel_type) {
    query += ' AND fuel_type = ?';
    params.push(fuel_type);
  }
  if (carClass) {
    query += ' AND class = ?';
    params.push(carClass);
  }
  if (max_price) {
    query += ' AND price_per_day <= ?';
    params.push(max_price);
  }
  if (seats) {
    query += ' AND seats >= ?';
    params.push(seats);
  }

  try {
    const cars = db.prepare(query).all(...params);
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

app.get('/api/cars/:id', (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Car not found' });
  res.json(car);
});

app.post('/api/cars', authenticateToken, requireAdmin, (req, res) => {
  const { brand, model, image_url, price_per_day, seats, fuel_type, description, latitude, longitude, gallery_images, engine_cc, engine_kw, color, production_year } = req.body;
  const carClass = req.body.class || 'economy';
  
  try {
    const result = db.prepare(`
      INSERT INTO cars (brand, model, image_url, price_per_day, seats, fuel_type, description, latitude, longitude, gallery_images, class, engine_cc, engine_kw, color, production_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(brand, model, image_url, price_per_day, seats, fuel_type, description, latitude, longitude, gallery_images, carClass, engine_cc || null, engine_kw || null, color || null, production_year || null);
    
    res.status(201).json({ id: result.lastInsertRowid, ...req.body, class: carClass });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add car' });
  }
});

app.put('/api/cars/:id', authenticateToken, requireAdmin, (req, res) => {
  const { brand, model, image_url, price_per_day, seats, fuel_type, description, latitude, longitude, gallery_images, engine_cc, engine_kw, color, production_year } = req.body;
  const carClass = req.body.class || 'economy';
  const id = req.params.id;

  try {
    db.prepare(`
      UPDATE cars
      SET brand = ?, model = ?, image_url = ?, price_per_day = ?, seats = ?, fuel_type = ?, description = ?, latitude = ?, longitude = ?, gallery_images = ?, class = ?, engine_cc = ?, engine_kw = ?, color = ?, production_year = ?
      WHERE id = ?
    `).run(brand, model, image_url, price_per_day, seats, fuel_type, description, latitude, longitude, gallery_images, carClass, engine_cc || null, engine_kw || null, color || null, production_year || null, id);
    
    res.json({ message: 'Car updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update car' });
  }
});

app.delete('/api/cars/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    // Remove dependencies first to prevent constraint fail
    db.prepare('DELETE FROM reviews WHERE car_id = ?').run(id);
    db.prepare('DELETE FROM bookings WHERE car_id = ?').run(id);
    db.prepare('DELETE FROM cars WHERE id = ?').run(id);
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// --- Review Routes ---
app.get('/api/cars/:id/reviews', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.username 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.car_id = ? 
      ORDER BY r.created_at DESC
    `).all(req.params.id);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/reviews', authenticateToken, (req, res) => {
  const { car_id, rating, comment } = req.body;
  const user_id = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO reviews (user_id, car_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `).run(user_id, car_id, rating, comment);
    
    res.status(201).json({ message: 'Review added', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});


// --- Booking Routes ---
app.get('/api/cars/:id/booked-dates', (req, res) => {
  const bookings = db.prepare(`
    SELECT start_date, end_date FROM bookings 
    WHERE car_id = ? AND status = 'active'
  `).all(req.params.id);
  res.json(bookings);
});

app.post('/api/bookings', authenticateToken, (req, res) => {
  const { car_id, start_date, end_date, pickup_time, payment_method } = req.body;
  const user_id = req.user.id;

  try {
    // Check for overlap slightly simplified for MVP, ideally should check accurate dates
    const overlap = db.prepare(`
      SELECT id FROM bookings
      WHERE car_id = ? AND status = 'active'
        AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))
    `).get(car_id, end_date, start_date, start_date, start_date, start_date, end_date);

    if (overlap) {
      return res.status(400).json({ error: 'Dates overlap with an existing booking' });
    }

    const result = db.prepare(`
      INSERT INTO bookings (user_id, car_id, start_date, end_date, pickup_time, payment_method)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id, car_id, start_date, end_date, pickup_time, payment_method || 'card');
    
    res.status(201).json({ message: 'Booking created', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.get('/api/bookings', authenticateToken, (req, res) => {
  // If user is admin, return all bookings. Otherwise, return user's bookings.
  let query;
  let params = [];
  
  if (req.user.role === 'admin') {
    query = `
      SELECT b.*, c.brand, c.model, c.image_url, c.price_per_day, c.engine_cc, c.engine_kw, c.color, u.username, u.email, u.first_name, u.last_name, u.dob 
      FROM bookings b 
      JOIN cars c ON b.car_id = c.id 
      JOIN users u ON b.user_id = u.id
      ORDER BY b.id DESC
    `;
  } else {
    query = `
      SELECT b.*, c.brand, c.model, c.image_url, c.price_per_day, c.engine_cc, c.engine_kw, c.color 
      FROM bookings b 
      JOIN cars c ON b.car_id = c.id 
      WHERE b.user_id = ?
      ORDER BY b.id DESC
    `;
    params.push(req.user.id);
  }
  
  const bookings = db.prepare(query).all(...params);
  res.json(bookings);
});

app.put('/api/bookings/:id/cancel', authenticateToken, (req, res) => {
  const bookingId = req.params.id;
  
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    // Only admin or the booking owner can cancel
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
    }

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

app.put('/api/bookings/:id', authenticateToken, (req, res) => {
  const { start_date, end_date, pickup_time } = req.body;
  const bookingId = req.params.id;

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to modify this booking' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({ error: 'Only active bookings can be modified' });
    }

    // Check for overlap (excluding current booking)
    const overlap = db.prepare(`
      SELECT id FROM bookings
      WHERE car_id = ? AND status = 'active' AND id != ?
        AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))
    `).get(booking.car_id, bookingId, end_date, start_date, start_date, start_date, start_date, end_date);

    if (overlap) {
      return res.status(400).json({ error: 'New dates overlap with an existing booking' });
    }

    db.prepare(`
      UPDATE bookings 
      SET start_date = ?, end_date = ?, pickup_time = ? 
      WHERE id = ?
    `).run(start_date, end_date, pickup_time, bookingId);

    res.json({ message: 'Booking updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// --- Stats Routes ---
app.get('/api/stats', authenticateToken, requireAdmin, (req, res) => {
  const { month, year } = req.query;
  const currentYear = year || new Date().getFullYear().toString();
  
  try {
    let bookingsQuery = `
      SELECT b.start_date, b.end_date, c.price_per_day 
      FROM bookings b 
      JOIN cars c ON b.car_id = c.id 
      WHERE b.status != 'cancelled'
    `;
    let params = [];

    if (month) {
      bookingsQuery += " AND strftime('%m', b.start_date) = ? AND strftime('%Y', b.start_date) = ?";
      params.push(month.padStart(2, '0'), currentYear);
    } else {
      bookingsQuery += " AND strftime('%Y', b.start_date) = ?";
      params.push(currentYear);
    }

    const bookings = db.prepare(bookingsQuery).all(...params);
    const totalBookings = bookings.length;
    
    let totalRevenue = 0;
    bookings.forEach(b => {
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const days = diffDays <= 0 ? 1 : diffDays;
      totalRevenue += days * b.price_per_day;
    });

    // Monthly trends for the selected year
    const monthlyBookings = db.prepare(`
      SELECT strftime('%m', start_date) as month, COUNT(*) as count 
      FROM bookings 
      WHERE strftime('%Y', start_date) = ? 
      GROUP BY month
    `).all(currentYear);

    res.json({ totalBookings, totalRevenue, monthlyBookings });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(PORT, () => {
  console.log(`DriveEasy API running on http://localhost:${PORT}`);
});
