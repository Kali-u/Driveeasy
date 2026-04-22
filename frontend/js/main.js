const API_URL = 'http://localhost:3000/api';

// Mobile menu toggle & Global UI Init
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  document.body.classList.add('page-transition');
  
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');
  
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }

  // Theme Toggle Button Logic
  const themeToggles = document.querySelectorAll('.theme-toggle');
  themeToggles.forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });

  // Language Dropdown Logic
  const langBtn = document.getElementById('lang-btn');
  const langMenu = document.getElementById('lang-dropdown-menu');
  if (langBtn && langMenu) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
      if (!langMenu.contains(e.target)) {
        langMenu.classList.remove('show');
      }
    });
  }

  // Notification Dropdown Logic
  const notifBtn = document.getElementById('notif-btn');
  const notifMenu = document.getElementById('notif-dropdown');
  if (notifBtn && notifMenu) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifMenu.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
      if (!notifMenu.contains(e.target)) {
        notifMenu.classList.remove('show');
      }
    });
  }

  updateNavState();
  if(getUser()) loadNotifications();
  initI18n();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('driveeasy_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('driveeasy_theme', newTheme);
}

// i18n Management
function initI18n() {
  const lang = localStorage.getItem('driveeasy_lang') || 'en';
  applyTranslations(lang);
}

window.setLang = function(lang) {
  localStorage.setItem('driveeasy_lang', lang);
  applyTranslations(lang);
  
  // Close dropdown if it's managed via menu (will implement class toggling optionally)
  const langDrop = document.getElementById('lang-dropdown-menu');
  if (langDrop) langDrop.classList.remove('show');
}

function applyTranslations(lang) {
  if (!window.i18n_dict) return;
  const dict = window.i18n_dict[lang];
  if (!dict) return;

  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const keyPath = el.getAttribute('data-i18n');
    const keys = keyPath.split('.');
    
    let text = dict;
    for (const key of keys) {
      if (text[key]) {
        text = text[key];
      } else {
        text = null;
        break;
      }
    }

    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });

  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(el => {
    const keyPath = el.getAttribute('data-i18n-placeholder');
    const keys = keyPath.split('.');
    let text = dict;
    for (const key of keys) {
      if (text && text[key]) text = text[key];
      else { text = null; break; }
    }
    if (text) el.placeholder = text;
  });

  // Update current flag icon visually
  const flagMap = {
    'en': 'https://flagcdn.com/w40/gb.png',
    'mk': 'https://flagcdn.com/w40/mk.png',
    'sq': 'https://flagcdn.com/w40/al.png'
  };
  const currentFlag = document.getElementById('current-lang-flag');
  if (currentFlag) {
    currentFlag.innerHTML = `<img src="${flagMap[lang]}" alt="${lang}" style="width: 20px; height: 14px; object-fit: cover; border-radius: 2px; vertical-align: middle;">`;
  }
}

// Notification Fetching
async function loadNotifications() {
  const user = getUser();
  if (!user || user.role === 'admin') return;

  const notifMenuList = document.getElementById('notif-list');
  const notifBadge = document.getElementById('notif-badge');
  if (!notifMenuList || !notifBadge) return;

  try {
      const bookings = await apiFetch('/bookings');
      let notifHtml = '';
      let count = 0;

      bookings.forEach(b => {
          if (b.status === 'cancelled') {
              const dismissKey = `dismissed_cancel_${b.id}`;
              if (!localStorage.getItem(dismissKey)) {
                  count++;
                  notifHtml += `
                      <div class="dropdown-item danger" id="drop-notif-${b.id}">
                          <div style="font-weight: 600;"><i class="fa-solid fa-circle-exclamation"></i> Cancelled</div>
                          <div>Booking for ${b.brand} ${b.model} cancelled.</div>
                          <button onclick="dismissNotification('drop-notif-${b.id}', '${dismissKey}', event)" style="margin-top:5px; font-size:0.8rem; border:none; background:none; text-decoration:underline; cursor:pointer;">Dismiss</button>
                      </div>
                  `;
              }
          }
          if (b.status === 'active') {
              const startDate = new Date(b.start_date);
              const today = new Date();
              today.setHours(0,0,0,0);
              const diffTime = startDate - today;
              
              if (diffTime >= 0) {
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  count++;
                  let dayMsg = diffDays === 0 ? "starts <strong>today</strong>!" : `in <strong>${diffDays} days</strong>.`;
                  notifHtml += `
                      <div class="dropdown-item info">
                          <div style="font-weight: 600;"><i class="fa-solid fa-calendar-check"></i> Upcoming</div>
                          <div>${b.brand} ${b.model} ${dayMsg}</div>
                      </div>
                  `;
              }
          }
      });

      if (count > 0) {
          notifBadge.style.display = 'flex';
          notifBadge.textContent = count;
          notifMenuList.innerHTML = notifHtml;
      } else {
          notifBadge.style.display = 'none';
          notifMenuList.innerHTML = '<div class="dropdown-item" style="text-align:center; color: var(--clr-text-muted);">No new notifications</div>';
      }

  } catch (error) {
      console.error('Error fetching notifications:', error);
  }
}

window.dismissNotification = (elementId, storageKey, e) => {
  if (e) e.stopPropagation();
  localStorage.setItem(storageKey, 'true');
  loadNotifications(); // Reload to update counter
};

// Authentication State
function getUser() {
  const user = localStorage.getItem('driveeasy_user');
  return user ? JSON.parse(user) : null;
}

function getToken() {
  return localStorage.getItem('driveeasy_token');
}

function updateNavState() {
  const user = getUser();
  
  const navLogin = document.getElementById('nav-login');
  const navRegister = document.getElementById('nav-register');
  const navProfile = document.getElementById('nav-profile');
  const navAdmin = document.getElementById('nav-admin');
  const navLogout = document.getElementById('nav-logout');
  const navNotif = document.getElementById('nav-notif');

  if (user) {
    if (navLogin) navLogin.style.display = 'none';
    if (navRegister) navRegister.style.display = 'none';
    if (navLogout) navLogout.style.display = 'block';
    
    if (user.role === 'admin') {
      if (navProfile) navProfile.style.display = 'none';
      if (navAdmin) navAdmin.style.display = 'block';
      if (navNotif) navNotif.style.display = 'none';
    } else {
      if (navProfile) navProfile.style.display = 'block';
      if (navAdmin) navAdmin.style.display = 'none';
      if (navNotif) navNotif.style.display = 'flex';
    }
  } else {
    if (navLogin) navLogin.style.display = 'block';
    if (navRegister) navRegister.style.display = 'block';
    if (navProfile) navProfile.style.display = 'none';
    if (navAdmin) navAdmin.style.display = 'none';
    if (navLogout) navLogout.style.display = 'none';
    if (navNotif) navNotif.style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('driveeasy_user');
  localStorage.removeItem('driveeasy_token');
  window.location.href = 'index.html';
}

// Global API Fetch helper
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  } catch (error) {
    throw error;
  }
}
