// Bootstrap entrypoint (ESM)
// Import core & UI modules (initial phase)
import { apiBaseUrl } from './core/config.js';
import { fetchData, copyTxId } from './core/api.js';
import { showModal, showModalForm, showConfirmModal, showToast, showProgressModal, animateProgress, closeCurrentModal, showInlineModal } from './ui/modals.js';
import { showWalletModal, initWalletModalFeature } from './features/walletModal.js';
import { verifyQRProof } from './features/verification.js';
import { renderBlocks, showBlockTransactions } from './render/blocks.js';
import { renderTransactionsPool } from './render/mempool.js';
import { renderBalance, renderPublicKey, checkPublicKeyBalance, uploadFile } from './render/wallet.js';
import { renderMonitoring } from './render/monitoring.js';
import { showTraceabilityModal, generateQRWithProof, showQRModal } from './features/traceability.js';
import { submitTransaction, openTransactionModal, initTransactionsFeature } from './features/transactions.js';
import { openBajaTransactionModal, submitBajaToken } from './features/bajaToken.js';
import { initDomEvents } from './events/dom.js';

// No global namespace exposure; all features are accessed via ESM imports.

// Initialize feature bindings on DOM ready (non-breaking; works alongside legacy bindings)
document.addEventListener('DOMContentLoaded', () => {
  try { initWalletModalFeature(); } catch (e) { console.debug('Wallet feature init skipped', e); }
  try { initTransactionsFeature(); } catch (e) { console.debug('Transactions feature init skipped', e); }
  try { initDomEvents(); } catch (e) { console.debug('DOM events init skipped', e); }
  // Verification feature doesn't need explicit init; function exposed globally.

  // Mostrar la clave pública global en el header
  import('./core/walletUtils.js').then(({ getCurrentPublicKey }) => {
    const pubKeySpan = document.getElementById('walletGlobalPubKeyValue');
    if (pubKeySpan) {
      getCurrentPublicKey().then(pk => {
        pubKeySpan.textContent = pk ? pk : 'No disponible';
      });
    }
  });

  // Header scrolled effect for site header in dashboard
  try {
    const header = document.querySelector('.site-header');
    if (header) {
      const onScroll = () => {
        if (window.scrollY > 10) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  } catch {}
});

// No window overrides needed now that all scripts are ESM.
