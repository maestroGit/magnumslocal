// app/routes/utxoRoutes.js
import express from 'express';
import { getGlobalUTXOBalance, getUTXOBalanceByAddress } from '../controllers/utxoController.js';
import {
	requireAuth,
	requireRole,
	requireGlobalWalletOwnership,
} from '../middlewares/walletOwnershipMiddleware.js';

const router = express.Router();

// Alias para compatibilidad legacy: /utxo-balance/global
router.get('/global', requireAuth, requireRole('admin', 'winery'), requireGlobalWalletOwnership, getGlobalUTXOBalance);
router.get('/:address', getUTXOBalanceByAddress);

export default router;
