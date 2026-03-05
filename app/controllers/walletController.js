// app/controllers/walletController.js
// Controlador para endpoints de wallet/cripto


// POST /wallet/load-global
import { check, validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import { User, Wallet as UserWallet } from '../models/index.js';

const HEX_KEY_REGEX = /^[a-fA-F0-9]+$/;

const getAuthenticatedUserId = (req) => {
  if (req.user?.id) return req.user.id;
  if (req.session?.user?.id) return req.session.user.id;
  return null;
};

const normalizeWalletHex = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isValidWalletHex = (value) => {
  if (!value || !HEX_KEY_REGEX.test(value)) return false;
  // Soportamos claves publicas comprimidas (33 bytes = 66 hex)
  // y no comprimidas (65 bytes = 130 hex).
  return value.length === 66 || value.length === 130;
};

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

// POST /wallet/link (alias: /wallets/link)
// Vincula una wallet al usuario autenticado sin requerir creacion de cuenta nueva.
const linkWalletToAuthenticatedUser = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Debes iniciar sesion para vincular una wallet'
      });
    }

    const user = await User.findByPk(authenticatedUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario autenticado no encontrado'
      });
    }

    const rawPublicKey = normalizeWalletHex(req.body?.publicKey);
    const rawAddress = normalizeWalletHex(req.body?.address);
    const walletAddress = (rawAddress || rawPublicKey).toLowerCase();
    const requestedType = typeof req.body?.type === 'string' ? req.body.type.trim().toLowerCase() : 'internal';
    const requestedStatus = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : 'active';

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Debes enviar publicKey o address'
      });
    }

    if ((rawPublicKey && !isValidWalletHex(rawPublicKey)) || (rawAddress && !isValidWalletHex(rawAddress))) {
      return res.status(400).json({
        success: false,
        error: 'Formato de wallet invalido. Se espera hex de 66 o 130 caracteres'
      });
    }

    if (rawPublicKey && rawAddress && rawPublicKey.toLowerCase() !== rawAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'publicKey y address no coinciden'
      });
    }

    const existingWallet = await UserWallet.findOne({ where: { address: walletAddress } });

    if (existingWallet) {
      if (existingWallet.usuario_id && existingWallet.usuario_id !== authenticatedUserId) {
        return res.status(409).json({
          success: false,
          error: 'Esta wallet ya esta vinculada a otra cuenta'
        });
      }

      if (existingWallet.usuario_id === authenticatedUserId) {
        return res.status(200).json({
          success: true,
          data: existingWallet,
          message: 'La wallet ya estaba vinculada a tu cuenta'
        });
      }

      await existingWallet.update({
        usuario_id: authenticatedUserId,
        type: requestedType || existingWallet.type || 'internal',
        status: requestedStatus || existingWallet.status || 'active',
        fecha_vinculacion: existingWallet.fecha_vinculacion || new Date()
      });

      return res.status(200).json({
        success: true,
        data: existingWallet,
        message: 'Wallet vinculada exitosamente'
      });
    }

    const newWallet = await UserWallet.create({
      id: `w_${Date.now()}`,
      address: walletAddress,
      status: requestedStatus || 'active',
      type: requestedType || 'internal',
      usuario_id: authenticatedUserId,
      fecha_vinculacion: new Date()
    });

    return res.status(201).json({
      success: true,
      data: newWallet,
      message: 'Wallet creada y vinculada exitosamente'
    });
  } catch (error) {
    console.error('[WALLET] Error en linkWalletToAuthenticatedUser:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al vincular wallet',
      details: error.message
    });
  }
};

// POST /wallet/unlink (alias: /wallets/unlink)
// Desvincula una wallet del usuario autenticado sin eliminar la fila.
const unlinkWalletFromAuthenticatedUser = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Debes iniciar sesion para desvincular una wallet'
      });
    }

    const rawPublicKey = normalizeWalletHex(req.body?.publicKey);
    const rawAddress = normalizeWalletHex(req.body?.address);
    const walletAddress = (rawAddress || rawPublicKey).toLowerCase();

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Debes enviar publicKey o address'
      });
    }

    if ((rawPublicKey && !isValidWalletHex(rawPublicKey)) || (rawAddress && !isValidWalletHex(rawAddress))) {
      return res.status(400).json({
        success: false,
        error: 'Formato de wallet invalido. Se espera hex de 66 o 130 caracteres'
      });
    }

    if (rawPublicKey && rawAddress && rawPublicKey.toLowerCase() !== rawAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'publicKey y address no coinciden'
      });
    }

    const wallet = await UserWallet.findOne({ where: { address: walletAddress } });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet no encontrada'
      });
    }

    if (!wallet.usuario_id) {
      return res.status(200).json({
        success: true,
        data: wallet,
        message: 'La wallet ya estaba desvinculada'
      });
    }

    if (wallet.usuario_id !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        error: 'No puedes desvincular una wallet que no pertenece a tu cuenta'
      });
    }

    await wallet.update({
      usuario_id: null,
      status: 'inactive'
    });

    return res.status(200).json({
      success: true,
      data: wallet,
      message: 'Wallet desvinculada exitosamente'
    });
  } catch (error) {
    console.error('[WALLET] Error en unlinkWalletFromAuthenticatedUser:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al desvincular wallet',
      details: error.message
    });
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
  linkWalletToAuthenticatedUser,
  unlinkWalletFromAuthenticatedUser,
};
