// keystore.js
console.log('[keystore.js] INICIO');

import scrypt from './js/vendor/scrypt-pbkdf2-shim.mjs';
console.log('[keystore.js] scrypt importado:', typeof scrypt);
import * as secp from './vendor/secp256k1.mjs';
console.log('[keystore.js] secp importado:', typeof secp);

let keystoreData = null;
let passphrase = '';

function getWalletInputValue() {
  const el = document.getElementById('walletPublicKeyInput');
  return (el?.value || '').trim();
}

function setWalletInputValue(value) {
  const el = document.getElementById('walletPublicKeyInput');
  if (!el) return;
  el.value = typeof value === 'string' ? value : '';
}

function hexRandom(len) {
  const arr = crypto.getRandomValues(new Uint8Array(len));
  console.log('[hexRandom] Generando hex aleatorio:', arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function showPassphraseModal() {
  console.log('[UI] Mostrar modal passphrase');
  document.getElementById('passphraseModal').style.display = 'flex';
  document.getElementById('passphraseInput').value = '';
  setTimeout(() => {
    document.getElementById('passphraseInput').focus();
  }, 50);
}

function hidePassphraseModal() {
  console.log('[UI] Ocultar modal passphrase');
  document.getElementById('passphraseModal').style.display = 'none';
}

function handlePassphraseSubmit(e) {
  e.preventDefault();
  passphrase = document.getElementById('passphraseInput').value;
  console.log('[UI] Passphrase confirmada:', passphrase);
  if (!passphrase || passphrase.length < 4) {
    alert('La passphrase debe tener al menos 4 caracteres.');
    return;
  }
  hidePassphraseModal();
  generateKeystore(passphrase);
}

function handleCancelPassphrase() {
  console.log('[UI] Cancelar passphrase');
  hidePassphraseModal();
}

async function generateKeystore(pass) {
  console.log('[keystore] Generando claves secp256k1...');
  // Unificada: usa secp.generatePrivateKey() para obtener la clave privada
  const privHex = secp.generatePrivateKey();
  const pubHex = secp.getPublicKey(privHex);
  console.log('[keystore] Clave privada:', privHex);
  console.log('[keystore] Clave pública:', pubHex);

  const salt = hexRandom(16);
  const iv = hexRandom(12);
  console.log('[keystore] Salt:', salt, 'IV:', iv);

  console.log('[keystore] Derivando clave con scrypt...');
  // Convierte el passphrase a bytes (Uint8Array) para compatibilidad Node.js
  const passBytes = typeof pass === 'string' ? new TextEncoder().encode(pass) : pass;
  scrypt(passBytes, salt, 16384, 8, 1, 32, async (err, _, key) => {
    if (err) {
      console.error('[keystore] Error en KDF:', err);
      document.getElementById('keystoreStatus').textContent = 'Error en KDF.';
      return;
    }
    console.log('[keystore] Clave derivada (KDF):', key);
    // Cifra la clave privada como bytes puros (no UTF-8)
    const encKey = key;
    function hexToBytes(hex) {
      return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    }
    const privBytes = hexToBytes(privHex);
    const ivBytes = new Uint8Array(iv.match(/.{2}/g).map(b => parseInt(b, 16)));
    console.log('[keystore] Cifrando clave privada (bytes puros)...');
    const cryptoKey = await crypto.subtle.importKey('raw', encKey, 'AES-GCM', false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, cryptoKey, privBytes);
    const encryptedPrivateKey = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('[keystore] Clave privada cifrada:', encryptedPrivateKey);

    keystoreData = {
      keystoreVersion: 1,
      id: 'web-demo-' + Date.now(),
      createdAt: new Date().toISOString(),
      createdBy: 'web-demo',
      kdf: 'scrypt',
      kdfParams: { salt },
      cipher: 'aes-256-gcm',
      cipherParams: { iv },
      publicKey: pubHex,
      encryptedPrivateKey
    };
    setWalletInputValue(pubHex);
    document.getElementById('keystoreStatus').textContent = 'Wallet created successfully.';
    document.getElementById('downloadKeystore').disabled = false;
    console.log('[keystore.js] Keystore generado:', keystoreData);
  });
}

async function callWalletAssociation(pathname) {
  const publicKey = getWalletInputValue() || keystoreData?.publicKey || '';
  if (!publicKey) {
    document.getElementById('keystoreStatus').textContent = 'Indica una public key valida.';
    return;
  }

  try {
    const res = await fetch(pathname, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ publicKey, type: 'internal', status: 'active' })
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      document.getElementById('keystoreStatus').textContent = payload.error || 'Operacion no completada.';
      return;
    }

    document.getElementById('keystoreStatus').textContent = payload.message || 'Operacion completada.';
  } catch (err) {
    console.error('[keystore.js] Error en callWalletAssociation:', err);
    document.getElementById('keystoreStatus').textContent = 'Error de red al contactar con el servidor.';
  }
}

async function linkWallet() {
  await callWalletAssociation('/wallets/link');
}

async function unlinkWallet() {
  await callWalletAssociation('/wallets/unlink');
}

function downloadKeystore() {
  console.log('[UI] Descargar keystore');
  if (!keystoreData) return;
  const blob = new Blob([JSON.stringify(keystoreData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'keystore.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  document.getElementById('keystoreStatus').textContent = 'Keystore descargado.';
  console.log('[keystore.js] Keystore descargado');
}

document.getElementById('generateKeystore').addEventListener('click', showPassphraseModal);
document.getElementById('downloadKeystore').addEventListener('click', downloadKeystore);
document.getElementById('linkWalletBtn')?.addEventListener('click', linkWallet);
document.getElementById('unlinkWalletBtn')?.addEventListener('click', unlinkWallet);
document.getElementById('passphraseForm').addEventListener('submit', handlePassphraseSubmit);
document.getElementById('cancelPassphrase').addEventListener('click', handleCancelPassphrase);

console.log('[keystore.js] FIN');
