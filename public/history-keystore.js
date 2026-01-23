import { fetchAddressHistory } from './utxo-api.js';

const statusEl = document.getElementById('historyStatus');
const listEl = document.getElementById('historyList');
const btnRefresh = document.getElementById('btnRefresh');
const btnLoadMore = document.getElementById('btnLoadMore');
// Filters
const fStatusPending = document.getElementById('fStatusPending');
const fStatusMined = document.getElementById('fStatusMined');
const fTypeRecibido = document.getElementById('fTypeRecibido');
const fTypeEnviado = document.getElementById('fTypeEnviado');
const fTypeQuemada = document.getElementById('fTypeQuemada');
const fTypeDevuelta = document.getElementById('fTypeDevuelta');
const fSearch = document.getElementById('fSearch');

const PAGE_SIZE = 20;
let allHistory = [];
let filtered = [];
let page = 0;

const pubKey = sessionStorage.getItem('importedPubKey');

if (!pubKey) {
  if (statusEl) {
    statusEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <span>No wallet imported. Please import your keystore again.</span>
      <a class="keystore-btn primary" href="import-keystore.html">Import</a>
    </div>`;
  }
  if (btnRefresh) btnRefresh.disabled = true;
  if (btnLoadMore) btnLoadMore.disabled = true;
} else {
  loadHistory();
}

async function loadHistory() {
  try {
    statusEl.textContent = 'Cargando historial...';
    btnRefresh.disabled = true;
    const hist = await fetchAddressHistory(pubKey);
    allHistory = Array.isArray(hist) ? hist : [];
    page = 0;
    applyFiltersAndRender();
    statusEl.textContent = '';
  } catch (e) {
    statusEl.textContent = 'Error cargando historial: ' + (e.message || e);
  } finally {
    btnRefresh.disabled = false;
  }
}

function getFilters() {
  return {
    status: {
      pending: !!fStatusPending?.checked,
      mined: !!fStatusMined?.checked,
    },
    type: {
      recibido: !!fTypeRecibido?.checked,
      transferida: !!fTypeEnviado?.checked,
      quemada: !!fTypeQuemada?.checked,
      devuelta: !!fTypeDevuelta?.checked,
    },
    query: (fSearch?.value || '').trim().toLowerCase(),
  };
}

function applyFiltersAndRender() {
  const f = getFilters();
  filtered = allHistory.filter((it) => {
    // status
    const st = (it.status || '').toLowerCase();
    if (!(st === 'pending' ? f.status.pending : f.status.mined)) return false;
    // type mapping: show 'Enviado' UI for 'transferida'
    const tt = (it.type || '').toLowerCase();
    if (!f.type[tt]) return false;
    // search by txId substring
    if (f.query) {
      const tx = String(it.txId || '').toLowerCase();
      if (!tx.includes(f.query)) return false;
    }
    return true;
  });
  renderPage();
}

function renderPage() {
  listEl.innerHTML = '';
  const start = 0;
  const end = Math.min(filtered.length, (page + 1) * PAGE_SIZE);
  const slice = filtered.slice(start, end);
  slice.forEach(renderItem);
  if (slice.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.style.margin = '12px 0';
    empty.textContent = 'No hay transacciones para los filtros actuales.';
    listEl.appendChild(empty);
  }
  btnLoadMore.disabled = end >= filtered.length;
}

function renderItem(item) {
  // Debug: mostrar el objeto item y los timestamps recibidos
  console.log('[HIST-DEBUG] renderItem item:', item);
  console.log('[HIST-DEBUG] item.blockTimestamp:', item.blockTimestamp, 'item.timestamp:', item.timestamp);
  // Usar blockTimestamp si existe, si no timestamp de la transacción
  const ts = item.blockTimestamp ? new Date(item.blockTimestamp) : (item.timestamp ? new Date(item.timestamp) : null);
  const row = document.createElement('div');
  row.className = 'history-item';
  // status badge and type chip in a flex row
  const labels = document.createElement('div');
  labels.className = 'history-labels';
  labels.style.display = 'flex';
  labels.style.flexDirection = 'row';
  labels.style.gap = '6px';
  const status = document.createElement('span');
  status.className = 'badge ' + (item.status === 'pending' ? 'pending' : 'mined');
  status.textContent = item.status === 'pending' ? 'Pendiente' : 'Mine';
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.textContent = mapType(item.type);
  labels.appendChild(status);
  labels.appendChild(chip);
  row.appendChild(labels);
  // main content
  const main = document.createElement('div');
  main.className = 'history-main';
  main.style.display = 'flex';
  main.style.flexDirection = 'column';
  main.style.alignItems = 'center';
  main.style.justifyContent = 'center';
  const top = document.createElement('div');
  top.style.textAlign = 'center';
  top.innerHTML = `<span class="amount">${item.amount}</span> <span class="muted">🪙</span>`;
  const meta = document.createElement('div');
  meta.className = 'history-meta';
  meta.style.textAlign = 'center';
  // (definido arriba)
  const who = formatCounterparty(item);
  meta.innerHTML = `
  <span>${who}</span>
  <span class="txid">${(item.txId)}</span>
  <span>${ts ? ts.toLocaleString() : ''}</span>
  `;
  main.appendChild(top);
  main.appendChild(meta);
  row.appendChild(main);
  listEl.appendChild(row);
}

function mapType(t) {
  switch (t) {
    case 'recibido': return 'Received';
    case 'transferida': return 'Enviado';
    case 'quemada': return 'Quemada';
    case 'devuelta': return 'Devuelta';
    default: return t || 'Desconocido';
  }
}

function formatCounterparty(item) {
  if (item.type === 'recibido' && item.from && item.from.length) {
    return '📤' + shortId(item.from[0]);
  }
  if ((item.type === 'transferida' || item.type === 'devuelta' || item.type === 'quemada') && item.destino) {
    return '🚀' + shortId(item.destino);
  }
  if (item.to && item.to.length) return 'a ' + shortId(item.to[0]);
  return '';
}

function shortId(id) {
  if (!id) return '';
  const s = String(id);
  return s.length > 12 ? s.slice(0, 33) + '…' + s.slice(-15) : s;
}

btnRefresh?.addEventListener('click', () => loadHistory());
btnLoadMore?.addEventListener('click', () => {
  page += 1;
  renderPage();
});

// Filter events
function onFiltersChanged() {
  page = 0;
  applyFiltersAndRender();
}
fStatusPending?.addEventListener('change', onFiltersChanged);
fStatusMined?.addEventListener('change', onFiltersChanged);
fTypeRecibido?.addEventListener('change', onFiltersChanged);
fTypeEnviado?.addEventListener('change', onFiltersChanged);
fTypeQuemada?.addEventListener('change', onFiltersChanged);
fTypeDevuelta?.addEventListener('change', onFiltersChanged);

// Simple debounce for search input
let searchTimer = null;
fSearch?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    onFiltersChanged();
  }, 250);
});
