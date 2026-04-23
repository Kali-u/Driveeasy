document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get('id');
    
    if (!carId) {
        window.location.href = 'cars.html';
        return;
    }

    const detailLoading = document.getElementById('detail-loading');
    const infoSection = document.getElementById('car-info-section');
    const bookingSection = document.getElementById('booking-section');
    const loginPrompt = document.getElementById('login-prompt');
    const btnBook = document.getElementById('btn-book');
    const bookingError = document.getElementById('booking-error');

    // Display elements
    const carImage = document.getElementById('car-image');
    const carTitle = document.getElementById('car-title');
    const carSpecs = document.getElementById('car-specs');
    const carDescription = document.getElementById('car-description');
    const pricePerDayEl = document.getElementById('price-per-day');
    const totalDaysEl = document.getElementById('total-days');
    const totalPriceEl = document.getElementById('total-price');
    const bookingSummary = document.getElementById('booking-summary');
    const galleryContainer = document.getElementById('gallery-thumbnails');
    const reviewsList = document.getElementById('reviews-list');
    const reviewFormContainer = document.getElementById('review-form-container');
    const loginToReview = document.getElementById('login-to-review');

    let currentCar = null;
    let selectedDates = [];

    try {
        // Fetch car data, booked dates, and reviews in parallel
        const [car, bookedDates, reviews] = await Promise.all([
            apiFetch(`/cars/${carId}`),
            apiFetch(`/cars/${carId}/booked-dates`),
            apiFetch(`/cars/${carId}/reviews`)
        ]);

        currentCar = car;
        detailLoading.style.display = 'none';
        infoSection.style.display = 'flex';
        bookingSection.style.display = 'block';

        // Update UI
        carImage.src = car.image_url;
        carImage.alt = `${car.brand} ${car.model}`;
        carTitle.textContent = `${car.brand} ${car.model} ${car.production_year ? `(${car.production_year})` : ''}`;
        carSpecs.innerHTML = `
            <span><i class="fa-solid fa-users"></i> ${car.seats} Seats</span>
            <span style="margin: 0 10px;">|</span>
            <span><i class="fa-solid fa-gas-pump"></i> ${car.fuel_type}</span>
            <span style="margin: 0 10px;">|</span>
            <span><i class="fa-solid fa-bolt"></i> ${car.engine_kw || '?'} kW</span>
            <span style="margin: 0 10px;">|</span>
            <span><i class="fa-solid fa-gauge-high"></i> ${car.engine_cc || '?'} cc</span>
            <span style="margin: 0 10px;">|</span>
            <span><i class="fa-solid fa-palette"></i> ${car.color || 'Standard'}</span>
            <span style="margin: 0 10px;">|</span>
            <span style="color: var(--clr-primary); font-weight: 700;">$${car.price_per_day} / day</span>
        `;
        carDescription.textContent = car.description;
        pricePerDayEl.textContent = `$${car.price_per_day}`;

        // Setup Gallery
        let galleryImages = [car.image_url];
        if (car.gallery_images) {
            try {
                const arr = JSON.parse(car.gallery_images);
                if (Array.isArray(arr) && arr.length > 0) galleryImages = galleryImages.concat(arr);
            } catch(e) {}
        }
        
        if (galleryImages.length > 1) {
            galleryContainer.innerHTML = galleryImages.map(url => `
                <img src="${url}" class="gallery-thumb" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid transparent;">
            `).join('');
            
            const thumbs = document.querySelectorAll('.gallery-thumb');
            thumbs[0].style.borderColor = 'var(--clr-primary)';
            thumbs.forEach(thumb => {
                thumb.addEventListener('click', (e) => {
                    carImage.src = e.target.src;
                    thumbs.forEach(t => t.style.borderColor = 'transparent');
                    e.target.style.borderColor = 'var(--clr-primary)';
                });
            });
        }

        // Initialize Map
        if (car.latitude && car.longitude && typeof L !== 'undefined') {
            const map = L.map('car-map').setView([car.latitude, car.longitude], 13);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
            L.marker([car.latitude, car.longitude]).addTo(map)
                .bindPopup(`${car.brand} ${car.model} Location`)
                .openPopup();
        } else {
            document.getElementById('car-map').style.display = 'none';
        }

        // Render Reviews
        const renderReviews = (reviewData) => {
            if (reviewData.length === 0) {
                reviewsList.innerHTML = '<p style="color: var(--clr-text-muted);">No reviews yet. Be the first to review!</p>';
                return;
            }
            reviewsList.innerHTML = reviewData.map(r => `
                <div style="padding: 1rem 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                        <span style="font-weight:600;">${r.username}</span>
                        <span style="color: #F59E0B;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                    </div>
                    <p style="margin:0;">${r.comment || ''}</p>
                    <small style="color: var(--clr-text-muted);">${new Date(r.created_at).toLocaleDateString()}</small>
                </div>
            `).join('');
        };
        renderReviews(reviews);

        // Authentication check for booking and reviewing
        if (!getUser()) {
            btnBook.style.display = 'none';
            loginPrompt.style.display = 'block';
            loginToReview.style.display = 'block';
        } else {
            reviewFormContainer.style.display = 'block';
        }

        // Review Submit handling
        const btnSubmitReview = document.getElementById('btn-submit-review');
        btnSubmitReview.addEventListener('click', async () => {
            const rating = parseInt(document.getElementById('review-rating').value);
            const comment = document.getElementById('review-comment').value;

            try {
                btnSubmitReview.disabled = true;
                await apiFetch('/reviews', {
                    method: 'POST',
                    body: JSON.stringify({ car_id: carId, rating, comment })
                });
                
                // Refresh reviews
                const newReviews = await apiFetch(`/cars/${carId}/reviews`);
                renderReviews(newReviews);
                
                document.getElementById('review-comment').value = '';
                alert('Review added successfully!');
            } catch (error) {
                alert('Failed to submit review: ' + error.message);
            } finally {
                btnSubmitReview.disabled = false;
            }
        });

        // Initialize Flatpickr
        const disabledDates = bookedDates.map(b => ({
            from: b.start_date,
            to: b.end_date
        }));

        flatpickr("#date-range", {
            mode: "range",
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: disabledDates,
            onChange: function(dates, dateStr, instance) {
                if (dates.length === 2) {
                    const start = dates[0];
                    const end = dates[1];

                    // Check if selected range overlaps with ANY disabled date
                    const overlaps = disabledDates.some(block => {
                        const blockStart = new Date(block.from);
                        const blockEnd = new Date(block.to);
                        // Normalize times to midnight
                        blockStart.setHours(0,0,0,0);
                        blockEnd.setHours(0,0,0,0);
                        return (start <= blockEnd && end >= blockStart);
                    });

                    if (overlaps) {
                        alert("Your selected range overlaps with an existing booking. Please select valid dates.");
                        instance.clear();
                        document.getElementById('booking-summary').style.display = 'none';
                        return;
                    }

                    selectedDates = dates;
                    const user = getUser();
                    let age = user ? getAge(user.dob) : 25;
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    
                    let basePrice = diffDays * car.price_per_day;
                    let total = basePrice;
                    
                    let summaryHtml = `
                        <div style="display:flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>Price per day</span>
                            <span>$${car.price_per_day}</span>
                        </div>
                        <div style="display:flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>Total days</span>
                            <span>${diffDays}</span>
                        </div>
                    `;

                    if (age < 20) {
                        const surcharge = 15 * diffDays;
                        total += surcharge;
                        summaryHtml += `
                            <div style="display:flex; justify-content: space-between; margin-bottom: 0.5rem; color: #b91c1c;">
                                <span>Young Driver Fee ($15/day)</span>
                                <span>+$${surcharge}</span>
                            </div>
                        `;
                    }

                    summaryHtml += `
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 0.5rem 0;">
                        <div style="display:flex; justify-content: space-between; font-weight: 700; font-size: 1.2rem; margin-bottom: 1rem;">
                            <span>Total</span>
                            <span id="total-price">$${total.toLocaleString()}</span>
                        </div>
                        <div class="form-group" style="display: flex; align-items: flex-start; gap: 8px;">
                            <input type="checkbox" id="terms-agree" style="margin-top: 4px;">
                            <label for="terms-agree" style="font-size: 0.8rem; line-height: 1.3; color: var(--clr-text-muted);">
                                I accept the <a href="#" style="color: var(--clr-primary);">Terms of Service</a> and assume full liability for the vehicle during the rental period.
                            </label>
                        </div>
                    `;
                    
                    document.getElementById('booking-summary').innerHTML = summaryHtml;
                    document.getElementById('booking-summary').style.display = 'block';
                } else {
                    document.getElementById('booking-summary').style.display = 'none';
                }
            }
        });

        flatpickr("#pickup-time", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true
        });

    } catch (error) {
        detailLoading.innerHTML = `<p class="error-msg" style="display:block;">Error: ${error.message}</p>`;
    }

    // Age check helper
    function getAge(dateString) {
        if (!dateString) return 25; // if missing, assume valid for legacy test accounts
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    // CC Expiration Auto-Formatting
    const ccExpInput = document.getElementById('cc-exp');
    if (ccExpInput) {
        ccExpInput.addEventListener('input', function(e) {
            let val = this.value.replace(/\D/g, ''); // Remove non-digits
            if (val.length >= 2) {
                val = val.substring(0, 2) + '/' + val.substring(2, 4);
            }
            this.value = val;
        });
    }

    // CC Number Auto-Formatting (Groups of 4)
    const ccNumInput = document.getElementById('cc-number');
    if (ccNumInput) {
        ccNumInput.addEventListener('input', function(e) {
            let val = this.value.replace(/\D/g, '').substring(0, 16); // Strip non-digits and truncate
            let formatted = val.match(/.{1,4}/g);
            this.value = formatted ? formatted.join(' ') : '';
        });
    }

    // Handle initial Proceed to Payment click
    btnBook.addEventListener('click', () => {
        if (selectedDates.length !== 2) {
            bookingError.textContent = "Please select a valid date range.";
            bookingError.style.display = 'block';
            return;
        }

        const pickupTimeStr = document.getElementById('pickup-time').value;
        if (!pickupTimeStr) {
            bookingError.textContent = "Please select a pick-up time.";
            bookingError.style.display = 'block';
            return;
        }

        const termsAgree = document.getElementById('terms-agree').checked;
        if (!termsAgree) {
            bookingError.textContent = "You must accept the Terms of Service to proceed.";
            bookingError.style.display = 'block';
            return;
        }

        const user = getUser();
        const age = user ? getAge(user.dob) : 25;
        
        if (currentCar.class === 'premium' && age < 25) {
            bookingError.textContent = "You must be 25 or older to rent Premium class vehicles.";
            bookingError.style.display = 'block';
            return;
        }

        if (age < 20 && currentCar.engine_kw > 77) {
            bookingError.textContent = "Young drivers (under 20) are restricted to vehicles with a maximum of 77kW engine power.";
            bookingError.style.display = 'block';
            return;
        }

        bookingError.style.display = 'none';
        
        // Show Payment Modal
        document.getElementById('payment-amount').textContent = totalPriceEl.textContent;
        document.getElementById('payment-modal').style.display = 'flex';
    });

    document.getElementById('btn-cancel-payment').addEventListener('click', () => {
        document.getElementById('payment-modal').style.display = 'none';
    });

    const paymentMethodSelect = document.getElementById('payment-method-select');
    const cardInputsContainer = document.getElementById('card-inputs-container');
    const btnPay = document.getElementById('btn-pay-now');

    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', (e) => {
            if (e.target.value === 'cash') {
                cardInputsContainer.style.display = 'none';
                btnPay.textContent = 'Confirm Booking';
            } else {
                cardInputsContainer.style.display = 'block';
                btnPay.textContent = 'Pay Now';
            }
        });
    }

    // Handle Payment Execution
    btnPay.addEventListener('click', async () => {
        const paymentMethod = document.getElementById('payment-method-select').value;
        const ccNum = document.getElementById('cc-number').value.replace(/\s+/g, '');
        const ccExp = document.getElementById('cc-exp').value;
        const ccCvc = document.getElementById('cc-cvc').value;
        const payError = document.getElementById('payment-error');

        if (paymentMethod === 'card') {
            if (ccNum.length !== 16 || !ccExp || ccCvc.length < 3) {
                payError.textContent = "Please enter a valid 16-digit credit card number and all other details.";
                payError.style.display = 'block';
                return;
            }

            if (ccExp.length === 5 && ccExp.includes('/')) {
                const [mm, yy] = ccExp.split('/');
                const expMonth = parseInt(mm, 10);
                const expYear = parseInt(`20${yy}`, 10);
                
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = now.getFullYear();

                if (expMonth < 1 || expMonth > 12) {
                    payError.textContent = "Please enter a valid expiration month (01-12).";
                    payError.style.display = 'block';
                    return;
                }

                if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
                    payError.textContent = "This payment method is invalid because it is expired.";
                    payError.style.display = 'block';
                    return;
                }
            } else {
                payError.textContent = "Please complete the expiration date in MM/YY format.";
                payError.style.display = 'block';
                return;
            }
        }

        payError.style.display = 'none';
        btnPay.disabled = true;
        btnPay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        const pickupTimeStr = document.getElementById('pickup-time').value;
        const startDate = flatpickr.formatDate(selectedDates[0], "Y-m-d");
        const endDate = flatpickr.formatDate(selectedDates[1], "Y-m-d");

        try {
            await apiFetch('/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    car_id: carId,
                    start_date: startDate,
                    end_date: endDate,
                    pickup_time: pickupTimeStr,
                    payment_method: paymentMethod
                })
            });

            // Simulate slight delay for dummy payment processing
            setTimeout(() => {
                alert('Payment captured & Booking successful! Redirecting to your profile...');
                window.location.href = 'profile.html';
            }, 800);
            
        } catch (error) {
            payError.textContent = error.message;
            payError.style.display = 'block';
            btnPay.disabled = false;
            btnPay.textContent = 'Pay Now';
        }
    });
});
