import { showModal, showModalForm, closeCurrentModal } from '../ui/modals.js';
import { getCurrentPublicKey } from '../core/walletUtils.js';
// walletGlobal.js: wiring para la herramienta de cifrado/carga de wallet global en el dashboard

document.addEventListener('DOMContentLoaded', () => {
        // Prompt de passphrase en modal reutilizando el contenedor de formulario (loteModal)
        function promptPassphrase(actionLabel = 'continuar') {
          return new Promise((resolve) => {
            const title = 'Wallet Global';
            const body = `
              <div class="modal-info">
                <p>Introduce la passphrase para ${actionLabel}:</p>
                <input type="password" id="passphraseModalInput" placeholder="Passphrase" autocomplete="new-password" />
              </div>
              <div style="text-align:center;margin-top:16px;display:flex;gap:10px;justify-content:center;">
                <button id="passphraseConfirm" class="dashboard-btn primary">Confirmar</button>
              </div>`;
            showModalForm(title, body);
            const input = document.getElementById('passphraseModalInput');
            const okBtn = document.getElementById('passphraseConfirm');
            if (input) setTimeout(() => input.focus(), 50);
            const done = (val) => { try { closeCurrentModal(); } catch(_) { const m=document.getElementById('loteModal'); if (m) m.style.display='none'; } resolve(val); };
            if (okBtn) okBtn.onclick = () => done(input ? input.value : '');
            // El aspa (X) del modal ya cierra y resuelve null
            if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (okBtn) okBtn.click(); } });
          });
        }
        // Prompt combinado: selección de fichero JSON + passphrase (para Descifrar/Subir)
        function promptFileAndPassphrase(actionLabel = 'continuar') {
          return new Promise((resolve) => {
            const title = 'Wallet Global';
            const body = `
              <div class="modal-info">
                <p>Selecciona el archivo de wallet (JSON) y la passphrase para ${actionLabel}:</p>
                <input type="file" id="walletFileModalInput" accept="application/json" />
                <input type="password" id="passphraseModalInput" placeholder="Passphrase" autocomplete="new-password" />
              </div>
              <div style="text-align:center;margin-top:16px;display:flex;gap:10px;justify-content:center;">
                <button id="filePassConfirm" class="dashboard-btn primary">Confirmar</button>
              </div>`;
            showModalForm(title, body);
            const fileInput = document.getElementById('walletFileModalInput');
            const passInput = document.getElementById('passphraseModalInput');
            const okBtn = document.getElementById('filePassConfirm');
            if (passInput) setTimeout(() => passInput.focus(), 50);
            if (okBtn) okBtn.onclick = () => {
              const f = fileInput && fileInput.files && fileInput.files[0];
              const p = passInput ? passInput.value : '';
              if (!f) { showModal('Selecciona un archivo JSON de wallet.', 'Wallet Global'); return; }
              if (!p) { showModal('Introduce una passphrase.', 'Wallet Global'); return; }
              const reader = new FileReader();
              reader.onload = (evt) => {
                try {
                  const json = JSON.parse(evt.target.result);
                  try { closeCurrentModal(); } catch(_) {}
                  resolve({ walletJson: json, passphrase: p });
                } catch (err) {
                  showModal('Archivo inválido: ' + err.message, 'Wallet Global');
                }
              };
              reader.readAsText(f);
            };
          });
        }
        // Función para actualizar el header con la clave pública global
        async function updateGlobalWalletPubKeyHeader() {
          const pubKeySpan = document.getElementById('walletGlobalPubKeyValue');
          if (pubKeySpan) {
            const pk = await getCurrentPublicKey();
            pubKeySpan.textContent = pk ? pk : 'No disponible';
          }
        }
        // Actualizar al cargar
        updateGlobalWalletPubKeyHeader();

      // Handler para mostrar la clave pública activa consultando siempre el backend
      const publicKeyBtn = document.getElementById('publicKeyWallet');
      if (publicKeyBtn) {
        publicKeyBtn.addEventListener('click', async () => {
          // Acción deshabilitada: no mostrar modal ni realizar ninguna acción
        });
      }
    const generateBtn = document.getElementById('wallet-global-generate');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        const pass = await promptPassphrase('generar una nueva wallet');
        if (pass === null) return; // cancelado
        if (!pass) return showModal('Introduce una passphrase.', 'Wallet Global');
        try {
          const res = await fetch('/wallet/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase: pass })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error generando wallet');
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wallet_cifrada.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showModal('Wallet nueva generada y descargada.', 'Wallet Global');
        // Toast visual para confirmación
        function showWalletToast(msg) {
          let toast = document.getElementById('wallet-toast');
          if (!toast) {
            toast = document.createElement('div');
            toast.id = 'wallet-toast';
            toast.style.position = 'fixed';
            toast.style.bottom = '32px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.background = '#2a2';
            toast.style.color = '#fff';
            toast.style.padding = '12px 28px';
            toast.style.borderRadius = '8px';
            toast.style.fontSize = '1.1em';
            toast.style.boxShadow = '0 2px 12px #0003';
            toast.style.zIndex = 9999;
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            document.body.appendChild(toast);
          }
          toast.textContent = msg;
          toast.style.opacity = '1';
          setTimeout(() => { toast.style.opacity = '0'; }, 2600);
        }
        } catch (err) {
          showModal('Error: ' + err.message, 'Wallet Global');
        }
      });
    }
  // const encryptBtn = document.getElementById('wallet-global-encrypt');
  const decryptBtn = document.getElementById('wallet-global-decrypt');
  const uploadBtn = document.getElementById('wallet-global-upload');
  let loadedWalletJson = null; // mantenido por compatibilidad pero no se usa en la UI principal

  // Botón y lógica de cifrar y descargar eliminados

  if (decryptBtn) {
    decryptBtn.addEventListener('click', async () => {
      const res = await promptFileAndPassphrase('descifrar la wallet');
      if (!res) return; // cancelado
      const { walletJson, passphrase: pass } = res;
      // Soportar formato clásico y formato keystore nuevo
      let encryptedPrivateKey = walletJson.encryptedPrivateKey;
      let salt = walletJson.salt;
      let iv = walletJson.iv;
      let tag = walletJson.tag;
      if (!encryptedPrivateKey && walletJson.keystoreVersion && walletJson.kdfParams && walletJson.cipherParams) {
        encryptedPrivateKey = walletJson.encryptedPrivateKey;
        salt = walletJson.kdfParams.salt;
        iv = walletJson.cipherParams.iv;
        tag = walletJson.tag;
      }
      if (!encryptedPrivateKey || !salt || !iv || !tag) {
        return showModal('El archivo no parece ser una wallet cifrada válida.', 'Wallet Global');
      }
      try {
        const res = await fetch('/wallet/decrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encryptedPrivateKey, salt, iv, tag, passphrase: pass })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error descifrando wallet');
        // Mostrar advertencia y botón para revelar la clave privada
        showModal(`
          <span style='color:#b00;font-weight:bold;'>⚠️ Atención:</span> La clave privada es secreta. No la compartas.<br>
          <button id='show-privkey-btn' style='margin:8px 0 0 0;padding:4px 12px;font-size:1em;'>Mostrar clave privada</button>
          <span id='privkey-value' style='display:none;word-break:break-all;background:#f8f8f8;color:#222;padding:6px 10px;border-radius:6px;margin-left:8px;'>${data.privateKey}</span>
        `, 'Wallet Global');
        setTimeout(() => {
          const btn = document.getElementById('show-privkey-btn');
          const privSpan = document.getElementById('privkey-value');
          if (btn && privSpan) {
            let visible = false;
            btn.addEventListener('click', () => {
              visible = !visible;
              privSpan.style.display = visible ? 'inline-block' : 'none';
              btn.textContent = visible ? 'Ocultar clave privada' : 'Mostrar clave privada';
            });
          }
        }, 100);
      } catch (err) {
        showModal('Error: ' + err.message, 'Wallet Global');
      }
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const res = await promptFileAndPassphrase('cargar la wallet en el backend');
      if (!res) return; // cancelado
      const { walletJson: loadedWalletJson, passphrase: pass } = res;
      // Solo aceptar formato keystore actual
      if (!(loadedWalletJson.keystoreVersion && loadedWalletJson.kdfParams && loadedWalletJson.cipherParams && loadedWalletJson.tag && loadedWalletJson.publicKey && loadedWalletJson.encryptedPrivateKey)) {
        showModal('El archivo no es una wallet cifrada válida (solo se acepta el formato keystore generado por el backend actual).', 'Wallet Global');
        try { console.error('[WALLET-DEBUG] Wallet inválida:', loadedWalletJson); } catch(e) {}
        return;
      }
      const encryptedPrivateKey = loadedWalletJson.encryptedPrivateKey;
      const salt = loadedWalletJson.kdfParams.salt;
      const iv = loadedWalletJson.cipherParams.iv;
      const tag = loadedWalletJson.tag;
      const publicKey = loadedWalletJson.publicKey;
      const debugMsg =
        '[WALLET-DEBUG] Formato detectado: keystore\n' +
        '[WALLET-DEBUG] encryptedPrivateKey: ' + encryptedPrivateKey + '\n' +
        '[WALLET-DEBUG] salt: ' + salt + '\n' +
        '[WALLET-DEBUG] iv: ' + iv + '\n' +
        '[WALLET-DEBUG] tag: ' + tag + '\n' +
        '[WALLET-DEBUG] publicKey: ' + publicKey;
      try { console.log(debugMsg); } catch(e) {}
      showModal(debugMsg.replaceAll('\n','<br>'), 'Depuración Wallet Global');
      try {
        const bodyToSend = { encryptedPrivateKey, salt, iv, tag, passphrase: pass, publicKey };
        try { console.log('[WALLET-DEBUG] Enviando a backend:', bodyToSend); } catch(e) {}
        showModal('Enviando a backend:<br>' + JSON.stringify(bodyToSend, null, 2).replaceAll('\n','<br>'), 'Depuración Wallet Global');
        const res = await fetch('/wallet/load-global', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyToSend)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando wallet global');
        // Retry fetching the public key until it changes or max retries reached
        let pubKey = null;
        let retries = 0;
        const maxRetries = 8;
        const retryDelay = 120;
        const expectedPubKey = bodyToSend.publicKey;
        while (retries < maxRetries) {
          try {
            pubKey = await getCurrentPublicKey();
            console.log('[GLOBAL-MODAL-DEBUG] Intento', retries + 1, 'clave pública recibida:', pubKey, 'esperada:', expectedPubKey);
            if (pubKey === expectedPubKey) {
              break;
            }
          } catch (e) {
            pubKey = '(error al consultar backend)';
            console.error('[FRONTEND] Error consultando /wallet/global:', e);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retries++;
        }
        // Actualizar el header con la nueva clave pública global
        await updateGlobalWalletPubKeyHeader();
        showModal('Wallet global cargada en backend.<br>Clave pública activa:<br><span style="word-break:break-all">' + pubKey + '</span>', 'Wallet Global');
        console.log('[GLOBAL-MODAL-DEBUG] Clave pública final mostrada en modal:', pubKey);
      } catch (err) {
        showModal('Error: ' + err.message, 'Wallet Global');
        try { console.error('[WALLET-DEBUG] Error backend:', err); } catch(e) {}
        showModal('Error backend:<br>' + (err && err.message ? err.message : err), 'Depuración Wallet Global');
      }
    });
  }
});
