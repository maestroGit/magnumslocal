

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
  statusEl.textContent = 'Cargando UTXOs...';
  utxos = await fetchUTXOs(address);
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
    label.textContent = `UTXO #${i+1}: ${utxo.amount} unidades`;
    cont.appendChild(label);
    utxoListEl.appendChild(cont);
  });
  amountInput.disabled = true;
  form.querySelector('button[type="submit"]').disabled = true;
}

function selectUTXO(idx) {
  selectedUTXO = utxos[idx];
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
amountInput.addEventListener('input', validateForm);


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

  // Pedir passphrase al usuario
  const passphrase = prompt('Introduce la passphrase de tu keystore para firmar la transacción:');
  if (!passphrase) {
    statusEl.textContent = 'Operación cancelada por el usuario.';
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

      // Construir y firmar la transacción
      statusEl.textContent = 'Firmando transacción...';
      const sender = keystore.publicKey;
      const inputs = [{
        txId: selectedUTXO.txId,
        outputIndex: Number(selectedUTXO.outputIndex),
        address: sender,
        amount: Number(selectedUTXO.amount)
      }];
      const outputs = [{ amount: Number(amount), address: recipient }];
      // Si hay cambio, agregar output de cambio
      const change = Number(selectedUTXO.amount) - Number(amount);
      if (change > 0) {
        outputs.push({ amount: change, address: sender });
      }
      // Hash de outputs
      // Serializar outputs de forma canónica (sin espacios extra, orden estable)
      const outputsCanonical = JSON.stringify(outputs);
      // Calcular hash SHA256 y convertir a hex string (igual que backend)
      const hashBuf = await sha256Bytes(outputsCanonical);
      // noble-secp256k1 espera Uint8Array, pero el backend usa hex para el hash
      // Firmamos el hash como Uint8Array, pero la verificación será sobre el mismo hash
      const sig = await secp.sign(hashBuf, privHexNorm);
      // sig es un hex de 128 caracteres (64 bytes: r||s)
      let r = sig.slice(0, 64);
      let s = sig.slice(64, 128);
      r = r.padStart(64, '0');
      s = s.padStart(64, '0');
      const signature = { r, s };
      const signedInputs = inputs.map(i => ({ ...i, signature }));
      const txObj = { inputs: signedInputs, outputs };

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
