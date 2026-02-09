// Wallet loading helpers

import fs from 'fs';

const normalizePrivateKeyHex = (privateKeyRaw) => {
  if (Buffer.isBuffer(privateKeyRaw)) {
    return privateKeyRaw.toString('hex');
  }
  if (typeof privateKeyRaw === 'string') {
    if (/^[0-9a-fA-F]+$/.test(privateKeyRaw) && privateKeyRaw.length % 2 === 0) {
      return privateKeyRaw;
    }
    return Buffer.from(privateKeyRaw, 'utf8').toString('hex');
  }
  throw new Error('Formato inesperado de clave privada descifrada');
};

export const loadWalletWithPassphrase = async ({
  walletPath,
  passphrase,
  Wallet,
  INITIAL_BALANCE,
  decryptPrivateKeyFromKeystore,
}) => {
  console.log('[FLOW] Leyendo wallet_default.json desde:', walletPath);
  const keystoreRaw = fs.readFileSync(walletPath, 'utf8');
  console.log('[FLOW] Contenido wallet_default.json:', keystoreRaw);
  const keystore = JSON.parse(keystoreRaw);
  console.log('[FLOW] Keystore importado:', keystore);

  const privateKeyBuf = await decryptPrivateKeyFromKeystore(keystore, passphrase);
  console.log('[FLOW] Clave privada descifrada (buffer):', privateKeyBuf);

  const privateKeyHex = normalizePrivateKeyHex(privateKeyBuf);
  console.log('[FLOW] Clave privada descifrada (hex):', privateKeyHex);
  console.log('[FLOW] Creando Wallet SOLO desde privateKeyHex derivada...');

  const wallet = new Wallet(null, INITIAL_BALANCE, privateKeyHex);
  if (wallet.keyPair) {
    try {
      const pubHex = wallet.keyPair.getPublic().encode('hex');
      const privHex = wallet.keyPair.getPrivate('hex');
      console.log('[FLOW] keyPair.public (hex) derivada:', pubHex);
      console.log('[FLOW] keyPair.private (hex):', privHex);
      console.log('[FLOW] publicKey from keystore:', keystore.publicKey);
      if (pubHex !== keystore.publicKey) {
        console.error('[WALLET-ERROR] La clave publica derivada de la privada NO coincide con la guardada en el keystore!');
        console.error('[WALLET-ERROR] Derivada:', pubHex);
        console.error('[WALLET-ERROR] Keystore:', keystore.publicKey);
      } else {
        console.log('[WALLET-OK] La clave publica derivada coincide con la del keystore.');
      }
    } catch (e) {
      console.error('[Wallet] Error mostrando keyPair:', e);
    }
  }

  console.log('[FLOW] Wallet cargada y descifrada con passphrase');
  return { wallet, keystore };
};

export const initWalletFromDisk = async ({
  walletPath,
  defaultPassphrase,
  Wallet,
  INITIAL_BALANCE,
  decryptPrivateKeyFromKeystore,
}) => {
  if (!fs.existsSync(walletPath)) {
    console.log('[INIT] No existe wallet_default.json al arrancar el backend.');
    return { wallet: null, serverKeystore: null, hasKeystore: false };
  }

  try {
    const keystoreRaw = fs.readFileSync(walletPath, 'utf8');
    const keystore = JSON.parse(keystoreRaw);
    console.log('[INIT] Keystore inicial encontrado en', walletPath);
    console.log('[INIT] Clave publica en wallet_default.json:', keystore.publicKey);

    const saltValue = keystore.salt || (keystore.kdfParams && keystore.kdfParams.salt);
    const ivValue = keystore.iv || (keystore.cipherParams && keystore.cipherParams.iv);
    const hasAllFields = [
      keystore.encryptedPrivateKey,
      saltValue,
      ivValue,
      keystore.tag,
      keystore.publicKey,
    ].every((v) => typeof v === 'string' && v.length > 0);

    if (hasAllFields) {
      if (!defaultPassphrase) {
        console.warn('[INIT] No se ha definido DEFAULT_WALLET_PASSPHRASE. La wallet global no se cargara automaticamente.');
        return { wallet: null, serverKeystore: keystore, hasKeystore: true };
      }

      const { wallet } = await loadWalletWithPassphrase({
        walletPath,
        passphrase: defaultPassphrase,
        Wallet,
        INITIAL_BALANCE,
        decryptPrivateKeyFromKeystore,
      });

      if (wallet.keyPair && wallet.keyPair.getPublic) {
        wallet.publicKey = wallet.keyPair.getPublic().encode('hex');
      }

      return { wallet, serverKeystore: keystore, hasKeystore: true };
    }

    if (keystore.privateKey && typeof keystore.privateKey === 'string' && keystore.privateKey.length > 0) {
      const wallet = new Wallet(null, undefined, keystore.privateKey);
      if (wallet.keyPair && wallet.keyPair.getPublic) {
        wallet.publicKey = wallet.keyPair.getPublic().encode('hex');
      }
      console.log('[INIT] globalWallet cargada en memoria desde privateKey. publicKey:', wallet.publicKey);
      return { wallet, serverKeystore: keystore, hasKeystore: true };
    }

    console.warn('[INIT] wallet_default.json no tiene campos necesarios para cargar la wallet global.');
    return { wallet: null, serverKeystore: keystore, hasKeystore: true };
  } catch (e) {
    console.error('[INIT] Error leyendo wallet_default.json:', e);
    return { wallet: null, serverKeystore: null, hasKeystore: false };
  }
};

export const ensureWalletOnStartup = async ({
  walletPath,
  defaultPassphrase,
  Wallet,
  INITIAL_BALANCE,
  decryptPrivateKeyFromKeystore,
  generateKeystore,
}) => {
  if (fs.existsSync(walletPath)) {
    return initWalletFromDisk({
      walletPath,
      defaultPassphrase,
      Wallet,
      INITIAL_BALANCE,
      decryptPrivateKeyFromKeystore,
    });
  }

  try {
    const keystore = await generateKeystore(defaultPassphrase);
    fs.writeFileSync(walletPath, JSON.stringify(keystore, null, 2), 'utf8');
    console.log(`🔑 Keystore generado y exportado a ${walletPath}`);

    const { wallet } = await loadWalletWithPassphrase({
      walletPath,
      passphrase: defaultPassphrase,
      Wallet,
      INITIAL_BALANCE,
      decryptPrivateKeyFromKeystore,
    });

    if (wallet.keyPair && wallet.keyPair.getPublic) {
      wallet.publicKey = wallet.keyPair.getPublic().encode('hex');
    }

    return { wallet, serverKeystore: keystore, hasKeystore: true };
  } catch (e) {
    console.error('[INIT] Error generando wallet global por defecto:', e);
    return { wallet: null, serverKeystore: null, hasKeystore: false };
  }
};
