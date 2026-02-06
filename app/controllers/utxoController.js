// app/controllers/utxoController.js

// Controlador para endpoints de balance UTXO

const getGlobalUTXOBalance = (req, res) => {
  const { globalWallet, bc } = global;
  if (!globalWallet || !globalWallet.publicKey) {
    return res.status(404).json({ error: "No hay wallet global activa" });
  }
  const address = globalWallet.publicKey;
  const utxos = bc.utxoSet.filter((utxo) => utxo.address === address);
  const balance = utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
  res.json({ address, balance, utxos });
};

const getUTXOBalanceByAddress = (req, res) => {
  const { address } = req.params;
  const { utxoManager, bc, tp } = global;
  let utxos = utxoManager.getUTXOs(address);
  const utxosFromChain = bc.utxoSet.filter(utxo => utxo.address === address);
  // ...diferencias y logs omitidos para modularidad...
  utxos = utxos.map(utxo => ({ ...utxo, address }));

  const mempoolInputs = tp.transactions.flatMap(tx => tx.inputs || []);
  const mempoolOutputs = tp.transactions.flatMap(tx =>
    (tx.outputs || []).map((output, idx) => ({ ...output, txId: tx.id, outputIndex: idx, status: 'pending-mempool' }))
  );

  const utxosPendientesSpend = utxos.filter(utxo =>
    mempoolInputs.some(input =>
      input.txId === utxo.txId &&
      input.outputIndex === utxo.outputIndex &&
      input.address === utxo.address &&
      input.amount === utxo.amount
    )
  ).map(utxo => ({ ...utxo, status: 'pending-spend' }));

  const utxosPendientesMempool = mempoolOutputs.filter(output => output.address === address);

  const utxosDisponibles = utxos.filter(utxo =>
    !mempoolInputs.some(input =>
      input.txId === utxo.txId &&
      input.outputIndex === utxo.outputIndex &&
      input.address === utxo.address &&
      input.amount === utxo.amount
    )
  );

  const utxosPendientes = [...utxosPendientesSpend, ...utxosPendientesMempool];

  const balance = utxosDisponibles.reduce((sum, utxo) => sum + utxo.amount, 0);
  res.json({ address, balance, utxosDisponibles, utxosPendientes });
};

export { getGlobalUTXOBalance, getUTXOBalanceByAddress };
