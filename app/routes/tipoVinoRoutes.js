// app/routes/tipoVinoRoutes.js
// Rutas para tipos de vino

import express from 'express';
import {
  createTipoVino,
  getTiposVino,
  getTipoVinoById,
  updateTipoVino,
  deleteTipoVino
} from '../controllers/tipoVinoController.js';

const router = express.Router();

router.post('/', createTipoVino);
router.get('/', getTiposVino);
router.get('/:id', getTipoVinoById);
router.put('/:id', updateTipoVino);
router.delete('/:id', deleteTipoVino);

export default router;
