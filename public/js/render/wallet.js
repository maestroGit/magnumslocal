// Wallet renderers & helpers (ESM)
// Exports: renderBalance, renderPublicKey, checkPublicKeyBalance, uploadFile

import { safeModal, showModal, showToast } from '../ui/modals.js';
import { apiBaseUrl } from '../core/config.js';
import { fetchData } from '../core/api.js';

export function renderBalance(balanceData) {
  const balanceModalContent = `
    <div class="modal-info">
      
      <p><strong>Estado:</strong> ${balanceData.message || 'Consultado'}</p>
    </div>
    <div class="modal-body">
      <div class="modal-info">
        <p><strong>Clave Pública:</strong></p>
        <p class="wallet-publickey-value tx-id">${balanceData.address}</p>
        <p><strong>Balance Actual:</strong> <span class="wallet-balance">${balanceData.balance}</span></p>
      </div>
      <p>Información Adicional:</p>
      <ul>
        <li><strong>Fecha de consulta:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    </div>`;
  safeModal('Balance de Wallet', balanceModalContent);
}

export function renderPublicKey(publicKey) {
  const publicKeyModalContent = `
    <div class="modal-info">
      <p><strong>🔑 Clave Pública Actual</strong></p>
      <p><strong>Estado:</strong> Activa</p>
    </div>
    <div class="modal-body">
      <h3>Información de la Clave:</h3>
      <div class="modal-info">
        <p><strong>Clave Pública:</strong></p>
        <pre class="json-display">${JSON.stringify(publicKey.publicKey, null, 2)}</pre>
      </div>
      <h3>Detalles:</h3>
      <ul>
        <li><strong>Formato:</strong> JSON</li>
        <li><strong>Tipo:</strong> Clave pública ECDSA</li>
        <li><strong>Fecha de consulta:</strong> ${new Date().toLocaleString()}</li>
        <li><strong>Estado de la red:</strong> Conectado</li>
      </ul>
    </div>`;
  safeModal('Clave Pública del Sistema', publicKeyModalContent);
}

export async function checkPublicKeyBalance() {
  try {
    const publicKey = document.getElementById('addressInput')?.value?.trim();
    if (!publicKey) {
      showModal && showModal('Por favor, introduce una clave pública válida.', 'Error de Validación');
      return;
    }
    showToast && showToast('Consultando balance...', 'info');
    const response = await fetch(`${apiBaseUrl}/address-balance`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: publicKey })
    });
    const data = await response.json();
    if (data.error) {
      showModal && showModal(`Error al consultar balance: ${data.error}`, 'Error');
      showToast && showToast('Error en consulta de balance', 'error');
    } else {
      renderBalance(data);
      showToast && showToast('Balance consultado exitosamente', 'success');
    }
  } catch (error) {
    console.error('Error fetching balance:', error);
    showModal && showModal('Ocurrió un error inesperado al consultar el balance.', 'Error de Conexión');
    showToast && showToast('Error de conexión', 'error');
  }
}

export async function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput?.files?.[0];
  if (!file) {
    showModal && showModal('No se ha seleccionado ningún archivo para cargar.', 'Error de Validación');
    console.warn('No file selected for hardware wallet upload.');
    return;
  }
  showToast && showToast('Subiendo archivo de wallet...', 'info');
  const formData = new FormData(); formData.append('usbPath', file);
  try {
    const response = await fetch(`${apiBaseUrl}/hardware-address`, { method: 'POST', body: formData });
    if (!response.ok) {
      const errorMessage = await response.text();
      console.error('Error uploading file:', errorMessage);
      showModal && showModal(`Error al subir archivo: ${errorMessage}`, 'Error de Carga');
      showToast && showToast('Error al subir archivo', 'error');
      return;
    }
    const data = await response.json();
    if (data.message === 'Success' && data.publicKey) {
      const input = document.getElementById('addressInput'); if (input) input.value = data.publicKey;
      const successMessage = `
        <div class="modal-info">
          <p><strong>✅ Archivo subido exitosamente!</strong></p>
          <p><strong>Clave pública cargada:</strong></p>
          <p class="wallet-publickey-value tx-id">${data.publicKey}</p>
        </div>
        <div class="modal-body">
          <h3>Información del archivo:</h3>
          <ul>
            <li><strong>Nombre del archivo:</strong> ${file.name}</li>
            <li><strong>Tamaño:</strong> ${(file.size/1024).toFixed(2)} KB</li>
            <li><strong>Fecha de carga:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Estado:</strong> Cargado exitosamente</li>
          </ul>
        </div>`;
  safeModal('Wallet Cargado', successMessage);
      showToast && showToast('Archivo de wallet cargado', 'success');
    } else {
      showModal && showModal('Error al cargar el wallet o no se encontró una clave pública válida en el archivo.', 'Error de Wallet');
      showToast && showToast('Error al procesar wallet', 'error');
    }
  } catch (error) {
    showModal && showModal(`Error de conexión: ${error.message}`, 'Error de Red');
    showToast && showToast('Error de conexión', 'error');
  }
}
