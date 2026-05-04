document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-password-form');
  const message = document.getElementById('forgot-message');

  if (!form || !message) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';

    const email = String(form.email?.value || '').trim();
    if (!email) {
      message.textContent = 'Introduce un email valido.';
      return;
    }

    try {
      const response = await fetch('/local/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json().catch(() => ({}));
      message.textContent = data.message || 'Si el correo esta registrado, recibiras instrucciones para restablecer tu contrasena.';
    } catch (error) {
      console.error('[forgot-password] Error:', error);
      message.textContent = 'No se pudo procesar la solicitud. Intentalo de nuevo.';
    }
  });
});
