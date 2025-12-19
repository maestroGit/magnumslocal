import { coinSelectUTXO } from '../wallet.js';

// Test básico para sugerirCombinacionesUTXO
const utxoSet = [
  { txId: 'a', outputIndex: 0, amount: 5 },
  { txId: 'b', outputIndex: 0, amount: 10 },
  { txId: 'c', outputIndex: 0, amount: 20 },
  { txId: 'd', outputIndex: 0, amount: 50 },
];

const amount = 15;
const combos = coinSelectUTXO(utxoSet, amount);

console.log('Combinaciones para amount =', amount);
combos.forEach((combo, i) => {
  console.log(`Opción ${i + 1}:`, combo.map(u => `${u.txId}:${u.outputIndex} (${u.amount})`).join(', '));
});

// Puedes añadir más casos y aserciones si usas un framework de test
