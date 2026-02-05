// Analiza el archivo blk00000.dat y muestra resumen de los bloques
import { readBlockSeq } from "../storage/blockFile.js";

const filePath = "./storage/data/blk00000.dat";

async function main() {
  let count = 0;
  const resumen = [];
  await readBlockSeq(filePath, (block, offset, len) => {
    count++;
    resumen.push({
      idx: count - 1,
      hash: block.hash,
      timestamp: block.timestamp,
      txs: (block.data || []).length,
    });
  });
  console.log("Total de bloques:", count);
  resumen.forEach(b => {
    console.log(`#${b.idx} Hash: ${b.hash} | Timestamp: ${b.timestamp} | Transacciones: ${b.txs}`);
  });
}

main().catch(console.error);
