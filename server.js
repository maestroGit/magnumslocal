// ============================================================================
// SERVER.JS - SERVIDOR HTTP PRINCIPAL DE MAGNUMSLOCAL
// ============================================================================
// 
// ARQUITECTURA MODULAR (Refactor completado):
//
// CONTROLLERS (app/controllers/):
//   - authController.js       → Lógica OAuth2 Google
//   - miningController.js     → POST /mine, POST /mine-transactions
//   - transactionController.js → POST /transaction, GET /transactionsPool
//   - walletController.js     → GET /wallet/*, POST /wallet/address-balance
//
// ROUTES (app/routes/):
//   - authRoutes.js           → /auth/google, /auth/google/callback, /logout
//   - miningRoutes.js         → /mine, /mine-transactions, /mempool
//   - transactionRoutes.js    → /transaction, /transactionsPool
//   - walletRoutes.js         → /wallet/balance, /wallet/global, /wallet/address-balance
//   - tokenRoutes.js          → /token/baja-token
//   - utxoRoutes.js           → /utxo-balance/*, /utxos/*
//   - addressHistoryRoutes.js → /address-history/*
//   - loteRoutes.js           → /qr/*, /lotes/*, /propietario
//   - blockchainRoutes.js     → /blocks, /replace-chain
//   - systemRoutes.js         → /directory-contents, /peers
//   - logRoutes.js            → /logs
//   - adminRoutes.js          → /admin/*
//
// SERVICES (app/services/):
//   - walletCryptoService.js    → Decrypt keystore (PBKDF2 + AES-GCM)
//   - walletLoaderService.js    → Wallet startup loader (ensureWalletOnStartup)
//   - serverStartupService.js   → Server readiness check (startServerWhenReady)
//   - logService.js             → Log capture con circular buffer
//
// PROGRESO REFACTORIZACIÓN:
//   ✅ FASE 1: Auth Routes
//   ✅ FASE 2: Mining Routes
//   ✅ FASE 3: Transaction Routes
//   ✅ FASE 4: Wallet/Crypto/Startup services
//   ✅ FASE 5: Logs y Dev Tools
//   ✅ FASE 6: Limpieza final
//
// Estado: Refactor completado - Servidor modular y mantenible
// ============================================================================

// ============================================================================
// SECCIÓN 1: IMPORTS Y DEPENDENCIAS
// ============================================================================
// Importación de routers modulares, servicios, y dependencias core.
// Estructura organizada: rutas → servicios → utilidades → frameworks.
// Importaciones de frameworks y core libraries
import dotenv from "dotenv";
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

// Importaciones de clases blockchain core
import { Blockchain } from "./src/blockchain.js";
import { P2PServer } from "./app/p2pServer.js";
import { Wallet } from "./wallet/wallet.js";
import { TransactionsPool } from "./wallet/transactionsPool.js";
import { Miner } from "./app/miner.js";
import { INITIAL_BALANCE } from "./config/constantConfig.js";
import { generateKeystore } from "./app/walletCrypto.js";
import { UTXOManager } from "./src/utxomanager.js";

// Importaciones de servicios
import { decryptPrivateKeyFromKeystore } from './app/services/walletCryptoService.js';
import { ensureWalletOnStartup } from './app/services/walletLoaderService.js';
import { startServerWhenReady } from './app/services/serverStartupService.js';
import { initLogCapture } from './app/services/logService.js';

// Importaciones de modelos ORM
import User from './app/models/User.js';

// Importaciones de routers modulares
import adminRoutes from './app/routes/adminRoutes.js';
import authRoutes from './app/routes/authRoutes.js';
import loteRoutes from './app/routes/loteRoutes.js';
import blockchainRoutes from './app/routes/blockchainRoutes.js';
import createLogRouter from './app/routes/logRoutes.js';
import tokenRoutes from './app/routes/tokenRoutes.js';
import walletRoutes from './app/routes/walletRoutes.js';
import miningRoutes from './app/routes/miningRoutes.js';
import transactionRoutes from './app/routes/transactionRoutes.js';
import utxoRoutes from './app/routes/utxoRoutes.js';
import addressHistoryRoutes from './app/routes/addressHistoryRoutes.js';
import systemRoutes from './app/routes/systemRoutes.js';
import userRoutes from './app/routes/userRoutes.js';
import denominacionOrigenRoutes from './app/routes/denominacionOrigenRoutes.js';
import variedadRoutes from './app/routes/variedadRoutes.js';
import tipoVinoRoutes from './app/routes/tipoVinoRoutes.js';

// Configurar variables de entorno antes que todo
// En desarrollo: carga .env o .env.local
// En producción: intenta cargar .env.production (si existe) o usa variables del OS
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
if (process.env.NODE_ENV !== 'production') {
  // Solo en dev: intenta cargar explícitamente
  dotenv.config({ path: envFile });
  console.log(`[BOOT] Cargando variables de entorno desde: ${envFile}`);
} else {
  // En prod: si el archivo existe, cargarlo; si no, usa variables del OS
  try {
    dotenv.config({ path: envFile });
    console.log(`[BOOT] Cargando variables de entorno desde: ${envFile}`);
  } catch (err) {
    console.log(`[BOOT] .env.production no encontrado, usando variables del OS`);
  }
}
console.log("[BOOT] Iniciando servidor modular (Refactor completado)...");
console.log("[BOOT] Variables de entorno cargadas. NODE_ENV:", process.env.NODE_ENV);

// ============================================================================
// SECCIÓN 2: CONFIGURACIÓN GLOBAL Y CONSTANTES
// ============================================================================
// Configuración base del servidor Express y constantes de entorno.
// - isProduction: determina configuraciones de seguridad
// - HTTP_PORT: puerto del servidor (default 6001)
// - __dirname: directorio raíz para resolución de paths
const isProduction = process.env.NODE_ENV === "production";
const app = express();
app.set("trust proxy", isProduction ? 1 : false); // Solo activar trust proxy en producción
const HTTP_PORT = process.env.HTTP_PORT || 6001;
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Wallet global disponible en todos los controladores y módulos
global.Wallet = Wallet;
// __dirname global para uso en controladores
global.__dirname = __dirname;

// ============================================================================
// SECCIÓN 3: CONFIGURACIÓN DE PASSPORT Y OAUTH2
// ============================================================================
// Configuración de autenticación OAuth2 con Google.
// - Strategy: passport-google-oauth20
// - Session storage: express-session con secret desde env
// - Callbacks: serialización/deserialización de usuario
// Ver app/controllers/authController.js para la lógica de autenticación.
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback";
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Extraer datos del perfil de Google
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const nombre = profile.displayName;
    const googlePhotoUrl = profile.photos?.[0]?.value;

    if (!email) {
      return done(new Error('Email no disponible en perfil de Google'));
    }

    // Buscar o crear usuario en BD
    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        id: `google_${googleId}`,
        provider: 'google',
        nombre: nombre || 'Usuario Google',
        email: email,
        email_verified: true, // Google verifica emails
        usercard_img: googlePhotoUrl, // Guardar foto de Google
        registrado: true,
        fecha_registro: new Date(),
        role: 'user'
      }
    });

    // Si el usuario ya existía pero no tiene usercard_img, actualizar con foto de Google
    if (!created && googlePhotoUrl && !user.usercard_img) {
      await user.update({ usercard_img: googlePhotoUrl });
      console.log(`[AUTH] Foto de Google agregada a usuario: ${user.email}`);
    }

    console.log(`[AUTH] Usuario Google ${created ? 'creado' : 'existente'}: ${user.id}`);
    return done(null, user);
  } catch (error) {
    console.error('[AUTH] Error en Google Strategy callback:', error);
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.use(session({
  secret: process.env.JWT_SECRET || "blockswine_secret",
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

const ensureUserSocialColumns = async () => {
  try {
    await User.sequelize.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS social_x VARCHAR(300),
      ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(300),
      ADD COLUMN IF NOT EXISTS social_youtube VARCHAR(300)
    `);
    console.log('[DATABASE] ✅ Columnas sociales verificadas en usuarios (social_x, social_instagram, social_youtube)');
  } catch (error) {
    console.error('[DATABASE] ⚠️ No se pudieron verificar/crear columnas sociales en usuarios:', error.message);
  }
};

ensureUserSocialColumns();
// ============================================================================
// SECCIÓN 4: SISTEMA DE LOGS Y MONITOREO
// ============================================================================
// Sistema de captura de logs con circular buffer (500 líneas).
// - logStore: almacena stdout/stderr en memoria
// - global.logStore: accesible desde routers para endpoint /logs
// Ver app/services/logService.js y app/routes/logRoutes.js
const logStore = initLogCapture({ historySize: 500 });
global.logStore = logStore;

console.log("[BOOT] Imports y routers modulares cargados correctamente.");

// ============================================================================
// SECCIÓN 5: CONFIGURACIÓN DE SEGURIDAD (HELMET, CORS, RATE LIMITING)
// ============================================================================
// Middlewares de seguridad para producción y desarrollo:
// - Helmet: CSP, protección headers
// - CORS: whitelist dinámica (localhost + app.blockswine.com)
// - Rate Limiting: 100 req/15min por IP
// - Static files: public/ y app/uploads/ servidos con cache
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
          "https:",
          PROD_API,
          "https://developers.google.com",
          "https://*.googleusercontent.com"
        ],
      },
    },
  })
);

// CORS: whitelist dinámica por entorno (localhost en dev, blockswine.com en prod)
// Permite:
// - localhost:XXXX (dev local)
// - *.blockswine.com (prod / staging)
// - undefined (same-origin requests)
const allowedPattern = /^(http:\/\/localhost(:\d+)?|https?:\/\/([a-zA-Z0-9-]+\.)?blockswine\.com)$/;
const corsOptions = {
  origin: function (origin, callback) {
    const isAllowed = !origin || allowedPattern.test(origin);
    console.log("[CORS] Origin recibido:", origin || "(undefined - same-origin)");
    console.log("[CORS] Regex test:", isAllowed);
    if (isAllowed) {
      callback(null, true);
    } else {
      console.error("[CORS] DENIED -", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 3600,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "32kb" }));

const isGoogleProfileIncomplete = (user) => {
  if (!user || user.provider !== 'google') return false;

  const hasRole = ['user', 'winery', 'admin'].includes(user.role);
  const hasCity = typeof user.localizacion_direccion === 'string' && user.localizacion_direccion.trim().length > 0;
  const hasLat = user.localizacion_lat !== null && user.localizacion_lat !== undefined;
  const hasLng = user.localizacion_lng !== null && user.localizacion_lng !== undefined;

  return !(hasRole && hasCity && hasLat && hasLng);
};

const PUBLIC_HTML_PATHS = new Set([
  '/login.html',
  '/register.html',
  '/complete-profile.html'
]);

const normalizeHtmlPath = (requestPath) => {
  if (requestPath === '/' || requestPath === '/view') return '/view.html';
  return requestPath;
};

app.use(async (req, res, next) => {
  try {
    if (req.method !== 'GET') return next();

    const normalizedPath = normalizeHtmlPath(req.path);
    const isHtmlLikeRoute = normalizedPath.endsWith('.html');

    if (!isHtmlLikeRoute) return next();
    if (PUBLIC_HTML_PATHS.has(normalizedPath)) return next();

    const isAuthenticated = (req.isAuthenticated && req.isAuthenticated()) || !!req.session?.user;
    if (!isAuthenticated) {
      return res.redirect('/login.html');
    }

    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.redirect('/login.html');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.redirect('/login.html');
    }

    if (isGoogleProfileIncomplete(user)) {
      return res.redirect('/complete-profile.html');
    }

    return next();
  } catch (error) {
    console.error('[AUTH][GUARD] Error en middleware global de perfil:', error);
    return res.redirect('/login.html');
  }
});

// Static files: public/ y app/uploads/ con Content-Type correcto para ESM
app.use("/js", (req, res, next) => {
  if (req.path.endsWith(".js")) {
    res.type("application/javascript");
  }
  next();
});
app.use(express.static(path.join(__dirname, "./public")));
app.use("/uploads", express.static(path.join(__dirname, "app", "uploads")));
console.log("[BOOT] Express inicializado. Definiendo endpoints...");

// Rate limiting: 100 peticiones por 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = String(req.ip || req.connection?.remoteAddress || '').toLowerCase();
    const origin = String(req.headers.origin || '').toLowerCase();

    const isLoopbackIp =
      ip.includes('127.0.0.1') ||
      ip.includes('::1') ||
      ip.includes('::ffff:127.0.0.1');

    const isLocalOrigin =
      !origin ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1');

    // CartoLMM (y llamadas internas del propio host) no deben consumir rate limit.
    return isLoopbackIp && isLocalOrigin;
  }
});
app.use(limiter);

// ============================================================================
// SECCIÓN 6: INICIALIZACIÓN BLOCKCHAIN Y UTXO MANAGER
// ============================================================================
// Inicialización de la blockchain y el sistema UTXO.
// - bc: instancia de Blockchain (persistida en storage/data/)
// - utxoManager: gestor de UTXOs (Unspent Transaction Outputs)
// - syncUTXOManagerWithBlockchain(): reconstruye UTXO set desde la chain
// Ver src/blockchain.js y src/utxomanager.js

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
    // Mostrar resumen de UTXOs después de sincronizar
    const totalAddresses = Object.keys(utxoManager.utxoSet).length;
    const totalUtxos = Object.values(utxoManager.utxoSet).reduce((acc, arr) => acc + arr.length, 0);
    console.log(`[SYNC][DEBUG] utxoManager.utxoSet sinc: ${totalAddresses} dir, ${totalUtxos} UTXOs`);
    // Mostrar resumen por dirección
    Object.entries(utxoManager.utxoSet).forEach(([addr, utxos]) => {
      const balance = utxos.reduce((sum, u) => sum + u.amount, 0);
      const addrShort = addr.substring(0, 20) + '...';
      console.log(`  ${addrShort}: ${utxos.length} UTXOs, balance=${balance}`);
    });
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
// Variables globales para wallet y keystore del servidor.
// - globalWallet: instancia de Wallet cargada al startup
// - serverKeystore: keystore cifrado (PBKDF2 + AES-GCM)
// - global.decryptPrivateKeyFromKeystore: función de decrypt expuesta
// Carga automática en SECCIÓN 8 con passphrase desde env
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
// Carga asíncrona de la wallet global al arrancar el servidor.
// - walletPath: app/uploads/wallet_default.json
// - DEFAULT_WALLET_PASSPHRASE: desde env o fallback "javi"
// - ensureWalletOnStartup(): carga o genera wallet con keystore cifrado
// - walletReadyPromise: promesa esperada antes de startServerWhenReady
// Ver app/services/walletLoaderService.js y app/services/walletCryptoService.js
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
// Inicialización del sistema P2P y minero.
// - tp: TransactionsPool (mempool de transacciones pendientes)
// - p2pServer: servidor WebSocket para sincronización entre nodos
// - miner: instancia de Miner para Proof-of-Work
// En modo test/NO_P2P: stubs para evitar sockets de red
// Ver app/p2pServer.js y app/miner.js

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
// SECCIÓN 10: REGISTRO DE ROUTERS MODULARES Y ENDPOINTS
// ============================================================================
// Montaje de routers modulares en la app Express.
// Orden de registro importante: páginas estáticas antes de catch-all routes.
// Cada router tiene su propio prefijo y maneja un dominio específico.
// Ver app/routes/* para implementación de cada router.
// ✅ Auth routes (OAuth Google) - MIGRADO FASE 1
app.use('/', authRoutes);

// ✅ Token routes (baja-token) - MIGRADO
app.use('/token', tokenRoutes);

// ✅ Wallet routes - MIGRADO (GET /wallet/balance, POST /wallet/address-balance)
app.use('/wallet', walletRoutes);

// ✅ User routes (PostgreSQL) - Gestión de usuarios
app.use('/users', userRoutes);

// ✅ DO routes - Denominaciones de origen
app.use('/denominaciones', denominacionOrigenRoutes);
app.use('/variedades', variedadRoutes);
app.use('/tipos-vino', tipoVinoRoutes);

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
// SECCIÓN 11: ESTRUCTURA DE ENDPOINTS (POST-REFACTOR)
// ============================================================================
// Mapeo de endpoints principales a sus routers:
//
// AUTH & SECURITY:
//   /auth/google              → authRoutes (OAuth2 login)
//   /auth/google/callback     → authRoutes (OAuth2 callback)
//   /logout                   → authRoutes
//
// BLOCKCHAIN CORE:
//   /blocks                   → blockchainRoutes (GET chain)
//   /replace-chain            → blockchainRoutes (POST sync)
//
// MINING & TRANSACTIONS:
//   /mine                     → miningRoutes (POST manual mine)
//   /mine-transactions        → miningRoutes (POST legacy mine)
//   /mempool                  → miningRoutes (GET mempool state)
//   /transaction              → transactionRoutes (POST create tx)
//   /transactionsPool         → transactionRoutes (GET pending txs)
//
// WALLET & BALANCE:
//   /wallet/balance           → walletRoutes (GET wallet balance)
//   /wallet/global            → walletRoutes (GET server wallet)
//   /wallet/address-balance   → walletRoutes (POST custom address)
//   /utxo-balance/*           → utxoRoutes (GET UTXO balance)
//   /utxos/*                  → utxoRoutes (GET UTXOs detail)
//   /address-history/*        → addressHistoryRoutes (GET tx history)
//
// TOKENS & LOTES:
//   /token/baja-token         → tokenRoutes (POST burn token)
//   /qr/*                     → loteRoutes (GET QR codes)
//   /lotes/*                  → loteRoutes (GET/POST lotes)
//   /propietario              → loteRoutes (GET owner info)
//
// SYSTEM & MONITORING:
//   /logs                     → logRoutes (GET server logs)
//   /directory-contents       → systemRoutes (GET file tree)
//   /peers                    → systemRoutes (GET P2P peers)
//   /admin/*                  → adminRoutes (Admin panel)
//
// FRONTEND:
//   /                         → view.html (static)
//   /view                     → view.html (static)

// ============================================================================
// SECCIÓN 12: INICIO DEL SERVIDOR Y MANEJO DE ERRORES
// ============================================================================
// Startup diferido: espera a que wallet y blockchain estén listas.
// - await walletReadyPromise: asegura wallet cargada antes de listen()
// - startServerWhenReady: polling de readiness (wallet.publicKey + blockchain)
// - server.listen(HTTP_PORT): inicia servidor HTTP
// - p2pServer.listen(server): inicia servidor WebSocket P2P
// Ver app/services/serverStartupService.js
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
// SECCIÓN 13: MIDDLEWARE DE ERRORES Y SIGNAL HANDLERS
// ============================================================================
// Error handling global y graceful shutdown.
// - Error middleware: catch-all que devuelve JSON con stack en dev
// - SIGTERM/SIGINT: cierre limpio cerrando UPnP y conexiones P2P
// Debe ser el último middleware registrado en la app
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
      