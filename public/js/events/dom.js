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
        if (blocks?.error) { showModal && showModal(`Error loading Blocks: ${blocks.error}`, 'Error'); return; }
        renderBlocks(blocks);
      } catch (e) {
        console.error('[events] error fetching /blocks', e);
        showModal && showModal('Failed to load blocks.', 'Connection Error');
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
        if (pool?.error) { showModal && showModal(`Error loading mempool: ${pool.error}`, 'Error'); return; }
        renderTransactionsPool(pool);
      } catch (e) {
        console.error('[events] error fetching /transactionsPool', e);
        showModal && showModal('Failed to load mempool.', 'Connection Error');
      }
    });
    mempoolBtn.dataset.bound = '1';
  }

  // Ejecutar minado (una ronda) y mostrar feedback contextual
  const mineBtn = document.getElementById('frontendMineBtn');
  if (mineBtn && !mineBtn.dataset.bound) {
    mineBtn.addEventListener('click', async () => {
      try {
        // 1) Check mempool before mining
        showToast && showToast('🔎 Checking mempool…', 'info');
        const pool = await fetchData('/transactionsPool');
        if (pool?.error) {
          showModal && showModal(`Failed to query mempool: ${pool.error}`, 'MemPool Error');
          return;
        }
        if (!Array.isArray(pool)) {
          showModal && showModal('Unexpected mempool response (not a list).', 'MemPool Error');
          return;
        }
        if (pool.length === 0) {
          const emptyMsg = `
            <div class="modal-info">
              <p><strong>ℹ️ Empty MemPool</strong></p>
              <p>There are no pending transactions. Mining will not start.</p>
            </div>
            <div class="modal-body">
              <p>Create a transaction (e.g., "Register" or "Consumed" bottle)  and try again.</p>
            </div>`;
          if (typeof window.safeModal === 'function') {
            window.safeModal('Mining blocked', emptyMsg);
          } else if (showModal) {
            showModal(emptyMsg, 'Mining blocked');
          }
          showToast && showToast('⛔ Empty MemPool, mine cancel', 'warning');
          return;
        }

        // 2) There are transactions: proceed to mine
        showToast && showToast(`⛏️ Mine ${pool.length} transaction(s)…`, 'info');
        const res = await fetchData('/mine', { method: 'POST' });
        if (res?.error) { showModal && showModal(`Error ⛏️mine: ${res.error}`, 'Error ⛏️mine'); return; }
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
          <div style="text-align:center;">
            <h2 class="modal-title">New block mined</h2>
            <div class="balance-result-modal">
              <div style="font-size:2em;margin-bottom:10px;">⛏️✔️</div>
              <p><strong>Block:</strong> ${lastBlock?.hash ? String(lastBlock.hash).slice(0,20)+'\u001a' : 'N/A'}</p>
              <p><strong>Timestamp:</strong> ${lastBlock?.timestamp ? new Date(lastBlock.timestamp).toLocaleString() : 'N/A'}</p>
              <p><strong>Transactions included:</strong> ${txCount}</p>
            </div>
            <div class="modal-actions">
              ${txCount > 0 ? `<button class="dashboard-btn secondary show-block-txs-btn" data-block-index="LAST">BLOCK</button>` : '<em>No se incluyeron transacciones en este bloque.</em>'}
            </div>
          </div>`;
        showToast && showToast('⛏️Mine✅', 'success');
        if (typeof window.safeModal === 'function') {
          window.safeModal('', minedModal);
        } else if (showModal) {
          showModal(minedModal, 'New block mined');
        }
      } catch (e) {
        console.error('[events] error POST /mine-transactions', e);
        showModal && showModal('Could not execute mining.', 'Connection Error');
      }
    });
    mineBtn.dataset.bound = '1';
  }
  // Balance button
  const balanceBtn = document.getElementById('balanceWallet');
  if (balanceBtn && !balanceBtn.dataset.bound) {
    balanceBtn.addEventListener('click', async () => {
      showToast('Checking balance...', 'info');
      const balance = await fetchData('/balance');
      if (balance.error) {
        showModal(`Error balance: ${balance.error}`, 'Error');
        showToast('Error balance', 'error');
      } else {
        renderBalance(balance);
        showToast('Balance correct', 'success');
      }
    });
    balanceBtn.dataset.bound = '1';
  }

  // Public key button
  const pkBtn = document.getElementById('publicKeyWallet');
  if (pkBtn && !pkBtn.dataset.bound) {
    pkBtn.addEventListener('click', async () => {
      showToast('Getting public key...', 'info');
      const publicKey = await fetchData('/public-key');
      if (publicKey.error) {
        showModal(`Error getting public key: ${publicKey.error}`, 'Error');
        showToast('Error getting public key', 'error');
      } else {
        renderPublicKey(publicKey);
        showToast('Public key obtained', 'success');
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
                showModal && showModal('No blocks available to display.', 'Empty Blockchain');
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
          navigator.clipboard.writeText(txid).then(() => showToast && showToast('TXID copied', 'success')).catch(() => showToast && showToast('Could not copy', 'error'));
        } else {
          try { showToast && showToast('Copy not supported', 'warning'); } catch {}
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
