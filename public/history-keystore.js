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
      <span>No wallet detected. Import to continue</span>
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
    statusEl.textContent = 'Loading history...';
    btnRefresh.disabled = true;
    const hist = await fetchAddressHistory(pubKey);
    allHistory = Array.isArray(hist) ? hist : [];
    page = 0;
    applyFiltersAndRender();
    statusEl.textContent = '';
  } catch (e) {
    statusEl.textContent = 'Error loading history: ' + (e.message || e);
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
      opened: !!fTypeQuemada?.checked, // 'opened' es sinónimo de 'quemada' para el filtro
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
    // Filtro dinámico para quemadas: si el filtro 'Opened' está activo, incluir cualquier transacción con output a dirección que empiece por '0x000'
    if (f.type.quemada) {
      // Si la transacción tiene outputs y alguno es burn
      if (Array.isArray(it.outputs) && it.outputs.some(o => typeof o.address === 'string' && o.address.startsWith('0x000'))) {
        // Se considera quemada, no filtrar por type
      } else if (!f.type[tt]) {
        return false;
      }
    } else {
      // Si el filtro de quemada está desactivado, filtrar por type normal
      if (!f.type[tt]) return false;
    }
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
    empty.textContent = 'No transfers for the current filters.';
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
  row.style.boxSizing = 'border-box';
  
  // status badge and type chip in a flex row
  const labels = document.createElement('div');
  labels.className = 'history-labels';
  const status = document.createElement('span');
  status.className = 'badge ' + (item.status === 'pending' ? 'pending' : 'mined');
  status.textContent = item.status === 'pending' ? 'Pendiente' : 'Mine';
  const chip = document.createElement('span');
  chip.className = 'chip';
  // Agregar clase específica según el tipo de transacción para diferenciación visual
  const typeClass = (item.type || '').toLowerCase();
  if (['recibido', 'received'].includes(typeClass)) chip.classList.add('received');
  else if (['transferida', 'transfer', 'enviado'].includes(typeClass)) chip.classList.add('transfer');
  else if (['quemada', 'opened'].includes(typeClass)) chip.classList.add('opened');
  else if (['devuelta', 'returned'].includes(typeClass)) chip.classList.add('devuelta');
  chip.textContent = mapType(item.type);
  labels.appendChild(status);
  labels.appendChild(chip);
  row.appendChild(labels);
  
  // main content - COMPACT
  const main = document.createElement('div');
  main.className = 'history-main';
  const top = document.createElement('div');
  top.style.textAlign = 'center';
  top.style.minWidth = '0';
  const amountSpan = document.createElement('span');
  amountSpan.className = 'amount';
  amountSpan.textContent = item.amount;
  const mojiSpan = document.createElement('span');
  mojiSpan.className = 'muted';
  mojiSpan.textContent = '💰';
  top.appendChild(amountSpan);
  top.appendChild(mojiSpan);
  
  const meta = document.createElement('div');
  meta.className = 'history-meta';
  meta.style.overflow = 'hidden';
  const who = formatCounterparty(item);
  
  const whoSpan = document.createElement('span');
  whoSpan.className = 'who'; // Agregar clase para aplicar estilo consistente
  whoSpan.style.wordBreak = 'break-all';
  whoSpan.style.lineHeight = '1.2';
  whoSpan.textContent = who;
  
  const txidSpan = document.createElement('span');
  txidSpan.className = 'txid';
  txidSpan.style.wordBreak = 'break-all';
  txidSpan.style.lineHeight = '1.2';
  txidSpan.textContent = item.txId || '';
  
  const dateSpan = document.createElement('span');
  dateSpan.style.lineHeight = '1.2';
  dateSpan.textContent = ts ? ts.toLocaleString() : '';
  
  meta.appendChild(whoSpan);
  meta.appendChild(txidSpan);
  meta.appendChild(dateSpan);
  main.appendChild(top);
  main.appendChild(meta);
  row.appendChild(main);
  listEl.appendChild(row);
}

function mapType(t) {
  switch (t) {
    case 'recibido': return 'Received';
    case 'transferida': return 'Enviado';
    case 'quemada':
    case 'opened':
      return 'Opened';
    case 'devuelta': return 'Devuelta';
    default: return t || 'Desconocido';
  }
}

function formatCounterparty(item) {
  if (item.type === 'recibido' && item.from && item.from.length) {
    return '📤' + shortId(item.from[0]);
  }
  // Mostrar destino burn aunque el type no sea 'quemada' si hay output a 0x000
  if (Array.isArray(item.outputs)) {
    const burnOutput = item.outputs.find(o => typeof o.address === 'string' && o.address.startsWith('0x000'));
    if (burnOutput) {
      return '🚀' + shortId(burnOutput.address);
    }
  }
  if ((item.type === 'transferida' || item.type === 'devuelta' || item.type === 'quemada') && item.destino) {
    return '🚀' + shortId(item.destino);
  }
  if (item.to && item.to.length) return '🍾' + shortId(item.to[0]);
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
