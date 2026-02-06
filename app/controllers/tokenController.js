import { Wallet } from '../../wallet/wallet.js';

// Controlador para POST /baja-token
export const bajaToken = async (req, res) => {
  // Estructura esperada: { signedTransaction, origin, type }
  let transactionId, ownerPublicKey, origin, type, utxoTxId, utxoOutputIndex, keystore, passphrase;
  if (req.body.signedTransaction) {
    const tx = req.body.signedTransaction;
    transactionId = tx.id;
    if (tx.inputs && tx.inputs.length > 0) {
      ownerPublicKey = tx.inputs[0].address;
      utxoTxId = tx.inputs[0].txId;
      utxoOutputIndex = tx.inputs[0].outputIndex;
    }
    origin = req.body.origin || "burn";
    type = req.body.type || "quemada";
    keystore = undefined;
    passphrase = undefined;
  } else {
    ({ transactionId, ownerPublicKey, origin, type, utxoTxId, utxoOutputIndex, keystore, passphrase } = req.body);
    if (!origin) origin = "burn";
    if (!type) type = "quemada";
  }
  if (type !== "quemada") {
    return res.status(400).json({ success: false, error: "El campo 'type' debe ser 'quemada' para bajas de tipo burn.", type });
  }
  // Buscar transacción en blockchain y mempool
  let foundTransaction = null;
  let transactionStatus = null;
  for (const block of global.bc.chain) {
    const transaction = block.data.find((tx) => tx.id === transactionId);
    if (transaction) {
      foundTransaction = transaction;
      transactionStatus = "confirmed";
      break;
    }
  }
  if (!foundTransaction) {
    const mempoolTransaction = global.tp.transactions.find((tx) => tx.id === transactionId);
    if (mempoolTransaction) {
      foundTransaction = mempoolTransaction;
      transactionStatus = "pending";
    }
  }
  if (!foundTransaction) {
    return res.status(404).json({ success: false, error: "Transacción no encontrada", transactionId });
  }
  const currentOwner = foundTransaction.outputs.find((output) => output.amount > 0)?.address;
  if (currentOwner !== ownerPublicKey) {
    return res.status(403).json({ success: false, error: "El propietario no coincide con el actual", currentOwner, ownerPublicKey });
  }
  let destino = null;
  if (origin === "burn" || origin === "baja-definitiva") {
    destino = "0x0000000000000000000000000000000000000000";
  } else if (origin === "bodega" || origin === "baja-temporal") {
    destino = process.env.BODEGA_ADDRESS || "BODEGA_DEFAULT_ADDRESS";
  } else {
    return res.status(400).json({ success: false, error: "Origin de baja no válido", origin });
  }
  try {
    let utxoToBurn;
    if (utxoTxId && typeof utxoOutputIndex !== "undefined") {
      utxoToBurn = global.bc.utxoSet.find(
        (utxo) => utxo.address === ownerPublicKey && utxo.txId === utxoTxId && utxo.outputIndex === utxoOutputIndex
      );
      if (!utxoToBurn) {
        return res.status(400).json({ success: false, error: "UTXO específico no encontrado para baja", utxoTxId, utxoOutputIndex });
      }
    } else {
      const utxos = global.bc.utxoSet.filter((utxo) => utxo.address === ownerPublicKey);
      if (utxos.length === 0) {
        return res.status(400).json({ success: false, error: "El propietario no tiene saldo disponible para baja", ownerPublicKey });
      }
      utxoToBurn = utxos;
    }
    if (!keystore || !passphrase) {
      return res.status(400).json({ success: false, error: "Faltan keystore o passphrase del usuario para firmar la transacción de baja" });
    }
    let privateKeyBuf;
    try {
      privateKeyBuf = await global.decryptPrivateKeyFromKeystore(keystore, passphrase);
    } catch (err) {
      return res.status(403).json({ success: false, error: "No se pudo descifrar la clave privada del usuario", details: err.message });
    }
    let privateKeyHex = Buffer.isBuffer(privateKeyBuf) ? privateKeyBuf.toString("hex") : privateKeyBuf;
    const userWallet = new Wallet(ownerPublicKey, 0, privateKeyHex);
    let bajaTransaction;
    if (Array.isArray(utxoToBurn)) {
      const totalAmount = utxoToBurn.reduce((sum, utxo) => sum + utxo.amount, 0);
      bajaTransaction = userWallet.createTransaction(destino, totalAmount, global.bc, global.tp, global.bc.utxoSet);
    } else {
      bajaTransaction = userWallet.createTransaction(destino, utxoToBurn.amount, global.bc, global.tp, [utxoToBurn]);
    }
    if (!bajaTransaction) {
      return res.status(500).json({ success: false, error: "No se pudo crear la transacción de baja" });
    }
    global.p2pServer.broadcastTransaction(bajaTransaction);
    return res.json({
      success: true,
      status: "baja-pending",
      message: "Transacción de baja creada y difundida exitosamente",
      transactionId: bajaTransaction.id,
      timestamp: bajaTransaction.timestamp,
      origin,
      type,
      destino,
      owner: ownerPublicKey,
      amount: Array.isArray(utxoToBurn) ? utxoToBurn.reduce((sum, utxo) => sum + utxo.amount, 0) : utxoToBurn.amount,
      details: {
        previousTransactionId: transactionId,
        previousOwner: ownerPublicKey,
        transactionStatus: transactionStatus,
        broadcasted: true,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Error creando la transacción de baja", details: error.message });
  }
};
