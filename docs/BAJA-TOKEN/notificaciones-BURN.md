## TODO LIST 09/07/2026
ya tengo la respuesta exacta a tu duda:
sí hubo un BURN, sí aparece en el bloque… pero NO se ejecutó tu listener BURN, por eso no ves ningún log [BURN][DB].

Y ahora puedo decirte por qué con total precisión, porque tu documento lo confirma.

🟥 1. El bloque contiene un BURN real
En tu documento aparece esta salida:

"address": "0x0000000000000000000000000000000000000000EMAIL_1772712102085_"

Esto sí es un BURN, porque tu listener detecta:

js
output.address.startsWith("0x0000000000000000000000000000000000000000")
Y esa dirección cumple la condición.

🟥 2. Pero tu listener NO se ejecutó
Tu listener está dentro de:

js
if (block && Array.isArray(block.data)) {
  for (const tx of block.data) {
    for (const output of tx.outputs) {
      if (output.address.startsWith("0x0000000000000000000000000000000000000000")) {
        console.log(`[BURN][DB] Evento registrado...`);
        await BurnEvent.create(...)
      }
    }
  }
}
Sin embargo, en toda la salida del documento, NO aparece:

[BURN][DB] Evento registrado…

[BURN][DB] Error registrando evento BURN…

Nada.
Cero.
Ni un solo log.

Esto significa que ese bloque NO pasó por tu función mineBlock.

🟦 3. ¿Por qué no pasó por mineBlock? → Porque vino por replaceChain
Tu documento lo confirma:

[REPLACECHAIN][SUCCESS] Chain replaced and persisted successfully.

Y más abajo:

[P2P][CHAIN][ACCEPTED] La cadena recibida fue aceptada, reemplazada y persistida en disco.

Esto significa:

**Ese bloque NO lo minaste tú.
Lo recibiste desde otro nodo.**

Y tu listener BURN está solo en mineBlock, no en replaceChain.

Por eso:

El bloque se guardó en disco

El UTXOManager lo procesó

Los SELECT de usuarios y wallets se ejecutaron

Pero tu lógica BURN nunca se ejecutó

🟩 4. Confirmación absoluta
Tu documento muestra que el bloque con el BURN se procesó así:

[UTXO-DEBUG][AÑADIDO] Nuevo UTXO: txId=cce93353..., address=0x0000000000000000000000000000000000000000EMAIL_1772712102085_, amount=110

Pero NO aparece ningún log [BURN][DB].

Esto confirma que:

✔ El bloque sí contiene un BURN
✔ El UTXOManager lo procesó
❌ Tu listener BURN no se ejecutó
❌ No se insertó en la tabla BurnEvent
❌ No se emitió broadcastBurnNotification
❌ No se envió email
🟧 5. ¿Qué te falta? → Mover el listener BURN a replaceChain
Ahora mismo tu lógica BURN solo vive en:

mineBlock → cuando tú minas

❌ No vive en replaceChain → cuando recibes bloques de otros nodos

Pero tu documento demuestra que todos los bloques recientes entraron por replaceChain, no por mineBlock.

Por eso no ves ningún BURN registrado.

🟩 6. Solución exacta (la que necesitas implementar)
Añade esto dentro de replaceChain después de persistir cada bloque:
js
for (const block of newChain) {
  if (!Array.isArray(block.data)) continue;

  for (const tx of block.data) {
    if (!Array.isArray(tx.outputs)) continue;

    for (const output of tx.outputs) {
      if (typeof output.address === "string" &&
          output.address.startsWith("0x0000000000000000000000000000000000000000")) {

        console.log(`[BURN][DB][REPLACECHAIN] Evento detectado en bloque ${block.hash}`);

        await BurnEvent.create({
          tx_id: tx.id,
          burn_address: output.address,
          amount: output.amount
        });

        const bodegaId = output.address.slice(42);
        const wineloverWallet = tx.inputs?.[0]?.address || null;
        const fecha = block.timestamp || new Date().toISOString();

        global.p2pServer?.broadcastBurnNotification({
          txId: tx.id,
          bodegaId,
          wineloverWallet,
          amount: output.amount,
          fecha
        });
      }
    }
  }
}
Con esto:

✔ Detectas BURN al minar
✔ Detectas BURN al recibir bloques
✔ Inserta en BD
✔ Emite WS
✔ Puedes enviar email
## END

## objetivo: un evento on‑chain → email + notificación visual en dashboard.
1. Sistema Unificado de Notificaciones (On-Chain a Dashboard/Email)
El sistema actual implementa un flujo de notificaciones reactivas end-to-end que se activa cuando se detecta un evento TOKEN_BURNED en la blockchain. Integra en un único servicio de Node.js la persistencia en base de datos (PostgreSQL), la comunicación bidireccional en tiempo real (Socket.io) y el envío de alertas asíncronas por correo electrónico (Nodemailer).

2. Arquitectura del Flujo de Datos
Entrada (Ingress): El listener de la blockchain (o un webhook intermedio) detecta el Burn e invoca el endpoint interno de la API.

Persistencia: Se escribe el evento de inmediato en la tabla notifications de PostgreSQL (JSONB para flexibilidad del payload).

Distribución en Tiempo Real: El servidor emite el evento a través de Socket.io filtrando por salas (Rooms) dinámicas bajo el patrón winery_${wineryId}.

Notificación Off-Chain: Se delega el envío del correo a Nodemailer utilizando el pool de conexiones SMTP.

3. Análisis de Ventajas y Desventajas (Pros & Contras)
Al utilizar la Arquitectura Unificada Actual:
👍 Pros
Simplicidad de Despliegue (Time-to-Market): Un único servicio Node.js y una base de datos PostgreSQL. No requiere configurar ni mantener infraestructura adicional (como Redis o clusters de mensajería).

Depuración Centralizada: Al ocurrir todo en el mismo proceso, la trazabilidad de un error (desde que entra el evento hasta que se envía el email) se gestiona con un único flujo de logs.

Baja Latencia Inicial: La comunicación entre la API y el servidor WebSocket es directa en memoria, lo que reduce a milisegundos la notificación en el frontend tras recibir el evento.

Consistencia de Datos Fácil: Al usar PostgreSQL de forma directa, la gestión de transacciones es nativa y es sencillo asegurar que una notificación no se envíe si la escritura en la base de datos falla.

👎 Contras
Bloqueo del Event Loop (Single Thread): Nodemailer y la serialización de JSON pesados consumen ciclos de CPU. Si el volumen de tokens quemados aumenta drásticamente, el envío de emails puede ralentizar las conexiones WebSocket activas.

Punto Único de Fallo (SPOF): Si el servidor de Express se cae debido a un error de memoria en WebSockets o un error de formato en un email, todo el sistema de escucha y consulta histórica queda inoperativo.

Falta de Tolerancia a Fallos (Garantía de Entrega): Si el servidor SMTP externo falla o da un timeout, el correo de la bodega se pierde para siempre a menos que se implemente manualmente una lógica compleja de reintentos en base de datos.

Escalabilidad Horizontal Limitada: Si necesitas levantar dos instancias del backend detrás de un balanceador de carga, los WebSockets fallarán porque el usuario conectado a la Instancia A no recibirá los eventos emitidos por la Instancia B (aquí es donde se haría obligatorio Redis Pub/Sub).
¿Cómo guarda la información Redis?
A diferencia de Postgres, donde creas tablas con un esquema rígido, en Redis guardas los datos asociando una palabra clave a un contenido. Soporta estructuras complejas en memoria, que es precisamente lo que aprovecha BullMQ:
Strings simples: clave: "usuario_123" -> valor: "Javier"
Listas (Lists): Una fila de datos ordenada. BullMQ la usa como la cola de tareas: mete un email por la derecha (RPUSH) y el worker lo saca por la izquierda (LPOP).
Hashes: Ideales para guardar objetos pequeños (como el estado de un envío de correo).
Redis no viene a sustituir a PostgreSQL, sino a complementarlo. En la arquitectura que estamos debatiendo, Postgres sigue siendo el "cerebro" donde se auditan y guardan las notificaciones para siempre, y Redis es el "motor de alta velocidad" que coordina que los correos salgan en el orden correcto a través de las colas de BullMQ.


1) Listener de Blockchain
Objetivo: detectar el evento TOKEN_BURNED.
Checklist:

[ ] Crear servicio independiente blockchain-listener/

[ ] Conectar a provider (Alchemy, Infura, RPC propio…)

[ ] Suscribirse a eventos del smart contract

[ ] Parsear tokenId y wineryId

[ ] Publicar evento interno → eventBus.publish("token_burned", payload)

2) Event Bus (Redis Pub/Sub recomendado)
Objetivo: desacoplar los servicios.
Checklist:

[ ] Instalar Redis

[ ] Crear módulo eventBus.js con publish y subscribe

[ ] Canales: token_burned

[ ] Garantizar reconexión automática

3) Servicio de Emails (Worker)
Objetivo: enviar email a la winery afectada.
Checklist:

[ ] Crear servicio email-worker/

[ ] Suscribirse a token_burned

[ ] Buscar winery en DB por wineryId

[ ] Generar plantilla de email

[ ] Enviar con nodemailer

[ ] Registrar logs de envío

4) Servicio WebSocket
Objetivo: notificación en tiempo real al dashboard.
Checklist:

[ ] Crear servicio ws-server/

[ ] Autenticar conexión WS (JWT o session token)

[ ] Asignar al usuario a una “room”: winery_${wineryId}

[ ] Suscribirse a token_burned

[ ] Emitir evento WS → socket.emit("token_burned", data)

5) API de Notificaciones Persistentes
Objetivo: que el dashboard vea notificaciones aunque no esté conectado.
Checklist:

[ ] Crear tabla notifications en DB: 
SELECT * FROM burn_events;

SELECT column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_name = 'burn_events'
ORDER BY ordinal_position;

        "id"	"integer"	"NO"	"nextval('burn_events_id_seq'::regclass)"
        "tx_id"	"character varying"	"NO"	
        "burn_address"	"character varying"	"NO"	
        "amount"	"numeric"	"NO"	
        "fecha"	"timestamp without time zone"	"YES"	"now()"

id
wineryId
type (TOKEN_BURNED)
payload (JSON)
read (boolean)
createdAt

[ ] Endpoint GET /notifications?wineryId=xxx

[ ] Endpoint POST /notifications/mark-as-read

6) Frontend (Dashboard Winery)
Objetivo: mostrar notificaciones visuales.
Checklist:

A) Al hacer login
[ ] Llamar a GET /notifications

[ ] Mostrar badge/campanita

[ ] Renderizar lista de notificaciones

B) En tiempo real
[ ] Conectar WebSocket

[ ] Escuchar token_burned

[ ] Mostrar toast / popup

[ ] Insertar notificación en el estado local

7) Seguridad
Checklist:

[ ] Tokens JWT firmados para WS

[ ] Validación estricta de wineryId

[ ] No enviar datos sensibles por WS

[ ] Rate limiting en API

[ ] Logs de auditoría en email-worker

8) Escalabilidad futura
Checklist opcional:

[ ] Añadir colas (BullMQ) para emails

[ ] Añadir reintentos automáticos

[ ] Añadir notificaciones push móviles

[ ] Añadir panel de administración para ver eventos on‑chain

🎯 Resultado final
Con este checklist tienes una arquitectura:

Desacoplada
Escalable
Segura
Minimalista
Fácil de mantener

Y cumple tu objetivo:
un evento on‑chain → email + notificación visual en dashboard.