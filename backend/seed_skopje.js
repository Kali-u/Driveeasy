const db = require('./db.js');

const cars = db.prepare('SELECT id FROM cars').all();

const updateCar = db.prepare(`
  UPDATE cars SET latitude = ?, longitude = ? WHERE id = ?
`);

const SKOPJE_LAT = 41.9961;
const SKOPJE_LNG = 21.4316;

db.transaction(() => {
  for (const car of cars) {
    // Generate slight offset for display scatter mapping
    const latOffset = (Math.random() - 0.5) * 0.02; 
    const lngOffset = (Math.random() - 0.5) * 0.02;
    
    updateCar.run(SKOPJE_LAT + latOffset, SKOPJE_LNG + lngOffset, car.id);
  }
})();

console.log(`Successfully mapped ${cars.length} vehicles tightly within Skopje Centar.`);
