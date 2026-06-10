import fs from 'fs';
import os from 'os';
import path from 'path';

import { Blockchain } from '../src/blockchain.js';
import { Transaction } from '../wallet/transactions.js';
import { Wallet } from '../wallet/wallet.js';

describe('Blockchain UTXO spend protection', () => {
  test('does not include a replay transaction that spends an already-consumed UTXO', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magnum-utxo-'));
    const blockFilePath = path.join(tmpDir, 'blk.dat');
    const blockchain = new Blockchain({ blockFilePath });

    await blockchain.initialize();

    const sender = new Wallet();
    const recipient = new Wallet();

    await blockchain.addBlock([
      {
        id: 'fund-test-utxo',
        inputs: [],
        outputs: [{ amount: 50, address: sender.publicKey }],
      },
    ]);

    const spendTx = Transaction.newTransaction(sender, recipient.publicKey, 30, 50, blockchain.utxoSet);

    expect(spendTx).not.toBeNull();

    await blockchain.addBlock([spendTx]);

    const replayTx = { ...spendTx, id: `${spendTx.id}-replay` };
    const replayBlock = await blockchain.addBlock([replayTx]);

    expect(replayBlock.data).toHaveLength(0);
    expect(
      blockchain.utxoSet.some((utxo) => utxo.txId === 'fund-test-utxo' && utxo.outputIndex === 0)
    ).toBe(false);
  });
});