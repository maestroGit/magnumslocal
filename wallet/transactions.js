import { ChainUtil } from "./chainUtils.js";
import { MINING_REWARD } from "../config/constantConfig.js";

class Transaction {
  constructor() {
    this.id = null; // Se asigna después de definir inputs y outputs
    this.lote = null;
    // Modelo UTXO: inputs es un array
    this.inputs = [];
    this.outputs = [];
  }

  // Para envíos de fondos entre las mismas wallets y en el mismo bloque una transacción igual
  update(senderWallet, recipient, amount) {
    const senderOutput = this.outputs.find(
      (output) => output.address === senderWallet.publicKey
    );

    if (amount > senderOutput.amount) {
      console.log(`Amount: ${amount} exceeds balance`);
      return;
    }

    senderOutput.amount = senderOutput.amount - amount;
    this.outputs.push({ amount, address: recipient });
    Transaction.signTransaction(this, senderWallet);

    return this;
  }

  // Recompensas mineras
  static transactionWithOutputs(senderWallet, outputs, balance) {
    const transaction = new this();

    if (!Array.isArray(outputs)) {
      throw new TypeError("outputs must be an array");
    }

    transaction.outputs.push(...outputs);
    // Añadir entropía temporal para evitar IDs repetidos en transacciones sin inputs (rewards)
    transaction.timestamp = Date.now();
    Transaction.signTransaction(transaction, senderWallet, balance);
    // Calcular el id como SHA-256 doble de inputs + outputs (+ timestamp para unicidad)
    transaction.id = ChainUtil.hash(ChainUtil.hash({ inputs: transaction.inputs, outputs: transaction.outputs, timestamp: transaction.timestamp }));
    // Mantener 'lote' igual al id de la transacción como metadato (no se incluye en el hash)
    // Esto facilita la visualización en el frontend sin alterar firmas ni el id calculado.
    transaction.lote = transaction.id;
    console.log(transaction);
    return transaction;
  }

  static newTransaction(
    senderWallet,
    recipient,
    amount,
    balance,
    utxoSet = []
  ) {
    console.log("=== Creando nueva transacción ===");
    console.log("Sender wallet publicKey:", senderWallet.publicKey);
    console.log("Sender wallet balance (argumento):", balance);
    console.log("Recipient:", recipient);
    console.log("Amount a enviar:", amount);
    console.log("UTXO set para la wallet:", utxoSet);
    utxoSet = utxoSet || [];
    // 1. Selecciona los UTXOs suficientes para cubrir el monto
    let total = 0;
    const selectedUtxos = [];
    for (const utxo of utxoSet.filter(
      (u) => u.address === senderWallet.publicKey
    )) {
      selectedUtxos.push(utxo);
      total += utxo.amount;
      if (total >= amount) break;
    }

    if (total < amount) {
      console.log(`Amount ${amount} exceeds available UTXOs`);
      return null;
    }

    // 2. Construye los inputs usando txId y outputIndex
    const inputs = selectedUtxos.map((utxo) => ({
  txId: utxo.txId,
  outputIndex: utxo.outputIndex,
  address: utxo.address, // Usar la address real del UTXO
  amount: utxo.amount,
  // signature se añade al firmar
    }));

    // 3. Construye los outputs (destinatario y cambio)
    const outputs = [{ amount, address: recipient }];
    const change = total - amount;
    if (change > 0) {
      outputs.push({ amount: change, address: senderWallet.publicKey });
    }

  // 4. Crea la transacción y asigna inputs y outputs
  const transaction = new Transaction();
  transaction.inputs = inputs;
  transaction.outputs = outputs;

  // 5. Firma la transacción (firma cada input)
  Transaction.signTransaction(transaction, senderWallet);
  // 6. Calcular el id como SHA-256 doble de inputs + outputs
  transaction.id = ChainUtil.hash(ChainUtil.hash({ inputs: transaction.inputs, outputs: transaction.outputs }));
  // Mantener 'lote' igual al id de la transacción como metadato (no se incluye en el hash)
  // Esto facilita la visualización en el frontend sin alterar firmas ni el id calculado.
  transaction.lote = transaction.id;

  console.log("Transacción creada:", transaction);
  return transaction;
  }

  static rewardTransaction(minerWallet, senderWallet) {
    // minerWallet puede ser una instancia o un objeto { publicKey }
    const minerPub = minerWallet && minerWallet.publicKey;
    if (!minerPub) {
      throw new Error('rewardTransaction: minerWallet sin publicKey');
    }
    return Transaction.transactionWithOutputs(senderWallet, [
      {
        amount: MINING_REWARD,
        address: minerPub,
      },
    ]);
  }

  // Firma la transacción usando los inputs (firma cada input individualmente)
  static signTransaction(transaction, senderWallet, balance) {
    // Firmar cada input con la clave privada correspondiente a su address
    transaction.inputs = transaction.inputs.map((input) => {
      // Si la address del input no coincide con la del senderWallet, error
      if (input.address !== senderWallet.publicKey) {
        console.error('[signTransaction] Intento de firmar input con address distinta a la wallet activa', {inputAddress: input.address, wallet: senderWallet.publicKey});
        throw new Error('No puedes firmar un input que no te pertenece');
      }
      const signature = senderWallet.sign(ChainUtil.hash(transaction.outputs));
      return {
        ...input,
        signature,
      };
    });
  }

  // Verificar la firma de una transacción (ahora para modelo UTXO)
  static verifyTransaction(transaction) {
    // Verifica la firma de cada input
    if (!transaction.inputs || transaction.inputs.length === 0) return false;
    return transaction.inputs.every((input) =>
      ChainUtil.verifySignature(
        input.address,
        input.signature,
        ChainUtil.hash(transaction.outputs)
      )
    );
  }

  static toString() {
    return `Transaction-
        ID: ${this.id}
        inputs: ${JSON.stringify(this.inputs)}
        outputs: ${JSON.stringify(this.outputs)}`;
  }
}

export { Transaction };
