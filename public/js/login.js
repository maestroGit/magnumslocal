// public/js/login.js
// Login local: valida contra /auth/login y evita enviar credenciales por URL

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('authForm');
  const errorDiv = document.getElementById('auth-error');

  const getPostLoginPath = (role) => {
    const normalizedRole = String(role || '').toLowerCase();
    if (normalizedRole === 'user' || normalizedRole === 'winelover' || normalizedRole === 'wine_lover') {
      return 'keystore.html';
    }
    return 'view.html';
  };

  const redirectAuthenticatedUser = async () => {
    try {
      const authResponse = await fetch('/auth/user', { credentials: 'include' });
      if (!authResponse.ok) return;

      const authData = await authResponse.json().catch(() => ({}));
      if (!authData.user) return;

      window.location.href = getPostLoginPath(authData.user.role);
    } catch (error) {
      console.warn('[LOGIN] No se pudo verificar sesion existente:', error);
    }
  };

  if (!form) return;

  redirectAuthenticatedUser();

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

      window.location.href = getPostLoginPath(data?.user?.role);
    } catch (error) {
      console.error('[LOGIN] Error:', error);
      if (errorDiv) {
        errorDiv.textContent = 'Error de conexión. Intenta nuevamente.';
        errorDiv.classList.add('visible');
      }
    }
  });
});
