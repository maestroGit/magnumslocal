import { readBlockSeq } from '../storage/blockFile.js';

const ADDRESS = '04ba6294316f84470d7efe5cf11893fe88fedca4b186642d8758b82cf7878ad059d524aa8e72d32c813d22e3803301f95d365dd78ded56eccd7581ecb23d1472ee';
const filePath = 'c:/Users/maest/Documents/magnumslocal/storage/data/blk00000.dat';

let outputsToAddress = [];
let inputsFromAddress = [];

await readBlockSeq(filePath, (block, _offset, _len) => {
  const txs = Array.isArray(block?.data)
    ? block.data
    : Array.isArray(block?.transactions)
      ? block.transactions
      : [];

  txs.forEach((tx) => {
    const outputs = Array.isArray(tx?.outputs) ? tx.outputs : [];
    outputs.forEach((out, idx) => {
      if (String(out?.address || '') === ADDRESS) {
        outputsToAddress.push({
          blockHash: block?.hash || block?.id || null,
          txId: tx?.id || null,
          outputIndex: idx,
          amount: Number(out?.amount || 0)
        });
      }
    });

    const inputs = Array.isArray(tx?.inputs) ? tx.inputs : [];
    inputs.forEach((inp) => {
      if (String(inp?.address || '') === ADDRESS) {
        inputsFromAddress.push({
          blockHash: block?.hash || block?.id || null,
          txId: tx?.id || null,
          spendsTxId: inp?.txId || null,
          spendsOutputIndex: inp?.outputIndex,
          amount: Number(inp?.amount || 0)
        });
      }
    });
  });
});

console.log('outputsToAddress:', outputsToAddress.length);
console.table(outputsToAddress.slice(0, 20));
console.log('inputsFromAddress:', inputsFromAddress.length);
console.table(inputsFromAddress.slice(0, 20));

const spentSet = new Set(inputsFromAddress.map(i => `${i.spendsTxId}:${i.spendsOutputIndex}`));
const unspent = outputsToAddress.filter(o => !spentSet.has(`${o.txId}:${o.outputIndex}`));
const balance = unspent.reduce((s, u) => s + Number(u.amount || 0), 0);

console.log('unspentCount:', unspent.length);
console.log('unspentBalance:', balance);
console.table(unspent.slice(0, 20));
