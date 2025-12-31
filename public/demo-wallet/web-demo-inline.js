// Ensure openTransferModal exists on window early, queue calls until DOM is ready
(function(){
  var queuedEvent = null;
  var domReady = document.readyState === 'complete' || document.readyState === 'interactive';
  console.log('[modal] inline script init, domReady:', domReady);
  function enqueueOrRun(ev){
    console.log('[modal] enqueueOrRun called, domReady:', domReady);
    if (!domReady) { queuedEvent = ev; console.log('[modal] openTransferModal queued until DOM ready'); }
    else { 
      console.log('[modal] attempting to call __openTransferModalActual');
      try { window.__openTransferModalActual && window.__openTransferModalActual(ev); } catch(e){ console.error('[modal] openTransferModal actual error', e); } 
    }
  }
  try { window.openTransferModal = enqueueOrRun; console.log('[modal] stub installed'); } catch(e) { console.error('[modal] failed to install stub', e); }
  
  function onDOMReady() {
    console.log('[modal] DOMContentLoaded fired or already ready');
    domReady = true; 
    if (queuedEvent) { 
      console.log('[modal] processing queued event');
      try { window.__openTransferModalActual && window.__openTransferModalActual(queuedEvent); } catch(e){ console.error('[modal] queued openTransferModal error', e); } 
      queuedEvent = null; 
    }
  }
  
  if (domReady) {
    // DOM already ready, execute immediately
    onDOMReady();
  } else {
    document.addEventListener('DOMContentLoaded', onDOMReady);
  }
})();

// Mostrar la sección transferir solo al importar la publicKey
(function initTransferModal() {
  console.log('[modal] initTransferModal executing, readyState:', document.readyState);
  
  function setup() {
    console.log('[modal] setup executing');
    var modal = document.getElementById('loteModal');
    var modalTitle = document.getElementById('modalTitle');
    var modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) {
      console.warn('[modal] required elements not found, retrying in 50ms');
      setTimeout(setup, 50);
      return;
    }
    console.log('[modal] all elements found');
    function openTransferModal(ev){
      console.log('[modal] openTransferModal(actual) EXECUTING', { hasDetail: !!(ev && ev.detail), keys: ev && ev.detail ? Object.keys(ev.detail) : [] });
      // Resolve modal elements defensively (avoid outer-scope dependency)
      var modal = document.getElementById('loteModal');
      var modalTitle = document.getElementById('modalTitle');
      var modalBody = document.getElementById('modalBody');
      var modalFooter = document.getElementById('modalFooter');
      if (!modal || !modalTitle || !modalBody) { console.warn('[modal] structure missing for openTransferModal'); return; }
      console.log('[modal] modal elements found, rendering transfer UI');
      // Populate modal with the transfer UI
      try {
        modalTitle.textContent = 'Transferir';
        console.log('[modal] title set');
        // Clear previous content
        modalBody.innerHTML = '';
        console.log('[modal] body cleared');
        // Limpiar footer para evitar duplicidad de botones
        var modalFooter = document.getElementById('modalFooter');
        if (modalFooter) { modalFooter.innerHTML = ''; modalFooter.style.display = 'none'; }
        // Render transfer UI directly (since inline section was removed)
        modalBody.innerHTML = `
          <div class="transferir" style="">
            <div class="card-header"><h3>Transferir</h3></div>
            <label class="field">Sender publicKey (auto-llenado al importar):
              <div class="readonly-field">
                <input id="senderPub" class="input readonly" readonly aria-readonly="true" placeholder="Se autocompleta al importar" />
                <button type="button" id="copySenderPub" class="copy-btn" title="Copiar publicKey">Copiar</button>
                <button type="button" id="historial" class="btn btn-secondary" style="margin-left:8px;">Historial</button>
              </div>
            </label>
            <div class="muted">Balance: <span id="balance">0</span></div>
            <div>UTXOs disponibles:</div>
            <div id="utxoSelectList" class="utxo-select-list"></div>
            <pre id="utxosOut" class="output" style="display:none"></pre>
            <div class="muted" style="font-size:0.9em;margin:6px 0 10px;">
              Nota: Los UTXOs marcados como <strong>Pendiente</strong> están a la espera de confirmación y no pueden reutilizarse temporalmente.
              El balance mostrado excluye estos UTXOs hasta su confirmación.
            </div>
            <label class="field field-stack" for="recipient">Recipient-receptor (address)</label>
            <input id="recipient" class="input" placeholder="04..." />
            <label class="field field-stack" for="amount">Amount</label>
            <input id="amount" class="input half" type="number" step="1" min="1" />
            <label class="field field-stack" for="passphraseTx">Passphrase para firmar</label>
            <input id="passphraseTx" type="password" class="input half" placeholder="Tu passphrase" autocomplete="current-password" />
            <div class="modal-error hidden" id="modalTransferError"></div>
            <div class="modal-success hidden" id="modalSuccess"></div>
            <button id="signSend" class="btn btn-highlight">Firmar y Enviar</button>
            <pre id="sendOut" class="output"></pre>
          </div>`;
        var clone = modalBody.querySelector('.transferir');

        // Re-attach event handler for Historial button
        var historialBtn = clone.querySelector('#historial');
        if (historialBtn) {
          historialBtn.addEventListener('click', function(e) {
            console.log('[DEBUG][modal] Historial button clicked');
            e.preventDefault();
            try {
              if (window.handleHistorialClick) {
                console.log('[DEBUG][modal] window.handleHistorialClick exists, calling...');
                window.handleHistorialClick();
                console.log('[DEBUG][modal] window.handleHistorialClick called successfully');
              } else {
                console.warn('[DEBUG][modal] window.handleHistorialClick does NOT exist');
                alert('No se pudo abrir el historial. [window.handleHistorialClick no está disponible]');
              }
            } catch (err) {
              console.error('[DEBUG][modal] Error calling window.handleHistorialClick:', err);
              alert('No se pudo abrir el historial. [window.handleHistorialClick error]');
            }
          });
        }

        // Wiring for signSend button
        var signSendBtn = clone.querySelector('#signSend');
        if (signSendBtn) {
          signSendBtn.addEventListener('click', function() {
            var recipientVal = document.getElementById('recipient').value;
            var amountVal = document.getElementById('amount').value;
            var pass = document.getElementById('passphraseTx').value;
            var hiddenRecipient = document.getElementById('hiddenRecipient');
            var hiddenAmount = document.getElementById('hiddenAmount');
            var hiddenPass = document.getElementById('hiddenPassphraseTx');
            var hiddenUtxoList = document.getElementById('hiddenUtxoList');

            if (hiddenRecipient) hiddenRecipient.value = recipientVal;
            if (hiddenAmount) hiddenAmount.value = amountVal;
            if (hiddenPass) hiddenPass.value = pass;

            // Copy selected UTXOs from modal to hidden list
            if (hiddenUtxoList) {
              hiddenUtxoList.innerHTML = '';
              var modalUtxoList = clone.querySelector('#utxoSelectList');
              if (modalUtxoList) {
                var selectedCheckboxes = modalUtxoList.querySelectorAll('.utxo-checkbox:checked');
                selectedCheckboxes.forEach(function(cb){
                  var clonedCheckbox = cb.cloneNode(true);
                  clonedCheckbox.checked = true;
                  hiddenUtxoList.appendChild(clonedCheckbox);
                });
                console.log('[modal] copied', selectedCheckboxes.length, 'selected UTXOs to hidden list');
              }
            }

            console.log('[modal] copied values to hidden elements', { recipient: recipientVal, amount: amountVal, hasPass: !!pass });

            // Delegar en el botón original de envío (#sendTx) para reutilizar la lógica existente
            var sendBtn = document.getElementById('sendTx');
            if (sendBtn) {
              try { 
                console.log('[modal] delegating to #sendTx via dispatchEvent'); 
                sendBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              } catch(err){ 
                console.warn('[modal] fallo al delegar en #sendTx:', err); 
              }
            } else {
              renderModalError('Sistema de envío no disponible. Recarga la página.');
              console.error('[modal] botón #sendTx no encontrado');
            }
          }); // <-- cierre del event handler de signSend
        }

        // Footer de modal no usado para Transferir; evitamos botones duplicados
        if (modalFooter) { modalFooter.innerHTML = ''; modalFooter.style.display = 'none'; }
        // Show the modal
        if (typeof window.showLoteModal === 'function') { window.showLoteModal(); }
        else { modal.classList.remove('hidden'); modal.style.display = 'flex'; modal.style.visibility = 'visible'; }
        console.log('[modal] openTransferModal displayed?', { hiddenClass: modal.classList.contains('hidden'), display: modal.style.display });
      } catch (err) {
        console.error('[modal] error preparando contenido de Transferir:', err);
      }
    }
    // Listen for event and expose a global helper
    document.addEventListener('wallet:imported', openTransferModal);
    // Expose actual implementation immediately (not waiting for queueing)
    try { 
      window.__openTransferModalActual = openTransferModal; 
      window.openTransferModal = openTransferModal; // Override stub directly
      console.log('[modal] openTransferModal exposed on window, typeof:', typeof window.openTransferModal);
    } catch(e) { console.error('[modal] failed to expose openTransferModal', e); }
  }
  
  // Execute setup immediately if DOM is ready, else wait
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('[modal] DOM already ready, executing setup immediately');
    setup();
  } else {
    console.log('[modal] waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', setup);
  }
})();

// Evitar navegación fuera de la demo al hacer click en la cabecera
document.addEventListener('DOMContentLoaded', function() {
  var goToView = document.getElementById('goToView');
  var modal = document.getElementById('loteModal');
  if (!modal) { console.warn('[modal] #loteModal not found'); return; }
  // No agregamos botones en el footer del modal en esta vista
  // Limpieza de estado del botón de importación si el modal se cerró sin completar
  (function cleanupImportButton(){
    try {
      var modal = document.getElementById('loteModal');
      var senderPub = document.getElementById('senderPub');
      var hasImported = senderPub && senderPub.value && senderPub.value.length > 20;
      if (!hasImported) {
        var importBtn = document.getElementById('import');
        if (importBtn && (importBtn.classList.contains('wallet-loaded') || importBtn.style.display === 'none')) {
          importBtn.classList.remove('wallet-loaded');
          importBtn.style.display = '';
          importBtn.disabled = false;
          console.log('[modal] cleaned up import button state on modal close');
        }
      }
    } catch(_) {}
  })();
  // Guard to avoid immediate re-open after close
  var reopenLockUntil = 0;
  // Hide helper for consistent teardown and event
  function hide() {
    try {
      if (!modal) return;
      if (!modal.classList.contains('hidden')) modal.classList.add('hidden');
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      try { document.dispatchEvent(new CustomEvent('appmodal:close')); } catch(_) {}
    } catch (e) { console.warn('[modal] hide() error', e); }
  }
  function show() {
    var now = Date.now();
    if (now < reopenLockUntil) {
      console.warn('[modal] show blocked by reopen lock');
      return;
    }
    modal.classList.remove('hidden');
    // Force display flex to ensure visibility
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    console.log('[modal] show() executed, hidden:', modal.classList.contains('hidden'), 'display:', modal.style.display);
  }
  // Exponer helpers globales para control programático
  try { window.showLoteModal = show; window.hideLoteModal = hide; } catch {}
  // Provide a success banner helper
  function renderModalSuccess(message){
    var modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    var existing = modalBody.querySelector('.modal-success');
    if (!existing) {
      existing = document.createElement('div');
      existing.className = 'modal-success';
      modalBody.insertBefore(existing, modalBody.firstChild);
    }
    existing.textContent = message;
  }
  // Expose global helper for success messages
  try { window.showTransferSuccess = function(msg, autoCloseMs){ renderModalSuccess(msg || 'Transacción enviada correctamente.'); if (autoCloseMs) setTimeout(hide, autoCloseMs); }; } catch {}
  // Listener directo sobre el botón de cierre
  var closeBtn = modal.querySelector('.modal-content .close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      console.log('[modal] close button clicked');
      e.preventDefault();
      e.stopPropagation();
      hide();
      console.log('[modal] after hide(), classList=', modal.className);
      // Set short lock to prevent immediate re-open via other handlers
      reopenLockUntil = Date.now() + 600;
      // Fallback inline style in case CSS is overridden
      setTimeout(function(){
        if (!modal.classList.contains('hidden')) {
          console.warn('[modal] hidden class removed unexpectedly; forcing style display:none');
          modal.style.display = 'none';
        } else {
          console.log('[modal] hidden class present, modal should be hidden');
        }
      }, 0);
    });
    // Accesibilidad: Enter o Space cierra
    closeBtn.addEventListener('keydown', function(e) {
      console.log('[modal] close button keydown', e.key);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hide();
      }
    });
  }
  // Delegación de eventos dentro del modal
  modal.addEventListener('click', function(e) {
    var target = e.target;
    console.log('[modal] click in modal', { targetTag: target.tagName, classes: target.className });
    if (target.classList && target.classList.contains('close')) {
      console.log('[modal] delegated close click');
      hide();
      console.log('[modal] after delegated hide(), classList=', modal.className);
    } else if (target === modal) {
      // Click sobre el fondo (backdrop)
      console.log('[modal] backdrop clicked');
      hide();
      console.log('[modal] after backdrop hide(), classList=', modal.className);
      reopenLockUntil = Date.now() + 600;
    }
  });
  // Botones con data-dismiss="modal"
  modal.addEventListener('click', function(e) {
    var btn = e.target.closest && e.target.closest('[data-dismiss="modal"]');
    if (btn) {
      console.log('[modal] data-dismiss clicked');
      e.preventDefault();
      hide();
    }
  });
  // Tecla Escape para cerrar
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') console.log('[modal] escape pressed');
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) hide();
  });

  // Observe class changes to detect external re-show
  var mo = new MutationObserver(function(muts){
    muts.forEach(function(m){
      if (m.attributeName === 'class') {
        var hidden = modal.classList.contains('hidden');
        console.log('[modal] class mutation; hidden=', hidden, 'className=', modal.className);
      }
    });
  });
  mo.observe(modal, { attributes: true });
});
