const db = require('./db.js');

const ecoCars = [
  { brand: 'Toyota', model: 'Corolla', image_url: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: 45, seats: 5, fuel: 'Hybrid', desc: 'Reliable and perfectly economical for daily commuting.', class: 'economy', cc: 1798, kw: 90, color: 'Silver', year: 2022 },
  { brand: 'Renault', model: 'Clio', image_url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: 35, seats: 5, fuel: 'Gasoline', desc: 'Compact, efficient, and great for narrow city streets.', class: 'economy', cc: 999, kw: 66, color: 'Red', year: 2021 },
  { brand: 'Volkswagen', model: 'Polo', image_url: 'https://images.unsplash.com/photo-1629897048514-3dd7414bc72a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: 40, seats: 5, fuel: 'Gasoline', desc: 'A well-built, comfortable, and highly fuel-efficient hatchback.', class: 'economy', cc: 999, kw: 70, color: 'White', year: 2023 },
  { brand: 'Hyundai', model: 'i20', image_url: 'https://images.unsplash.com/photo-1678187842602-0e28f11ecf15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: 38, seats: 5, fuel: 'Gasoline', desc: 'Modern design with excellent connectivity and low running costs.', class: 'economy', cc: 1197, kw: 62, color: 'Blue', year: 2022 }
];

const insertCar = db.prepare(`
  INSERT INTO cars (brand, model, image_url, price_per_day, seats, fuel_type, description, latitude, longitude, gallery_images, class, engine_cc, engine_kw, color, production_year)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

ecoCars.forEach(c => {
  insertCar.run(c.brand, c.model, c.image_url, c.price, c.seats, c.fuel, c.desc, 40.7128, -74.0060, '[]', c.class, c.cc, c.kw, c.color, c.year);
  console.log('Inserted', c.brand, c.model);
});
console.log('Done seeding economy cars!');
