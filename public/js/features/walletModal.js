// UTXO Set lookup for Winery card (single definition at end)
export async function handleUTXOCheckClick() {
  showToast('Consultando UTXO Set (wallet global)...', 'info');
  try {
    const res = await fetch(`${apiBaseUrl}/utxo-balance/global`);
    const data = await res.json();
    if (data.error) {
      showModal(`Error: ${data.error}`, 'Error UTXO');
      showToast('Error en consulta UTXO', 'error');
      return;
    }
    const utxoHtml = `
      <div class="utxo-result-modal">
        <h4>🔗 UTXO Set</h4>
        <p><strong>Dirección:</strong><br/><span style="word-break:break-all;font-family:monospace;">${data.address}</span></p>
        <p><strong>Balance UTXO:</strong> <span class="utxo-balance">${data.balance}</span></p>
        <p><strong>UTXOs disponibles:</strong> ${data.utxos.length}</p>
        <div class="utxo-list-section">
          <h5>Detalles de UTXOs:</h5>
          <div id="utxoListContainer" class="utxo-list-container">
            ${data.utxos.map(u => `
              <div class='utxo-card'>
                <div class='utxo-card-details'>
                  <div class='utxo-card-address'>Address: ${u.address}</div>
                  <div class='utxo-card-amount'>Amount: ${u.amount}</div>
                  <div class='utxo-card-meta'>txId: ${u.txId} • outputIndex: ${u.outputIndex}</div>
                </div>
                <div class='utxo-card-actions'>
                  <button class='dashboard-btn secondary utxo-copy-btn' data-txid='${u.txId}'>Copy TXID</button>
                  <button class='dashboard-btn burn-btn' data-txid='${u.txId}' data-output-index='${u.outputIndex}'>BURN</button>
                </div>
              </div>`).join('')}
          </div>
        </div>
        <p><strong>Consulta:</strong> ${new Date().toLocaleString()}</p>
      </div>`;
    showModal(utxoHtml, 'UTXO Set');
    setTimeout(() => {
      const container = document.getElementById('utxoListContainer');
      if (container && !container.dataset.bound) {
        container.addEventListener('click', async (ev) => {
          // ...existing code...
        });
        container.dataset.bound = '1';
      }
    }, 50);
    showToast(`UTXO Set consultado: ${data.utxos.length} UTXOs`, 'success');
  } catch (err) {
    console.error('[walletModal] UTXO fetch error', err);
    showModal('Error al consultar UTXO Set:<br><pre>' + (err?.message || err) + '</pre>', 'Error de Conexión');
    showToast('Error de conexión', 'error');
  }
}
// Wallet Modal Feature Module (ESM)
// Extracted from legacy fetchData.js for incremental migration.
// Responsibilities:
//  - showWalletModal(): render and display the wallet interaction modal
//  - setupWalletModalEvents(): attach event listeners for balance, UTXO set, and hardware wallet file upload
//  - Pure UI + network calls via fetch / fetchData; relies on existing global CSS & modal containers.

import { apiBaseUrl } from '../core/config.js';
import { getCurrentPublicKey } from '../core/walletUtils.js';
import { fetchData } from '../core/api.js';
import { showModal, showToast } from '../ui/modals.js';
import { submitBajaToken } from './bajaToken.js';

// Render & open the wallet modal
export function showWalletModal() {
  const modal = document.getElementById('walletModalContainer');
  const modalBody = document.getElementById('walletModalBody');
  if (!modal || !modalBody) {
    console.warn('[walletModal] Modal container elements not found');
    return;
  }
  const walletContent = `
    <h3>Consultar Balance de Clave Pública:</h3>
    <div style="margin:15px 0;">
      <label for="addressInputModal" style="display:block;margin-bottom:5px;font-weight:bold;">Clave Pública:</label>
      <input type="text" id="addressInputModal" placeholder="Introduce la clave pública..." style="width:100%;padding:12px;border:2px solid #ddd;border-radius:8px;margin-bottom:15px;" />
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="submitPublicKeyModal" style="flex:1;min-width:150px;">Balance</button>
      </div>
    </div>
    <h3>Cargar Wallet desde Archivo:</h3>
    <div style="margin:15px 0;">
  `;
  modalBody.innerHTML = walletContent;
  // Ensure modal is visible even if it has .hidden
  modal.classList.remove('hidden');
  modal.style.display = 'block';
  // Al abrir el modal, consulta la clave pública activa del backend
  (async () => {
    // Ya no se autocompleta la clave pública global, el usuario debe introducirla manualmente si desea consultar balance o UTXO.
    // Actualizar el header con la clave pública global
    try {
      const { updateGlobalWalletPubKeyHeader } = await import('./walletGlobal.js');
      if (typeof updateGlobalWalletPubKeyHeader === 'function') {
        updateGlobalWalletPubKeyHeader();
      }
    } catch (e) { console.warn('No se pudo actualizar el header de la wallet global:', e); }
    // Autocompletar clave pública global en el input si está disponible
    try {
      const resp = await fetch(`${apiBaseUrl}/public-key`);
      const data = await resp.json();
      const input = document.getElementById('addressInputModal');
      if (data && data.publicKey && input && !input.value) {
        input.value = data.publicKey;
      }
    } catch (e) { /* opcional: ignorar si falla */ }

    // Log the modal content para depuración
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (modalTitle && modalBody) {
      console.log('[MODAL-DEBUG] Modal Title:', modalTitle.textContent);
      console.log('[MODAL-DEBUG] Modal Body HTML:', modalBody.innerHTML);
    }
  })();
  const closeButton = modal.querySelector('.close');
  if (closeButton) closeButton.onclick = () => { modal.style.display = 'none'; };
  setupWalletModalEvents();
}

// Attach event listeners for wallet modal actions
export function setupWalletModalEvents() {
  // Balance lookup
  const submitBalanceBtn = document.getElementById('submitPublicKeyModal');
  if (submitBalanceBtn && !submitBalanceBtn.dataset.bound) {
    submitBalanceBtn.addEventListener('click', async () => {
      const publicKey = document.getElementById('addressInputModal')?.value?.trim();
      if (!publicKey) { showModal('Por favor, introduce una clave pública válida.', 'Error de Validación'); return; }
      showToast('Consultando balance...', 'info');
      try {
        const response = await fetch(`${apiBaseUrl}/address-balance`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ address: publicKey }) });
        const data = await response.json();
        if (data.error) { showModal(`Error al consultar balance: ${data.error}`, 'Error'); showToast('Error en consulta de balance', 'error'); return; }
        const modalHtml = `
          <div id="sideModalPanel" style="background: #220F17; color: #fff; box-shadow: rgba(0,0,0,0.25) 0px 8px 24px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08); padding: 16px; max-width: 600px; width: min(42vw, 600px); max-height: 80vh; overflow: auto; display: block; margin: 48px auto 0 auto;">
            <p><strong>Direccion:</strong><br/><span style="word-break:break-all;font-family:monospace;">${data.address}</span></p>
            <p><strong>Balance:</strong> <span style="color:#f7931a;font-weight:bold;font-size:18px;">${data.balance}</span></p>
            <p><strong>Estado:</strong> ${data.message}</p>
            <p><strong>Consulta:</strong> ${new Date().toLocaleString()}</p>
          </div>`;
        showModal(modalHtml, 'Balance');
        showToast('Balance consultado exitosamente', 'success');
      } catch (err) {
        console.error('[walletModal] balance fetch error', err);
        showModal('Ocurrió un error inesperado al consultar el balance.', 'Error de Conexión');
        showToast('Error de conexión', 'error');
      }
    });
    submitBalanceBtn.dataset.bound = '1';
  }





  // Hardware wallet file upload
  const submitFileBtn = document.getElementById('submitHardwareWalletModal');
  if (submitFileBtn && !submitFileBtn.dataset.bound) {
    submitFileBtn.addEventListener('click', async () => {
      const fileInput = document.getElementById('fileInputModal');
      const file = fileInput?.files?.[0];
      if (!file) { showModal('No se ha seleccionado ningún archivo para cargar.', 'Error de Validación'); return; }
      showToast('Subiendo archivo de wallet...', 'info');
      const formData = new FormData(); formData.append('usbPath', file);
      try {
        const response = await fetch(`${apiBaseUrl}/hardware-address`, { method:'POST', body: formData });
        if (!response.ok) {
          const errorMessage = await response.text(); showModal(`Error al subir archivo: ${errorMessage}`, 'Error de Carga'); showToast('Error al subir archivo', 'error'); return;
        }
        const data = await response.json();
        if (data.message === 'Success' && data.publicKey) {
          const inputEl = document.getElementById('addressInputModal'); if (inputEl) inputEl.value = data.publicKey;
            const modalHtml = `
              <div class="wallet-upload-modal">
                <h4>📁 Archivo Cargado Exitosamente</h4>
                <p><strong>✅ Archivo:</strong> ${file.name}</p>
                <p><strong>Tamaño:</strong> ${(file.size/1024).toFixed(2)} KB</p>
                <p><strong>Clave pública cargada:</strong></p>
                <p style="word-break:break-all;font-family:monospace;background:#1a1320;color:#fff;padding:10px;border-radius:5px;font-size:12px;">${data.publicKey}</p>
                <p><strong>Fecha de carga:</strong> ${new Date().toLocaleString()}</p>
              </div>`;
            showModal(modalHtml, 'Carga de Wallet');
            showToast('Archivo de wallet cargado', 'success');
        } else {
          showModal('Error al cargar el wallet o no se encontró una clave pública válida en el archivo.', 'Error de Wallet');
          showToast('Error al procesar wallet', 'error');
        }
      } catch (err) {
        showModal(`Error de conexión: ${err.message}`, 'Error de Red'); showToast('Error de conexión', 'error');
      }
    });
    submitFileBtn.dataset.bound = '1';
  }
}


// Auto-bind wallet button if present (non-breaking; OK if legacy also binds)
export function attachWalletButton() {
  const walletButton = document.getElementById('walletModal');
  if (walletButton && !walletButton.dataset.bound) {
    walletButton.addEventListener('click', showWalletModal);
    walletButton.dataset.bound = '1';
  }
}

// Optional initialization helper
export function initWalletModalFeature() {
  attachWalletButton();
}
