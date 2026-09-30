// Verification Feature (ESM)
// Extracted from legacy fetchData.js
// Exports: verifyQRProof(qrData)

import { fetchData } from '../core/api.js';
import { showModal, showModalForm, showToast, showProgressModal, closeCurrentModal, escapeHtml } from '../ui/modals.js';

export async function verifyQRProof(qrData) {
  try {
    console.log('[verifyQRProof] called with qrData:', qrData);
    let inlineSpinnerTimer = null;
    const removeInlineSpinner = () => {
      const ex = document.getElementById('inlineFallbackProgress');
      if (ex) ex.remove();
      // keep spinner style for reuse
    };

    if (typeof showProgressModal === 'function') {
      showProgressModal('Verifying authenticity...', 'Blockchain', [
        'Analyzing QR...',
        'Consult blockchain...',
        'Verifying ownership...'
      ]);
    } else {
      console.info('[verifyQRProof] showProgressModal not available, scheduling inline spinner (debounced 150ms)');
      inlineSpinnerTimer = setTimeout(() => {
        const existingSpinner = document.getElementById('inlineFallbackProgress');
        if (existingSpinner) existingSpinner.remove();
        const spinner = document.createElement('div');
        spinner.id = 'inlineFallbackProgress';
        spinner.style.position = 'fixed';
        spinner.style.left = '50%';
        spinner.style.top = '18%';
        spinner.style.transform = 'translateX(-50%)';
        spinner.style.zIndex = 99998;
        spinner.style.pointerEvents = 'none';
        spinner.innerHTML = `<div class="sec009-inline-spinner-wrap">
          <span class="spinner sec009-inline-spinner-icon"></span>
          <span class="sec009-inline-spinner-text">Verificando...</span>
        </div>`;
        document.body.appendChild(spinner);
      }, 150);
    }

    const response = await fetchData('/verify-qr-proof', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData })
    });

    console.log('[verifyQRProof] server response:', response);

    if (inlineSpinnerTimer) { clearTimeout(inlineSpinnerTimer); inlineSpinnerTimer = null; }
    removeInlineSpinner();
    if (typeof closeCurrentModal === 'function') closeCurrentModal();

    if (response.error) {
      if (typeof showModal === 'function') showModal(`❌ Error: ${escapeHtml(response.error)}`, 'Error de Verificación');
      else console.error('verifyQRProof error:', response.error);
      return;
    }

    const { verified, verificationDetails, loteData } = response;
    const loteInfo = (loteData && typeof loteData === 'object') ? loteData : { value: loteData };

    if (response.status === 'no_blockchain_proof') {
      const raw = typeof loteData === 'object' ? JSON.stringify(loteData, null, 2) : String(loteData);
      const msg = `⚠️ QR NO check blockchain (versión antigua)\n\nPayload:\n${raw}`;
      const escapedMsg = escapeHtml(msg);
      if (typeof showModal === 'function') {
        showModal(`<pre style="white-space:pre-wrap">${escapedMsg}</pre>`, '⚠️ Sin prueba blockchain');
      } else {
        const existing = document.getElementById('inlineFallbackModal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'inlineFallbackModal';
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
          <div class="modal-content" style="max-width:720px; margin-top:40px;">
            <span class="close">&times;</span>
            <h2 class="modal-title">⚠️ Sin prueba blockchain</h2>
            <div class="modal-body"><pre style="white-space:pre-wrap; margin:0">${escapedMsg}</pre></div>
            <div class="modal-actions" style="text-align:right; margin-top:12px;">
              <button class="dashboard-btn secondary modal-close-btn">Cerrar</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
        const escHandler = (ev) => { if (ev.key === 'Escape') removeModal(); };
        function removeModal(){ document.removeEventListener('keydown', escHandler); modal.remove(); }
        modal.querySelector('.close')?.addEventListener('click', removeModal);
        modal.querySelector('.modal-close-btn')?.addEventListener('click', removeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) removeModal(); });
        document.addEventListener('keydown', escHandler);
      }
      if (typeof showToast === 'function') showToast('⚠️ QR sin prueba blockchain', 'warning');
      return;
    }

    if (verified) {
      const txId = verificationDetails?.transactionId || 'N/A';
      const verifiedAt = verificationDetails?.verifiedAt ? new Date(verificationDetails.verifiedAt).toLocaleString() : 'N/A';
      const respStatus = response.status || 'unknown';
      const respMessage = response.message || '';
      const details = response.details || verificationDetails || {};
      const detailTxId = details.transactionId || txId || 'N/A';
      const txExists = details.transactionExists === true ? 'Sí' : (details.transactionExists === false ? 'No' : 'Desconocido');
      const inMempool = details.inMempool === true ? 'Sí' : (details.inMempool === false ? 'No' : 'Desconocido');

      // Normalize owner from multiple possible fields
      const ownerPubNormalized = details.ownerPublicKey || details.currentOwner || verificationDetails?.owner || null;
      const ownerShort = ownerPubNormalized ? ownerPubNormalized.substring(0, 20) + '...' : 'N/A';
      const ownerPub = ownerPubNormalized || 'N/A';

      // Prefer loteId from payload; fall back to txId by convention
      const loteIdDisplay = loteInfo.loteId || loteInfo.value || detailTxId || txId || 'N/A';
      const verifiedAtRaw = details.verifiedAt || verificationDetails?.verifiedAt || null;
      const verifiedAtDisplay = verifiedAtRaw ? new Date(verifiedAtRaw).toLocaleString() : verifiedAt;

      const successText = `✅ **Authenticity Verified**\n\n` +
            `🍷 **Batch:** ${loteIdDisplay}\n` +
            `👤 **Owner:** ${ownerShort}\n` +
            `🔗 **Transfer:** ${detailTxId}\n` +
            `⏰ **Verified:** ${verifiedAtDisplay}\n\n` +
            `Estado: ${respStatus} — ${respMessage}`;

      const successContentHtml = `
        <div class="modal-info">
          <table class="modal-table" style="width:100%; border-collapse:collapse;">
            <tr><td style="width:28%; padding:6px; font-weight:600;">Status</td><td style="padding:6px;">${escapeHtml(respStatus)} <small style="color:#666;">${escapeHtml(respMessage)}</small></td></tr>
            <tr><td style="padding:6px; font-weight:600;">Trans ID</td><td style="padding:6px;"><code id="txid-inline">${escapeHtml(detailTxId)}</code></td></tr>
            <tr><td style="padding:6px; font-weight:600;">In Mempool</td><td style="padding:6px;">${escapeHtml(inMempool)}</td></tr>
            <tr><td style="padding:6px; font-weight:600;">Transfer Exists</td><td style="padding:6px;">${escapeHtml(txExists)}</td></tr>
            <tr><td style="padding:6px; font-weight:600;">Owner Public Key</td><td style="padding:6px; word-break:break-all;">${escapeHtml(ownerPub)}</td></tr>
            <tr><td style="padding:6px; font-weight:600;">Verified At</td><td style="padding:6px;">${escapeHtml(verifiedAtDisplay)}</td></tr>
          </table>
          <div style=\"margin-top:12px; display:flex; gap:8px; justify-content:flex-end;\"> 
            <button class=\"dashboard-btn primary copy-txid-btn\" data-copy-txid=\"${escapeHtml(detailTxId)}\">Copy TXID</button>
          </div>
          <hr style="margin-top:12px;" />
          <pre style="white-space:pre-wrap; margin:0">${escapeHtml(successText)}</pre>
        </div>`;

      let shown = false;
      if (typeof showModalForm === 'function') {
        try { showModalForm('🔐 Autenticidad Verificada', successContentHtml); shown = true; } catch {}
      }
      if (!shown && typeof showModal === 'function') {
        try { showModal(successText, '🔐 Autenticidad Verificada'); shown = true; } catch {}
      }
      if (!shown) {
        const existing = document.getElementById('inlineFallbackModal'); if (existing) existing.remove();
        const modal = document.createElement('div'); modal.id = 'inlineFallbackModal'; modal.className = 'modal'; modal.style.display = 'block';
        modal.innerHTML = `
          <div class="modal-content" style="max-width:720px; margin-top:40px;">
            <span class="close">&times;</span>
            <h2 class="modal-title">🔐 Autenticidad Verificada</h2>
            <div class="modal-body">${successContentHtml}</div>
            <div class="modal-actions" style="text-align:right; margin-top:12px;"><button class="dashboard-btn secondary modal-close-btn">Cerrar</button></div>
          </div>`;
        document.body.appendChild(modal);
        const remove = () => modal.remove();
        modal.querySelector('.close')?.addEventListener('click', remove);
        modal.querySelector('.modal-close-btn')?.addEventListener('click', remove);
        modal.addEventListener('click', (e) => { if (e.target === modal) remove(); });
      }

      if (typeof showToast === 'function') showToast('✅ Botella auténtica verificada', 'success');
    } else {
      const loteIdDisplay = loteInfo.loteId || loteInfo.value || (response?.details?.transactionId || 'N/A');
      const reason = response.reason || response.message || 'Transacción no válida';
      const failHtml = `⚠️ **Verificación Fallida**\n\n` +
            `🍷 **Lote:** ${loteIdDisplay}\n` +
            `❌ **Razón:** ${reason}\n\n` +
            `Esta botella no puede ser verificada en blockchain.`;

      let shownFail = false;
      const failContentHtml = `<pre style="white-space:pre-wrap; margin:0">${escapeHtml(failHtml)}</pre>`;
      if (typeof showModalForm === 'function') { try { showModalForm('⚠️ Verificación Fallida', failContentHtml); shownFail = true; } catch {} }
      if (!shownFail && typeof showModal === 'function') { try { showModal(failHtml, '⚠️ Verificación Fallida'); shownFail = true; } catch {} }
      if (!shownFail) {
        const existing = document.getElementById('inlineFallbackModal'); if (existing) existing.remove();
        const modal = document.createElement('div'); modal.id = 'inlineFallbackModal'; modal.className = 'modal'; modal.style.display = 'block';
        modal.innerHTML = `
          <div class="modal-content" style="max-width:720px; margin-top:40px;">
            <span class="close">&times;</span>
            <h2 class="modal-title">⚠️ Verificación Fallida</h2>
            <div class="modal-body">${failContentHtml}</div>
            <div class="modal-actions" style="text-align:right; margin-top:12px;"><button class="dashboard-btn secondary modal-close-btn">Cerrar</button></div>
          </div>`;
        document.body.appendChild(modal);
        const remove = () => modal.remove();
        modal.querySelector('.close')?.addEventListener('click', remove);
        modal.querySelector('.modal-close-btn')?.addEventListener('click', remove);
        modal.addEventListener('click', (e) => { if (e.target === modal) remove(); });
      }
      if (typeof showToast === 'function') showToast('⚠️ No se pudo verificar autenticidad', 'warning');
    }
  } catch (error) {
    if (typeof closeCurrentModal === 'function') closeCurrentModal();
    console.error('Error verificando QR:', error);
    if (typeof showModal === 'function') showModal(`❌ Error verificando: ${error.message}`, 'Error');
    else console.error('Error modal:', error.message);
  }
}
