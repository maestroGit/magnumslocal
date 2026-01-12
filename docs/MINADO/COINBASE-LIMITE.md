# 2026/01/12
El premio de minado se crea como una transacción coinbase (inputs vacíos, outputs con el premio para el minero). Actualmente, el premio no tiene límite ni reducción automática: cada bloque minado genera el mismo monto (por ejemplo, 100 unidades para magnumsmaster y 1 unidades para magnumslocal).
1. Transacción Coinbase - Inputs Vacíos ✅
Confirmado en src/transaction.js:
static rewardTransaction(minerWallet, senderWallet) {
  return Transaction.transactionWithOutputs(senderWallet, [
    {
      amount: MINING_REWARD,
      address: minerWallet.publicKey,
    },
  ]);
}

Constructor inicializa this.inputs = [] por defecto
El premio sale "de la nada" (no gasta UTXOs previos)

2. Dirección de Destino del Premio ✅
Asignación en app/miner.js:

const rewardTx = address
  ? Transaction.rewardTransaction({ publicKey: address }, Wallet.blockchainwallet())
  : Transaction.rewardTransaction(this.wallet, Wallet.blockchainwallet());

Si especificas address en POST /mine → va a esa dirección
Si no → va a this.wallet (wallet global del backend)

3. Visualización Frontend en Naranja ✅
Ya implementado en public/modal-waitlist.js:
const isCoinbase = u.inputs && Array.isArray(u.inputs) && u.inputs.length === 0;
return `
  <div class="coincontrol-utxo-row${isCoinbase ? ' coinbase-utxo' : ''}">
CSS en public/styles.css:
.coincontrol-utxo-row.coinbase-utxo {
  background-color: orange !important;
}

🔄 Flujo Completo de Minado
ESCENARIO A: Minado desde magnumsmaster (Relay)
Paso 1: Usuario Inicia Minado
Frontend → POST /mine → server.js:1789

Paso 2: Validación Mempool server.js
    if (pending === 0) {
    return res.status(409).json({
        error: "No hay transacciones pendientes. Minado cancelado.",
    });
    }
⚠️ Guard: Rechaza si mempool vacía

Paso 3: Crear Coinbase + Minar app/miner.js
// 1. Obtener transacciones válidas
const validTransactions = this.transactionsPool.validTransactions();

// 2. Crear coinbase (100 tokens para magnumsmaster)
const rewardTx = Transaction.rewardTransaction(
  this.wallet, 
  Wallet.blockchainwallet()
);
txs.push(rewardTx);

// 3. Minar bloque (Proof of Work)
const block = this.blockchain.addBlock(txs);

Paso 4: Broadcast P2P app/miner.js
this.p2pServer.syncChains();

Envía mensaje app/p2pServer.js:
syncChains = () => {
  this.sockets.forEach((socket) => {
    socket.send(JSON.stringify({
      type: "CHAIN",
      chain: this.blockchain.chain,
    }));
  });
};

magnumsmaster tiene 1 socket: magnumslocal
Le envía la cadena completa actualizada

Paso 5: Limpiar Mempool Local app/miner.js
this.transactionsPool.clear();  // mempool = []

ESCENARIO B: magnumslocal Recibe Bloque Minado
Paso 1: Recepción WebSocket app/p2pServer.js
case MESSAGE_TYPES.chain: {
  console.log("⛓️  Recibida nueva cadena");
  this.blockchain.replaceChain(data.chain);

Paso 2: Validar y Reemplazar Cadena src/blockchain.js
replaceChain(newChain) {
  if (newChain.length <= this.chain.length) {
    console.log("Received chain length:", newChain.length, "vs Current:", this.chain.length);
    return;
  }
  if (!this.isValidChain(newChain)) {
    console.log("Cadena NO válida");
    return;
  }
  console.log("⛓️  Reemplazando blockchain con cadena nueva");
  this.chain = newChain;
}

Paso 3: Limpiar Mempool (Filtrado) app/p2pServer.js
// Extraer IDs de transacciones incluidas en la nueva cadena
const includedTxIds = new Set();
data.chain.forEach(block => {
  if (Array.isArray(block.data)) {
    block.data.forEach(tx => includedTxIds.add(tx.id));
  }
});

// Filtrar mempool local
const before = this.transactionsPool.transactions.length;
this.transactionsPool.transactions = this.transactionsPool.transactions
  .filter(tx => !includedTxIds.has(tx.id));
const after = this.transactionsPool.transactions.length;
console.log(`Mempool limpiada: antes=${before}, después=${after}`);

Paso 4: Sincronizar UTXO Manager app/p2pServer.js
if (global.utxoManager) {
  global.utxoManager.utxoSet = {};
  this.blockchain.chain.forEach((block) => 
    global.utxoManager.updateWithBlock(block)
  );
}

ESCENARIO C: Minado desde magnumslocal
Mismo flujo que magnumsmaster, con diferencias:
Diferencia 1: Recompensa config/constantConfig.js
MINING_REWARD: 1,  // magnumslocal: 1 token (vs 100 en magnumsmaster)

Diferencia 2: Broadcast app/p2pServer.js

magnumslocal tiene 1 socket: magnumsmaster (relay)
Envía MESSAGE_TYPES.chain al relay
magnumsmaster recibe y procesa con el mismo case MESSAGE_TYPES.chain
Diferencia 3: Topología
magnumslocal.sockets = [relay]      → Envía solo al relay
magnumsmaster.sockets = [magnumslocal] → Recibe de magnumslocal

┌──────────────────────────────────────────────────────────────────┐
│  MAGNUMSMASTER (Relay) - Usuario hace clic en "Minar"           │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /mine → Validar mempool > 0                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  miner.mine()                                                    │
│  ├─ validTransactions = mempool.validTransactions()             │
│  ├─ coinbaseTx = { inputs: [], outputs: [{ amount: 100 }] }    │
│  └─ block = blockchain.addBlock([...validTx, coinbaseTx])       │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Block.mineBlock() - Proof of Work (difficulty=2)               │
│  └─ Buscar nonce hasta que hash empiece con "00"                │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  p2pServer.syncChains()                                          │
│  └─ Send { type: "CHAIN", chain: [...] } → magnumslocal         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  transactionsPool.clear() → mempool = []                        │
└─────────────────────────────────────────────────────────────────┘
                   │
                   │ WebSocket: wss://app.blockswine.com:443
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  MAGNUMSLOCAL - Recibe MESSAGE_TYPES.chain                      │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  blockchain.replaceChain(newChain)                              │
│  ├─ Validar: newChain.length > current.length                   │
│  ├─ Validar: isValidChain(newChain)                             │
│  └─ this.chain = newChain                                       │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Filtrar mempool local                                           │
│  ├─ includedTxIds = Set de IDs de txs en nueva cadena          │
│  └─ mempool = mempool.filter(tx => !includedTxIds.has(tx.id))  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sincronizar UTXO Manager                                        │
│  ├─ utxoSet = {} (resetear)                                    │
│  └─ chain.forEach(block => updateWithBlock(block))             │
└─────────────────────────────────────────────────────────────────┘



✅ El flujo y la lógica son correctos y están bien implementados:

✅ Coinbase con inputs: [] diferencia premios de minado
✅ Sincronización P2P bidireccional (cadena + mempool)
✅ Limpieza inteligente de mempool (total en minero, selectiva en peers)
✅ UTXO Manager se reconstruye tras cada sync
✅ Frontend ya muestra coinbase UTXOs en naranja
No hay problemas de diseño en el flujo actual.


# Si necesitará limpiar mempool manualmente:
🔍 Por Qué CLEAR_TRANSACTIONS No Se Usa
1. El Código SÍ Existe y Está Completo
🔧 ¿Debería Usarse broadcastClearTransactions()?
NO es necesario porque:
Redundante: La limpieza ya ocurre automáticamente al recibir MESSAGE_TYPES.chain
Menos seguro: Podría borrar transacciones válidas no minadas
Más complejo: Requiere sincronización de 2 mensajes
No aporta valor: No hay caso de uso donde sea mejor que el enfoque actual
¿Cuándo SÍ sería útil?
Solo si necesitaras un comando administrativo manual:
 // broadcastClearTransactions Ese endpoint NO existe en tu código actual.
  // Si quisieras implementarlo para tener un comando de emergencia, 
  // tendrías que agregarlo manualmente en server.js, por ejemplo después de los otros endpoints admin.
  // Sería como un comando administrativo de emergencia que ordena a todos los peers limpiar el pool de transacciones
  // ❌ Pero nadie lo llama (no hay endpoint ni código que lo use)
  // ❌ No existe /admin/clear-all-mempools en server.js
  broadcastClearTransactions = () => {
    this.sockets.forEach((socket) =>
      socket.send(
        JSON.stringify({ type: MESSAGE_TYPES.clear_transactions })
      )
    );
  };
}

❌ No existe /admin/clear-all-mempools en server.js
// Endpoint de emergencia (por si mempool se corrompe)
app.post('/admin/clear-all-mempools', (req, res) => {
  transactionsPool.clear();  // Limpia local
  p2pServer.broadcastClearTransactions();  // Limpia todos los peers
  res.json({ message: "Mempool limpiada en toda la red" });
});


- Implementar un límite o reducción progresiva del premio (como en Bitcoin), puedes hacerlo de dos formas:

1. Límite total de monedas: Llevar un contador global de monedas emitidas y dejar de crear premios cuando se alcance el máximo.
2. Reducción por bloque (halving): Disminuir el premio cada cierto número de bloques (por ejemplo, cada 100,000 bloques el premio se reduce a la mitad).
Esto se controla en la lógica de creación de la transacción coinbase, normalmente en el método de minado del bloque (por ejemplo, en la clase Miner).

¿Quieres que te ayude a implementar un límite total de monedas, una reducción progresiva (halving), o ambos?

En tu sistema, cuando se mina un bloque y se recibe el premio (por ejemplo, 50 unidades), la transacción de recompensa aparece con los siguientes datos:

"inputs": [] (no hay entradas, es decir, no se gastan UTXOs previos)
"outputs": [{ "amount": 50, "address": ... }] (el premio se asigna a una dirección específica)
Esto corresponde a una transacción tipo coinbase. En blockchains como Bitcoin, la coinbase es la primera transacción de cada bloque y crea nuevas monedas como recompensa para el minero. No tiene entradas, solo outputs.

En tu caso, la dirección que recibe el premio es la del minero que resolvió el bloque. El sistema asigna el premio a la wallet pública del minero activo en ese momento (por ejemplo, la wallet global cargada en el backend).

Resumen:

El premio de minado sale de "la nada" (inputs vacíos), es una coinbase.
La dirección de destino es la del minero (por defecto, la wallet global del backend).
No se gasta ningún UTXO previo, se crean nuevas monedas.
Si quieres ver o cambiar la wallet que recibe el premio, revisa cómo se inicializa el minero en el backend (server.js), normalmente usando la wallet global cargada al arrancar el servidor.

Sí, es una idea muy buena y fácil de implementar. Puedes identificar los UTXOs que provienen de transacciones coinbase (premio de minado, con inputs vacíos) y cambiar el color del div a naranja para diferenciarlos visualmente.

Para hacerlo:

Cuando construyas cada div de UTXO, El premio de minado sale de "la nada" (inputs vacíos), es una coinbase.
La dirección de destino es la del minero (por defecto, la wallet global del backend).
En tu CSS, define .coinbase-utxo { background-color: orange; } para el color naranja.

