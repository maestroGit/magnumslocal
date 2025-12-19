// Refactored to ESM (was previously a non-module script depending on global verifyQRProof)
// This module provides QR verification test utilities without relying on window.MM or global verifyQRProof.

import { verifyQRProof } from './features/verification.js';
import { showModalForm, showModal, closeCurrentModal } from './ui/modals.js';

function openQRModalWithContent(title, contentHtml) {
  if (typeof showModalForm === 'function') {
    showModalForm(title, contentHtml);
    return;
  }
  const modal = document.getElementById('qrModal');
  const modalTitle = document.getElementById('qrModalTitle');
  const modalBody = document.getElementById('qrModalBody');
  if (!modal || !modalTitle || !modalBody) return;
  modalTitle.textContent = title;
  modalBody.innerHTML = contentHtml;
  modal.style.display = 'block';
}

function closeQRModal() {
  if (typeof closeCurrentModal === 'function') {
    closeCurrentModal();
    return;
  }
  const modal = document.getElementById('qrModal');
  if (modal) modal.style.display = 'none';
}

function showQRTestUI() {
  const content = `
    <div class="test-container" style="max-height:60vh;overflow-y:auto;padding-right:8px;box-sizing:border-box;">
      <div class="dashboard-card" style="min-width:0;word-break:break-word;">
        <div class="input-group">
          <label for="transactionInputInline">Transaction ID:</label>
          <input type="text" id="transactionInputInline" placeholder="Introduce: Transaction ID ej: 45bb3850-a2a0-11f0-bd0f-8327165c6097" style="width:100%;min-width:0;word-break:break-all;">
        </div>
        <div class="card-actions">
          <button class="dashboard-btn primary" id="verifyTransactionBtn">Validate</button>
        </div>
      </div>
      <div class="dashboard-card" style="min-width:0;word-break:break-word;">
        <div class="input-group">
          <label for="qrImageInputInline">Seleccionar código QR:</label>
          <input type="file" id="qrImageInputInline" accept="image/*" style="width:100%;min-width:0;">
        </div>
        <div class="card-actions">
          <button class="dashboard-btn secondary" id="readQRImageBtn">📷 QR-EN DESARROLLO</button>
        </div>
      </div>
      <!-- Botón Cerrar eliminado: solo se cierra con el aspa (X) del modal -->
    </div>`;
  openQRModalWithContent('🔎 Validar transacciones en blocksWine', content);
  const verifyBtn = document.getElementById('verifyTransactionBtn');
  if (verifyBtn) verifyBtn.addEventListener('click', verificarTransactionIDInline);
  const readBtn = document.getElementById('readQRImageBtn');
  if (readBtn) readBtn.addEventListener('click', leerQRImagenInline);
  const closeBtn = document.getElementById('closeQRInline');
  if (closeBtn) closeBtn.addEventListener('click', closeQRModal);
}

async function verificarTransactionIDInline() {
  const inputEl = document.getElementById('transactionInputInline');
  const transactionId = inputEl ? inputEl.value.trim() : '';
  if (!transactionId) {
    if (typeof showModal === 'function') showModal('<p>Introduce un Transaction ID válido.</p>', '❌ Error');
    else alert('Introduce un Transaction ID válido.');
    return;
  }
  try {
    await verifyQRProof(transactionId);
  } catch (err) {
    console.error('[qrProof][ESM] verifyQRProof error:', err);
    if (typeof showModal === 'function') showModal(`<p>Error interno: ${err.message}</p>`, '❌ Error');
  }
}

function leerQRImagenInline() {
  const fileInput = document.getElementById('qrImageInputInline');
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    if (typeof showModal === 'function') showModal('<p>Selecciona una imagen primero.</p>', '❌ Error');
    else alert('Selecciona una imagen primero.');
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const img = new Image();
      img.src = ev.target.result;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
      const maxDim = 1024;
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.floor(w * scale); h = Math.floor(h * scale);
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
      let imageData; try { imageData = ctx.getImageData(0, 0, w, h); } catch (e) { showModal('<p>No se pudo procesar la imagen.</p>', '❌ Error'); return; }
      if (typeof jsQR !== 'function') { showModal('<p>Biblioteca jsQR no disponible.</p>', '❌ Error'); return; }
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (!code) { showModal('<p>No se detectó un código QR en la imagen.</p>', '❌ No encontrado'); return; }
      try { await verifyQRProof(code.data); } catch (err) { console.error('[qrProof][ESM] verifyQRProof threw:', err); showModal(`<p>Error interno: ${err.message}</p>`, '❌ Error'); }
    } catch (err) {
      if (typeof showModal === 'function') showModal('<p>Error procesando la imagen.</p>', '❌ Error');
    }
  };
  reader.readAsDataURL(file);
}

// DOM bindings
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('checkQRButton');
  if (btn) btn.addEventListener('click', showQRTestUI);
  const qrModal = document.getElementById('qrModal');
  if (qrModal) {
    qrModal.querySelectorAll('.close').forEach(el => el.addEventListener('click', closeQRModal));
    window.addEventListener('click', (ev) => { if (ev.target === qrModal) closeQRModal(); });
  }
});

// No globals exported; fully ESM. Legacy references to window.verifyQRProof can be removed.

export { showQRTestUI, verificarTransactionIDInline, leerQRImagenInline };
