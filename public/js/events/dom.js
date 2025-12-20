// DOM Events initialization (ESM)
// Centralizes binding of UI buttons to feature/render functions

import { fetchData } from '../core/api.js';
import { showModal, showToast, showProgressModal, closeCurrentModal, showModalForm } from '../ui/modals.js';
import { renderBlocks, showBlockTransactions } from '../render/blocks.js';
import { renderTransactionsPool } from '../render/mempool.js';
import { renderBalance, renderPublicKey } from '../render/wallet.js';
import { renderMonitoring } from '../render/monitoring.js';
import { openTransactionModal } from '../features/transactions.js';
import { openBajaTransactionModal } from '../features/bajaToken.js';
import { showWalletModal } from '../features/walletModal.js';

export function initDomEvents() {
  // Ver Bloques (carga desde API y muestra modal)
  const blocksBtn = document.getElementById('block');
  if (blocksBtn && !blocksBtn.dataset.bound) {
    blocksBtn.addEventListener('click', async () => {
      try {
        const blocks = await fetchData('/blocks');
        if (blocks?.error) { showModal && showModal(`Error cargando bloques: ${blocks.error}`, 'Error'); return; }
        renderBlocks(blocks);
      } catch (e) {
        console.error('[events] error fetching /blocks', e);
        showModal && showModal('No se pudieron cargar los bloques.', 'Error de Conexión');
      }
    });
    blocksBtn.dataset.bound = '1';
  }

  // Ver MemPool (carga desde API y muestra modal)
  const mempoolBtn = document.getElementById('transactionsPoolBtn');
  if (mempoolBtn && !mempoolBtn.dataset.bound) {
    mempoolBtn.addEventListener('click', async () => {
      try {
        const pool = await fetchData('/transactionsPool');
        if (pool?.error) { showModal && showModal(`Error cargando mempool: ${pool.error}`, 'Error'); return; }
        renderTransactionsPool(pool);
      } catch (e) {
        console.error('[events] error fetching /transactionsPool', e);
        showModal && showModal('No se pudo cargar la mempool.', 'Error de Conexión');
      }
    });
    mempoolBtn.dataset.bound = '1';
  }

  // Ejecutar minado (una ronda) y mostrar feedback contextual
  const mineBtn = document.getElementById('frontendMineBtn');
  if (mineBtn && !mineBtn.dataset.bound) {
    mineBtn.addEventListener('click', async () => {
      try {
        // 1) Comprobar mempool antes de minar
        showToast && showToast('🔎 Comprobando mempool…', 'info');
        const pool = await fetchData('/transactionsPool');
        if (pool?.error) {
          showModal && showModal(`No se pudo consultar la mempool: ${pool.error}`, 'Error de MemPool');
          return;
        }
        if (!Array.isArray(pool)) {
          showModal && showModal('Respuesta inesperada de mempool (no es una lista).', 'Error de MemPool');
          return;
        }
        if (pool.length === 0) {
          const emptyMsg = `
            <div class="modal-info">
              <p><strong>ℹ️ MemPool vacía</strong></p>
              <p>No hay transacciones pendientes. No se iniciará el minado.</p>
            </div>
            <div class="modal-body">
              <p>Crea una transacción (por ejemplo, "Register bottle" o "Consumed bottle") y vuelve a intentarlo.</p>
            </div>`;
          if (typeof window.safeModal === 'function') {
            window.safeModal('Minado bloqueado', emptyMsg);
          } else if (showModal) {
            showModal(emptyMsg, 'Minado bloqueado');
          }
          showToast && showToast('⛔ MemPool vacía, minado cancelado', 'warning');
          return;
        }

        // 2) Hay transacciones: proceder a minar
        showToast && showToast(`⛏️ Minando ${pool.length} transacción(es)…`, 'info');
        const res = await fetchData('/mine', { method: 'POST' });
        if (res?.error) { showModal && showModal(`Error al minar: ${res.error}`, 'Error de Minado'); return; }
        // El backend /mine devuelve JSON del bloque, pero para asegurar datos completos refrescamos /blocks
        const blocks = await fetchData('/blocks');
        let lastBlock = null;
        if (!blocks?.error && Array.isArray(blocks) && blocks.length) {
          lastBlock = blocks[blocks.length - 1];
          // Re-render pero SIN modal global; mostramos uno específico del minado
          renderBlocks(blocks, { showModal: false });
        }
        const txCount = Array.isArray(lastBlock?.data) ? lastBlock.data.length : 0;
        const minedModal = `
          <div id="sideModalPanel" class="modal" style="display:flex; align-items: flex-start; justify-content: center; z-index:30000;">
            <div class="modal-content" style="max-width:600px; min-width:320px; margin:48px auto 0 auto;">
              <h2>⛏️✔️</h2>
              <div class="balance-result-modal" style="text-align:center;">
                <p><strong>Bloque:</strong> ${lastBlock?.hash ? String(lastBlock.hash).slice(0,20)+'\u001a' : 'N/A'}</p>
                <p><strong>Timestamp:</strong> ${lastBlock?.timestamp ? new Date(lastBlock.timestamp).toLocaleString() : 'N/A'}</p>
                <p><strong>Transacciones incluidas:</strong> ${txCount}</p>
              </div>
              <div class="modal-body" style="text-align:center;">
                ${txCount > 0 ? `<button class="dashboard-btn secondary show-block-txs-btn" data-block-index="LAST">Block</button>` : '<em>No se incluyeron transacciones en este bloque.</em>'}
              </div>
            </div>
          </div>`;
        showToast && showToast('✅ Minado completado', 'success');
        if (typeof window.safeModal === 'function') {
          window.safeModal('Nuevo bloque minado', minedModal);
        } else if (showModal) {
          showModal(minedModal, 'Nuevo bloque minado');
        }
      } catch (e) {
        console.error('[events] error POST /mine-transactions', e);
        showModal && showModal('No se pudo ejecutar el minado.', 'Error de Conexión');
      }
    });
    mineBtn.dataset.bound = '1';
  }
  // Balance button
  const balanceBtn = document.getElementById('balanceWallet');
  if (balanceBtn && !balanceBtn.dataset.bound) {
    balanceBtn.addEventListener('click', async () => {
      showToast('Consultando balance...', 'info');
      const balance = await fetchData('/balance');
      if (balance.error) {
        showModal(`Error al consultar balance: ${balance.error}`, 'Error');
        showToast('Error al consultar balance', 'error');
      } else {
        renderBalance(balance);
        showToast('Balance consultado correctamente', 'success');
      }
    });
    balanceBtn.dataset.bound = '1';
  }

  // Public key button
  const pkBtn = document.getElementById('publicKeyWallet');
  if (pkBtn && !pkBtn.dataset.bound) {
    pkBtn.addEventListener('click', async () => {
      showToast('Obteniendo clave pública...', 'info');
      const publicKey = await fetchData('/public-key');
      if (publicKey.error) {
        showModal(`Error al obtener clave pública: ${publicKey.error}`, 'Error');
        showToast('Error al obtener clave pública', 'error');
      } else {
        renderPublicKey(publicKey);
        showToast('Clave pública obtenida', 'success');
      }
    });
    pkBtn.dataset.bound = '1';
  }

  // System monitor button
  const monitorBtn = document.getElementById('systemMonitor');
  if (monitorBtn && !monitorBtn.dataset.bound) {
    monitorBtn.addEventListener('click', () => renderMonitoring());
    monitorBtn.dataset.bound = '1';
  }

  // Open transaction modal
  const txBtn = document.getElementById('openTransactionModal');
  if (txBtn && !txBtn.dataset.bound) {
    txBtn.addEventListener('click', () => openTransactionModal());
    txBtn.dataset.bound = '1';
  }

  // Open baja (consumed bottle) modal
  const bajaBtn = document.getElementById('openTransactionBajaModal');
  if (bajaBtn && !bajaBtn.dataset.bound) {
    bajaBtn.addEventListener('click', () => openBajaTransactionModal());
    bajaBtn.dataset.bound = '1';
  }

  // Wallet modal main button
  const walletBtn = document.getElementById('walletModal');
  if (walletBtn && !walletBtn.dataset.bound) {
    walletBtn.addEventListener('click', () => showWalletModal());
    walletBtn.dataset.bound = '1';
  }

  // Mark globally for legacy script to know events are centralized
  try { window.__MM_EVENTS_BOUND__ = true; } catch(e) {}
  console.debug('[events] DOM events initialized');

  // Inicialización ligera: obtener clave pública activa y cachearla
  try {
    if (!window.walletAddress) {
      fetchData('/public-key').then((pk) => {
        if (pk && pk.publicKey) {
          window.walletAddress = pk.publicKey;
          const infoWallet = document.getElementById('infoWallet');
          if (infoWallet) {
            infoWallet.textContent = pk.publicKey;
          }
        }
      }).catch(()=>{});
    }
  } catch {}

  // Delegated clicks for inline-removed handlers
  if (!document.body.dataset.mmDelegated) {
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      // Mostrar transacciones de bloque
      if (btn.matches('.show-block-txs-btn') && btn.dataset.blockIndex) {
        const rawIdx = btn.dataset.blockIndex;
        let resolvedIndex;
        if (rawIdx === 'LAST') {
          const blocks = window._lastBlocks;
          if (Array.isArray(blocks) && blocks.length) {
            resolvedIndex = blocks.length - 1;
          } else {
            // Fetch blocks if cache not present
            fetchData('/blocks').then(b => {
              if (Array.isArray(b) && b.length) {
                try { window._lastBlocks = b; } catch {}
                showBlockTransactions(b.length - 1);
              } else {
                showModal && showModal('No hay bloques disponibles para mostrar.', 'Blockchain vacía');
              }
            });
            return; // Defer action to async fetch
          }
        } else {
          const parsed = parseInt(rawIdx, 10);
            if (!Number.isNaN(parsed)) {
              resolvedIndex = parsed;
            }
        }
        if (typeof resolvedIndex === 'number') {
          try { showBlockTransactions(resolvedIndex); } catch(err) { console.error('showBlockTransactions error', err); }
        }
      }
      // Copiar TXID (data-copy-txid)
      if (btn.dataset.copyTxid) {
        const txid = btn.dataset.copyTxid;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txid).then(() => showToast && showToast('TXID copiado', 'success')).catch(() => showToast && showToast('No se pudo copiar', 'error'));
        } else {
          try { showToast && showToast('Copia no soportada', 'warning'); } catch {}
        }
      }
      // Cerrar modal inline (data-close-inline)
      if (btn.dataset.closeInline) {
        const m = document.getElementById('inlineFallbackModal'); if (m) m.remove();
      }
      // Abrir URL (data-open-url)
      if (btn.dataset.openUrl) {
        const target = btn.dataset.openTarget || '_blank';
        try { window.open(btn.dataset.openUrl, target); } catch (err) { console.error('No se pudo abrir URL', err); }
      }
    });
    document.body.dataset.mmDelegated = '1';
  }
}
