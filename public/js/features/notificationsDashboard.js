import { fetchData } from '../core/api.js';
import { showToast } from '../ui/modals.js';

const state = {
  wineryId: null,
  notifications: [],
  drawerOpen: false,
  loading: false,
};

const ensureStyles = () => {
  // Styles for the notifications widget and drawer are defined in burn-notification.css
  // to comply with CSP (style-src 'self'). We ensure the stylesheet is linked if not present.
  if (document.getElementById('burn-notification-stylesheet') || document.querySelector('link[href*="burn-notification.css"]')) return;
  const link = document.createElement('link');
  link.id = 'burn-notification-stylesheet';
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = 'burn-notification.css';
  document.head.appendChild(link);
};

const notificationToText = (notification) => {
  const payload = notification.payload || {};
  return `${payload.txId || 'Tx desconocida'} · ${payload.amount ?? 'N/A'} magnums`;
};

const getWineryId = () => {
  const user = window.currentUser || null;
  if (!user) return '';
  return String(user.id || user.wineryId || user.winery_id || '').trim();
};

const getOrCreateWidget = () => {
  let widget = document.getElementById('notificationsWidget');
  if (widget) return widget;

  widget = document.createElement('div');
  widget.id = 'notificationsWidget';
  widget.className = 'notifications-widget';
  widget.innerHTML = `
    <button id="notificationsBell" class="notifications-bell" type="button" aria-label="Abrir notificaciones">
      🔔 <span class="notifications-badge" id="notificationsUnreadBadge">0</span>
    </button>
    <div id="notificationsDrawer" class="notifications-drawer hidden" role="dialog" aria-label="Notificaciones de burn">
      <div class="notifications-drawer-header">
        <h3>Notificaciones</h3>
        <div class="notifications-drawer-actions">
          <button id="notificationsRefreshBtn" type="button">Actualizar</button>
          <button id="notificationsMarkReadBtn" type="button">Marcar leídas</button>
        </div>
      </div>
      <div id="notificationsList" class="notifications-list"></div>
    </div>
  `;
  document.body.appendChild(widget);
  return widget;
};

const renderNotifications = () => {
  const list = document.getElementById('notificationsList');
  const badge = document.getElementById('notificationsUnreadBadge');
  if (!list || !badge) return;

  const unreadCount = state.notifications.filter((item) => !item.read).length;
  badge.textContent = String(unreadCount);

  if (!state.notifications.length) {
    list.innerHTML = '<div class="notification-empty">No hay notificaciones de burn aún.</div>';
    return;
  }

  list.innerHTML = state.notifications.map((item) => {
    const payload = item.payload || {};
    const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A';
    return `
      <article class="notification-item ${item.read ? 'read' : 'unread'}" data-id="${item.id}">
        <div class="notification-top">
          <div class="notification-type">${item.type || 'TOKEN_BURNED'}</div>
          <div class="notification-date">${createdAt}</div>
        </div>
        <div class="notification-meta"><strong>Tx:</strong> ${payload.txId || item.txId || 'N/A'}</div>
        <div class="notification-meta"><strong>Bodega:</strong> ${item.wineryId || 'N/A'}</div>
        <div class="notification-meta"><strong>Amount:</strong> ${payload.amount ?? 'N/A'}</div>
        <div class="notification-payload"><strong>Wallet:</strong> ${payload.wineloverWallet || 'N/A'}</div>
      </article>
    `;
  }).join('');

  list.querySelectorAll('.notification-item').forEach((item) => {
    item.addEventListener('click', () => {
      const notificationId = Number(item.dataset.id);
      if (Number.isFinite(notificationId)) {
        markAsRead([notificationId]);
      }
    });
  });
};

const loadNotifications = async () => {
  const wineryId = getWineryId();
  if (!wineryId) {
    state.notifications = [];
    renderNotifications();
    return;
  }

  state.loading = true;
  const response = await fetchData(`/notifications?wineryId=${encodeURIComponent(wineryId)}`, {
    credentials: 'include',
  });
  state.loading = false;

  if (response?.error || response?.success === false) {
    showToast(`No se pudieron cargar las notificaciones: ${response?.error || 'error'}`, 'error');
    return;
  }

  state.wineryId = wineryId;
  state.notifications = Array.isArray(response.notifications) ? response.notifications : [];
  renderNotifications();
};

const markAsRead = async (notificationIds = []) => {
  const wineryId = getWineryId();
  if (!wineryId) return;

  const body = notificationIds.length
    ? { wineryId, notificationIds }
    : { wineryId };

  const response = await fetch('/notifications/mark-as-read', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    showToast('No se pudieron marcar las notificaciones como leídas', 'error');
    return;
  }

  state.notifications = state.notifications.map((item) => {
    if (!notificationIds.length || notificationIds.includes(item.id)) {
      return { ...item, read: true };
    }
    return item;
  });
  renderNotifications();
};

const toggleDrawer = async () => {
  const drawer = document.getElementById('notificationsDrawer');
  if (!drawer) return;
  const isHidden = drawer.classList.contains('hidden');
  drawer.classList.toggle('hidden');
  state.drawerOpen = isHidden;
  if (isHidden) {
    await loadNotifications();
    const unreadNotifications = state.notifications.filter((item) => !item.read).map((item) => item.id);
    if (unreadNotifications.length) {
      await markAsRead(unreadNotifications);
    }
  }
};

const upsertRealtimeNotification = (detail) => {
  if (!detail) return;
  const wineryId = getWineryId();
  if (!wineryId) return;
  if (detail.bodegaId && String(detail.bodegaId) !== wineryId) return;

  const notification = {
    id: Date.now(),
    wineryId,
    type: 'TOKEN_BURNED',
    payload: {
      txId: detail.txId,
      amount: detail.amount,
      burnAddress: detail.burnAddress,
      wineloverWallet: detail.wineloverWallet,
      fecha: detail.fecha,
    },
    read: false,
    createdAt: detail.fecha || new Date().toISOString(),
  };

  state.notifications = [notification, ...state.notifications];
  renderNotifications();
  showToast(`Burn recibido para ${wineryId}`, 'info');
};

export function initNotificationsDashboard() {
  ensureStyles();
  const widget = getOrCreateWidget();

  const bell = widget.querySelector('#notificationsBell');
  const refreshBtn = widget.querySelector('#notificationsRefreshBtn');
  const markReadBtn = widget.querySelector('#notificationsMarkReadBtn');

  bell?.addEventListener('click', toggleDrawer);
  refreshBtn?.addEventListener('click', async () => {
    await loadNotifications();
    showToast('Notificaciones actualizadas', 'success');
  });
  markReadBtn?.addEventListener('click', async () => {
    const unreadNotifications = state.notifications.filter((item) => !item.read).map((item) => item.id);
    await markAsRead(unreadNotifications);
    showToast('Notificaciones marcadas como leídas', 'success');
  });

  window.addEventListener('auth-user-changed', async () => {
    await loadNotifications();
  });

  window.addEventListener('burn-notification-received', (event) => {
    upsertRealtimeNotification(event.detail);
  });

  const currentWineryId = getWineryId();
  if (currentWineryId) {
    loadNotifications().catch((error) => console.error('[NOTIFICATIONS][DASHBOARD] Error inicializando:', error));
  }
}

try {
  if (typeof window !== 'undefined') {
    window.initNotificationsDashboard = initNotificationsDashboard;
  }
} catch {}