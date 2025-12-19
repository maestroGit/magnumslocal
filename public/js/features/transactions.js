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
    showProgressModal('Procesando transacción...', 'Enviando', [
      'Validando datos...',
      'Conectando con la red...',
      'Procesando transacción...',
      'Confirmando resultado...'
    ]);

    const response = await fetchData('/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    });

    setTimeout(() => {
      closeCurrentModal();
      if (response.error || !response.success) {
        console.error('[TX][MODULE] Error en transacción', response.error || response);
        showModal(`❌ Error en la transacción: ${response.error || 'Error desconocido'}`, 'Error de Transacción');
        showToast('❌ Error en transacción', 'error');
        return;
      }
      if (response.success && response.transaction) {
        if (response.enableTraceability) {
          try { showTraceabilityModal(response.transaction); } catch (e) { console.warn('Traceability modal falló', e); }
        } else {
          const transactionResultContent = `
            <div class="modal-success">
              <div class="success-icon">✅</div>
              <h3>¡Transacción Completada!</h3>
              <p><strong>ID:</strong> <code>${response.transaction.id || 'N/A'}</code></p>
              <p><strong>Estado:</strong> <span class="status-success">Confirmada</span></p>
            </div>
            <div class="modal-details">
              <details>
                <summary>📋 Ver detalles completos</summary>
                <pre class="json-display">${JSON.stringify(response.transaction, null, 2)}</pre>
              </details>
              <div style="margin-top: 15px;">
                <p><strong>📅 Fecha:</strong> ${new Date(response.transaction.timestamp).toLocaleString()}</p>
                <p><strong>💰 Cantidad:</strong> ${response.transaction.amount}</p>
              </div>
            </div>`;
          safeModal('Transacción Exitosa', transactionResultContent);
        }
        showToast('✅ Transacción procesada exitosamente', 'success');
      } else {
        showModal('⚠️ La transacción se procesó pero no se recibieron datos válidos.', 'Advertencia');
        showToast('⚠️ Advertencia: respuesta incompleta', 'warning');
      }
    }, 1500);
  } catch (error) {
    setTimeout(() => {
      closeCurrentModal();
      console.error('[TX][MODULE] Error enviando transacción', error);
      showModal(`❌ Error al enviar la transacción: ${error.message}`, 'Error de Red');
      showToast('❌ Error de conexión', 'error');
    }, 800);
  }
};

// Render coin control transaction modal (fetch UTXOs & build form)
export const openTransactionModal = async () => {
  showProgressModal('Cargando UTXOs...', 'Coin Control', ['Consultando UTXOs...']);
  let utxoData;
  try {
    // Siempre obtener la clave pública activa del backend
      const { getCurrentPublicKey } = await import('../core/walletUtils.js');
      let address = await getCurrentPublicKey();
      console.log('[COIN CONTROL] Clave pública activa obtenida de getCurrentPublicKey:', address);
    if (!address) {
      closeCurrentModal();
      showModal('No hay dirección de wallet activa. Carga una wallet primero.', 'Coin Control');
      return;
    }
    const { apiBaseUrl } = await import('../core/config.js');
    const base = (apiBaseUrl || '').replace(/\/undefined$/,'');
    console.log('[COIN CONTROL] Consultando UTXOs para:', address, 'en', `${base}/utxo-balance/${address}`);
    const res = await fetch(`${base}/utxo-balance/${address}`);
    utxoData = await res.json();
    console.log('[COIN CONTROL] Respuesta UTXO:', utxoData);
    window._debugUtxos = utxoData.utxos;
  } catch (err) {
    closeCurrentModal();
    console.error('[COIN CONTROL] Error obteniendo UTXOs:', err);
    showModal('No se pudo obtener el UTXO set.', 'Error Coin Control');
    return;
  }
  closeCurrentModal();
  if (!utxoData || !Array.isArray(utxoData.utxos) || utxoData.utxos.length === 0) {
    showModal('No hay UTXOs disponibles para seleccionar.', 'Coin Control');
    return;
  }
  // Filtrar UTXOs pendientes/gastados antes de renderizar
  const utxosDisponibles = Array.isArray(utxoData.utxos)
    ? utxoData.utxos.filter(u => !window.pendingSpent || !window.pendingSpent.has(`${u.txId}:${u.outputIndex}`))
    : [];

  const transactionFormContent = `
    <form id="transactionForm">
      <label for="recipientInput">Destinatario (Clave Pública):</label>
      <input type="text" id="recipientInput" name="recipient" placeholder="Introduce la clave pública del destinatario" required>
      <label for="amountInput">Cantidad:</label>
      <input type="number" id="amountInput" name="amount" step="0.01" min="0.01" placeholder="0.00" required>
      <label for="passphraseInput">Passphrase para firmar:</label>
      <input type="password" id="passphraseInput" name="passphrase" placeholder="Introduce tu passphrase" required value="javi">
      <div id="utxoSelectList" class="utxo-select-list">
          ${utxosDisponibles.map((u, i) => {
            // Detectar si el UTXO proviene de una transacción coinbase (inputs vacíos)
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
      <button type="submit">Enviar Transacción</button>
    </form>`;
  safeModal('Nueva Transacción (Coin Control)', transactionFormContent);

  const form = document.getElementById('transactionForm');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const recipient = document.getElementById('recipientInput').value.trim();
    const amount = parseFloat(document.getElementById('amountInput').value);
    const passphrase = document.getElementById('passphraseInput').value;
    if (!recipient) return showModal('Por favor, introduce una clave pública válida para el destinatario.', 'Error de Validación');
    if (amount <= 0) return showModal('La cantidad debe ser mayor que 0.', 'Error de Validación');
    if (!passphrase) return showModal('La passphrase es obligatoria para firmar la transacción.', 'Error de Validación');

    const selectedUTXOs = Array.from(document.querySelectorAll('.utxo-checkbox:checked')).map(cb => ({
      txId: cb.dataset.txid,
      outputIndex: parseInt(cb.dataset.outputindex),
      amount: parseFloat(cb.dataset.amount),
      address: cb.dataset.address
    }));
    if (selectedUTXOs.length === 0) return showModal('Selecciona al menos un UTXO para la transacción.', 'Coin Control');

    const transactionData = { recipient, amount, passphrase, inputs: selectedUTXOs, mode: 'bodega' };
    showConfirmModal(`¿Estás seguro de que deseas enviar ${amount} a:<br><code>${recipient}</code> usando ${selectedUTXOs.length} UTXOs?`, () => submitTransaction(transactionData), null, 'Confirmar Transacción');
  });
};

export const initTransactionsFeature = () => {
  const btn = document.getElementById('openTransactionModal');
  if (btn && !btn.dataset.txBound) {
    btn.addEventListener('click', () => openTransactionModal());
    btn.dataset.txBound = '1';
  }
};
