// app/routes/loteRoutes.js
import express from 'express';
import {
  generarQRWithProof,
  crearLote,
  getLoteById,
  verifyQrProof
} from '../controllers/loteController.js';

const router = express.Router();

// router.post('/qr', generarQR); // REMOVED: No export 'generarQR' in controller
router.post('/qr-with-proof', generarQRWithProof);
router.post('/lotes', crearLote);
router.get('/lotes/:loteId', getLoteById);
router.post('/verify-qr-proof', verifyQrProof);

export default router;