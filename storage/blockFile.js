// storage/blockFile.js
// Módulo para persistencia binaria secuencial de bloques (blkNNNNN.dat)
// Provee funciones: writeBlockToFile(block), readBlockSeq(filePath, offset)

import fs from 'fs';
import path from 'path';

/**
 * Serializa un bloque a Buffer binario compacto.
 * Por ahora usa JSON.stringify, luego se puede optimizar a binario puro.
 * @param {Block} block
 * @returns {Buffer}
 */
export function blockToBuffer(block) {
  const json = JSON.stringify(block);
  return Buffer.from(json, 'utf8');
}

/**
 * Deserializa un Buffer a objeto Block.
 * @param {Buffer} buf
 * @returns {Block}
 */
export function bufferToBlock(buf) {
  const json = buf.toString('utf8');
  return JSON.parse(json);
}

/**
 * Escribe un bloque al final del archivo binario (append only).
 * Precede el bloque con 4 bytes (UInt32BE) de longitud.
 * @param {string} filePath
 * @param {Block} block
 * @returns {Promise<{offset:number, length:number}>}
 */
/**
 * Escribe un bloque al final del archivo binario (append only),
 * rotando el archivo si supera 128MB.
 * @param {string} filePath - Ruta base (ej: blk00000.dat)
 * @param {Block} block
 * @returns {Promise<{filePath:string, offset:number, length:number}>}
 */
export async function writeBlockToFile(filePath, block) {
  const MAX_SIZE = 128 * 1024 * 1024; // 128MB
  let currentPath = filePath;
  // Asegura que el directorio existe antes de abrir el archivo
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  let fd = await fs.promises.open(currentPath, 'a');
  let { size: offset } = await fd.stat();
  // Si el archivo supera el tamaño máximo, rotar
  if (offset >= MAX_SIZE) {
    await fd.close();
    // Extraer número de archivo actual
    const base = path.basename(filePath);
    const match = base.match(/blk(\d{5})\.dat/);
    let num = match ? parseInt(match[1], 10) : 0;
    num++;
    currentPath = path.join(dir, `blk${num.toString().padStart(5, '0')}.dat`);
    fd = await fs.promises.open(currentPath, 'a');
    offset = 0;
  }
  const blockBuf = blockToBuffer(block);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(blockBuf.length, 0);
  await fd.write(lenBuf);
  await fd.write(blockBuf);
  await fd.close();
  return { filePath: currentPath, offset, length: blockBuf.length };
}

/**
 * Lee bloques secuencialmente desde un archivo binario.
 * Llama a onBlock(block, offset, length) por cada bloque leído.
 * @param {string} filePath
 * @param {(block, offset, length) => void} onBlock
 * @returns {Promise<void>}
 */
export async function readBlockSeq(filePath, onBlock) {
  const fd = await fs.promises.open(filePath, 'r');
  let offset = 0;
  const stat = await fd.stat();
  while (offset < stat.size) {
    const lenBuf = Buffer.alloc(4);
    await fd.read(lenBuf, 0, 4, offset);
    const blockLen = lenBuf.readUInt32BE(0);
    const blockBuf = Buffer.alloc(blockLen);
    await fd.read(blockBuf, 0, blockLen, offset + 4);
    const block = bufferToBlock(blockBuf);
    onBlock(block, offset, blockLen);
    offset += 4 + blockLen;
  }
  await fd.close();
}
