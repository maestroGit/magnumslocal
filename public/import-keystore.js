// import-keystore.js
import scrypt from './js/vendor/scrypt-pbkdf2-shim.mjs';

function hexToBuf(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
}

async function handleImportKeystore(e) {
  e.preventDefault();
  const fileInput = document.getElementById('keystoreFile');
  const passInput = document.getElementById('importPassphrase');
  const statusEl = document.getElementById('importStatus');
  statusEl.textContent = '';

  const file = fileInput.files[0];
  const passphrase = passInput.value;
  if (!file || !passphrase) {
    statusEl.textContent = 'Selecciona archivo y passphrase.';
    return;
  }

  let keystore;
  try {
    keystore = JSON.parse(await file.text());
  } catch (err) {
    statusEl.textContent = 'Archivo keystore inválido.';
    return;
  }

  const salt = keystore.kdfParams?.salt;
  const iv = keystore.cipherParams?.iv;
  const encryptedPrivateKey = keystore.encryptedPrivateKey;

  if (!salt || !iv || !encryptedPrivateKey) {
    statusEl.textContent = 'Keystore incompleto.';
    return;
  }

  statusEl.textContent = 'Derivando clave...';
  scrypt(passphrase, salt, 16384, 8, 1, 32, async (err, _, key) => {
    if (err) {
      statusEl.textContent = 'Error en KDF.';
      return;
    }
    try {
      const encKey = key;
      const ivBytes = hexToBuf(iv);
      const encryptedBytes = hexToBuf(encryptedPrivateKey);
      const cryptoKey = await crypto.subtle.importKey('raw', encKey, 'AES-GCM', false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, cryptoKey, encryptedBytes);
      const privHex = Array.from(new Uint8Array(decrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
      statusEl.textContent = 'Keystore importado correctamente.';
      console.log('[import-keystore] Clave privada:', privHex);
      // Mostrar publicKey y menú de acciones
      document.getElementById('importForm').style.display = 'none';
      document.getElementById('importResult').style.display = 'block';
      document.getElementById('importedPubkey').textContent = keystore.publicKey || '(no disponible)';
      // Guardar publicKey en sessionStorage para la transferencia
      if (keystore.publicKey) {
        sessionStorage.setItem('importedPubKey', keystore.publicKey);
      }
      // Puedes conectar aquí la lógica de los botones
      document.getElementById('btnTransfer').onclick = () => {
        window.location.href = 'transfer-keystore.html';
      };
      document.getElementById('btnConsult').onclick = () => {
        alert('Funcionalidad de consulta no implementada aún.');
      };
    } catch (e) {
      statusEl.textContent = 'Passphrase incorrecta o keystore corrupto.';
    }
  });
}

document.getElementById('importForm').addEventListener('submit', handleImportKeystore);
