// ============================================================================
// TRANSACTION CONTROLLER
// ============================================================================
// Controlador para la gestión de transacciones
// - Flujo Usuario: Transacciones pre-firmadas por el cliente
// - Flujo Bodega: Transacciones firmadas en el backend
// ============================================================================

import { Transaction } from '../../wallet/transactions.js';
import { Wallet } from '../../wallet/wallet.js';
import { INITIAL_BALANCE } from '../../config/constantConfig.js';

// ============================================================================
// FUNCIÓN: getTransactionsPool
// ============================================================================
// GET /transactionsPool - Devuelve todas las transacciones en la mempool
export const getTransactionsPool = (req, res) => {
  try {
    const tp = global.tp;
    res.json(tp.transactions);
  } catch (error) {
    console.error("Error fetching transactions pool:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error fetching transactions pool" 
    });
  }
};

// ============================================================================
// FUNCIÓN: createTransaction
// ============================================================================
// POST /transaction - Crea y procesa transacciones
// Acepta dos flujos:
// 1. FLUJO USUARIO: signedTransaction (pre-firmada por el cliente)
// 2. FLUJO BODEGA: mode='bodega' + recipient + amount + passphrase
export const createTransaction = async (req, res) => {
  // Referencias globales necesarias
  const bc = global.bc;
  const tp = global.tp;
  const p2pServer = global.p2pServer;
  const globalWallet = global.globalWallet;
  const serverKeystore = global.serverKeystore;
  const decryptPrivateKeyFromKeystore = global.decryptPrivateKeyFromKeystore;

  // Logs generales de entrada
  console.log("\n--- [POST /transaction] INICIO ---");
  console.log("[POST /transaction] req.body:", JSON.stringify(req.body, null, 2));

  // Deserializar variables del request body
  const { signedTransaction, recipient, amount, passphrase, keystore, inputs, mode } = req.body;

  // ============================================================================
  // FLUJO 1: USUARIO - Transacción Pre-firmada
  // ============================================================================
  if (signedTransaction) {
    console.log(
      "[FLUJO USUARIO] Solicitud recibida. El backend solo validará y propagará la transacción pre-firmada por el usuario."
    );
    
    try {
      // Validación básica de estructura
      if (
        !signedTransaction.inputs ||
        !Array.isArray(signedTransaction.inputs) ||
        !signedTransaction.outputs ||
        !Array.isArray(signedTransaction.outputs)
      ) {
        console.warn(
          "[FLUJO USUARIO] ❌ Transacción rechazada: signedTransaction mal formada."
        );
        return res.status(400).json({
          success: false,
          error: "Malformed signedTransaction. inputs and outputs are required.",
        });
      }

      // Verificar que los inputs existan y no estén gastados
      const missingUtxos = signedTransaction.inputs.filter((inp) => {
        return !bc.utxoSet.some(
          (utxo) =>
            utxo.txId === inp.txId &&
            utxo.outputIndex === inp.outputIndex &&
            utxo.address === inp.address &&
            utxo.amount === inp.amount
        );
      });

      if (missingUtxos.length > 0) {
        console.warn(
          "[FLUJO USUARIO] ❌ Transacción rechazada: uno o más inputs no existen o ya están gastados.",
          missingUtxos
        );
        return res.status(400).json({
          success: false,
          error: "One or more inputs reference non-existing or spent UTXOs",
          missingUtxos,
        });
      }

      // Verificar la firma
      console.log("[DEBUG][POST /transaction] Llamando a Transaction.verifyTransaction...");
      const isValid = Transaction.verifyTransaction(signedTransaction);
      console.log("[DEBUG][POST /transaction] Resultado verifyTransaction:", isValid);
      
      if (!isValid) {
        console.warn("[FLUJO USUARIO] ❌ Transacción rechazada: firma inválida.");
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transaction signature" 
        });
      }

      // Añadir a la mempool y propagar
      let addResult;
      try {
        addResult = tp.updateOrAddTransaction(signedTransaction);
      } catch (e) {
        tp.transactions.push(signedTransaction);
        addResult = true;
      }

      if (addResult === false) {
        console.warn("[FLUJO USUARIO] ❌ Doble gasto detectado en mempool.");
        return res.status(400).json({
          success: false,
          error: "Doble gasto detectado: uno de los UTXOs ya está referenciado en una transacción pendiente. Rechazado por doble gasto en mempool.",
        });
      }

      // Broadcast P2P
      p2pServer.broadcastTransaction(signedTransaction);
      
      console.log(
        "[FLUJO USUARIO] ✅ Transacción pre-firmada aceptada y propagada. ID:",
        signedTransaction.id
      );

      return res.json({
        success: true,
        message: "Signed transaction accepted",
        transactionId: signedTransaction.id,
      });

    } catch (err) {
      console.error(
        "[FLUJO USUARIO] Error procesando la transacción pre-firmada:",
        err
      );
      return res.status(500).json({
        success: false,
        error: "Error processing signed transaction",
        details: err.message,
      });
    }
  }

  // ============================================================================
  // FLUJO 2: BODEGA - Firma en Backend
  // ============================================================================
  else if (mode === 'bodega') {
    console.log("[FLUJO BODEGA] Solicitud recibida. El backend firmará la transacción.");

    // Validación básica de datos de entrada
    if (!recipient || !amount) {
      console.warn("❌ Transacción rechazada: datos incompletos", {
        recipient,
        amount,
      });
      return res.status(400).json({
        error: "Datos de la transacción incompletos",
        details: {
          recipient,
          amount,
          message: "Debes proporcionar un destinatario y un monto.",
        },
      });
    }

    // Logs de depuración
    console.log("UTXO set global:", bc.utxoSet);
    console.log("Wallet pública activa:", global.wallet?.publicKey);

    // Validar passphrase
    if (!keystore || !passphrase) {
      if (!passphrase) {
        console.log("[POST /transaction] Falta passphrase. Transacción NO procesada.");
        return res.status(400).json({
          error: "Falta passphrase del usuario para firmar la transacción.",
        });
      }
      console.log(
        "[POST /transaction] El keystore no viene en el request. Usaremos la wallet global del servidor si está disponible."
      );
    }

    try {
      let privateKeyHex;

      // Caso 1: El cliente envía el keystore encriptado
      if (keystore) {
        console.log("[POST /transaction] Usando keystore enviado desde el cliente");
        let privateKeyRaw = await decryptPrivateKeyFromKeystore(keystore, passphrase);
        
        if (Buffer.isBuffer(privateKeyRaw)) {
          privateKeyHex = privateKeyRaw.toString("hex");
        } else if (typeof privateKeyRaw === "string") {
          if (/^[0-9a-fA-F]+$/.test(privateKeyRaw) && privateKeyRaw.length % 2 === 0) {
            privateKeyHex = privateKeyRaw;
          } else {
            privateKeyHex = Buffer.from(privateKeyRaw, "utf8").toString("hex");
          }
        } else {
          throw new Error("Formato inesperado de clave privada descifrada");
        }
      }
      // Caso 2: Validar passphrase contra el keystore del servidor
      else if (serverKeystore) {
        console.log("[POST /transaction] Validando passphrase contra keystore del servidor");
        try {
          let privateKeyRaw = await decryptPrivateKeyFromKeystore(serverKeystore, passphrase);
          console.log("[POST /transaction] ✅ Passphrase validada correctamente");
          
          if (Buffer.isBuffer(privateKeyRaw)) {
            privateKeyHex = privateKeyRaw.toString("hex");
          } else if (typeof privateKeyRaw === "string") {
            if (/^[0-9a-fA-F]+$/.test(privateKeyRaw) && privateKeyRaw.length % 2 === 0) {
              privateKeyHex = privateKeyRaw;
            } else {
              privateKeyHex = Buffer.from(privateKeyRaw, "utf8").toString("hex");
            }
          } else {
            throw new Error("Formato inesperado de clave privada descifrada");
          }
        } catch (decryptError) {
          console.error("[POST /transaction] ❌ Passphrase incorrecta:", decryptError.message);
          throw new Error("Passphrase incorrecta");
        }
      }
      // Caso 3: Usar la wallet global del servidor (ya descifrada en memoria)
      else if (global.wallet && global.wallet.privateKey) {
        console.log(
          "[POST /transaction] ⚠️ Usando wallet global del servidor sin validar passphrase (no hay keystore disponible)"
        );
        privateKeyHex = global.wallet.privateKey;
      }
      // Caso 4: Intentar usar globalWallet (wallet por defecto del servidor)
      else if (globalWallet && globalWallet.privateKey) {
        console.log(
          "[POST /transaction] ⚠️ Usando globalWallet del servidor sin validar passphrase (no hay keystore disponible)"
        );
        privateKeyHex = globalWallet.privateKey;
      } else {
        throw new Error("No hay wallet disponible para firmar la transacción");
      }

      console.log("[POST /transaction] privateKeyHex (usada en wallet):", privateKeyHex);
      console.log("[POST /transaction] typeof privateKeyHex:", typeof privateKeyHex);

      // Crear wallet temporal SOLO para esta transacción
      const walletPublicKey = keystore?.publicKey || global.wallet?.publicKey || globalWallet?.publicKey;
      const tempWallet = new Wallet(walletPublicKey, INITIAL_BALANCE, privateKeyHex);
      console.log("[POST /transaction] tempWallet:", tempWallet);

      // Verificar balance
      const utxos = bc.utxoSet.filter((utxo) => utxo.address === tempWallet.publicKey);
      const balance = utxos.reduce((sum, utxo) => sum + utxo.amount, 0);

      if (balance === 0) {
        console.warn("❌ Transacción rechazada: saldo insuficiente o sin UTXOs", {
          address: tempWallet.publicKey,
          balance,
        });
        return res.status(400).json({
          error: "No hay saldo disponible o la dirección no tiene UTXOs.",
          address: tempWallet.publicKey,
          balance,
        });
      }

      // Verificar que la wallet tenga clave privada
      if (!tempWallet.privateKey) {
        console.warn("❌ Transacción rechazada: wallet sin clave privada", {
          address: tempWallet.publicKey,
        });
        return res.status(400).json({
          error: "No hay saldo disponible o la dirección no tiene UTXOs.",
          address: tempWallet.publicKey,
          balance,
          suggestion: "Verifica que la clave privada cargada corresponda a una dirección con saldo.",
        });
      }

      // Crear la transacción
      const transaction = tempWallet.createTransaction(
        recipient,
        amount,
        bc,
        tp,
        bc.utxoSet
      );
      console.log("Creando la transacción en la wallet temporal...", transaction);

      if (transaction) {
        // Difundir la transacción
        p2pServer.broadcastTransaction(transaction);

        // Respuesta exitosa
        return res.json({
          success: true,
          message: "Transacción creada exitosamente",
          transaction: {
            id: transaction.id,
            timestamp: transaction.timestamp,
            amount: amount,
            recipient: recipient,
            sender: tempWallet.publicKey,
          },
          enableTraceability: true,
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "Error creando la transacción",
        });
      }

    } catch (err) {
      console.error("[POST /transaction] Error en flujo BODEGA:", err);

      // Diferenciar entre errores de passphrase y otros errores
      if (
        err.message.includes("Passphrase incorrecta") ||
        err.message.includes("Unsupported state or unable to authenticate data")
      ) {
        return res.status(403).json({
          success: false,
          error: "Passphrase incorrecta. Verifica tu contraseña e intenta nuevamente.",
          details: err.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: "Error procesando la transacción.",
        details: err.message,
      });
    }

    // Código redundante legacy (este código nunca se ejecuta porque los returns anteriores ya responden)
    // Se mantiene comentado por si hay alguna lógica que se esté utilizando
    /*
    const utxos = bc.utxoSet.filter((utxo) => utxo.address === global.wallet.publicKey);
    const balance = utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
    
    if (balance === 0) {
      console.warn("❌ Transacción rechazada: saldo insuficiente o sin UTXOs", {
        address: global.wallet.publicKey,
        balance,
      });
      return res.status(400).json({
        error: "No hay saldo disponible o la dirección no tiene UTXOs.",
        address: global.wallet.publicKey,
        balance,
      });
    }

    if (!global.wallet.privateKey) {
      console.warn("❌ Transacción rechazada: wallet sin clave privada", {
        address: global.wallet.publicKey,
      });
      return res.status(400).json({
        error: "No hay saldo disponible o la dirección no tiene UTXOs.",
        address: global.wallet.publicKey,
        balance,
        suggestion: "Verifica que la clave privada cargada corresponda a una dirección con saldo.",
      });
    }

    try {
      const transaction = global.wallet.createTransaction(
        recipient,
        amount,
        bc,
        tp,
        bc.utxoSet
      );
      console.log("Creando la transacción en la wallet...", transaction);

      if (transaction) {
        p2pServer.broadcastTransaction(transaction);

        res.json({
          success: true,
          message: "Transacción creada exitosamente",
          transaction: {
            id: transaction.id,
            timestamp: transaction.timestamp,
            amount: amount,
            recipient: recipient,
            sender: global.wallet.publicKey,
          },
          enableTraceability: true,
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "Error creando la transacción",
        });
      }
    } catch (error) {
      console.error("Error creando la transacción:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "No se pudo crear la transacción.",
          details: error.message,
        });
      }
    }
    */
  }

  // ============================================================================
  // FLUJO NO PERMITIDO
  // ============================================================================
  else {
    console.warn(
      "[POST /transaction] ❌ Transacción rechazada: no es ni modo bodega ni transacción pre-firmada."
    );
    return res.status(400).json({
      error: "Transacción no permitida: solo se aceptan transacciones pre-firmadas (usuario) o modo bodega explícito.",
    });
  }
};
