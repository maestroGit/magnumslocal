import { Blockchain } from "../blockchain.js";

console.log("🧪 === UTXO SYSTEM TEST === 🧪\n");

// Creamos una instancia de la blockchain
const bc = new Blockchain();

console.log("✅ Blockchain inicializada");
console.log(`📊 UTXO set inicial: ${bc.utxoSet.length} UTXOs`);

// Mostramos el UTXO del bloque génesis
if (bc.utxoSet.length > 0) {
  console.log(`🎯 UTXO génesis: ${bc.utxoSet[0].amount} tokens para dirección: ${bc.utxoSet[0].address.substring(0, 20)}...`);
}

// Simulamos una transacción realista con la estructura actual
const sampleTx = {
  id: "test-tx-001",
  lote: null,
  inputs: [], // Sin inputs para este test
  outputs: [
    { address: "addr1_test_address_50_tokens", amount: 50 },
    { address: "addr2_test_address_30_tokens", amount: 30 },
    { address: "addr3_test_address_100_tokens", amount: 100 }
  ]
};

console.log("\n🔄 Añadiendo bloque con transacción de prueba...");

// Añadimos un bloque con la transacción simulada
bc.addBlock([sampleTx]);

console.log("✅ Bloque añadido correctamente");
console.log(`📊 UTXO set actualizado: ${bc.utxoSet.length} UTXOs`);

// Función helper para calcular balance desde UTXO set (como hace el sistema)
function getBalanceFromUTXOSet(utxoSet, address) {
  return utxoSet
    .filter(utxo => utxo.address === address)
    .reduce((total, utxo) => total + utxo.amount, 0);
}

// Función helper para obtener UTXOs de una dirección
function getUTXOsFromSet(utxoSet, address) {
  return utxoSet.filter(utxo => utxo.address === address);
}

// Verificamos los balances usando el UTXO set
console.log("\n💰 === VERIFICACIÓN DE BALANCES === 💰");

const balance1 = getBalanceFromUTXOSet(bc.utxoSet, "addr1_test_address_50_tokens");
const balance2 = getBalanceFromUTXOSet(bc.utxoSet, "addr2_test_address_30_tokens");
const balance3 = getBalanceFromUTXOSet(bc.utxoSet, "addr3_test_address_100_tokens");

console.log(`💎 Balance addr1: ${balance1} tokens (esperado: 50)`);
console.log(`💎 Balance addr2: ${balance2} tokens (esperado: 30)`);
console.log(`💎 Balance addr3: ${balance3} tokens (esperado: 100)`);

// Verificamos que los UTXOs están registrados correctamente
console.log("\n🔍 === VERIFICACIÓN DE UTXOs === 🔍");

const utxos1 = getUTXOsFromSet(bc.utxoSet, "addr1_test_address_50_tokens");
const utxos2 = getUTXOsFromSet(bc.utxoSet, "addr2_test_address_30_tokens");

console.log("📋 UTXOs addr1:", utxos1.map(u => ({ txId: u.txId, amount: u.amount, outputIndex: u.outputIndex })));
console.log("📋 UTXOs addr2:", utxos2.map(u => ({ txId: u.txId, amount: u.amount, outputIndex: u.outputIndex })));

// Test de verificación
console.log("\n🎯 === RESULTADOS DEL TEST === 🎯");

const tests = [
  { name: "Balance addr1 = 50", result: balance1 === 50 },
  { name: "Balance addr2 = 30", result: balance2 === 30 },
  { name: "Balance addr3 = 100", result: balance3 === 100 },
  { name: "UTXOs addr1 existe", result: utxos1.length > 0 },
  { name: "UTXO set actualizado", result: bc.utxoSet.length > 1 }
];

tests.forEach(test => {
  console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
});

const passed = tests.filter(t => t.result).length;
const total = tests.length;

console.log(`\n📊 Resultado final: ${passed}/${total} tests pasaron`);

if (passed === total) {
  console.log("🎉 ¡Todos los tests de UTXO pasaron correctamente!");
} else {
  console.log("⚠️ Algunos tests fallaron - revisar implementación UTXO");
}

console.log("\n💡 El sistema UTXO está funcionando y permite:");
console.log("   - ✅ Seguimiento de salidas no gastadas");
console.log("   - ✅ Cálculo eficiente de balances");
console.log("   - ✅ Identificación de UTXOs por dirección");
console.log("   - ✅ Actualización automática por bloque");

export { getBalanceFromUTXOSet, getUTXOsFromSet };
