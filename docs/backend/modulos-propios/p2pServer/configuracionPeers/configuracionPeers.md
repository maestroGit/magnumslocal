# Configuración de Peers en `p2pServer.js`

## ¿Cómo se configuran los peers?
La configuración de peers en app/p2pServer.js se realiza de la siguiente forma:

El método connectToPeers() utiliza la variable de entorno PEERS, que debe contener una lista de URLs de nodos separados por comas (por ejemplo: ws://ip1:puerto,ws://ip2:puerto).
No realiza network discovery automático ni por DNS; la lista de nodos debe estar definida manualmente en la configuración del entorno antes de iniciar el servidor.
Al arrancar, el módulo lee process.env.PEERS, la procesa y conecta a cada URL especificada.
Si no hay peers configurados, el nodo se considera “Genesis” y espera conexiones entrantes.
En resumen: la configuración es estática y manual, no dinámica ni por descubrimiento de red. Si quieres network discovery, habría que implementar lógica adicional (por ejemplo, usando DNS, multicast, o algún servicio de registro).

- La configuración de peers es **manual y estática**.
- Se utiliza la variable de entorno `PEERS`, que debe contener una lista de URLs de nodos (WebSocket) separadas por comas.
- Ejemplo de valor para `PEERS`:
  ```
  ws://192.168.1.10:5001,ws://192.168.1.11:5001
  ```
- Al iniciar el nodo, `p2pServer.js` lee `process.env.PEERS`, procesa la lista y conecta a cada peer especificado.
- Si no hay peers configurados, el nodo se considera "Genesis" y espera conexiones entrantes.
- **No hay network discovery automático ni por DNS.**

---

## Paso a paso para levantar o añadir un nuevo peer

### 1. Definir la URL del nuevo peer
- Determina la IP y puerto del nodo que quieres añadir (por ejemplo, `ws://192.168.1.12:5001`).

### 2. Editar la variable de entorno `PEERS`
- En el archivo de entorno (`.env`) o en la configuración de tu sistema, añade la URL del nuevo peer a la lista:
  ```
  PEERS=ws://192.168.1.10:5001,ws://192.168.1.11:5001,ws://192.168.1.12:5001
  ```

### 3. Reiniciar el nodo
- Detén y vuelve a iniciar el proceso del nodo para que lea la nueva configuración de peers.

### 4. Verificar la conexión
- Al arrancar, revisa los logs del nodo. Deberías ver mensajes indicando la conexión a los peers configurados.

---

## Notas
- Todos los peers deben estar accesibles por red y tener el puerto P2P abierto.
- Si quieres añadir peers dinámicamente, deberías modificar el código para permitir la actualización de la lista en tiempo real.
- Para topologías más avanzadas (descubrimiento automático, DNS, etc.), se requiere desarrollo adicional.

---

> Para detalles técnicos, consulta el código fuente en `app/p2pServer.js`.


# 2026/01/10
Un nodo solo puede incluir en el bloque que mina las transacciones que tiene en su propia mempool. No puede incluir transacciones de la mempool de otros nodos.

Según tu código, cuando un nodo mina:
const validTransactions = this.transactionsPool.validTransactions();
const txs = Array.isArray(validTransactions) ? [...validTransactions] : [];

Solo usa validTransactions() de su propia pool local.

El flujo correcto es:

Relay mina un bloque → incluye solo sus transacciones
Secundario recibe el bloque → sincroniza su cadena
Secundario debe limpiar su mempool → elimina las transacciones que ya están en el bloque que recibió
Las transacciones que el secundario tenía pero que el relay no minó → siguen en la mempool del secundario y esperan a ser minadas por el siguiente bloque
Esto es idéntico a Bitcoin Core. Las transacciones se propagan entre nodos, pero cada nodo decide independientemente cuáles minar. Si una transacción no llegó al relay, el relay no puede incluirla en su bloque.

Por eso tu documentación sugiere la estrategia de limpiar mempool tras sincronización: es la forma robusta de garantizar consistencia sin depender de que todos los nodos tengan exactamente las mismas transacciones.

## Bitcoin Core:
También solo usa su propia mempool. No hay forma de incluir transacciones de la mempool de otro nodo.

Lo que Bitcoin Core hace es un algoritmo de selección dentro de su mempool local:

Algoritmo de Selección de Bitcoin Core
Fee Rate (tarifa/byte) - Prioriza transacciones con mayor fee por byte
Tamaño máximo del bloque - Respeta el límite de ~4MB (con SegWit)
Dependencias entre transacciones - Si TX-B gasta un output de TX-A:
Incluye ambas o ninguna
Respeta el orden (A antes que B)
CPFP (Child Pays For Parent) - Una transacción hija con alto fee puede "rescatar" a su padre de poca tarifa
El Verdadero Secreto: Propagación de Transacciones
La consistencia en Bitcoin viene de que:

Todos los nodos reciben las mismas transacciones (el P2P relay las propaga)
Cuando se mina un bloque, la mayoría de nodos ya tiene esas transacciones en su mempool
Aunque haya divergencias temporales, eventualmente convergen
En otras palabras:
Nodo A mempool:  [TX1, TX2, TX3, TX4]
Nodo B mempool:  [TX1, TX2, TX3, TX5]  ← TX4 no llegó aún, pero TX5 sí

Cuando Nodo A mina: incluye TX1, TX2, TX3, TX4
Cuando Nodo B mina: incluye TX1, TX2, TX3, TX5

Pero después de que se propague TX4, Nodo B lo tendrá.

No hay coordinación centralizada. Es consistencia eventual gracias a la propagación P2P robusta.

Tu sistema debería hacer algo similar: asegurar que las transacciones se propaguen bien entre nodos antes de minar, en lugar de intentar sincronizar mempools.

# SINCRONIZACIÓN MEMPOOL
 Ambos proyectos tienen exactamente la misma lógica de sincronización:

magnumsmaster:
✅ broadcastTransaction() propaga transacciones
✅ MESSAGE_TYPES.transaction recibe transacciones
✅ MESSAGE_TYPES.clear_transactions limpia mempool
✅ Limpieza automática tras replaceChain
magnumslocal:
✅ Tiene exactamente la misma lógica
✅ Incluso tiene más logs en el manejo de CLEAR_TRANSACTIONS
El problema de sincronización de mempool que describes no es por los archivos copiados, sino por:

Configuración de red - Los peers no se ven mutuamente
Variable PEERS - Falta configurar correctamente en ambos nodos
Firewall/NAT - Bloquea las conexiones P2P
¿Tienes configurado PEERS correctamente en los archivos .env de ambos proyectos para que se conecten entre sí?

Ambos proyectos llaman a broadcastTransaction() de manera idéntica. Entonces, el problema probablemente sea:

Los nodos NO están conectados correctamente P2P - aunque la cadena se sincroniza, las transacciones individuales no se propagan
Las transacciones se envían pero NO se reciben en el otro lado - posiblemente por un error en el handler o por cerrar conexión antes de recibir
Pregunta clave: Cuando creas una transacción en magnumslocal, ¿ves en los logs del relay el mensaje "⬇️ Nueva transacción recibida"?

Si NO lo ves, significa que aunque la cadena se sincroniza (que es un mensaje más grande), las transacciones individuales no están llegando. Eso sugeriría un problema en:

Los sockets no se mantienen abiertos
El nodo que envía la transacción no tiene conexión saliente activa al otro nodo
Hay error silencioso al enviar
¿Puedes verificar en los logs qué sucede exactamente?