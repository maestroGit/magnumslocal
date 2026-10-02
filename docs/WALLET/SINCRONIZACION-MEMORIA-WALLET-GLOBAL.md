# Sincronización Atómica de Referencias de Wallet en Memoria Viva

## 1. Contexto y Propósito

En la arquitectura del backend de BlocksWine (`magnumslocal` y `magnumsmaster`), el servidor Node.js mantiene en memoria referencias a la wallet activa del nodo para diversas responsabilidades:
- **Consultas de balance y UTXOs:** endpoints como `/utxo-balance/global` o `/wallet/global`.
- **Firma de transacciones en backend (Modo Bodega):** endpoint `/transaction`.
- **Recompensas de minado (PoW):** instancia del minero `miner.wallet`.
- **Persistencia en disco:** archivo `app/uploads/wallet_default.json`.

Cuando un usuario de bodega sube un nuevo keystore mediante el botón **Upload** de la card **Winery** (que invoca a `POST /wallet/load-global`), es crítico que **todas las referencias en memoria viva se actualicen simultáneamente y de manera atómica**, sin requerir un reinicio manual del servidor Node.js.

---

## 2. El Problema Original: Desincronización en Memoria Viva (Split-Brain)

### 2.1 Coexistencia de Múltiples Variables Globales
Por evolución histórica y refactorizaciones modulares, el servidor utilizaba tres variables globales para interactuar con la wallet:
1. `global.globalWallet`: Instancia de la clase `Wallet` utilizada por los controladores modernos (ej. `utxoController.js`).
2. `global.wallet`: Instancia heredada (*legacy*) utilizada por flujos de minado (`miningController.js`), firmas (`bajaToken`) y consultas de clave pública.
3. `global.serverKeystore`: Objeto JSON del keystore cifrado (PBKDF2 + AES-GCM) utilizado por `transactionController.js` para descifrar la clave privada con la passphrase.
4. `global.miner.wallet`: Referencia asignada al objeto `Miner` para destinar las recompensas de bloque.

### 2.2 El Fallo de `loadGlobalWallet`
Al ejecutar `POST /wallet/load-global`, el controlador `walletController.js`:
- Descifraba la clave privada y creaba una nueva instancia de `Wallet`.
- Asignaba **únicamente** `global.globalWallet = globalWallet;`.
- Sobrescribía el archivo `wallet_default.json` en disco.
- **Omitía actualizar** `global.wallet`, `global.serverKeystore` y `global.miner.wallet` en la memoria del proceso en ejecución.

```
                  ┌───────────────────────────────┐
                  │ POST /wallet/load-global     │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
[Actualizado en RAM]                              [Omitido en RAM - Estado Antiguo]
global.globalWallet = Nueva Wallet               global.wallet = Wallet Génesis
wallet_default.json (Disco)                       global.serverKeystore = Keystore Génesis
                                                  global.miner.wallet = Wallet Génesis
```

### 2.3 Síntoma y Error Resultante
Este desfase provocaba un choque entre la visualización y la firma:
1. **Consulta (/utxo-balance/global):** Leía `global.globalWallet`, mostrando los UTXOs vigentes de la nueva wallet (por ejemplo, 187 Magnums de la dirección `04ba6294...`).
2. **Firma (/transaction en modo bodega):** Leía `global.serverKeystore` y `global.wallet`, pretendiendo firmar con la clave privada de la wallet Génesis (`04b2201e...`).
3. **Validación de Salvaguarda (`buildSelectedUtxoSet`):** Comprobaba la propiedad del UTXO:
   ```javascript
   if (matchingUtxo.address !== walletPublicKey) {
     throw new Error(`Selected UTXO does not belong to active wallet: ${input.txId}:${input.outputIndex}`);
   }
   ```
   Como el UTXO pertenecía a `04ba6294...` pero el backend pretendía firmar con `04b2201e...`, la validación abortaba la operación para impedir emitir una transacción inválida o corrupta.

---

## 3. Solución Implementada: Sincronización Atómica en Memoria

Se corrigió [`app/controllers/walletController.js`](file:///c:/Users/maest/Documents/magnumslocal/app/controllers/walletController.js) para sincronizar inmediatamente todas las referencias vivas del proceso.

### 3.1 En `loadGlobalWallet` (POST `/wallet/load-global`)
Tras descifrar la clave privada y generar la clave pública derivada del keyPair:

```javascript
    let globalWallet = new global.Wallet(null, undefined, privateKeyBuf.toString("hex"));
    if (globalWallet.keyPair && globalWallet.keyPair.getPublic) {
      globalWallet.publicKey = globalWallet.keyPair.getPublic().encode("hex");
    }

    // ✅ Sincronizar todas las referencias en memoria viva
    global.globalWallet = globalWallet;
    global.wallet = globalWallet;
    global.serverKeystore = keystore;
    if (global.miner) {
      global.miner.wallet = globalWallet;
      console.log("[LOAD-GLOBAL] Miner wallet sincronizada con la nueva wallet global");
    }

    // Persistencia física en disco
    const walletPath = path.join(
      global.__dirname,
      "./app/uploads/wallet_default.json"
    );
    fs.writeFileSync(walletPath, JSON.stringify(keystore, null, 2), "utf8");
    console.log("[LOAD-GLOBAL] ✅ Wallet global y referencias en memoria actualizadas.");
```

### 3.2 En `hardwareAddress` (POST `/hardware-address`)
Se añadió la sincronización para paridad cuando se carga una wallet por archivo/USB:

```javascript
    global.wallet = new global.Wallet(publicKey, global.INITIAL_BALANCE, privateKey);
    global.globalWallet = global.wallet; // ✅ Sincronización en memoria
    if (!(process.env.NODE_ENV === "test" || process.env.NO_P2P === "true")) {
      global.miner = new global.Miner(global.bc, global.tp, global.wallet, global.p2pServer);
      console.log("[POST /hardware-address] Miner actualizado con wallet global descifrada");
    }
```

---

## 4. Matriz de Estado tras la Sincronización

| Variable / Recurso | Antes del Fix (Desincronizado) | Después del Fix (Atómico) |
| :--- | :--- | :--- |
| **`global.globalWallet`** | Nueva Wallet (`04ba6294...`) | Nueva Wallet (`04ba6294...`) ✅ |
| **`global.wallet`** | Wallet Anterior (`04b2201e...`) ❌ | Nueva Wallet (`04ba6294...`) ✅ |
| **`global.serverKeystore`** | Keystore Anterior (`04b2201e...`) ❌ | Nuevo Keystore (`04ba6294...`) ✅ |
| **`global.miner.wallet`** | Wallet Anterior (`04b2201e...`) ❌ | Nueva Wallet (`04ba6294...`) ✅ |
| **`wallet_default.json`** | Sobrescrito en disco ✅ | Sobrescrito en disco ✅ |

---

## 5. Beneficios Operativos y de Seguridad

1. **Gasto Correcto de UTXOs Vigentes:** Cuando una bodega recibe fondos (como el UTXO vigente de 187 Magnums tras el minado del Bloque #1), puede gastarlos de inmediato cargando su keystore, sin errores de propiedad.
2. **Sin Necesidad de Reiniciar el Servidor:** La actualización se aplica en caliente en la memoria del runtime Node.js.
3. **Consistencia en Minado:** Los bloques que se minen a continuación asignarán las recompensas de minero (`miner.mine()`) a la wallet recién cargada.
4. **Paridad Total:** Comportamiento idéntico y seguro garantizado tanto en desarrollo local (`magnumslocal`) como en producción (`magnumsmaster`).
