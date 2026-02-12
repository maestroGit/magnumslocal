// app/routes/variedadRoutes.js
// Rutas para variedades

import express from 'express';
import {
  createVariedad,
  getVariedades,
  getVariedadById,
  updateVariedad,
  deleteVariedad
} from '../controllers/variedadController.js';

const router = express.Router();

router.post('/', createVariedad);
router.get('/', getVariedades);
router.get('/:id', getVariedadById);
router.put('/:id', updateVariedad);
router.delete('/:id', deleteVariedad);

export default router;
