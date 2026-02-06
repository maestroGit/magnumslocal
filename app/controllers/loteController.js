// GET /propietario/:ownerPublicKey
export async function getPropietario(req, res) {
  try {
    const { ownerPublicKey } = req.params;
    let foundTransactions = [];
    let source = null;
    for (const block of global.bc.chain) {
      const txs = block.data.filter(
        (tx) =>
          tx.outputs &&
          tx.outputs.some((output) => output.address === ownerPublicKey)
      );
      if (txs.length > 0) {
        foundTransactions = foundTransactions.concat(txs);
        source = "blockchain";
      }
    }
    if (foundTransactions.length === 0) {
      const txs = global.tp.transactions.filter(
        (tx) =>
          tx.outputs &&
          tx.outputs.some((output) => output.address === ownerPublicKey)
      );
      if (txs.length > 0) {
        foundTransactions = foundTransactions.concat(txs);
        source = "mempool";
      }
    }
    if (foundTransactions.length > 0) {
      return res.json({
        success: true,
        transactions: foundTransactions,
        source,
      });
    } else {
      return res.status(404).json({
        success: false,
        error: "Propietario no encontrado",
        ownerPublicKey,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: "Error obteniendo propietario", details: err.message });
  }
}
// POST /qr
export async function generateQR(req, res) {
  try {
    const { loteId, transactionId } = req.body;
    if (!loteId || !transactionId) {
      return res.status(400).json({
        success: false,
        error: "Faltan parámetros: loteId y transactionId son requeridos",
      });
    }
    // Simulate QR generation logic (replace with real implementation)
    const qrData = {
      loteId,
      transactionId,
      generatedAt: new Date().toISOString(),
    };
    // For demo, return base64 placeholder
    const qrBase64 = Buffer.from(JSON.stringify(qrData)).toString('base64');
    res.json({ success: true, qrBase64, qrData });
  } catch (err) {
    res.status(500).json({ success: false, error: "Error generando QR", details: err.message });
  }
}
// app/controllers/loteController.js
import Lote from '../../src/models/Lote.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// POST /qr-with-proof
export async function generateQRWithProof(req, res) {
  try {
    const { loteId, transactionId } = req.body;
    if (!loteId || !transactionId) {
      return res.status(400).json({
        success: false,
        error: "Faltan parámetros: loteId y transactionId son requeridos",
      });
    }
    let foundTransaction = null;
    let ownerPublicKey = null;
    let transactionStatus = null;
    for (const block of global.bc.chain) {
      const transaction = block.data.find((tx) => tx.id === transactionId);
      if (transaction) {
        foundTransaction = transaction;
        transactionStatus = "confirmed";
        ownerPublicKey = transaction.outputs.find(
          (output) => output.amount > 0
        )?.address;
        break;
      }
    }
    if (!foundTransaction) {
      const mempoolTransaction = global.tp.transactions.find(
        (tx) => tx.id === transactionId
      );
      if (mempoolTransaction) {
        foundTransaction = mempoolTransaction;
        transactionStatus = "pending";
        ownerPublicKey = mempoolTransaction.outputs.find(
          (output) => output.amount > 0
        )?.address;
      }
    }
    if (!foundTransaction) {
      return res.status(404).json({
        success: false,
        error: "Transacción no encontrada en blockchain ni en mempool",
        transactionId,
        suggestion: "Verifique que el ID de transacción sea correcto",
      });
    }
    const loteData = {
      loteId,
      nombreProducto: req.body.nombreProducto || "Producto sin nombre",
      fechaProduccion: req.body.fechaProduccion || new Date().toISOString().split("T")[0],
      fechaCaducidad: req.body.fechaCaducidad || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      origen: req.body.origen || "España",
      bodega: req.body.bodega || "Bodega desconocida",
      año: req.body.año || new Date().getFullYear(),
      variedad: req.body.variedad || "Variedad no especificada",
      región: req.body.región || "Región no especificada",
      denominacionOrigen: req.body.denominacionOrigen || "D.O. no especificada",
      alcohol: req.body.alcohol || "13%",
      notaDeCata: req.body.notaDeCata || "Nota de cata no disponible",
      maridaje: req.body.maridaje || "Maridaje no especificado",
      precio: req.body.precio || "Precio no especificado",
      comentarios: req.body.comentarios || "Lote registrado con blockchain proof",
      trazabilidad: req.body.trazabilidad || "Blockchain → Verificación QR",
    };
    const lote = new Lote(loteData.loteId);
    Object.assign(lote, loteData);
    const qrUrl = await lote.generarQRWithProof(
      transactionId,
      ownerPublicKey,
      foundTransaction.inputs?.[0]?.signature || `verified_${transactionStatus}`
    );
    res.json({
      success: true,
      qrBase64: qrUrl,
      proof: {
        loteId: lote.loteId,
        owner: ownerPublicKey,
        transactionId: transactionId,
        transactionStatus: transactionStatus,
        verifiedAt: new Date().toISOString(),
        blockchainVerifiable: true,
        message:
          transactionStatus === "pending"
            ? "⏳ Transacción válida en mempool - Se confirmará tras el minado"
            : "✅ Transacción confirmada en blockchain",
      },
      loteData: {
        ...loteData,
        isBlockchainLinked: true,
        transactionReference: transactionId,
      },
    });
  } catch (err) {
    console.error("Error generando QR con prueba:", err);
    res.status(500).json({
      success: false,
      error: "Error generando QR con prueba de propiedad",
      details: err.message,
    });
  }
}

// POST /lotes
export async function createLote(req, res) {
  try {
    const { txId, metadata } = req.body;
    if (!txId) {
      return res.status(400).json({ success: false, error: "txId es requerido" });
    }
    const loteId = txId;
    const metaObj = metadata && typeof metadata === "object" ? metadata : {};
    const metaString = JSON.stringify(metaObj);
    const metadataHash = crypto.createHash("sha256").update(metaString).digest("hex");
    const lotesDir = path.join(process.cwd(), "app", "uploads", "lotes");
    if (!fs.existsSync(lotesDir)) fs.mkdirSync(lotesDir, { recursive: true });
    const record = {
      loteId,
      txId,
      metadataHash,
      metadata: metaObj,
      createdAt: new Date().toISOString(),
    };
    const filePath = path.join(lotesDir, `${loteId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf8");
    const qrPayload = {
      loteId,
      metadataHash,
      url: `${req.protocol}://${req.get("host")}/lotes/${encodeURIComponent(loteId)}`,
    };
    // Proof blockchain (opcional, igual que en server.js)
    try {
      let foundTransaction = null;
      let ownerPublicKey = null;
      let transactionStatus = null;
      for (const block of global.bc.chain) {
        const transaction = block.data.find((tx) => tx.id === txId);
        if (transaction) {
          foundTransaction = transaction;
          transactionStatus = "confirmed";
          ownerPublicKey = transaction.outputs.find(
            (output) => output.amount > 0
          )?.address;
          break;
        }
      }
      if (!foundTransaction) {
        const mempoolTransaction = global.tp.transactions.find(
          (tx) => tx.id === txId
        );
        if (mempoolTransaction) {
          foundTransaction = mempoolTransaction;
          transactionStatus = "pending";
          ownerPublicKey = mempoolTransaction.outputs.find(
            (output) => output.amount > 0
          )?.address;
        }
      }
      if (foundTransaction) {
        // Puedes añadir lógica de prueba aquí si lo necesitas
      }
    } catch (err) {
      console.warn("No se pudo generar proof en POST /lotes (continuando):", err.message);
    }
    return res.json({ success: true, record, qrPayload });
  } catch (err) {
    console.error("Error creando lote:", err);
    return res.status(500).json({
      success: false,
      error: "Error creando lote",
      details: err.message,
    });
  }
}

// GET /lotes/:loteId
export async function getLoteById(req, res) {
  try {
    const { loteId } = req.params;
    const lotesDir = path.join(process.cwd(), "app", "uploads", "lotes");
    const filePath = path.join(lotesDir, `${loteId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Lote no encontrado" });
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error obteniendo lote:", err);
    res.status(500).json({ success: false, error: "Error obteniendo lote", details: err.message });
  }
}

// POST /verify-qr-proof
export async function verifyQRProof(req, res) {
  try {
    const { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: "QR data es requerido",
      });
    }
    let transactionId;
    let ownerPublicKey = "SKIP_OWNER_CHECK";
    let parsedData = null;
    try {
      parsedData = typeof qrData === "string" ? JSON.parse(qrData) : qrData;
      if (parsedData.blockchainProof) {
        transactionId = parsedData.blockchainProof.transactionId;
        ownerPublicKey = parsedData.blockchainProof.ownerPublicKey;
      } else if (parsedData.transactionId) {
        transactionId = parsedData.transactionId;
      }
    } catch (parseErr) {
      transactionId = qrData;
    }
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: "No se pudo extraer transactionId del QR",
      });
    }
    let transactionFound = false;
    let blockInfo = null;
    let foundTransaction = null;
    for (let i = 0; i < global.bc.chain.length; i++) {
      const block = global.bc.chain[i];
      const tx = block.data.find((tx) => tx.id === transactionId);
      if (tx) {
        transactionFound = true;
        foundTransaction = tx;
        blockInfo = {
          index: i,
          hash: block.hash,
          timestamp: block.timestamp,
        };
        break;
      }
    }
    if (!transactionFound) {
      const memTx = global.tp.transactions.find((tx) => tx.id === transactionId);
      if (memTx) {
        return res.json({
          success: true,
          status: "pending",
          message: "Transacción válida en mempool, pendiente de minado",
          transaction: memTx,
        });
      }
      return res.status(404).json({
        success: false,
        error: "Transacción no encontrada en blockchain ni en mempool",
        transactionId,
      });
    }
    res.json({
      success: true,
      status: "confirmed",
      transaction: foundTransaction,
      block: blockInfo,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Error verificando QR proof",
      details: err.message,
    });
  }
}