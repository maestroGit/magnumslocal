// ============================================================================
// SERVER.JS - SERVIDOR HTTP PRINCIPAL DE MAGNUMSLOCAL
// ============================================================================
// Estado: en refactor activo
// Progreso refactorización:
//   ✅ FASE 1: Auth Routes
//   ✅ FASE 2: Mining Routes
//   ✅ FASE 3: Transaction Routes
//   ✅ FASE 4: Wallet/Crypto/Startup services
//   ✅ FASE 5: Logs y Dev Tools
//   🔄 FASE 6: Limpieza final
// ============================================================================

// ============================================================================
// SECCIÓN 1: IMPORTS Y DEPENDENCIAS
// ============================================================================
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
import rateLimit from "express-rate-limit";
import cors from "cors";
// Este archivo contiene varios endpoints y funcionalidades que permiten interactuar con una blockchain a través de HTTP
// las llaves {} son necesarias cuando el módulo exporta múltiples valores y deseas importar uno o varios de esos valores específicos.
// Si el módulo exporta un solo valor por defecto, no se utilizan las llaves.
import { Blockchain } from "./src/blockchain.js"; // Clase Blockchain que gestiona la cadena de bloques
import { P2PServer } from "./app/p2pServer.js"; // Servidor P2P para comunicación entre nodos
import { Wallet } from "./wallet/wallet.js"; // Clase Wallet que gestiona claves y firma
import { TransactionsPool } from "./wallet/transactionsPool.js"; // Clase TransactionsPool para gestionar la mempool
import { Miner } from "./app/miner.js"; // Clase Miner para minar bloques
import { INITIAL_BALANCE } from "./config/constantConfig.js"; // Valor inicial deseado para la wallet
import { generateKeystore } from "./app/walletCrypto.js";
import { UTXOManager } from "./src/utxomanager.js";
import loteRoutes from './app/routes/loteRoutes.js';
import blockchainRoutes from './app/routes/blockchainRoutes.js';
import createLogRouter from './app/routes/logRoutes.js';
import { decryptPrivateKeyFromKeystore } from './app/services/walletCryptoService.js';
import { ensureWalletOnStartup } from './app/services/walletLoaderService.js';
import { startServerWhenReady } from './app/services/serverStartupService.js';
import { initLogCapture } from './app/services/logService.js';
import tokenRoutes from './app/routes/tokenRoutes.js';
import walletRoutes from './app/routes/walletRoutes.js';
import miningRoutes from './app/routes/miningRoutes.js';
import transactionRoutes from './app/routes/transactionRoutes.js';
import utxoRoutes from './app/routes/utxoRoutes.js';
import addressHistoryRoutes from './app/routes/addressHistoryRoutes.js';
import systemRoutes from './app/routes/systemRoutes.js';

// ============================================================================
// SECCIÓN 2: CONFIGURACIÓN GLOBAL Y CONSTANTES
// ============================================================================
const isProduction = process.env.NODE_ENV === "production";
const app = express();
app.set("trust proxy", isProduction ? 1 : false); // Solo activar trust proxy en producción
const HTTP_PORT = process.env.HTTP_PORT || 6001;
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// SECCIÓN 3: CONFIGURACIÓN DE PASSPORT Y OAUTH2
// ============================================================================
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
// ============================================================================
// SECCIÓN 4: SISTEMA DE LOGS Y MONITOREO
// ============================================================================
// --- ENDPOINT PARA VER LOGS DEL PROCESO EN EL NAVEGADOR ---
// (Debe ir después de la inicialización de 'app')
const logStore = initLogCapture({ historySize: 500 });
global.logStore = logStore;
// --- IMPORTS Y CONFIGURACIÓN INICIAL ---
console.log("[BOOT] Iniciando imports...");
// ...existing code...
console.log("[BOOT] Imports y variables globales listos.");

// ============================================================================
// SECCIÓN 5: CONFIGURACIÓN DE SEGURIDAD (HELMET, CORS, RATE LIMITING)
// ============================================================================

// --- CONFIGURACIÓN DE SEGURIDAD POR ENTORNO ---
const PROD_API = process.env.PROD_API || "https://app.blockswine.com";

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

// ============================================================================
// SECCIÓN 6: INICIALIZACIÓN BLOCKCHAIN Y UTXO MANAGER
// ============================================================================

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

// ============================================================================
// SECCIÓN 7: GESTIÓN DE WALLET GLOBAL Y CIFRADO
// ============================================================================

// Declarar la wallet global en memoria
let globalWallet = null;
global.globalWallet = globalWallet;
global.bc = bc;
console.log("[INIT] Estado inicial de globalWallet:", globalWallet);

// Variable global para almacenar el keystore del servidor
let serverKeystore = null;
global.serverKeystore = serverKeystore; // Exponer para transactionController
global.decryptPrivateKeyFromKeystore = decryptPrivateKeyFromKeystore;


// ============================================================================
// SECCIÓN 8: CARGA AUTOMÁTICA DE WALLET AL INICIAR
// ============================================================================


// --- Carga automática de wallet global al arrancar el backend ---
const NODE_NAME = process.env.NODE_NAME || "Default_Node";
const walletPath = path.join(__dirname, "./app/uploads/wallet_default.json");

// Passphrase por defecto para arranque automático (ajusta según tu flujo)
const DEFAULT_WALLET_PASSPHRASE = process.env.DEFAULT_WALLET_PASSPHRASE || "javi";

// Cargar o generar wallet global al arrancar
const walletReadyPromise = (async () => {
  try {
    const { wallet, serverKeystore: loadedKeystore } = await ensureWalletOnStartup({
      walletPath,
      defaultPassphrase: DEFAULT_WALLET_PASSPHRASE,
      Wallet,
      INITIAL_BALANCE,
      decryptPrivateKeyFromKeystore,
      generateKeystore,
    });

    if (loadedKeystore) {
      serverKeystore = loadedKeystore;
      global.serverKeystore = serverKeystore;
    }

    if (wallet) {
      globalWallet = wallet;
      global.globalWallet = globalWallet;
      global.wallet = globalWallet;
      if (typeof global.globalWallet === 'undefined' || !global.globalWallet || !global.globalWallet.publicKey) {
        global.globalWallet = globalWallet;
      }
      console.log('[INIT] Wallet global cargada automaticamente al arrancar el backend');
      console.log('[INIT] Wallet publicKey:', wallet.publicKey);
      
      // Update miner with loaded wallet
      if (!(process.env.NODE_ENV === 'test' || process.env.NO_P2P === 'true')) {
        if (global.miner) {
          global.miner.wallet = wallet;
          console.log('[INIT] Miner wallet actualizada con wallet global descifrada');
        }
      }
    }

    syncUTXOManagerWithBlockchain();
    return globalWallet;
  } catch (e) {
    console.error('[INIT] Error cargando wallet global al arrancar:', e);
    return null;
  }
})();

// ============================================================================
// SECCIÓN 9: INICIALIZACIÓN P2P Y MINER
// ============================================================================

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

global.p2pServer = p2pServer;
global.miner = miner;

// ============================================================================
// SECCIÓN 11: REGISTRO DE ROUTERS MODULARES Y ENDPOINTS
// ============================================================================

// --- REGISTRAR ROUTERS MODULARES ---
// ✅ Auth routes (OAuth Google) - MIGRADO FASE 1
app.use('/', authRoutes);

// ✅ Token routes (baja-token) - MIGRADO
app.use('/token', tokenRoutes);

// ✅ Wallet routes - MIGRADO (GET /wallet/balance, POST /wallet/address-balance)
app.use('/wallet', walletRoutes);

// --- Montar routers modulares ---
// Frontend static pages (MUST be before app.use('/', systemRoutes))
app.get("/view", (req, res) => {
  const viewPath = path.join(__dirname, "public", "view.html");
  res.sendFile(viewPath);
});

app.get("/", (req, res) => {
  const viewPath = path.join(__dirname, "public", "view.html");
  res.sendFile(viewPath);
});

// ✅ UTXO routes - MIGRADO
app.use('/utxo-balance', utxoRoutes);
// ✅ Address History routes - MIGRADO
app.use('/address-history', addressHistoryRoutes);
// ✅ System routes - MIGRADO
app.use('/', systemRoutes);
// ✅ Lote routes (QR, Lotes, Propietario) - MIGRADO GRUPO 3
app.use('/', loteRoutes);
// ✅ Mining routes - MIGRADO FASE 2
app.use('/', miningRoutes);
// ✅ Logs route - MIGRADO
app.use('/', createLogRouter(logStore));

// ===================
// === ADMIN ENDPOINTS (AHORA EN ROUTER MODULAR) ===
// ===================

// ✅ Admin routes - MIGRADO
app.use('/admin', adminRoutes);
// ✅ Blockchain routes - MIGRADO
app.use('/', blockchainRoutes);

// ✅ Transaction routes - MIGRADO FASE 3
app.use('/', transactionRoutes);

// ============================================================================
// SECCIÓN 12: NOTAS DE MIGRACION
// ============================================================================
// /transactionsPool -> transactionRoutes
// /transaction -> transactionRoutes
// /wallet/* -> walletRoutes
// /mine, /mine-transactions -> miningRoutes
// /directory-contents -> systemRoutes
// /logs -> logRoutes

// ============================================================================
// SECCIÓN 13: INICIO DEL SERVIDOR Y MANEJO DE ERRORES
// ============================================================================

// --- INICIO DIFERIDO DEL SERVIDOR: Esperar a que la wallet global y la blockchain estén listas ---
(async () => {
  await walletReadyPromise;
  startServerWhenReady({
    server,
    HTTP_PORT,
    NODE_NAME,
    p2pServer,
    getGlobalWallet: () => global.globalWallet || global.wallet,
    getBlockchain: () => bc,
  });
})();

// ============================================================================
// SECCIÓN 17: MIDDLEWARE DE ERRORES Y SIGNALS
// ============================================================================

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
      