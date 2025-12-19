# Explicación del Constructor de Wallet y Criptografía en Magnumsmaster

## 1. ¿Qué es una Wallet?
Una **wallet** (billetera) es una entidad criptográfica que gestiona un par de claves:
- **Clave privada**: Secreta, permite firmar transacciones y controlar los fondos.
- **Clave pública**: Visible, actúa como dirección para recibir fondos (UTXOs).

## 2. El Constructor de Wallet
La clase `Wallet` permite tres formas de inicialización:

### a) Solo clave privada (`existingPrivateKey`)
- Si se pasa solo la clave privada, el constructor deriva automáticamente el par de claves (`keyPair`) y la clave pública desde esa privada.
- Esto garantiza que la clave pública siempre corresponde exactamente a la privada, asegurando integridad y evitando desincronización.
- **Uso típico:**
  ```js
  const wallet = new Wallet(null, undefined, privateKeyHex);
  // wallet.publicKey se deriva de la clave privada
  ```

### b) Clave pública y privada
- Si se pasan ambas, la wallet usa la pública proporcionada, pero **siempre** deriva el keyPair desde la privada.
- Esto es útil para restaurar una wallet desde un keystore que guarda ambos valores.

### c) Sin argumentos
- Si no se pasa nada, la wallet genera un nuevo par de claves aleatorio.
- Se usa para crear una wallet nueva desde cero.

## 3. Garantía de Integridad
- El sistema está diseñado para que **la clave pública derivada de la privada coincida exactamente con la guardada en el keystore**.
- Así, al restaurar una wallet desde un keystore cifrado, siempre se obtiene el mismo par de claves.
- Esto es fundamental para la seguridad y la interoperabilidad en la red blockchain.

## 4. Proceso de Carga y Verificación
1. Se descifra la clave privada desde el keystore usando la passphrase.
2. Se crea la wallet pasando solo la clave privada al constructor.
3. El constructor deriva la clave pública y el keyPair.
4. Se compara la clave pública derivada con la guardada en el keystore para verificar integridad.

## 5. Términos y Conceptos Clave
- **Clave privada (privateKey):** Secreta, permite gastar fondos y firmar transacciones.
- **Clave pública (publicKey):** Visible, dirección para recibir fondos.
- **keyPair:** Objeto que contiene ambas claves y permite operaciones criptográficas.
- **Keystore:** Archivo cifrado que almacena la clave privada y la pública, protegido por una passphrase.
- **UTXO (Unspent Transaction Output):** Saldo disponible asociado a una clave pública.
- **PBKDF2:** Algoritmo de derivación de claves usado para proteger la clave privada con una passphrase.
- **AES-256-GCM:** Algoritmo de cifrado simétrico usado para cifrar la clave privada en el keystore.
- **Integridad:** Garantía de que la clave pública y privada siempre corresponden y no han sido alteradas.

## 6. Resumen Visual
```
[Keystore cifrado] --(descifrado con passphrase)--> [clave privada] --(constructor Wallet)--> [keyPair, clave pública]
```
- Siempre que se restaure una wallet, la clave pública derivada será idéntica a la original.

---

**Recomendación:**
Nunca compartas tu clave privada ni tu passphrase. El sistema está diseñado para que solo con la clave privada puedas recuperar tu wallet y operar con total seguridad.

# DIFERENCIA BACKEND FRONTEND CREACIÓN DE WALLETS
Tu archivo keys-web-demo (2).json es un keystore válido, pero tiene diferencias importantes respecto al formato y algoritmos que espera tu backend actual:

KDF diferente:

Tu backend usa "kdf": "pbkdf2" y espera parámetros como iterations, keylen, digest.
El keystore que intentas cargar usa "kdf": "scrypt" y solo tiene salt.
Parámetros incompletos:

Faltan parámetros de scrypt (N, r, p, keylen) que serían necesarios para derivar la clave correctamente.
El backend probablemente fallará al intentar derivar la clave con PBKDF2 usando solo un salt.
Compatibilidad:

Si el backend no soporta "kdf": "scrypt", no podrá descifrar la clave privada y solo usará la clave pública, mostrando el mensaje:
[Wallet.constructor] Solo clave pública proporcionada, no se genera keyPair.
¿Por qué ocurre esto?

El keystore fue generado por otro sistema (web-demo) con parámetros y algoritmos distintos a los del backend actual.
El backend solo puede operar con keystores generados por sí mismo o que sigan exactamente su formato y algoritmos.

# recepción datos wallet backend
el backend reciba una petición a /wallet/load-global, mostrará en consola el JSON exacto recibido del frontend.

El log muestra que el frontend está enviando correctamente el keystore completo y la passphrase:
[LOAD-GLOBAL] Body recibido del frontend: {
  "encryptedPrivateKey": "...",
  "salt": "...",
  "iv": "...",
  "tag": "...",
  "passphrase": "javi",
  "publicKey": "..."
}

# error
Tu backend ahora está iniciando y funcionando correctamente, pero hay un detalle sutil en el flujo de cambio de la wallet global:

Los logs muestran que, después de llamar a /wallet/load-global, la "Clave pública global DESPUÉS del cambio" se está estableciendo con el valor hexadecimal de la clave privada, no con la clave pública.
Ejemplo:

Esto es el valor hexadecimal de la clave privada, no la clave pública.

El comportamiento correcto es:

La clave pública global siempre debe ser la clave pública derivada de la clave privada descifrada, y esto debe coincidir con el campo publicKey en el keystore.
El resto del flujo (descifrado, sobrescritura del keystore, logs) está funcionando como se espera.

Qué hay que corregir:

En tu endpoint /wallet/load-global, después de descifrar la clave privada y crear la wallet, debes asegurarte de que:

La clave pública global se establezca con la clave pública derivada, no con la clave privada.
El log de "Clave pública global DESPUÉS del cambio" muestre la clave pública, no la clave privada.
¿Quieres que modifique server.js para corregir este log y asegurar que la clave pública global siempre sea la correcta después de un cambio de wallet global?


la clave pública por defecto que se asigna al bloque génesis solo cuando no existe el archivo wallet_default.json o si ocurre un error al leerlo.

Está definida en block.js así:

y se usa para asignar los 500 del bloque génesis cuando no hay wallet personalizada.

Si existe wallet_default.json válido, el saldo inicial se asigna a la clave pública de ese archivo.
Si no existe o hay error, se usa esta clave pública por defecto.
Por eso, si generas una wallet nueva, no tendrá los 500 del génesis: esos solo los tiene la wallet asociada a esta clave pública por defecto, a menos que reemplaces el archivo antes del primer arranque.


Resumen del flujo
Bloque génesis:

Asigna 500 a la wallet con publicKey:
04ef94c8d7ae8eb392553ecb1b9be9e66194c78fa9e8cffcb902112a96ee573df201abe5ae9584a7489c5e3d25fa7877fafc03854727ce33f010222f7bb8f2571a
Primera transacción:

Envía 100 a la wallet con publicKey:
04d6746304daa4585f2dbbe3eb5a732007dffedd30099cf358b313b35e00242819864b99f5d8a6de16796435790a13b2c31abe4dc1dfe1e10395f8ad26f13c2afd
Deja 400 en la wallet original.
Cargas como Bodega la wallet receptora de los 100:

El keystore de wallet_default.json tiene la publicKey:
04d6746304daa4585f2dbbe3eb5a732007dffedd30099cf358b313b35e00242819864b99f5d8a6de16796435790a13b2c31abe4dc1dfe1e10395f8ad26f13c2afd
Consulta de UTXO y balance:

El sistema consulta UTXOs para la dirección:
04ad86717750c14eb95ca83e115cb78a5eda7b417075b9aafe3684cd8e3df846165fa3244f3909ede8f5d8ba857fc081bcdd8bfbd49cccc64467de4c6422eaed7b
(que NO es ninguna de las dos anteriores).
El balance para la publicKey del keystore (la de los 100) es correcto: 100.
El balance para la publicKey del génesis es correcto: 450.
¿Por qué ocurre esto?
El sistema debería consultar UTXOs y balance para la publicKey actualmente cargada en memoria (la de wallet_default.json).
Sin embargo, está consultando para otra clave pública:
04ad86717750c14eb95ca83e115cb78a5eda7b417075b9aafe3684cd8e3df846165fa3244f3909ede8f5d8ba857fc081bcdd8bfbd49cccc64467de4c6422eaed7b
Esto indica que, tras cargar la nueva wallet, la variable globalWallet o el endpoint que responde a la consulta de balance/UTXO no está usando la clave pública de la wallet cargada, sino otra (posiblemente la anterior, o una generada por error).
¿Qué revisar/arreglar?
Asegúrate de que tras cargar la wallet (endpoint /wallet/load-global), la variable globalWallet se actualiza correctamente y el sistema usa globalWallet.publicKey para todas las consultas.
Verifica que el frontend, al consultar el balance, lo hace para la clave pública que devuelve el backend como activa (por ejemplo, usando /wallet/global o similar).
Revisa que no haya ningún paso donde se sobreescriba o regenere la wallet en memoria después de cargar el keystore.
¿Cómo lo arreglamos?
Si quieres, puedo revisar el endpoint de consulta de balance/UTXO y el flujo de carga de wallet para asegurar que siempre se usa la clave pública de la wallet cargada.
También puedo ayudarte a añadir logs para ver qué clave pública está activa en cada momento.
¿Quieres que revise el endpoint de consulta de balance y el flujo de carga de wallet para asegurarnos de que siempre se usa la clave pública correcta?