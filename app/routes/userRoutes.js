// app/routes/userRoutes.js
// Rutas para gestión de usuarios PostgreSQL

import express from 'express';
import {
  createUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
  addWalletToUser,
  updateUserKYC,
  getUserWallets,
  getUserStats
} from '../controllers/userController.js';

const router = express.Router();

// === CRUD BÁSICO ===

// POST /users - Crear nuevo usuario
router.post('/', createUser);

// GET /users - Listar usuarios con filtros
// Query params: page, limit, role, provider, kyc_status, subscription_status, search, includeWallets
router.get('/', getUsers);

// GET /users/stats - Estadísticas generales
router.get('/stats', getUserStats);

// GET /users/:id - Obtener usuario por ID
// Query params: includeWallets
router.get('/:id', getUserById);

// PUT /users/:id - Actualizar usuario
router.put('/:id', updateUser);

// DELETE /users/:id - Eliminar/desactivar usuario
// Query params: hard (true/false)
router.delete('/:id', deleteUser);

// === GESTIÓN DE WALLETS ===

// GET /users/:id/wallets - Obtener wallets del usuario
router.get('/:id/wallets', getUserWallets);

// POST /users/:id/wallets - Vincular wallet a usuario
router.post('/:id/wallets', addWalletToUser);

// === GESTIÓN KYC ===

// PUT /users/:id/kyc - Actualizar estado KYC
router.put('/:id/kyc', updateUserKYC);

export default router;
