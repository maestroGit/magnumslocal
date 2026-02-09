// Iniciar el servidor HTTP principal
import adminRoutes from './app/routes/adminRoutes.js';
import authRoutes from './app/routes/authRoutes.js';
import dotenv from "dotenv";
dotenv.config();
console.log("[DEBUG] dotenv.config() ejecutado al inicio. PEERS:", process.env.PEERS);
console.log("[DEBUG] NODE_ENV:", process.env.NODE_ENV);
import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import http from "http";
import { fileURLToPath } from "url";
import path from "path";
import helmet from "helmet";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import cors from "cors";
import fs from "fs";
import multer from "multer";
// Este archivo contiene varios endpoints y funcionalidades que permiten interactuar con una blockchain a través de HTTP
// las llaves {} son necesarias cuando el módulo exporta múltiples valores y deseas importar uno o varios de esos valores específicos.
// Si el módulo exporta un solo valor por defecto, no se utilizan las llaves.
import os from "os";
import { Blockchain } from "./src/blockchain.js"; // Clase Blockchain que gestiona la cadena de bloques
import { P2PServer } from "./app/p2pServer.js"; // Servidor P2P para comunicación entre nodos
import { Wallet } from "./wallet/wallet.js"; // Clase Wallet que gestiona claves y firma
import { Transaction } from "./wallet/transactions.js"; // Clase Transaction para crear transacciones
import { TransactionsPool } from "./wallet/transactionsPool.js"; // Clase TransactionsPool para gestionar la mempool
import { Miner } from "./app/miner.js"; // Clase Miner para minar bloques
import { INITIAL_BALANCE } from "./config/constantConfig.js"; // Valor inicial deseado para la wallet
import FileSystemMonitor from "./src/monitor/fileSystemMonitor.js"; // Monitor de sistema de ficheros
import SystemMonitor from "./src/monitor/systemMonitor.js"; // Monitor de sistema
import { BlockchainClient } from "./app/blockchainClient.js"; // Cliente para interactuar con otras blockchains
import Lote from "./src/models/Lote.js"; // Importar la clase Lote
import crypto from "crypto";
import { encryptWallet, decryptWallet } from "./app/walletCrypto.js";
import { UTXOManager } from "./src/utxomanager.js";
import loteRoutes from './app/routes/loteRoutes.js';
import blockchainRoutes from './app/routes/blockchainRoutes.js';

const isProduction = process.env.NODE_ENV === "production";
const app = express();
app.set("trust proxy", isProduction ? 1 : false); // Solo activar trust proxy en producción
const HTTP_PORT = process.env.HTTP_PORT || 6001;
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- PASSPORT GOOGLE OAUTH2 ---
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  // Aquí puedes guardar el usuario en la base de datos si lo deseas
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});
// --- SESSION & PASSPORT MIDDLEWARE ---
app.use(session({
  secret: process.env.JWT_SECRET || "blockswine_secret",
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
// --- RUTAS OAUTH2 GOOGLE ---
// ✅ MIGRADAS A: app/routes/authRoutes.js
// Se registran con app.use('/', authRoutes) más abajo
/*
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get("/auth/user", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});
*/

// --- ENDPOINT PARA VER LOGS DEL PROCESO EN EL NAVEGADOR ---
// (Debe ir después de la inicialización de 'app')
// Hook de logs y endpoint /logs
const LOG_HISTORY_SIZE = 500;
const logHistory = [];
const origConsoleLog = console.log;
const origConsoleWarn = console.warn;
const origConsoleError = console.error;
function pushLog(type, args) {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
  const entry = { ts: new Date().toISOString(), type, msg };
  logHistory.push(entry);
  if (logHistory.length > LOG_HISTORY_SIZE) logHistory.shift();
}
console.log = function(...args) { pushLog('log', args); origConsoleLog.apply(console, args); };
console.warn = function(...args) { pushLog('warn', args); origConsoleWarn.apply(console, args); };
console.error = function(...args) { pushLog('error', args); origConsoleError.apply(console, args); };

// Este endpoint debe ir tras la inicialización de 'app'
setImmediate(() => {
  if (typeof app !== 'undefined') {
    app.get('/logs', (req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write('<html><head><title>Logs magnumslocal</title><style>body{font-family:monospace;background:#222;color:#eee;} .log{margin-bottom:2px;} .log-warn{color:#ff0;} .log-error{color:#f66;} .log-log{color:#8f8;} .ts{color:#888;}</style></head><body>');
      res.write('<h2>Logs recientes (magnumslocal)</h2>');
      logHistory.forEach(l => {
        res.write(`<div class="log log-${l.type}"><span class="ts">[${l.ts}]</span> <span>${l.type.toUpperCase()}</span>: <span>${l.msg.replace(/\n/g,'<br>')}</span></div>`);
      });
      res.write('</body></html>');
      res.end();
    });
  }
});
// --- IMPORTS Y CONFIGURACIÓN INICIAL ---
console.log("[BOOT] Iniciando imports...");
// ...existing code...
console.log("[BOOT] Imports y variables globales listos.");
// --- CONFIGURACIÓN DE SEGURIDAD POR ENTORNO ---

// Import tokenRoutes for modular baja-token endpoint
import tokenRoutes from './app/routes/tokenRoutes.js';

// --- CONFIGURACIÓN DE SEGURIDAD POR ENTORNO ---
const LOCAL_API = process.env.LOCAL_API || "http://localhost:3000";
const PROD_API = process.env.PROD_API || "https://app.blockswine.com";
const PROD_API_HTTP = process.env.PROD_API_HTTP || "http://app.blockswine.com";

const connectSrc = [
  "'self'",
  "http://localhost:3000",
  "ws://localhost:6001",
  "https://app.blockswine.com",
  "http://app.blockswine.com"
];

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "connect-src": [
          ...connectSrc,
          "https://accounts.google.com",
          "https://www.googleapis.com",
          "https://*.googleusercontent.com"
        ],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", PROD_API],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": [
          "'self'",
          "data:",
          PROD_API,
          "https://developers.google.com",
          "https://*.googleusercontent.com"
        ],
      },
    },
  })
);

// --- CORS dinámico por entorno ---
const allowedPattern = /^(http:\/\/localhost(:\d+)?|https?:\/\/app\.blockswine\.com)$/;
const corsOptions = {
  origin: function (origin, callback) {
    console.log("[CORS] Origin recibido:", origin);
    console.log("[CORS] Regex test:", allowedPattern.test(origin));
    // Permitir app.blockswine.com en producción, localhost en desarrollo
    if (!origin || allowedPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "32kb" }));
// --- SERVE STATIC FILES EARLY ---
// Middleware para forzar Content-Type correcto en archivos JS ESM
app.use("/js", (req, res, next) => {
  if (req.path.endsWith(".js")) {
    res.type("application/javascript");
  }
  next();
});
app.use(express.static(path.join(__dirname, "./public")));
app.use("/uploads", express.static(path.join(__dirname, "app", "uploads")));
console.log("[BOOT] Express inicializado. Definiendo endpoints...");

// Configurar rate limiting global: 100 peticiones por 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de peticiones por IP
  standardHeaders: true, // devuelve info de rate limit en headers estándar
  legacyHeaders: false, // desactiva headers obsoletos
});
app.use(limiter);

// --- ENDPOINTS PARA CIFRADO/DECIFRADO Y CARGA DE WALLET GLOBAL ---





const utxoManager = new UTXOManager();
global.utxoManager = utxoManager;
const bc = new Blockchain();

function syncUTXOManagerWithBlockchain() {
  console.log('[SYNC][DEBUG] syncUTXOManagerWithBlockchain llamada');
  if (bc && bc.chain) {
    utxoManager.utxoSet = {};
    console.log('[SYNC][DEBUG] utxoManager.utxoSet limpiado. Keys:', Object.keys(utxoManager.utxoSet).length);
    console.log(`[SYNC][REF] bc.chain tiene ${bc.chain.length} bloques`);
    if (bc.chain.length === 0) {
      console.warn('[SYNC][REF] bc.chain está vacío.');
    } else {
      bc.chain.forEach((block, idx) => {
        console.log(`[SYNC][REF] Bloque #${idx}:`, JSON.stringify(block, null, 2));
        console.log(`[SYNC][CALL] Llamando updateWithBlock para bloque #${idx} (hash: ${block.hash || 'sin hash'}) con ${(block.data && block.data.length) || 0} transacciones.`);
        utxoManager.updateWithBlock(block);
        // Contar total de UTXOs después de cada bloque
        const totalUtxos = Object.values(utxoManager.utxoSet).reduce((acc, arr) => acc + arr.length, 0);
        console.log(`[SYNC][RETURN] updateWithBlock finalizado para bloque #${idx}. Total UTXOs ahora:`, totalUtxos);
      });
    }
    // Mostrar todos los UTXOs después de sincronizar
    const allUtxos = Object.entries(utxoManager.utxoSet).flatMap(([address, arr]) => arr.map(u => ({...u, address})));
    console.log('[SYNC][DEBUG] utxoManager.utxoSet después de sincronizar:', JSON.stringify(allUtxos, null, 2));
    console.log('[SYNC] UTXOManager sincronizado con la blockchain. Total UTXOs:', allUtxos.length);
  } else {
    console.error('[SYNC][ERROR] bc o bc.chain no definidos en syncUTXOManagerWithBlockchain');
  }
}

// Inicializar la blockchain y sincronizar UTXOManager solo después de que esté lista
bc.initialize().then((result) => {
  console.log('[INIT][Blockchain] Resultado de bc.initialize():', result);
  syncUTXOManagerWithBlockchain();
}).catch((err) => {
  console.error('[INIT][Blockchain] Error en bc.initialize():', err);
});

// Función para descifrar la clave privada desde el keystore

// Declarar la wallet global en memoria
let globalWallet = null;
global.globalWallet = globalWallet;
global.bc = bc;
console.log("[INIT] Estado inicial de globalWallet:", globalWallet);

// Mostrar la wallet global inicial al arrancar el backend
const walletPathInit = path.join(
  __dirname,
  "./app/uploads/wallet_default.json"
);
// Variable global para almacenar el keystore del servidor
let serverKeystore = null;

if (fs.existsSync(walletPathInit)) {
  try {
    const keystoreRaw = fs.readFileSync(walletPathInit, "utf8");
    const keystore = JSON.parse(keystoreRaw);
    serverKeystore = keystore; // Guardar referencia global al keystore
    console.log("[INIT] Keystore inicial encontrado en", walletPathInit);
    console.log("[INIT] Clave pública en wallet_default.json:", keystore.publicKey);
    // Intentar cargar la wallet global en memoria usando la clave privada descifrada
    const hasAllFields = [
      keystore.encryptedPrivateKey,
      keystore.salt,
      keystore.iv,
      keystore.tag,
      keystore.publicKey
    ].every(v => typeof v === 'string' && v.length > 0);
    if (hasAllFields) {
      const defaultPassphrase = process.env.DEFAULT_WALLET_PASSPHRASE || null;
      if (defaultPassphrase) {
        decryptPrivateKeyFromKeystore(keystore, defaultPassphrase)
          .then(privateKeyBuf => {
            globalWallet = new Wallet(null, undefined, privateKeyBuf.toString("hex"));
            if (globalWallet.keyPair && globalWallet.keyPair.getPublic) {
              globalWallet.publicKey = globalWallet.keyPair.getPublic().encode("hex");
            }
            global.globalWallet = globalWallet;
            // Redundante: asegurar que global.globalWallet siempre está sincronizado
            if (typeof global.globalWallet === 'undefined' || !global.globalWallet || !global.globalWallet.publicKey) {
              global.globalWallet = globalWallet;
            }
            console.log("[INIT] globalWallet cargada en memoria. publicKey:", globalWallet.publicKey);
          })
          .catch(e => {
            console.error("[INIT] Error descifrando wallet_default.json con passphrase por defecto:", e);
          });
      } else {
        console.warn("[INIT] No se ha definido DEFAULT_WALLET_PASSPHRASE. La wallet global no se cargará automáticamente.");
      }
    } else if (keystore.privateKey && typeof keystore.privateKey === 'string' && keystore.privateKey.length > 0) {
      globalWallet = new Wallet(null, undefined, keystore.privateKey);
      global.globalWallet = globalWallet;
      if (globalWallet.keyPair && globalWallet.keyPair.getPublic) {
        globalWallet.publicKey = globalWallet.keyPair.getPublic().encode("hex");
        global.globalWallet = globalWallet;
      }
      // Redundante: asegurar que global.globalWallet siempre está sincronizado
      if (typeof global.globalWallet === 'undefined' || !global.globalWallet || !global.globalWallet.publicKey) {
        global.globalWallet = globalWallet;
      }
      console.log("[INIT] globalWallet cargada en memoria desde privateKey. publicKey:", globalWallet.publicKey);
    } else {
      console.warn("[INIT] wallet_default.json no tiene campos necesarios para cargar la wallet global.");
    }
  } catch (e) {
    console.error("[INIT] Error leyendo wallet_default.json:", e);
  }
} else {
  console.log("[INIT] No existe wallet_default.json al arrancar el backend.");
}

// Importación compatible para scrypt-js en Node.js
// Usar scrypt nativo de Node.js
const decryptPrivateKeyFromKeystore = async (keystore, passphrase) => {
  console.log("[decryptPrivateKeyFromKeystore] keystore:", keystore);
  console.log("[decryptPrivateKeyFromKeystore] passphrase:", passphrase);
  // Decodificar salt e iv desde base64 si no parecen hex
  const salt = /^[0-9a-fA-F]+$/.test(keystore.kdfParams.salt)
    ? Buffer.from(keystore.kdfParams.salt, "hex")
    : Buffer.from(keystore.kdfParams.salt, "base64");
  const iv = /^[0-9a-fA-F]+$/.test(keystore.cipherParams.iv)
    ? Buffer.from(keystore.cipherParams.iv, "hex")
    : Buffer.from(keystore.cipherParams.iv, "base64");
  const ct = Buffer.from(keystore.encryptedPrivateKey, "base64");
  const authTag = Buffer.from(keystore.tag, "base64");
  console.log(
    "[decryptPrivateKeyFromKeystore] salt:",
    salt.toString("hex"),
    "length:",
    salt.length
  );
  console.log(
    "[decryptPrivateKeyFromKeystore] iv:",
    iv.toString("hex"),
    "length:",
    iv.length
  );
  console.log(
    "[decryptPrivateKeyFromKeystore] ciphertext:",
    ct.toString("hex"),
    "length:",
    ct.length
  );
  if (salt.length === 0)
    console.error(
      "[WALLET-ERROR] El campo 'salt' está vacío o mal decodificado"
    );
  if (iv.length === 0)
    console.error("[WALLET-ERROR] El campo 'iv' está vacío o mal decodificado");
  if (ct.length === 0)
    console.error(
      "[WALLET-ERROR] El campo 'encryptedPrivateKey' está vacío o mal decodificado"
    );
  if (authTag.length === 0)
    console.error(
      "[WALLET-ERROR] El campo 'tag' está vacío o mal decodificado"
    );
  console.log(
    "[decryptPrivateKeyFromKeystore] authTag:",
    authTag.toString("hex")
  );
  console.log(
    "[decryptPrivateKeyFromKeystore] ct (sin authTag):",
    ct.toString("hex")
  );

  // Deriva la clave con PBKDF2 según los parámetros del keystore
  const { iterations, keylen, digest } = keystore.kdfParams;
  let derivedKey;
  try {
    derivedKey = await new Promise((resolve, reject) => {
      crypto.pbkdf2(
        passphrase,
        salt,
        iterations,
        keylen,
        digest,
        (err, key) => {
          if (err) return reject(err);
          resolve(key);
        }
      );
    });
  } catch (e) {
    console.error("[crypto.pbkdf2] error:", e);
    throw new Error("Key derivation failed: " + (e && e.message));
  }
  console.log("[DEBUG] Derived key (hex):", derivedKey.toString("hex"));
  console.log("[crypto.pbkdf2] Derived key length:", derivedKey.length);
  // Log detallado de buffers antes de descifrar
  console.log("[DEBUG] iv (hex):", iv.toString("hex"), "length:", iv.length);
  console.log("[DEBUG] ct (hex):", ct.toString("hex"), "length:", ct.length);
  console.log(
    "[DEBUG] authTag (hex):",
    authTag.toString("hex"),
    "length:",
    authTag.length
  );
  // Usar derivedKey para descifrar
  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ct);
  console.log("[decryptPrivateKeyFromKeystore] antes de decipher.final()");
  try {
    let finalBuf;
    let finished = false;
    let errorFinal = null;
    // Timeout de 5 segundos para detectar cuelgue
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!finished) {
          const timeoutErr = new Error("Timeout en decipher.final()");
          console.error(
            "[decryptPrivateKeyFromKeystore] decipher.final() timeout: posible cuelgue o clave incorrecta"
          );
          console.error(
            "[decryptPrivateKeyFromKeystore] decipher.final() error stack:",
            timeoutErr.stack
          );
          reject(timeoutErr);
        }
      }, 5000);
      try {
        finalBuf = decipher.final();
        finished = true;
        resolve();
      } catch (e) {
        errorFinal = e;
        finished = true;
        console.error(
          "[decryptPrivateKeyFromKeystore] decipher.final() error stack:",
          e.stack
        );
        resolve();
      }
    });
    if (errorFinal) {
      console.error(
        "[decryptPrivateKeyFromKeystore] ERROR en decipher.final():",
        errorFinal
      );
      if (errorFinal && errorFinal.message) {
        console.error(
          "[decryptPrivateKeyFromKeystore] decipher.final() error message:",
          errorFinal.message
        );
      }
      if (errorFinal && errorFinal.stack) {
        console.error(
          "[decryptPrivateKeyFromKeystore] decipher.final() error stack:",
          errorFinal.stack
        );
      }
      throw new Error(
        "Error al descifrar la clave privada en decipher.final(): " +
          errorFinal.message
      );
    }
    decrypted = Buffer.concat([decrypted, finalBuf]);
    console.log("[decryptPrivateKeyFromKeystore] decrypted buffer:", decrypted);
    console.log(
      "[decryptPrivateKeyFromKeystore] decrypted hex:",
      decrypted.toString("hex")
    );
    console.log(
      "[decryptPrivateKeyFromKeystore] decrypted utf8:",
      decrypted.toString("utf8")
    );
    // Devuelve siempre el buffer descifrado, nunca como string utf8
    return decrypted;
  } catch (finalErr) {
    console.error(
      "[decryptPrivateKeyFromKeystore] ERROR en decipher.final():",
      finalErr
    );
    if (finalErr && finalErr.message) {
      console.error(
        "[decryptPrivateKeyFromKeystore] decipher.final() error message:",
        finalErr.message
      );
    }
    if (finalErr && finalErr.stack) {
      console.error(
        "[decryptPrivateKeyFromKeystore] decipher.final() error stack:",
        finalErr.stack
      );
    }
    throw new Error(
      "Error al descifrar la clave privada en decipher.final(): " +
        finalErr.message
    );
  }
};

// Ejemplo de uso en el backend (puedes adaptar este bloque donde lo necesites)
const loadWalletWithPassphrase = async (passphrase) => {
  const walletPath = path.join(__dirname, "./app/uploads/wallet_default.json");
  console.log("[FLOW] Leyendo wallet_default.json desde:", walletPath);
  const keystoreRaw = fs.readFileSync(walletPath, "utf8");
  console.log("[FLOW] Contenido wallet_default.json:", keystoreRaw);
  const keystore = JSON.parse(keystoreRaw);
  console.log("[FLOW] Keystore importado:", keystore);
  let privateKeyBuf = await decryptPrivateKeyFromKeystore(keystore, passphrase);
  console.log("[FLOW] Clave privada descifrada (buffer):", privateKeyBuf);
  // Si el resultado es un Buffer, conviértelo a hex. Si es string, asume que es hex.
  let privateKeyHex;
  if (Buffer.isBuffer(privateKeyBuf)) {
    privateKeyHex = privateKeyBuf.toString("hex");
  } else if (typeof privateKeyBuf === "string") {
    if (
      /^[0-9a-fA-F]+$/.test(privateKeyBuf) &&
      privateKeyBuf.length % 2 === 0
    ) {
      privateKeyHex = privateKeyBuf;
    } else {
      privateKeyHex = Buffer.from(privateKeyBuf, "utf8").toString("hex");
    }
  } else {
    throw new Error("Formato inesperado de clave privada descifrada");
  }
  console.log("[FLOW] Clave privada descifrada (hex):", privateKeyHex);
  console.log("[FLOW] Creando Wallet SOLO desde privateKeyHex derivada...");
  global.wallet = new Wallet(null, INITIAL_BALANCE, privateKeyHex);
  globalWallet = global.wallet;
  if (global.wallet.keyPair) {
    try {
      const pubHex = global.wallet.keyPair.getPublic().encode("hex");
      const privHex = global.wallet.keyPair.getPrivate("hex");
      console.log("[FLOW] keyPair.public (hex) derivada:", pubHex);
      console.log("[FLOW] keyPair.private (hex):", privHex);
      console.log("[FLOW] publicKey from keystore:", keystore.publicKey);
      if (pubHex !== keystore.publicKey) {
        console.error(
          "[WALLET-ERROR] La clave pública derivada de la privada NO coincide con la guardada en el keystore!"
        );
        console.error("[WALLET-ERROR] Derivada:", pubHex);
        console.error("[WALLET-ERROR] Keystore:", keystore.publicKey);
      } else {
        console.log(
          "[WALLET-OK] La clave pública derivada coincide con la del keystore."
        );
      }
    } catch (e) {
      console.error("[Wallet] Error mostrando keyPair:", e);
    }
  }
  console.log("[FLOW] Wallet cargada y descifrada con passphrase");
  // (Ya se inicializó la wallet arriba con privateKeyHex)
};

// Middleware de Express que se utilizan para analizar el cuerpo de las solicitudes HTTP entrantes
// Creamos servidor HTTP con la librería de Node express con ES6.

// --- ENDPOINTS PARA CIFRADO/DECIFRADO Y CARGA DE WALLET GLOBAL ---

// POST /wallet/generate
// Body: { passphrase }
// Devuelve: { publicKey, encryptedPrivateKey, salt, iv, tag }
import { v4 as uuidv4 } from "uuid";



// GET /wallet/global
// Devuelve la publicKey de la wallet global cargada (no la privada)


// --- Carga automática de wallet global al arrancar el backend ---
const NODE_NAME = process.env.NODE_NAME || "Default_Node";
const P2P_PORT = process.env.P2P_PORT || 5001;
const walletPath = path.join(__dirname, "./app/uploads/wallet_default.json");
let keyPairData = null;

// Passphrase por defecto para arranque automático (ajusta según tu flujo)
const DEFAULT_WALLET_PASSPHRASE = process.env.DEFAULT_WALLET_PASSPHRASE || "javi";

// Cargar wallet global en memoria si existe el archivo
if (fs.existsSync(walletPath)) {
  (async () => {
    try {
      await loadWalletWithPassphrase(DEFAULT_WALLET_PASSPHRASE);
      // Refuerzo: asegurar que global.globalWallet está sincronizado
      if (typeof global.globalWallet === 'undefined' || !global.globalWallet || !global.globalWallet.publicKey) {
        global.globalWallet = globalWallet;
      }
      console.log(
        "[INIT] Wallet global cargada automáticamente al arrancar el backend"
      );
      if (!(process.env.NODE_ENV === "test" || process.env.NO_P2P === "true")) {
        miner = new Miner(bc, tp, global.wallet, p2pServer);
        console.log("[INIT] Miner actualizado con wallet global descifrada");
      }
      // Refuerza la sincronización del UTXOManager tras cargar la wallet global
      syncUTXOManagerWithBlockchain();
    } catch (e) {
      console.error("[INIT] Error cargando wallet global al arrancar:", e);
    }
  })();
} else {
  // Si no existe, genera una nueva wallet cifrada (keystore moderno)
  (async () => {
    try {
      const { generateKeystore } = await import("./app/walletCrypto.js");
      const keystore = await generateKeystore(DEFAULT_WALLET_PASSPHRASE);
      fs.writeFileSync(walletPath, JSON.stringify(keystore, null, 2), "utf8");
      console.log(`🔑 Keystore generado y exportado a ${walletPath}`);
      await loadWalletWithPassphrase(DEFAULT_WALLET_PASSPHRASE);
      // Refuerzo: asegurar que global.globalWallet está sincronizado
      if (typeof global.globalWallet === 'undefined' || !global.globalWallet || !global.globalWallet.publicKey) {
        global.globalWallet = globalWallet;
      }
      if (!(process.env.NODE_ENV === "test" || process.env.NO_P2P === "true")) {
        miner = new Miner(bc, tp, global.wallet, p2pServer);
        console.log("[INIT] Miner actualizado con wallet global descifrada");
      }
      // Refuerza la sincronización del UTXOManager tras crear la wallet global
      syncUTXOManagerWithBlockchain();
    } catch (e) {
      console.error("[INIT] Error generando wallet global por defecto:", e);
    }
  })();
}

const tp = new TransactionsPool();
global.tp = tp;
let p2pServer;
let miner;
if (process.env.NODE_ENV === "test" || process.env.NO_P2P === "true") {
  // Test mode: lightweight stub to avoid opening sockets or external resources
  p2pServer = {
    sockets: [],
    broadcastTransaction: (tx) => {
      console.log("p2pServer stub broadcastTransaction", tx && tx.id);
    },
    syncChains: () => {},
    // Provide a no-op listen() so code that calls p2pServer.listen() is safe in test/no-p2p modes
    listen: () => {
      console.log(
        "p2pServer stub listen() called - no network sockets opened in test/NO_P2P mode"
      );
    },
  };
  miner = {
    mine: () => null,
  };
} else {
  p2pServer = new P2PServer(bc, tp);
  miner = new Miner(bc, tp, global.wallet, p2pServer);
}

// Ensure uploads directory exists and is safe
const UPLOAD_DIR = path.join(__dirname, "app", "uploads");
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`Created uploads dir at ${UPLOAD_DIR}`);
  }
} catch (err) {
  console.error(`Failed to ensure uploads dir: ${err}`);
}

// Hardened multer storage: random filename, controlled destination
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    try {
      const safeName =
        crypto.randomBytes(16).toString("hex") +
        path.extname(file.originalname || "");
      cb(null, safeName);
    } catch (e) {
      cb(e);
    }
  },
});

// Allowed MIME types for uploads. Adjust if you need other types.
const ALLOWED_MIMETYPES = new Set([
  "application/json",
  "image/png",
  "image/jpeg",
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit, adjust as required
  fileFilter: function (req, file, cb) {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

//app.use(bodyParser.json()); // activa un middleware de Express que permite al servidor interpretar automáticamente el cuerpo de las solicitudes HTTP en formato JSON.
app.use(express.json()); // Middleware moderno para parsear JSON

// --- REGISTRAR ROUTERS MODULARES ---
// Auth routes (OAuth Google)
app.use('/', authRoutes);

// Nueva ruta GET para obtener los datos de una transacción por su ID
// Nueva ruta POST para baja de token (transferencia a burn o bodega)

// Modular baja-token endpoint
app.use('/token', tokenRoutes);

// Importar y montar el router modular de wallet
import walletRoutes from './app/routes/walletRoutes.js';
app.use('/wallet', walletRoutes);

// Importar y montar el router modular de mining
import miningRoutes from './app/routes/miningRoutes.js';

import utxoRoutes from './app/routes/utxoRoutes.js';
import addressHistoryRoutes from './app/routes/addressHistoryRoutes.js';
import systemRoutes from './app/routes/systemRoutes.js';

// Montar routers después de importar
// Frontend static pages (MUST be before app.use('/', systemRoutes))
app.get("/view", (req, res) => {
  const viewPath = path.join(__dirname, "public", "view.html");
  res.sendFile(viewPath);
});

app.get("/", (req, res) => {
  const viewPath = path.join(__dirname, "public", "view.html");
  res.sendFile(viewPath);
});

app.use('/utxo-balance', utxoRoutes);
app.use('/address-history', addressHistoryRoutes);
app.use('/', systemRoutes);
app.use('/', loteRoutes); // QR, Lotes, Propietario endpoints
app.use('/', miningRoutes); // Mining endpoints

// ===================
// === ADMIN ENDPOINTS (AHORA EN ROUTER MODULAR) ===
// ===================
/*
// GET /system-info
app.get('/system-info', async (req, res) => {
  try {
    // ... lógica de getSystemInfo ...
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error obteniendo información del sistema', details: error.message });
  }
});
// GET /systemInfo
app.get('/systemInfo', async (req, res) => {
  try {
    // ... lógica de getSystemInfo ...
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error obteniendo información del sistema', details: error.message });
  }
});
*/

app.use('/admin', adminRoutes);
// Modular blockchain endpoints
app.use('/', blockchainRoutes);

// Ruta para mostrar las transacciones minadas en formato JSON
// Endpoint para obtener las transacciones minadas

// Ruta para mostrar la memmpool de transacciones en formato JSON
app.get("/transactionsPool", (req, res) => {
  try {
    res.json(tp.transactions);
  } catch (error) {
    console.error("Error fetching transactions pool:", error);
    res
      .status(500)
      .json({ success: false, error: "Error fetching transactions pool" });
  }
});

// Ruta para introducir transacciones en la pool de transacciones
app.post("/transaction", async (req, res) => {
  // ================= FLUJO DE TRANSACCIONES =================
  // Este endpoint acepta dos flujos bien diferenciados:
  // 1. FLUJO BODEGA: El backend firma la transacción (mode: 'bodega')
  // 2. FLUJO USUARIO: El frontend firma y el backend solo valida y propaga (signedTransaction)

  // Logs generales de entrada
  console.log("\n--- [POST /transaction] INICIO ---");
  console.log("[POST /transaction] req.body:", JSON.stringify(req.body, null, 2));

  // Deserializar variables del request body
  const { signedTransaction, recipient, amount, passphrase, keystore, inputs, mode } = req.body;

  // === FLUJO 2: USUARIO ===
  if (signedTransaction) {
    console.log(
      "[FLUJO USUARIO] Solicitud recibida. El backend solo validará y propagará la transacción pre-firmada por el usuario."
    );
    try {
      // Validación básica de estructura
      if (
        !signedTransaction.inputs ||
        !Array.isArray(signedTransaction.inputs) ||
        !signedTransaction.outputs ||
        !Array.isArray(signedTransaction.outputs)
      ) {
        console.warn(
          "[FLUJO USUARIO] ❌ Transacción rechazada: signedTransaction mal formada."
        );
        return res.status(400).json({
          success: false,
          error:
            "Malformed signedTransaction. inputs and outputs are required.",
        });
      }
      // Verificar que los inputs existan y no estén gastados
      const missingUtxos = signedTransaction.inputs.filter((inp) => {
        return !bc.utxoSet.some(
          (utxo) =>
            utxo.txId === inp.txId &&
            utxo.outputIndex === inp.outputIndex &&
            utxo.address === inp.address &&
            utxo.amount === inp.amount
        );
      });
      if (missingUtxos.length > 0) {
        console.warn(
          "[FLUJO USUARIO] ❌ Transacción rechazada: uno o más inputs no existen o ya están gastados.",
          missingUtxos
        );
        return res.status(400).json({
          success: false,
          error: "One or more inputs reference non-existing or spent UTXOs",
          missingUtxos,
        });
      }
      // Verificar la firma
      console.log("[DEBUG][POST /transaction] Llamando a Transaction.verifyTransaction...");
      const isValid = Transaction.verifyTransaction(signedTransaction);
      console.log("[DEBUG][POST /transaction] Resultado verifyTransaction:", isValid);
      if (!isValid) {
        console.warn(
          "[FLUJO USUARIO] ❌ Transacción rechazada: firma inválida."
        );
        return res
          .status(400)
          .json({ success: false, error: "Invalid transaction signature" });
      }
      // Añadir a la mempool y propagar
      let addResult;
      try {
        addResult = tp.updateOrAddTransaction(signedTransaction);
      } catch (e) {
        tp.transactions.push(signedTransaction);
        addResult = true;
      }
      if (addResult === false) {
        console.warn("[FLUJO USUARIO] ❌ Doble gasto detectado en mempool.");
        return res.status(400).json({
          success: false,
          error:
            "Doble gasto detectado: uno de los UTXOs ya está referenciado en una transacción pendiente. Rechazado por doble gasto en mempool.",
        });
      }
      p2pServer.broadcastTransaction(signedTransaction);
      console.log(
        "[FLUJO USUARIO] ✅ Transacción pre-firmada aceptada y propagada. ID:",
        signedTransaction.id
      );
      return res.json({
        success: true,
        message: "Signed transaction accepted",
        transactionId: signedTransaction.id,
      });
    } catch (err) {
      console.error(
        "[FLUJO USUARIO] Error procesando la transacción pre-firmada:",
        err
      );
      return res.status(500).json({
        success: false,
        error: "Error processing signed transaction",
        details: err.message,
      });
    }
  }

  // === FLUJO 1: BODEGA ===
  else if (mode === 'bodega') {
    // Legacy flow: accept recipient+amount and create/ sign on server if global.wallet has the private key

  // Validación básica de datos de entrada
  if (!recipient || !amount) {
    console.warn("❌ Transacción rechazada: datos incompletos", {
      recipient,
      amount,
    });
    return res.status(400).json({
      error: "Datos de la transacción incompletos",
      details: {
        recipient,
        amount,
        message: "Debes proporcionar un destinatario y un monto.",
      },
    });
  }
  // 🔍 Añade este log para depuración
  console.log("UTXO set global:", bc.utxoSet);
  console.log("Wallet pública activa:", global.wallet.publicKey);

  // Nueva lógica: solo procesar si keystore y passphrase existen
  if (!keystore || !passphrase) {
    // Si no viene keystore en el request, intentar usar la wallet global del servidor
    if (!passphrase) {
      console.log(
        "[POST /transaction] Falta passphrase. Transacción NO procesada."
      );
      return res.status(400).json({
        error:
          "Falta passphrase del usuario para firmar la transacción.",
      });
    }
    // Si tampoco está el keystore en el request, LOG informativo
    console.log(
      "[POST /transaction] El keystore no viene en el request. Usaremos la wallet global del servidor si está disponible."
    );
  }
  try {
    let privateKeyHex;
    
    // Caso 1: El cliente envía el keystore encriptado
    if (keystore) {
      console.log("[POST /transaction] Usando keystore enviado desde el cliente");
      // Usar el keystore y passphrase enviados por el usuario
      let privateKeyRaw = await decryptPrivateKeyFromKeystore(
        keystore,
        passphrase
      );
      if (Buffer.isBuffer(privateKeyRaw)) {
        privateKeyHex = privateKeyRaw.toString("hex");
      } else if (typeof privateKeyRaw === "string") {
        if (
          /^[0-9a-fA-F]+$/.test(privateKeyRaw) &&
          privateKeyRaw.length % 2 === 0
        ) {
          privateKeyHex = privateKeyRaw;
        } else {
          privateKeyHex = Buffer.from(privateKeyRaw, "utf8").toString("hex");
        }
      } else {
        throw new Error("Formato inesperado de clave privada descifrada");
      }
    } 
    // Caso 2: Validar passphrase contra el keystore del servidor y usar la wallet global
    else if (serverKeystore) {
      console.log("[POST /transaction] Validando passphrase contra keystore del servidor");
      // Validar passphrase intentando descifrar el keystore del servidor
      try {
        let privateKeyRaw = await decryptPrivateKeyFromKeystore(
          serverKeystore,
          passphrase
        );
        // Si llegamos aquí, la passphrase es correcta
        console.log("[POST /transaction] ✅ Passphrase validada correctamente");
        if (Buffer.isBuffer(privateKeyRaw)) {
          privateKeyHex = privateKeyRaw.toString("hex");
        } else if (typeof privateKeyRaw === "string") {
          if (
            /^[0-9a-fA-F]+$/.test(privateKeyRaw) &&
            privateKeyRaw.length % 2 === 0
          ) {
            privateKeyHex = privateKeyRaw;
          } else {
            privateKeyHex = Buffer.from(privateKeyRaw, "utf8").toString("hex");
          }
        } else {
          throw new Error("Formato inesperado de clave privada descifrada");
        }
      } catch (decryptError) {
        console.error("[POST /transaction] ❌ Passphrase incorrecta:", decryptError.message);
        throw new Error("Passphrase incorrecta");
      }
    }
    // Caso 3: Usar la wallet global del servidor (solo si ya está descifrada en memoria)
    else if (global.wallet && global.wallet.privateKey) {
      console.log("[POST /transaction] ⚠️ Usando wallet global del servidor sin validar passphrase (no hay keystore disponible)");
      privateKeyHex = global.wallet.privateKey;
    }
    // Caso 4: Intentar usar globalWallet (wallet por defecto del servidor)
    else if (globalWallet && globalWallet.privateKey) {
      console.log("[POST /transaction] ⚠️ Usando globalWallet del servidor sin validar passphrase (no hay keystore disponible)");
      privateKeyHex = globalWallet.privateKey;
    }
    else {
      throw new Error("No hay wallet disponible para firmar la transacción");
    }
    
    console.log(
      "[POST /transaction] privateKeyHex (usada en wallet):",
      privateKeyHex
    );
    console.log(
      "[POST /transaction] typeof privateKeyHex:",
      typeof privateKeyHex
    );
    // Crear wallet temporal SOLO para esta transacción
    const walletPublicKey = keystore?.publicKey || global.wallet?.publicKey || globalWallet?.publicKey;
    const tempWallet = new Wallet(
      walletPublicKey,
      INITIAL_BALANCE,
      privateKeyHex
    );
    console.log("[POST /transaction] tempWallet:", tempWallet);
    const utxos = bc.utxoSet.filter(
      (utxo) => utxo.address === tempWallet.publicKey
    );
    const balance = utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
    if (balance === 0) {
      console.warn("❌ Transacción rechazada: saldo insuficiente o sin UTXOs", {
        address: tempWallet.publicKey,
        balance,
      });
      return res.status(400).json({
        error: "No hay saldo disponible o la dirección no tiene UTXOs.",
        address: tempWallet.publicKey,
        balance,
      });
    }
    // Verifica que la wallet tenga la clave privada para firmar
    if (!tempWallet.privateKey) {
      console.warn("❌ Transacción rechazada: wallet sin clave privada", {
        address: tempWallet.publicKey,
      });
      return res.status(400).json({
        error: "No hay saldo disponible o la dirección no tiene UTXOs.",
        address: tempWallet.publicKey,
        balance,
        suggestion:
          "Verifica que la clave privada cargada corresponda a una dirección con saldo.",
      });
    }
    // Intenta crear la transacción
    const transaction = tempWallet.createTransaction(
      recipient,
      amount,
      bc,
      tp,
      bc.utxoSet
    );
    console.log("Creando la transacción en la wallet temporal...", transaction);

    if (transaction) {
      // Si la transacción es válida, la difunde
      p2pServer.broadcastTransaction(transaction);
      // 🚀 Respuesta mejorada para integración con trazabilidad
      return res.json({
        success: true,
        message: "Transacción creada exitosamente",
        transaction: {
          id: transaction.id,
          timestamp: transaction.timestamp,
          amount: amount,
          recipient: recipient,
          sender: tempWallet.publicKey,
        },
        enableTraceability: true, // Flag para activar modal de trazabilidad
      });
    } else {
      // Si la transacción no se pudo crear, responde con error
      return res.status(500).json({
        success: false,
        error: "Error creando la transacción",
      });
    }
  } catch (err) {
    console.error("[POST /transaction] Error en flujo BODEGA:", err);
    // Diferenciar entre errores de passphrase y otros errores
    if (err.message.includes("Passphrase incorrecta") || err.message.includes("Unsupported state or unable to authenticate data")) {
      return res.status(403).json({
        success: false,
        error: "Passphrase incorrecta. Verifica tu contraseña e intenta nuevamente.",
        details: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: "Error procesando la transacción.",
      details: err.message,
    });
  }

  // Verifica si la wallet tiene saldo suficiente usando el UTXOManager
  const utxos = bc.utxoSet.filter(
    (utxo) => utxo.address === global.wallet.publicKey
  );
  const balance = utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
  if (balance === 0) {
    console.warn("❌ Transacción rechazada: saldo insuficiente o sin UTXOs", {
      address: global.wallet.publicKey,
      balance,
    });
    return res.status(400).json({
      error: "No hay saldo disponible o la dirección no tiene UTXOs.",
      address: global.wallet.publicKey,
      balance,
    });
  }
  // Verifica que la wallet tenga la clave privada para firmar
  if (!global.wallet.privateKey) {
    console.warn("❌ Transacción rechazada: wallet sin clave privada", {
      address: global.wallet.publicKey,
    });
    return res.status(400).json({
      error: "No hay saldo disponible o la dirección no tiene UTXOs.",
      address: global.wallet.publicKey,
      balance,
      suggestion:
        "Verifica que la clave privada cargada corresponda a una dirección con saldo.",
    });
  }
  try {
    // Intenta crear la transacción
    const transaction = global.wallet.createTransaction(
      recipient,
      amount,
      bc,
      tp,
      bc.utxoSet
    );
    console.log("Creando la transacción en la wallet...", transaction);

    if (transaction) {
      // Si la transacción es válida, la difunde
      p2pServer.broadcastTransaction(transaction);

      // 🚀 Respuesta mejorada para integración con trazabilidad
      res.json({
        success: true,
        message: "Transacción creada exitosamente",
        transaction: {
          id: transaction.id,
          timestamp: transaction.timestamp,
          amount: amount,
          recipient: recipient,
          sender: global.wallet.publicKey,
        },
        enableTraceability: true, // Flag para activar modal de trazabilidad
      });
    } else {
      // Si la transacción no se pudo crear, responde con error
      return res.status(500).json({
        success: false,
        error: "Error creando la transacción",
      });
    }
  } catch (error) {
    // Captura cualquier error y responde sin caer el servidor
    console.error("Error creando la transacción:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "No se pudo crear la transacción.",
        details: error.message,
      });
    }
  }
  } else {
    // === FLUJO NO PERMITIDO ===
    console.warn(
      "[POST /transaction] ❌ Transacción rechazada: no es ni modo bodega ni transacción pre-firmada."
    );
    return res.status(400).json({
      error:
        "Transacción no permitida: solo se aceptan transacciones pre-firmadas (usuario) o modo bodega explícito.",
    });
  }
});

// GET /balance - Balance de wallet global
// ✅ MIGRADO A: app/routes/walletRoutes.js
// Se registra con app.use('/wallet', walletRoutes) línea 759
// Ruta consolidada: GET /wallet/balance

// POST /address-balance - Balance de dirección específica
// ✅ MIGRADO A: app/routes/walletRoutes.js  
// Se registra con app.use('/wallet', walletRoutes) línea 759
// Ruta consolidada: POST /wallet/address-balance

// ⚠️ BREAKING CHANGE: Los clientes deben actualizar sus llamadas:
// - GET /balance → GET /wallet/balance
// - POST /address-balance → POST /wallet/address-balance

// Ruta POST que permite subir un archivo desde el cliente (por ejemplo, un archivo JSON con la clave pública de una hardware wallet).
// Ruta para obtener publickey de una Hardware wallet/dirección
// Este endpoint permite que un usuario conecte su hardware wallet (por ejemplo, un USB con un archivo JSON que contiene su clave pública), y que el servidor lea esa clave para:
// - Mostrarla.
// - Usarla para calcular balances.
// - Potencialmente firmar transacciones (si se extiende la lógica)
// Utilizaremos el módulo fs para leer el archivo que contiene la clave pública desde el USB.
// En el servidor, nos aseguramos de que el archivo sea recibido correctamente con multer.
// Leemos el contenido del archivo y lo usamos para cargar la clave pública.
// Enviamos una respuesta JSON que incluye la clave pública si todo va bien.
// En el cliente, llamamos a HardwareWallet with la clave pública obtenida del servidor.

// POST /mine - Endpoint principal de minado
// ✅ MIGRADO A: app/routes/miningRoutes.js
// Se registra con app.use('/', miningRoutes) línea ~764
// Controlador: app/controllers/miningController.js::mineBlock

// POST /mine-transactions - Endpoint legacy de minado
// ✅ MIGRADO A: app/routes/miningRoutes.js
// Se registra con app.use('/', miningRoutes) línea ~764
// Controlador: app/controllers/miningController.js::mineTransactionsLegacy



// Export app for testing

// Arrow function para obtener la IP externa local segura
// Esta función intenta obtener la primera IP externa (no interna) disponible
// Si no encuentra ninguna, devuelve 'localhost' como fallback
const getLocalExternalIP = () => {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address; // Primera IP externa (LAN) encontrada
        }
      }
    }
    return "localhost"; // Fallback si no hay ninguna externa
  } catch (error) {
    console.error("Error obteniendo la IP externa:", error);
    return "localhost";
  }
};

const localIP = getLocalExternalIP();

// Ruta para obtener información del sistema ampliada
// ✅ MIGRADA A: app/routes/systemRoutes.js
// Se registra con app.use('/', systemRoutes) más arriba
/*
app.get("/system-info", async (req, res) => {
  // ... lógica migrada a systemRoutes ...
});
*/

// QR & Lotes endpoints
// ✅ MIGRADOS A: app/routes/loteRoutes.js  
// Se registran con app.use('/', loteRoutes) línea 761

// POST /lotes - crea un registro de lote asociado a una transacción (txId)
// POST /lotes - crea registro de lote
// ✅ MIGRADO A: app/routes/loteRoutes.js
// Se registra con app.use('/', loteRoutes) línea 761

// POST /verify-qr-proof - verifica transacción en blockchain
// ✅ MIGRADO A: app/routes/loteRoutes.js
// Se registra con app.use('/', loteRoutes) línea 761

// Ruta para obtener el contenido de un directorio
app.get("/directory-contents", async (req, res) => {
  try {
    const directoryPath = "./"; // Cambia esta ruta al directorio que quieras monitorizar
    const directoryContents = await FileSystemMonitor.listFilesInDirectory(
      directoryPath
    );
    res.json(directoryContents);
  } catch (error) {
    console.error("Error fetching directory contents:", error);
    res
      .status(500)
      .json({ success: false, error: "Error fetching directory contents" });
  }
});
// Endpoint to get lote data by loteId

// GET /lotes/:loteId - obtiene registro de lote por ID
// ✅ MIGRADO A: app/routes/loteRoutes.js
// Se registra con app.use('/', loteRoutes) línea 761

// GET /propietario/:ownerPublicKey - busca transacciones por propietario
// ✅ MIGRADO A: app/routes/loteRoutes.js
// Se registra con app.use('/', loteRoutes) línea 761

// Manejo de rutas no encontradas (404) - response JSON

// Inicia el servidor HTTP y escucha en el puerto especificado

// --- INICIO DIFERIDO DEL SERVIDOR: Esperar a que la wallet global y la blockchain estén listas ---
async function startServerWhenReady() {
  try {
    // Esperar a que la wallet global esté cargada (si es promesa)
    if (typeof globalWallet === 'undefined' || !globalWallet || !globalWallet.publicKey) {
      // Si la wallet se carga asíncronamente, espera hasta que esté lista
      let retries = 0;
      while ((!globalWallet || !globalWallet.publicKey) && retries < 30) {
        console.log(`[STARTUP][WALLET] Esperando a que globalWallet esté lista... intento ${retries+1}`);
        if (typeof globalWallet === 'undefined') {
          console.log(`[STARTUP][WALLET] globalWallet es undefined`);
        } else if (!globalWallet) {
          console.log(`[STARTUP][WALLET] globalWallet es null o falsy`);
        } else if (!globalWallet.publicKey) {
          console.log(`[STARTUP][WALLET] globalWallet existe pero no tiene publicKey`);
        }
        await new Promise(res => setTimeout(res, 500));
        retries++;
      }
      if (!globalWallet || !globalWallet.publicKey) {
        console.warn('[STARTUP][WALLET] Advertencia: globalWallet no está lista tras esperar. El endpoint /utxo-balance/global podría fallar.');
      } else {
        console.log(`[STARTUP][WALLET] globalWallet lista tras ${retries} intentos. publicKey: ${globalWallet.publicKey}`);
      }
    } else {
      console.log(`[STARTUP][WALLET] globalWallet ya estaba lista. publicKey: ${globalWallet && globalWallet.publicKey}`);
    }
    // Esperar a que la blockchain esté inicializada (bc.chain)
    if (!bc || !bc.chain || bc.chain.length === 0) {
      let retries = 0;
      while ((!bc || !bc.chain || bc.chain.length === 0) && retries < 30) {
        console.log(`[STARTUP][CHAIN] Esperando a que la blockchain esté lista... intento ${retries+1}`);
        if (!bc) {
          console.log(`[STARTUP][CHAIN] bc es undefined o null`);
        } else if (!bc.chain) {
          console.log(`[STARTUP][CHAIN] bc existe pero bc.chain es undefined o null`);
        } else if (bc.chain.length === 0) {
          console.log(`[STARTUP][CHAIN] bc.chain existe pero está vacío`);
        }
        await new Promise(res => setTimeout(res, 500));
        retries++;
      }
      if (!bc || !bc.chain || bc.chain.length === 0) {
        console.warn('[STARTUP][CHAIN] Advertencia: Blockchain no está lista tras esperar.');
      } else {
        console.log(`[STARTUP][CHAIN] Blockchain lista tras ${retries} intentos. Longitud: ${bc.chain.length}`);
      }
    } else {
      console.log(`[STARTUP][CHAIN] Blockchain ya estaba lista. Longitud: ${bc.chain && bc.chain.length}`);
    }
    console.log('[STARTUP] Iniciando server.listen y p2pServer.listen...');
    server.listen(HTTP_PORT, () => {
      console.log(
        `Server HTTP is running on port ${HTTP_PORT} [${NODE_NAME}] (${process.env.NODE_ENV})`
      );
    });
    p2pServer.listen(server);
    console.log('[STARTUP] Servidor HTTP y P2P inicializados correctamente.');
  } catch (err) {
    console.error('[STARTUP] Error al iniciar el servidor:', err);
    process.exit(1);
  }
}
startServerWhenReady();

// Middleware de manejo de errores global - siempre devuelve JSON
app.use((err, req, res, next) => {
  // Log the error server-side
  console.error(err && err.stack ? err.stack : err);

  // Determine status code (allow custom errs to set err.status)
  const status = err && err.status ? err.status : 500;

  // Standard JSON error payload
  const payload = {
    success: false,
    error: err && err.message ? err.message : "Internal Server Error",
  };

  // In non-production include details/stack to help debugging in UI when appropriate
  if (process.env.NODE_ENV !== "production") {
    payload.details = err && err.stack ? err.stack : undefined;
  }

  // Ensure JSON response
  res.status(status).json(payload);
});

// Manejo de se\u00f1ales para cierre limpio del servidor
process.on('SIGTERM', async () => {
  console.log('\ud83d\udea8 SIGTERM recibido. Cerrando servidor...');
  await p2pServer.closeUPnP();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\ud83d\udea8 SIGINT recibido. Cerrando servidor...');
  await p2pServer.closeUPnP();
  process.exit(0);
});
      