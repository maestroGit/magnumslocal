// app/services/notificationService.js
import Notification from '../models/Notification.js';

const BURN_PREFIX_LENGTH = 42;

const normalizeSource = (source) => {
  const value = String(source || '').trim();
  return value || 'unknown';
};

export const buildBurnNotificationData = ({ txId, bodegaId, burnAddress, amount, fecha, wineloverWallet, source = 'unknown', genesisHash = null, isActive = true }) => {
  const normalizedSource = normalizeSource(source);
  const payload = {
    txId,
    burnAddress,
    amount,
    fecha,
    wineloverWallet,
    source: normalizedSource,
    genesisHash,
  };

  return {
    winery_id: bodegaId,
    type: 'TOKEN_BURNED',
    tx_id: txId,
    burn_address: burnAddress,
    amount,
    genesis_hash: genesisHash,
    is_active: isActive,
    first_seen_source: normalizedSource,
    last_seen_source: normalizedSource,
    payload,
    read: false,
    fecha,
  };
};

export const persistBurnNotification = async ({ txId, bodegaId, burnAddress, amount, fecha, wineloverWallet, source = 'unknown', genesisHash = null, isActive = true }) => {
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

    if (genesisHash && !existing.genesis_hash) {
      updates.genesis_hash = genesisHash;
    }

    if (isActive !== undefined && existing.is_active !== isActive) {
      updates.is_active = isActive;
    }

    const currentLastSeen = String(existing.last_seen_source || '').trim();
    if (normalizedSource && currentLastSeen !== normalizedSource) {
      updates.last_seen_source = normalizedSource;
      updates.payload = {
        ...(existing.payload || {}),
        source: normalizedSource,
        ...(genesisHash ? { genesisHash } : {})
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
    genesisHash,
    isActive,
  }));

  return { created: true, notification };
};

export const resolveWineryIdFromBurnAddress = (burnAddress = '') => {
  const value = String(burnAddress || '');
  return value.length > BURN_PREFIX_LENGTH ? value.slice(BURN_PREFIX_LENGTH) : '';
};