import express from 'express';
import { bajaToken } from '../controllers/tokenController.js';

const router = express.Router();

// POST /baja-token
router.post('/baja-token', bajaToken);

export default router;
