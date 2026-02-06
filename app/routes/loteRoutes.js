// app/routes/loteRoutes.js
import express from 'express';
import { generarQR } from '../controllers/loteController.js';

const router = express.Router();

router.post('/qr', generarQR);

export default router;
