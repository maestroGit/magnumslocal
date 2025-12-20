// Traceability feature module (ESM)
// Exposes: showTraceabilityModal, generateQRWithProof, showQRModal
// Mirrors legacy implementations but isolated for maintainability.

import { fetchData } from '../core/api.js';
import { safeModal, showModal, showToast, showProgressModal, closeCurrentModal } from '../ui/modals.js';

// 🔐 Genera un QR con prueba blockchain (propiedad / verificación)
export const generateQRWithProof = async (loteId, transactionId) => {
  try {
    showProgressModal('QR with proof...', 'Blockchain', [
      'Searching transaction...',
      'Verifying ownership...',
      'Generating secure QR...',
    ]);

    const response = await fetchData('/qr-with-proof', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loteId, transactionId })
    });

    setTimeout(() => {
      closeCurrentModal();

      if (response.error) {
        let extraMsg = '';
        if (response.error && response.error.includes('Transaction not found in blockchain or mempool')) {
          extraMsg = `<br><br><span style='color:#b71c1c;'>[UTXO MEMPOOL] Double spend detected: txId=init-fund-1, outputIndex=0. Transaction rejected.</span>`;
        }
        showModal(`❌ Error: ${response.error}${extraMsg}`, 'Error');
        return;
      }

      showQRModal(response.qrBase64, {
        loteId: response.proof?.loteId || response.loteData?.loteId || response.loteId || 'N/A',
        owner: response.proof?.owner || response.loteData?.owner || 'N/A',
        transactionId: response.proof?.transactionId || response.loteData?.transactionId || response.transactionId || 'N/A',
        verificationData: {
          owner: response.proof?.owner || response.verificationData?.owner || response.loteData?.owner || 'N/A',
            transactionId: response.proof?.transactionId || response.verificationData?.transactionId || response.loteData?.transactionId || 'N/A',
            verifiedAt: response.proof?.verifiedAt || response.verificationData?.verifiedAt || null,
        }
      });

      showToast('✅ QR with blockchain proof generated', 'success');
    }, 1500);
  } catch (error) {
    closeCurrentModal();
    console.error('Error generating QR with proof:', error);
    showModal(`❌ Error generating QR: ${error.message}`, 'Error');
  }
};

// Modal para mostrar QR (propiedad / verificación)
export const showQRModal = (qrBase64, loteData) => {
  let cleanBase64 = (qrBase64 || '').replace(/\s+/g, '');
  let src = cleanBase64;
  if (!src.startsWith('data:image/png;base64,')) src = 'data:image/png;base64,' + src;
  src = src.replace(/^(data:image\/png;base64,)+/, 'data:image/png;base64,');

  import('../core/walletUtils.js').then(async ({ getCurrentPublicKey }) => {
    const propietario = await getCurrentPublicKey();
    const transaccion = loteData.verificationData?.transactionId || 'N/A';
    let advertencia = '';
    if (propietario === 'N/A' || transaccion === 'N/A') {
      advertencia = `<div style='color:#b71c1c; margin-bottom:10px;'><strong>⚠️ QR generated without valid blockchain data.<br>Verify that the transaction exists and is confirmed.</strong></div>`;
    }
    const modalContent = `
      <div style="text-align:center;">
        <h2>QR with transaction data</h2>
        ${advertencia}
        <img id="qrImageModal" src="${src}" alt="QR Blockchain" style="max-width:250px; margin:20px 0;">
        <div style="margin-top:15px; text-align:left;">
          <strong>Batch ID:</strong> ${loteData.loteId || 'N/A'}<br>
          <strong>Owner:</strong> ${propietario}<br>
          <strong>Transaction:</strong> ${transaccion}<br>
          <strong>Verified at:</strong> ${loteData.verificationData?.verifiedAt ? new Date(loteData.verificationData.verifiedAt).toLocaleString() : 'N/A'}<br>
        </div>
        <div style="margin-top:20px;">
          <a href="${src}" download="QR_${loteData.loteId || 'lote'}.png" style="background:#1976d2;color:#fff;padding:10px 24px;border:none;border-radius:6px;cursor:pointer;font-size:1em;text-decoration:none;display:inline-block;">💾 Download QR</a>
        </div>
      </div>
    `;
    safeModal('Datos', modalContent);

    // Asignación de datos (para compatibilidad con antiguo modal clásico)
    setTimeout(() => {
      if (loteData) {
        const elLoteId = document.getElementById('qrLoteId');
        const elPropietario = document.getElementById('qrPropietario');
        const elTransaccion = document.getElementById('qrTransaccion');
        const elVerificadoEn = document.getElementById('qrVerificadoEn');
        if (elLoteId) elLoteId.textContent = loteData.loteId || 'N/A';
        if (elPropietario) elPropietario.textContent = propietario;
        if (elTransaccion) elTransaccion.textContent = transaccion;
        if (elVerificadoEn) elVerificadoEn.textContent = loteData.verificationData?.verifiedAt ? new Date(loteData.verificationData.verifiedAt).toLocaleString() : 'N/A';
      }
    }, 0);
  });
};

//  🏷️ 🚀 Muestra formulario de registro de trazabilidad tras una transacción exitosa
export const showTraceabilityModal = (transactionData) => {
  console.log('[TRACEABILITY][MODULE] showTraceabilityModal called', { transactionData });
  const traceabilityFormContent = `
    <div class="transaction-info" style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0;">✅ Transaction Completed</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
        <p><strong>ID:</strong><br><code style="background: rgba(255,255,255,0.2); padding: 2px 5px; border-radius: 3px; font-size: 0.8em;">${(transactionData.id||'').substring(0,20)}...</code></p>
        <p><strong>Amount:</strong><br>${transactionData.amount}€</p>
        <p><strong>Recipient:</strong><br><code style="background: rgba(255,255,255,0.2); padding: 2px 5px; border-radius: 3px; font-size: 0.8em;">${(transactionData.recipient||'').substring(0,15)}...</code></p>
        <p><strong>Date:</strong><br>${(function(){ const ts = transactionData.timestamp || Date.now(); const d = new Date(ts); return isNaN(d.getTime())? new Date().toLocaleString() : d.toLocaleString(); })()}</p>
      </div>
    </div>
    <p style="background: #46A24A; border: 1px solid #19af26ff; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 0.9em;">
      <strong>💡 Information:</strong> Transaction data will be automatically included in the blockchain proof QR.
    </p>
    <form id="traceabilityForm">
      <input type="hidden" id="transactionId" value="${transactionData.id}">
      <input type="hidden" id="ownerPublicKey" value="${transactionData.recipient}">
      <input type="hidden" id="transactionAmount" value="${transactionData.amount}">
      <input type="hidden" id="transactionTimestamp" value="${transactionData.timestamp || Date.now()}">
      <div id="altaCampos">
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div><label for="loteId">Lote ID:</label><input type="text" id="loteIdAlta" placeholder="Se genera automáticamente si está vacío"></div>
          <div><label for="precio">Price:</label><input type="text" id="precio" value="${transactionData.amount}€" readonly style="background: #f8f9fa; color: #6c757d;"></div>
        </div>
        <label for="nombreProducto">Product Name:</label>
        <input type="text" id="nombreProducto" placeholder="Ej: Rioja Gran Reserva" required>
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div><label for="fechaProduccion">Fecha Producción:</label><input type="date" id="fechaProduccion" value="${new Date().toISOString().split('T')[0]}"></div>
          <div><label for="fechaConsumo">Aviso Consumo:</label><input type="date" id="fechaConsumo" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div><label for="origen">Origen:</label><input type="text" id="origen" placeholder="Ej: España"></div>
          <div><label for="bodega">Bodega:</label><input type="text" id="bodega" placeholder="Ej: Bodegas Testing S.L."></div>
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div><label for="año">Año:</label><input type="number" id="año" placeholder="Ej: 2021"></div>
          <div><label for="variedad">Variedad:</label><input type="text" id="variedad" placeholder="Ej: Tempranillo"></div>
          <div><label for="alcohol">Alcohol:</label><input type="text" id="alcohol" placeholder="Ej: 14.5%"></div>
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div><label for="región">Region:</label><input type="text" id="región" placeholder="Ej: La Rioja"></div>
          <div><label for="denominacionOrigen">Denomination of Origin:</label><input type="text" id="denominacionOrigen" placeholder="Ej: D.O.Ca Rioja"></div>
        </div>
        <label for="notaDeCata">🍷 Tasting Notes:</label>
        <textarea id="notaDeCata" placeholder="Ej: Vino equilibrado con notas a frutos rojos y especias" style="width: 100%; min-width: 350px; max-width: 100%;"></textarea>
        <label for="maridaje">🍴 Pairing:</label>
        <textarea id="maridaje" placeholder="Ej: Carnes rojas, quesos curados, embutidos" style="width: 100%; min-width: 350px; max-width: 100%;"></textarea>
        <label for="comentarios">📝 Notes</label>
        <textarea id="comentarios" placeholder="Additional comments (optional)" style="width: 100%; min-width: 350px; max-width: 100%;"></textarea>
        <div style="margin-top: 20px; text-align: center;">
          <button type="submit" style="background: linear-gradient(135deg, #F7931A, #A0522D); color: white; padding: 12px 30px; border: none; border-radius: 8px; font-size: 1.1em; cursor: pointer; transition: all 0.3s;">
            🔲 Create QR</button>
        </div>
      </div>
    </form>
  `;

  safeModal(' 🏷️ Registro de Trazabilidad', traceabilityFormContent);

  // Listener del formulario (registro + generación de QR) + runtime presence check
  setTimeout(() => {
    const form = document.getElementById('traceabilityForm');
    if (!form) { console.error('[TRACEABILITY-TEST] traceabilityForm NO encontrado tras showTraceabilityModal'); return; }
    console.log('[TRACEABILITY-TEST] traceabilityForm presente en DOM');
    form.addEventListener('submit', async (event) => {
      console.log('[TRACEABILITY][MODULE] Submit event captured');
      event.preventDefault();
      const generateLoteId = () => `L${Date.now()}`;
      const transactionId = document.getElementById('transactionId')?.value?.trim();
      let loteId = document.getElementById('loteIdAlta')?.value?.trim();
      if (!loteId) {
        loteId = transactionId || generateLoteId();
        const input = document.getElementById('loteIdAlta');
        if (input) input.value = loteId;
        console.log('[TRACEABILITY][MODULE] loteId rellenado por defecto:', loteId);
      }
      if (!transactionId) {
        showModal('No se ha recibido el identificador de transacción.', 'Error de datos');
        return;
      }
      try {
        console.log('[TRACEABILITY][MODULE] Enviando metadata al endpoint /lotes', { loteId, transactionId });
        const metadata = {
          loteId,
          nombreProducto: document.getElementById('nombreProducto')?.value || 'Producto sin nombre',
          fechaProduccion: document.getElementById('fechaProduccion')?.value || new Date().toISOString().split('T')[0],
          fechaCaducidad: document.getElementById('fechaCaducidad')?.value || new Date().toISOString().split('T')[0],
          origen: document.getElementById('origen')?.value || 'N/A',
          bodega: document.getElementById('bodega')?.value || 'N/A',
          año: document.getElementById('año')?.value || new Date().getFullYear(),
          variedad: document.getElementById('variedad')?.value || 'N/A',
          región: document.getElementById('región')?.value || 'N/A',
          denominacionOrigen: document.getElementById('denominacionOrigen')?.value || 'N/A',
          alcohol: document.getElementById('alcohol')?.value || 'N/A',
          notaDeCata: document.getElementById('notaDeCata')?.value || '',
          maridaje: document.getElementById('maridaje')?.value || '',
          precio: document.getElementById('precio')?.value || '',
          comentarios: document.getElementById('comentarios')?.value || '',
          trazabilidad: document.getElementById('trazabilidad')?.value || ''
        };
        const loteResp = await fetchData('/lotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txId: transactionId, metadata })
        });
        if (loteResp.error || !loteResp.success) {
          showModal('Error creating batch record: ' + (loteResp.error || 'Unknown error'), 'Error');
          return;
        }
        await generateQRWithProof(loteId, transactionId);
      } catch (err) {
        console.error('[TRACEABILITY][MODULE] Error registering batch or generating QR', err);
        showModal('Error generating QR: ' + err.message, 'Internal Error');
      }
    });
  }, 0);
};
