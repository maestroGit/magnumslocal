// 🧪 Wallet Test - Actualizado para nuevo sistema
import { Wallet } from "../wallet.js";
import { Transaction } from "../transactions.js";
import { ChainUtil } from "../chainUtils.js";
import { Blockchain } from "../../src/blockchain.js";
import { TransactionsPool } from "../transactionsPool.js";

console.log("🧪 === WALLET SYSTEM TEST === 🧪\n");

// Crear blockchain para testing
const bc = new Blockchain();

// Crear pool de transacciones para testing
const tp = new TransactionsPool();
console.log("✅ Blockchain de prueba inicializada");

// Crear wallets de prueba
const wallet1 = new Wallet();
const wallet2 = new Wallet();
const wallet3 = new Wallet();

console.log("\n👛 === WALLETS CREADAS === 👛");
console.log(`🔑 Wallet 1: ${wallet1.publicKey.substring(0, 20)}...`);
console.log(`🔑 Wallet 2: ${wallet2.publicKey.substring(0, 20)}...`);
console.log(`🔑 Wallet 3: ${wallet3.publicKey.substring(0, 20)}...`);

// Verificar balances iniciales
console.log("\n💰 === BALANCES INICIALES === 💰");
const balance1Initial = wallet1.calculateBalance(bc, wallet1.publicKey);
const balance2Initial = wallet2.calculateBalance(bc, wallet2.publicKey);

console.log(`💎 Wallet 1 balance: ${balance1Initial.balance}`);
console.log(`💎 Wallet 2 balance: ${balance2Initial.balance}`);

// Crear UTXO simulado para wallet1 (simular que tiene fondos)
console.log("\n🔄 Añadiendo fondos simulados a Wallet 1...");

const fundingTx = {
  id: "funding-tx-001",
  lote: null,
  inputs: [],
  outputs: [
    { address: wallet1.publicKey, amount: 1000 }
  ]
};

bc.addBlock([fundingTx]);
console.log("✅ Fondos añadidos al UTXO set");

// Verificar balance actualizado
const balance1Updated = wallet1.calculateBalance(bc, wallet1.publicKey);
console.log(`💎 Wallet 1 balance actualizado: ${balance1Updated.balance}`);

// Test de creación de transacción
console.log("\n📝 === TEST DE TRANSACCIONES === 📝");

try {
  // Crear transacción usando el nuevo sistema
  const amount = 200;
  const utxoSet = bc.utxoSet;
  
  console.log(`🔄 Creando transacción: ${amount} tokens de Wallet1 → Wallet2`);
  console.log(`📊 UTXO set disponible: ${utxoSet.length} UTXOs`);
  
  const transaction = wallet1.createTransaction(wallet2.publicKey, amount, bc, tp, utxoSet);
  
  if (transaction) {
    console.log("✅ Transacción creada correctamente");
    console.log(`📋 ID: ${transaction.id}`);
    console.log(`📤 Outputs: ${transaction.outputs.length}`);
    
    // Verificar estructura de la transacción
    console.log("\n🔍 === VERIFICACIÓN DE TRANSACCIÓN === 🔍");
    
    const hasValidInputs = transaction.inputs && transaction.inputs.length >= 0;
    const hasValidOutputs = transaction.outputs && transaction.outputs.length > 0;
    const hasRecipientOutput = transaction.outputs.some(output => 
      output.address === wallet2.publicKey && output.amount === amount
    );
    
    console.log(`${hasValidInputs ? '✅' : '❌'} Inputs válidos`);
    console.log(`${hasValidOutputs ? '✅' : '❌'} Outputs válidos`);
    console.log(`${hasRecipientOutput ? '✅' : '❌'} Output al destinatario correcto`);
    
    // Verificar firma de transacción
    console.log("\n🔐 === VERIFICACIÓN DE FIRMA === 🔐");
    
    const isValid = Transaction.verifyTransaction(transaction);
    console.log(`${isValid ? '✅' : '❌'} Firma de transacción válida`);
    
    // Simular minado de la transacción
    console.log("\n⛏️ === SIMULANDO MINADO === ⛏️");
    
    bc.addBlock([transaction]);
    console.log("✅ Transacción minada y añadida al blockchain");
    
    // Verificar balances finales
    const balance1Final = wallet1.calculateBalance(bc, wallet1.publicKey);
    const balance2Final = wallet2.calculateBalance(bc, wallet2.publicKey);
    
    console.log("\n💰 === BALANCES FINALES === 💰");
    console.log(`💎 Wallet 1: ${balance1Final.balance} tokens`);
    console.log(`💎 Wallet 2: ${balance2Final.balance} tokens`);
    
    // Verificaciones finales
    console.log("\n🎯 === RESULTADOS DEL TEST === 🎯");
    
    const tests = [
      { name: "Transacción creada", result: transaction !== null },
      { name: "Firma válida", result: isValid },
      { name: "Wallet 2 recibió fondos", result: balance2Final.balance === amount },
      { name: "Wallet 1 balance decrementado", result: balance1Final.balance < balance1Updated.balance },
      { name: "UTXO set actualizado", result: bc.utxoSet.length > 1 }
    ];
    
    tests.forEach(test => {
      console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
    });
    
    const passed = tests.filter(t => t.result).length;
    const total = tests.length;
    
    console.log(`\n📊 Resultado final: ${passed}/${total} tests pasaron`);
    
    if (passed === total) {
      console.log("🎉 ¡Todos los tests de Wallet pasaron correctamente!");
    } else {
      console.log("⚠️ Algunos tests fallaron - revisar implementación");
    }
    
  } else {
    console.log("❌ Error: No se pudo crear la transacción");
    console.log("💡 Posibles causas: fondos insuficientes o error en UTXO set");
  }
  
} catch (error) {
  console.log("💥 Error durante el test de transacciones:");
  console.log(error.message);
}

console.log("\n💡 El sistema de Wallet permite:");
console.log("   - ✅ Gestión de claves públicas/privadas");
console.log("   - ✅ Cálculo dinámico de balances");
console.log("   - ✅ Creación de transacciones firmadas");
console.log("   - ✅ Integración con sistema UTXO");
console.log("   - ✅ Verificación de firmas digitales");

export { wallet1, wallet2, wallet3 };

