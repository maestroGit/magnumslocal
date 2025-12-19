// Baja de Transacción (Consumed bottle) - ESM feature
// Exports: openBajaTransactionModal, submitBajaToken

import { safeModal, showModal, showToast, showProgressModal, closeCurrentModal } from '../ui/modals.js';
import { fetchData } from '../core/api.js';

export function openBajaTransactionModal() {
  import('../core/walletUtils.js').then(async ({ getCurrentPublicKey }) => {
    const walletAddress = await getCurrentPublicKey();
    const bajaFormContent = `
      <form id="bajaTransactionForm">
        <h3>🗑️ Baja de Transacción</h3>
        <label for="transactionIdBaja">ID de Transacción:</label>
        <input type="text" id="transactionIdBaja" name="transactionIdBaja" placeholder="Introduce el ID de la transacción" required>
        <label for="propietarioBaja">Propietario (solo lectura):</label>
        <input type="text" id="propietarioBaja" name="propietarioBaja" value="${walletAddress}" readonly required style="background:#eee;">
        <label for="motivoBaja">Motivo:</label>
        <select id="motivoBaja" name="motivoBaja" required>
          <option value="burn">Retirar (burn)</option>
          <option value="bodega">Enviar a bodega</option>
        </select>
        <div style="margin-top:12px;">
          <button type="submit" class="dashboard-btn primary">Confirmar Baja</button>
          <button type="button" id="leerQRBajaBtn" class="dashboard-btn secondary" style="margin-left:10px;">Leer QR</button>
        </div>
      </form>`;
    safeModal('Baja de Transacción', bajaFormContent);
    const form = document.getElementById('bajaTransactionForm');
    if (!form) return;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const propietario = document.getElementById('propietarioBaja')?.value?.trim();
      const transactionId = document.getElementById('transactionIdBaja')?.value?.trim();
      const motivo = document.getElementById('motivoBaja')?.value || 'burn';
      if (!propietario || !transactionId) {
        showModal && showModal('Debes completar todos los campos requeridos', 'Validación');
        return;
      }
      if (propietario !== walletAddress) {
        showModal && showModal('El propietario debe coincidir con la wallet importada.', 'Validación');
        console.error('[BURN] Intento de firmar con una wallet distinta a la importada', { propietario, walletAddress });
        return;
      }
      await submitBajaToken({ transactionId, ownerPublicKey: propietario, motivo });
    });
    const leerQRBtn = document.getElementById('leerQRBajaBtn');
    if (leerQRBtn && !leerQRBtn.dataset.bound) {
      leerQRBtn.addEventListener('click', () => {
        showModal && showModal('Futura implementación de lectura QR para baja.', 'Leer QR');
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
      showModal && showModal('Debes completar todos los campos requeridos', 'Validación');
      return;
    }
    if (propietario !== (window.walletAddress || '')) {
      showModal && showModal('El propietario debe coincidir con la wallet importada.', 'Validación');
      console.error('[BURN] Intento de firmar con una wallet distinta a la importada', { propietario, walletAddress: window.walletAddress });
      return;
    }

    await submitBajaToken({ transactionId, ownerPublicKey: propietario, motivo });
  });

  const leerQRBtn = document.getElementById('leerQRBajaBtn');
  if (leerQRBtn && !leerQRBtn.dataset.bound) {
    leerQRBtn.addEventListener('click', () => {
      showModal && showModal('Futura implementación de lectura QR para baja.', 'Leer QR');
    });
    leerQRBtn.dataset.bound = '1';
  }
}

export async function submitBajaToken({ transactionId, ownerPublicKey, motivo, utxoTxId, utxoOutputIndex }) {
  try {
    showProgressModal && showProgressModal('Procesando baja...', 'Baja de Token', [
      'Validando datos...', 'Buscando transacción...', 'Creando transacción de baja...'
    ]);
    const result = await fetchData('/baja-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, ownerPublicKey, motivo, utxoTxId, utxoOutputIndex })
    });
    closeCurrentModal && closeCurrentModal();
    if (result?.success) {
      showModal && showModal(`✅ ${result.message}<br>ID: <code>${result.transactionId}</code><br>Destino: <code>${result.destino}</code>`, 'Baja de Token Exitosa');
      showToast && showToast('Baja realizada correctamente', 'success');
    } else {
      showModal && showModal(`❌ Error: ${result?.error || 'No se pudo realizar la baja'}`, 'Error Baja Token');
      showToast && showToast('Error en baja', 'error');
    }
  } catch (err) {
    closeCurrentModal && closeCurrentModal();
    showModal && showModal(`Error al realizar la baja: ${err.message}`, 'Error Baja Token');
    showToast && showToast('Error de conexión', 'error');
  }
}
