// app/controllers/notificationController.js
import { Op } from 'sequelize';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

// GET /notifications?wineryId=xxx
export const getNotifications = async (req, res) => {
  try {
    const wineryId = String(req.query.wineryId || '').trim();

    if (!wineryId) {
      return res.status(400).json({
        success: false,
        error: 'Falta el parámetro wineryId',
      });
    }

    const winery = await User.findByPk(wineryId);
    if (!winery) {
      return res.status(404).json({
        success: false,
        error: 'No existe ninguna bodega con ese wineryId',
      });
    }

    const includeArchived = req.query.includeArchived === 'true';
    const whereClause = {
      winery_id: wineryId,
    };

    if (!includeArchived) {
      whereClause.is_active = true;
      const currentGenesisHash = global.bc?.chain?.[0]?.hash || null;
      if (currentGenesisHash) {
        whereClause[Op.or] = [
          { genesis_hash: currentGenesisHash },
          { genesis_hash: null }
        ];
      }
    }

    const notifications = await Notification.findAll({
      where: whereClause,
      order: [['fecha', 'DESC']],
    });

    return res.json({
      success: true,
      wineryId,
      winery: {
        id: winery.id,
        nombre: winery.nombre,
        email: winery.email,
      },
      count: notifications.length,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        wineryId: notification.winery_id,
        type: notification.type,
        genesisHash: notification.genesis_hash,
        isActive: notification.is_active,
        payload: notification.payload,
        read: notification.read,
        createdAt: notification.fecha,
      })),
    });
  } catch (error) {
    console.error('[NOTIFICATIONS][GET] Error obteniendo notificaciones:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo notificaciones',
      details: error.message,
    });
  }
};

// POST /notifications/mark-as-read
export const markNotificationsAsRead = async (req, res) => {
  try {
    const wineryId = String(req.body?.wineryId || req.query?.wineryId || '').trim();
    const notificationIds = Array.isArray(req.body?.notificationIds)
      ? req.body.notificationIds.filter((id) => Number.isInteger(Number(id))).map((id) => Number(id))
      : [];

    if (!wineryId) {
      return res.status(400).json({
        success: false,
        error: 'Falta el parámetro wineryId',
      });
    }

    if (notificationIds.length === 0) {
      await Notification.update(
        { read: true },
        {
          where: {
            winery_id: wineryId,
            read: false,
          },
        }
      );

      return res.json({
        success: true,
        wineryId,
        updated: 'all-unread',
      });
    }

    const [updatedCount] = await Notification.update(
      { read: true },
      {
        where: {
          id: {
            [Op.in]: notificationIds,
          },
          winery_id: wineryId,
        },
      }
    );

    return res.json({
      success: true,
      wineryId,
      updatedCount,
    });
  } catch (error) {
    console.error('[NOTIFICATIONS][READ] Error marcando notificaciones como leídas:', error);
    return res.status(500).json({
      success: false,
      error: 'Error marcando notificaciones como leídas',
      details: error.message,
    });
  }
};