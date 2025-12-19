import { Transaction } from "./transactions.js";

// TransactionsPool es un conjunto de transacciones que aún no han sido incluidas en la blockchain. Esta pool recoge todas las transacciones pendientes y está lista para que sean minadas y añadidas a la cadena de bloques
class TransactionsPool {
  constructor() {
    this.transactions = [];
  }

  toString() {
    console.log(this.transactions);
    return console.log("All transactionsPool");
  }

  // Actualizar la pool de transacciones o añadir una nueva transacción en la pool
  updateOrAddTransaction(transaction) {
    console.log('Añadiendo o actualizando transacción:', transaction);
    console.log('Contenido actual de this.transactions:', this.transactions);
    // Verificación de doble gasto UTXO en mempool
    // Por cada input de la transacción, verifica si ya está referenciado en otra transacción pendiente
    if (Array.isArray(transaction.inputs) && transaction.inputs.length > 0) {
      for (const input of transaction.inputs) {
        // Busca si algún input con mismo txId y outputIndex ya está en la mempool
        const doubleSpend = this.transactions.some(t =>
          Array.isArray(t.inputs) && t.inputs.some(i => i.txId === input.txId && i.outputIndex === input.outputIndex)
        );
        if (doubleSpend) {
          console.warn(`[UTXO MEMPOOL] Doble gasto detectado: txId=${input.txId}, outputIndex=${input.outputIndex}. Transacción rechazada por transacción duplicada pendiente de registro/minado.`);
          return false; // Rechaza la transacción
        }
      }
    }
    let transactionWithId = this.transactions.find(
      (t) => t.id === transaction.id
    );
    if (transactionWithId) {
      console.log('Transacción existente encontrada:', transactionWithId);
      this.transactions[this.transactions.indexOf(transactionWithId)] = transaction;
      console.log('Transacción actualizada en la pool:', transaction);
    } else {
      this.transactions.push(transaction);
      console.log('Nueva transacción añadida a la pool:', transaction);
    }
    console.log('Contenido actualizado de this.transactions:', this.transactions);
    return true; // Transacción añadida correctamente
  }

  // Busca una transacción en la pool por dirección (modelo UTXO: busca si algún input tiene esa address)
  existingTransaction(address) {
    console.log("Verificando transacción existente para la dirección:", address);
    console.log("Contenido de this.transactions:", this.transactions);
    if (!Array.isArray(this.transactions) || this.transactions.length === 0) {
      console.log("No hay transacciones en la pool");
      return undefined;
    }
    // Busca si algún input de alguna transacción tiene la address dada
    return this.transactions.find(
      (t) => Array.isArray(t.inputs) && t.inputs.some(input => input.address === address)
    );
  }

  // Método para verificar que las transacciones recibidas son correctas (modelo UTXO)
  validTransactions() {
    return this.transactions.filter((transaction) => {
      // Las transacciones de recompensa (reward) no tienen inputs, son válidas
      if (!Array.isArray(transaction.inputs) || transaction.inputs.length === 0) {
        // Si no tiene inputs, debe tener outputs válidos (transacción de recompensa)
        if (!Array.isArray(transaction.outputs) || transaction.outputs.length === 0) {
          return false;
        }
        // Para transacciones de recompensa, solo verificar que los outputs tengan amounts válidos
        return transaction.outputs.every(output => output.amount >= 0);
      }
      
      // Para transacciones normales, debe tener inputs y outputs
      if (!Array.isArray(transaction.outputs) || transaction.outputs.length === 0) {
        return false;
      }
      
      // Suma total de inputs y outputs
      const inputTotal = transaction.inputs.reduce((total, input) => total + (input.amount || 0), 0);
      const outputTotal = transaction.outputs.reduce((total, output) => total + (output.amount || 0), 0);
      
      // Valida que la suma de los inputs sea igual a la suma de los outputs
      if (inputTotal !== outputTotal) {
        console.log(`Invalid transaction: inputs sum ${inputTotal} != outputs sum ${outputTotal}`);
        return false;
      }
      
      // Verifica la firma de la transacción
      if (!Transaction.verifyTransaction(transaction)) {
        console.log(`Invalid signature in transaction ${transaction.id}`);
        return false;
      }
      
      return true;
    });
  }

  clear() {
    this.transactions = [];
  }
}

export { TransactionsPool };