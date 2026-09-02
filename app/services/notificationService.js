// app/services/notificationService.js
import Notification from '../models/Notification.js';

const BURN_PREFIX_LENGTH = 42;

export const buildBurnNotificationData = ({ txId, bodegaId, burnAddress, amount, fecha, wineloverWallet, source = 'unknown' }) => {
  const payload = {
    txId,
    burnAddress,
    amount,
    fecha,
    wineloverWallet,
    source,
  };

  return {
    winery_id: bodegaId,
    type: 'TOKEN_BURNED',
    tx_id: txId,
    burn_address: burnAddress,
    amount,
    payload,
    read: false,
    fecha,
  };
};

export const persistBurnNotification = async ({ txId, bodegaId, burnAddress, amount, fecha, wineloverWallet, source = 'unknown' }) => {
  const existing = await Notification.findOne({
    where: {
      winery_id: bodegaId,
      tx_id: txId,
      burn_address: burnAddress,
    },
  });

  if (existing) {
    return { created: false, notification: existing };
  }

  const notification = await Notification.create(buildBurnNotificationData({
    txId,
    bodegaId,
    burnAddress,
    amount,
    fecha,
    wineloverWallet,
    source,
  }));

  return { created: true, notification };
};

export const resolveWineryIdFromBurnAddress = (burnAddress = '') => {
  const value = String(burnAddress || '');
  return value.length > BURN_PREFIX_LENGTH ? value.slice(BURN_PREFIX_LENGTH) : '';
};