const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT,
    model TEXT,
    image_url TEXT,
    price_per_day REAL,
    seats INTEGER,
    fuel_type TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    car_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(car_id) REFERENCES cars(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    car_id INTEGER,
    rating INTEGER,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(car_id) REFERENCES cars(id)
  );
`);

// Safe migrations for new columns
try { db.exec("ALTER TABLE cars ADD COLUMN latitude REAL"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN longitude REAL"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN gallery_images TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN pickup_time TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN phone TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN dob TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN license_number TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN first_name TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN last_name TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN class TEXT DEFAULT 'economy'"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN engine_cc INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN engine_kw INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN color TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE cars ADD COLUMN production_year INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN payment_method TEXT DEFAULT 'card'"); } catch (e) {}

// Seed data
const carCount = db.prepare('SELECT COUNT(*) as count FROM cars').get().count;

if (carCount === 0) {
  const insertCar = db.prepare(`
    INSERT INTO cars (brand, model, image_url, price_per_day, seats, fuel_type, description, latitude, longitude, gallery_images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialCars = [
    ['Tesla', 'Model 3', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 120, 5, 'Electric', 'A premium electric sedan with autopilot. completely clean and ready to go.', 40.7128, -74.0060, '[]'],
    ['BMW', 'M4 Competition', 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 250, 4, 'Gasoline', 'A high performance luxury coupe.', 34.0522, -118.2437, '[]'],
    ['Audi', 'Q8', 'https://images.unsplash.com/photo-1650302796216-24e0fdebfa39?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 180, 5, 'Hybrid', 'Luxurious and spacious hybrid SUV for all your family trips.', 51.5074, -0.1278, '[]']
  ];

  const insertMany = db.transaction((cars) => {
    for (const car of cars) insertCar.run(...car);
  });
  insertMany(initialCars);
  
  // Seed admin user
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`).run('Admin', 'admin@driveeasy.com', hash, 'admin');
  console.log('Database seeded with initial cars and admin user.');
}

module.exports = db;
