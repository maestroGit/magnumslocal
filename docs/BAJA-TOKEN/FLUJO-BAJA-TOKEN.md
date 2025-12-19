# Flujo de Baja de Token (Botella) en Blockchain

## Objetivo
Registrar la baja de una botella/token en el sistema, manteniendo trazabilidad y transparencia en la blockchain.

---
flujo completo desde la recepción de un envío hasta el burn de una transacción, incluyendo las rutas backend y frontend involucradas:

1. Recepción de un envío (recibir tokens)
Frontend
El usuario importa su wallet (keystore + passphrase).
El frontend consulta los UTXOs disponibles con:
GET /utxo-balance/:address
El historial se consulta con:
GET /address-history/:address
El frontend muestra los UTXOs y el historial de transacciones recibidas.
Backend
Ruta GET /utxo-balance/:address: filtra y devuelve los UTXOs de la dirección.
Ruta GET /address-history/:address: recorre los bloques y transacciones, clasifica outputs como recibidos, gastados o quemados.
2. Burn de una transacción (quema de tokens)
Frontend
El usuario selecciona un UTXO y pulsa "Burn".
El frontend construye la transacción de quema:
Destinatario: 0x0000000000000000000000000000000000000000
Monto: cantidad del UTXO seleccionado
Incluye: passphrase, keystore, txId y outputIndex del UTXO
Envía la transacción al backend con:
POST /transaction
Tras minar el bloque, el frontend refresca los UTXOs y el historial con las rutas anteriores.
Backend
Ruta POST /transaction:
Recibe los datos de la transacción (burn).
Descifra la clave privada con el passphrase y keystore.
Verifica y firma la transacción usando el UTXO seleccionado.
Añade la transacción al pool.
Proceso de minado:
El minero toma la transacción de burn, la incluye en el bloque.
Si solo hay burn, no se añade recompensa.
Actualiza el UTXO set: elimina el UTXO gastado, añade el output de burn (que no es recuperable).
El historial y los UTXOs se actualizan y se consultan con las rutas anteriores.
Rutas principales involucradas
Backend
GET /utxo-balance/:address — Consulta UTXOs y balance.
GET /address-history/:address — Consulta historial de transacciones.
POST /transaction — Envía transacción (incluye burn).
Proceso de minado (interno, no expuesto por ruta).
Frontend
Consulta UTXOs y balance: llama a /utxo-balance/:address.
Consulta historial: llama a /address-history/:address.
Envía transacción de burn: llama a /transaction.
Refresca UTXOs e historial tras cada operación.
## Procesos BURN:
### Solución recomendada:

Tu planteamiento es correcto y práctico. Usar una dirección de bodega reservada para bajas/burn es sencillo de implementar y no requiere cambios en la lógica UTXO.

Opciones para que el usuario obtenga la publicKey de baja/burn de la bodega:

1. Mostrarla en el frontend: El sistema puede listar las direcciones de baja/burn disponibles para cada bodega, y el usuario selecciona la que corresponda.
2. Solicitarla a la bodega: El usuario puede pedir la dirección de baja/burn a la bodega (por email, chat, etc.), y la bodega la envía.
3. Preaviso en la app: El usuario solicita la baja en la app, y el sistema (o la bodega) responde con la publicKey específica para esa operación.
4. Automatización: El backend puede ofrecer la dirección de baja/burn por defecto al construir la transacción, según la bodega seleccionada.

La opción 3 (preaviso/interacción) fomenta la trazabilidad y la comunicación, y permite que la bodega gestione el proceso de baja de forma controlada.

En resumen: es una solución robusta, flexible y fácil de auditar. Puedes implementarla mostrando la dirección en el frontend, o generando la interacción

En el endpoint /baja-token, recibe el keystore y passphrase del usuario (o la clave privada).
Descifra la clave privada y crea una instancia de Wallet con la clave pública y privada del usuario.
Usa esa instancia para crear y firmar la transacción de burn.


2. **Recepción y validación (Backend):**
   - El backend recibe el `idTransaccion` y la dirección pública del usuario.
   - Busca la transacción en la blockchain y valida que el usuario es el propietario actual del token.

3. **Generación de la baja:**
   - Si la validación es correcta, el backend inicia una nueva transacción:
     - **Destino:** Dirección burn de la bodega correspondiente (o dirección especial de baja/destrucción).
     - **Origen:** Clave pública del usuario (firma que compró la botella).
     - **Cantidad:** El token/botella a dar de baja.
   - La transacción se firma y se añade a la mempool para ser minada.

4. **Registro en blockchain:**
   - El minado no debería generar premio. La blockchain refleja que el token ha sido transferido a la dirección burn/bodega.
   - El historial muestra la baja y la trazabilidad completa del activo.

5. Cuando el backend recibe y procesa una transacción BURN (por ejemplo, en el endpoint POST /transaction), tras validar y minar la transacción, puedes disparar una función que envíe un correo usando Nodemailer.
El correo puede incluir detalles como: dirección del usuario, cantidad quemada, txId, fecha, dirección de burn, etc.
---

## Opciones de baja
- **Devolución a bodega:** Transferencia a la dirección de la bodega.
- **Destrucción/burn:** Transferencia a una dirección burn (sin clave privada conocida).

---

## Ventajas
- Mantiene la trazabilidad y la transparencia.
- No elimina registros, solo cambia el estado del token.
- Permite auditar el historial completo de cada botella/token.

---

## Notas
- El proceso puede adaptarse para otros motivos de baja (pérdida, consumo, destrucción) usando diferentes direcciones destino.
- La lógica de validación y firma debe garantizar que solo el propietario actual puede iniciar la baja.

---

**Este documento sirve como base para discutir e implementar el flujo de baja en el sistema.**


Te explicas perfectamente y tu análisis es correcto. En blockchain tipo UTXO, el proceso estándar es:

El UTXO original (txId: 3fbfe152...) se "gasta" cuando se usa como input en una nueva transacción (en este caso, la de baja).
El nuevo UTXO generado por la transacción de baja (id: 516332f7...) es el que ahora está en la dirección burn/bodega.
Por lo tanto:

El UTXO original queda automáticamente "anulado" (gastado) al ser usado como input. Ya no puede volver a usarse.
El UTXO de la transacción de baja es el que queda registrado como "quemado" en la dirección burn/bodega.
No necesitas hacer nada extra para anular el UTXO original: la lógica UTXO lo gestiona. Solo los UTXOs no gastados pueden usarse, y el original deja de estar disponible en cuanto se usa como input.

Si quieres dejar constancia explícita en el historial:

Puedes registrar en la blockchain (o en tu sistema) que el UTXO original fue gastado en la transacción de baja.
El historial mostrará ambos: el gasto del UTXO original y la creación/quema del nuevo.
En resumen:

El UTXO original se anula automáticamente al gastarse.
El nuevo UTXO queda en la dirección burn/bodega.
El historial refleja ambos movimientos.
¿Quieres que te ayude a mostrar este historial de forma más clara en el frontend/backend?


Tu análisis es correcto:
El endpoint /utxo-balance/:address solo muestra los UTXOs actualmente disponibles para una dirección, no el historial completo (UTXOs gastados, quemados, etc.).

Para obtener el historial completo, necesitas comparar:

Los outputs recibidos por la dirección (UTXOs creados).
Los inputs que gastan esos UTXOs (UTXOs gastados).
Los outputs enviados a la dirección burn/bodega (UTXOs quemados).
Esto se logra recorriendo toda la blockchain y mempool, y para cada transacción:

Si la dirección aparece en outputs, es un UTXO recibido.
Si la dirección aparece en inputs, es un UTXO gastado.
Si el output va a la dirección burn/bodega, es un UTXO quemado.
La comparación se hace así:

Recopilas todos los outputs donde la dirección aparece.
Para cada output, buscas si fue gastado (aparece como input en otra transacción).
Si fue gastado, lo marcas como “gastado”; si no, como “disponible”.
Si el output va a la dirección burn/bodega, lo marcas como “quemado”.
Esto no modifica la lógica de la blockchain, solo recorre y compara los datos.

¿Quieres que te proponga el código para un endpoint /wallet-history/:address que devuelva ese historial completo?
Solución recomendada:

El frontend debe importar la wallet del usuario (keystore del usuario, no la global).
Al hacer burn, la transacción debe ser firmada por la clave privada del usuario propietario del UTXO.
El backend debe validar que la wallet que firma corresponde al propietario del UTXO.
Checklist para el flujo correcto:

El usuario importa su keystore y su wallet se inicializa en el frontend.
El usuario ve sus UTXOs y selecciona el que quiere quemar.
Al hacer clickSolución recomendada:

El frontend debe importar la wallet del usuario (keystore del usuario, no la global).
Al hacer burn, la transacción debe ser firmada por la clave privada del usuario propietario del UTXO.
El backend debe validar que la wallet que firma corresponde al propietario del UTXO.
Checklist para el flujo correcto:

El usuario importa su keystore y su wallet se inicializa en el frontend.
El usuario ve sus UTXOs y selecciona el que quiere quemar.
Al hacer click en Burn:
El recipient es la dirección de burn.
El importe es el del UTXO seleccionado.
La transacción se firma con la clave privada del usuario.
El backend valida que la firma corresponde al propietario del UTXO.
El UTXO desaparece de la wallet del usuario y aparece en la dirección de burn (no se puede gastar más). en Burn:
El recipient es la dirección de burn.
El importe es el del UTXO seleccionado.
La transacción se firma con la clave privada del usuario.
El backend valida que la firma corresponde al propietario del UTXO.
El UTXO desaparece de la wallet del usuario y aparece en la dirección de burn (no se puede gastar más).
ejemplo concreto: 
maest@WALK CLANGARM64 ~/Documents/magnumsmaster (feature/wallet-historial)
$ curl http://localhost:3000/address-history/0422b0e2a849d9618f8963a970c759c9eafef98e111c888ec0a0fc3810bf924cac39e3f8d0e1e9fb1eebfda59e52415b5c11e4bf5ac6dd7e72f5a3e5acf2290ffd
{"address":"0422b0e2a849d9618f8963a970c759c9eafef98e111c888ec0a0fc3810bf924cac39e3f8d0e1e9fb1eebfda59e52415b5c11e4bf5ac6dd7e72f5a3e5acf2290ffd","history":[{"txId":"init-fund-1","type":"recibido","amount":5000,"blockHash":"000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f","outputIndex":0,"status":"mined"},{"txId":"e0e3eb97426bd2b3a41982e9917e1e842b1ecf98611d46b6d1ccbcbaae286760","type":"recibido","amount":4800,"blockHash":"00047520a01644fc1500c1f62e4441e5453e2b969d04505b3fc977008511943a","outputIndex":1,"status":"mined"},{"txId":"e0e3eb97426bd2b3a41982e9917e1e842b1ecf98611d46b6d1ccbcbaae286760","type":"gastado","amount":5000,"blockHash":"00047520a01644fc1500c1f62e4441e5453e2b969d04505b3fc977008511943a","inputIndex":0,"status":"mined"},{"txId":"01a7a56709582856460bf22bfbe08e8c64888c63d55ab75c3334ab5669218ec4","type":"recibido","amount":50,"blockHash":"00047520a01644fc1500c1f62e4441e5453e2b969d04505b3fc977008511943a","outputIndex":0,"status":"mined"},{"txId":"836015bb2116250f923def5edf487210448228d2e4b0a421f5e8cf9daa0cc881","type":"gastado","amount":4800,"blockHash":"000025c933724c4abd5c26cfad5ef3ff3924930ec2cabec9b294c842ecccb306","inputIndex":0,"status":"mined"},{"txId":"01a7a56709582856460bf22bfbe08e8c64888c63d55ab75c3334ab5669218ec4","type":"recibido","amount":50,"blockHash":"000025c933724c4abd5c26cfad5ef3ff3924930ec2cabec9b294c842ecccb306","outputIndex":0,"status":"mined"},{"txId":"3ac9aa3af11aaeedd234dcbe394627950e913757cee2345fa7f10aa352eddc49","type":"recibido","amount":4800,"blockHash":"00000f1f303a0eb9f4f8b1272f6209688f74339503b6cc84bc8fc22250c08f18","outputIndex":0,"status":"mined"},{"txId":"01a7a56709582856460bf22bfbe08e8c64888c63d55ab75c3334ab5669218ec4","type":"recibido","amount":50,"blockHash":"00000f1f303a0eb9f4f8b1272f6209688f74339503b6cc84bc8fc22250c08f18","outputIndex":0,"status":"mined"},{"txId":"f1eadc630cb16d0d834d5596c3a9906f73a3bb0aecf6396881a94f9347c4a599","type":"gastado","amount":50,"blockHash":"00000080176623be20813213605c883fe5026744a775a34a7a1706659a50a619","inputIndex":0,"status":"mined"},{"txId":"f1eadc630cb16d0d834d5596c3a9906f73a3bb0aecf6396881a94f9347c4a599","type":"quemado","amount":4850,"blockHash":"00000080176623be20813213605c883fe5026744a775a34a7a1706659a50a619","inputIndex":0,"outputIndex":0,"status":"mined"},{"txId":"f1eadc630cb16d0d834d5596c3a9906f73a3bb0aecf6396881a94f9347c4a599","type":"gastado","amount":4800,"blockHash":"00000080176623be20813213605c883fe5026744a775a34a7a1706659a50a619","inputIndex":1,"status":"mined"},{"txId":"f1eadc630cb16d0d834d5596c3a9906f73a3bb0aecf6396881a94f9347c4a599","type":"quemado","amount":4850,"blockHash":"00000080176623be20813213605c883fe5026744a775a34a7a1706659a50a619","inputIndex":1,"outputIndex":0,"status":"mined"},{"txId":"01a7a56709582856460bf22bfbe08e8c64888c63d55ab75c3334ab5669218ec4","type":"recibido","amount":50,"blockHash":"00000080176623be20813213605c883fe5026744a775a34a7a1706659a50a619","outputIndex":0,"status":"mined"}]} cual sería tu resumen de esta wallet y sus utxos?

Te creo la función para el botón #historial en el frontend, que:

Obtiene la publicKey importada.
Realiza la petición GET a /address-history/:address.
Muestra los resultados en un modal, usando el estilo de modales que ya usas.
Te dejo el código listo para insertar en tu archivo JS (por ejemplo, en web-demo.js). Si usas modales personalizados, el ejemplo usa un modal básico con HTML y CSS, pero puedes adaptar el contenido fácilmente.

// ...existing code...

// Función para mostrar el historial en un modal
function showHistorialModal(historyData) {
  // Crea el contenido HTML del historial
  const rows = historyData.history.map(item => `
    <tr>
      <td>${item.txId}</td>
      <td>${item.type}</td>
      <td>${item.amount}</td>
      <td>${item.destino || '-'}</td>
      <td>${(item.to && item.to.join('<br>')) || '-'}</td>
      <td>${item.status}</td>
      <td>${item.timestamp}</td>
    </tr>
  `).join('');
  const html = `
    <div class="modal-overlay"></div>
    <div class="modal">
      <h2>Historial de la wallet</h2>
      <table>
        <thead>
          <tr>
            <th>TxID</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Destino</th>
            <th>To</th>
            <th>Estado</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <button id="closeModal">Cerrar</button>
    </div>
  `;
  // Inserta el modal en el body
  const modalDiv = document.createElement('div');
  modalDiv.id = 'historialModal';
  modalDiv.innerHTML = html;
  document.body.appendChild(modalDiv);
  // Cierra el modal al hacer click en cerrar
  document.getElementById('closeModal').onclick = () => {
    modalDiv.remove();
  };
}

// Evento click para el botón historial
document.getElementById('historial').addEventListener('click', async () => {
  // Obtén la publicKey importada (ajusta si tu variable es diferente)
  const publicKey = document.getElementById('senderPub').value;
  if (!publicKey) {
    alert('No se ha importado ninguna wallet.');
    return;
  }
  try {
    const res = await fetch(`/address-history/${publicKey}`);
    const data = await res.json();
    showHistorialModal(data);
  } catch (err) {
    alert('Error al consultar el historial: ' + err.message);
  }
});

// ...existing code...