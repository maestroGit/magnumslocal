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
La constante INITIAL_BALANCE se fija en el archivo:

constantConfig.js

Por ejemplo:
const INITIAL_BALANCE = 0; // o el valor que definas

El importe de 5000 no se asigna por la constante INITIAL_BALANCE.
Ese importe se asigna mediante una transacción especial, normalmente en el bloque génesis o por una transacción manual que crea un UTXO de 5000 para la wallet global.

// ✅ El saldo inicial ya está configurado en el bloque génesis
// La wallet cargada desde wallet_default.json ya tiene 5000 unidades disponibles

**Última actualización:** 2025-10-14

**Forzar Minado para evitar doble gasto**
Tu análisis es correcto: el problema ocurre porque el UTXO inicial de 5000 sigue disponible en el mempool y puede ser usado por varias transacciones antes de que se mine un bloque y se actualice el UTXO set. Esto permite que varias transacciones usen el mismo UTXO, lo que es un "double-spend" en el mempool.

Soluciones posibles:

Forzar minado tras cada transacción
Solo permites una transacción en el mempool por UTXO, y fuerzas a minar antes de permitir otra. Así, el UTXO se elimina tras minar y no puede usarse dos veces.

Permitir solo una transacción por UTXO en el mempool
Antes de añadir una transacción, verifica que el UTXO que usa como input no esté ya referenciado por otra transacción pendiente en el mempool. Si ya está, rechaza la nueva transacción.

Bloquear UTXOs en el mempool
Marca los UTXOs como "locked" cuando se usan en una transacción pendiente, y solo los libera si la transacción se elimina del mempool (por minado o por timeout).

La opción 2 es la más común en blockchains: el mempool debe rechazar transacciones que intentan gastar UTXOs ya referenciados por otras transacciones pendientes.
------

La verificación de UTXO en el mempool ha sido implementada en transactionsPool.js:

Antes de añadir una transacción, el código revisa si alguno de sus inputs (txId + outputIndex) ya está referenciado por otra transacción pendiente en el mempool.
Si detecta doble gasto, rechaza la transacción y muestra un mensaje de advertencia en consola.
El código añadido está comentado para facilitar la depuración.
Ahora solo se permite una transacción por UTXO en el mempool, evitando el doble gasto antes de minar. ¿Quieres probar el flujo o necesitas ajustes adicionales?
Tus logs muestran que la verificación de doble gasto en el mempool está funcionando correctamente:

Cuando intentas crear una segunda transacción que usa el mismo UTXO (txId: 'init-fund-1', outputIndex: 0), el sistema detecta el doble gasto y rechaza la transacción con el mensaje:
[UTXO MEMPOOL] Doble gasto detectado: txId=init-fund-1, outputIndex=0. Transacción rechazada.

Solo la primera transacción que usa ese UTXO se añade a la pool. Las siguientes son rechazadas.

No hay duplicidades: el UTXO solo puede ser gastado por una transacción pendiente en el mempool. El sistema está evitando el doble gasto antes de minar, como debe ser.

----
Si intentas crear dos transacciones que gastan el mismo UTXO (misma txId y outputIndex), aunque sean para la misma public key y aunque existan varios UTXOs para esa clave, la verificación de doble gasto en el mempool rechaza la segunda transacción hasta que la primera se mine y el UTXO se actualice. Pero el usuario no elige txId, solo ingresa Sender public key, Recipient (pubkey) y Amount. Entonces está cojo el sistema de construcción y envío de UTXOS? porque el comportamiento de asignar txId no sé donde se realiza?

Exacto, el usuario no elige el txId ni el outputIndex directamente.
El sistema de la wallet debe encargarse de seleccionar automáticamente los UTXOs disponibles para la public key del remitente.

El flujo correcto es:

El usuario ingresa: Sender public key, Recipient public key y Amount.
La wallet busca en el UTXO set todos los UTXOs disponibles para el sender.
Selecciona los UTXOs necesarios (por monto y no gastados) y construye los inputs de la transacción, asignando el txId y outputIndex de cada UTXO seleccionado.
La transacción se firma y se envía al mempool.
El txId y outputIndex provienen de los UTXOs que la wallet selecciona internamente, no del usuario.

Si el sistema no está seleccionando correctamente los UTXOs (por ejemplo, siempre elige el mismo aunque haya varios), entonces sí está "cojo" y puede causar rechazos innecesarios en el mempool.

¿Quieres que revise o mejore la lógica de selección de UTXOs en la wallet para que use varios UTXOs si es necesario y evite rechazos?

La lógica de selección de UTXOs en la wallet se ejecuta en el método estático Transaction.newTransaction (archivo transactions.js):

La wallet recibe el set de UTXOs disponibles (utxoSet), el monto y las claves públicas.
Selecciona automáticamente los UTXOs de la dirección del remitente, sumando hasta cubrir el monto solicitado:
Si el total de UTXOs seleccionados no cubre el monto, rechaza la transacción.
Construye los inputs usando el txId y outputIndex de cada UTXO seleccionado.
Crea los outputs para el destinatario y el cambio (si corresponde).
El usuario solo ingresa las claves y el monto; la wallet elige los UTXOs y construye los inputs automáticamente.

¿Quieres mejorar la selección (por ejemplo, optimizar para menos UTXOs, o mostrar al usuario los UTXOs seleccionados)?

El motivo por el que el servidor rechaza la transacción es porque el UTXO con txId=d051d161e5fda4642db59a3a24f9c867672e0e9a52999efe367cd53e5495166f, outputIndex=0 ya está siendo usado por otra transacción pendiente en el mempool.

Aunque tienes tres UTXOs (300, 60, 1), la wallet está seleccionando solo el UTXO de 300 para cubrir el monto de 60. Si ya existe una transacción en el mempool que usa ese mismo UTXO, cualquier nueva transacción que intente usarlo será rechazada hasta que se mine y el UTXO se actualice.

Solución/Mejora:
La lógica de selección de UTXOs en la wallet debería:

Revisar los UTXOs que ya están bloqueados por transacciones pendientes en el mempool y no seleccionarlos.
Elegir otros UTXOs disponibles (por ejemplo, el de 60 o el de 1 si el monto lo permite).
Así evitarás rechazos innecesarios y permitirás que el usuario pueda gastar sus fondos disponibles correctamente.



