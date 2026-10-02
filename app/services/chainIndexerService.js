// app/services/chainIndexerService.js
import BurnEvent from '../models/BurnEvent.js';
import Notification from '../models/Notification.js';

/**
 * Servicio para alinear y sincronizar las proyecciones relacionales (PostgreSQL)
 * con la blockchain binaria actual.
 *
 * Principio:
 *  - La blockchain (.dat) es la Fuente Única de Verdad (SSOT).
 *  - PostgreSQL almacena las proyecciones y el histórico.
 *  - Si se detecta un reinicio de la cadena desde el génesis (p. ej. borrado de .dat),
 *    los eventos de cadenas anteriores se marcan como archivados (is_active = false)
 *    para evitar discordancia visual en dashboards sin destruir la evidencia histórica.
 */
export async function syncDatabaseWithBlockchain(blockchain) {
  if (!blockchain || !Array.isArray(blockchain.chain)) {
    console.warn('[CHAIN_INDEXER] Blockchain no disponible para reconciliación SQL.');
    return;
  }

  const genesisHash = blockchain.chain[0]?.hash || null;
  const chainLength = blockchain.chain.length;

  console.log(`[CHAIN_INDEXER] Verificando alineación BD-Blockchain (bloques: ${chainLength}, genesis: ${genesisHash?.substring(0, 16)}...)`);

  try {
    // CASO 1: La cadena está en el bloque génesis (posible nuevo deploy o borrado de .dat)
    if (chainLength <= 1) {
      const activeBurns = await BurnEvent.count({ where: { is_active: true } });
      const activeNotifications = await Notification.count({ where: { is_active: true } });

      if (activeBurns > 0 || activeNotifications > 0) {
        console.warn(`[CHAIN_INDEXER] ⚠️ Cadena en bloque génesis detectada con registros activos previos (Burns: ${activeBurns}, Notificaciones: ${activeNotifications}).`);
        console.log('[CHAIN_INDEXER] Archivando eventos previos de forma segura (is_active = false) para preservar el histórico de auditoría...');

        const [burnsArchived] = await BurnEvent.update(
          { is_active: false },
          { where: { is_active: true } }
        );

        const [notificationsArchived] = await Notification.update(
          { is_active: false },
          { where: { is_active: true } }
        );

        console.log(`[CHAIN_INDEXER] ✅ Histórico archivado exitosamente (Burns archivados: ${burnsArchived}, Notificaciones archivadas: ${notificationsArchived}). La nueva cadena inicia limpia.`);
      } else {
        console.log('[CHAIN_INDEXER] Estado inicial limpio: no hay eventos huérfanos activos.');
      }
      return;
    }

    // CASO 2: La cadena tiene bloques históricos (> 1).
    // Reconciliar eventos que pertenezcan a la cadena actual pero no tengan genesis_hash asignado.
    if (genesisHash) {
      const chainTxIds = new Set();
      blockchain.chain.forEach((block) => {
        if (Array.isArray(block.data)) {
          block.data.forEach((tx) => {
            if (tx?.id) chainTxIds.add(tx.id);
          });
        }
      });

      if (chainTxIds.size > 0) {
        const txArray = Array.from(chainTxIds);
        await BurnEvent.update(
          { genesis_hash: genesisHash, is_active: true },
          { where: { tx_id: txArray, genesis_hash: null } }
        );

        await Notification.update(
          { genesis_hash: genesisHash, is_active: true },
          { where: { tx_id: txArray, genesis_hash: null } }
        );
      }
    }
  } catch (error) {
    console.error('[CHAIN_INDEXER] Error durante la reconciliación BD-Blockchain:', error.message);
  }
}

/**
 * Obtiene estadísticas agregadas de eventos de quema agrupados por génesis/versión.
 * Útil para auditoría y visualización de épocas anteriores.
 */
export async function getHistoricalBurnStats() {
  return await BurnEvent.findAll({
    attributes: [
      'genesis_hash',
      'is_active',
      [BurnEvent.sequelize.fn('COUNT', BurnEvent.sequelize.col('id')), 'total_events'],
      [BurnEvent.sequelize.fn('SUM', BurnEvent.sequelize.col('amount')), 'total_amount'],
      [BurnEvent.sequelize.fn('MIN', BurnEvent.sequelize.col('fecha')), 'first_event'],
      [BurnEvent.sequelize.fn('MAX', BurnEvent.sequelize.col('fecha')), 'last_event'],
    ],
    group: ['genesis_hash', 'is_active'],
    raw: true,
  });
}
