"use strict";
const apiBaseUrl = "http://localhost:6001";
// =========================
// MODALES Y UTILIDADES UI
// =========================
// Funciones para mostrar, confirmar, progreso y cerrar modales
// showModal, showConfirmModal, showToast, showProgressModal, animateProgress, closeCurrentModal, showModalForm

// =========================
// FUNCIONES DE BLOCKCHAIN
// =========================
// (fetchData, submitTransaction, verifyQRProof, generateQRWithProof, renderBlocks, renderTransactionsPool,
// renderTransactionResult, renderBalance, renderPublicKey, checkPublicKeyBalance, uploadFile, renderMonitoring)

// =========================
// fetchData
// Función asíncrona para realizar peticiones al backend (GET/POST).
const fetchData = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, options);
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Error fetching ${endpoint}: ${errorMessage}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return { error: error.message };
  }
};

// Helper global to copy TXID with graceful toast fallback
window._copyTxId = function(id) {
  if (!id) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(id)
      .then(() => {
        if (window.showToast) window.showToast('Transaction ID copiado', 'success');
        else alert('Transaction ID copiado');
      })
      .catch(() => {
        if (window.showToast) window.showToast('No se pudo copiar TXID', 'error');
        else alert('No se pudo copiar');
      });
  } else {
    if (window.showToast) window.showToast('Portapapeles no disponible', 'warning');
    else alert('Portapapeles no disponible');
  }
};

// =========================
// verifyQRProof
// Verifica la autenticidad de un QR con prueba blockchain.
const verifyQRProof = async (qrData) => {
  try {
    // Delegate to ESM feature if available (prevents duplicate logic and keeps UI consistent)
    if (window.MM && window.MM.features && typeof window.MM.features.verifyQRProof === 'function') {
      return window.MM.features.verifyQRProof(qrData);
    }
    console.log('[verifyQRProof] called with qrData:', qrData);
    // spinner debounce timer (used only for inline fallback)
    let inlineSpinnerTimer = null;
    const removeInlineSpinner = () => {
      const ex = document.getElementById('inlineFallbackProgress');
      if (ex) ex.remove();
      const ss = document.getElementById('inline-spinner-style');
      // keep style in DOM for reuse; do not remove to avoid reflow
      // if you want to remove, uncomment next line
      // if (ss) ss.remove();
    };

    if (typeof showProgressModal === 'function') {
      showProgressModal("Verificando autenticidad...", "Blockchain", [
        "Analizando QR...",
        "Consultando blockchain...",
        "Verificando propiedad...",
      ]);
    } else {
      console.info('[verifyQRProof] showProgressModal not available, scheduling inline spinner (debounced 150ms)');
      // Debounce spinner to avoid flicker for fast responses
      inlineSpinnerTimer = setTimeout(() => {
        // ensure any existing spinner removed first
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
        spinner.innerHTML = `<div style="display:flex; align-items:center; gap:10px; background:rgba(28,34,45,0.92); color:#fff; padding:10px 14px; border-radius:999px; box-shadow:0 6px 18px rgba(0,0,0,0.3); font-size:14px;">
          <span class="spinner" style="width:22px;height:22px;border:3px solid rgba(255,255,255,0.25);border-top-color:#2c7be5;border-radius:50%;display:inline-block;animation:spin 0.9s linear infinite"></span>
          <span style="font-weight:600;">Verificando...</span>
        </div>`;
        document.body.appendChild(spinner);
        // add spinner CSS if not present
        if (!document.getElementById('inline-spinner-style')) {
          const s = document.createElement('style');
          s.id = 'inline-spinner-style';
          s.innerHTML = `@keyframes spin{to{transform:rotate(360deg)}} .spinner{will-change:transform}`;
          document.head.appendChild(s);
        }
      }, 150);
    }

    const response = await fetchData("/verify-qr-proof", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ qrData }),
    });

  console.log('[verifyQRProof] server response:', response);

  // Clear spinner timer and remove inline spinner if it was shown
  if (inlineSpinnerTimer) { clearTimeout(inlineSpinnerTimer); inlineSpinnerTimer = null; }
  removeInlineSpinner();

  // Close any central progress modal
  if (typeof closeCurrentModal === 'function') closeCurrentModal();

    if (response.error) {
  if (window.showModal) window.showModal(`❌ Error: ${response.error}`, "Error de Verificación");
        else console.error('verifyQRProof error:', response.error);
        return;
      }

      const { verified, verificationDetails, loteData } = response;

      // Normalize loteData: if server returned a primitive (string/number) wrap it
      const loteInfo = (loteData && typeof loteData === 'object') ? loteData : { value: loteData };

      // Special-case: QR without blockchain proof (older format)
      if (response.status === 'no_blockchain_proof') {
        const raw = typeof loteData === 'object' ? JSON.stringify(loteData, null, 2) : String(loteData);
        const msg = `⚠️ QR sin prueba blockchain (versión antigua)\n\nPayload:\n${raw}`;
        if (window.showModal) {
          window.showModal(`<pre style=\"white-space:pre-wrap\">${msg}</pre>`, '⚠️ Sin prueba blockchain');
        } else {
          // Inline fallback modal using project modal classes so it looks native
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
              <div class="modal-body"><pre style="white-space:pre-wrap; margin:0">${msg}</pre></div>
              <div class="modal-actions" style="text-align:right; margin-top:12px;">
                <button class="dashboard-btn secondary modal-close-btn">Cerrar</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          // Handler to remove modal and cleanup
          const escHandler = (ev) => { if (ev.key === 'Escape') removeModal(); };
          function removeModal() {
            document.removeEventListener('keydown', escHandler);
            modal.remove();
          }
          // close button
          modal.querySelector('.close')?.addEventListener('click', removeModal);
          modal.querySelector('.modal-close-btn')?.addEventListener('click', removeModal);
          // close on outside click
          modal.addEventListener('click', (e) => { if (e.target === modal) removeModal(); });
          document.addEventListener('keydown', escHandler);
        }
  if (window.showToast) window.showToast('⚠️ QR sin prueba blockchain', 'warning');
        return;
      }

      if (verified) {
        const ownerShort = (verificationDetails && verificationDetails.owner) ? verificationDetails.owner.substring(0, 20) + '...' : 'N/A';
        const txId = verificationDetails?.transactionId || 'N/A';
        const verifiedAt = verificationDetails?.verifiedAt ? new Date(verificationDetails.verifiedAt).toLocaleString() : 'N/A';
        const loteIdDisplay = loteInfo.loteId || loteInfo.value || 'N/A';
        console.debug('[verifyQRProof] helper availability:', {
          hasShowModal: typeof window.showModal === 'function',
          hasShowModalForm: typeof window.showModalForm === 'function',
          hasShowToast: typeof window.showToast === 'function'
        });

        // Extract additional details from server response for richer status
        const respStatus = response.status || 'unknown';
        const respMessage = response.message || '';
        const details = response.details || verificationDetails || {};
        const detailTxId = details.transactionId || txId || 'N/A';
        const txExists = details.transactionExists === true ? 'Sí' : (details.transactionExists === false ? 'No' : 'Desconocido');
        const inMempool = details.inMempool === true ? 'Sí' : (details.inMempool === false ? 'No' : 'Desconocido');
        const ownerPub = details.ownerPublicKey || verificationDetails?.owner || 'N/A';
        const verifiedAtRaw = details.verifiedAt || verificationDetails?.verifiedAt || null;
        const verifiedAtDisplay = verifiedAtRaw ? new Date(verifiedAtRaw).toLocaleString() : verifiedAt;

        const successText = `✅ **Autenticidad Verificada**\n\n` +
              `🍷 **Lote:** ${loteIdDisplay}\n` +
              `👤 **Propietario:** ${ownerShort}\n` +
              `🔗 **Transacción:** ${detailTxId}\n` +
              `⏰ **Verificado:** ${verifiedAtDisplay}\n\n` +
              `Estado: ${respStatus} — ${respMessage}`;

        const successContentHtml = `
          <div class="modal-info">
            <table class="modal-table" style="width:100%; border-collapse:collapse;">
              <tr><td style="width:28%; padding:6px; font-weight:600;">Estado</td><td style="padding:6px;">${respStatus} <small style="color:#666;">${respMessage}</small></td></tr>
              <tr><td style="padding:6px; font-weight:600;">Transaction ID</td><td style="padding:6px;"><code id="txid-inline">${detailTxId}</code></td></tr>
              <tr><td style="padding:6px; font-weight:600;">En mempool</td><td style="padding:6px;">${inMempool}</td></tr>
              <tr><td style="padding:6px; font-weight:600;">Transacción existe</td><td style="padding:6px;">${txExists}</td></tr>
              <tr><td style="padding:6px; font-weight:600;">Owner Public Key</td><td style="padding:6px; word-break:break-all;">${ownerPub}</td></tr>
              <tr><td style="padding:6px; font-weight:600;">Verificado en</td><td style="padding:6px;">${verifiedAtDisplay}</td></tr>
            </table>
            <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
              <button class="dashboard-btn primary" onclick="(function(){navigator.clipboard && navigator.clipboard.writeText && navigator.clipboard.writeText('${detailTxId}').then(()=>{alert('Transaction ID copiado');}).catch(()=>{alert('No se pudo copiar');});})()">Copiar TXID</button>
              <button class="dashboard-btn secondary" onclick="(function(){ const m = document.getElementById('inlineFallbackModal'); if(m) m.remove(); else window.close && window.close(); })()">Cerrar</button>
            </div>
            <hr style="margin-top:12px;" />
            <pre style="white-space:pre-wrap; margin:0">${successText}</pre>
          </div>`;

        // Try richer modal first (showModalForm), then fall back to showModal, then inline
        let shown = false;
  if (window.showModalForm) {
          try {
            console.debug('[verifyQRProof] calling showModalForm for success');
            window.showModalForm ? window.showModalForm('🔐 Autenticidad Verificada', successContentHtml) : (window.showModal && window.showModal(successContentHtml, '🔐 Autenticidad Verificada'));
            shown = true;
          } catch (err) {
            console.error('[verifyQRProof] showModalForm threw:', err);
          }
        }
  if (!shown && window.showModal) {
          try {
            console.debug('[verifyQRProof] calling showModal for success');
            window.showModal(successText, '🔐 Autenticidad Verificada');
            shown = true;
          } catch (err) {
            console.error('[verifyQRProof] showModal threw:', err);
          }
        }
        if (!shown) {
          // No helpers worked — inline fallback
          const existing = document.getElementById('inlineFallbackModal'); if (existing) existing.remove();
          const modal = document.createElement('div');
          modal.id = 'inlineFallbackModal'; modal.className = 'modal'; modal.style.display = 'block';
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

  if (window.showToast) window.showToast("✅ Botella auténtica verificada", "success");
      } else {
        const loteIdDisplay = loteInfo.loteId || loteInfo.value || 'N/A';
        const reason = response.reason || response.message || 'Transacción no válida';
        const failHtml = `⚠️ **Verificación Fallida**\n\n` +
              `🍷 **Lote:** ${loteIdDisplay}\n` +
              `❌ **Razón:** ${reason}\n\n` +
              `Esta botella no puede ser verificada en blockchain.`;

  console.debug('[verifyQRProof] helper availability on failure:', { hasShowModal: typeof window.showModal === 'function', hasShowModalForm: typeof window.showModalForm === 'function' });

        // Try richer modal first (showModalForm), then showModal, then inline fallback
        let shownFail = false;
        const failContentHtml = `<pre style="white-space:pre-wrap; margin:0">${failHtml}</pre>`;
  if (window.showModalForm) {
          try {
            console.debug('[verifyQRProof] calling showModalForm for failure');
            window.showModalForm ? window.showModalForm('⚠️ Verificación Fallida', failContentHtml) : (window.showModal && window.showModal(failContentHtml, '⚠️ Verificación Fallida'));
            shownFail = true;
          } catch (err) {
            console.error('[verifyQRProof] showModalForm threw on failure:', err);
          }
        }
  if (!shownFail && window.showModal) {
          try {
            console.debug('[verifyQRProof] calling showModal for failure');
            window.showModal(failHtml, '⚠️ Verificación Fallida');
            shownFail = true;
          } catch (err) {
            console.error('[verifyQRProof] showModal threw on failure:', err);
          }
        }
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
  if (window.showToast) window.showToast("⚠️ No se pudo verificar autenticidad", "warning");
      }
    
  } catch (error) {
  if (window.closeCurrentModal) window.closeCurrentModal();
    console.error("Error verificando QR:", error);
  if (window.showModal) window.showModal(`❌ Error verificando: ${error.message}`, "Error");
    else console.error('Error modal:', error.message);
  }
};

// =========================
// submitTransaction
// Envía una transacción al backend y gestiona el resultado (modal, toast).

const submitTransaction = async (transactionData) => {
  if (window.MM && window.MM.features && typeof window.MM.features.submitTransaction === 'function') {
    return window.MM.features.submitTransaction(transactionData);
  }
  try {
    console.log("Iniciando transacción con datos:", transactionData);

    // 🔄 Modal con progreso mejorado
  window.showProgressModal && window.showProgressModal("Procesando transacción...", "Enviando", [
      "Validando datos...",
      "Conectando con la red...",
      "Procesando transacción...",
      "Confirmando resultado...",
    ]);

    const response = await fetchData("/transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });

    // Esperar un poco para que el usuario vea el progreso
    setTimeout(() => {
  window.closeCurrentModal && window.closeCurrentModal();

      if (response.error || !response.success) {
        console.error(
          "Error al realizar la transacción:",
          response.error || "Error desconocido"
        );
  window.showModal(
          `❌ Error en la transacción: ${
            response.error || "Error desconocido"
          }`,
          "Error de Transacción"
        );
  window.showToast && window.showToast("❌ Error en transacción", "error");
        return;
      }

      console.log("Respuesta del servidor recibida:", response);
      if (response.success && response.transaction) {
        // 🚀 Nueva lógica: Si tiene enableTraceability, mostrar modal de trazabilidad
        if (response.enableTraceability) {
          showTraceabilityModal(response.transaction);
        } else {
          // 🎉 Modal estilizado para el resultado exitoso (fallback)
          const transactionResultContent = `
              <div class="modal-success">
                <div class="success-icon">✅</div>
                <h3>¡Transacción Completada!</h3>
                <p><strong>ID:</strong> <code>${
                  response.transaction.id || "N/A"
                }</code></p>
                <p><strong>Estado:</strong> <span class="status-success">Confirmada</span></p>
              </div>
              <div class="modal-details">
                <details>
                  <summary>📋 Ver detalles completos</summary>
                  <pre class="json-display">${JSON.stringify(
                    response.transaction,
                    null,
                    2
                  )}</pre>
                </details>
                <div style="margin-top: 15px;">
                  <p><strong>📅 Fecha:</strong> ${new Date(
                    response.transaction.timestamp
                  ).toLocaleString()}</p>
                  <p><strong>� Cantidad:</strong> ${
                    response.transaction.amount
                  }</p>
                </div>
              </div>
            `;
          window.safeModal ? window.safeModal("Transacción Exitosa", transactionResultContent) : (window.showModalForm ? window.showModalForm("Transacción Exitosa", transactionResultContent) : window.showModal && window.showModal(transactionResultContent, "Transacción Exitosa"));
        }
  window.showToast && window.showToast("✅ Transacción procesada exitosamente", "success");
      } else {
        console.error("Datos de la transacción no válidos:", response);
  window.showModal(
          "⚠️ La transacción se procesó pero no se recibieron datos válidos.",
          "Advertencia"
        );
  window.showToast && window.showToast("⚠️ Advertencia: respuesta incompleta", "warning");
      }

      const form = document.querySelector("form");
      if (form) form.reset();
    }, 2000); // 2 segundos para ver el progreso completo
  } catch (error) {
    setTimeout(() => {
  window.closeCurrentModal && window.closeCurrentModal();
      console.error("Error submitting transaction:", error);
  window.showModal(
        `❌ Error al enviar la transacción: ${error.message}`,
        "Error de Red"
      );
  window.showToast && window.showToast("❌ Error de conexión", "error");
    }, 1000);
  }
};

// =========================
// EVENTOS Y LISTENERS DOM
// =========================

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar la dirección global de la wallet al cargar la app
  fetch("/uploads/wallet_default.json")
    .then(res => res.json())
    .then(data => {
      if (data && data.publicKey) {
        window.walletAddress = data.publicKey;
        console.log("Wallet por defecto cargada:", window.walletAddress);
      }
    })
    .catch(err => {
      console.warn("No se pudo cargar la wallet por defecto:", err);
    });
  // Insertar el botón en la sección de acciones de la dashboard-card de transacciones
  const transaccionesCard = Array.from(
    document.querySelectorAll(".dashboard-card")
  ).find((card) =>
    card
      .querySelector(".card-header h2")
      ?.textContent?.includes("Transacciones")
  );
  const cardActions = transaccionesCard?.querySelector(".card-actions");
  if (cardActions && !document.getElementById("openTransactionBajaModal")) {
    const bajaBtn = document.createElement("button");
    bajaBtn.id = "openTransactionBajaModal";
    bajaBtn.className = "dashboard-btn primary";
    bajaBtn.textContent = "Consumed bottle";
    cardActions.appendChild(bajaBtn);
    // Fase 1: mostrar modal de baja al hacer clic
    bajaBtn.addEventListener("click", () => {
      const walletAddress = window.walletAddress || '';
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
          </select>
          <div style="margin-top:20px;text-align:center;">
            <button type="submit" class="dashboard-btn primary">Confirmar Baja</button>
            <button type="button" id="leerQRBajaBtn" class="dashboard-btn secondary" style="margin-left:10px;">Leer QR</button>
            <button type="button" id="eliminarBajaBtn" class="dashboard-btn" style="background-color:#d32f2f;color:#fff;margin-left:10px;">Eliminar</button>
          </div>
        </form>
      `;
          // Botón rojo Eliminar
          const eliminarBtn = document.getElementById("eliminarBajaBtn");
          if (eliminarBtn) {
            eliminarBtn.addEventListener("click", () => {
              console.log("Futura implementación de borrado.");
            });
          }
  window.safeModal ? window.safeModal("Baja de Transacción", bajaFormContent) : (window.showModalForm ? window.showModalForm("Baja de Transacción", bajaFormContent) : window.showModal && window.showModal(bajaFormContent, "Baja de Transacción"));
      // Fase 1: solo UI, sin lógica de backend
      setTimeout(() => {
        const form = document.getElementById("bajaTransactionForm");
        if (form) {
          form.addEventListener("submit", (event) => {
            event.preventDefault();
            // Captura de datos del formulario
            const propietario = document
              .getElementById("propietarioBaja")
              ?.value?.trim();
            if (propietario !== (window.walletAddress || '')) {
              window.showModal && window.showModal("El propietario debe coincidir con la wallet importada.", "Validación");
              console.error("[BURN] Intento de firmar con una wallet distinta a la importada", {propietario, walletAddress: window.walletAddress});
              return;
            }
            const transactionId = document
              .getElementById("transactionIdBaja")
              ?.value?.trim();

            // Validación básica de campos obligatorios
            if (!transactionId) {
              window.showModal(
                "Debes introducir un ID de transacción válido.",
                "Validación"
              );
              return;
            }
            if (!propietario) {
              window.showModal && window.showModal("Debes introducir el propietario.", "Validación");
              return;
            }

            // Captura el motivo seleccionado
            const motivo = document.getElementById("motivoBaja")?.value || "burn";

            // Mostrar datos capturados para depuración
            window.showToast && window.showToast(
              `Datos capturados: Propietario=${propietario}, Transacción=${transactionId}, Motivo=${motivo}`,
              "info",
              5000
            );

            // Enviar baja al backend
            // Log para depuración
            console.log("[BURN] Enviando baja-token", { transactionId, ownerPublicKey: propietario, motivo });
            fetchData("/baja-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ transactionId, ownerPublicKey: propietario, motivo })
            }).then((result) => {
              window.closeCurrentModal && window.closeCurrentModal();
              if (result.success) {
                window.showModal && window.showModal(`✅ ${result.message}<br>ID: <code>${result.transactionId}</code><br>Destino: <code>${result.destino}</code>`, "Baja de Token Exitosa");
                window.showToast && window.showToast("Baja realizada correctamente", "success");
              } else {
                window.showModal && window.showModal(`❌ Error: ${result.error || "No se pudo realizar la baja"}`, "Error Baja Token");
                window.showToast && window.showToast("Error en baja", "error");
              }
            }).catch((err) => {
              window.closeCurrentModal && window.closeCurrentModal();
              window.showModal && window.showModal(`Error al realizar la baja: ${err.message}`, "Error Baja Token");
              window.showToast && window.showToast("Error de conexión", "error");
            });
          });
          // Autocompletar Lote ID con el ID de la transacción
          // El Lote ID ya no se autorellena. El usuario debe introducirlo manualmente.
          // Botón para futura lectura de QR
          const leerQRBtn = document.getElementById("leerQRBajaBtn");
          if (leerQRBtn) {
            leerQRBtn.addEventListener("click", () => {
              window.showToast && window.showToast(
                "Futura implementación de lectura QR para baja.",
                "info"
              );
            });
          }
          // Función placeholder para verificar si la transacción existe
          function verificarTransaccionExiste(transactionId) {
            // Verificación real contra el backend
            if (!transactionId) {
              window.showModal && window.showModal(
                "Debes introducir un ID de transacción válido.",
                "Validación"
              );
              return false;
            }
            // Verificar existencia de la transacción
            fetchData(`/transaction/${transactionId}`)
              .then((result) => {
                if (result && result.success && result.transaction) {
                  window.showToast && window.showToast(
                    `Transacción ${transactionId} encontrada.`,
                    "success"
                  );
                  window.showModal(
                    `Transacción ${transactionId} encontrada.`,
                    "Validación"
                  );
                } else {
                  window.showToast && window.showToast(
                    `No se encontró la transacción ${transactionId}.`,
                    "error"
                  );
                  window.showModal(
                    `No se encontró la transacción ${transactionId}.`,
                    "Error"
                  );
                }
              })
              .catch((err) => {
                window.showModal(
                  `Error al verificar la transacción: ${err.message}`,
                  "Error"
                );
              });
            // Verificar existencia de propietario
            const propietario = document
              .getElementById("propietarioBaja")
              ?.value?.trim();
            if (propietario) {
              fetchData(`/propietario/${propietario}`)
                .then((result) => {
                  if (result && result.success && result.transactions && result.transactions.length > 0) {
                    window.showToast && window.showToast(
                      `Propietario ${propietario} encontrado.`,
                      "success"
                    );
                  } else {
                    window.showModal(
                      `No se encontró el propietario ${propietario}.`,
                      "Error"
                    );
                  }
                })
                .catch((err) => {
                  window.showModal(
                    `Error al verificar el propietario: ${err.message}`,
                    "Error"
                  );
                });
            }
            return true;
          }
        }
      }, 0);
    });
  }
  // Asocia el botón de lectura QR a un console.log
  const leerQRBtn = document.getElementById("leerQRBtn");
  if (leerQRBtn) {
    leerQRBtn.addEventListener("click", () => {
      console.log("Futura implementación de lectura QR");
    });
  }

  // Event listener para el formulario de trazabilidad
  const traceForm = document.getElementById("traceabilityForm");
  if (traceForm) {
    traceForm.addEventListener("submit", async (event) => {
      console.log("[TRACEABILITY] Submit event captured");
      event.preventDefault();
      // Obtener datos del formulario
      const generateLoteId = () => `L${Date.now()}`;
      let loteId = document.getElementById("loteIdAlta")?.value?.trim();
      const transactionId = document
        .getElementById("transactionId")
        ?.value?.trim();
      if (!loteId) {
        loteId = generateLoteId();
      }
      // ...existing code...
    });
  }

  // 🔐 Función para generar QR con prueba de propiedad
  const generateQRWithProof = async (loteId, transactionId) => {
    if (window.MM && window.MM.features && typeof window.MM.features.generateQRWithProof === 'function') {
      return window.MM.features.generateQRWithProof(loteId, transactionId);
    }
    try {
      showProgressModal("Generando QR con prueba...", "Blockchain", [
        "Buscando transacción...",
        "Verificando propiedad...",
        "Generando QR seguro...",
      ]);

      const response = await fetchData("/qr-with-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ loteId, transactionId }),
      });

      setTimeout(() => {
        closeCurrentModal();

        if (response.error) {
          // Si el error contiene información de doble gasto, añádela al cuerpo
          let extraMsg = "";
          if (response.error && response.error.includes("Transacción no encontrada en blockchain ni en mempool")) {
            // Mensaje que el backend muestra por terminal
            extraMsg = `<br><br><span style='color:#b71c1c;'>[UTXO MEMPOOL] Doble gasto detectado: txId=init-fund-1, outputIndex=0. Transacción rechazada.</span>`;
          }
          window.showModal && window.showModal(`❌ Error: ${response.error}${extraMsg}`, "Error");
          return;
        }

        // Mostrar QR con información de verificación usando datos reales de blockchain
        showQRModal(response.qrBase64, {
          loteId:
            response.proof?.loteId ||
            response.loteData?.loteId ||
            response.loteId ||
            "N/A",
          owner: response.proof?.owner || response.loteData?.owner || "N/A",
          transactionId:
            response.proof?.transactionId ||
            response.loteData?.transactionId ||
            response.transactionId ||
            "N/A",
          verificationData: {
            owner:
              response.proof?.owner ||
              response.verificationData?.owner ||
              response.loteData?.owner ||
              "N/A",
            transactionId:
              response.proof?.transactionId ||
              response.verificationData?.transactionId ||
              response.loteData?.transactionId ||
              "N/A",
            verifiedAt:
              response.proof?.verifiedAt ||
              response.verificationData?.verifiedAt ||
              null,
          },
        });

  window.showToast && window.showToast("✅ QR con prueba blockchain generado", "success");
      }, 1500);
    } catch (error) {
      closeCurrentModal();
      console.error("Error generando QR con prueba:", error);
  window.showModal && window.showModal(`❌ Error generando QR: ${error.message}`, "Error");
    }
  };

  // Show transactions for a block (used by the 'Mostrar transacciones' buttons)
  window.showBlockTransactions = function(blockIndex) {
    if (window.MM && window.MM.render && typeof window.MM.render.showBlockTransactions === 'function') {
      return window.MM.render.showBlockTransactions(blockIndex);
    }
    try {
      const blocks = window._lastBlocks || [];
      const block = blocks[blockIndex];
      if (!block) {
  window.showModal ? window.showModal('Bloque no encontrado', 'Error') : alert('Bloque no encontrado');
        return;
      }
      const txs = Array.isArray(block.data) ? block.data : [];
      const content = `
        <div class="modal-info">
          <p><strong>📦 Transacciones del Bloque #${blockIndex}</strong></p>
          <p><strong>Hash:</strong> ${block.hash}</p>
          <p><strong>Timestamp:</strong> ${new Date(block.timestamp).toLocaleString()}</p>
          <p><strong>Total transacciones:</strong> ${txs.length}</p>
        </div>
        <div class="modal-body">
          ${txs.length === 0 ? '<p>No hay transacciones en este bloque.</p>' : '<ul>' + txs.map((tx, i) => {
              const txId = (tx && tx.id) ? tx.id : (typeof tx === 'string' ? tx : JSON.stringify(tx).substring(0,40));
              return `<li class="tx-item" style="margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <strong class="tx-label">Tx:</strong>
                  <code class="tx-id" style="font-family: monospace;">${txId}</code>
                  <button class="dashboard-btn secondary tx-copy-btn" type="button" onclick="(function(){ window._copyTxId && window._copyTxId('${txId}'); })()">Copiar TXID</button>
                </div>
                <pre class="json-display">${typeof tx === 'string' ? tx : JSON.stringify(tx, null, 2)}</pre>
              </li>`
            }).join('') + '</ul>'}
        </div>
      `;
      if (window.safeModal) {
        window.safeModal(`Transacciones - Bloque #${blockIndex}`, content);
      } else {
        // Inline fallback
        const existing = document.getElementById('inlineFallbackModal'); if (existing) existing.remove();
        const modal = document.createElement('div'); modal.id = 'inlineFallbackModal'; modal.className = 'modal'; modal.style.display = 'block';
        modal.innerHTML = `
          <div class="modal-content" style="max-width:800px; margin-top:40px;">
            <span class="close">&times;</span>
            <h2 class="modal-title">Transacciones - Bloque #${blockIndex}</h2>
            <div class="modal-body">${content}</div>
            <div class="modal-actions" style="text-align:right; margin-top:12px;"><button class="dashboard-btn secondary modal-close-btn">Cerrar</button></div>
          </div>`;
        document.body.appendChild(modal);
        const remove = () => modal.remove();
        modal.querySelector('.close')?.addEventListener('click', remove);
        modal.querySelector('.modal-close-btn')?.addEventListener('click', remove);
        modal.addEventListener('click', (e) => { if (e.target === modal) remove(); });
      }
    } catch (err) {
      console.error('showBlockTransactions error', err);
      alert('Error mostrando transacciones: ' + err.message);
    }
  };

  // � Modal para mostrar QR con prueba de propiedad
  // =========================
  // MODAL: QR CON PRUEBA DE PROPIEDAD
  // =========================

  const showQRModal = (qrBase64, loteData) => {
    if (window.MM && window.MM.features && typeof window.MM.features.showQRModal === 'function') {
      return window.MM.features.showQRModal(qrBase64, loteData);
    }
    // Limpia el prefijo duplicado antes de usar en el HTML
    // Limpia el base64 de espacios y saltos de línea
    let cleanBase64 = (qrBase64 || "").replace(/\s+/g, "");
    let src = cleanBase64;
    if (!src.startsWith("data:image/png;base64,")) {
      src = "data:image/png;base64," + src;
    }
    src = src.replace(/^(data:image\/png;base64,)+/, "data:image/png;base64,");

    // Validar datos del QR
    var propietario =
      loteData.owner || loteData.verificationData?.owner || "N/A";
    var transaccion = loteData.verificationData?.transactionId || "N/A";
    var advertencia = "";
    if (propietario === "N/A" || transaccion === "N/A") {
      advertencia = `<div style='color:#b71c1c; margin-bottom:10px;'><strong>⚠️ QR generado sin datos de blockchain válidos.<br>Verifica que la transacción exista y esté confirmada.</strong></div>`;
    }
    var modalContent = `
    <div style="text-align:center;">
      <h2>QR con Prueba de Propiedad</h2>
      ${advertencia}
      <img id="qrImageModal" src="${src}" alt="QR Blockchain" style="max-width:250px; margin:20px 0;">
      <div style="margin-top:15px; text-align:left;">
        <strong>Lote ID:</strong> ${loteData.loteId || "N/A"}<br>
        <strong>Propietario:</strong> ${propietario}<br>
        <strong>Transacción:</strong> ${transaccion}<br>
        <strong>Verificado en:</strong> ${
          loteData.verificationData?.verifiedAt
            ? new Date(loteData.verificationData.verifiedAt).toLocaleString()
            : "N/A"
        }<br>
      </div>
      <div style="margin-top:20px;">
        <a href="${src}" download="QR_${
      loteData.loteId || "lote"
    }.png" style="background:#1976d2;color:#fff;padding:10px 24px;border:none;border-radius:6px;cursor:pointer;font-size:1em;text-decoration:none;display:inline-block;">💾 Descargar QR</a>
      </div>
    </div>
  `;
  if (window.showModalForm) window.showModalForm("QR Blockchain con Prueba", modalContent); else if (window.showModal) window.showModal(modalContent, "QR Blockchain con Prueba");
    // Asigna los datos del lote al modal clásico si existe
    setTimeout(() => {
      if (loteData) {
        const elLoteId = document.getElementById("qrLoteId");
        const elPropietario = document.getElementById("qrPropietario");
        const elTransaccion = document.getElementById("qrTransaccion");
        const elVerificadoEn = document.getElementById("qrVerificadoEn");
        if (elLoteId) elLoteId.textContent = loteData.loteId || "N/A";
        if (elPropietario) elPropietario.textContent = propietario;
        if (elTransaccion) elTransaccion.textContent = transaccion;
        if (elVerificadoEn)
          elVerificadoEn.textContent = loteData.verificationData?.verifiedAt
            ? new Date(loteData.verificationData.verifiedAt).toLocaleString()
            : "N/A";
      }
    }, 0);
    // Asignar funcionalidad de descarga al botón
    setTimeout(() => {
      const downloadBtn = document.getElementById("downloadQRBtn");
      if (downloadBtn) {
        downloadBtn.onclick = () => {
          const link = document.createElement("a");
          link.download = `QR_${loteData.loteId || "lote"}.png`;
          link.href = `data:image/png;base64,${qrBase64}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
      }
    }, 0);
  };

  // =========================
  // RENDERIZADO DE DATOS
  // =========================
  // renderBlocks, renderTransactionsPool, renderTransactionResult, renderBalance, renderPublicKey, checkPublicKeyBalance, uploadFile, renderMonitoring

  // ==========================
  // renderBlocks
  // Renderiza los bloques de la blockchain en el DOM y muestra resumen en modal.

  const renderBlocks = (blocks) => {
    if (window.MM && window.MM.render && typeof window.MM.render.renderBlocks === 'function') {
      return window.MM.render.renderBlocks(blocks);
    }
    const blocksContainer = document.getElementById("blocksContainer");
    blocksContainer.innerHTML = "";
    blocks.forEach((block) => {
      const blockDiv = document.createElement("div");
      blockDiv.className = "block";
      const formatContent = (content) => {
        if (!content) return "";
        return content.match(/.{1,80}/g).join("\n");
      };
      const formattedBody = formatContent(block.body);
      const formattedHash = formatContent(block.hash);
      const formattedPreviousHash = formatContent(block.previousHash);
      const formattedData = formatContent(JSON.stringify(block.data, null, 2));
      blockDiv.innerHTML = `
            <div><strong>Timestamp:</strong> ${block.timestamp}</div>
            <div><strong>Previous Hash:</strong> ${formattedPreviousHash}</div>
            <div><strong>Hash:</strong> ${formattedHash}</div>
            <div><strong>Nonce:</strong> ${block.nonce}</div>
            <div><strong>Difficulty:</strong> ${block.difficulty}</div>
            <div><strong>Process Time:</strong> ${block.processTime}</div>
            <div><strong>Data:</strong> ${formattedData}</div>
            <div class="block-body"><strong>Body:</strong> ${formattedBody}</div>
        `;
      blocksContainer.appendChild(blockDiv);
    });

    // Cache the last rendered blocks so action buttons in the modal can access them
    try { window._lastBlocks = blocks; } catch(e) { console.warn('Could not cache blocks', e); }

    // Mostrar modal con resumen de bloques
    const blocksModalContent = `
      <div class="modal-info">
        <p><strong>✅ Bloques cargados exitosamente</strong></p>
        <p><strong>Total de bloques:</strong> ${blocks.length}</p>
        <p><strong>Último bloque:</strong> ${
          blocks.length > 0
            ? new Date(blocks[blocks.length - 1].timestamp).toLocaleString()
            : "N/A"
        }</p>
      </div>
      <div class="modal-body">
        <h3>Resumen de la Blockchain:</h3>
        <ul>
          ${blocks
            .map(
              (block, index) => `
            <li>
              <strong>Bloque #${index}</strong><br>
              Hash: ${block.hash.substring(0, 20)}...<br>
              Timestamp: ${new Date(block.timestamp).toLocaleString()}<br>
              Transacciones: ${Array.isArray(block.data) ? block.data.length : 0}
              <div style="margin-top:8px;">
                <button class="dashboard-btn secondary" type="button" onclick="(function(){ if(typeof showBlockTransactions==='function'){ showBlockTransactions(${index}); } else { alert('Función showBlockTransactions no disponible.'); } })()">Mostrar transacciones</button>
              </div>
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `;
  if (window.safeModal) window.safeModal("Blockchain - Bloques Cargados", blocksModalContent); else if (window.showModalForm) window.showModalForm("Blockchain - Bloques Cargados", blocksModalContent); else if (window.showModal) window.showModal(blocksModalContent, "Blockchain - Bloques Cargados");
  };

   // Monitoring system endpoint con modal estilizado y información ampliada
  // =========================
  // MONITORING DEL SISTEMA BLOCKCHAIN
  // =========================

  const renderMonitoring = async () => {
    if (window.MM && window.MM.monitoring && typeof window.MM.monitoring.renderMonitoring === 'function') {
      return window.MM.monitoring.renderMonitoring();
    }
    try {
      if (window.showToast) window.showToast("Consultando sistema...", "info");
      const systemInfo = await fetchData("/system-info");
      if (systemInfo.error) {
  window.showModal(
          `Error al obtener información del sistema: ${systemInfo.error}`,
          "Error del Sistema"
        );
        if (window.showToast) window.showToast("Error en consulta del sistema", "error");
      } else {
        // Formatear uptime
        const formatUptime = (seconds) => {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = Math.floor(seconds % 60);
          return `${hours}h ${minutes}m ${secs}s`;
        };

        // Formatear fecha
        const formatDate = (timestamp) => {
          return timestamp ? new Date(timestamp).toLocaleString() : "N/A";
        };

        const monitoringModalContent = `
          <div class="modal-info">
            <p><strong>🖥️ Monitor del Sistema Blockchain</strong></p>
            <p><strong>Estado:</strong> <span style="color: #48bb78;">● Online</span></p>
            <p><strong>Última actualización:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
            <!-- Servidor -->
            <div style="background: #2d3748; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h3 style="color: #f7931a; margin-top: 0;">🌐 Servidor</h3>
              <ul style="color: #e2e8f0; margin: 0; padding-left: 20px;">
                <li><strong>Puerto HTTP:</strong> ${
                  systemInfo.blockchain?.server?.httpPort || "N/A"
                }</li>
                <li><strong>Puerto P2P:</strong> ${
                  systemInfo.blockchain?.server?.p2pPort || "N/A"
                }</li>
                <li><strong>URL:</strong> <a href="${
                  systemInfo.blockchain?.server?.httpUrl || "#"
                }" target="_blank" style="color: #63b3ed;">${
          systemInfo.blockchain?.server?.httpUrl || "N/A"
        }</a></li>
                <li><strong>Tiempo activo:</strong> ${formatUptime(
                  systemInfo.blockchain?.server?.uptime || 0
                )}</li>
                <li><strong>Iniciado:</strong> ${formatDate(
                  systemInfo.blockchain?.server?.startTime
                )}</li>
              </ul>
            </div>

            <!-- Red P2P -->
            <div style="background: #2d3748; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h3 style="color: #f7931a; margin-top: 0;">🌍 Red P2P</h3>
              <ul style="color: #e2e8f0; margin: 0; padding-left: 20px;">
                <li><strong>Estado:</strong> <span style="color: ${
                  systemInfo.blockchain?.network?.networkStatus === "connected"
                    ? "#48bb78"
                    : "#ed8936"
                };">
                  ${
                    systemInfo.blockchain?.network?.networkStatus ===
                    "connected"
                      ? "🔗 Conectado"
                      : "🔍 Standalone"
                  }</span></li>
                <li><strong>Conexiones activas:</strong> ${
                  systemInfo.blockchain?.network?.p2pConnections || 0
                }</li>
                <li><strong>Peers:</strong> ${
                  systemInfo.blockchain?.network?.p2pPeers?.length || 0
                }</li>
              </ul>
            </div>

            <!-- Sistema -->
            <div style="background: #2d3748; padding: 15px; border-radius: 8px;">
              <h3 style="color: #f7931a; margin-top: 0;">🖥️ Sistema</h3>
              <ul style="color: #e2e8f0; margin: 0; padding-left: 20px;">
                <li><strong>Host:</strong> ${systemInfo.hostName || 'N/A'}</li>
                <li><strong>IPs:</strong> ${
                  (systemInfo.network && systemInfo.network.ips && systemInfo.network.ips.length>0)
                    ? systemInfo.network.ips.map(i => `${i.interface}: ${i.address}`).join(' | ')
                    : 'N/A'
                }</li>
                <li><strong>Interfaces:</strong></li>
                <li style="list-style:none; margin-left:8px;">${
                  (systemInfo.network && systemInfo.network.interfaces)
                    ? '<ul style="margin:6px 0 0 12px;color:#cfe8de;">' + systemInfo.network.interfaces.map(it => `<li><strong>${it.interface}</strong> ${it.family} ${it.address} ${it.internal?'(internal)':''}</li>`).join('') + '</ul>'
                    : 'N/A'
                }</li>
                <li><strong>Plataforma:</strong> ${
                  systemInfo.platform || "N/A"
                }</li>
                <li><strong>Arquitectura:</strong> ${
                  systemInfo.arch || "N/A"
                }</li>
                <li><strong>Node.js:</strong> ${
                  systemInfo.nodeVersion || "N/A"
                }</li>
                <li><strong>Memoria libre:</strong> ${
                  systemInfo.freeMemory
                    ? Math.round(systemInfo.freeMemory / 1024 / 1024) + " MB"
                    : "N/A"
                }</li>
                <li><strong>CPU cores:</strong> ${systemInfo.cpus || "N/A"}</li>
                <li><strong>Versión:</strong> ${
                  systemInfo.version || "1.0.0"
                }</li>
              </ul>
            </div>
          </div>
        `;
  if (window.safeModal) window.safeModal("Monitor del Sistema", monitoringModalContent); else if (window.showModalForm) window.showModalForm("Monitor del Sistema", monitoringModalContent); else if (window.showModal) window.showModal(monitoringModalContent, "Monitor del Sistema");
        showToast("Información del sistema cargada", "success");
      }
    } catch (error) {
  window.showModal && window.showModal(`Error de conexión: ${error.message}`, "Error de Red");
      showToast("Error de conexión", "error");
    }
  };

  // Renderiza el pool de transacciones (adaptado a modelo UTXO)
  // Renderiza el pool de transacciones (adaptado a modelo UTXO) con modal estilizado
  const renderTransactionsPool = (transactionsPool) => {
    if (window.MM && window.MM.mempool && typeof window.MM.mempool.renderTransactionsPool === 'function') {
      return window.MM.mempool.renderTransactionsPool(transactionsPool);
    }
    let transactionsContainer = document.getElementById(
      "transactionsContainer"
    );
    if (!transactionsContainer) {
      transactionsContainer = document.createElement("div");
      transactionsContainer.id = "transactionsContainer";
      document.body.appendChild(transactionsContainer);
    }

    if (transactionsPool.length === 0) {
      transactionsContainer.innerHTML = "<p>No hay datos en mempool</p>";

      // Modal para mempool vacío
      // =========================
      // MODAL: MEMPOOL VACÍO
      // =========================

      const emptyPoolContent = `
        <div class="modal-info">
          <p><strong>ℹ️ MemPool vacío</strong></p>
          <p>No hay transacciones pendientes en el pool de memoria.</p>
        </div>
        <div class="modal-body">
          <p>El mempool está vacío, lo que significa que todas las transacciones han sido procesadas y incluidas en bloques.</p>
        </div>
      `;
  if (window.safeModal) window.safeModal("MemPool - Estado Actual", emptyPoolContent); else if (window.showModalForm) window.showModalForm("MemPool - Estado Actual", emptyPoolContent); else if (window.showModal) window.showModal(emptyPoolContent, "MemPool - Estado Actual");
      return;
    }

    transactionsContainer.innerHTML = "";
    transactionsPool.forEach((transaction) => {
      const transactionDiv = document.createElement("div");
      transactionDiv.className = "transaction";
      // Render inputs como array (modelo UTXO)
      transactionDiv.innerHTML = `
        <p><strong>ID:</strong> ${transaction.id}</p>
        <p><strong>Inputs:</strong></p>
        <ul>
          ${
            transaction.inputs && Array.isArray(transaction.inputs)
              ? transaction.inputs
                  .map(
                    (input) => `
                <li>
                  <strong>txId:</strong> ${input.txId || ""} <br>
                  <strong>outputIndex:</strong> ${input.outputIndex ?? ""} <br>
                  <strong>Amount:</strong> ${input.amount ?? ""} <br>
                  <strong>Address:</strong> ${input.address || ""} <br>
                  <strong>Signature R:</strong> ${input.signature?.r || ""} <br>
                  <strong>Signature S:</strong> ${input.signature?.s || ""} <br>
                  <strong>Signature Recovery Param:</strong> ${
                    input.signature?.recoveryParam ?? ""
                  } <br>
                </li>
              `
                  )
                  .join("")
              : "<li>No inputs</li>"
          }
        </ul>
      `;
      transaction.outputs.forEach((output) => {
        const outputDiv = document.createElement("div");
        outputDiv.className = "transaction-output";
        outputDiv.innerHTML = `
          <p><strong>Output Amount:</strong> ${output.amount}</p>
          <p><strong>Output Address:</strong> ${output.address}</p>
        `;
        transactionDiv.appendChild(outputDiv);
      });
      transactionsContainer.appendChild(transactionDiv);
    });

    // Modal con resumen del mempool
    const totalAmount = transactionsPool.reduce((total, tx) => {
      // Sumar solo los outputs que no sean para el remitente (cambio)
      const senderAddress =
        tx.inputs && tx.inputs.length > 0 ? tx.inputs[0].address : null;
      const outputSum = tx.outputs
        ? tx.outputs.reduce((sum, output) => {
            // Intentar convertir el amount a número y validar
            const amt = Number(output.amount);
            const validAmt = Number.isFinite(amt) ? amt : 0;
            // Solo sumar si la dirección de output es distinta al remitente
            return output.address !== senderAddress ? sum + validAmt : sum;
          }, 0)
        : 0;
      return total + outputSum;
    }, 0);

    // =========================
    // MODAL: RESUMEN MEMPOOL
    // =========================

    const mempoolModalContent = `
      <div class="modal-info">
        <p><strong>📊 MemPool - Transacciones Pendientes</strong></p>
        <p><strong>Total de transacciones:</strong> ${transactionsPool.length}</p>
        <p><strong>Volumen total:</strong> ${
          (Number.isFinite(Number(totalAmount)) ? Number(totalAmount).toFixed(2) : "N/A")
        }</p>
      </div>
      <div class="modal-body">
        <h3>Detalles de Transacciones:</h3>
        ${transactionsPool
          .map((tx, index) => {
            const inputCount = tx.inputs ? tx.inputs.length : 0;
            const outputCount = tx.outputs ? tx.outputs.length : 0;
            // Solo mostrar el importe transferido al destinatario (no el cambio)
            const senderAddress =
              tx.inputs && tx.inputs.length > 0 ? tx.inputs[0].address : null;
            const recipientOutput = tx.outputs
              ? tx.outputs.find((output) => output.address !== senderAddress)
              : null;
            const txAmount = recipientOutput ? Number(recipientOutput.amount) : 0;
            const txAmountDisplay = Number.isFinite(txAmount) ? txAmount.toFixed(2) : "N/A";
            // Render detailed input info
            const inputsDetail = tx.inputs && Array.isArray(tx.inputs) && tx.inputs.length > 0
              ? `<ul style="margin-left:1em;">${tx.inputs.map(input => `
                  <li style="margin-bottom:0.5em;">
                    <strong>txId:</strong> <span style="font-family:monospace;">${input.txId || ""}</span><br>
                    <strong>outputIndex:</strong> ${input.outputIndex ?? ""}<br>
                    <strong>Address:</strong> <span style="font-family:monospace;">${input.address || ""}</span><br>
                    <strong>Amount:</strong> ${input.amount ?? ""}<br>
                    <strong>Signature R:</strong> <span style="font-family:monospace;">${input.signature?.r || ""}</span><br>
                    <strong>Signature S:</strong> <span style="font-family:monospace;">${input.signature?.s || ""}</span><br>
                    <strong>Signature Recovery Param:</strong> ${input.signature?.recoveryParam ?? ""}
                  </li>`).join("")}</ul>`
              : "<em>No inputs</em>";
            // Render outputs
            const outputsDetail = tx.outputs && Array.isArray(tx.outputs) && tx.outputs.length > 0
              ? `<ul style="margin-left:1em;">${tx.outputs.map(output => `
                  <li style="margin-bottom:0.5em;">
                    <strong>Amount:</strong> ${output.amount}<br>
                    <strong>Address:</strong> <span style="font-family:monospace;">${output.address}</span>
                  </li>`).join("")}</ul>`
              : "<em>No outputs</em>";
            return `
              <div class="transaction-modal-item" style="border:1px solid #ccc; border-radius:6px; margin-bottom:1em; padding:1em; background:#fafbfc;">
                <ul>
                  <li>
                    <strong>Transacción #${index + 1}</strong><br>
                    <strong>ID:</strong> <span style="font-family:monospace;">${tx.id}</span><br>
                    <strong>Inputs:</strong> ${inputCount} | <strong>Outputs:</strong> ${outputCount}<br>
                    <strong>Cantidad:</strong> ${txAmountDisplay}<br>
                    <details style="margin-top:0.5em;"><summary style="cursor:pointer;">Ver detalles de Inputs</summary>${inputsDetail}</details>
                    <details style="margin-top:0.5em;"><summary style="cursor:pointer;">Ver detalles de Outputs</summary>${outputsDetail}</details>
                  </li>
                </ul>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  if (window.safeModal) window.safeModal("MemPool - Transacciones Cargadas", mempoolModalContent); else if (window.showModalForm) window.showModalForm("MemPool - Transacciones Cargadas", mempoolModalContent); else if (window.showModal) window.showModal(mempoolModalContent, "MemPool - Transacciones Cargadas");

    // Puedes descomentar si quieres formatear los párrafos largos
    // formatParagraphs();
  };

  // Renderiza el resultado de una transacción enviada
  // =========================
  // RENDERIZADO DE RESULTADO DE TRANSACCIÓN
  // =========================

  const renderTransactionResult = (result) => {
    if (result.outputs && Array.isArray(result.outputs)) {
      const transactionContainer =
        document.getElementById("transactionContainer") ||
        document.createElement("div");
      transactionContainer.id = "transactionContainer";
      transactionContainer.className = "transaction-result";
      transactionContainer.innerHTML = "";
      result.outputs.forEach((output) => {
        const transactionBox = document.createElement("div");
        transactionBox.className = "transaction-box";
        const recipientElement = document.createElement("p");
        recipientElement.innerHTML = `<strong>Recipient:</strong> ${output.address}`;
        const amountElement = document.createElement("p");
        amountElement.innerHTML = `<strong>Amount:</strong> ${output.amount}`;
        transactionBox.appendChild(recipientElement);
        transactionBox.appendChild(amountElement);
        transactionContainer.appendChild(transactionBox);
      });
      document.body.appendChild(transactionContainer);
      console.log("Transacción renderizada en el DOM");
    } else {
      console.error("Datos de outputs no válidos:", result.outputs);
    }
    // Puedes descomentar si quieres formatear los párrafos largos
    // formatParagraphs();
  };

  // Renderiza el balance de una wallet con modal estilizado
  // =========================
  // RENDERIZADO DE BALANCE DE WALLET
  // =========================

  const renderBalance = (balanceData) => {
    if (window.MM && window.MM.wallet && typeof window.MM.wallet.renderBalance === 'function') {
      return window.MM.wallet.renderBalance(balanceData);
    }
    console.log("Rendering balance data:", balanceData);

    const balanceModalContent = `
      <div class="modal-info">
        <p><strong>💰 Balance de Wallet</strong></p>
        <p><strong>Estado:</strong> ${balanceData.message || "Consultado"}</p>
      </div>
      <div class="modal-body">
        <div class="modal-info">
          <p><strong>Clave Pública:</strong></p>
          <p style="word-break: break-all; font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 5px;">${
            balanceData.address
          }</p>
          <p><strong>Balance Actual:</strong> <span style="color: #f7931a; font-size: 18px; font-weight: bold;">${
            balanceData.balance
          }</span></p>
        </div>
        <h3>Información Adicional:</h3>
        <ul>
          <li><strong>Fecha de consulta:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Estado de la red:</strong> Activo</li>
          <li><strong>Tipo de consulta:</strong> Balance directo</li>
        </ul>
      </div>
    `;

  if (window.safeModal) window.safeModal("Balance de Wallet", balanceModalContent); else if (window.showModalForm) window.showModalForm("Balance de Wallet", balanceModalContent); else if (window.showModal) window.showModal(balanceModalContent, "Balance de Wallet");
  };

  // Renderiza la clave pública con modal estilizado
  // =========================
  // RENDERIZADO DE CLAVE PÚBLICA
  // =========================

  const renderPublicKey = (publicKey) => {
    if (window.MM && window.MM.wallet && typeof window.MM.wallet.renderPublicKey === 'function') {
      return window.MM.wallet.renderPublicKey(publicKey);
    }
    const publicKeyModalContent = `
      <div class="modal-info">
        <p><strong>🔑 Clave Pública Actual</strong></p>
        <p><strong>Estado:</strong> Activa</p>
      </div>
      <div class="modal-body">
        <h3>Información de la Clave:</h3>
        <div class="modal-info">
          <p><strong>Clave Pública:</strong></p>
          <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; word-break: break-all;">${JSON.stringify(
            publicKey.publicKey,
            null,
            2
          )}</pre>
        </div>
        <h3>Detalles:</h3>
        <ul>
          <li><strong>Formato:</strong> JSON</li>
          <li><strong>Tipo:</strong> Clave pública ECDSA</li>
          <li><strong>Fecha de consulta:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Estado de la red:</strong> Conectado</li>
        </ul>
      </div>
    `;

  if (window.safeModal) window.safeModal("Clave Pública del Sistema", publicKeyModalContent); else if (window.showModalForm) window.showModalForm("Clave Pública del Sistema", publicKeyModalContent); else if (window.showModal) window.showModal(publicKeyModalContent, "Clave Pública del Sistema");
  };

  // Balance de la clave pública ingresada
  // =========================
  // CONSULTA DE BALANCE POR CLAVE PÚBLICA
  // =========================

  const checkPublicKeyBalance = async () => {
    if (window.MM && window.MM.wallet && typeof window.MM.wallet.checkPublicKeyBalance === 'function') {
      return window.MM.wallet.checkPublicKeyBalance();
    }
    try {
      const publicKey = document.getElementById("addressInput").value.trim();
      if (!publicKey) {
  window.showModal(
          "Por favor, introduce una clave pública válida.",
          "Error de Validación"
        );
        return;
      }

      showToast("Consultando balance...", "info");

      const response = await fetch(`${apiBaseUrl}/address-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: publicKey }),
      });
      const data = await response.json();

      if (data.error) {
  window.showModal && window.showModal(`Error al consultar balance: ${data.error}`, "Error");
        showToast("Error en consulta de balance", "error");
      } else {
        renderBalance(data);
        showToast("Balance consultado exitosamente", "success");
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
  window.showModal(
        "Ocurrió un error inesperado al consultar el balance.",
        "Error de Conexión"
      );
      showToast("Error de conexión", "error");
    }
  };

  // Adjunta fichero con la publickey en formato json
  // =========================
  // CARGA DE WALLET DESDE ARCHIVO
  // =========================

  const uploadFile = async () => {
    if (window.MM && window.MM.wallet && typeof window.MM.wallet.uploadFile === 'function') {
      return window.MM.wallet.uploadFile();
    }
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    if (!file) {
  window.showModal(
        "No se ha seleccionado ningún archivo para cargar.",
        "Error de Validación"
      );
      console.warn("No file selected for hardware wallet upload.");
      return;
    }

    showToast("Subiendo archivo de wallet...", "info");

    const formData = new FormData();
    formData.append("usbPath", file);
    try {
      const response = await fetch(`${apiBaseUrl}/hardware-address`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorMessage = await response.text();
        console.error("Error uploading file:", errorMessage);
  window.showModal && window.showModal(`Error al subir archivo: ${errorMessage}`, "Error de Carga");
        showToast("Error al subir archivo", "error");
        return;
      }
      const data = await response.json();
      if (data.message === "Success" && data.publicKey) {
        document.getElementById("addressInput").value = data.publicKey;
        const successMessage = `
          <div class="modal-info">
            <p><strong>✅ Archivo subido exitosamente!</strong></p>
            <p><strong>Clave pública cargada:</strong></p>
            <p style="word-break: break-all; font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 5px;">${
              data.publicKey
            }</p>
          </div>
          <div class="modal-body">
            <h3>Información del archivo:</h3>
            <ul>
              <li><strong>Nombre del archivo:</strong> ${file.name}</li>
              <li><strong>Tamaño:</strong> ${(file.size / 1024).toFixed(
                2
              )} KB</li>
              <li><strong>Fecha de carga:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Estado:</strong> Cargado exitosamente</li>
            </ul>
          </div>
        `;
  if (window.safeModal) window.safeModal("Wallet Cargado", successMessage); else if (window.showModalForm) window.showModalForm("Wallet Cargado", successMessage); else if (window.showModal) window.showModal(successMessage, "Wallet Cargado");
        showToast("Archivo de wallet cargado", "success");
      } else {
  window.showModal(
          "Error al cargar el wallet o no se encontró una clave pública válida en el archivo.",
          "Error de Wallet"
        );
        showToast("Error al procesar wallet", "error");
      }
    } catch (error) {
  window.showModal && window.showModal(`Error de conexión: ${error.message}`, "Error de Red");
      showToast("Error de conexión", "error");
    }
  };

 

  // Función mejorada para mostrar el cuadro modal con el mensaje
  // =========================
  // MODAL: MENSAJE SIMPLE
  // =========================

  // UI helpers sourced from ESM (showModal/showModalForm/showToast/showProgressModal/animateProgress/closeCurrentModal)

  // Función para crear modales de confirmación
  // =========================
  // MODAL: CONFIRMACIÓN
  // =========================

  const showConfirmModal = (
    message,
    onConfirm,
    onCancel = null,
    title = "Confirmación"
  ) => {
    const confirmContent = `
      <div class="modal-info">
        <p>${message}</p>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <button id="confirmBtn" style="margin-right: 10px;">Confirmar</button>
        <button id="cancelBtn" class="cancel-btn">Cancelar</button>
      </div>
    `;

  if (window.safeModal) window.safeModal(title, confirmContent); else if (window.showModalForm) window.showModalForm(title, confirmContent); else if (window.showModal) window.showModal(confirmContent, title);

    document.getElementById("confirmBtn").onclick = () => {
      document.getElementById("loteModal").style.display = "none";
      if (onConfirm) onConfirm();
    };

    document.getElementById("cancelBtn").onclick = () => {
      document.getElementById("loteModal").style.display = "none";
      if (onCancel) onCancel();
    };
  };

  // Función para mostrar notificaciones toast
  // =========================
  // TOASTS DE NOTIFICACIÓN
  // =========================

  // All legacy inline helper implementations removed; using global window.* versions.

  // 🔄 Nueva función para modal con progreso animado
  // =========================
  // MODAL: PROGRESO ANIMADO
  // =========================

  // Progress helpers unified; no local fallback retained.

  // 🎬 Función para animar el progreso
  // =========================
  // ANIMACIÓN DE PROGRESO
  // =========================

  // animateProgress accessed via window.animateProgress when available.

  // 🚪 Función para cerrar modal actual
  // =========================
  // CERRAR MODAL ACTUAL
  // =========================

  // closeCurrentModal provided globally.

  // Función para mostrar el modal con contenido dinámico
  // =========================
  // MODAL: CONTENIDO DINÁMICO
  // =========================

  // showModalForm preferred; fallback to showModal wrapped via safeModal (to be added).

  // Lógica para el botón que abre el modal de lote (DESHABILITADO para forzar flujo de transacción)
  // =========================
  // EVENTOS: BOTÓN MODAL DE LOTE
  // =========================

  document.getElementById("openModalButton").addEventListener("click", () => {
  window.showModal(
      `<div style="text-align: center; padding: 20px;">
        <div style="font-size: 3em; margin-bottom: 15px;">🍷</div>
        <h3 style="color: #2e7d32; margin-bottom: 15px;">Proceso de Trazabilidad Blockchain</h3>
        <p style="margin-bottom: 20px; line-height: 1.6; color: #555;">
          Para crear un lote con verificación blockchain, 
          <strong>sigue este proceso ordenado</strong>:
        </p>
        <div style="background: #e8f5e8; border: 2px solid #4CAF50; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #2e7d32; margin-bottom: 15px;">📋 Flujo del Proceso:</h4>
          <ol style="text-align: left; color: #2e7d32; padding-left: 20px; line-height: 1.8;">
            <li><strong>Realizar Transacción</strong> → Usar "Nueva Transacción"</li>
            <li><strong>Completar Pago</strong> → Destinatario + Cantidad</li>
            <li><strong>✅ Transacción Exitosa</strong> → Se abre automáticamente</li>
            <li><strong>Registrar Trazabilidad</strong> → Datos del producto</li>
            <li><strong>🎯 QR con Blockchain Proof</strong> → Verificación lista</li>
          </ol>
        </div>
        <div style="background: #e3f2fd; border: 2px solid #1976d2; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #1976d2; margin: 0;">
            💡 <strong>Automático:</strong> El modal de trazabilidad se abrirá automáticamente 
            después de completar cualquier transacción.
          </p>
        </div>
      </div>`,
      "🍷 Info Lote - Proceso Blockchain"
    );
  });

  // Eventos DOM para botones principales
  document.getElementById("block").addEventListener("click", async () => {
    if (window.showToast) window.showToast("Cargando bloques...", "info");
    const blocks = await fetchData("/blocks");
    if (blocks.error) {
  window.showModal && window.showModal(`Error al cargar bloques: ${blocks.error}`, "Error");
      if (window.showToast) window.showToast("Error al cargar bloques", "error");
    } else {
      renderBlocks(blocks);
      if (window.showToast) window.showToast(`${blocks.length} bloques cargados`, "success");
    }
  });

  document
    .getElementById("transactionsPoolBtn")
    .addEventListener("click", async () => {
      if (window.showToast) window.showToast("Cargando mempool...", "info");
      const transactionsPool = await fetchData("/transactionsPool");
      console.log("Contenido recibido de transactionsPool:", transactionsPool);
      if (transactionsPool.error) {
  window.showModal(
          `Error al cargar transacciones: ${transactionsPool.error}`,
          "Error"
        );
        if (window.showToast) window.showToast("Error al cargar mempool", "error");
      } else {
        renderTransactionsPool(transactionsPool);
        if (window.showToast) window.showToast(
          `${transactionsPool.length} transacciones en mempool`,
          "success"
        );
      }
    });

  // Primary button bindings now centralized in events/dom.js (legacy fallbacks removed).

  // Lógica para el botón que abre el modal de transacciones
  const __mmTxBtn = document.getElementById("openTransactionModal");
  if (__mmTxBtn && !window.__MM_EVENTS_BOUND__) {
    __mmTxBtn.addEventListener("click", () => {
      // Prefer modular implementation if available
      if (window.MM && window.MM.features && typeof window.MM.features.openTransactionModal === 'function') {
        return window.MM.features.openTransactionModal();
      }
      // Coin control: consulta UTXOs y muestra selección en el modal de transacción
      const renderCoinControlForm = async () => {
        showProgressModal("Cargando UTXOs...", "Coin Control", ["Consultando UTXOs..."]);
        let utxoData;
        try {
          const address = window.walletAddress || null;
          if (!address) {
            closeCurrentModal();
            window.showModal && window.showModal("No hay dirección de wallet activa. Carga una wallet primero.", "Coin Control");
            return;
          }
          const res = await fetch(`${apiBaseUrl}/utxo-balance/${address}`);
          utxoData = await res.json();
        } catch (err) {
          closeCurrentModal();
          window.showModal && window.showModal("No se pudo obtener el UTXO set.", "Error Coin Control");
          return;
        }
        closeCurrentModal();
        if (!utxoData || !Array.isArray(utxoData.utxos) || utxoData.utxos.length === 0) {
          window.showModal && window.showModal("No hay UTXOs disponibles para seleccionar.", "Coin Control");
          return;
        }
        // Construir el formulario con selección de UTXOs
        const transactionFormContent = `
          <form id="transactionForm">
            <label for="recipientInput">Destinatario (Clave Pública):</label>
            <input type="text" id="recipientInput" name="recipient" placeholder="Introduce la clave pública del destinatario" required>
            <label for="amountInput">Cantidad:</label>
            <input type="number" id="amountInput" name="amount" step="0.01" min="0.01" placeholder="0.00" required>
            <label for="passphraseInput">Passphrase para firmar:</label>
            <input type="password" id="passphraseInput" name="passphrase" placeholder="Introduce tu passphrase" required value="javi">
            <div id="utxoSelectList" style="max-height:220px; overflow-y:auto; margin-bottom:12px;">
              ${utxoData.utxos.map((u, i) => `
                <div style="background:#f5f5f5; border-radius:6px; margin-bottom:6px; padding:8px; display:flex; align-items:center; gap:10px;">
                  <input type="checkbox" class="utxo-checkbox" id="utxo_${i}" data-txid="${u.txId}" data-outputindex="${u.outputIndex}" data-amount="${u.amount}" data-address="${u.address}">
                  <label for="utxo_${i}" style="flex:1; cursor:pointer;">
                    <span style="font-weight:600;">${u.amount}</span> <span style="color:#888;">(${u.txId.slice(0,12)}... #${u.outputIndex})</span>
                  </label>
                </div>
              `).join('')}
            </div>
            <button type="submit">Enviar Transacción</button>
          </form>
        `;
  if (window.safeModal) window.safeModal("Nueva Transacción (Coin Control)", transactionFormContent); else if (window.showModalForm) window.showModalForm("Nueva Transacción (Coin Control)", transactionFormContent); else if (window.showModal) window.showModal(transactionFormContent, "Nueva Transacción (Coin Control)");

        document.getElementById("transactionForm").addEventListener("submit", async (event) => {
          event.preventDefault();
          const recipient = document.getElementById("recipientInput").value.trim();
          const amount = parseFloat(document.getElementById("amountInput").value);
          const passphrase = document.getElementById("passphraseInput").value;
          if (!recipient) {
            window.showModal && window.showModal("Por favor, introduce una clave pública válida para el destinatario.", "Error de Validación");
            return;
          }
          if (amount <= 0) {
            window.showModal && window.showModal("La cantidad debe ser mayor que 0.", "Error de Validación");
            return;
          }
          if (!passphrase) {
            window.showModal && window.showModal("La passphrase es obligatoria para firmar la transacción.", "Error de Validación");
            return;
          }
          // Obtener UTXOs seleccionados
          const selectedUTXOs = Array.from(document.querySelectorAll('.utxo-checkbox:checked')).map(cb => ({
            txId: cb.dataset.txid,
            outputIndex: parseInt(cb.dataset.outputindex, 10),
            amount: parseFloat(cb.dataset.amount || '0'),
            address: cb.dataset.address || ''
          }));
          // TODO: Implementar envío de transacción usando selectedUTXOs (lógica recortada en refactor)
        }); // end transactionForm submit handler
    }; // end renderCoinControlForm
    // invoke renderCoinControlForm
    renderCoinControlForm();
    }); // cierre addEventListener click openTransactionModal
  }

  // Restaurado: función showTraceabilityModal separada
  function showTraceabilityModal(transaction) {
    const txId = transaction?.id || transaction?.transactionId || 'N/A';
    const traceabilityFormContent = `
      <form id="traceabilityForm">
        <h3>🚀 Registro de Trazabilidad</h3>
        <input type="hidden" id="transactionId" value="${txId}">
        <label for="loteIdAlta">ID Lote:</label>
        <input type="text" id="loteIdAlta" placeholder="Auto o Transaction ID">
        <label for="nombreProductoAlta">Nombre Producto:</label>
        <input type="text" id="nombreProductoAlta" value="Vino Premium">
        <label for="fechaProduccionAlta">Fecha Producción:</label>
        <input type="date" id="fechaProduccionAlta" value="${new Date().toISOString().split('T')[0]}">
        <label for="fechaCaducidadAlta">Fecha Caducidad:</label>
        <input type="date" id="fechaCaducidadAlta" value="${new Date(Date.now()+365*24*60*60*1000).toISOString().split('T')[0]}">
        <label for="origen">Origen:</label>
        <input type="text" id="origen" value="La Rioja">
        <label for="bodega">Bodega:</label>
        <input type="text" id="bodega" value="Bodega Demo">
        <label for="año">Año:</label>
        <input type="number" id="año" value="${new Date().getFullYear()}">
        <label for="variedad">Variedad:</label>
        <input type="text" id="variedad" value="Tempranillo">
        <label for="región">Región:</label>
        <input type="text" id="región" value="Rioja Alta">
        <label for="denominacionOrigen">Denominación Origen:</label>
        <input type="text" id="denominacionOrigen" value="DOCa Rioja">
        <label for="alcohol">Alcohol (%):</label>
        <input type="text" id="alcohol" value="13.5">
        <label for="notaDeCata">Nota de Cata:</label>
        <textarea id="notaDeCata"></textarea>
        <label for="maridaje">Maridaje:</label>
        <textarea id="maridaje"></textarea>
        <label for="precio">Precio:</label>
        <input type="text" id="precio" value="">
        <label for="comentarios">Comentarios:</label>
        <textarea id="comentarios"></textarea>
        <label for="trazabilidad">Trazabilidad extra:</label>
        <textarea id="trazabilidad"></textarea>
        <button type="submit">Generar QR con prueba</button>
      </form>`;
  if (window.safeModal) window.safeModal("🚀 Registro de Trazabilidad", traceabilityFormContent); else if (window.showModalForm) window.showModalForm("🚀 Registro de Trazabilidad", traceabilityFormContent); else if (window.showModal) window.showModal(traceabilityFormContent, "🚀 Registro de Trazabilidad");

    // Listener submit
    setTimeout(() => {
      const form = document.getElementById('traceabilityForm');
      if (!form) return;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const generateLoteId = () => `L${Date.now()}`;
        const transactionId = document.getElementById('transactionId')?.value?.trim();
        let loteId = document.getElementById('loteIdAlta')?.value?.trim();
        if (!loteId) {
          loteId = transactionId || generateLoteId();
          const input = document.getElementById('loteIdAlta');
          if (input) input.value = loteId;
        }
        if (!transactionId) {
          window.showModal && window.showModal('No se ha recibido el identificador de transacción.', 'Error de datos');
          return;
        }
        try {
          const metadata = {
            loteId,
            nombreProducto: document.getElementById('nombreProducto')?.value || document.getElementById('nombreProductoAlta')?.value || 'Producto sin nombre',
            fechaProduccion: document.getElementById('fechaProduccion')?.value || document.getElementById('fechaProduccionAlta')?.value || new Date().toISOString().split('T')[0],
            fechaCaducidad: document.getElementById('fechaCaducidad')?.value || document.getElementById('fechaCaducidadAlta')?.value || new Date(Date.now()+365*24*60*60*1000).toISOString().split('T')[0],
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
          const loteResp = await fetchData('/lotes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ txId: transactionId, metadata }) });
          if (loteResp.error || !loteResp.success) {
            window.showModal && window.showModal('Error creando registro de lote: ' + (loteResp.error || 'Error desconocido'), 'Error');
            return;
          }
          await generateQRWithProof(loteId, transactionId);
        } catch(err) {
          window.showModal && window.showModal('Error al generar el QR: ' + err.message, 'Error interno');
        }
      });
    }, 0);
  }

  // Inline modal helper for showing JSON/details (dark themed)
  function showInlineModal(payload, title = 'Detalle') {
    try {
      const existing = document.getElementById('inlineUtxoModal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'inlineUtxoModal';
      modal.style.position = 'fixed';
      modal.style.left = '0';
      modal.style.top = '0';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.background = 'rgba(0,0,0,0.6)';
      modal.style.zIndex = 25000;
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';

      const box = document.createElement('div');
      box.style.maxWidth = '920px';
      box.style.width = 'min(92vw,920px)';
      box.style.maxHeight = '82vh';
      box.style.overflow = 'auto';
      box.style.background = 'linear-gradient(180deg,#081226,#04121a)';
      box.style.border = '1px solid rgba(255,255,255,0.06)';
      box.style.borderRadius = '10px';
      box.style.padding = '18px';
      box.style.color = '#fff';

      const h = document.createElement('h3');
      h.textContent = title;
      h.style.marginTop = '0';

      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-word';
      pre.style.fontSize = '13px';
      pre.style.color = '#fff';
      pre.style.margin = '8px 0 0 0';
      pre.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

      const close = document.createElement('button');
      close.textContent = 'Cerrar';
      close.className = 'dashboard-btn secondary';
      close.style.marginTop = '12px';
      close.style.padding = '8px 12px';
      close.style.fontSize = '13px';
      close.addEventListener('click', () => modal.remove());

      box.appendChild(h);
      box.appendChild(pre);
      box.appendChild(close);
      modal.appendChild(box);
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    } catch (e) {
      console.warn('showInlineModal failed', e);
      alert(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
    }
  }

  // Evento global para cerrar cualquier modal al hacer clic fuera del contenido
  window.onclick = (event) => {
    document.querySelectorAll(".modal").forEach((modal) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
    // Cerrar específicamente el modal de wallet si se hace clic fuera
    const walletModal = document.getElementById("walletModalContainer");
    if (walletModal && event.target === walletModal) {
      walletModal.style.display = "none";
    }
  };

  // Puedes añadir aquí otras funciones auxiliares si lo necesitas
  // LOG GLOBAL: Detectar cualquier submit en el documento
  document.addEventListener("submit", function (e) {
    console.log(
      "[GLOBAL SUBMIT] Evento submit detectado:",
      e.target && e.target.id
    );
  });

  // LOG GLOBAL: Detectar errores JS
  window.onerror = function (message, source, lineno, colno, error) {
    console.error("[GLOBAL ERROR]", { message, source, lineno, colno, error });
  };
});
// Fin del bloque DOMContentLoaded
// Fin del archivo fetchData.js
