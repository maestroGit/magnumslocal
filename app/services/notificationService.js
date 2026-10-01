// app/services/notificationService.js
import Notification from '../models/Notification.js';

const BURN_PREFIX_LENGTH = 42;

const normalizeSource = (source) => {
  const value = String(source || '').trim();
  return value || 'unknown';
};

export const buildBurnNotificationData = ({ txId, bodegaId, burnAddress, amount, fecha, wineloverWallet, source = 'unknown' }) => {
  const normalizedSource = normalizeSource(source);
  const payload = {
    txId,
    burnAddress,
    amount,
    fecha,
    wineloverWallet,
    source: normalizedSource,
  };

  return {
    winery_id: bodegaId,
    type: 'TOKEN_BURNED',
    tx_id: txId,
    burn_address: burnAddress,
    amount,
    first_seen_source: normalizedSource,
    last_seen_source: normalizedSource,
    payload,
    read: false,
    fecha,
  };
};

export const persistBurnNotification = async ({ txId, bodegaId, burnAddress, amount, fecha, wineloverWallet, source = 'unknown' }) => {
  const normalizedSource = normalizeSource(source);
  const existing = await Notification.findOne({
    where: {
      winery_id: bodegaId,
      tx_id: txId,
      burn_address: burnAddress,
    },
  });

  if (existing) {
    const updates = {};

    if (!existing.first_seen_source || String(existing.first_seen_source).trim() === '') {
      updates.first_seen_source = normalizedSource;
    }

    const currentLastSeen = String(existing.last_seen_source || '').trim();
    if (normalizedSource && currentLastSeen !== normalizedSource) {
      updates.last_seen_source = normalizedSource;
      updates.payload = {
        ...(existing.payload || {}),
        source: normalizedSource,
      };
    }

    if (Object.keys(updates).length > 0) {
      await existing.update(updates);
    }

    return { created: false, notification: existing };
  }

  const notification = await Notification.create(buildBurnNotificationData({
    txId,
    bodegaId,
    burnAddress,
    amount,
    fecha,
    wineloverWallet,
    source: normalizedSource,
  }));

  return { created: true, notification };
};

export const resolveWineryIdFromBurnAddress = (burnAddress = '') => {
  const value = String(burnAddress || '');
  return value.length > BURN_PREFIX_LENGTH ? value.slice(BURN_PREFIX_LENGTH) : '';
};