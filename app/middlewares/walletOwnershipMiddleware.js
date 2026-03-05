// app/middlewares/walletOwnershipMiddleware.js
// Guardas de autenticacion, rol y ownership para operativa con wallet global.

import { User, Wallet } from '../models/index.js';

const getSessionUserId = (req) => req.user?.id || req.session?.user?.id || null;

const getActiveGlobalWalletPublicKey = () => {
  const active = global.globalWallet?.publicKey || global.wallet?.publicKey || null;
  return typeof active === 'string' ? active.trim().toLowerCase() : null;
};

export const requireAuth = async (req, res, next) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Sesion invalida' });
    }

    req.authUser = user;
    return next();
  } catch (error) {
    console.error('[AUTHZ] Error en requireAuth:', error);
    return res.status(500).json({ success: false, error: 'Error validando autenticacion' });
  }
};

export const requireRole = (...roles) => {
  const normalizedRoles = roles.map((role) => String(role || '').toLowerCase());

  return (req, res, next) => {
    const role = String(req.authUser?.role || req.session?.user?.role || '').toLowerCase();
    if (!role || !normalizedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado. Rol requerido: ${normalizedRoles.join(', ')}`
      });
    }

    return next();
  };
};

export const requireGlobalWalletOwnership = async (req, res, next) => {
  try {
    const userId = req.authUser?.id || getSessionUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }

    const activePublicKey = getActiveGlobalWalletPublicKey();
    if (!activePublicKey) {
      return res.status(409).json({ success: false, error: 'No hay wallet global activa' });
    }

    const ownedWallet = await Wallet.findOne({
      where: {
        usuario_id: userId,
        address: activePublicKey,
        status: 'active'
      }
    });

    if (!ownedWallet) {
      return res.status(403).json({
        success: false,
        error: 'La wallet global activa no pertenece al usuario logeado'
      });
    }

    req.activeGlobalWalletAddress = ownedWallet.address;
    return next();
  } catch (error) {
    console.error('[AUTHZ] Error en requireGlobalWalletOwnership:', error);
    return res.status(500).json({ success: false, error: 'Error validando ownership de wallet global' });
  }
};

// Para /transaction: solo exigir ownership cuando el flujo usa wallet global.
export const requireGlobalWalletOwnershipForTransaction = async (req, res, next) => {
  const hasSignedTransaction = !!req.body?.signedTransaction;
  if (hasSignedTransaction) {
    return next();
  }

  return requireGlobalWalletOwnership(req, res, next);
};
