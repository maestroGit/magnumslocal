// app/routes/blockchainRoutes.js
import express from 'express';
import { getBlocks } from '../controllers/blockchainController.js';

const router = express.Router();

router.get('/blocks', getBlocks);

export default router;
