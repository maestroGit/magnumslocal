// app/routes/utxoRoutes.js
import express from 'express';
import { getGlobalUTXOBalance, getUTXOBalanceByAddress } from '../controllers/utxoController.js';

const router = express.Router();

router.get('/global', getGlobalUTXOBalance);
router.get('/:address', getUTXOBalanceByAddress);

export default router;
