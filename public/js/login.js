// public/js/login.js
// Login local: valida contra /auth/login y evita enviar credenciales por URL

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('authForm');
  const errorDiv = document.getElementById('auth-error');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('visible');
    }

    const username = form['auth-username']?.value.trim();
    const password = form['auth-password']?.value;

    if (!username || !password) {
      if (errorDiv) {
        errorDiv.textContent = 'Usuario y contraseña son requeridos.';
        errorDiv.classList.add('visible');
      }
      return;
    }

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (errorDiv) {
          errorDiv.textContent = data.error || 'Credenciales inválidas.';
          errorDiv.classList.add('visible');
        }
        return;
      }

      window.location.href = 'view.html';
    } catch (error) {
      console.error('[LOGIN] Error:', error);
      if (errorDiv) {
        errorDiv.textContent = 'Error de conexión. Intenta nuevamente.';
        errorDiv.classList.add('visible');
      }
    }
  });
});
