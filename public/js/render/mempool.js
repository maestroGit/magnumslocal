// Mempool renderer (ESM)
// Exports: renderTransactionsPool(transactionsPool)

import { safeModal, showToast } from '../ui/modals.js';

export function renderTransactionsPool(transactionsPool) {
  let transactionsContainer = document.getElementById('transactionsContainer');
  if (!transactionsContainer) {
    transactionsContainer = document.createElement('div');
    transactionsContainer.id = 'transactionsContainer';
    document.body.appendChild(transactionsContainer);
  }

  if (!Array.isArray(transactionsPool) || transactionsPool.length === 0) {
    transactionsContainer.innerHTML = '<p>No hay datos en mempool</p>';
    const emptyPoolContent = `
      <div class="modal-info">
        <p><strong>ℹ️ MemPool vacío</strong></p>
        <p>No hay transacciones pendientes en el pool de memoria.</p>
      </div>
      <div class="modal-body">
        <p>Todas las transacciones han sido procesadas.</p>
      </div>`;
  safeModal('MemPool - Estado Actual', emptyPoolContent);
    return;
  }

  transactionsContainer.innerHTML = '';
  transactionsPool.forEach((transaction) => {
    const transactionDiv = document.createElement('div');
    transactionDiv.className = 'transaction';
    transactionDiv.innerHTML = `
      <p><strong>ID:</strong> ${transaction.id}</p>
      <p><strong>Inputs:</strong></p>
      <ul>
        ${transaction.inputs && Array.isArray(transaction.inputs)
          ? transaction.inputs.map((input) => `
            <li>
              <strong>txId:</strong> ${input.txId || ''} <br>
              <strong>outputIndex:</strong> ${input.outputIndex ?? ''} <br>
              <strong>Amount:</strong> ${input.amount ?? ''} <br>
              <strong>Address:</strong> ${input.address || ''} <br>
              <strong>Signature R:</strong> ${input.signature?.r || ''} <br>
              <strong>Signature S:</strong> ${input.signature?.s || ''} <br>
              <strong>Signature Recovery Param:</strong> ${input.signature?.recoveryParam ?? ''} <br>
            </li>`).join('')
          : '<li>No inputs</li>'}
      </ul>`;

    transaction.outputs?.forEach((output) => {
      const outputDiv = document.createElement('div');
      outputDiv.className = 'transaction-output';
      outputDiv.innerHTML = `
        <p><strong>Output Amount:</strong> ${output.amount}</p>
        <p><strong>Output Address:</strong> ${output.address}</p>`;
      transactionDiv.appendChild(outputDiv);
    });

    transactionsContainer.appendChild(transactionDiv);
  });

  const totalAmount = transactionsPool.reduce((total, tx) => {
    const senderAddress = tx.inputs && tx.inputs.length > 0 ? tx.inputs[0].address : null;
    const outputSum = tx.outputs
      ? tx.outputs.reduce((sum, output) => {
          const amt = Number(output.amount);
          const validAmt = Number.isFinite(amt) ? amt : 0;
          return output.address !== senderAddress ? sum + validAmt : sum;
        }, 0)
      : 0;
    return total + outputSum;
  }, 0);

  const mempoolModalContent = `
    <div class="modal-info">
      <p><strong>📊 MemPool - Transacciones Pendientes</strong></p>
      <p><strong>Total de transacciones:</strong> ${transactionsPool.length}</p>
      <p><strong>Volumen total:</strong> ${Number.isFinite(Number(totalAmount)) ? Number(totalAmount).toFixed(2) : 'N/A'}</p>
    </div>
    <div class="modal-body">
      <h3>Detalles de Transacciones:</h3>
      ${transactionsPool.map((tx, index) => {
        const inputCount = tx.inputs ? tx.inputs.length : 0;
        const outputCount = tx.outputs ? tx.outputs.length : 0;
        const senderAddress = tx.inputs && tx.inputs.length > 0 ? tx.inputs[0].address : null;
        const recipientOutput = tx.outputs ? tx.outputs.find((output) => output.address !== senderAddress) : null;
        const txAmount = recipientOutput ? Number(recipientOutput.amount) : 0;
        const txAmountDisplay = Number.isFinite(txAmount) ? txAmount.toFixed(2) : 'N/A';
        const inputsDetail = tx.inputs && Array.isArray(tx.inputs) && tx.inputs.length > 0
          ? `<ul>${tx.inputs.map(input => `
              <li>
                <strong>txId:</strong> <span class="tx-id">${input.txId || ''}</span><br>
                <strong>outputIndex:</strong> ${input.outputIndex ?? ''}<br>
                <strong>Address:</strong> <span class="tx-id">${input.address || ''}</span><br>
                <strong>Amount:</strong> ${input.amount ?? ''}<br>
                <strong>Signature R:</strong> <span class="tx-id">${input.signature?.r || ''}</span><br>
                <strong>Signature S:</strong> <span class="tx-id">${input.signature?.s || ''}</span><br>
                <strong>Signature Recovery Param:</strong> ${input.signature?.recoveryParam ?? ''}
              </li>`).join('')}</ul>`
          : '<em>No inputs</em>';
        const outputsDetail = tx.outputs && Array.isArray(tx.outputs) && tx.outputs.length > 0
          ? `<ul>${tx.outputs.map(output => `
              <li>
                <strong>Amount:</strong> ${output.amount}<br>
                <strong>Address:</strong> <span class="tx-id">${output.address}</span>
              </li>`).join('')}</ul>`
          : '<em>No outputs</em>';
        return `
          <div class="monitor-card transaction-modal-item">
            <ul>
              <li>
                <strong>Transacción #${index + 1}</strong><br>
                <strong>ID:</strong> <span class="tx-id">${tx.id}</span><br>
                <strong>Inputs:</strong> ${inputCount} | <strong>Outputs:</strong> ${outputCount}<br>
                <strong>Cantidad:</strong> ${txAmountDisplay}<br>
                <details><summary>Ver detalles de Inputs</summary>${inputsDetail}</details>
                <details><summary>Ver detalles de Outputs</summary>${outputsDetail}</details>
              </li>
            </ul>
          </div>`;
      }).join('')}
    </div>`;

  safeModal('MemPool - Transacciones Cargadas', mempoolModalContent);

  showToast && showToast(`MemPool listo: ${transactionsPool.length} transacciones`, 'success');
}
