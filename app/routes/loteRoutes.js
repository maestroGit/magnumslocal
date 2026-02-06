// app/routes/loteRoutes.js
import express from 'express';
import {
  generateQR,
  generateQRWithProof,
  createLote,
  verifyQRProof,
  getLoteById,
  getPropietario
} from '../controllers/loteController.js';

const router = express.Router();


router.post('/qr', generateQR);
router.post('/qr-with-proof', generateQRWithProof);
router.post('/lotes', createLote);
router.post('/verify-qr-proof', verifyQRProof);
router.get('/lotes/:loteId', getLoteById);
router.get('/propietario/:ownerPublicKey', getPropietario);

export default router;