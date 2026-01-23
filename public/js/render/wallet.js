// Wallet renderers & helpers (ESM)
// Exports: renderBalance, renderPublicKey, checkPublicKeyBalance, uploadFile

import { safeModal, showModal, showToast } from '../ui/modals.js';
import { apiBaseUrl } from '../core/config.js';
import { fetchData } from '../core/api.js';

export function renderBalance(balanceData) {
  const balanceModalContent = `
    <div class="modal-body">
      <div class="modal-info">
        <p><strong>Public Key:</strong></p>
        <p class="wallet-publickey-value tx-id">${balanceData.address}</p>
        <p><strong>Balance:</strong> <span>${balanceData.balance}</span></p>
      </div>
      <ul>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    </div>`;
  safeModal('Balance Wallet', balanceModalContent);
}

export function renderPublicKey(publicKey) {
  const publicKeyModalContent = `
    <div class="modal-info">
      <p><strong>Public Key</strong></p>
      <p><strong>Status:</strong> Active</p>
    </div>
    <div class="modal-body">
      <div class="modal-info">
        <p><strong>Public Key:</strong></p>
        <pre class="json-display">${JSON.stringify(publicKey.publicKey, null, 2)}</pre>
      </div>
      <ul>
        <li><strong>Format:</strong> JSON</li>
        <li><strong>Type:</strong> ECDSA Public Key</li>
        <li><strong>Query Date:</strong> ${new Date().toLocaleString()}</li>
        <li><strong>Network Status:</strong> Connected</li>
      </ul>
    </div>`;
  safeModal('System Public Key', publicKeyModalContent);
}

export async function checkPublicKeyBalance() {
  try {
    const publicKey = document.getElementById('addressInput')?.value?.trim();
    if (!publicKey) {
      showModal && showModal('Please enter a valid public key.', 'Validation Error');
      return;
    }
    showToast && showToast('Checking balance...', 'info');
    const response = await fetch(`${apiBaseUrl}/address-balance`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: publicKey })
    });
    const data = await response.json();
    if (data.error) {
      showModal && showModal(`Error checking balance: ${data.error}`, 'Error');
      showToast && showToast('Error checking balance', 'error');
    } else {
      renderBalance(data);
      showToast && showToast('Balance checked successfully', 'success');
    }
  } catch (error) {
    console.error('Error fetching balance:', error);
    showModal && showModal('An unexpected error occurred while checking the balance.', 'Connection Error');
    showToast && showToast('Connection error', 'error');
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
  showToast && showToast('Uploading wallet file...', 'info');
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
          <p><strong>✅ File uploaded successfully!</strong></p>
          <p><strong>Loaded Public Key:</strong></p>
          <p class="wallet-publickey-value tx-id">${data.publicKey}</p>
        </div>
        <div class="modal-body">
          <h3>File Information:</h3>
          <ul>
            <li><strong>File Name:</strong> ${file.name}</li>
            <li><strong>Size:</strong> ${(file.size/1024).toFixed(2)} KB</li>
            <li><strong>Upload Date:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Status:</strong> Successfully uploaded</li>
          </ul>
        </div>`;
  safeModal('Wallet Loaded', successMessage);
      showToast && showToast('Wallet file uploaded', 'success');
    } else {
      showModal && showModal('Error loading wallet or no valid public key found in the file.', 'Wallet Error');
      showToast && showToast('Error processing wallet', 'error');
    }
  } catch (error) {
    showModal && showModal(`Connection error: ${error.message}`, 'Network Error');
    showToast && showToast('Connection error', 'error');
  }
}
