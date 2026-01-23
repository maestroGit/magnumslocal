import { fetchUTXOs } from './utxo-api.js';
import scrypt from './js/vendor/scrypt-pbkdf2-shim.mjs';
import * as secp from './vendor/secp256k1.mjs';

const statusEl = document.getElementById('burnStatus');
const form = document.getElementById('burnForm');
const passInput = document.getElementById('burnPassphrase');
const reasonSelect = document.getElementById('burnReason');

let utxos = [];
let selectedUTXO = null;

// Recuperar publicKey/keystore (guardados tras importación)
const pubKey = sessionStorage.getItem('importedPubKey');
let keystore = null;
try {
  keystore = JSON.parse(sessionStorage.getItem('importedKeystore'));
} catch (e) {}

if (!pubKey || !keystore) {
  if (form) form.style.display = 'none';
  if (statusEl) {
    statusEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <span>No hay wallet importada. Vuelve a importar tu keystore.</span>
      <a class="keystore-btn primary" href="import-keystore.html">Importar</a>
    </div>`;
  }
} else {
  loadUTXOs(pubKey);
}

async function loadUTXOs(address) {
  statusEl.textContent = 'Enjoy your Magnum moment...';
  const data = await fetchUTXOs(address);
  if (Array.isArray(data.utxosDisponibles) && Array.isArray(data.utxosPendientes)) {
    utxosDisponibles = data.utxosDisponibles;
    utxosPendientes = data.utxosPendientes;
    utxos = utxosDisponibles;
  } else {
    utxosDisponibles = Array.isArray(data) ? data : data.utxos || [];
    utxosPendientes = [];
    utxos = utxosDisponibles;
  }
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
  if (!utxosDisponibles.length && !utxosPendientes.length) {
    utxoListEl.innerHTML = '<div style="color:#f7931a;margin-bottom:8px;">No hay UTXOs disponibles.</div>';
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }
  // Renderizar UTXOs disponibles
  utxosDisponibles.forEach((utxo, i) => {
    const cont = document.createElement('div');
    cont.className = 'utxo-row';
    cont.style = 'margin-bottom:6px;';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'utxoSelect';
    radio.value = i;
    radio.id = 'utxo_' + i;
    radio.className = 'utxo-radio';
    radio.addEventListener('change', () => selectUTXO(i));
    cont.appendChild(radio);
    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.style = 'margin-left:8px;color:#fff;';
    label.textContent = `UTXO #${i + 1}: ${utxo.amount} 💰 `;
    cont.appendChild(label);
    utxoListEl.appendChild(cont);
  });
  // Renderizar UTXOs pendientes (en mempool)
  utxosPendientes.forEach((utxo, i) => {
    const cont = document.createElement('div');
    cont.className = 'utxo-row pending';
    cont.style = 'margin-bottom:6px;';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'utxoSelect';
    radio.value = 'pending_' + i;
    radio.id = 'utxo_pending_' + i;
    radio.className = 'utxo-radio';
    radio.disabled = true;
    cont.appendChild(radio);
    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.style = 'margin-left:8px;color:#f3b26f;';
    label.textContent = `UTXO: ${utxo.amount} 💰  (pending mining)`;
    cont.appendChild(label);
    utxoListEl.appendChild(cont);
  });
  form.querySelector('button[type="submit"]').disabled = true;
}

function selectUTXO(idx) {
  selectedUTXO = utxos[idx];
  validateForm();
}

function validateForm() {
  const passOk = passInput.value && passInput.value.length > 0;
  const utxoOk = !!selectedUTXO;
  // If selected UTXO is pending (any set), block action
  let selectedPending = false;
  try {
    if (selectedUTXO) {
      const key = `${selectedUTXO.txId}:${Number(selectedUTXO.outputIndex)}`;
      const a = JSON.parse(sessionStorage.getItem('pendingBurnUtxos') || '[]');
      const b = JSON.parse(sessionStorage.getItem('pendingUtxos') || '[]');
      selectedPending = a.includes(key) || b.includes(key);
    }
  } catch (_) {}
  form.querySelector('button[type="submit"]').disabled = !(passOk && utxoOk) || selectedPending;
}

  let utxosDisponibles = [];
  let utxosPendientes = [];
passInput.addEventListener('input', validateForm);

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!selectedUTXO) {
    statusEl.textContent = 'Selecciona un UTXO.';
    return;
  }
  if (!keystore || !keystore.publicKey) {
    statusEl.textContent = 'Keystore no disponible en esta sesión.';
    return;
  }
  if (selectedUTXO.address !== keystore.publicKey) {
    statusEl.textContent = '❌ El UTXO seleccionado no pertenece al keystore importado.';
    alert('El UTXO seleccionado pertenece a otra dirección.\n\nselectedUTXO.address: ' + selectedUTXO.address + '\nkeystore.publicKey: ' + keystore.publicKey);
    return;
  }

  const passphrase = passInput.value;
  const motivo = (reasonSelect && reasonSelect.value) || 'burn';

  // Derivar y descifrar en cliente (como Transfer)
  statusEl.textContent = 'Derivando clave y descifrando...';
  form.querySelector('button[type="submit"]').disabled = true;
  scrypt(passphrase, keystore.kdfParams.salt, 16384, 8, 1, 32, async (err, _, key) => {
    if (err) {
      statusEl.textContent = 'Error en KDF.';
      form.querySelector('button[type="submit"]').disabled = false;
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
        privHexNorm = Array.from(privHexNorm, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
      } else {
        throw new Error('Clave privada con longitud inesperada: ' + privHexNorm.length);
      }

      // Verificar correspondencia con publicKey del keystore
      try {
        let derivedPubKey = secp.getPublicKey(privHexNorm);
        if (derivedPubKey instanceof Uint8Array) {
          derivedPubKey = Array.from(derivedPubKey).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        console.log('[BURN] PubKey derivada == keystore?', derivedPubKey === keystore.publicKey);
      } catch (e) {
        console.warn('[BURN] No se pudo derivar/validar publicKey:', e);
      }

      // Construir transacción de burn (output único a dirección burn por el monto completo)
      statusEl.textContent = 'Firmando transacción...';
      const inputs = [{
        txId: selectedUTXO.txId,
        outputIndex: Number(selectedUTXO.outputIndex),
        address: selectedUTXO.address,
        amount: Number(selectedUTXO.amount)
      }];
      //const burnAddress = '0x0000000000000000000000000000000000000000';
      const burnAddress = '0x0000000000000000000000000000000000000000' + motivo.toUpperCase();
      const outputs = [{ amount: Number(selectedUTXO.amount), address: burnAddress }];

      const outputsCanonical = JSON.stringify(outputs);
      const hashBuf = await sha256Bytes(outputsCanonical);
      const sigObj = await secp.sign(hashBuf, privHexNorm);
      const signature = { r: sigObj.r, s: sigObj.s };
      const signedInputs = inputs.map(i => ({ ...i, signature }));

      const hash1Bytes = await sha256Bytes(JSON.stringify({ inputs: signedInputs, outputs }));
      const txIdBytes = await sha256Bytes(hash1Bytes);
      const txId = Array.from(txIdBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const txObj = { id: txId, inputs: signedInputs, outputs };

      // Enviar al backend /transaction (flujo usuario)
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
        body: JSON.stringify({ signedTransaction: txObj, motivo }) // el valor del motivo de baja (motivo: "burn" o "bodega") se envía al backend junto con la transacción en la petición.
      });
      if (!res.ok) {
        statusEl.textContent = 'Error al enviar la transacción: ' + res.status;
        form.querySelector('button[type="submit"]').disabled = false;
        return;
      }
      const data = await res.json();
      statusEl.innerHTML = `✅ Transacción de burn enviada. ID: <span style=\"color:#f7931a;\">${data.transactionId || txId}</span>`;
      // Mark this UTXO as pending locally and re-render
      try {
        const key = `${selectedUTXO.txId}:${Number(selectedUTXO.outputIndex)}`;
        const pending = JSON.parse(sessionStorage.getItem('pendingBurnUtxos') || '[]');
        if (!pending.includes(key)) {
          pending.push(key);
          sessionStorage.setItem('pendingBurnUtxos', JSON.stringify(pending));
        }
      } catch (_) {}
      renderUTXOList();
      setTimeout(() => loadUTXOs(pubKey), 800);
    } catch (e) {
      statusEl.textContent = 'Error al firmar o enviar: ' + (e.message || e);
    } finally {
      form.querySelector('button[type="submit"]').disabled = false;
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