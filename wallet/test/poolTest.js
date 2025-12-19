// Test transaction pool
// Importar las clases:
import { Wallet } from "../index.js";
import { Transaction } from "../transactions.js"; 
import { TransactionsPool } from "../transactionsPool.js";


//console.log("----WALLETS----");
const wallet1 = new Wallet();
const wallet2 = new Wallet();
const wallet3 = new Wallet();

const tp = new TransactionsPool();
//console.log("----tp----");
//tp.toString();
//console.log(tp);
//console.log(typeof(tp));

// Cuando las creo es cuando pasa la verificación
const tx1 = wallet1.createTransaction('primeraprimera',300,tp);
const tx2 = wallet2.createTransaction('segundasegunda',200,tp);
const tx3 = wallet3.createTransaction('tercerartercera',900,tp);

// Parameter Tampering: Modificamos importe para que sea inválida la transacción
tx3.input.amount = 2000;

// Verificar el estado de la transacción aquí, antes de la alteración. 
// Después de pasar !Transaction.verifyTransaction().Es cuando hacemos la alteración y ya no vueleve a pasar verifyTransaction().
// Lo qué no sé es porque, el test funciona y al llamar console.log(tp.validTransactions()); No 
console.log("Transacción tx2 antes de modificar la firma:", tx2);
// Parameter Tampering: Alteramos firma electrónica de la transacción
//tx2.input.signature = '5'.repeat(32); No peta ???
//No peta ??? ISSU VIDEO 48
tx2.input.signature = wallet2.sign('5'.repeat(32));
// Verificar alteración de la firma
console.log("Transacción tx2 después de modificar la firma:", tx2);
// Verificamos la transacción
// if (!Transaction.verifyTransaction(tx2)) {
//     console.log(`Invalid -test-signature from ${tx2.input.address}`);
// } else {
//     console.log('Signature is valid');
// }

// Mostrar solo Salidas Ouputs
console.log("----TEST FILE outputs----");
console.log(tx1.outputs);
console.log(tx2.outputs);
console.log(tx3.outputs);

console.log(tp.validTransactions());


////////// anteiro
// const tx = Transaction.newTransaction(wallet1, "hellowordtransaction", 20);
// //console.log(tx.toString());
// // Añadir transacción a la pool
// console.log("Actualizaremos la tp pool");
// // Debug aquí !!!!!
// tp.updateOrAddTransaction(tx);// Actualizamos la pool de transacciones no la añadimos porque no hay ninguna transacción en la pool
// console.log(tp); // TransactionsPool { transactions: [ undefined ] }

// //console.log(tp.transactions.find(t => t.id === tx.id)=== tx); // Encontrar la transacción en la pool con id igual a tx.id
// // true => hemos encontrado la transacción en la pool con id igual a tx.id

// // const newtx = tx.update(wallet1, "Anothertransaction", 50);
// // tp.updateOrAddTransaction(newtx);

// //console.log(tp.transactions.find(t => t.id === newtx.id)=== newtx); // Encontrar la transacción en la pool con id igual a newtx.id
// // true => hemos encontrado la transacción en la pool con id igual a newtx.id


// // existingTransaction pdt test
// const existingTransaction = tp.existingTransaction(wallet1.publickey); // Buscamos la transacción en la pool de transacciones con la dirección de la wallet
// console.log(existingTransaction); // Mostramos la transacción
// // Verificar si la transacción existe
// if (existingTransaction) {
//     console.log("Transaction found:", existingTransaction);
//     console.log("Transaction ID:", existingTransaction.id);
//     console.log("Transaction outputs:", existingTransaction.outputs);
//     console.log("Transaction amount:", existingTransaction.outputs.find(output => output.address === wallet1.publickey).amount);
//   } else {
//     console.log("Transaction not found");
//   }

