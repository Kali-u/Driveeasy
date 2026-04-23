document.addEventListener('DOMContentLoaded', async () => {
    const user = getUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    // Dashboard Elements
    const statRevenue = document.getElementById('stat-revenue');
    const statBookings = document.getElementById('stat-bookings');
    let bookingsChart = null;

    async function loadStats(month = '') {
        try {
            const url = month ? `/stats?month=${month}` : '/stats';
            const stats = await apiFetch(url);
            statRevenue.textContent = `$${stats.totalRevenue.toLocaleString()}`;
            statBookings.textContent = stats.totalBookings;

            // Chart data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const data = Array(12).fill(0);
            
            stats.monthlyBookings.forEach(m => {
                data[parseInt(m.month) - 1] = m.count;
            });

            const ctx = document.getElementById('bookingsChart').getContext('2d');
            if(bookingsChart) bookingsChart.destroy();
            
            bookingsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Bookings per Month',
                        data: data,
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Refresh data on tab click
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');

            if(target === 'manage-stats') loadStats(document.getElementById('stats-month').value);
            if(target === 'manage-cars') loadCars();
            if(target === 'manage-bookings') loadBookings();
            if(target === 'manage-users') loadUsers();
            if(target === 'manage-map') window.loadMapData();
        });
    });

    // Content Loaders
    const adminCarsBody = document.getElementById('admin-cars-body');
    const adminBookingsBody = document.getElementById('admin-bookings-body');
    const adminUsersBody = document.getElementById('admin-users-body');
    const addCarForm = document.getElementById('add-car-form');

    async function loadCars() {
        try {
            const cars = await apiFetch('/cars');
            adminCarsBody.innerHTML = cars.map(c => `
                <tr>
                    <td>#${c.id}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <img src="${c.image_url}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;">
                            <span style="font-weight: 600;">${c.brand} ${c.model} ${c.production_year ? `(${c.production_year})` : ''}</span>
                        </div>
                    </td>
                    <td>$${c.price_per_day}</td>
                    <td>
                        <span class="badge" style="background: ${c.class === 'premium' ? '#FEF3C7' : '#E0F2FE'}; color: ${c.class === 'premium' ? '#92400E' : '#0369A1'}; text-transform: uppercase; font-size: 0.7rem;">
                            ${c.class || 'ECONOMY'}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex; gap: 5px;">
                            <button onclick="openEditModal(${c.id})" class="btn btn-outline btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Edit</button>
                            <button onclick="deleteCar(${c.id})" class="btn btn-danger btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading cars:', error);
        }
    }

    async function loadBookings() {
        try {
            const bookings = await apiFetch('/bookings');
            adminBookingsBody.innerHTML = bookings.map(b => `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${b.username}</div>
                        <div style="font-size: 0.85rem; color: var(--clr-text-muted);">${b.email}</div>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span style="font-weight: 500;">${b.brand} ${b.model}</span>
                        </div>
                    </td>
                    <td style="font-size: 0.9rem;">
                        ${b.start_date} ${b.pickup_time ? `<span style="color:var(--clr-text-muted);"><i class="fa-regular fa-clock"></i> ${b.pickup_time}</span>` : '<span style="color:var(--clr-text-muted);"><i class="fa-regular fa-clock"></i> 10:00 (default)</span>'}<br>
                        <span style="color:var(--clr-text-muted); font-size: 0.8rem;">placed on ${b.created_at ? new Date(b.created_at).toLocaleDateString() : 'earlier'}</span><br>
                        <span style="color:var(--clr-text-muted);">to</span><br>${b.end_date}
                    </td>
                    <td>
                        <span class="badge ${b.status === 'active' ? 'badge-active' : 'badge-cancelled'}">
                            ${b.status.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        ${b.status === 'active' ? `
                            <button onclick="cancelBooking(${b.id})" class="btn btn-outline btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-bottom: 0.2rem; display:block; width:100%;">
                                Cancel
                            </button>
                        ` : ''}
                        <button onclick="showInvoice('${encodeURIComponent(JSON.stringify(b)).replace(/'/g, "%27")}')" class="btn btn-primary btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; display:block; width:100%;">
                            <i class="fa-solid fa-file-invoice"></i> Invoice
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    }

    async function loadUsers() {
        try {
            const users = await apiFetch('/users');
            adminUsersBody.innerHTML = users.map(u => `
                <tr>
                    <td>#${u.id}</td>
                    <td>
                        <div style="font-weight: 600;">${u.first_name || u.username} ${u.last_name || ''}</div>
                        <div style="font-size: 0.85rem; color: var(--clr-text-muted);">${u.phone || 'No Phone'}</div>
                    </td>
                    <td>
                        <div>${u.email}</div>
                        <div style="font-size: 0.85rem; color: var(--clr-text-muted);">
                            DOB: ${u.dob || 'N/A'} | DL: ${u.license_number || 'N/A'}
                        </div>
                    </td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-active' : 'badge-info'}" style="${u.role !== 'admin' ? 'background:#E0F2FE;color:#0369A1;' : ''}">${u.role.toUpperCase()}</span></td>
                    <td>
                        ${u.role !== 'admin' ? `
                            <button onclick="deleteUser(${u.id})" class="btn btn-danger btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Delete</button>
                        ` : '-'}
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    // Actions
    window.deleteCar = async (id) => {
        if(!confirm('Delete this car? This may cause issues if there are active bookings associated with it.')) return;
        try {
            await apiFetch(`/cars/${id}`, { method: 'DELETE' });
            loadCars();
        } catch (error) {
            alert('Error deleting car: ' + error.message);
        }
    };

    window.cancelBooking = async (id) => {
        if(!confirm('Cancel this user booking?')) return;
        try {
            await apiFetch(`/bookings/${id}/cancel`, { method: 'PUT' });
            loadBookings();
        } catch (error) {
            alert('Error cancelling booking: ' + error.message);
        }
    };

    window.deleteUser = async (id) => {
        if(!confirm('Are you sure you want to delete this user? All their reviews will be deleted and active bookings will be cancelled.')) return;
        try {
            await apiFetch(`/users/${id}`, { method: 'DELETE' });
            loadUsers();
            alert('User deleted successfully.');
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    };
    // Age helper
    function getAge(dateString) {
        if (!dateString) return 25;
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    window.showInvoice = (encodedData) => {
        const b = JSON.parse(decodeURIComponent(encodedData));
        const start = new Date(b.start_date);
        const end = new Date(b.end_date);
        const diffTime = Math.abs(end - start);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if(diffDays === 0) diffDays = 1;
        
        const age = getAge(b.dob);
        const isYoungDriver = age < 20;

        let baseTotal = diffDays * parseFloat(b.price_per_day);
        let youngSurcharge = isYoungDriver ? 15 * diffDays : 0;
        let total = baseTotal + youngSurcharge;
        
        let youngDriverRow = isYoungDriver ? `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 15px 0;">
                    <p style="font-weight: 600; color: #b91c1c;">Young Driver Fee</p>
                    <p style="color: #6b7280; font-size: 0.85rem;">Mandatory surcharge for under-20 divers ($15/day)</p>
                </td>
                <td style="padding: 15px 0; font-size: 0.9rem;">${b.start_date} to ${b.end_date}</td>
                <td style="padding: 15px 0; font-weight: 600; text-align: right; color:#b91c1c;">$${youngSurcharge.toLocaleString()}</td>
            </tr>
        ` : '';

        const html = `
            <div style="position: absolute; top: 20%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 10rem; color: ${b.payment_method === 'cash' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(16, 185, 129, 0.08)'}; font-weight: 900; z-index: -1; pointer-events: none;">${b.payment_method === 'cash' ? 'UNPAID' : 'PAID'}</div>
            <div style="position: relative; z-index: 1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 1rem;">
                <div>
                    <h2 style="font-weight: 800; font-size: 1.5rem; color: #111827;"><i class="fa-solid fa-car-side" style="color:var(--clr-primary);"></i> Drive<span style="color:var(--clr-primary);">Easy</span></h2>
                    <p style="color: #6b7280; font-size: 0.85rem; margin-top: 5px;">Invoice #INV-${b.id.toString().padStart(5, '0')}</p>
                </div>
                <div style="text-align:right;">
                    <p style="font-weight: 600;">DriveEasy Inc.</p>
                    <p style="color: #6b7280; font-size: 0.85rem;">123 Premium Way<br>Los Angeles, CA 90001</p>
                </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <p style="color: #6b7280; font-size: 0.85rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Billed To:</p>
                <p style="font-weight: 600; font-size: 1.1rem; margin-top: 5px;">${b.first_name || b.username} ${b.last_name || ''}</p>
                <p style="color: #6b7280; font-size: 0.9rem; margin-top: 2px;">Email: ${b.email}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
                <thead>
                    <tr style="border-bottom: 2px solid #f0f0f0; text-align: left;">
                        <th style="padding: 10px 0; color: #6b7280; font-weight: 600; font-size: 0.85rem; text-transform: uppercase;">Description</th>
                        <th style="padding: 10px 0; color: #6b7280; font-weight: 600; font-size: 0.85rem; text-transform: uppercase;">Dates</th>
                        <th style="padding: 10px 0; color: #6b7280; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 15px 0;">
                            <p style="font-weight: 600;">${b.brand} ${b.model} ${b.production_year ? `(${b.production_year})` : ''}</p>
                            <p style="color: #6b7280; font-size: 0.85rem;">Specs: ${b.engine_cc || 'N/A'}cc / ${b.engine_kw || 'N/A'}kW  | Color: ${b.color || 'Standard'}</p>
                            <p style="color: #6b7280; font-size: 0.85rem; margin-top:4px;">${diffDays} day(s) @ $${parseFloat(b.price_per_day).toLocaleString()}/day</p>
                        </td>
                        <td style="padding: 15px 0; font-size: 0.9rem;">
                            ${b.start_date} <br>to<br> ${b.end_date}
                        </td>
                        <td style="padding: 15px 0; font-weight: 600; text-align: right;">
                            $${baseTotal.toLocaleString()}
                        </td>
                    </tr>
                    ${youngDriverRow}
                </tbody>
            </table>
            
            <div style="display:flex; justify-content:flex-end; margin-bottom: 3rem;">
                <div style="min-width: 250px;">
                    <div style="display:flex; justify-content:space-between; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 10px;">
                        <span style="color: #6b7280; font-weight: 600;">Subtotal</span>
                        <span style="font-weight: 600;">$${baseTotal.toLocaleString()}</span>
                    </div>
                    ${isYoungDriver ? `
                    <div style="display:flex; justify-content:space-between; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 10px;">
                        <span style="color: #b91c1c; font-weight: 600;">Young Driver Fee</span>
                        <span style="font-weight: 600; color:#b91c1c;">+$${youngSurcharge.toLocaleString()}</span>
                    </div>
                    ` : ''}
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color: #111827; font-weight: 800; font-size: 1.1rem;">Total Due</span>
                        <span style="font-weight: 800; font-size: 1.5rem; color: var(--clr-primary);">$${total.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div style="border-top: 2px solid #f0f0f0; padding-top: 2rem; margin-top: 2rem;">
                <h3 style="font-size: 1rem; color: #374151; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.5px;">Vehicle Condition / Damage Report</h3>
                <div style="display: flex; gap: 2rem; align-items: flex-start;">
                    <div style="flex: 1; border: 1px dashed #d1d5db; border-radius: 8px; padding: 1rem; text-align: center;">
                        <svg viewBox="0 0 200 400" style="max-width: 150px; opacity: 0.4;">
                            <rect x="50" y="20" width="100" height="360" rx="40" fill="none" stroke="#000" stroke-width="4"/>
                            <rect x="55" y="80" width="90" height="50" rx="10" fill="none" stroke="#000" stroke-width="3"/>
                            <rect x="55" y="270" width="90" height="70" rx="10" fill="none" stroke="#000" stroke-width="3"/>
                            <line x1="50" y1="180" x2="150" y2="180" stroke="#000" stroke-width="2"/>
                            <line x1="50" y1="220" x2="150" y2="220" stroke="#000" stroke-width="2"/>
                            <circle cx="35" cy="70" r="10" fill="none" stroke="#000" stroke-width="4"/>
                            <circle cx="165" cy="70" r="10" fill="none" stroke="#000" stroke-width="4"/>
                            <circle cx="35" cy="330" r="10" fill="none" stroke="#000" stroke-width="4"/>
                            <circle cx="165" cy="330" r="10" fill="none" stroke="#000" stroke-width="4"/>
                        </svg>
                        <p style="font-size: 0.75rem; color: #6b7280; margin-top: 10px;">Mark damages directly on printout</p>
                    </div>
                    <div style="flex: 1.5;">
                        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 2rem; margin-bottom: 2rem;">
                            <p style="font-size: 0.85rem; color: #6b7280;">Agent Signature</p>
                        </div>
                        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 2rem;">
                            <p style="font-size: 0.85rem; color: #6b7280;">Driver Signature</p>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice #INV-${b.id.toString().padStart(5, '0')}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    :root { --clr-primary: #2563eb; }
                    body { font-family: 'Inter', sans-serif; padding: 20px; color: #111827; line-height: 1.4; font-size: 14px; }
                    @media print { 
                        .no-print { display: none !important; } 
                        body { padding: 10px; font-size: 12px; }
                        h2 { font-size: 1.2rem !important; }
                        .invoice-container { page-break-inside: avoid; }
                        svg { max-width: 100px !important; }
                        table { margin-bottom: 1rem !important; }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-container">
                    ${html}
                </div>
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: 'Inter', sans-serif;">Print Invoice</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    window.openEditModal = async (id) => {
        try {
            const car = await apiFetch(`/cars/${id}`);
            
            document.getElementById('edit-car-id').value = car.id;
            document.getElementById('edit-car-brand').value = car.brand;
            document.getElementById('edit-car-model').value = car.model;
            document.getElementById('edit-car-image-url').value = car.image_url;
            document.getElementById('edit-car-price').value = car.price_per_day;
            document.getElementById('edit-car-seats').value = car.seats;
            document.getElementById('edit-car-fuel').value = car.fuel_type;
            document.getElementById('edit-car-class').value = car.class || 'economy';
            document.getElementById('edit-car-desc').value = car.description;
            // New fields
            document.getElementById('edit-car-lat').value = car.latitude || '';
            document.getElementById('edit-car-lng').value = car.longitude || '';
            document.getElementById('edit-car-gallery').value = car.gallery_images || '[]';
            document.getElementById('edit-car-cc').value = car.engine_cc || '';
            document.getElementById('edit-car-kw').value = car.engine_kw || '';
            document.getElementById('edit-car-color').value = car.color || '';
            document.getElementById('edit-car-year').value = car.production_year || '';
            
            document.getElementById('edit-car-modal').style.display = 'flex';
        } catch (error) {
            alert('Error fetching car details: ' + error.message);
        }
    };

    // Add Car Form Submit
    addCarForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            brand: document.getElementById('car-brand').value,
            model: document.getElementById('car-model').value,
            image_url: document.getElementById('car-image-url').value,
            price_per_day: parseFloat(document.getElementById('car-price').value),
            seats: parseInt(document.getElementById('car-seats').value),
            fuel_type: document.getElementById('car-fuel').value,
            class: document.getElementById('car-class').value,
            description: document.getElementById('car-desc').value,
            latitude: parseFloat(document.getElementById('car-lat').value) || null,
            longitude: parseFloat(document.getElementById('car-lng').value) || null,
            gallery_images: document.getElementById('car-gallery').value || '[]',
            engine_cc: parseInt(document.getElementById('car-cc').value) || null,
            engine_kw: parseInt(document.getElementById('car-kw').value) || null,
            color: document.getElementById('car-color').value || null,
            production_year: parseInt(document.getElementById('car-year').value) || null
        };

        try {
            const btn = addCarForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Adding...';

            await apiFetch('/cars', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            document.getElementById('add-car-modal').style.display = 'none';
            addCarForm.reset();
            loadCars();
        } catch (error) {
            alert('Failed to add car: ' + error.message);
        } finally {
            const btn = addCarForm.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.textContent = 'Add Car';
        }
    });

    // Edit Car Form Submit
    const editCarForm = document.getElementById('edit-car-form');
    editCarForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit-car-id').value;
        const payload = {
            brand: document.getElementById('edit-car-brand').value,
            model: document.getElementById('edit-car-model').value,
            image_url: document.getElementById('edit-car-image-url').value,
            price_per_day: parseFloat(document.getElementById('edit-car-price').value),
            seats: parseInt(document.getElementById('edit-car-seats').value),
            fuel_type: document.getElementById('edit-car-fuel').value,
            class: document.getElementById('edit-car-class').value,
            description: document.getElementById('edit-car-desc').value,
            latitude: parseFloat(document.getElementById('edit-car-lat').value) || null,
            longitude: parseFloat(document.getElementById('edit-car-lng').value) || null,
            gallery_images: document.getElementById('edit-car-gallery').value || '[]',
            engine_cc: parseInt(document.getElementById('edit-car-cc').value) || null,
            engine_kw: parseInt(document.getElementById('edit-car-kw').value) || null,
            color: document.getElementById('edit-car-color').value || null,
            production_year: parseInt(document.getElementById('edit-car-year').value) || null
        };

        try {
            const btn = editCarForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Updating...';

            await apiFetch(`/cars/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            document.getElementById('edit-car-modal').style.display = 'none';
            loadCars();
            alert('Car updated successfully!');
        } catch (error) {
            alert('Failed to update car: ' + error.message);
        } finally {
            const btn = editCarForm.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.textContent = 'Update Car';
        }
    });

    let depotMap;
    let markersLayer;

    window.loadMapData = async () => {
        try {
            if (!depotMap) {
                // Initialize mapping matrix directly over Skopje
                depotMap = L.map('depot-map').setView([41.9961, 21.4316], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap - DriveEasy'
                }).addTo(depotMap);
                markersLayer = L.layerGroup().addTo(depotMap);
            }
            
            // Re-render
            setTimeout(() => depotMap.invalidateSize(), 250);
            
            // Clear prior pins
            markersLayer.clearLayers();

            const cars = await apiFetch('/cars');
            let mappedCount = 0;

            cars.forEach(car => {
                if (car.latitude && car.longitude) {
                    mappedCount++;
                    const popupHtml = `
                        <div style="text-align:center;">
                            <img src="${car.image_url}" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin-bottom:5px;">
                            <h4 style="margin:0; font-weight:700;">${car.brand} ${car.model}</h4>
                            <p style="margin:2px 0 0 0; color:#6b7280; font-size:0.8rem;">${car.engine_cc}cc | ${car.engine_kw}kW | ${car.color}</p>
                            <p style="margin:5px 0 0 0; font-weight:600; color:var(--clr-primary);">$${car.price_per_day} / day</p>
                        </div>
                    `;
                    L.marker([car.latitude, car.longitude]).addTo(markersLayer).bindPopup(popupHtml);
                }
            });
            console.log(`Successfully mapped ${mappedCount} vehicles.`);
        } catch (error) {
            console.error('Error fetching map fleet specs:', error);
        }
    };

    // Year/Month Filter change
    document.getElementById('stats-month').addEventListener('change', (e) => {
        loadStats(e.target.value);
    });

    // Initial load
    loadStats();
    loadCars();
    loadBookings();
    loadUsers();
});
