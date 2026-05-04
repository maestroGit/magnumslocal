document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-password-form');
  const message = document.getElementById('reset-message');

  if (!form || !message) return;

  const url = new URL(window.location.href);
  const token = url.searchParams.get('token') || '';

  if (!token) {
    message.textContent = 'Token de recuperacion no encontrado.';
    message.className = 'auth-message error';
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    message.className = 'auth-message';

    const newPassword = String(form.newPassword?.value || '');
    const newPasswordConfirm = String(form.newPasswordConfirm?.value || '');

    if (!newPassword || !newPasswordConfirm) {
      message.textContent = 'Completa todos los campos.';
      message.className = 'auth-message error';
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      message.textContent = 'Las contrasenas no coinciden.';
      message.className = 'auth-message error';
      return;
    }

    try {
      const response = await fetch('/local/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        message.textContent = data.error || 'No se pudo actualizar la contrasena.';
        message.className = 'auth-message error';
        return;
      }

      message.textContent = data.message || 'Contrasena actualizada correctamente. Ya puedes iniciar sesion.';
      message.className = 'auth-message success';
      form.reset();
    } catch (error) {
      console.error('[reset-password] Error:', error);
      message.textContent = 'No se pudo actualizar la contrasena. Intentalo de nuevo.';
      message.className = 'auth-message error';
    }
  });
});
