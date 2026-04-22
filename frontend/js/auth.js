document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorMsg = document.getElementById('error-message');

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });

        localStorage.setItem('driveeasy_token', data.token);
        localStorage.setItem('driveeasy_user', JSON.stringify(data.user));
        
        // Redirect based on role or to home
        if (data.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'index.html';
        }
      } catch (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
      }
    });
  }

  if (registerForm) {
    const phoneInput = document.getElementById('reg-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^\d+]/g, '');
        if (!val.startsWith('+')) val = '+' + val.replace(/\+/g, '');
        e.target.value = val;
      });
    }

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const first_name = document.getElementById('reg-firstname').value;
      const last_name = document.getElementById('reg-lastname').value;
      const email = document.getElementById('reg-email').value;
      const phone = document.getElementById('reg-phone').value;
      const dob = document.getElementById('reg-dob').value;
      const license_number = document.getElementById('reg-license').value;
      const password = document.getElementById('reg-password').value;
      const errorMsg = document.getElementById('reg-error-message');

      try {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ first_name, last_name, email, phone, dob, license_number, password })
        });

        localStorage.setItem('driveeasy_token', data.token);
        localStorage.setItem('driveeasy_user', JSON.stringify(data.user));
        
        window.location.href = 'index.html';
      } catch (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
      }
    });
  }
});
