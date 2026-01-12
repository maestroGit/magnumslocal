// Baja de Transacción (Consumed bottle) - ESM feature
// Exports: openBajaTransactionModal, submitBajaToken

import { safeModal, showModal, showToast, showProgressModal, closeCurrentModal } from '../ui/modals.js';
import { fetchData } from '../core/api.js';

export function openBajaTransactionModal() {
  import('../core/walletUtils.js').then(async ({ getCurrentPublicKey }) => {
    const walletAddress = await getCurrentPublicKey();
    const bajaFormContent = `
      <form id="bajaTransactionForm">
        <h3>- 🚚 Complete the form to receive your wine</h3>
        <label for="transactionIdBaja">Transaction ID:</label>
        <input type="text" id="transactionIdBaja" name="transactionIdBaja" placeholder="Enter the transaction ID" required>
        <label for="propietarioBaja">Owner (read-only):</label>
        <input type="text" id="propietarioBaja" name="propietarioBaja" value="${walletAddress}" readonly required style="background:#eee;">
        <label for="motivoBaja">Reason:</label>
        <select id="motivoBaja" name="motivoBaja" required>
          <option value="burn">Retirar (burn)</option>
          <option value="bodega">Enviar a bodega</option>
        </select>
        <div style="margin-top:12px;">
        <button type="button" id="leerQRBajaBtn" class="dashboard-btn secondary" style="margin-left:10px;">Read QR</button>
        <button type="submit" class="dashboard-btn primary">Consume</button>
        </div>
      </form>`;
    safeModal('Remove to consume', bajaFormContent);
    const form = document.getElementById('bajaTransactionForm');
    if (!form) return;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const propietario = document.getElementById('propietarioBaja')?.value?.trim();
      const transactionId = document.getElementById('transactionIdBaja')?.value?.trim();
      const motivo = document.getElementById('motivoBaja')?.value || 'burn';
      if (!propietario || !transactionId) {
        showModal && showModal('Complete all required fields', 'Validation');
        return;
      }
      if (propietario !== walletAddress) {
        showModal && showModal('Owner must match the imported wallet.', 'Validation');
        console.error('[BURN] Attempt to sign with a wallet different from the imported one', { propietario, walletAddress });
        return;
      }
      await submitBajaToken({ transactionId, ownerPublicKey: propietario, motivo });
    });
    const leerQRBtn = document.getElementById('leerQRBajaBtn');
    if (leerQRBtn && !leerQRBtn.dataset.bound) {
      leerQRBtn.addEventListener('click', () => {
        showModal && showModal('Future implementation of QR reading for removal.', 'Read QR');
      });
      leerQRBtn.dataset.bound = '1';
    }
  });

  const form = document.getElementById('bajaTransactionForm');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const propietario = document.getElementById('propietarioBaja')?.value?.trim();
    const transactionId = document.getElementById('transactionIdBaja')?.value?.trim();
    const motivo = document.getElementById('motivoBaja')?.value || 'burn';

    if (!propietario || !transactionId) {
      showModal && showModal('Complete all required fields', 'Validation');
      return;
    }
    if (propietario !== (window.walletAddress || '')) {
      showModal && showModal('Owner must match the imported wallet.', 'Validation');
      console.error('[BURN] Attempt to sign with a wallet different from the imported one', { propietario, walletAddress: window.walletAddress });
      return;
    }

    await submitBajaToken({ transactionId, ownerPublicKey: propietario, motivo });
  });

  const leerQRBtn = document.getElementById('leerQRBajaBtn');
  if (leerQRBtn && !leerQRBtn.dataset.bound) {
    leerQRBtn.addEventListener('click', () => {
      showModal && showModal('Future implementation of QR reading for removal.', 'Read QR');
    });
    leerQRBtn.dataset.bound = '1';
  }
}

export async function submitBajaToken({ transactionId, ownerPublicKey, motivo, utxoTxId, utxoOutputIndex }) {
  try {
    showProgressModal && showProgressModal('Processing removal...', 'Token Removal', [
      'Validating data...', 'Searching transaction...', 'Creating removal transaction...'
    ]);
    const result = await fetchData('/baja-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, ownerPublicKey, motivo, utxoTxId, utxoOutputIndex })
    });
    closeCurrentModal && closeCurrentModal();
    if (result?.success) {
      showModal && showModal(`✅ ${result.message}<br>ID: <code>${result.transactionId}</code><br>Destination: <code>${result.destino}</code>`, 'Token Removal Successful');
      showToast && showToast('Removal completed successfully', 'success');
    } else {
      showModal && showModal(`❌ Error: ${result?.error || 'Removal could not be completed'}`, 'Token Removal Error');
      showToast && showToast('Removal error', 'error');
    }
  } catch (err) {
    closeCurrentModal && closeCurrentModal();
    showModal && showModal(`Error performing removal: ${err.message}`, 'Token Removal Error');
    showToast && showToast('Connection error', 'error');
  }
}
