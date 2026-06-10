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