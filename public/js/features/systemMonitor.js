// systemMonitor.js
// Muestra el uso de espacio del blockchain storage en el dashboard


export async function showSystemMonitor() {
  // Esta función queda vacía o solo llama a renderMonitoring() si se requiere compatibilidad
  // import { renderMonitoring } from '../render/monitoring.js';
  // renderMonitoring();
}

function formatUptime(uptimeSeconds) {
  if (!uptimeSeconds) return '';
  const sec = Math.floor(uptimeSeconds % 60);
  const min = Math.floor((uptimeSeconds / 60) % 60);
  const hr = Math.floor((uptimeSeconds / 3600) % 24);
  const days = Math.floor(uptimeSeconds / 86400);
  let str = '';
  if (days) str += `${days}d `;
  if (hr) str += `${hr}h `;
  if (min) str += `${min}m `;
  str += `${sec}s`;
  return str.trim();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

// Integración directa con el botón Monitor
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('systemMonitor');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showSystemMonitor();
    });
  }
});
