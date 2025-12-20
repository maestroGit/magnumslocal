# Wallet Global en Magnumsmaster

## ¿Qué es la wallet global?
La wallet global es la clave pública y privada principal que utiliza el servidor para firmar y gestionar transacciones en la blockchain local de cada bodega.

- Se genera automáticamente al instalar el servidor por primera vez.
- Se guarda en el archivo `app/uploads/wallet_default.json`.
- Si el archivo ya existe, se reutiliza la misma wallet en cada reinicio.
- Si se copia este archivo entre servidores, todos compartirán la misma wallet global.

## Ubicación del archivo
- Ruta: `app/uploads/wallet_default.json`
- Contenido:
  ```json
  {
    "publicKey": "...",
    "privateKey": "..."
  }
  ```
# INICIO 
 logic for the initial allocation of 500 units to the global wallet is implemented in the genesis block creation in magnumslocal. In the file src/block.js, the getGenesisBlock() method creates a transaction in the genesis block with an output of 500 units assigned to the public key found in wallet_default.json (or a default public key if the file is missing).

This transaction is included in the genesisData array, and when the blockchain is initialized (src/blockchain.js), the UTXO set is updated to reflect this allocation, making the 500 units available to the global wallet.

## Uso en transacciones burn (baja de token)
- La wallet global se utiliza para firmar las transacciones de baja (burn) cuando se retira un token de la circulación.
- El endpoint `/baja-token` valida el propietario y utiliza la wallet global para crear y firmar la transacción de burn.
- Esto garantiza que solo el servidor autorizado puede retirar (quemar) tokens.

## Recomendaciones
- Mantén el archivo `wallet_default.json` seguro y privado.
- Si necesitas que varias bodegas compartan la misma wallet, distribuye el archivo manualmente.
- Para mayor seguridad, cada bodega debería tener su propia wallet única.

## Ejemplo de uso
- Al iniciar el servidor, se carga la wallet global:
  ```js
  if (fs.existsSync(walletPath)) {
    keyPairData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
    global.wallet = new Wallet(
      keyPairData.publicKey,
      INITIAL_BALANCE,
      keyPairData.privateKey
    );
  } else {
    global.wallet = new Wallet();
    // ...
  }
  ```
- En el endpoint `/baja-token`, la wallet global firma la transacción de burn:
  ```js
  const bajaTransaction = global.wallet.createTransaction(
    destino,
    totalAmount,
    bc,
    tp,
    bc.utxoSet
  );
  ```

---

**Última actualización:** 2025-10-14
