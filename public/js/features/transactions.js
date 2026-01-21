// Transactions & Coin Control feature module (ESM)
// Exposes: submitTransaction, openTransactionModal, initTransactionsFeature
// Responsible for sending transactions and presenting UTXO selection (coin control)

import { fetchData } from '../core/api.js';
import { safeModal, showModal, showConfirmModal, showToast, showProgressModal, closeCurrentModal } from '../ui/modals.js';
import { showTraceabilityModal } from './traceability.js';

// Submit a transaction (generic path used by coin control forms)
export const submitTransaction = async (transactionData) => {
  try {
    console.log('[TX][MODULE] submitTransaction', transactionData);
    showProgressModal('Process transaction...', 'Sending', [
      'Validate data...',
      'Connecting to network...',
      'Processing transaction...',
      'Confirming result...'
    ]);

    const response = await fetchData('/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    });

    setTimeout(() => {
      closeCurrentModal();
      if (response.error || !response.success) {
        console.error('[TX][MODULE] Error en transaction', response.error || response);
        showModal(`❌ Error transaction: ${response.error || 'Error desconocido'}`, 'Error de Transaction');
        showToast('❌ Error transaction', 'error');
        return;
      }
      if (response.success && response.transaction) {
        if (response.enableTraceability) {
          try { showTraceabilityModal(response.transaction); } catch (e) { console.warn('Traceability modal falló', e); }
        } else {
          const transactionResultContent = `
            <div class="modal-success">
              <div class="success-icon">✅</div>
              <h3>¡Transacction Completed!</h3>
              <p><strong>ID:</strong> <code>${response.transaction.id || 'N/A'}</code></p>
              <p><strong>Situation:</strong> <span class="status-success">Confirmed</span></p>
            </div>
            <div class="modal-details">
              <details>
                <summary>📋 View complete details</summary>
                <pre class="json-display">${JSON.stringify(response.transaction, null, 2)}</pre>
              </details>
              <div style="margin-top: 15px;">
                <p><strong>📅 Fecha:</strong> ${new Date(response.transaction.timestamp).toLocaleString()}</p>
                <p><strong>💰 Cantidad:</strong> ${response.transaction.amount}</p>
              </div>
            </div>`;
          safeModal('Transaction ✅Successful', transactionResultContent);
        }
        showToast('✅ Transaction completed', 'success');
      } else {
        showModal('⚠️ Transaction processed, but no valid data was received', 'Alert');
        showToast('⚠️ Alert: incomplete response', 'warning');
      }
    }, 1500);
  } catch (error) {
    setTimeout(() => {
      closeCurrentModal();
      console.error('[TX][MODULE] Error sending transaction', error);
      showModal(`❌ Error sending transaction: ${error.message}`, 'Network Error');
      showToast('❌ Connection error', 'error');
    }, 800);
  }
};

// Render coin control transaction modal (fetch UTXOs & build form)
export const openTransactionModal = async () => {
  showProgressModal('Loading Magnums...', 'Coin Control', ['Fetching Magnums...']);
  let utxoData;
  try {
    // Siempre obtener la clave pública activa del backend
      const { getCurrentPublicKey } = await import('../core/walletUtils.js');
      let address = await getCurrentPublicKey();
      console.log('[COIN CONTROL] Clave pública activa obtenida de getCurrentPublicKey:', address);
    if (!address) {
      closeCurrentModal();
      showModal('No active wallet address. Please load a wallet first.', 'Coin Control');
      return;
    }
    const { apiBaseUrl } = await import('../core/config.js');
    const base = (apiBaseUrl || '').replace(/\/undefined$/,'');
    console.log('[COIN CONTROL] Fetching UTXOs for:', address, 'at', `${base}/utxo-balance/${address}`);
    const res = await fetch(`${base}/utxo-balance/${address}`);
    utxoData = await res.json();
    console.log('[COIN CONTROL] UTXO response:', utxoData);
    window._debugUtxos = utxoData.utxos;
  } catch (err) {
    closeCurrentModal();
    console.error('[COIN CONTROL] Error fetching UTXOs:', err);
    showModal('Failed to fetch UTXO set.', 'Coin Control Error');
    return;
  }
  closeCurrentModal();
  if (!utxoData || !Array.isArray(utxoData.utxos) || utxoData.utxos.length === 0) {
    showModal('No UTXOs available for selection.', 'Coin Control');
    return;
  }
  // Filtrar UTXOs pendientes/gastados antes de renderizar
  const utxosDisponibles = Array.isArray(utxoData.utxos)
    ? utxoData.utxos.filter(u => !window.pendingSpent || !window.pendingSpent.has(`${u.txId}:${u.outputIndex}`))
    : [];

  const transactionFormContent = `
    <form id="transactionForm">
      <label for="recipientInput"> Beneficiary address:</label>
      <input type="text" id="recipientInput" name="recipient" placeholder="Insert beneficiary public key" required>
      <label for="amountInput">Import:</label>
      <input type="number" id="amountInput" name="amount" step="0.01" min="0.01" placeholder="0.00" required>
      <label for="passphraseInput">Passphrase for signing:</label>
      <input type="password" id="passphraseInput" name="passphrase" placeholder="Enter passphrase" required value="javi">
      <div id="utxoSelectList" class="utxo-select-list">
          ${utxosDisponibles.map((u, i) => {
            // Detectar si el UTXO proviene de una transacction coinbase (inputs vacíos)
            const isCoinbase = u.inputs && Array.isArray(u.inputs) && u.inputs.length === 0;
            return `
              <div class="coincontrol-utxo-row${isCoinbase ? ' coinbase-utxo' : ''}">
                <input type="checkbox" class="utxo-checkbox" id="utxo_${i}" data-txid="${u.txId}" data-outputindex="${u.outputIndex}" data-amount="${u.amount}" data-address="${u.address}">
                <label for="utxo_${i}" class="utxo-meta">
                  <span class="utxo-amount">${u.amount}</span> <span class="utxo-meta">(${u.txId.slice(0,12)}... #${u.outputIndex})</span>
                </label>
              </div>
            `;
          }).join('')}
      </div>
      <button type="submit">Transaction</button>
    </form>`;
  safeModal('TRANSACTION', transactionFormContent);

  const form = document.getElementById('transactionForm');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const recipient = document.getElementById('recipientInput').value.trim();
    const amount = parseFloat(document.getElementById('amountInput').value);
    const passphrase = document.getElementById('passphraseInput').value;
    if (!recipient) return showModal('Please, insert a valid public key for the beneficiary.', 'Validation Error');
    if (amount <= 0) return showModal('The amount must be greater than 0.', 'Validation Error');
    if (!passphrase) return showModal('The passphrase is required to sign the transaction.', 'Validation Error');

    const selectedUTXOs = Array.from(document.querySelectorAll('.utxo-checkbox:checked')).map(cb => ({
      txId: cb.dataset.txid,
      outputIndex: parseInt(cb.dataset.outputindex),
      amount: parseFloat(cb.dataset.amount),
      address: cb.dataset.address
    }));
    if (selectedUTXOs.length === 0) return showModal('Select at least one UTXO for the transaction.', 'Coin Control');

    const transactionData = { recipient, amount, passphrase, inputs: selectedUTXOs, mode: 'bodega' };
    showConfirmModal(`Are you sure you want to send ${amount} to:<br><code>${recipient}</code> using ${selectedUTXOs.length} UTXOs?`, () => submitTransaction(transactionData), null, 'Confirm Transaction');
  });
};

export const initTransactionsFeature = () => {
  const btn = document.getElementById('openTransactionModal');
  if (btn && !btn.dataset.txBound) {
    btn.addEventListener('click', () => openTransactionModal());
    btn.dataset.txBound = '1';
  }
};
