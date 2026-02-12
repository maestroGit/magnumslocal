// app/routes/denominacionOrigenRoutes.js
// Rutas para denominaciones de origen

import express from 'express';
import {
  createDO,
  getDOs,
  getDOById,
  updateDO,
  deleteDO,
  addVariedadToDO,
  addTipoToDO,
  addBodegaToDO
} from '../controllers/denominacionOrigenController.js';

const router = express.Router();

router.post('/', createDO);
router.get('/', getDOs);
router.get('/:id', getDOById);
router.put('/:id', updateDO);
router.delete('/:id', deleteDO);

router.post('/:id/variedades', addVariedadToDO);
router.post('/:id/tipos', addTipoToDO);
router.post('/:id/bodegas', addBodegaToDO);

export default router;
