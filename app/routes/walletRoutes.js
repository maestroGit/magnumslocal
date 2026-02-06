// app/routes/walletRoutes.js
import express from 'express';

import {
	loadGlobalWallet,
	generateWallet,
	getGlobalWallet,
	hardwareAddress,
	getPublicKey,
	addressBalance,
	getBalance,
} from '../controllers/walletController.js';

const router = express.Router();


// POST /wallet/load-global
router.post('/load-global', loadGlobalWallet);

// POST /wallet/generate
router.post('/generate', generateWallet);

// GET /wallet/global
router.get('/global', getGlobalWallet);

// POST /hardware-address
router.post('/hardware-address', hardwareAddress);

// GET /public-key
router.get('/public-key', getPublicKey);

// POST /address-balance
router.post('/address-balance', addressBalance);

// GET /balance
router.get('/balance', getBalance);

export default router;
