document.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('loading');
  const carsGrid = document.getElementById('cars-grid');
  
  // Filter inputs
  const filterSearch = document.getElementById('filter-search');
  const filterFuel = document.getElementById('filter-fuel');
  const filterPrice = document.getElementById('filter-price');
  const priceDisplay = document.getElementById('price-display');
  const filterSeats = document.getElementById('filter-seats');
  const applyBtn = document.getElementById('apply-filters');

  // Sync price slider display
  if(filterPrice && priceDisplay) {
    filterPrice.addEventListener('input', (e) => {
      priceDisplay.textContent = e.target.value;
    });
  }

  async function loadCars() {
    loading.style.display = 'grid';
    carsGrid.style.display = 'none';

    try {
      // Build query string
      const params = new URLSearchParams();
      if (filterSearch.value) params.append('q', filterSearch.value);
      if (filterFuel.value) params.append('fuel_type', filterFuel.value);
      if (filterPrice.value) params.append('max_price', filterPrice.value);
      if (filterSeats.value) params.append('seats', filterSeats.value);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const cars = await apiFetch(`/cars${qs}`);
      
      loading.style.display = 'none';
      carsGrid.style.display = 'grid';
      
      if (cars.length === 0) {
        carsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No cars match your filters.</p>';
        return;
      }

      let html = '';
      cars.forEach(car => {
        html += `
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
        `;
      });
      carsGrid.innerHTML = html;

    } catch (error) {
      loading.style.display = 'none';
      carsGrid.style.display = 'block';
      carsGrid.innerHTML = `<p class="error-msg" style="display:block;">Error loading cars: ${error.message}</p>`;
    }
  }

  // Trigger initial load
  loadCars();

  // Bind filter button
  if(applyBtn) {
    applyBtn.addEventListener('click', loadCars);
  }
});
