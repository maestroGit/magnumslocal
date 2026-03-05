// ============================================================================
// TRANSACTION ROUTES
// ============================================================================
// Rutas para la gestión de transacciones
// - POST /transaction: Crear transacciones (usuario o bodega)
// - GET /transactionsPool: Ver mempool de transacciones pendientes
// ============================================================================

import express from 'express';
import { createTransaction, getTransactionsPool } from '../controllers/transactionController.js';
import {
	requireAuth,
	requireRole,
	requireGlobalWalletOwnershipForTransaction,
} from '../middlewares/walletOwnershipMiddleware.js';

const router = express.Router();

// ============================================================================
// GET /transactionsPool - Obtener todas las transacciones en la mempool
// ============================================================================
router.get('/transactionsPool', getTransactionsPool);

// ============================================================================
// POST /transaction - Crear y procesar transacción
// ============================================================================
// Acepta dos flujos:
// 1. FLUJO USUARIO: { signedTransaction: {...} }
// 2. FLUJO BODEGA: { mode: 'bodega', recipient, amount, passphrase, keystore? }
router.post('/transaction', requireAuth, requireRole('admin', 'winery', 'user'), requireGlobalWalletOwnershipForTransaction, createTransaction);

export default router;
