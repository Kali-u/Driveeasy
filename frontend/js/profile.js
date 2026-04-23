document.addEventListener('DOMContentLoaded', async () => {
    if (!getUser()) {
        window.location.href = 'login.html';
        return;
    }

    const loading = document.getElementById('profile-loading');
    const container = document.getElementById('bookings-container');
    const tbody = document.getElementById('bookings-body');
    const noBookings = document.getElementById('no-bookings');

    // Tab Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.style.display = 'none');
            
            btn.classList.add('active');
            document.getElementById(target).style.display = 'block';

            if(target === 'bookings-tab' || target === 'history-tab') loadBookings();
        });
    });

    // Settings logic
    const settingsForm = document.getElementById('settings-form');
    const usernameInput = document.getElementById('settings-username');
    const passwordInput = document.getElementById('settings-password');
    
    // Pre-fill username
    const currentUser = getUser();
    if(currentUser && usernameInput) {
        usernameInput.value = currentUser.username;
    }

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = settingsForm.querySelector('button');
        
        try {
            btn.disabled = true;
            btn.textContent = 'Updating...';

            const payload = {
                username: usernameInput.value
            };
            if(passwordInput.value) {
                payload.password = passwordInput.value;
            }

            const response = await apiFetch('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            // Update local storage
            const updatedUser = { ...currentUser, username: response.username };
            localStorage.setItem('driveeasy_user', JSON.stringify(updatedUser));
            
            alert('Profile updated successfully!');
            passwordInput.value = '';
            
            // Refresh navbar username if needed
            window.location.reload(); 
        } catch (error) {
            alert('Update failed: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Update Profile';
        }
    });

    async function loadBookings() {
        try {
            loading.style.display = 'block';
            container.style.display = 'none';
            noBookings.style.display = 'none';

            const bookings = await apiFetch('/bookings');
            loading.style.display = 'none';
            container.style.display = 'block';

            const activeBookings = bookings.filter(b => b.status === 'active' || (new Date(b.end_date) >= new Date() && b.status !== 'cancelled'));
            const pastBookings = bookings.filter(b => b.status === 'cancelled' || new Date(b.end_date) < new Date());

            // Render Active
            if (activeBookings.length === 0) {
                noBookings.style.display = 'block';
                tbody.innerHTML = '';
            } else {
                noBookings.style.display = 'none';
                tbody.innerHTML = activeBookings.map(b => `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap: 10px;">
                                <img src="${b.image_url}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;">
                                <span style="font-weight: 600;">${b.brand} ${b.model} ${b.production_year ? `(${b.production_year})` : ''}</span>
                            </div>
                        </td>
                        <td>
                            ${b.start_date}
                            ${b.pickup_time ? `<br><small style="color:var(--clr-text-muted);"><i class="fa-regular fa-clock"></i> ${b.pickup_time}</small>` : '<br><small style="color:var(--clr-text-muted);"><i class="fa-regular fa-clock"></i> 10:00 (default)</small>'}
                        </td>
                        <td>${b.end_date}</td>
                        <td>
                            <span class="badge badge-active">ACTIVE</span>
                        </td>
                        <td>
                            <div style="display:flex; gap: 5px;">
                                <button onclick="openEditBooking(${b.id}, '${b.start_date}', '${b.end_date}', '${b.pickup_time}')" class="btn btn-outline btn-sm">Edit</button>
                                <button onclick="cancelBooking(${b.id})" class="btn btn-danger btn-sm">Cancel</button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }

            // Render History
            const historyBody = document.getElementById('history-body');
            if (historyBody) {
                if (pastBookings.length === 0) {
                    historyBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--clr-text-muted);">No history found.</td></tr>';
                } else {
                    historyBody.innerHTML = pastBookings.map(b => `
                        <tr>
                            <td>
                                <div style="display:flex; align-items:center; gap: 10px;">
                                    <img src="${b.image_url}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;">
                                    <span style="font-weight: 600;">${b.brand} ${b.model} ${b.production_year ? `(${b.production_year})` : ''}</span>
                                </div>
                            </td>
                            <td>${b.start_date} to ${b.end_date}</td>
                            <td>
                                <span class="badge ${b.status === 'active' ? 'badge-active' : 'badge-cancelled'}">
                                    ${b.status.toUpperCase()}
                                </span>
                            </td>
                            <td>
                                <button onclick="showInvoice('${encodeURIComponent(JSON.stringify(b)).replace(/'/g, "%27")}')" class="btn btn-outline btn-sm">Receipt</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }

        } catch (error) {
            loading.innerHTML = `<p class="error-msg" style="display:block;">Error: ${error.message}</p>`;
        }
    }

    window.cancelBooking = async (id) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            await apiFetch(`/bookings/${id}/cancel`, { method: 'PUT' });
            alert('Booking cancelled successfully.');
            loadBookings();
        } catch (error) {
            alert('Failed to cancel booking: ' + error.message);
        }
    };

    // Edit Booking Logic
    let editPicker = null;
    window.openEditBooking = (id, start, end, time) => {
        document.getElementById('edit-booking-id').value = id;
        document.getElementById('edit-pickup-time').value = time;
        
        if (editPicker) editPicker.destroy();
        editPicker = flatpickr("#edit-date-range", {
            mode: "range",
            defaultDate: [start, end],
            dateFormat: "Y-m-d"
        });

        flatpickr("#edit-pickup-time", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            defaultDate: time
        });

        document.getElementById('edit-booking-modal').style.display = 'flex';
    };

    document.getElementById('edit-booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-booking-id').value;
        const dates = editPicker.selectedDates;
        
        if (dates.length !== 2) {
            alert('Please select a valid date range.');
            return;
        }

        const payload = {
            start_date: flatpickr.formatDate(dates[0], "Y-m-d"),
            end_date: flatpickr.formatDate(dates[1], "Y-m-d"),
            pickup_time: document.getElementById('edit-pickup-time').value
        };

        try {
            await apiFetch(`/bookings/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            document.getElementById('edit-booking-modal').style.display = 'none';
            alert('Booking updated successfully!');
            loadBookings();
        } catch (error) {
            alert('Update failed: ' + error.message);
        }
    });

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
        const booking = JSON.parse(decodeURIComponent(encodedData));
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
        
        const age = getAge(getUser().dob);
        const isYoungDriver = age < 20;

        let baseTotal = diffDays * (booking.price_per_day || 120);
        let youngSurcharge = isYoungDriver ? 15 * diffDays : 0;
        let total = baseTotal + youngSurcharge;

        let youngDriverRow = isYoungDriver ? `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 15px 0;">
                    <p style="font-weight: 600; color: #b91c1c;">Young Driver Fee</p>
                    <p style="color: #6b7280; font-size: 0.85rem;">Mandatory surcharge for under-20 divers ($15/day)</p>
                </td>
                <td style="padding: 15px 0; font-size: 0.9rem;">${booking.start_date} to ${booking.end_date}</td>
                <td style="padding: 15px 0; font-weight: 600; text-align: right; color:#b91c1c;">$${youngSurcharge.toLocaleString()}</td>
            </tr>
        ` : '';

        const content = `
            <div style="position: absolute; top: 20%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 10rem; color: ${booking.payment_method === 'cash' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(16, 185, 129, 0.08)'}; font-weight: 900; z-index: -1; pointer-events: none;">${booking.payment_method === 'cash' ? 'UNPAID' : 'PAID'}</div>
            <div style="position: relative; z-index: 1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 1rem;">
                <div>
                    <h2 style="font-weight: 800; font-size: 1.5rem; color: #111827;"><i class="fa-solid fa-car-side" style="color:var(--clr-primary);"></i> Drive<span style="color:var(--clr-primary);">Easy</span></h2>
                    <p style="color: #6b7280; font-size: 0.85rem; margin-top: 5px;">Invoice #INV-${booking.id.toString().padStart(5, '0')}</p>
                </div>
                <div style="text-align:right;">
                    <p style="font-weight: 600;">DriveEasy Inc.</p>
                    <p style="color: #6b7280; font-size: 0.85rem;">123 Premium Way<br>Los Angeles, CA 90001</p>
                </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <p style="color: #6b7280; font-size: 0.85rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Billed To:</p>
                <p style="font-weight: 600; font-size: 1.1rem; margin-top: 5px;">${getUser().first_name || getUser().username} ${getUser().last_name || ''}</p>
                <p style="color: #6b7280; font-size: 0.9rem; margin-top: 2px;">Email: ${getUser().email}</p>
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
                            <p style="font-weight: 600;">${booking.brand} ${booking.model} ${booking.production_year ? `(${booking.production_year})` : ''}</p>
                            <p style="color: #6b7280; font-size: 0.85rem;">Specs: ${booking.engine_cc || 'N/A'}cc / ${booking.engine_kw || 'N/A'}kW  | Color: ${booking.color || 'Standard'}</p>
                            <p style="color: #6b7280; font-size: 0.85rem; margin-top:4px;">${diffDays} day(s) @ $${parseFloat(booking.price_per_day || 120).toLocaleString()}/day</p>
                        </td>
                        <td style="padding: 15px 0; font-size: 0.9rem;">
                            ${booking.start_date} <br>to<br> ${booking.end_date}
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
                <title>Receipt #${booking.id}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #111827; line-height: 1.5; }
                    table { text-align: left; border-collapse: collapse; width: 100%; }
                    th, td { padding: 12px; border-bottom: 1px solid #eee; }
                    @media print { .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                ${content}
                <div class="no-print" style="margin-top: 40px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Print Receipt</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    loadBookings();
});
