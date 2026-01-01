// Use a browser-oriented secp256k1 wrapper (bridge to elliptic for now)
import * as secp from "./vendor/secp256k1.mjs";
import scrypt from "./vendor/scrypt-pbkdf2-shim.mjs";
// Remove direct EC usage; use secp wrapper

const bufToHex = (b) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const hexToBuf = (hex) =>
  new Uint8Array(hex.match(/.{1,2}/g).map((h) => parseInt(h, 16)));

// Hash helper: SHA-256 using WebCrypto with a safe JS fallback
async function sha256Bytes(input) {
  const enc = new TextEncoder();
  const data = typeof input === 'string' ? enc.encode(input) : input;
  if (globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.subtle.digest) {
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuf);
  }
  // Minimal JS fallback (not constant-time). For demo use only.
  // Implementation based on a compact SHA-256 routine (omitted complexity):
  function rotr(n, x){ return (x>>>n) | (x<<(32-n)); }
  function toWords(bytes){
    const words = [];
    for (let i=0; i<bytes.length; i+=4) {
      words.push((bytes[i]<<24)|(bytes[i+1]<<16)|(bytes[i+2]<<8)|(bytes[i+3]));
    }
    return words;
  }
  function fromWords(words){
    const out = new Uint8Array(words.length*4);
    for (let i=0; i<words.length; i++) {
      out[i*4] = (words[i]>>>24)&255;
      out[i*4+1] = (words[i]>>>16)&255;
      out[i*4+2] = (words[i]>>>8)&255;
      out[i*4+3] = words[i]&255;
    }
    return out;
  }
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let bytes = data;
  const l = bytes.length;
  const bitLen = l * 8;
  // padding
  const withOne = new Uint8Array(l+1); withOne.set(bytes); withOne[l]=0x80;
  let padLen = ((withOne.length + 8 + 63) & ~63) - (withOne.length + 8);
  const padded = new Uint8Array(withOne.length + padLen + 8);
  padded.set(withOne);
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length-4, bitLen>>>0);
  dv.setUint32(padded.length-8, Math.floor(bitLen/4294967296));
  // init hash
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  for (let i=0;i<padded.length;i+=64){
    const w = new Array(64);
    for (let j=0;j<16;j++){ w[j]=dv.getUint32(i+j*4); }
    for (let j=16;j<64;j++){
      const s0 = rotr(7,w[j-15]) ^ rotr(18,w[j-15]) ^ (w[j-15]>>>3);
      const s1 = rotr(17,w[j-2]) ^ rotr(19,w[j-2]) ^ (w[j-2]>>>10);
      w[j] = (w[j-16] + s0 + w[j-7] + s1)>>>0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let j=0;j<64;j++){
      const S1 = rotr(6,e) ^ rotr(11,e) ^ rotr(25,e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[j] + w[j])>>>0;
      const S0 = rotr(2,a) ^ rotr(13,a) ^ rotr(22,a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj)>>>0;
      h=g; g=f; f=e; e=(d + t1)>>>0; d=c; c=b; b=a; a=(t1 + t2)>>>0;
    }
    h0=(h0+a)>>>0; h1=(h1+b)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0; h4=(h4+e)>>>0; h5=(h5+f)>>>0; h6=(h6+g)>>>0; h7=(h7+h)>>>0;
  }
  return fromWords([h0,h1,h2,h3,h4,h5,h6,h7]);
}

// Expose for other modules if needed
try { window.sha256Bytes = sha256Bytes; } catch {}

// Header: toggle 'scrolled' class when the page scrolls (visual shadow & opacity)
document.addEventListener('DOMContentLoaded', () => {
  // Header scrolled effect
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 10) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Todas las cards son visibles, sin lógica de router ni data-view-section

});

// Override sign/verify to use SHA-256 hashes for consistency
document.addEventListener('DOMContentLoaded', () => {
  const signBtn = document.getElementById('sign');
  const outEl = document.getElementById('out');
  const verifyBtn = document.getElementById('verify');
  const verifyOutEl = document.getElementById('verifyOut');
  if (signBtn && outEl) {
    signBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        const msg = (document.getElementById('payload')?.value || '').trim();
        if (!msg) { outEl.textContent = 'Introduce un mensaje a firmar.'; return; }
        const hash = await sha256Bytes(msg);
        // Obtener clave privada desde el estado del demo (ya importada)
        // Buscamos una función/utilidad existente; si no, asumimos que ec y keyPair están disponibles
        // Para compatibilidad, pedimos la passphrase de firma si está en UI y derivamos privada si es necesario
        // Aquí intentamos acceder a keyPair via window or a stored variable
        let keyPair = null;
        try { keyPair = window.currentKeyPair || null; } catch {}
        if (!keyPair) {
          outEl.textContent = 'No hay wallet importada/cargada para firmar.';
          return;
        }
        const sig = keyPair.sign(hash);
        const signature = { r: sig.r.toString(16), s: sig.s.toString(16) };
        outEl.textContent = JSON.stringify(signature, null, 2);
      } catch (err) {
        outEl.textContent = 'Error firmando: ' + (err?.message || String(err));
      }
    });
  }
  if (verifyBtn && verifyOutEl) {
    verifyBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        const msg = (document.getElementById('payload')?.value || '').trim();
        const pubHex = (document.getElementById('verifyPub')?.value || '').trim();
        const sigJson = (document.getElementById('verifySig')?.value || '').trim();
        if (!msg || !pubHex || !sigJson) { verifyOutEl.textContent = 'Completa mensaje, publicKey y firma.'; return; }
        const hash = await sha256Bytes(msg);
        let signatureObj;
        try { signatureObj = JSON.parse(sigJson); } catch { verifyOutEl.textContent = 'Firma JSON inválida.'; return; }
        const pub = ec.keyFromPublic(pubHex, 'hex');
        const ok = pub.verify(hash, { r: signatureObj.r, s: signatureObj.s });
        verifyOutEl.textContent = ok ? '✅ Firma válida' : '❌ Firma inválida';
      } catch (err) {
        verifyOutEl.textContent = 'Error verificando: ' + (err?.message || String(err));
      }
    });
  }
});

// Añadir estado visual de wallet importada al botón #import (después del primer bloque DOMContentLoaded para no interferir)
document.addEventListener('DOMContentLoaded', () => {
  const importBtn = document.getElementById('import');
  const fileInput = document.getElementById('file');
  const passInput = document.getElementById('passIn');
  const senderPubEl = document.getElementById('senderPub');
  const resetBtnMiniScope = document.getElementById('resetWallet');
  if (importBtn && fileInput && passInput) {
    importBtn.addEventListener('click', () => {
      // El listener original también maneja la importación; aquí solo reaccionamos tras un pequeño delay para comprobar resultado.
      setTimeout(() => {
        // Si el campo senderPub se llenó y out contiene 'Imported publicKey', marcamos estado
        const outEl = document.getElementById('out');
        const hasPub = senderPubEl && senderPubEl.value && senderPubEl.value.length > 20;
        const importSucceeded = hasPub && outEl && /Imported publicKey/i.test(outEl.textContent || '');
        if (importSucceeded) {
          importBtn.classList.add('wallet-loaded');
          importBtn.setAttribute('aria-pressed','true');
          importBtn.disabled = true;
          importBtn.setAttribute('title', 'Wallet cargada; usa “Cambiar wallet” para importar otra');
          // Ocultar el botón import tras éxito para evitar reimportar
          importBtn.style.display = 'none';
          // Aplicar estilo al input senderPub
          senderPubEl.classList.add('wallet-loaded');
          // Crear badge si no existe
          if (!document.querySelector('.wallet-badge')) {
            const badge = document.createElement('span');
            badge.className = 'wallet-badge';
            badge.textContent = 'Wallet cargada';
            importBtn.insertAdjacentElement('afterend', badge);
          }
          if (resetBtnMiniScope) resetBtnMiniScope.style.display = 'inline-block';
        } else {
          importBtn.classList.remove('wallet-loaded');
          importBtn.removeAttribute('aria-pressed');
          importBtn.disabled = false;
          importBtn.removeAttribute('title');
          importBtn.style.display = '';
          senderPubEl.classList.remove('wallet-loaded');
          const badge = document.querySelector('.wallet-badge');
          if (badge) badge.remove();
          if (resetBtnMiniScope) resetBtnMiniScope.style.display = 'none';
        }
      }, 120); // pequeño retardo para permitir que el import original termine
    });
  }
});

// Unified modal helper for demo-wallet (reuses existing #loteModal structure)
let isPassphraseModalOpen = false;
function openAppModal(title, html) {
  // Remove any previous overlay handler to avoid duplicates
  var modal = document.getElementById("loteModal");
  if (modal && modal._overlayHandler) {
    modal.removeEventListener('click', modal._overlayHandler);
    modal._overlayHandler = null;
  }
  isPassphraseModalOpen = false;
  console.log('[modal] openAppModal', { title, htmlLen: (html || '').length });
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalHistorial = document.getElementById("modalHistorial");
  const modalFooter = document.getElementById("modalFooter");
  if (!modal || !modalTitle || !modalBody) {
    console.warn("[modal] openAppModal: modal structure missing");
    // Fallback direct alert (shouldn't happen in normal flow)
    alert((title ? title + "\n" : "") + html.replace(/<[^>]+>/g, ""));
    return;
  }
  modalTitle.textContent = title || "Información";
  // Ensure historial pane hidden when using generic modal body
  if (modalHistorial) {
    modalHistorial.style.display = "none";
    modalHistorial.innerHTML = "";
  }
  // Clear any previous footer actions (avoid leftover buttons like Cambiar wallet / Cancelar / Confirmar)
  if (modalFooter) {
    try { modalFooter.innerHTML = ""; } catch {}
  }
  modalBody.style.display = "block";
  modalBody.innerHTML = html;
  // Force modal visible
  modal.classList.remove('hidden');
  modal.style.display = "block";
  modal.style.visibility = 'visible';
  console.log('[modal] openAppModal displayed, hidden class:', modal.classList.contains('hidden'), 'display:', modal.style.display);
  // Dispatch open event
  try { document.dispatchEvent(new CustomEvent('appmodal:open', { detail: { title } })); } catch {}
  // Centralized close helper to ensure consistent teardown
  function closeModal(){
    modal.classList.add('hidden');
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    try { document.dispatchEvent(new CustomEvent('appmodal:close', { detail: { title } })); } catch {}
    if (modal && modal._overlayHandler) {
      modal.removeEventListener('click', modal._overlayHandler);
      modal._overlayHandler = null;
    }
  }
  // Attach/refresh close handlers for both .close and #modalClose
  const closeBtn = modal.querySelector('.close');
  if (closeBtn) {
    closeBtn.onclick = closeModal;
    closeBtn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); closeModal(); }
    });
  }
  const closeById = document.getElementById('modalClose');
  if (closeById && closeById !== closeBtn) {
    closeById.onclick = closeModal;
    closeById.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); closeModal(); }
    });
  }
  // Close on overlay click
  function overlayHandler(ev){
    if (ev.target === modal) {
      if (!isPassphraseModalOpen) {
        closeModal();
      } else {
        // Si es passphrase modal, nunca cerrar
        ev.stopPropagation();
        return;
      }
    }
  }
  if (modal) {
    modal._overlayHandler = overlayHandler;
    modal.addEventListener('click', overlayHandler);
    // Evita cierre por overlay en cualquier clic dentro del modal (header, body, footer, etc.)
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('mousedown', (e) => e.stopPropagation());
      modalContent.addEventListener('click', (e) => e.stopPropagation());
    }
  }
  // Basic escape key close
  document.addEventListener(
    "keydown",
    function escHandler(ev) {
      if (ev.key === "Escape" && !isPassphraseModalOpen) { ev.preventDefault(); closeModal(); document.removeEventListener("keydown", escHandler); }
    },
    { once: true }
  );
}

// Confirm modal returning a Promise<boolean>
function openConfirmModal(title, html, opts = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("loteModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalHistorial = document.getElementById("modalHistorial");
    if (!modal || !modalTitle || !modalBody) {
      const fallback = confirm((title? title+"\n" : "") + html.replace(/<[^>]+>/g,''));
      return resolve(fallback);
    }
    if (modalHistorial){ modalHistorial.style.display='none'; modalHistorial.innerHTML=''; }
    modalTitle.textContent = title || 'Confirmación';
    const confirmText = opts.confirmText || 'Confirmar';
    const cancelText = opts.cancelText || 'Cancelar';
    modalBody.style.display='block';
    modalBody.innerHTML = `
      <div class="confirm-modal-wrapper">
        <div class="confirm-body" style="margin-bottom:16px;">${html}</div>
        <div class="confirm-actions" style="display:flex;gap:12px;justify-content:flex-end;">
          <button id="confirmCancelBtn" class="btn-secondary" style="padding:6px 14px;border-radius:6px;border:1px solid #999;background:#FF9701;cursor:pointer;">${cancelText}</button>
          <button id="confirmOkBtn" class="btn-primary" style="padding:6px 14px;border-radius:6px;border:1px solid #132231;background:#132231;color:#fff;cursor:pointer;">${confirmText}</button>
        </div>
      </div>
    `;
    modal.style.display='block';
    try { document.dispatchEvent(new CustomEvent('appmodal:open', { detail: { title } })); } catch {}
    const closeBtn = modal.querySelector('.close');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    function cleanup(result){
      modal.style.display='none';
      try { document.dispatchEvent(new CustomEvent('appmodal:close', { detail: { title } })); } catch {}
      resolve(result);
    }
    if (closeBtn){ closeBtn.onclick = () => cleanup(false); }
    if (cancelBtn){ cancelBtn.onclick = () => cleanup(false); }
    if (okBtn){ okBtn.onclick = () => cleanup(true); }
    document.addEventListener('keydown', function escHandler(ev){
      if (ev.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', escHandler); }
    }, { once:true });
  });
}

// Helper: fetch utxos for an address from server
// If the demo is served from a different origin (eg. live-reload on :5500),
// use the backend on port 3000 explicitly to avoid 404s on relative paths.
async function fetchUTXOs(address) {
  try {
    // Detect entorno local magnumslocal (puerto 6001)
    let base = '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      base = 'http://localhost:6001';
    } else if (window.location.hostname.includes('app.blockswine.com')) {
      base = 'https://app.blockswine.com';
    } else if (window.location.hostname.includes('apps.run-on-seenode.com')) {
      base = 'https://web-sdzlt1djuiql.up-de-fra1-k8s-1.apps.run-on-seenode.com';
    }
    const url = `${base}/utxo-balance/${encodeURIComponent(address)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch utxos: " + res.status);
    const data = await res.json();
    // endpoint may return { utxos: [...] } or an array directly
    return Array.isArray(data) ? data : data.utxos || [];
  } catch (err) {
    console.error("fetchUTXOs error", err);
    return [];
  }
}

function normalizeKeyInput(key) {
  // Accept various shapes returned by scrypt-js and coerce to Uint8Array
  if (!key) return null;
  if (key instanceof Uint8Array) return key;
  if (key instanceof ArrayBuffer) return new Uint8Array(key);
  if (Array.isArray(key)) return new Uint8Array(key);
  if (key.buffer && key.buffer instanceof ArrayBuffer)
    return new Uint8Array(key.buffer);
  // fallback: try to construct from iterable
  try {
    return new Uint8Array(key);
  } catch (e) {
    return null;
  }
}

async function deriveKey(pass, saltHex) {
  const passBuf = new TextEncoder().encode(pass);
  const salt = saltHex
    ? hexToBuf(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const N = 16384,
    r = 8,
    p = 1; // reasonable default for demo

  // scrypt-js may export the function as default or as a named export.
  const scryptFn =
    typeof scrypt === "function"
      ? scrypt
      : scrypt.scrypt || (scrypt.default && scrypt.default.scrypt);
  if (!scryptFn) throw new Error("scrypt implementation not found");

  const dk = await new Promise((resolve, reject) => {
    try {
      // callback signature: (error, progress, key) in some builds, or (error, derivedKey)
      scryptFn(passBuf, salt, N, r, p, 32, (err, progress, derivedKey) => {
        if (err) return reject(err);
        if (progress && typeof progress === "number") {
          console.log("[scrypt-js] progress:", progress);
        }
        // some builds pass derivedKey as second arg
        const result = derivedKey || progress;
        const norm =
          result instanceof Uint8Array
            ? result
            : result && result.buffer
            ? new Uint8Array(result.buffer)
            : Array.isArray(result)
            ? new Uint8Array(result)
            : result;
        resolve(norm);
      });
    } catch (e) {
      reject(e);
    }
  });

  // Normalize dk and if it's not usable, fall back to PBKDF2 (demo fallback)
  let norm = normalizeKeyInput(dk);
  if (!norm || (norm.byteLength !== 16 && norm.byteLength !== 32)) {
    console.warn(
      "scrypt returned unexpected key shape/length; falling back to PBKDF2 for demo"
    );
    // PBKDF2 fallback: derive 256-bit key
    const passKey = await crypto.subtle.importKey(
      "raw",
      passBuf,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      passKey,
      256
    );
    norm = new Uint8Array(derived);
  }


  return { key: norm, salt: bufToHex(salt) };
}

async function aesGcmEncrypt(keyBytes, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  if (!keyBytes || !(keyBytes instanceof Uint8Array))
    throw new Error("Invalid AES key: expected Uint8Array");
  if (keyBytes.byteLength !== 16 && keyBytes.byteLength !== 32)
    throw new Error("AES key data must be 128 or 256 bits (16 or 32 bytes)");
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    "AES-GCM",
    false,
    ["encrypt"]
  );
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  );
  return { iv: bufToHex(iv), ciphertext: bufToHex(ct) };
}

async function aesGcmDecrypt(keyBytes, ivHex, ciphertextHex) {
  const iv = hexToBuf(ivHex);
  const ct = hexToBuf(ciphertextHex);
  if (!keyBytes || !(keyBytes instanceof Uint8Array))
    throw new Error("Invalid AES key: expected Uint8Array");
  if (keyBytes.byteLength !== 16 && keyBytes.byteLength !== 32)
    throw new Error("AES key data must be 128 or 256 bits (16 or 32 bytes)");
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    "AES-GCM",
    false,
    ["decrypt"]
  );
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ct
  );
  return new TextDecoder().decode(pt);
}

// (rest will attach below)
// Ensure we attach event listeners only after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  let imported = null; // keystore principal (wallet / transfer)
  let importedFirma = null; // keystore específico para vista firma/verificación
  // UTXOs marcados como "pendientes" tras enviar (UI-only, sin depender del backend)
  const pendingSpent = new Set(); // keys: `${txId}:${outputIndex}`
  const resetBtn = document.getElementById('resetWallet');
  const importBtnMainScope = document.getElementById('import');

  // Lógica para resetear/deshacer la wallet importada
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      try {
        // Limpiar objetos en memoria
        imported = null;
        importedFirma = null;
        pendingSpent.clear();
        // Limpiar campos y salidas
        const senderPubEl = document.getElementById('senderPub');
        if (senderPubEl) {
          senderPubEl.value = '';
          senderPubEl.classList.remove('wallet-loaded');
        }
        const outGeneral = document.getElementById('out');
        if (outGeneral) outGeneral.textContent = 'Wallet reiniciada. Importa un nuevo keystore.';
        const utxoList = document.getElementById('utxoSelectList');
        if (utxoList) utxoList.innerHTML = '';
        const utxosOut = document.getElementById('utxosOut');
        if (utxosOut) utxosOut.textContent = '';
        const balEl = document.getElementById('balance');
        if (balEl) balEl.textContent = '0';
        const sendBtnOnReset = document.getElementById('sendTx');
        if (sendBtnOnReset) {
          sendBtnOnReset.disabled = true;
          sendBtnOnReset.title = 'No hay UTXOs disponibles. Importa fondos o espera confirmación.';
          sendBtnOnReset.setAttribute('aria-disabled', 'true');
        }
        const passInEl = document.getElementById('passIn');
        if (passInEl) passInEl.value = '';
        const fileEl = document.getElementById('file');
        if (fileEl) fileEl.value = '';
        const badge = document.querySelector('.wallet-badge');
        if (badge) badge.remove();
        // Eliminar botón historial si existiera (se recrea tras nuevo import)
        const historialBtn = document.getElementById('historial');
        if (historialBtn && historialBtn.parentNode) historialBtn.parentNode.removeChild(historialBtn);
        // Restaurar estado visual del botón importar
        if (importBtnMainScope) {
          importBtnMainScope.classList.remove('wallet-loaded');
          importBtnMainScope.removeAttribute('aria-pressed');
          importBtnMainScope.disabled = false;
          importBtnMainScope.removeAttribute('title');
          importBtnMainScope.style.display = '';
        }
        // Ocultar el propio botón reset otra vez
        resetBtn.style.display = 'none';
        showToast('Wallet reiniciada');
      } catch (e) {
        console.warn('[WalletReset] error', e);
      }
    });
  }

  // Todas las cards son visibles, sin lógica de router ni data-view-section

  // Copiar sender publicKey al portapapeles
  const copyBtn = document.getElementById('copySenderPub');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const input = document.getElementById('senderPub');
      const value = input && 'value' in input ? input.value : '';
      if (!value) return;
      const setTemp = (txt)=>{ const prev = copyBtn.textContent; copyBtn.textContent = txt; setTimeout(()=> copyBtn.textContent = prev, 1200); };
      try {
        await navigator.clipboard.writeText(value);
        setTemp('Copiado');
      } catch (e) {
        try {
          input.focus();
          input.select();
          document.execCommand && document.execCommand('copy');
          setTemp('Copiado');
        } catch {}
      }
    });
  }

  // Forzar Amount = valor del UTXO seleccionado (transferencia completa del UTXO)
  const utxoListEl = document.getElementById('utxoSelectList');
  // Toast helper (prominente y en zona superior)
  function showToast(msg, type){
    try {
      const existing = document.querySelector('.toast-notification');
      if (existing){ existing.remove(); }
      const el = document.createElement('div');
      el.className = 'toast-notification';
      const level = type || 'warning';
      if (level) el.classList.add(level);
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
      el.textContent = msg;
      // Fallback inline styles to ensure visibility above modal overlay
      el.style.position = 'fixed';
      el.style.top = '24px';
      el.style.right = '24px';
      el.style.zIndex = '100001';
      el.style.borderRadius = '8px';
      el.style.padding = '14px 18px';
      el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.35)';
      document.body.appendChild(el);
      setTimeout(()=>{
        el.style.transition='opacity .4s, transform .4s';
        el.style.opacity='0';
        el.style.transform='translateY(-6px)';
        setTimeout(()=> el.remove(), 450);
      }, 3200);
    } catch(e){ /* noop */ }
  }

  // Helper: recalcula el balance disponible y habilita/bloquea Send según DOM actual
  function recalcAvailableFromDOM(){
    try {
      const modalEl = document.getElementById('loteModal');
      const modalOpen = !!(modalEl && !modalEl.classList.contains('hidden') && modalEl.style.display !== 'none');
      const scope = (modalOpen && modalEl) ? modalEl : document;
      const listRoot = scope.querySelector('#utxoSelectList') || document.getElementById('utxoSelectList');
      const list = listRoot ? listRoot.querySelectorAll('.utxo-checkbox') : [];
      let available = 0;
      list.forEach(cb => { if (!cb.disabled) available += parseFloat(cb.dataset.amount || '0') || 0; });
      const balEl = scope.querySelector('#balance') || document.getElementById('balance');
      if (balEl) balEl.textContent = String(available);
      const sendBtn = scope.querySelector('#sendTx') || document.getElementById('sendTx');
      if (sendBtn) {
        const disabled = available <= 0;
        sendBtn.disabled = disabled;
        if (disabled) {
          sendBtn.title = 'No hay UTXOs disponibles. Importa fondos o espera confirmación.';
          sendBtn.setAttribute('aria-disabled', 'true');
        } else {
          sendBtn.removeAttribute('title');
          sendBtn.removeAttribute('aria-disabled');
        }
      }
    } catch(e){ /* noop */ }
  }

  // Helper: marca un conjunto de UTXOs como pendientes a nivel de UI
  function markUtxosPending(keys){
    try {
      (keys || []).forEach(k => pendingSpent.add(k));
      // Marcar en la lista visible
      const containers = document.querySelectorAll('#utxoSelectList .utxo-container');
      containers.forEach(cont => {
        const cb = cont.querySelector('.utxo-checkbox');
        if (!cb) return;
        const key = `${cb.dataset.txid}:${cb.dataset.outputindex}`;
        if (pendingSpent.has(key)){
          cb.checked = false;
          cb.disabled = true;
          cont.style.opacity = '0.55';
          cont.classList.add('is-pending');
          // Añadir badge "Pendiente" si no existe
          if (!cont.querySelector('.badge-pend')){
            const badge = document.createElement('span');
            badge.className = 'badge-pend';
            badge.textContent = 'Pendiente';
            badge.style.marginLeft = '8px';
            cont.appendChild(badge);
          }
        }
      });
      recalcAvailableFromDOM();
    } catch(e){ console.warn('[UTXO][markPending] error', e); }
  }
  // Delegated change handler so dynamically-rendered UTXO checkboxes work in modals
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains('utxo-checkbox')) return;
    const modalEl = document.getElementById('loteModal');
    const inModal = modalEl && modalEl.contains(t);
    const scope = inModal ? modalEl : document;
    const amountEl = scope.querySelector('#amount') || document.getElementById('amount');
    if (!amountEl) return;
    // Si hay aviso inline por UTXO requerido, eliminarlo al interactuar
    try {
      const hint = document.querySelector('.utxo-required-hint');
      if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
      const listWrap = scope.querySelector('#utxoSelectList') || document.getElementById('utxoSelectList');
      if (listWrap) listWrap.style.outline = '';
    } catch {}
    const listContainer = t.closest('#utxoSelectList') || scope.querySelector('#utxoSelectList') || scope;
    if (t.checked) {
      // Ver si ya había otro seleccionado dentro del mismo contenedor
      const already = Array.from(listContainer.querySelectorAll('.utxo-checkbox:checked')).filter(cb=>cb!==t);
      if (already.length > 0) {
        already.forEach(cb=> cb.checked = false);
        showToast('Solo puedes seleccionar un UTXO por transferencia');
      }
      // Asegurar exclusividad en el mismo contenedor
      listContainer.querySelectorAll('.utxo-checkbox').forEach(cb=>{ if (cb!==t) cb.checked=false; });
      const amt = parseFloat(t.dataset.amount || '0') || 0;
      amountEl.value = String(amt);
      amountEl.readOnly = true;
      amountEl.setAttribute('aria-readonly', 'true');
      amountEl.min = String(amt);
      amountEl.max = String(amt);
      amountEl.style.background = '#b6f5c9';
    } else {
      // Si se desmarca, buscar otro seleccionado en el mismo contenedor o desbloquear
      const other = listContainer.querySelector('.utxo-checkbox:checked');
      if (other) {
        const amt = parseFloat(other.dataset.amount || '0') || 0;
        amountEl.value = String(amt);
        amountEl.readOnly = true;
        amountEl.setAttribute('aria-readonly', 'true');
        amountEl.min = String(amt);
        amountEl.max = String(amt);
        amountEl.style.background = '#b6f5c9';
      } else {
        amountEl.readOnly = false;
        amountEl.removeAttribute('aria-readonly');
        amountEl.removeAttribute('max');
        amountEl.min = '1';
        amountEl.style.background = '';
        amountEl.value = '';
      }
    }
  });

  // Common passphrase prompt using loteModal (unified UI)
  function openPassphrasePrompt(title, label, onSubmit) {
    console.log('[passphrase] openPassphrasePrompt called');
    const modal = document.getElementById("loteModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalHistorial = document.getElementById("modalHistorial");
    const modalFooter = document.getElementById("modalFooter");
    if (!modal || !modalTitle || !modalBody) { console.warn('[passphrase] modal structure missing'); alert('Modal no disponible'); return; }
    isPassphraseModalOpen = true;
    modalTitle.textContent = title || 'Passphrase';
    // Asegura el área correcta visible y limpia acciones previas del footer
    if (modalHistorial) { modalHistorial.style.display = 'none'; modalHistorial.innerHTML = ''; }
    if (modalFooter) { modalFooter.innerHTML = ''; }
    modalBody.style.display = 'block';
    modalBody.innerHTML = `
      ${title === 'Crear BW-Wallet' ? `
        <p class="wallet-modal-info">Elige una passphrase y Confirma.</p>
        <p class="wallet-modal-info wallet-modal-info-secondary">Tu wallet protegida con contraseña, se descargará automáticamente en tu equipo.</p>
      ` : ''}
      <form id="unifiedPassForm" autocomplete="off">
        <label class="field" for="unifiedPassInput">${label || 'Passphrase'}:
          <input id="unifiedPassInput" name="unifiedPassInput" type="password" class="input half" required autocomplete="new-password" />
        </label>
        <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
          <button type="submit" class="dashboard-btn btn btn-highlight">Confirmar</button>
        </div>
      </form>`;
    // Force modal visible
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    console.log('[passphrase] modal displayed, hidden class:', modal.classList.contains('hidden'), 'display:', modal.style.display);
    const form = document.getElementById('unifiedPassForm');
    const input = document.getElementById('unifiedPassInput');
    if (input) setTimeout(()=> input.focus(), 50);
<<<<<<< HEAD
    const close = ({ cancelled } = { cancelled: true }) => { 
      isPassphraseModalOpen = false;
=======
    const close = (canceled = true) => { 
>>>>>>> wallet-modal
      modal.classList.add('hidden'); 
      modal.style.display='none'; 
      // Clean up import button state ONLY when user cancels
      if (canceled) {
        const importBtn = document.getElementById('import');
        if (importBtn && importBtn.classList.contains('wallet-loaded')) {
          importBtn.classList.remove('wallet-loaded');
          importBtn.style.display = '';
          importBtn.disabled = false;
          console.log('[passphrase] cleaned up import button state on cancel');
        }
      }
      try { document.dispatchEvent(new CustomEvent('appmodal:close')); } catch {}
    };
    // Conectar la X de cierre del modal y accesibilidad básica
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = () => close(true);
      closeBtn.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); close(true); }
      });
    }
    // PREVENT overlay click and Escape from closing modal during passphrase entry
    // Remove overlay click and Escape close for passphrase modal
    // (Do NOT add overlayHandler or Escape handler here)
    // Only allow close via explicit close button or successful form submit
<<<<<<< HEAD
    if (form) form.onsubmit = (e)=>{ e.preventDefault(); const pass = input && input.value; if (!pass) return; close({ cancelled: false }); try { onSubmit && onSubmit(pass); } catch(e){ console.error('onSubmit error', e); } };
=======
    if (form) form.onsubmit = (e)=>{ e.preventDefault(); const pass = input && input.value; if (!pass) return; close(false); try { onSubmit && onSubmit(pass); } catch(e){ console.error('onSubmit error', e); } };
>>>>>>> wallet-modal
  }
  // Expose prompt globally for reuse in inline modal flows
  try { window.openPassphrasePrompt = openPassphrasePrompt; } catch {}

  // --- BURN (baja token) ---
  // Convención de burn: enviar el UTXO a una dirección irrecuperable.
  // Nota: en este proyecto las direcciones suelen ser publicKeys (04...), pero el flujo de docs usa la zero-address.
  const DEFAULT_BURN_ADDRESS = '0x0000000000000000000000000000000000000000';

  async function postSignedTransactionToServer(signedTransaction, passphrase) {
    const isDifferentPort = location.port && location.port !== "3000";
    const base = isDifferentPort
      ? `${location.protocol}//${location.hostname}:3000`
      : "";
    const resp = await fetch(`${base}/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedTransaction, passphrase }),
    });
    const contentType = resp.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await resp.json().catch(() => ({}))
      : await resp.text().catch(() => "");
    return { resp, body, isJson: contentType.includes("application/json") };
  }

  async function buildBurnSignedTransaction(utxo, burnAddress) {
    const sender = imported && imported.pub;
    if (!sender) throw new Error('No hay wallet importada.');
    if (!utxo || !utxo.txId || (utxo.outputIndex === undefined || utxo.outputIndex === null)) {
      throw new Error('UTXO inválido.');
    }
    const amount = Number(utxo.amount);
    if (!amount || amount <= 0) throw new Error('UTXO sin amount válido.');
    const inputs = [{
      txId: utxo.txId,
      outputIndex: Number(utxo.outputIndex),
      address: sender,
      amount,
    }];
    const outputs = [{ amount, address: burnAddress || DEFAULT_BURN_ADDRESS }];
    const outputsHashBytes = await sha256Bytes(JSON.stringify(outputs));
    const sig = await secp.sign(outputsHashBytes, imported.priv);
    const signature = { r: sig.r, s: sig.s };
    const signedInputs = inputs.map((i) => ({ ...i, signature }));
    const hash1Bytes = await sha256Bytes(JSON.stringify({ inputs: signedInputs, outputs }));
    const txIdBytes = await sha256Bytes(hash1Bytes);
    const txId = bufToHex(txIdBytes);
    return { id: txId, inputs: signedInputs, outputs };
  }

  async function burnUtxoFlow(utxo) {
    if (!imported || !imported.pub || !imported.priv) {
      openAppModal('Wallet requerida', '<div>Importa un keystore antes de quemar (BURN).</div>');
      return;
    }

    const amount = Number(utxo && utxo.amount);
    const utxoKey = utxo ? `${utxo.txId}:${utxo.outputIndex}` : '';
    const burnAddress = DEFAULT_BURN_ADDRESS;

    const proceed = await openConfirmModal(
      'Confirmar BURN',
      `
        <div>
          <div style="margin-bottom:8px;">Vas a quemar este UTXO (transferirlo a una dirección irrecuperable).</div>
          <div class="muted" style="font-size:0.95em;">UTXO: <strong>${(utxoKey || '-')}</strong></div>
          <div class="muted" style="font-size:0.95em;">Amount: <strong>${Number.isFinite(amount) ? amount : '-'}</strong></div>
          <div class="muted" style="font-size:0.95em;">Burn address: <strong>${burnAddress}</strong></div>
        </div>
      `,
      { confirmText: 'Quemar', cancelText: 'Cancelar' }
    );
    if (!proceed) return;

    // Pedir passphrase (requerida por backend en /transaction)
    const promptFn = (window.openPassphrasePrompt || openPassphrasePrompt);
    promptFn('Passphrase requerida', 'Passphrase para firmar BURN', async (passphrase) => {
      try {
        if (!passphrase) {
          openAppModal('Passphrase requerida', '<div>La passphrase es requerida para enviar la transacción.</div>');
          return;
        }
        const signedTransaction = await buildBurnSignedTransaction(utxo, burnAddress);
        openAppModal(
          'Transacción BURN firmada',
          `<div class="tx-modal-section"><pre class="output" style="white-space:pre-wrap;">${JSON.stringify(signedTransaction, null, 2)}</pre></div>`
        );

        const { resp, body, isJson } = await postSignedTransactionToServer(signedTransaction, passphrase);
        const ok = resp.ok || (isJson && body && body.success === true);
        openAppModal(
          ok ? 'BURN enviado' : 'BURN rechazado',
          `
            <div class="tx-modal-section">
              <h4 style="margin:8px 0 6px;">Signed transaction</h4>
              <pre class="output" style="white-space:pre-wrap;">${JSON.stringify(signedTransaction, null, 2)}</pre>
              <h4 style="margin:12px 0 6px;">Server response</h4>
              <pre class="output" style="white-space:pre-wrap;">${typeof body === 'string' ? (body || '<no body>').replace(/</g,'&lt;') : JSON.stringify(body, null, 2)}</pre>
            </div>
          `
        );
        if (ok) {
          markUtxosPending([utxoKey]);
          try { showToast('BURN enviado. UTXO marcado como pendiente.'); } catch {}
        }
      } catch (err) {
        console.error('[BURN] error', err);
        openAppModal('Error en BURN', `<div style='color:#c00;font-weight:600;'>${(err && err.message) || err}</div>`);
      }
    });
  }

  // Expose globally for the inline modal (web-demo-inline.js)
  try { window.burnUtxo = burnUtxoFlow; } catch {}

  const createEl = document.getElementById("create");
  if (createEl) {
    createEl.addEventListener("click", () => {
      openPassphrasePrompt('Crear BW-Wallet', 'Passphrase', async (pass) => {
        // Unificada: usa secp.generatePrivateKey() para obtener la clave privada
        const priv = secp.generatePrivateKey();
        let pub;
        try {
          pub = secp.getPublicKey(priv, { compressed: false });
        } catch (e) {
          console.error('Error in getPublicKey:', e, 'priv:', priv);
          throw e;
        }
        let key, salt;
        try {
          ({ key, salt } = await deriveKey(pass));
        } catch (err) {
          console.error("deriveKey failed during create:", err);
          openAppModal("Error al derivar clave", `<div style=\"color:#c00;font-weight:600;\">${(err && err.message) || err}</div>`);
          return;
        }
        const keyBytes = normalizeKeyInput(key);
        const { iv, ciphertext } = await aesGcmEncrypt(keyBytes, priv);

        const keystore = {
          keystoreVersion: 1,
          id: "web-demo-" + Date.now(),
          createdAt: new Date().toISOString(),
          createdBy: "web-demo",
          kdf: "scrypt",
          kdfParams: { salt },
          cipher: "aes-256-gcm",
          cipherParams: { iv },
          publicKey: pub,
        encryptedPrivateKey: ciphertext,
      };

      const blob = new Blob([JSON.stringify(keystore, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "keys-web-demo.json";
      document.body.appendChild(a);
      a.click();
      console.log('Descarga completada');
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      openAppModal("BW-Wallet creada", `<div>Keystore descargado correctamente.</div>`);
      });
    });
  }

  const importEl = document.getElementById("import");
  if (importEl) {
    importEl.addEventListener("click", async () => {
      console.log('[import] click on #import');
      // Prompt unified: ask for passphrase using common modal, then decrypt selected file
      const fileInput = document.getElementById('file');
      const f = fileInput && fileInput.files && fileInput.files[0];
      if (!f) { console.warn('[import] no file selected'); openAppModal('Archivo requerido', `<div>Selecciona un keystore (.json) antes de importar.</div>`); return; }
      openPassphrasePrompt('Importar BW-Wallet', 'Passphrase para descifrar', async (pass) => {
        console.log('[import] passphrase provided, reading file');
        const raw = await f.text();
        let data;
        try { data = JSON.parse(raw); console.log('[import] parsed JSON keys', Object.keys(data || {})); } catch(e){ console.error('[import] JSON parse error', e); openAppModal('JSON inválido', `<div>El archivo no es un JSON válido.</div>`); return; }
        const salt = data.kdfParams?.salt;
        let keyObj;
        try { keyObj = await deriveKey(pass, salt); } catch(e){
          const outEl = document.getElementById('out');
          if (outEl) outEl.textContent = 'deriveKey error: ' + (e.message || e);
          console.error('[import] deriveKey error', e);
          return;
        }
        const keyBytes = normalizeKeyInput(keyObj.key);
        try {
          const priv = await aesGcmDecrypt(keyBytes, data.cipherParams.iv, data.encryptedPrivateKey);
          console.log('[import] decrypt ok');
          imported = { priv, pub: data.publicKey };
          const senderPubEl = document.getElementById('senderPub'); if (senderPubEl) senderPubEl.value = data.publicKey;
          document.querySelector('.transferir')?.setAttribute('style','');
          // Mostrar badge/estado
          const importBtn = document.getElementById('import');
          if (importBtn){ importBtn.classList.add('wallet-loaded'); importBtn.style.display='none'; }
          const resetBtnMiniScope = document.getElementById('resetWallet'); if (resetBtnMiniScope) resetBtnMiniScope.style.display='inline-block';
          // UTXOs y balance
          const { utxos, total, available, pending } = await updateUtxoDisplay(data.publicKey);
          console.log('[import] utxos fetched', { count: utxos?.length, total, available, pending });
          // Fetch server-side balance for completeness
          let serverBalance = null;
          try {
            const balResp = await fetch(`/address-balance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: data.publicKey })
            });
            const balData = await balResp.json().catch(() => ({}));
            serverBalance = balData.balance ?? null;
            console.log('[import] server balance', serverBalance);
          } catch {}
          try {
            const detail = { publicKey: data.publicKey, utxos, total, available, pending, serverBalance };
            // Async dispatch to ensure listeners are attached
            setTimeout(() => {
              console.log('[event] dispatch wallet:imported', detail);
              try { document.dispatchEvent(new CustomEvent('wallet:imported', { detail })); } catch(e){ console.error('[event] wallet:imported dispatch error', e); }
              try {
                if (window.openTransferModal) {
                  console.log('[modal] invoking openTransferModal directly');
                  window.openTransferModal({ detail });
                  // Tras renderizar el modal, asegurar estado inicial del botón enviar
                  setTimeout(() => {
                    try {
                      const sendBtn = document.getElementById('sendTx');
                      if (sendBtn) {
                        const disabled = !detail || (typeof detail.available === 'number' ? detail.available <= 0 : !(detail.utxos && detail.utxos.length > 0));
                        sendBtn.disabled = disabled;
                        if (disabled) {
                          sendBtn.title = 'No hay UTXOs disponibles. Importa fondos o espera confirmación.';
                          sendBtn.setAttribute('aria-disabled', 'true');
                        } else {
                          sendBtn.removeAttribute('title');
                          sendBtn.removeAttribute('aria-disabled');
                        }
                      }
                      // Si algún UTXO ya aparece seleccionado, auto-rellenar amount
                      const modalEl = document.getElementById('loteModal');
                      const scope = modalEl || document;
                      const listWrap = scope.querySelector('#utxoSelectList');
                      const pre = listWrap && listWrap.querySelector('.utxo-checkbox:checked');
                      if (pre) {
                        const amountEl = scope.querySelector('#amount') || document.getElementById('amount');
                        if (amountEl) {
                          const amt = parseFloat(pre.dataset.amount || '0') || 0;
                          amountEl.value = String(amt);
                          amountEl.readOnly = true;
                          amountEl.setAttribute('aria-readonly', 'true');
                          amountEl.min = String(amt);
                          amountEl.max = String(amt);
                          amountEl.style.background = '#b6f5c9';
                        }
                      }
                    } catch(e){ console.warn('[modal] init sendBtn state error', e); }
                  }, 0);
                } else {
                  console.warn('[modal] openTransferModal not found on window');
                  // Fallback: minimal transfer modal renderer to ensure visibility
                  try {
                    const html = `
                      <div class="transferir">
                        <div class="card-header"><h3>Transferir (fallback)</h3></div>
                        <label class="field">Sender publicKey:
                          <div class="readonly-field">
                            <input id="senderPub" class="input readonly" readonly value="${detail.publicKey || ''}" />
                          </div>
                        </label>
                        <div class="muted">Balance: <span id="balance">${detail.available ?? detail.serverBalance ?? 0}</span></div>
                        <div>UTXOs disponibles:</div>
                        <div id="utxoSelectList" class="utxo-select-list"></div>
                        <label class="field field-stack" for="recipient">Recipient</label>
                        <input id="recipient" class="input" placeholder="04..." />
                        <label class="field field-stack" for="amount">Amount</label>
                        <input id="amount" class="input half" type="number" step="1" min="1" />
                        <label class="field field-stack" for="passphraseTx">Passphrase</label>
                        <input id="passphraseTx" class="input half" type="password" autocomplete="new-password" />
                        <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
                          <button id="sendTx" class="dashboard-btn btn btn-highlight" type="button">Firmar y Enviar</button>
                        </div>
                        <pre id="sendOut" class="output" style="margin-top:12px;"></pre>
                      </div>`;
                    openAppModal('Transferir', html);
                    const list = document.getElementById('utxoSelectList');
                    if (list && Array.isArray(detail.utxos)) {
                      list.innerHTML='';
                      detail.utxos.forEach((u, i) => {
                        const div = document.createElement('div');
                        div.className = 'utxo-container';
                        const cb = document.createElement('input');
                        cb.type='checkbox'; cb.className='utxo-checkbox'; cb.id='utxo_fb_'+i;
                        cb.dataset.txid=u.txId; cb.dataset.outputindex=u.outputIndex; cb.dataset.amount=u.amount; cb.dataset.address=u.address;
                        const label = document.createElement('label'); label.htmlFor=cb.id; label.className='utxo-meta';
                        label.innerHTML = `<span class="utxo-amount">${u.amount}</span> <span class="utxo-meta">${u.txId} #${u.outputIndex}</span>`;
                        div.appendChild(cb); div.appendChild(label);
                        list.appendChild(div);
                      });
                      if (!detail.utxos || detail.utxos.length === 0) {
                        list.innerHTML = '<span class="muted">No hay UTXOs disponibles.</span>';
                      }
                      // Ajustar estado del botón enviar según disponibilidad
                      const sendBtn = document.getElementById('sendTx');
                      if (sendBtn) {
                        const disabled = !detail.utxos || detail.utxos.length === 0;
                        sendBtn.disabled = disabled;
                        if (disabled) {
                          sendBtn.title = 'No hay UTXOs disponibles. Importa fondos o espera confirmación.';
                          sendBtn.setAttribute('aria-disabled', 'true');
                        } else {
                          sendBtn.removeAttribute('title');
                          sendBtn.removeAttribute('aria-disabled');
                        }
                      }
                    }
                    console.log('[modal][fallback] transfer modal rendered');
                  } catch (e) {
                    console.error('[modal][fallback] render error', e);
                  }
                }
              } catch(e){ console.error('[modal] openTransferModal error', e); }
            }, 0);
          } catch {}
        } catch(err){
          let userMsg = '';
          if (err && err.name === 'OperationError') userMsg = 'La passphrase es incorrecta.';
          else if (err && err.name === 'DataError') userMsg = 'El archivo keystore está corrupto o no se puede descifrar.';
          else userMsg = 'La passphrase es incorrecta o el keystore no se puede descifrar.';
          const outEl2 = document.getElementById('out');
          if (outEl2) outEl2.textContent = 'Decrypt failed: ' + userMsg;
          console.error('[import] decrypt failed', err);
          openAppModal('Error de importación', `<div style=\"color:#ff4c4c;font-weight:bold;\">${userMsg}</div>`);
        }
      });
    });
  }

  // Ensure we always react to wallet:imported, even if inline script isn't loaded yet
  document.addEventListener('wallet:imported', (ev) => {
    console.log('[event] wallet:imported listener (web-demo.js)', ev.detail);
    if (window.openTransferModal) {
      try { 
        window.openTransferModal(ev);
        // Asegurar estado del botón enviar tras abrir el modal
        setTimeout(() => {
          try {
            const detail = ev && ev.detail;
            const sendBtn = document.getElementById('sendTx');
            if (sendBtn) {
              const disabled = !detail || (typeof detail.available === 'number' ? detail.available <= 0 : !(detail.utxos && detail.utxos.length > 0));
              sendBtn.disabled = disabled;
              if (disabled) {
                sendBtn.title = 'No hay UTXOs disponibles. Importa fondos o espera confirmación.';
                sendBtn.setAttribute('aria-disabled', 'true');
              } else {
                sendBtn.removeAttribute('title');
                sendBtn.removeAttribute('aria-disabled');
              }
            }
            // Si algún UTXO ya aparece seleccionado, auto-rellenar amount
            const modalEl = document.getElementById('loteModal');
            const scope = modalEl || document;
            const listWrap = scope.querySelector('#utxoSelectList');
            const pre = listWrap && listWrap.querySelector('.utxo-checkbox:checked');
            if (pre) {
              const amountEl = scope.querySelector('#amount') || document.getElementById('amount');
              if (amountEl) {
                const amt = parseFloat(pre.dataset.amount || '0') || 0;
                amountEl.value = String(amt);
                amountEl.readOnly = true;
                amountEl.setAttribute('aria-readonly', 'true');
                amountEl.min = String(amt);
                amountEl.max = String(amt);
                amountEl.style.background = '#b6f5c9';
              }
            }
          } catch (e) { console.warn('[event] wallet:imported sendBtn init error', e); }
        }, 0);
      } catch(e){ console.error('[modal] openTransferModal via listener error', e); }
    } else {
      console.warn('[modal] openTransferModal not available in listener');
    }
  });

  // Import dedicado para la vista de firma/verificación
  const importFirmaBtn = document.getElementById('importFirma');
  if(importFirmaBtn){
    importFirmaBtn.addEventListener('click', async ()=>{
      const f = document.getElementById('fileFirma').files[0];
      if(!f) {
        openAppModal('Archivo requerido', `<div>Selecciona un keystore para firma/verificación.</div>`);
        return;
      }
      const raw = await f.text();
      const data = JSON.parse(raw);
      const pass = document.getElementById('passFirma').value;
      if(!pass) {
        openAppModal('Passphrase requerida', `<div>Introduce la passphrase del keystore para firma/verificación.</div>`);
        return;
      }
      const salt = data.kdfParams?.salt;
      let keyObj;
      try {
        keyObj = await deriveKey(pass, salt);
      } catch(e){
        document.getElementById('outFirma').textContent = 'deriveKey error: '+(e.message||e);
        return;
      }
      const keyBytes = normalizeKeyInput(keyObj.key);
      try {
        const priv = await aesGcmDecrypt(keyBytes, data.cipherParams.iv, data.encryptedPrivateKey);
        importedFirma = { priv, pub: data.publicKey };
        const outFirmaEl = document.getElementById('outFirma');
        if (outFirmaEl) outFirmaEl.textContent = 'PublicKey importada: '+ data.publicKey;
        // Auto-completar verifyPub si vacío
        const verifyPubEl = document.getElementById('verifyPub');
        if(verifyPubEl && !verifyPubEl.value) verifyPubEl.value = data.publicKey;
      } catch(err){
        let userMsg = '';
        if (err && err.name === 'OperationError') {
          userMsg = 'La passphrase es incorrecta.';
        } else if (err && err.name === 'DataError') {
          userMsg = 'El archivo keystore está corrupto o no se puede descifrar.';
        } else {
          userMsg = 'La passphrase es incorrecta o el keystore no se puede descifrar.';
        }
        const outFirmaEl = document.getElementById('outFirma');
        if (outFirmaEl) {
          outFirmaEl.textContent = 'Decrypt failed: ' + userMsg;
        } else {
          // Solo warning si falta el elemento, pero mostrar el error real en consola para debug
          console.warn('[IMPORTACIÓN FIRMA] No se encontró el elemento #outFirma para mostrar el error:', userMsg);
          console.error('aesGcmDecrypt failed:', err);
        }
        // Mostrar en el modal el error detallado si existe
        const modal = document.getElementById("loteModal");
        const modalTitle = document.getElementById("modalTitle");
        const modalBody = document.getElementById("modalBody");
        if (modal && modalTitle && modalBody) {
          modalTitle.textContent = "Error de importación";
          modalBody.innerHTML =
            `<div style=\"color:#ff4c4c;font-weight:bold;\">${userMsg}<br>Por favor, verifica la contraseña y el archivo e inténtalo de nuevo.</div>`;
          modal.style.display = "block";
          // Asegura el event listener de cierre
          const closeBtn = modal.querySelector(".close");
          if (closeBtn) {
            closeBtn.onclick = () => {
              modal.style.display = "none";
              // Opcional: limpiar el contenido de error
              modalTitle.textContent = "Formulario de Lote";
              modalBody.innerHTML = "";
            };
          }
        }
      }
    });
  }

  // Helper to fetch and display UTXOs and balance, and toggle send button
  async function updateUtxoDisplay(address) {
    const utxos = await fetchUTXOs(address);
    const utxosOut = document.getElementById("utxosOut");
    const utxoSelectList = document.getElementById("utxoSelectList");
    const balEl = document.getElementById("balance");
    const sendBtn = document.getElementById("sendTx");
    // Filtrar UTXOs disponibles (no pendientes) para mostrar en el UTXO Set principal
    let availableUtxos = utxos;
    if (typeof pendingSpent === 'object' && pendingSpent !== null && typeof pendingSpent.has === 'function') {
      availableUtxos = utxos.filter(u => !pendingSpent.has(`${u.txId}:${u.outputIndex}`));
    }
    if (utxosOut) utxosOut.textContent = JSON.stringify(availableUtxos, null, 2);
    if (utxoSelectList) {
      utxoSelectList.innerHTML = "";
      if (Array.isArray(utxos) && utxos.length > 0) {
        utxos.forEach((u, i) => {
          const div = document.createElement("div");
          div.className = "utxo-container";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.className = "utxo-checkbox";
          cb.id = "utxo_" + i;
          cb.dataset.txid = u.txId;
          cb.dataset.outputindex = u.outputIndex;
          cb.dataset.amount = u.amount;
          cb.dataset.address = u.address;
          const label = document.createElement("label");
           label.htmlFor = cb.id;
           label.className = "utxo-meta";
           label.innerHTML = `<span class="utxo-amount">${u.amount}</span> <span class="utxo-meta">${u.txId} #${u.outputIndex}</span>`;
          div.appendChild(cb);
          div.appendChild(label);
          // Si este UTXO fue marcado como pendiente, deshabilitar y anotar visualmente
          const key = `${u.txId}:${u.outputIndex}`;
          if (pendingSpent && pendingSpent.has(key)){
            cb.checked = false;
            cb.disabled = true;
            div.classList.add('is-pending');
            const badge = document.createElement('span');
            badge.className = 'badge-pend';
            badge.textContent = 'Pendiente';
            div.appendChild(badge);
          }
          // Botón Burn para este UTXO
          const burnBtn = document.createElement("button");
          burnBtn.textContent = "Burn";
          burnBtn.className = "burn-btn";
          burnBtn.onclick = async (e) => {
            e.preventDefault();
            // Mostrar selector de bodega en modal
            try {
              const res = await fetch('/uploads/burn_bodegas_test.json');
              const bodegas = await res.json();
              const bodegaList = Object.entries(bodegas); // [ [pubKey, {bodega}], ... ]
              let html = '<label for="burnBodegaSelect">Selecciona bodega BURN:</label><br><select id="burnBodegaSelect" class="burn-bodega-select">';
              bodegaList.forEach(([pubKey, info]) => {
                html += `<option value="${pubKey}">${info.bodega}</option>`;
              });
              html += '</select>';
              openAppModal('Selecciona bodega BURN', html);
              setTimeout(() => {
                const select = document.getElementById('burnBodegaSelect');
                const recipientEl = document.getElementById('recipient');
                if (select && recipientEl) {
                  recipientEl.value = select.value;
                  recipientEl.style.background = "#ffdddd";
                  recipientEl.style.color = "#c00";
                  select.addEventListener('change', () => {
                    recipientEl.value = select.value;
                  });
                }
                // Autorellena el amount
                const amountEl = document.getElementById("amount");
                if (amountEl) amountEl.value = u.amount;
              }, 120);
            } catch (err) {
              openAppModal("Error al cargar bodegas BURN", `<div style=\"color:#c00;font-weight:600;\">${(err && err.message) ? err.message : err}</div>`);
            }
          };
          div.appendChild(burnBtn);
          utxoSelectList.appendChild(div);
        });
        // Si hay algún UTXO ya seleccionado (pre-check), auto-rellenar amount en el ámbito correcto
        try {
          const preChecked = utxoSelectList.querySelector('.utxo-checkbox:checked');
          if (preChecked) {
            const modalEl = document.getElementById('loteModal');
            const inModal = modalEl && modalEl.contains(utxoSelectList);
            const scope = inModal ? modalEl : document;
            const amountEl = scope.querySelector('#amount') || document.getElementById('amount');
            if (amountEl) {
              const amt = parseFloat(preChecked.dataset.amount || '0') || 0;
              amountEl.value = String(amt);
              amountEl.readOnly = true;
              amountEl.setAttribute('aria-readonly', 'true');
              amountEl.min = String(amt);
              amountEl.max = String(amt);
              amountEl.style.background = '#b6f5c9';
            }
          }
        } catch {}
      } else {
        utxoSelectList.innerHTML =
          '<span class="muted">No hay UTXOs disponibles.</span>';
        // Sin UTXOs: deshabilitar envío y mostrar tooltip
        if (sendBtn) {
          sendBtn.disabled = true;
          sendBtn.title = 'No hay UTXOs disponibles. Importa fondos o espera confirmación.';
          sendBtn.setAttribute('aria-disabled', 'true');
        }
      }
    }
    // Balance disponible = suma de UTXOs no marcados como pendientes en UI
    let total = 0, available = 0, pending = 0;
    if (Array.isArray(utxos)){
      utxos.forEach(u => {
        const amt = u.amount || 0;
        total += amt;
        const key = `${u.txId}:${u.outputIndex}`;
        if (pendingSpent && pendingSpent.has(key)) pending += amt; else available += amt;
      });
    }
    if (balEl) balEl.textContent = String(available);
    if (sendBtn) {
      const disabled = available <= 0;
      sendBtn.disabled = disabled;
      if (disabled) {
        sendBtn.title = 'No hay UTXOs disponibles. Importa fondos o espera confirmación.';
        sendBtn.setAttribute('aria-disabled', 'true');
      } else {
        sendBtn.removeAttribute('title');
        sendBtn.removeAttribute('aria-disabled');
      }
    }
    return { utxos, total, available, pending };
  }

  const signEl = document.getElementById("sign");
  if (signEl)
    signEl.addEventListener("click", async () => {
      const active = importedFirma || imported;
      if (!active) {
        openAppModal("Wallet requerida", `<div>Importa un keystore (general o de firma) antes de firmar.</div>`);
        return;
      }
      const payload = document.getElementById("payload").value;
      const hash = new TextEncoder().encode(payload);
      const signature = await secp.sign(hash, active.priv);
      const out = signature;
      document.getElementById("out").textContent = JSON.stringify(out, null, 2);
      try {
        openAppModal(
          "Firma generada",
          `<div class="tx-modal-section"><h4 style="margin:8px 0 6px;">Signature</h4><pre class="output" style="white-space:pre-wrap;">${JSON.stringify(out, null, 2)}</pre></div>`
        );
      } catch {}
    });

  // Verify signature UI
  const verifyEl = document.getElementById("verify");
  if (verifyEl)
    verifyEl.addEventListener("click", async () => {
      const payload = document.getElementById("payload").value;
      const pub = (document.getElementById("verifyPub").value || "").trim();
      const sigRaw = document.getElementById("verifySig").value || "";
      const out = document.getElementById("verifyOut");
      out.textContent = "";
      if (!pub) { out.textContent = "PublicKey required"; try { openAppModal('Validación', `<div>PublicKey requerida.</div>`); } catch{} return; }
      if (!sigRaw) { out.textContent = "Signature required (JSON {r,s})"; try { openAppModal('Validación', `<div>Firma requerida (JSON {r,s}).</div>`); } catch{} return; }

      let sigObj;
      try {
        sigObj = JSON.parse(sigRaw);
      } catch (e) {
        out.textContent = "Invalid signature JSON: " + e.message;
        try { openAppModal('Firma inválida', `<div>JSON inválido: ${(e && e.message) || e}</div>`); } catch{}
        return;
      }
      if (!sigObj.r || !sigObj.s) {
        out.textContent = "Signature JSON must have r and s";
        try { openAppModal('Firma inválida', `<div>La firma debe contener r y s.</div>`); } catch{}
        return;
      }

      // Basic pubkey format check (uncompressed 04 + 128 hex)
      const pubKeyRegex = /^04[0-9a-fA-F]{128}$/;
      if (!pubKeyRegex.test(pub)) {
        out.textContent = "Invalid public key format (expect 04 + 128 hex)";
        try { openAppModal('PublicKey inválida', `<div>Formato de publicKey inválido (esperado 04 + 128 hex).</div>`); } catch{}
        return;
      }

      // Verify against SHA-256 of payload using local WebCrypto helper
      try {
        const msgHash = await sha256Bytes(payload);
        const ok = secp.verify({ r: sigObj.r, s: sigObj.s }, msgHash, pub);
        const msg = ok ? "VALID (SHA256(payload) verification)" : "INVALID signature for given payload/publicKey";
        out.textContent = msg;
        try { openAppModal(ok ? 'Firma válida' : 'Firma inválida', `<div>${msg}</div>`); } catch{}
      } catch (e) {
        const errMsg = "Verify error: " + (e?.message || String(e));
        out.textContent = errMsg;
        try { openAppModal('Error de verificación', `<div style=\"color:#c00;font-weight:600;\">${(e && e.message) || e}</div>`); } catch{}
      }
    });

  const sendEl = document.getElementById("sendTx");
  console.log('[send] registering #sendTx listener, element found:', !!sendEl);
  if (sendEl)
    sendEl.addEventListener("click", async () => {
      console.log('[send] #sendTx clicked');
      const outEl = document.getElementById("sendOut");
      if (outEl) outEl.textContent = "";
      if (!imported) {
        console.warn('[send] no wallet imported');
        openAppModal("Wallet requerida", `<div>Importa un keystore primero para poder enviar.</div>`);
        return;
      }
      const sender = imported.pub;
      const recipient = document.getElementById("recipient").value.trim();
      const amount = Number(document.getElementById("amount").value);
      const passphraseTx = document.getElementById("passphraseTx").value;
      console.log('[send] values', { sender, recipient, amount, hasPass: !!passphraseTx });
      if (!imported) {
        openAppModal("Wallet requerida", `<div>Importa un keystore primero.</div>`);
        return;
      }
      if (!recipient || !amount || amount <= 0) {
        openAppModal("Datos incompletos", `<div>Recipient y amount requeridos.</div>`);
        return;
      }
      if (!passphraseTx) {
        openAppModal("Passphrase requerida", `<div>Passphrase para firmar requerida.</div>`);
        return;
      }
      const pubKeyRegex = /^04[0-9a-fA-F]{128}$/;
      if (!pubKeyRegex.test(recipient)) {
        const proceed = await openConfirmModal(
          "Dirección sospechosa",
          `<div>Recipient address no parece una publicKey válida (debe iniciar con 04 y tener 128 chars hex). ¿Continuar?</div>`,
          { confirmText: "Continuar", cancelText: "Cancelar" }
        );
        if (!proceed) return;
      }
      const senderPubEl = document.getElementById("senderPub");
      if (senderPubEl) senderPubEl.value = sender;

      // Obtener UTXOs seleccionados
      // Selección única: evitar duplicados por txId:outputIndex
      const seenUtxoKeys = new Set();
      const selectedUTXOs = Array.from(
        document.querySelectorAll(".utxo-checkbox:checked")
      ).map((cb) => ({
        txId: cb.dataset.txid,
        outputIndex: parseInt(cb.dataset.outputindex),
        amount: parseFloat(cb.dataset.amount),
        address: cb.dataset.address,
      })).filter(u => {
        const key = `${u.txId}:${u.outputIndex}`;
        if (seenUtxoKeys.has(key)) return false;
        seenUtxoKeys.add(key);
        return true;
      });
      if (selectedUTXOs.length === 0) {
        outEl.textContent = "Selecciona al menos un UTXO para enviar la transacción.";
        // Aviso no destructivo: toast + aviso inline y resaltado de la lista UTXO
        try { showToast('Selecciona al menos un UTXO para enviar la transacción.', 'warning'); } catch {}
        const listWrap = document.querySelector('#loteModal:not(.hidden) #utxoSelectList') || document.getElementById('utxoSelectList');
        if (listWrap) {
          listWrap.style.outline = '2px solid #ff6b6b';
          // Insertar aviso inline encima de la lista si no existe
          const hintScope = listWrap.closest('#loteModal') || document;
          if (!hintScope.querySelector('.utxo-required-hint')) {
            const hint = document.createElement('div');
            hint.className = 'utxo-required-hint';
            hint.textContent = 'Debes seleccionar un UTXO antes de firmar y enviar.';
            hint.style.background = '#ffe9e9';
            hint.style.color = '#a40000';
            hint.style.border = '1px solid #ffb3b3';
            hint.style.borderRadius = '6px';
            hint.style.padding = '8px 10px';
            hint.style.margin = '8px 0 10px';
            const container = listWrap.parentElement || listWrap;
            container.insertBefore(hint, listWrap);
          }
          // Llevar la lista UTXO a la vista para guiar el foco del usuario
          try {
            listWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {}
          // Quitar el resaltado después de unos segundos
          setTimeout(() => { try { listWrap.style.outline = ''; } catch {} }, 2200);
        }
        return;
      }
      // Validar que la suma de UTXOs seleccionados cubre el monto
      const totalSelected = selectedUTXOs.reduce((sum, u) => sum + u.amount, 0);
      if (totalSelected < amount) {
        outEl.textContent = `Fondos insuficientes en UTXOs seleccionados: total=${totalSelected}`;
        openAppModal("Fondos insuficientes", `<div>Los UTXOs seleccionados (${totalSelected}) no cubren el monto (${amount}).</div>`);
        return;
      }
      const inputs = selectedUTXOs.map((u) => ({
        txId: u.txId,
        outputIndex: u.outputIndex,
        address: sender,
        amount: u.amount,
      }));
      const outputs = [{ amount, address: recipient }];
      const change = totalSelected - amount;
      if (change > 0) outputs.push({ amount: change, address: sender });
      // Local SHA-256 for outputs and transaction hashing (CSP-safe)
      const outputsHashBytes = await sha256Bytes(JSON.stringify(outputs));
      const sig = await secp.sign(outputsHashBytes, imported.priv);
      const signature = { r: sig.r, s: sig.s };
      const signedInputs = inputs.map((i) => ({ ...i, signature }));
      const hash1Bytes = await sha256Bytes(JSON.stringify({ inputs: signedInputs, outputs }));
      const txIdBytes = await sha256Bytes(hash1Bytes);
      const txId = bufToHex(txIdBytes);
      const signedTransaction = { id: txId, inputs: signedInputs, outputs };
      outEl.textContent = "Signed transaction constructed (ver modal)";
      openAppModal(
        "Transacción firmada",
        `
          <div class="tx-modal-section">
            <h4 style="margin:8px 0 6px;">Signed transaction</h4>
            <pre class="output" style="white-space:pre-wrap;">${JSON.stringify(signedTransaction, null, 2)}</pre>
          </div>
        `
      );
      // No cerrar el modal automáticamente: solo marcar UTXOs como pendientes y refrescar balance
      const onSendSuccess = () => {
        // Marcar UTXOs como pendientes
        const keys = (selectedUTXOs||[]).map(u => `${u.txId}:${u.outputIndex}`);
        try { markUtxosPending(keys); } catch (e) { console.warn('[SendTx][markPending] error', e); }
        try { showToast('Transacción enviada. UTXO marcado como pendiente.', 'success'); } catch {}
        // Refrescar balance en el modal
        try { recalcAvailableFromDOM(); } catch {}
      };

      try {
        const isDifferentPort = location.port && location.port !== "3000";
        const base = isDifferentPort
          ? `${location.protocol}//${location.hostname}:3000`
          : "";
        const resp = await fetch(`${base}/transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signedTransaction, passphrase: passphraseTx }),
        });
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const respJson = await resp.json();
          const isSuccess = (resp.ok) || (respJson && respJson.success === true);
          openAppModal(
            isSuccess ? "Transacción enviada" : "Transacción rechazada",
            `
              <div class="tx-modal-section">
                <h4 style="margin:8px 0 6px;">Signed transaction</h4>
                <pre class="output" style="white-space:pre-wrap;">${JSON.stringify(signedTransaction, null, 2)}</pre>
                <h4 style="margin:12px 0 6px;">Server response</h4>
                <pre class="output" style="white-space:pre-wrap;">${JSON.stringify(respJson, null, 2)}</pre>
              </div>
            `
          );
          if (isSuccess) onSendSuccess();
        } else {
          const text = await resp.text();
          openAppModal(
            `Server response (status ${resp.status})`,
            `
              <div class="tx-modal-section">
                <h4 style="margin:8px 0 6px;">Signed transaction</h4>
                <pre class="output" style="white-space:pre-wrap;">${JSON.stringify(signedTransaction, null, 2)}</pre>
                <h4 style="margin:12px 0 6px;">Server response (text)</h4>
                <pre class="output" style="white-space:pre-wrap;">${(text || '<no body>').replace(/</g,'&lt;')}</pre>
              </div>
            `
          );
          if (resp.ok) onSendSuccess();
        }
      } catch (err) {
        console.error("Send tx error", err);
        outEl.textContent += "\n\nSend failed";
        openAppModal("Error al enviar", `<div style=\"color:#c00;font-weight:600;\">${(err && err.message) || err}</div>`);
      }
    });

  // Muestra el historial de la wallet en el modal reutilizando #loteModal
  const showHistorialModal = (historyData) => {
    console.log("[Historial] Datos recibidos del backend:", historyData); // Debug: muestra los datos completos
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalHistorial = document.getElementById("modalHistorial");
    console.log('[DEBUG][historial] modalTitle:', !!modalTitle, 'modalBody:', !!modalBody, 'modalHistorial:', !!modalHistorial);
    if (modalHistorial) {
      console.log('[DEBUG][historial] modalHistorial display before:', modalHistorial.style.display, 'innerHTML length:', modalHistorial.innerHTML.length);
    }
    // Cambia el título del modal
    if (modalTitle) modalTitle.textContent = "Historial de la Wallet";

    // Alterna visibilidad: oculta modalBody, muestra modalHistorial
    if (!modalBody || !modalHistorial) {
      console.error(
        "[Historial] No se encontró modalBody o modalHistorial en el DOM"
      );
      openAppModal("Error de interfaz", `<div style='color:#c00;font-weight:600;'>No se encontró el contenedor del historial en el modal.</div>`);
      return;
    }
    modalBody.style.display = "none";
    modalHistorial.style.display = "block";
    console.log('[DEBUG][historial] modalBody display:', modalBody.style.display, 'modalHistorial display:', modalHistorial.style.display);

    // Construye la vista vertical tipo tarjeta para cada transacción
    const html = (historyData && Array.isArray(historyData.history))
      ? historyData.history.map(
        (item) => `
      <div class=\"historial-item\">
        <div><strong>TxID:</strong> ${item.txId}</div>
        <div><strong>Tipo:</strong> ${item.type}</div>
        <div><strong>Cantidad:</strong> ${item.amount}</div>
        <div><strong>Destino:</strong> ${item.destino || "-"} </div>
        <div><strong>De:</strong> ${
          (item.from && item.from.join("<br>")) || "-"
        } </div>
        <div><strong>To:</strong> ${
          (item.to && item.to.join("<br>")) || "-"
        } </div>
        <div><strong>Estado:</strong> ${item.status}</div>
        <div><strong>Timestamp:</strong> ${item.timestamp || "-"} </div>
      </div>
    `
      ).join("") : '<div class="muted">Sin historial disponible.</div>';
    console.log('[DEBUG][historial] html length:', html.length);
    // Inserta la vista en el historial del modal
    modalHistorial.innerHTML = html;
    console.log('[DEBUG][historial] modalHistorial display after:', modalHistorial.style.display, 'innerHTML length:', modalHistorial.innerHTML.length);

    // Muestra el modal
    document.getElementById("loteModal").style.display = "block";
    console.log("[Historial] Modal mostrado"); // Debug: confirma que se intenta mostrar el modal
    console.log('[DEBUG][historial] loteModal display:', document.getElementById("loteModal").style.display);

    // Cierra el modal al hacer click en la X
    const closeBtn = document.querySelector("#loteModal .close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        document.getElementById("loteModal").style.display = "none";
        // Al cerrar, restaurar visibilidad original
        modalBody.style.display = "block";
        modalHistorial.style.display = "none";
        modalHistorial.innerHTML = "";
        console.log("[Historial] Modal cerrado"); // Debug: confirma cierre
      };
    }
  };

  // Evento click para el botón historial
  // Asegúrate de que el botón #historial y el input #senderPub existen en tu HTML
  // Arrow function y try/catch para robustez
  const handleHistorialClick = async () => {
    const publicKeyInput = document.getElementById("senderPub");
    if (!publicKeyInput || !publicKeyInput.value) {
      openAppModal("Wallet requerida", `<div>No se ha importado ninguna wallet.</div>`);
      return;
    }
    const publicKey = publicKeyInput.value;
    console.log("[Historial] PublicKey usada:", publicKey); // Debug: muestra la publicKey
    try {
      const url = `/address-history/${publicKey}`;
      console.log('[DEBUG][historial] Fetching:', url);
      const res = await fetch(url);
      console.log('[DEBUG][historial] fetch response:', res.status, res.statusText);
      const data = await res.json();
      console.log('[DEBUG][historial] fetch data:', data);
      showHistorialModal(data);
    } catch (err) {
      // Muestra error si la petición falla
      console.error("[Historial] Error al consultar el historial:", err); // Debug: muestra el error
      openAppModal("Error al consultar historial", `<div style='color:#c00;font-weight:600;'>${(err && err.message) || err}</div>`);
    }
  };

  // Expose handler globally for inline modal logic (module-safe)
  if (typeof window !== 'undefined') {
    window.handleHistorialClick = handleHistorialClick;
    console.log('[DEBUG][web-demo.js] handleHistorialClick assigned to window:', typeof window.handleHistorialClick);
  }
});
