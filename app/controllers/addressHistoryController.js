// app/controllers/addressHistoryController.js

// Controlador para endpoint de historial de dirección

const getAddressHistory = (req, res) => {
  const { address } = req.params;
  const { bc, tp, globalWallet } = global;
  let history = [];
  const WALLET_GLOBAL = globalWallet && globalWallet.publicKey ? globalWallet.publicKey : null;

  for (const [blockIndex, block] of bc.chain.entries()) {
    for (const tx of block.data) {
      tx.outputs.forEach((output, idx) => {
        if (output.address === address) {
          history.push({
            txId: tx.id,
            type: "recibido",
            amount: output.amount,
            blockHash: block.hash,
            blockTimestamp: block.timestamp,
            blockIndex,
            timestamp: tx.timestamp,
            outputIndex: idx,
            status: "mined",
            destino: address,
            from: tx.inputs.map((inp) => inp.address),
          });
        }
      });
      tx.inputs.forEach((input, idx) => {
        if (input.address === address) {
          let tipoOperacion = "transferida";
          let destino = null;
          tx.outputs.forEach((output, oidx) => {
            if (output.address && output.address.startsWith("0x0000000000000000000000000000000000000000")) {
              tipoOperacion = "opened";
              destino = output.address;
            } else if (WALLET_GLOBAL && output.address === WALLET_GLOBAL) {
              tipoOperacion = "devuelta";
              destino = WALLET_GLOBAL;
            }
          });
          history.push({
            txId: tx.id,
            type: tipoOperacion,
            amount: input.amount,
            blockHash: block.hash,
            blockTimestamp: block.timestamp,
            blockIndex,
            timestamp: tx.timestamp,
            inputIndex: idx,
            destino,
            to: tx.outputs.map((out) => out.address),
            status: "mined",
          });
        }
      });
    }
  }
  for (const tx of tp.transactions) {
    tx.outputs.forEach((output, idx) => {
      if (output.address === address) {
        history.push({
          txId: tx.id,
          type: "recibido",
          amount: output.amount,
          blockHash: null,
          timestamp: tx.timestamp,
          outputIndex: idx,
          status: "pending",
          destino: address,
          from: tx.inputs.map((inp) => inp.address),
        });
      }
    });
    tx.inputs.forEach((input, idx) => {
      if (input.address === address) {
        let tipoOperacion = "transferida";
        let destino = null;
        tx.outputs.forEach((output, oidx) => {
          if (output.address && output.address.startsWith("0x0000000000000000000000000000000000000000")) {
            tipoOperacion = "opened";
            destino = output.address;
          } else if (WALLET_GLOBAL && output.address === WALLET_GLOBAL) {
            tipoOperacion = "devuelta";
            destino = WALLET_GLOBAL;
          }
        });
        history.push({
          txId: tx.id,
          type: tipoOperacion,
          amount: input.amount,
          blockHash: null,
          timestamp: tx.timestamp,
          inputIndex: idx,
          destino,
          to: tx.outputs.map((out) => out.address),
          status: "pending",
        });
      }
    });
  }
  history.sort((a, b) => b.timestamp - a.timestamp);
  res.json({ address, history });
};

export { getAddressHistory };
