// app/routes/addressHistoryRoutes.js
import express from 'express';
import { getAddressHistory } from '../controllers/addressHistoryController.js';

const router = express.Router();

// Modularizado: GET /address-history/:address
router.get('/:address', getAddressHistory);

export default router;
