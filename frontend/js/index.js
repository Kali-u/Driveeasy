document.addEventListener('DOMContentLoaded', async () => {
    const featuredGrid = document.getElementById('featured-cars-grid');

    // Load Featured Fleet
    try {
        const cars = await apiFetch('/cars');
        
        if (cars.length === 0) {
            featuredGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">Check back soon for new arrivals!</p>';
            return;
        }

        // Only show first 3 cars as 'featured'
        const featured = cars.slice(0, 3);
        
        featuredGrid.innerHTML = featured.map(car => `
            <a href="car-detail.html?id=${car.id}" class="car-card">
              <div class="car-image">
                <img src="${car.image_url}" alt="${car.brand} ${car.model}">
                <div class="car-price-badge">$${car.price_per_day} / day</div>
              </div>
              <div class="car-details">
                <h3 class="car-title">${car.brand} ${car.model} ${car.production_year ? `(${car.production_year})` : ''}</h3>
                <div class="car-specs" style="display:flex; flex-wrap:wrap; gap: 8px;">
                  <span><i class="fa-solid fa-users"></i> ${car.seats} Seats</span>
                  <span><i class="fa-solid fa-gas-pump"></i> ${car.fuel_type}</span>
                  ${car.engine_cc ? `<span><i class="fa-solid fa-gauge-high"></i> ${car.engine_cc}cc</span>` : ''}
                  ${car.engine_kw ? `<span><i class="fa-solid fa-bolt"></i> ${car.engine_kw}kW</span>` : ''}
                  ${car.color ? `<span><i class="fa-solid fa-palette"></i> ${car.color}</span>` : ''}
                </div>
                <p style="color: var(--clr-text-muted); font-size: 0.9rem; flex-grow: 1;">
                  ${car.description.substring(0, 80)}...
                </p>
                <div style="margin-top: 1rem;">
                  <span class="btn btn-outline" style="width: 100%;">View Details</span>
                </div>
              </div>
            </a>
        `).join('');

    } catch (error) {
        console.error('Error loading featured cars:', error);
        featuredGrid.innerHTML = '<p class="error-msg" style="display:block; grid-column: 1/-1;">Unable to load featured cars.</p>';
    }
});
