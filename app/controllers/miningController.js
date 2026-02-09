// app/controllers/miningController.js

/**
 * POST /mine
 *
 * Purpose:
 *   Principal endpoint para minado manual desde clientes modernos (frontend).
 *   Ejecuta una ronda de minado (PoW) e intenta incluir las transacciones pendientes de la mempool.
 *
 * Guard:
 *   - Si la mempool está vacía, NO mina y responde 409 (Conflict) con JSON
 *
 * Response (on success):
 *   200 JSON con datos del bloque minado
 */
export const mineBlock = (req, res) => {
  try {
    // Acceder a instancias globales
    const { tp, miner, p2pServer, utxoManager } = global;

    // Guard: tp y tp.transactions deben existir y ser array
    if (!tp || !Array.isArray(tp.transactions)) {
      return res.status(500).json({
        success: false,
        error: "TransactionPool (tp) no está inicializada o no es válida.",
        details: "tp o tp.transactions es undefined. Revisa la inicialización del TransactionPool."
      });
    }

    // Guard: no minar si la mempool está vacía
    const pending = tp.transactions.length;
    if (pending === 0) {
      return res.status(409).json({
        success: false,
        error: "No hay transacciones pendientes en la mempool. Minado cancelado.",
        mempoolSize: 0,
      });
    }

    console.log("🔄 Iniciando proceso de minado...");
    console.log(`📋 Transacciones en mempool: ${tp.transactions.length}`);

    // Mostrar todas las transacciones en la mempool (si las hay)
    if (tp.transactions.length > 0) {
      console.log("[MINER] Transacciones en mempool:");
      tp.transactions.forEach((tx, idx) => {
        console.log(`[MINER] tx #${idx}:`, JSON.stringify(tx, null, 2));
      });
    }

    // Antes de minar, mostrar el estado de la wallet global
    console.log("[MINER] Estado de global.wallet:", global.wallet);
    if (!global.wallet) {
      console.error("[MINER] Error: global.wallet no está inicializada");
      return res.status(500).json({
        success: false,
        error: "global.wallet no está inicializada. No se puede minar.",
        details: "Asegúrate de que la wallet esté cargada antes de minar.",
      });
    }

    if (!global.wallet.keyPair) {
      console.error("[MINER] Error: global.wallet.keyPair no está inicializada");
      return res.status(500).json({
        success: false,
        error: "global.wallet.keyPair no está inicializada. No se puede minar.",
        details: "Asegúrate de que la wallet tenga keyPair antes de minar.",
      });
    }

    // Usar el miner para procesar transacciones pendientes
    let block;
    try {
      block = miner.mine();
    } catch (err) {
      console.error("[MINER] Error interno en miner.mine():", err);
      return res.status(500).json({
        success: false,
        error: "Error interno en miner.mine()",
        details: err.message,
      });
    }

    // Mostrar las transacciones que se intentan minar
    if (block && block.data && block.data.length > 0) {
      console.log("[MINER] Transacciones minadas en el bloque:");
      block.data.forEach((tx, idx) => {
        console.log(`[MINER] tx #${idx}:`, JSON.stringify(tx, null, 2));
      });
    }

    // ✅ Verificar que el bloque se minó correctamente
    if (!block) {
      return res.json({
        success: false,
        message: "No se pudo minar el bloque",
        info: "Minería cancelada o sin transacciones válidas",
        mempoolSize: tp && Array.isArray(tp.transactions) ? tp.transactions.length : 0,
      });
    }

    console.log(`✅ Nuevo bloque minado: ${block.hash}`);
    console.log(`📦 Transacciones incluidas: ${Array.isArray(block.data) ? block.data.length : 0}`);

    // Sincronizar con otros nodos
    p2pServer.syncChains();

    // Actualizar el UTXOManager con el nuevo bloque minado
    if (block) {
      utxoManager.updateWithBlock(block);
    }

    res.json({
      success: true,
      message: "Bloque minado exitosamente",
      block: {
        hash: block.hash,
        timestamp: block.timestamp,
        transactionsCount: Array.isArray(block.data) ? block.data.length : 0,
        difficulty: block.difficulty,
        processTime: block.processTime,
      },
      mempoolSize: tp && Array.isArray(tp.transactions) ? tp.transactions.length : 0,
    });
  } catch (error) {
    console.error("Error mining block:", error);
    res.status(500).json({
      success: false,
      error: "Error mining block",
      details: error.message,
    });
  }
};

/**
 * POST /mine-transactions (LEGACY)
 *
 * Purpose:
 *   Endpoint legado mantenido por compatibilidad con clientes antiguos.
 *   Ejecuta una ronda de minado y, en caso de éxito, redirige a /blocks.
 *
 * Guard:
 *   - Si la mempool está vacía, responde 409 (Conflict) con JSON y NO mina.
 *
 * Response:
 *   - Éxito: redirección HTTP a /blocks.
 *   - Error: 4xx/5xx con JSON.
 */
export const mineTransactionsLegacy = (req, res) => {
  try {
    const { tp, miner } = global;

    const pending = tp && Array.isArray(tp.transactions) ? tp.transactions.length : 0;
    if (pending === 0) {
      return res.status(409).json({
        success: false,
        error: "No hay transacciones pendientes en la mempool. Minado cancelado.",
        mempoolSize: 0,
      });
    }

    const block = miner.mine();
    if (!block) {
      return res.status(500).json({ 
        success: false, 
        error: "No se pudo minar el bloque" 
      });
    }

    console.log(`[LEGACY /mine-transactions] Nuevo bloque minado: ${block.hash || ""}`);

    // Comportamiento original: redirigir a /blocks
    res.redirect("/blocks");
  } catch (error) {
    console.error("Error mining transactions (legacy):", error);
    res.status(500).json({
      success: false,
      error: "Error mining transactions",
      details: error.message,
    });
  }
};
