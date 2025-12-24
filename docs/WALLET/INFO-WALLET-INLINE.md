# Documentación Técnica: `web-demo.js` (magnumslocal\public\demo-wallet)

## 1. Funciones

### Listado y descripción

- **bufToHex(b)**  
  Convierte un ArrayBuffer o Uint8Array a string hexadecimal.  
  - **Parámetros:** `b` (ArrayBuffer/Uint8Array)  
  - **Retorno:** string  
  - **Efectos secundarios:** ninguno

- **hexToBuf(hex)**  
  Convierte un string hexadecimal a Uint8Array.  
  - **Parámetros:** `hex` (string)  
  - **Retorno:** Uint8Array  
  - **Efectos secundarios:** ninguno

- **sha256Bytes(input)**  
  Calcula el hash SHA-256 de un string o buffer usando WebCrypto, con fallback JS.  
  - **Parámetros:** `input` (string o Uint8Array)  
  - **Retorno:** Promise<Uint8Array>  
  - **Efectos secundarios:** ninguno  
  - **Depende de:** funciones internas de hash (rotr, toWords, fromWords)

- **fetchUTXOs(address)**  
  Obtiene los UTXOs de una dirección vía fetch a `/utxo-balance/<address>`.  
  - **Parámetros:** `address` (string)  
  - **Retorno:** Promise<Array>  
  - **Efectos secundarios:** log de error en consola

- **normalizeKeyInput(key)**  
  Normaliza diferentes formatos de clave a Uint8Array.  
  - **Parámetros:** `key` (varios tipos)  
  - **Retorno:** Uint8Array|null  
  - **Efectos secundarios:** ninguno

- **deriveKey(pass, saltHex)**  
  Deriva una clave usando scrypt (o PBKDF2 como fallback).  
  - **Parámetros:** `pass` (string), `saltHex` (string, opcional)  
  - **Retorno:** Promise<{key: Uint8Array, salt: string}>  
  - **Efectos secundarios:** logs de advertencia

- **aesGcmEncrypt(keyBytes, plaintext)**  
  Encripta texto plano con AES-GCM.  
  - **Parámetros:** `keyBytes` (Uint8Array), `plaintext` (string)  
  - **Retorno:** Promise<{iv: string, ciphertext: string}>  
  - **Efectos secundarios:** ninguno

- **aesGcmDecrypt(keyBytes, ivHex, ciphertextHex)**  
  Desencripta texto cifrado con AES-GCM.  
  - **Parámetros:** `keyBytes` (Uint8Array), `ivHex` (string), `ciphertextHex` (string)  
  - **Retorno:** Promise<string>  
  - **Efectos secundarios:** ninguno

- **openAppModal(title, html)**  
  Muestra un modal reutilizando la estructura `#loteModal`.  
  - **Parámetros:** `title` (string), `html` (string)  
  - **Retorno:** void  
  - **Efectos secundarios:** manipulación del DOM, eventos

- **openConfirmModal(title, html, opts)**  
  Muestra un modal de confirmación y retorna una promesa booleana.  
  - **Parámetros:** `title` (string), `html` (string), `opts` (objeto)  
  - **Retorno:** Promise<boolean>  
  - **Efectos secundarios:** manipulación del DOM

- **markUtxosPending(keys)**  
  Marca UTXOs como pendientes en la UI.  
  - **Parámetros:** `keys` (array de strings)  
  - **Retorno:** void  
  - **Efectos secundarios:** manipulación del DOM

- **recalcAvailableFromDOM()**  
  Recalcula el balance disponible y habilita/deshabilita el botón de envío.  
  - **Parámetros:** ninguno  
  - **Retorno:** void  
  - **Efectos secundarios:** manipulación del DOM

- **openPassphrasePrompt(title, label, onSubmit)**  
  Muestra un modal para solicitar passphrase y ejecuta un callback.  
  - **Parámetros:** `title` (string), `label` (string), `onSubmit` (función)  
  - **Retorno:** void  
  - **Efectos secundarios:** manipulación del DOM

- **postSignedTransactionToServer(signedTransaction, passphrase)**  
  Envía una transacción firmada al backend.  
  - **Parámetros:** `signedTransaction` (objeto), `passphrase` (string)  
  - **Retorno:** Promise<{resp, body, isJson}>  
  - **Efectos secundarios:** ninguno

- **buildBurnSignedTransaction(utxo, burnAddress)**  
  Construye una transacción de tipo "burn" firmada.  
  - **Parámetros:** `utxo` (objeto), `burnAddress` (string)  
  - **Retorno:** Promise<objeto transacción>  
  - **Efectos secundarios:** ninguno  
  - **Depende de:** sha256Bytes, secp.sign

- **burnUtxoFlow(utxo)**  
  Orquesta el flujo de quemado de un UTXO, incluyendo confirmación y passphrase.  
  - **Parámetros:** `utxo` (objeto)  
  - **Retorno:** void  
  - **Efectos secundarios:** modales, fetch, manipulación del DOM  
  - **Depende de:** openConfirmModal, openPassphrasePrompt, buildBurnSignedTransaction, postSignedTransactionToServer

- **updateUtxoDisplay(address)**  
  Actualiza la visualización de UTXOs y balance en la UI.  
  - **Parámetros:** `address` (string)  
  - **Retorno:** Promise<{utxos, total, available, pending}>  
  - **Efectos secundarios:** manipulación del DOM

- **showToast(msg, type)**  
  Muestra una notificación flotante en la UI.  
  - **Parámetros:** `msg` (string), `type` (string, opcional)  
  - **Retorno:** void  
  - **Efectos secundarios:** manipulación del DOM

- **handleHistorialClick()**  
  Maneja la consulta y visualización del historial de la wallet.  
  - **Parámetros:** ninguno  
  - **Retorno:** void  
  - **Efectos secundarios:** fetch, manipulación del DOM

- **handleWalletModalClick()**  
  Muestra un resumen de la wallet en un modal.  
  - **Parámetros:** ninguno  
  - **Retorno:** void  
  - **Efectos secundarios:** fetch, manipulación del DOM

- **showHistorialModal(historyData)**  
  Renderiza el historial de transacciones en el modal.  
  - **Parámetros:** `historyData` (objeto)  
  - **Retorno:** void  
  - **Efectos secundarios:** manipulación del DOM

### Dependencias internas

Varias funciones dependen de helpers como `sha256Bytes`, `bufToHex`, `hexToBuf`, y de modales (`openAppModal`, `openConfirmModal`).  
Algunas funciones orquestan flujos completos (ej: `burnUtxoFlow`).

---

## 2. Lógica interna

### Flujo general

- El archivo inicializa utilidades criptográficas y helpers para hashing, cifrado y derivación de claves.
- Al cargar el DOM, registra listeners para eventos de UI: importar wallet, crear wallet, firmar, verificar, enviar transacciones, quemar UTXOs, mostrar historial y wallet.
- La importación de wallet implica leer un archivo, pedir passphrase, derivar clave, descifrar la clave privada y actualizar la UI.
- El envío de transacciones requiere seleccionar UTXOs, ingresar destinatario, monto y passphrase, firmar la transacción y enviarla al backend.
- El "burn" de UTXOs sigue un flujo similar, pero transfiere a una dirección irrecuperable.
- El historial y el resumen de wallet se consultan vía fetch y se muestran en modales reutilizables.

### Procesamiento de datos

1. **Importación:**  
   - Lee archivo JSON, pide passphrase, deriva clave, descifra privada, actualiza estado y UI.
2. **Transacciones:**  
   - Selecciona UTXOs, valida datos, firma con SHA-256, construye objeto de transacción, envía al backend.
3. **Burn:**  
   - Selecciona UTXO, confirma, pide passphrase, firma y envía al backend.
4. **Historial/Wallet:**  
   - Consulta endpoints, procesa respuesta y renderiza en modal.

### Patrones y estructuras

- **Modularidad:** helpers reutilizables para hashing, cifrado, modales.
- **Event delegation:** para botones dinámicos.
- **Promesas y async/await:** para flujos asíncronos.
- **Single source of truth:** el estado de la wallet se mantiene en variables y en el DOM.

---

## 3. Construcción de objetos

### Objetos literales

- **Keystore:**  
  - Propiedades: `keystoreVersion`, `id`, `createdAt`, `createdBy`, `kdf`, `kdfParams`, `cipher`, `cipherParams`, `publicKey`, `encryptedPrivateKey`.
  - Propósito: almacenar la wallet cifrada.

- **Transacción firmada:**  
  - Propiedades: `id`, `inputs`, `outputs`.
  - Métodos: ninguno (solo datos).
  - Propósito: representar una transacción lista para enviar.

- **Signature:**  
  - Propiedades: `r`, `s`.
  - Propósito: firma ECDSA de los datos.

- **UTXO:**  
  - Propiedades: `txId`, `outputIndex`, `amount`, `address`.
  - Propósito: representar salidas no gastadas.

### Relación entre objetos

- El keystore contiene la clave privada cifrada y la pública.
- Las transacciones usan la clave privada para firmar inputs.
- Los UTXOs se usan como inputs en transacciones.
- El estado de la wallet y UTXOs se refleja en el DOM y en variables globales.

---

## 4. Interacciones externas

### APIs y fetch

- **/utxo-balance/:address**  
  - Entrada: dirección pública  
  - Salida: lista de UTXOs

- **/transaction**  
  - Entrada: transacción firmada y passphrase  
  - Salida: resultado del backend

- **/address-balance**  
  - Entrada: dirección pública  
  - Salida: balance

- **/address-history/:publicKey**  
  - Entrada: publicKey  
  - Salida: historial de transacciones

- **/uploads/burn_bodegas_test.json**  
  - Entrada: ninguna  
  - Salida: lista de bodegas para burn

### DOM y eventos

- Listeners para clicks, cambios, y formularios en elementos como botones de importar, crear, firmar, enviar, burn, historial, wallet.
- Manipulación dinámica del DOM para mostrar/hidear modales, actualizar listas, mostrar notificaciones.

---

## 5. Resumen final

### ¿Qué hace el archivo?

`web-demo.js` implementa la lógica principal de una wallet demo tipo UTXO en el navegador. Permite:

- Crear e importar wallets protegidas por passphrase.
- Visualizar y seleccionar UTXOs.
- Firmar y enviar transacciones.
- Quemar (burn) UTXOs.
- Consultar historial y balance.
- Todo ello con cifrado local, firmas ECDSA y comunicación con un backend vía fetch.

### Importancia

Este archivo es el núcleo de la interacción usuario-wallet en la demo, gestionando seguridad, experiencia de usuario y comunicación con el backend.

### Posibles mejoras o riesgos

- **Seguridad:**  
  - El manejo de claves privadas en memoria y en el DOM puede ser riesgoso en producción.
  - El fallback JS para SHA-256 no es seguro para uso real.
- **Modularidad:**  
  - El archivo es muy extenso y mezcla lógica de UI, criptografía y red; podría modularizarse.
- **Gestión de errores:**  
  - Mejorar feedback y manejo de errores en flujos asíncronos.
- **Accesibilidad:**  
  - Revisar accesibilidad de los modales y notificaciones.

---