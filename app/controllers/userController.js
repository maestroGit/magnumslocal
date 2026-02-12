// app/controllers/userController.js
// Controlador para gestión de usuarios PostgreSQL

import { User, Wallet } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * POST /users - Crear nuevo usuario
 */
export const createUser = async (req, res) => {
  try {
    const userData = req.body;
    
    // Validaciones básicas
    if (!userData.id || !userData.provider || !userData.nombre || !userData.email) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: id, provider, nombre, email'
      });
    }

    if (userData.provider === 'email' && !userData.password) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña es requerida para registros con email'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findByPk(userData.id);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'El usuario ya existe',
        userId: userData.id
      });
    }

    // Crear usuario
    const { password, ...safeUserData } = userData;
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : null;

    const newUser = await User.create({
      ...safeUserData,
      password_hash: passwordHash,
      registrado: true,
      fecha_registro: userData.fecha_registro || new Date()
    });

    const userResponse = newUser.toJSON();
    delete userResponse.password_hash;

    console.log('[USER] Usuario creado:', newUser.id);
    return res.status(201).json({
      success: true,
      data: userResponse,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    console.error('[USER] Error creando usuario:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error al crear usuario',
      details: error.message
    });
  }
};

/**
 * GET /users/:id - Obtener usuario por ID
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const includeWallets = req.query.includeWallets === 'true';

    const options = {
      where: { id }
    };

    if (includeWallets) {
      options.include = [{
        model: Wallet,
        as: 'wallets'
      }];
    }

    const user = await User.findOne(options);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[USER] Error obteniendo usuario:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener usuario',
      details: error.message
    });
  }
};

/**
 * GET /users - Listar usuarios con filtros
 */
export const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      provider,
      kyc_status,
      subscription_status,
      badges,
      search,
      includeWallets
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Filtros
    if (role) where.role = role;
    if (provider) where.provider = provider;
    if (kyc_status) where.kyc_status = kyc_status;
    if (subscription_status) where.subscription_status = subscription_status;
    if (badges) {
      const badgesArray = badges
        .split(',')
        .map((badge) => badge.trim())
        .filter(Boolean);
      if (badgesArray.length > 0) {
        where.badges = { [Op.contains]: badgesArray };
      }
    }

    // Búsqueda por nombre o email
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const options = {
      where,
      limit: parseInt(limit),
      offset,
      order: [['fecha_registro', 'DESC']]
    };

    if (includeWallets === 'true') {
      options.include = [{
        model: Wallet,
        as: 'wallets'
      }];
    }

    const { count, rows } = await User.findAndCountAll(options);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[USER] Error listando usuarios:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al listar usuarios',
      details: error.message
    });
  }
};

/**
 * PUT /users/:id - Actualizar usuario
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // No permitir actualizar campos sensibles directamente
    delete updateData.id;
    delete updateData.email; // Solo via endpoint específico de verificación

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    await user.update(updateData);

    console.log('[USER] Usuario actualizado:', id);
    return res.json({
      success: true,
      data: user,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    console.error('[USER] Error actualizando usuario:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario',
      details: error.message
    });
  }
};

/**
 * DELETE /users/:id - Eliminar usuario (soft delete preferido)
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard = false } = req.query;

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (hard === 'true') {
      // Hard delete: eliminar completamente
      await user.destroy();
      console.log('[USER] Usuario eliminado (hard delete):', id);
    } else {
      // Soft delete: marcar como inactivo
      await user.update({
        registrado: false,
        subscription_status: 'inactive',
        blockchain_active: false
      });
      console.log('[USER] Usuario desactivado (soft delete):', id);
    }

    return res.json({
      success: true,
      message: hard === 'true' ? 'Usuario eliminado' : 'Usuario desactivado'
    });
  } catch (error) {
    console.error('[USER] Error eliminando usuario:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario',
      details: error.message
    });
  }
};

/**
 * POST /users/:id/wallets - Vincular wallet a usuario
 */
export const addWalletToUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { address, type = 'internal', status = 'active' } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'La dirección de wallet es requerida'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si la wallet ya existe
    const existingWallet = await Wallet.findOne({ where: { address } });
    if (existingWallet) {
      return res.status(409).json({
        success: false,
        error: 'Esta wallet ya está registrada'
      });
    }

    // Crear wallet
    const wallet = await Wallet.create({
      id: `w_${Date.now()}`,
      address,
      status,
      type,
      usuario_id: id,
      fecha_vinculacion: new Date()
    });

    console.log('[USER] Wallet vinculada:', wallet.address, 'a usuario:', id);
    return res.status(201).json({
      success: true,
      data: wallet,
      message: 'Wallet vinculada exitosamente'
    });
  } catch (error) {
    console.error('[USER] Error vinculando wallet:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al vincular wallet',
      details: error.message
    });
  }
};

/**
 * PUT /users/:id/kyc - Actualizar estado KYC
 */
export const updateUserKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      kyc_status,
      kyc_doc_type,
      kyc_doc_id,
      kyc_doc_img
    } = req.body;

    if (!kyc_status) {
      return res.status(400).json({
        success: false,
        error: 'El estado KYC es requerido (none/pending/approved/rejected)'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    await user.update({
      kyc_status,
      kyc_date: new Date(),
      ...(kyc_doc_type && { kyc_doc_type }),
      ...(kyc_doc_id && { kyc_doc_id }),
      ...(kyc_doc_img && { kyc_doc_img })
    });

    console.log('[USER] KYC actualizado:', id, '→', kyc_status);
    return res.json({
      success: true,
      data: user,
      message: 'Estado KYC actualizado exitosamente'
    });
  } catch (error) {
    console.error('[USER] Error actualizando KYC:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar KYC',
      details: error.message
    });
  }
};

/**
 * GET /users/:id/wallets - Obtener wallets de un usuario
 */
export const getUserWallets = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [{
        model: Wallet,
        as: 'wallets'
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    return res.json({
      success: true,
      data: user.wallets || [],
      count: user.wallets?.length || 0
    });
  } catch (error) {
    console.error('[USER] Error obteniendo wallets:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener wallets',
      details: error.message
    });
  }
};

/**
 * GET /users/stats - Estadísticas generales
 */
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role']
    });
    
    const usersByKYC = await User.findAll({
      attributes: [
        'kyc_status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['kyc_status']
    });

    const activeSubscriptions = await User.count({
      where: { subscription_status: 'active' }
    });

    return res.json({
      success: true,
      data: {
        total: totalUsers,
        byRole: usersByRole,
        byKYC: usersByKYC,
        activeSubscriptions
      }
    });
  } catch (error) {
    console.error('[USER] Error obteniendo estadísticas:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
};
