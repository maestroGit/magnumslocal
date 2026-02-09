// app/routes/miningRoutes.js
import express from 'express';
import { mineBlock, mineTransactionsLegacy } from '../controllers/miningController.js';

const router = express.Router();

// POST /mine - Endpoint principal para minado (retorna JSON)
router.post('/mine', mineBlock);

// POST /mine-transactions - Endpoint legacy (redirige a /blocks)
router.post('/mine-transactions', mineTransactionsLegacy);

export default router;
