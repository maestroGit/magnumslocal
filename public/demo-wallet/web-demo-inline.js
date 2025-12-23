// web-demo-inline.js (versión limpia, solo modal moderno)
// Este script muestra el modal de transferencia usando modalUnified.js (#mainModal)
// y expone window.openTransferModal para compatibilidad.

(function(){
  // Expone openTransferModal en window
  function openTransferModal(ev) {
    // Renderiza el contenido del modal de transferencia
    const html = `
      <div class="transferir" style="">
        <div class="card-header"><h3>Transferir</h3></div>
        <label class="field">Sender publicKey (auto-llenado al importar):
          <div class="readonly-field" style="display:flex;align-items:center;gap:8px;">
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
    if (typeof window.openModal === 'function') {
      window.openModal({
        title: 'Transferir',
        body: html,
        footer: '',
        options: { showClose: true, overlayClose: false, escClose: true }
      });
      // Aquí puedes agregar listeners para autocompletar campos, manejar UTXOs, etc.
      setTimeout(() => {
        // Ejemplo: autocompletar senderPub si viene en el evento
        const pubFromEvent = ev && ev.detail && ev.detail.publicKey;
        const senderInput = document.getElementById('senderPub');
        if (senderInput && pubFromEvent) senderInput.value = pubFromEvent;
        // Ejemplo: balance y utxos
        const balEl = document.getElementById('balance');
        const utxos = ev && ev.detail && ev.detail.utxos;
        if (balEl && ev && ev.detail) {
          const available = ev.detail.available;
          const serverBal = ev.detail.serverBalance;
          balEl.textContent = (available ?? serverBal ?? balEl.textContent);
        }
        const utxoList = document.getElementById('utxoSelectList');
        if (utxoList && Array.isArray(utxos)) {
          utxoList.innerHTML = '';
          if (utxos.length === 0) {
            utxoList.innerHTML = '<span class="muted">No hay UTXOs disponibles.</span>';
          } else {
            utxos.forEach(function(u, i){
              var div = document.createElement('div');
              div.className = 'utxo-container';
              var cb = document.createElement('input');
              cb.type = 'checkbox';
              cb.className = 'utxo-checkbox';
              cb.id = 'utxo_' + i;
              cb.dataset.txid = u.txId;
              cb.dataset.outputindex = u.outputIndex;
              cb.dataset.amount = u.amount;
              cb.dataset.address = u.address;
              var label = document.createElement('label');
              label.htmlFor = cb.id;
              label.className = 'utxo-meta';
              label.innerHTML = '<span class="utxo-amount">'+u.amount+'</span> <span class="utxo-meta">'+u.txId+' #'+u.outputIndex+'</span>';
              div.appendChild(cb);
              div.appendChild(label);
              utxoList.appendChild(div);
            });
          }
        }
        // Historial button
        const historialBtn = document.getElementById('historial');
        if (historialBtn && window.handleHistorialClick) {
          historialBtn.onclick = (e) => {
            e.preventDefault();
            window.handleHistorialClick();
          };
        }
      }, 0);
    } else {
      if (typeof window.openModal === 'function') {
        window.openModal({
          title: 'Transferir',
          body: '<pre style="white-space:pre-wrap">' + html.replace(/<[^>]+>/g, '') + '</pre>',
          size: 'md',
          footer: '<button class="btn btn-highlight" onclick="window.closeModal && window.closeModal()">Cerrar</button>'
        });
      } else {
        // Fallback extremo: alert nativo solo si no hay openModal
        alert('Transferir\n' + html.replace(/<[^>]+>/g, ''));
      }
    }
  }
  // Exponer global
  window.openTransferModal = openTransferModal;
})();