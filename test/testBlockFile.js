// test/testBlockFile.js
// Script para probar la persistencia binaria de la blockchain


import { Blockchain } from '../src/blockchain.js';
import path from 'path';

async function main() {
  const blockFilePath = path.resolve('storage', 'data', 'blk00000.dat');
  const blockchain = new Blockchain({ blockFilePath });
  await blockchain.initialize();
  console.log('Blockchain inicializada. Bloques en memoria:', blockchain.chain.length);

  // Añadir un bloque de prueba
  const data = [{ from: 'A', to: 'B', amount: 42, timestamp: Date.now() }];
  const block = await blockchain.addBlock(data);
  console.log('Bloque añadido:', block);

  // Reinicializar para comprobar lectura desde disco
  const blockchain2 = new Blockchain({ blockFilePath });
  await blockchain2.initialize();
  console.log('Blockchain restaurada desde disco. Bloques:', blockchain2.chain.length);
  console.log('Último bloque:', blockchain2.getPreviousBlock());
}

main().catch(console.error);
