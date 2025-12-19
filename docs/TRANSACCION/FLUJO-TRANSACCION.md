Sí, hay dos formas principales de recibir y procesar transacciones en el endpoint /transaction:

Transacción pre-firmada (pre-signed transaction):

El frontend envía el campo signedTransaction en el body.
El backend solo valida la estructura, los UTXOs y la firma, y la añade a la mempool si es válida.
No se usa keystore ni passphrase en el backend.
Transacción a firmar en el backend (legacy flow, ahora seguro):

El frontend envía los campos recipient, amount, keystore (objeto JSON) y passphrase.
El backend descifra la clave privada usando el keystore y la passphrase, crea y firma la transacción, y la añade a la mempool.
Si faltan keystore o passphrase, la transacción es rechazada.
Resumen:

Si envías signedTransaction, el backend solo valida y añade.
Si envías recipient, amount, keystore y passphrase, el backend firma y crea la transacción por ti.
No hay

1. Transacción pre-firmada (pre-signed transaction)
{
  "signedTransaction": {
    "id": "txid123",
    "inputs": [
      {
        "txId": "prevtxid",
        "outputIndex": 0,
        "address": "04abc...",
        "amount": 100,
        "signature": {
          "r": "...",
          "s": "...",
          "recoveryParam": 1
        }
      }
    ],
    "outputs": [
      {
        "address": "04def...",
        "amount": 100
      }
    ],
    "timestamp": 1700000000000
  }
}
El backend solo valida y añade la transacción.

2. Transacción a firmar en el backend (con keystore y passphrase)
{
  "recipient": "04def...",
  "amount": 100,
  "keystore": {
    "keystoreVersion": 1,
    "id": "node-test-1762261762881",
    "createdAt": "2025-11-04T13:09:22.881Z",
    "createdBy": "node-test",
    "kdf": "scrypt",
    "kdfParams": { "salt": "e5f04569a72650fef3627ba86e31d8b9" },
    "cipher": "aes-256-gcm",
    "cipherParams": { "iv": "a7bb2c8ff1726f453c56bec8" },
    "publicKey": "04abc...",
    "encryptedPrivateKey": "..."
  },
  "passphrase": "tu-contraseña"
}
El backend descifra la clave privada, firma y crea la transacción.



Ahora tengo dos flujos para keystores diferenciados por las librerías de descifaifrado que uso que no eran compatibles entre frontend y backend. Necesito que cuando a la ruta Transacction le lleguen datos que se haya iniciado desde el click en <button id="openTransactionModal" class="dashboard-btn primary">Register bottle</button> y tras cumplimentar y enviar los datos con click en <button type="submit">Enviar Transacción</button> se procesen desde el backend con la wallet global. Es decir, la lógica actual es correcta, pero necesito la diferenciación para cuando desde el frontend que uso para la bodega en C:\Users\maest\Documents\magnumsmaster\public\view.html use la lógica de backend con el keystore de la wallet globa y el descifrado con la firma que por defecto tiene el backend. El otro proceso desde el frontend de usuario en C:\Users\maest\Documents\magnumsmaster\public\demo-wallet\web-demo.html debe ser como lo tenemos ahora procesar solo si está pre-firmada (pre-signed transaction). Te parece que me resumas lo que te expongo para asegurarnos de lo que quiero que implementes?
Claro, aquí tienes el resumen de lo que necesitas implementar:

Resumen de requerimientos para /transaction
1. Frontend de bodega (view.html):

Cuando el usuario hace click en "Register bottle" y luego en "Enviar Transacción", el backend debe procesar la transacción usando la wallet global (la que ya tiene cargada y descifrada el backend).
No se debe requerir ni usar keystore ni passphrase enviados desde el frontend de bodega.
El backend debe firmar la transacción con la clave privada de la wallet global, como hacía antes del parche.
2. Frontend de usuario (web-demo.html):

Solo se aceptan transacciones pre-firmadas (signedTransaction).
El backend solo valida la estructura, los UTXOs y la firma, y añade la transacción a la mempool si es válida.
No se debe permitir que el backend firme usando la wallet global ni ningún keystore enviado.
3. Diferenciación de flujo:

El backend debe distinguir, según el origen de la petición (por ejemplo, por un campo en el body, por la URL, o por el frontend que la envía), si debe:
Usar la wallet global para firmar (bodega).
Solo aceptar transacciones pre-firmadas (usuario).
¿Es correcto este resumen y quieres que implemente la lógica de diferenciación en el backend según el origen de la petición? Si tienes preferencia por cómo distinguir el origen (por ejemplo, un campo "mode": "bodega" en el body), indícalo y lo aplico.

No es necesario crear dos rutas diferentes; sería redundante y complicaría el mantenimiento. Es más limpio y flexible usar una sola ruta /transaction y distinguir el flujo por un campo en el body, por ejemplo "mode": "bodega" para el frontend de bodega y omitirlo o usar "mode": "usuario" para el frontend de usuario.

Ventajas de un solo endpoint con diferenciación por campo:

Menos código duplicado.
Más fácil de mantener y extender.
El frontend solo debe añadir un campo extra para indicar el flujo.
Recomendación:
Usa un campo como "mode": "bodega" en el body de la petición desde el frontend de bodega. El backend decidirá el flujo según ese campo.

¿Quieres que implemente la lógica de diferenciación en /transaction usando un campo "mode"?

Ahora el endpoint /transaction diferencia el flujo según el campo "mode":

Si "mode": "bodega", usa la wallet global del backend para firmar y procesar la transacción (para el frontend de bodega).
Si se envía un signedTransaction, solo valida y añade la transacción pre-firmada (para el frontend de usuario).
Si no se cumple ninguna de las dos condiciones, rechaza la petición.
Solo necesitas añadir "mode": "bodega" en el body desde el frontend de bodega. El resto de frontends deben enviar solo transacciones pre-firmadas.

¿Quieres que te ayude a actualizar el frontend o la documentación?

Exactamente, ese es el motivo por el que se implementaron dos flujos distintos:

Flujo bodega: El backend firma la transacción porque tiene acceso a la wallet global y usa su propia librería de firmas.
Flujo usuario: El frontend firma la transacción y el backend solo la valida y la reenvía, porque las librerías de firma entre backend y frontend no son compatibles y no se puede descifrar ni validar igual en ambos lados.
Por eso, cuando el backend recibe una transacción que NO lleva el campo "mode": "bodega", debe asumir que viene pre-firmada por el usuario y procesarla así:

Extraer la transacción desde req.body.signedTx.
Validar la firma y los datos usando solo la información enviada (sin intentar descifrar passphrase ni usar keystore).
Si la firma es válida, aceptar y propagar la transacción.
¿Quieres que te ayude a dejar este comportamiento bien claro y robusto en el backend? Puedo mostrarte cómo debe ser el código para distinguir y procesar correctamente ambos flujos. ¿Te gustaría ver ese ejemplo?