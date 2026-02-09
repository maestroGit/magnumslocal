// app/controllers/walletController.js
// Controlador para endpoints de wallet/cripto


// POST /wallet/load-global
import { check, validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';

const loadGlobalWallet = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  console.log(
    "[LOAD-GLOBAL] Body recibido del frontend:",
    JSON.stringify(req.body, null, 2)
  );
  const { encryptedPrivateKey, salt, iv, tag, passphrase, publicKey } = req.body;
  if (!encryptedPrivateKey || !salt || !iv || !tag || !passphrase || !publicKey) {
    console.error("[LOAD-GLOBAL] ❌ Faltan campos requeridos en la petición");
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  try {
    if (global.globalWallet && global.globalWallet.publicKey) {
      console.log(
        "[LOAD-GLOBAL] Clave pública global ANTES del cambio:",
        global.globalWallet.publicKey
      );
    } else {
      console.log("[LOAD-GLOBAL] No había wallet global cargada previamente.");
    }
    const keystore = {
      keystoreVersion: 1,
      kdf: "pbkdf2",
      kdfParams: {
        salt,
        iterations: 100000,
        keylen: 32,
        digest: "sha256",
      },
      cipher: "aes-256-gcm",
      cipherParams: { iv },
      tag,
      publicKey,
      encryptedPrivateKey,
    };
    // Asume que decryptPrivateKeyFromKeystore y Wallet están en global
    const privateKeyBuf = await global.decryptPrivateKeyFromKeystore(
      keystore,
      passphrase
    );
    let globalWallet = new global.Wallet(null, undefined, privateKeyBuf.toString("hex"));
    global.globalWallet = globalWallet;
    if (globalWallet.keyPair && globalWallet.keyPair.getPublic) {
      globalWallet.publicKey = globalWallet.keyPair.getPublic().encode("hex");
      global.globalWallet = globalWallet;
    }
    if (
      globalWallet &&
      globalWallet.keyPair &&
      globalWallet.keyPair.getPublic
    ) {
      console.log(
        "[LOAD-GLOBAL][POST] publicKey servida por /wallet/global:",
        globalWallet.keyPair.getPublic().encode("hex")
      );
    } else if (globalWallet && globalWallet.publicKey) {
      console.log(
        "[LOAD-GLOBAL][POST] publicKey servida por /wallet/global:",
        globalWallet.publicKey
      );
    }
    const walletPath = path.join(
      global.__dirname,
      "./app/uploads/wallet_default.json"
    );
    fs.writeFileSync(walletPath, JSON.stringify(keystore, null, 2), "utf8");
    console.log(
      "[LOAD-GLOBAL] wallet_default.json sobrescrito. Clave pública activa ahora:",
      globalWallet.publicKey
    );
    console.log("[LOAD-GLOBAL] ✅ Wallet global actualizada.");
    console.log(
      "[LOAD-GLOBAL] Clave pública global DESPUÉS del cambio:",
      globalWallet.publicKey
    );
    console.log(
      "[LOAD-GLOBAL] Clave privada global DESPUÉS del cambio:",
      globalWallet.privateKey
    );
    console.log(
      "[LOAD-GLOBAL] wallet_default.json sobrescrito en:",
      walletPath
    );
    return res.json({ ok: true, publicKey: globalWallet.publicKey });
  } catch (e) {
    console.error("[LOAD-GLOBAL] ❌ Error al cargar la wallet global:", e);
    return res.status(401).json({ error: "Passphrase incorrecta o wallet corrupta" });
  }
};

// POST /wallet/generate
const generateWallet = async (req, res) => {
  const { passphrase } = req.body;
  if (!passphrase) {
    return res.status(400).json({ error: "Falta passphrase" });
  }
  try {
    // Import dinámico para mantener compatibilidad con ESM
    const { generateKeystore } = await import("../../app/walletCrypto.js");
    const keystore = await generateKeystore(passphrase);
    return res.json(keystore);
  } catch (e) {
    console.error("[/wallet/generate] Error:", e);
    return res.status(500).json({ error: "Error generando wallet" });
  }
};

// GET /wallet/global
const getGlobalWallet = (req, res) => {
  const walletRef = global.globalWallet || global.wallet || null;
  if (!walletRef) {
    console.log("[WALLET-GLOBAL] No hay wallet global cargada.");
    return res.status(404).json({ error: "No hay wallet global cargada" });
  }
  // Siempre devolver la clave pública derivada del keyPair
  let pubKey = null;
  if (walletRef.keyPair && walletRef.keyPair.getPublic) {
    pubKey = walletRef.keyPair.getPublic().encode("hex");
  } else if (walletRef.publicKey) {
    pubKey = walletRef.publicKey;
  }
  console.log(
    "[WALLET-GLOBAL][GET] publicKey servida por /wallet/global:",
    pubKey
  );
  return res.json({ publicKey: pubKey });
};

// POST /hardware-address
const hardwareAddress = (req, res, next) => {
  // Wrap multer invocation so podemos controlar error handling per-request
  const upload = global.upload; // Asume que upload está en global
  const single = upload.single("usbPath");
  single(req, res, function (err) {
    if (err) {
      console.error("Multer error on /hardware-address:", err);
      if (err instanceof global.multer.MulterError) {
        return res.status(400).json({ success: false, error: err.message, code: err.code });
      }
      return res.status(400).json({ success: false, error: err.message || "Upload error" });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file received" });
      }
      const usbPath = req.file.path;
      const fileContent = global.fs.readFileSync(usbPath, "utf8");
      let parsedContent;
      try {
        parsedContent = JSON.parse(fileContent);
      } catch (parseErr) {
        console.error("Invalid JSON uploaded to /hardware-address:", parseErr);
        try { global.fs.unlinkSync(usbPath); } catch (e) {}
        return res.status(400).json({ success: false, error: "Uploaded file is not valid JSON" });
      }
      const publicKey = parsedContent.publicKey;
      const privateKey = parsedContent.privateKey;
      if (!publicKey) {
        try { global.fs.unlinkSync(usbPath); } catch (e) {}
        return res.status(400).json({ success: false, error: "publicKey missing in uploaded file" });
      }
      global.wallet = new global.Wallet(publicKey, global.INITIAL_BALANCE, privateKey);
      if (!(process.env.NODE_ENV === "test" || process.env.NO_P2P === "true")) {
        global.miner = new global.Miner(global.bc, global.tp, global.wallet, global.p2pServer);
        console.log("[POST /hardware-address] Miner actualizado con wallet global descifrada");
      }
      try { global.fs.unlinkSync(usbPath); } catch (e) { console.warn("Could not delete uploaded file:", e); }
      console.log("Usando la clave pública cargada:", global.wallet.publicKey);
      return res.status(200).json({ message: "Success", publicKey: global.wallet.publicKey });
    } catch (error) {
      console.error("Error handling /hardware-address:", error);
      return res.status(500).json({ success: false, error: "Error processing uploaded file" });
    }
  });
};

// GET /public-key
const getPublicKey = (req, res) => {
  try {
    // Usa la wallet global si existe, si no, responde con error o null
    if (global.wallet && global.wallet.publicKey) {
      res.json({ publicKey: global.wallet.publicKey });
    } else {
      res.status(404).json({
        success: false,
        error: "No hay wallet activa. Sube una wallet primero.",
      });
    }
  } catch (error) {
    console.error("Error fetching public key:", error);
    res.status(500).json({ success: false, error: "Error fetching public key" });
  }
};

// POST /address-balance
const addressBalance = (req, res) => {
  console.log("📥 Solicitud recibida en /wallet/address-balance");
  console.log("📥 Solicitud recibida en /wallet/address-balance:", req.body);
  try {
    const { address } = req.body;
    if (!address) {
      throw new Error("Address is required");
    }
    const tempWallet = new global.Wallet(address, 0);
    const result = tempWallet.calculateBalance(global.bc, address);
    console.log("Resultado enviado al frontend:", result);
    res.json(result);
  } catch (error) {
    console.error("Error fetching address balance:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET /balance
const getBalance = (req, res) => {
  try {
    if (!global.globalWallet || !global.globalWallet.publicKey) {
      return res.status(404).json({ error: "No hay wallet global activa" });
    }
    const result = global.globalWallet.calculateBalance(global.bc, global.globalWallet.publicKey);
    res.json(result);
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ success: false, error: "Error fetching balance" });
  }
};

export {
  loadGlobalWallet,
  generateWallet,
  getGlobalWallet,
  hardwareAddress,
  getPublicKey,
  addressBalance,
  getBalance,
};
