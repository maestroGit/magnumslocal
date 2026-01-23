import { fetchUTXOs } from './utxo-api.js';
import scrypt from './js/vendor/scrypt-pbkdf2-shim.mjs';
import * as secp from './vendor/secp256k1.mjs';

const statusEl = document.getElementById('transferStatus');
const form = document.getElementById('transferForm');
const recipientInput = document.getElementById('recipientAddress');
const amountInput = document.getElementById('transferAmount');

let utxos = [];
let selectedUTXO = null;

// Recuperar publicKey de sessionStorage (guardada tras importación)
const pubKey = sessionStorage.getItem('importedPubKey');
if (!pubKey) {
  statusEl.textContent = 'No hay wallet importada. Vuelve a importar tu keystore.';
  form.style.display = 'none';
} else {
  // Mostrar UTXOs al cargar
  loadUTXOs(pubKey);
}

async function loadUTXOs(address) {
  statusEl.textContent = 'Transfer the pleasure of your Magnum...';
  utxos = await fetchUTXOs(address);
  console.log('[DEBUG][transfer-keystore.js] utxos recibidos:', utxos);
  renderUTXOList();
}

function renderUTXOList() {
  let utxoListEl = document.getElementById('utxoList');
  if (!utxoListEl) {
    utxoListEl = document.createElement('div');
    utxoListEl.id = 'utxoList';
    form.insertBefore(utxoListEl, form.querySelector('.card-actions'));
  }
  utxoListEl.innerHTML = '';
  if (!utxos.length) {
    utxoListEl.innerHTML = '<div style="color:#f7931a;margin-bottom:8px;">No hay UTXOs disponibles.</div>';
    amountInput.disabled = true;
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }
  utxos.forEach((utxo, i) => {
    const cont = document.createElement('div');
    cont.className = 'utxo-row';
    cont.style = 'margin-bottom:6px;';
    // Si el UTXO está gastado, lo marcamos visualmente
    if (utxo.spent) {
      cont.classList.add('utxo-spent');
    }
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'utxoSelect';
    radio.value = i;
    radio.id = 'utxo_' + i;
    radio.className = 'utxo-radio';
    radio.disabled = !!utxo.spent;
    radio.addEventListener('change', () => selectUTXO(i));
    cont.appendChild(radio);
    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.style = 'margin-left:8px;color:#fff;';
    label.textContent = `UTXO #${i+1}: ${utxo.amount} unidades`;
    if (utxo.spent) {
      label.style.color = '#888';
      label.textContent += ' (gastado)';
    }
    cont.appendChild(label);
    utxoListEl.appendChild(cont);
  });
  amountInput.disabled = true;
  form.querySelector('button[type="submit"]').disabled = true;
}

function selectUTXO(idx) {
  selectedUTXO = utxos[idx];
  console.log('[DEBUG][transfer-keystore.js] selectedUTXO al seleccionar:', selectedUTXO);
  amountInput.value = selectedUTXO.amount;
  amountInput.disabled = false;
  validateForm();
}

function validateRecipient(addr) {
  // Permitir claves públicas hex largas (sin prefijo 0x)
  return /^[a-fA-F0-9]{40,130}$/.test(addr);
}

function validateForm() {
  const recipient = recipientInput.value.trim();
  const amount = amountInput.value.trim();
  let valid = true;
  if (!selectedUTXO) valid = false;
  if (!validateRecipient(recipient)) valid = false;
  if (!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > Number(selectedUTXO?.amount)) valid = false;
  form.querySelector('button[type="submit"]').disabled = !valid;
}

recipientInput.addEventListener('input', validateForm);


// Utilidad para mostrar el modal visual y obtener la passphrase
function getPassphraseModal() {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('passphraseModal');
    const input = document.getElementById('modalPassphrase');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');
    modal.style.display = 'flex';
    input.value = '';
    input.focus();
    function cleanup() {
      modal.style.display = 'none';
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKeyDown);
    }
    function onConfirm() {
      cleanup();
      resolve(input.value);
    }
    function onCancel() {
      cleanup();
      resolve(null);
    }
    function onKeyDown(e) {
      if (e.key === 'Enter') {
        onConfirm();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    }
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKeyDown);
  });
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();
  const recipient = recipientInput.value.trim();
  const amount = amountInput.value.trim();
  if (!selectedUTXO) {
    statusEl.textContent = 'Selecciona un UTXO.';
    return;
  }
  if (!validateRecipient(recipient)) {
    statusEl.textContent = 'Dirección de destino inválida.';
    return;
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > Number(selectedUTXO.amount)) {
    statusEl.textContent = 'Cantidad inválida.';
    return;
  }

  // Recuperar keystore desde sessionStorage (guardado tras importación)
  let keystore;
  try {
    keystore = JSON.parse(sessionStorage.getItem('importedKeystore'));
    if (!keystore) throw new Error('Keystore no encontrado en sessionStorage.');
  } catch (err) {
    statusEl.textContent = 'No se pudo recuperar el keystore importado.';
    return;
  }

  // Bloqueo si la address del input no coincide con la del keystore
  if (selectedUTXO.address !== keystore.publicKey) {
    statusEl.textContent = '❌ El keystore importado NO corresponde a la address del input. No se puede firmar.';
    alert('El keystore importado NO corresponde a la address del input.\n\nselectedUTXO.address: ' + selectedUTXO.address + '\nkeystore.publicKey: ' + keystore.publicKey + '\n\nImporta el keystore correcto para poder firmar este UTXO.');
    return;
  }

  // Pedir passphrase al usuario con modal visual
  const passphrase = await getPassphraseModal();
  if (!passphrase) {
    statusEl.textContent = 'Operación cancelada por el usuario.';
    return;
  }

  // Derivar clave y descifrar clave privada
  statusEl.textContent = 'Derivando clave y descifrando...';
  scrypt(passphrase, keystore.kdfParams.salt, 16384, 8, 1, 32, async (err, _, key) => {
    if (err) {
      statusEl.textContent = 'Error en KDF.';
      return;
    }
    try {
      const encKey = key;
      const ivBytes = hexToBuf(keystore.cipherParams.iv);
      const encryptedBytes = hexToBuf(keystore.encryptedPrivateKey);
      const cryptoKey = await crypto.subtle.importKey('raw', encKey, 'AES-GCM', false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, cryptoKey, encryptedBytes);
      const privHex = Array.from(new Uint8Array(decrypted)).map(b => b.toString(16).padStart(2, '0')).join('');

      // Normalizar privHex a 32 bytes hex

      let privHexNorm = privHex;
      if (privHexNorm.startsWith('0x')) privHexNorm = privHexNorm.slice(2);
      if (privHexNorm.length === 64) {
        // ok
      } else if (privHexNorm.length === 128) {
        privHexNorm = privHexNorm.slice(0, 64);
      } else if (privHexNorm.length === 32) {
        // Possibly raw bytes as string, convert to hex
        privHexNorm = Array.from(privHexNorm, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
      } else {
        throw new Error('Clave privada con longitud inesperada: ' + privHexNorm.length);
      }

      // === LOGS DE CLAVE PRIVADA Y PÚBLICA DERIVADA ===
      console.log('[DEBUG][transfer-keystore.js] privHexNorm (clave privada usada para firmar):', privHexNorm);
      let derivedPubKey = null;
      try {
        // noble-secp256k1 espera Uint8Array o hex string para getPublicKey
        derivedPubKey = secp.getPublicKey(privHexNorm);
        // Si devuelve Uint8Array, convertir a hex
        if (derivedPubKey instanceof Uint8Array) {
          derivedPubKey = Array.from(derivedPubKey).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        if (keystore && keystore.publicKey) {
          console.log('[COMPARA][transfer-keystore.js] Clave pública derivada:', derivedPubKey,
            '\nClave pública del keystore:', keystore.publicKey,
            '\n¿Coinciden?:', derivedPubKey === keystore.publicKey);
          if (derivedPubKey === keystore.publicKey) {
            console.log('[DEBUG][transfer-keystore.js] La clave pública derivada COINCIDE con la del keystore.');
          } else {
            console.warn('[DEBUG][transfer-keystore.js] La clave pública derivada NO coincide con la del keystore.');
          }
        }
      } catch (e) {
        console.error('[DEBUG][transfer-keystore.js] Error derivando clave pública de privHexNorm:', e);
      }


  // Compara con la del keystore
  // Añadido
console.log('Clave pública derivada:', derivedPubKey);
console.log('Clave pública keystore:', keystore.publicKey);
console.log('¿Coinciden?:', derivedPubKey === keystore.publicKey);
      // Construir y firmar la transacción
      statusEl.textContent = 'Firmando transacción...';
      const sender = keystore.publicKey;
      // El address del input debe ser la address original del UTXO (quien puede gastar)
      console.log('[DEBUG][transfer-keystore.js] selectedUTXO:', selectedUTXO);
      let inputAddress = selectedUTXO.address;
      // === LOG para verificar keystore vs input address ===
      if (selectedUTXO.address && keystore && keystore.publicKey) {
        if (selectedUTXO.address === keystore.publicKey) {
          console.log('[CHECK][transfer-keystore.js] El keystore importado corresponde a la address del input. OK');
        } else {
          console.warn('[CHECK][transfer-keystore.js] El keystore importado NO corresponde a la address del input.');
          console.warn('[CHECK][transfer-keystore.js] selectedUTXO.address:', selectedUTXO.address);
          console.warn('[CHECK][transfer-keystore.js] keystore.publicKey:', keystore.publicKey);
        }
      }
      const isOwnerMatch = (selectedUTXO.address === keystore.publicKey);
      console.log('[DEBUG][transfer-keystore.js] selectedUTXO.address === keystore.publicKey ?', isOwnerMatch, '\nselectedUTXO.address:', selectedUTXO.address, '\nkeystore.publicKey:', keystore.publicKey);
      if (!inputAddress || inputAddress === '' || typeof inputAddress === 'undefined') {
        // Si no hay address en el UTXO, usar la del propietario actual (keystore.publicKey)
        inputAddress = keystore.publicKey;
        console.log('[DEBUG][transfer-keystore.js] input.address estaba vacío, se asigna:', inputAddress);
        // Log extra para depuración
        console.log('[DEBUG][transfer-keystore.js] selectedUTXO recibido:', selectedUTXO);
        if (!('address' in selectedUTXO)) {
          console.warn('[DEBUG][transfer-keystore.js] El UTXO seleccionado NO tiene la propiedad address.');
        } else {
          console.log('[DEBUG][transfer-keystore.js] El UTXO seleccionado SÍ tiene la propiedad address:', selectedUTXO.address);
        }
      }
      const inputs = [{
        txId: selectedUTXO.txId,
        outputIndex: Number(selectedUTXO.outputIndex),
        address: inputAddress, // address garantizado
        amount: Number(selectedUTXO.amount)
      }];
      console.log('[DEBUG][transfer-keystore.js] inputs:', inputs);
      const outputs = [{ amount: Number(amount), address: recipient }];
      // Si hay cambio, agregar output de cambio
      const change = Number(selectedUTXO.amount) - Number(amount);
      if (change > 0) {
        outputs.push({ amount: change, address: sender });
      }
      // Hash de outputs
      // Serializar outputs de forma canónica (sin espacios extra, orden estable)
      // Serialización y orden de campos para el hash de outputs
      const outputsCanonical = JSON.stringify(outputs);
      console.log('[DEBUG][transfer-keystore.js] outputs (raw):', outputs);
      console.log('[DEBUG][transfer-keystore.js] outputsCanonical (JSON.stringify):', outputsCanonical);
      // Calcular hash SHA256 y mostrar formato
      const hashBuf = await sha256Bytes(outputsCanonical);
      const hashHex = Array.from(hashBuf).map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('[DEBUG][transfer-keystore.js] hashBuf (Uint8Array):', hashBuf);
      console.log('[DEBUG][transfer-keystore.js] hashHex (hex string):', hashHex);
      // noble-secp256k1 espera Uint8Array, pero el backend usa hex para el hash
      // Firmamos el hash como Uint8Array, pero la verificación será sobre el mismo hash
      // noble-secp256k1 devuelve la firma en formato DER (hex string) si no se pide raw
      // Obtener firma como objeto { r, s } (no DER)
      const sigObj = await secp.sign(hashBuf, privHexNorm);
      // sigObj debe tener .r y .s en hex
      const signature = { r: sigObj.r, s: sigObj.s };
      console.log('[DEBUG][transfer-keystore.js] signature (r,s):', signature);
      const signedInputs = inputs.map(i => ({ ...i, signature }));
      console.log('[DEBUG][transfer-keystore.js] signedInputs (r,s):', signedInputs);
      // Calcular el id de la transacción igual que en web-demo.js
      const hash1Bytes = await sha256Bytes(JSON.stringify({ inputs: signedInputs, outputs }));
      const txIdBytes = await sha256Bytes(hash1Bytes);
      const txId = Array.from(txIdBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const txObj = { id: txId, inputs: signedInputs, outputs };
      console.log('[DEBUG][transfer-keystore.js] txObj:', txObj);

      // Enviar al backend
      statusEl.textContent = 'Enviando transacción...';
      let base = '';
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        base = 'http://localhost:6001';
      } else if (window.location.hostname.includes('app.blockswine.com')) {
        base = 'https://app.blockswine.com';
      } else if (window.location.hostname.includes('apps.run-on-seenode.com')) {
        base = 'https://web-sdzlt1djuiql.up-de-fra1-k8s-1.apps.run-on-seenode.com';
      }
      const res = await fetch(base + '/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedTransaction: txObj })
      });
      if (!res.ok) {
        statusEl.textContent = 'Error al enviar la transacción: ' + res.status;
        return;
      }
      const data = await res.json();
      statusEl.textContent = 'Transacción enviada correctamente. ID: ' + (data.id || '(sin id)');
      // Marcar UTXO como gastado tras transacción exitosa
      markUTXOAsSpent(selectedUTXO.value);
    } catch (e) {
      statusEl.textContent = 'Error al firmar o enviar: ' + (e.message || e);
    }
  });
});

// Utilidad para hexToBuf
function hexToBuf(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
}

// Hash helper: SHA-256 usando WebCrypto
async function sha256Bytes(input) {
  const enc = new TextEncoder();
  const data = typeof input === 'string' ? enc.encode(input) : input;
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuf);
}

// Marcar UTXO como gastado tras transacción exitosa
function markUTXOAsSpent(idx) {
  if (utxos[idx]) {
    utxos[idx].spent = true;
    renderUTXOList();
  }
}
