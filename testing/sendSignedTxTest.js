// script de prueba que:
// Usa una clave privada de wallet local (o genera una temporal).
// Consulta los UTXOs asociados a la clave pública.
// Si no hay fondos, solicita al servidor que transfiera fondos de prueba y mina un bloque.
// Construye y firma una transacción de 5 unidades (enviada a sí mismo).
// Envía la transacción firmada al endpoint /transaction del servidor.
// Muestra las respuestas y termina.

import fs from 'fs';
import fetch from 'node-fetch';
import elliptic from 'elliptic';
import CryptoJS from 'crypto-js';

const { ec: EC } = elliptic;
const ec = new EC('secp256k1');

(async function(){
  try {
    // Use the server's wallet file if exists to create funds for testing
    const walletPath = './app/uploads/wallet_default.json';
    let priv;
    if (fs.existsSync(walletPath)){
      const data = JSON.parse(fs.readFileSync(walletPath,'utf8'));
      priv = data.privateKey;
      console.log('Using server wallet privateKey from', walletPath);
    } else {
      // generate new keypair
      const key = ec.genKeyPair();
      priv = key.getPrivate('hex');
      console.log('Generated temporary keypair');
    }

    // Derive public key
    const keyPair = ec.keyFromPrivate(priv,'hex');
    const pub = keyPair.getPublic().encode('hex');
    console.log('Public:', pub.slice(0,16)+'...');

    // Query utxos for this pub
    const utxoRes = await fetch('http://localhost:3000/utxo-balance/'+encodeURIComponent(pub));
    const utxoJson = await utxoRes.json();
    console.log('UTXOs for pub:', utxoJson);

    let utxos = utxoJson.utxos || [];
    // If no utxos, try to fund this address using server global wallet by posting a transaction server-side
    if (!utxos || utxos.length === 0){
      console.log('No UTXOs, attempting to create a simple transaction from server global wallet to this address');
      const r = await fetch('http://localhost:3000/transaction', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ recipient: pub, amount: 10 })
      });
      const jr = await r.json();
      console.log('Server response to funding tx:', jr);
      // Mine the transaction so it's in the chain (call mine)
      await fetch('http://localhost:3000/mine', { method: 'POST' });
      // Re-fetch utxos
      const utxoRes2 = await fetch('http://localhost:3000/utxo-balance/'+encodeURIComponent(pub));
      const utxoJson2 = await utxoRes2.json();
      utxos = utxoJson2.utxos || [];
      console.log('UTXOs after funding:', utxos);
    }

    if (!utxos || utxos.length === 0){
      console.error('Still no UTXOs - cannot proceed');
      process.exit(1);
    }

    // Build inputs selecting enough utxos to cover 5 units
    const amount = 5;
    let total = 0; const selected = [];
    for (const u of utxos){ selected.push(u); total += u.amount; if (total >= amount) break; }

    if (total < amount){ console.error('Insufficient funds in utxos'); process.exit(1); }

    const inputs = selected.map(u => ({ txId: u.txId, outputIndex: u.outputIndex, address: pub, amount: u.amount }));
    const outputs = [{ amount, address: pub }]; // send to self for test
    const change = total - amount; if (change>0) outputs.push({ amount: change, address: pub });

    const outputsHash = CryptoJS.SHA256(JSON.stringify(outputs)).toString();
    const sig = keyPair.sign(outputsHash);
    const signature = { r: sig.r.toString(16), s: sig.s.toString(16) };
    const signedInputs = inputs.map(i => ({ ...i, signature }));
    const hash1 = CryptoJS.SHA256(JSON.stringify({ inputs: signedInputs, outputs })).toString();
    const txId = CryptoJS.SHA256(hash1).toString();

    const signedTransaction = { id: txId, inputs: signedInputs, outputs };
    console.log('Signed transaction ready, posting to server...');

    const resp = await fetch('http://localhost:3000/transaction', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ signedTransaction })});
    const respJson = await resp.json();
    console.log('Server response to signedTransaction POST:', respJson);

    process.exit(0);
  } catch (err){
    console.error('Error in test script', err);
    process.exit(1);
  }
})();
