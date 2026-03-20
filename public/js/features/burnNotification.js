// burnNotification.js
// Utilidad para mostrar el panel BURN y loguear en consola y terminal

export function showBurnNotification(message) {
  const panel = document.getElementById('burnNotificationPanel');
  const content = document.getElementById('burnNotificationContent');
  if (!panel || !content) {
    console.warn('[BURN-NOTIFICATION] Panel not found');
    return;
  }
  content.textContent = message;
  panel.style.display = 'block';
  // Log en consola
  console.log('[BURN-NOTIFICATION]', message);
  // Log en terminal (si existe window.BURN_LOG)
  if (typeof window.BURN_LOG === 'function') {
    window.BURN_LOG(message);
  } else if (window && window.parent && typeof window.parent.BURN_LOG === 'function') {
    window.parent.BURN_LOG(message);
  }
}

export function hideBurnNotification() {
  const panel = document.getElementById('burnNotificationPanel');
  if (panel) panel.style.display = 'none';
}

// Opción: registrar un logger de terminal global
window.BURN_LOG = function(msg) {
  if (window && window.process && window.process.stdout) {
    window.process.stdout.write('[BURN-NOTIFICATION] ' + msg + '\n');
  }
};
