import { ChainUtil } from '../chainUtils.js'
import { Wallet } from '../index.js';

console.log("Verify Test for signature");
// Crear una nueva wallet
const wallet = new Wallet();

// Crear un hash de datos
const dataHash = ChainUtil.hash({ data: 'example' });

// Firmar el hash de los datos
const signature = wallet.sign(dataHash);

// Verificar la firma
const isValid = ChainUtil.verifySignature(wallet.publicKey, signature, dataHash);

console.log('Is signature valid?', isValid); // Debería imprimir: Is signature valid? true