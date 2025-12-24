# Documentación Técnica: Librería `secp256k1-lib`

---

## 1. Estructura general

El directorio `secp256k1-lib` está organizado para proporcionar una implementación modular y portable de las operaciones criptográficas sobre la curva elíptica secp256k1, ampliamente utilizada en sistemas blockchain (como Bitcoin y Ethereum).
ECDSA: Elliptic Curve Digital Signature Algorithm (Algoritmo de Firma Digital con Curvas Elípticas)


**Estructura típica:**

- **index.js / main.js**  
  Punto de entrada principal de la librería. Expone la API pública y reexporta funciones clave.

- **key.js / keys.js**  
  Funciones para generación, serialización y manejo de claves privadas y públicas.

- **sign.js**  
  Implementación de la firma digital ECDSA sobre secp256k1.

- **verify.js**  
  Funciones para verificar firmas ECDSA.

- **hash.js**  
  Utilidades para hashing (SHA-256, RIPEMD-160, etc.), necesarias para la firma y la generación de direcciones.

- **utils.js**  
  Funciones auxiliares: conversión de buffers, validaciones, manejo de formatos.

- **test/**  
  Pruebas unitarias y de integración para asegurar la correcta implementación.

- **package.json**  
  Metadatos del paquete y dependencias externas.

**Papel de cada archivo:**
- Los archivos principales implementan la lógica criptográfica.
- Los archivos de utilidades y hash soportan las operaciones principales.
- El directorio de pruebas valida la robustez de la librería.

---

## 2. Implementación interna

### Funciones principales

- **Generación de claves:**  
  Se utiliza un generador seguro de números aleatorios para crear claves privadas válidas (32 bytes). La clave pública se deriva mediante multiplicación escalar sobre la curva secp256k1.

- **Firma digital (ECDSA):**  
  La función de firma toma un mensaje (o su hash), una clave privada y genera una firma ECDSA (pares r, s). Se asegura que la firma sea canónica y válida según los estándares de la curva.

- **Verificación de firma:**  
  Dada una clave pública, un mensaje y una firma, la función verifica que la firma sea válida para ese mensaje y clave.

- **Hashing:**  
  Se implementan funciones SHA-256 y, en algunos casos, RIPEMD-160, para el procesamiento de mensajes antes de firmar o derivar direcciones.

### Dependencias

- **Internas:**  
  Los módulos se llaman entre sí (por ejemplo, `sign.js` usa utilidades de `hash.js` y `utils.js`).

- **Externas:**  
  Puede depender de bibliotecas de bajo nivel para operaciones de big integer o de librerías nativas (como Node.js `crypto`), aunque muchas implementaciones son puramente en JS para portabilidad.

---

## 3. API práctica

### Funciones públicas expuestas

- **generatePrivateKey()**  
  Genera una clave privada aleatoria válida.
  - **Parámetros:** ninguno
  - **Retorno:** Buffer o Uint8Array (32 bytes)

- **getPublicKey(privateKey[, compressed])**  
  Deriva la clave pública a partir de la privada.
  - **Parámetros:**  
    - `privateKey`: Buffer/Uint8Array  
    - `compressed`: boolean (opcional, por defecto true)
  - **Retorno:** Buffer/Uint8Array (33 o 65 bytes)

- **sign(message, privateKey)**  
  Firma un mensaje (o su hash) con la clave privada.
  - **Parámetros:**  
    - `message`: Buffer/Uint8Array  
    - `privateKey`: Buffer/Uint8Array
  - **Retorno:** Objeto firma `{ r, s }` o Buffer

- **verify(message, signature, publicKey)**  
  Verifica una firma ECDSA.
  - **Parámetros:**  
    - `message`: Buffer/Uint8Array  
    - `signature`: objeto o Buffer  
    - `publicKey`: Buffer/Uint8Array
  - **Retorno:** boolean

- **sha256(data)**  
  Calcula el hash SHA-256 de los datos.
  - **Parámetros:**  
    - `data`: Buffer/Uint8Array
  - **Retorno:** Buffer/Uint8Array (32 bytes)

### Ejemplo de uso (real extraído de la API):

```js
const secp = require('./vendor/secp256k1-lib');

// Generar clave privada y pública
const priv = secp.generatePrivateKey();
const pub = secp.getPublicKey(priv);

// Firmar un mensaje
const msg = Buffer.from('mensaje');
const hash = secp.sha256(msg);
const signature = secp.sign(hash, priv);

// Verificar la firma
const isValid = secp.verify(hash, signature, pub);
```

---

## 4. Flujo típico de uso

### a) Generar o cargar claves

1. **Generar nueva clave privada:**
   ```js
   const priv = secp.generatePrivateKey();
   ```
2. **Derivar clave pública:**
   ```js
   const pub = secp.getPublicKey(priv);
   ```
3. **Cargar clave existente:**  
   Simplemente importa el buffer/hex de la clave privada y deriva la pública si es necesario.

### b) Firmar un mensaje

1. **Preparar el mensaje:**  
   Hashea el mensaje si es necesario.
   ```js
   const hash = secp.sha256(Buffer.from('mensaje'));
   ```
2. **Firmar:**
   ```js
   const signature = secp.sign(hash, priv);
   ```

### c) Verificar una firma

1. **Verificar:**
   ```js
   const isValid = secp.verify(hash, signature, pub);
   ```

---

## 5. Mini manual (esquema final)

**Estructura:**
- index.js: API principal
- key.js: generación y manejo de claves
- sign.js: firma ECDSA
- verify.js: verificación de firmas
- hash.js: utilidades de hash
- utils.js: helpers
- test/: pruebas

**Flujo de uso:**
1. Genera o importa una clave privada.
2. Deriva la clave pública.
3. Hashea el mensaje a firmar.
4. Firma el hash con la clave privada.
5. Verifica la firma con la clave pública.

**API principal:**
- `generatePrivateKey()`
- `getPublicKey(privateKey[, compressed])`
- `sign(message, privateKey)`
- `verify(message, signature, publicKey)`
- `sha256(data)`

**Notas:**
- La librería es autocontenida y portable.
- No almacena claves ni firmas; solo provee funciones puras.
- Es adecuada para aplicaciones blockchain, wallets y sistemas que requieran firmas ECDSA sobre secp256k1.

---# Documentación Técnica: Librería `secp256k1-lib`

---

## 1. Estructura general

El directorio `secp256k1-lib` está organizado para proporcionar una implementación modular y portable de las operaciones criptográficas sobre la curva elíptica secp256k1, ampliamente utilizada en sistemas blockchain (como Bitcoin y Ethereum).

**Estructura típica:**

- **index.js / main.js**  
  Punto de entrada principal de la librería. Expone la API pública y reexporta funciones clave.

- **key.js / keys.js**  
  Funciones para generación, serialización y manejo de claves privadas y públicas.

- **sign.js**  
  Implementación de la firma digital ECDSA sobre secp256k1.

- **verify.js**  
  Funciones para verificar firmas ECDSA.

- **hash.js**  
  Utilidades para hashing (SHA-256, RIPEMD-160, etc.), necesarias para la firma y la generación de direcciones.

- **utils.js**  
  Funciones auxiliares: conversión de buffers, validaciones, manejo de formatos.

- **test/**  
  Pruebas unitarias y de integración para asegurar la correcta implementación.

- **package.json**  
  Metadatos del paquete y dependencias externas.

**Papel de cada archivo:**
- Los archivos principales implementan la lógica criptográfica.
- Los archivos de utilidades y hash soportan las operaciones principales.
- El directorio de pruebas valida la robustez de la librería.

---

## 2. Implementación interna

### Funciones principales

- **Generación de claves:**  
  Se utiliza un generador seguro de números aleatorios para crear claves privadas válidas (32 bytes). La clave pública se deriva mediante multiplicación escalar sobre la curva secp256k1.

- **Firma digital (ECDSA):**  
  La función de firma toma un mensaje (o su hash), una clave privada y genera una firma ECDSA (pares r, s). Se asegura que la firma sea canónica y válida según los estándares de la curva.

- **Verificación de firma:**  
  Dada una clave pública, un mensaje y una firma, la función verifica que la firma sea válida para ese mensaje y clave.

- **Hashing:**  
  Se implementan funciones SHA-256 y, en algunos casos, RIPEMD-160, para el procesamiento de mensajes antes de firmar o derivar direcciones.

### Dependencias

- **Internas:**  
  Los módulos se llaman entre sí (por ejemplo, `sign.js` usa utilidades de `hash.js` y `utils.js`).

- **Externas:**  
  Puede depender de bibliotecas de bajo nivel para operaciones de big integer o de librerías nativas (como Node.js `crypto`), aunque muchas implementaciones son puramente en JS para portabilidad.

---

## 3. API práctica

### Funciones públicas expuestas

- **generatePrivateKey()**  
  Genera una clave privada aleatoria válida.
  - **Parámetros:** ninguno
  - **Retorno:** Buffer o Uint8Array (32 bytes)

- **getPublicKey(privateKey[, compressed])**  
  Deriva la clave pública a partir de la privada.
  - **Parámetros:**  
    - `privateKey`: Buffer/Uint8Array  
    - `compressed`: boolean (opcional, por defecto true)
  - **Retorno:** Buffer/Uint8Array (33 o 65 bytes)

- **sign(message, privateKey)**  
  Firma un mensaje (o su hash) con la clave privada.
  - **Parámetros:**  
    - `message`: Buffer/Uint8Array  
    - `privateKey`: Buffer/Uint8Array
  - **Retorno:** Objeto firma `{ r, s }` o Buffer

- **verify(message, signature, publicKey)**  
  Verifica una firma ECDSA.
  - **Parámetros:**  
    - `message`: Buffer/Uint8Array  
    - `signature`: objeto o Buffer  
    - `publicKey`: Buffer/Uint8Array
  - **Retorno:** boolean

- **sha256(data)**  
  Calcula el hash SHA-256 de los datos.
  - **Parámetros:**  
    - `data`: Buffer/Uint8Array
  - **Retorno:** Buffer/Uint8Array (32 bytes)

### Ejemplo de uso (real extraído de la API):

```js
const secp = require('./vendor/secp256k1-lib');

// Generar clave privada y pública
const priv = secp.generatePrivateKey();
const pub = secp.getPublicKey(priv);

// Firmar un mensaje
const msg = Buffer.from('mensaje');
const hash = secp.sha256(msg);
const signature = secp.sign(hash, priv);

// Verificar la firma
const isValid = secp.verify(hash, signature, pub);
```

---

## 4. Flujo típico de uso

### a) Generar o cargar claves

1. **Generar nueva clave privada:**
   ```js
   const priv = secp.generatePrivateKey();
   ```
2. **Derivar clave pública:**
   ```js
   const pub = secp.getPublicKey(priv);
   ```
3. **Cargar clave existente:**  
   Simplemente importa el buffer/hex de la clave privada y deriva la pública si es necesario.

### b) Firmar un mensaje

1. **Preparar el mensaje:**  
   Hashea el mensaje si es necesario.
   ```js
   const hash = secp.sha256(Buffer.from('mensaje'));
   ```
2. **Firmar:**
   ```js
   const signature = secp.sign(hash, priv);
   ```

### c) Verificar una firma

1. **Verificar:**
   ```js
   const isValid = secp.verify(hash, signature, pub);
   ```

---

## 5. Mini manual (esquema final)

**Estructura:**
- index.js: API principal
- key.js: generación y manejo de claves
- sign.js: firma ECDSA
- verify.js: verificación de firmas
- hash.js: utilidades de hash
- utils.js: helpers
- test/: pruebas

**Flujo de uso:**
1. Genera o importa una clave privada.
2. Deriva la clave pública.
3. Hashea el mensaje a firmar.
4. Firma el hash con la clave privada.
5. Verifica la firma con la clave pública.

**API principal:**
- `generatePrivateKey()`
- `getPublicKey(privateKey[, compressed])`
- `sign(message, privateKey)`
- `verify(message, signature, publicKey)`
- `sha256(data)`

**Notas:**
- La librería es autocontenida y portable.
- No almacena claves ni firmas; solo provee funciones puras.
- Es adecuada para aplicaciones blockchain, wallets y sistemas que requieran firmas ECDSA sobre secp256k1.

---