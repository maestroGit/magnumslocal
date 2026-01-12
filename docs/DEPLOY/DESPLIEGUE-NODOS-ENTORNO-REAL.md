## Ajuste de CORS y CSP para dominio propio

Si tu backend ahora funciona bajo un dominio propio (por ejemplo, `https://app.blockswine.com`), debes ajustar la configuración de CORS y Helmet/CSP en el backend:

### 1. CORS
En tu archivo `server.js`, ajusta la expresión regular y las variables:

```js
const PROD_API = process.env.PROD_API || "https://app.blockswine.com";
const PROD_API_HTTP = process.env.PROD_API_HTTP || "http://app.blockswine.com";

const allowedPattern = isProduction
    ? /^https?:\/\/(app\.blockswine\.com)$/
    : /^http:\/\/localhost(:\d+)?$/;

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedPattern.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
};
app.use(cors(corsOptions));
```

### 2. Helmet / Content Security Policy (CSP)
Incluye tu dominio en los `connect-src`, `script-src`, etc.:

```js
const connectSrc = [
    "'self'",
    ...(isProduction ? [PROD_API, PROD_API_HTTP] : [LOCAL_API]),
];

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                "default-src": ["'self'"],
                "connect-src": connectSrc,
                "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", PROD_API],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", "data:", PROD_API],
            },
        },
    })
);
```

### 3. Middleware para servir JS ESM
Asegúrate de tener este middleware antes de los endpoints y del manejador de errores:

```js
app.use("/js", (req, res, next) => {
    if (req.path.endsWith(".js")) {
        res.type("application/javascript");
    }
    next();
});
app.use(express.static(path.join(__dirname, "./public")));
```

---
Con estos cambios, tu backend permitirá y servirá correctamente los archivos JS ESM desde tu dominio propio, evitando errores 500 y problemas de CORS/CSP.
Ejemplo: Cómo desplegar tu red con dos Raspberry Pis en localizaciones remotas
1. Prerrequisitos para cada Raspberry Pi
Obtener una Raspberry Pi (con Raspbian OS u otra distro de Linux basada en Debian).
Conexión a internet (preferiblemente fija/estable).
Acceso remoto (SSH, VNC, etc. para administrar la Pi desde otra ubicación).
Instalar Node.js y Git en cada Raspi:
sh
sudo apt update
sudo apt install nodejs npm git
node -v
npm -v
2. Clona tu repositorio de la blockchain en ambas Raspberrys
sh
git clone https://github.com/tuusuario/tu-bloquechain
cd tu-bloquechain
npm install
3. Configura los nodos
Decide puertos HTTP y P2P para cada nodo. Por ejemplo:
Raspberry Francia (Budeos): HTTP 3001, P2P 5001
Raspberry España (Logroño): HTTP 3002, P2P 5002
Cada nodo debe saber de su(s) peer(s):
Francia: PEERS=ws://ip_espana:5002
España: PEERS=ws://ip_francia:5001
IMPORTANTE: Si están detrás de routers, tendrás que hacer port forwarding en ambos lugares para los puertos 5001 y 5002 (P2P).
4. Asigna IPs públicas o usa DDNS
Determina la IP pública de cada Pi (puedes usar ipinfo.io desde línea de comandos: curl ifconfig.me)
Si las IPs cambian frecuentemente, usa duckdns.org o similar para obtener un dominio dinámico.
5. Abre puertos en el router (forwarding)
Configura el router de cada bodega para redirigir puertos (ejemplo: 5001 → Pi Francia, 5002 → Pi España).
Esto permite conexiones entre nodos aunque estén en redes privadas distintas.

6. Inicia el nodo en cada Raspberry
En Francia (Budeos):

sh
cd tu-bloquechain
export HTTP_PORT=3001
export P2P_PORT=5001
export PEERS=ws://ip_espana:5002
node server.js
En España (Logroño):

sh
cd tu-bloquechain
export HTTP_PORT=3002
export P2P_PORT=5002
export PEERS=ws://ip_francia:5001
node server.js
Sustituye ip_francia por la IP pública/DDNS de la Pi en Francia, y ip_espana por la IP pública/DDNS de la Pi en España.

7. Verifica conectividad
Usa curl http://localhost:3001 en Francia y curl http://localhost:3002 en España para comprobar que el servidor HTTP responde.
Revisa los logs para asegurarte de que los nodos se conectan entre sí a través de WebSocket en los puertos P2P.
8. Prueba desde el frontend
Apunta el frontend a las direcciones públicas (http://ip_francia:3001, http://ip_espana:3002).
Ya tienes tu red básica distribuida.
Resumen de pasos - Checklist
Instala Node, npm y tu código en cada Raspberry Pi
Configura los peers usando las IPs públicas o DDNS de cada ubicación
Abre los puertos P2P y HTTP en los routers de cada bodega
Lanza los nodos usando variables de entorno
Verifica que los nodos están conectados entre sí
Haz las pruebas desde el frontend
EJEMPLO DE VARIABLES DE ENTORNO
Francia:

sh
export HTTP_PORT=3001
export P2P_PORT=5001
export PEERS=ws://espana.duckdns.org:5002
España:

sh
export HTTP_PORT=3002
export P2P_PORT=5002
export PEERS=ws://francia.duckdns.org:5001
¿Qué cambia respecto a tu script local?
Ya no usas CMD ni PowerShell ni start, solo Node.js en cada Pi.
Las ventanas son comandos SSH o terminales abiertos en cada ubicación/remota.
Definir los peers con IP pública o dominio y asegurarse de que los routers permiten tráfico entre Raspberrys.


# Los nodos de Bitcoin Core sí pueden funcionar detrás de routers/firewalls sin configurar port forwarding manual en la mayoría de los casos—y esto se debe a una combinación de varios factores y mecanismos implementados en la red Bitcoin.

¿Cómo logra Bitcoin Core la conectividad P2P sin port forwarding manual?
1. Red saliente "outbound"
Por defecto, Bitcoin Core inicia conexiones salientes a otros nodos.
Estas conexiones salientes no requieren abrir puertos en el firewall/router porque los routers NAT/firewall permiten por defecto conexiones que se originan desde dentro de la red (desde la Pi, PC, servidor, etc.).
Esto significa:

Un nodo Bitcoin Core puede sincronizar y participar en la red como un "nodo cliente", recibiendo bloques/tx y enviando información usando solo conexiones salientes.
No es necesario abrir el puerto 8333 para funcionar como "nodo normal".
2. Nodos escuchando ("inbound") y NAT traversal
Si quieres que tu nodo reciba conexiones entrantes (ser un "full relay node" o "public node"), entonces sí deberías abrir y anunciar el puerto (por defecto, TCP 8333).
Bitcoin Core intenta automáticamente habilitar esto usando varios mecanismos:
a. UPnP (Universal Plug and Play)
Bitcoin Core soporta UPnP, un protocolo que permite al software pedirle al router que abra automáticamente el puerto TCP 8333, sin que el usuario lo configure manualmente.
Esto funciona en la mayoría de routers domésticos, salvo que esté desactivado.
Puedes desactivar/activar con las opciones -upnp (-upnp=1 para activar).
b. NAT-PMP
Similar a UPnP, pero para routers Apple/compatibles.
Bitcoin Core puede usarlo para abrir puertos automáticamente.
c. IPv6
Si tienes IPv6 público, el nodo puede recibir conexiones entrantes nativamente (no hay NAT), sin port forwarding.
d. Redes anónimas y relay
Soporte para Tor y I2P permite a los nodos funcionar como "reachables" sin abrir puertos públicos en la red local.
Resumen de roles de nodos en Bitcoin:
Tipo de nodo	¿Sin port forwarding?	¿Recibe conexiones entrantes?	¿Publica su IP?
Cliente/outbound-only	✅	❌	No
Relay (public/inbound)	Opcional via UPnP/NAT-PMP/IPv6	✅	Sí (anuncia IP:puerto)
¿Qué ocurre si no abres el puerto?
Tu nodo funcionará perfectamente para recibir, validar y retransmitir transacciones y bloques usando conexiones salientes.
No será contactado directamente por otros nodos que busquen peers.
No contribuye a la redundancia de la red aceptando nuevas conexiones.
Suficiente para la mayoría de usuarios y para sincronización.
¿Por qué no lo puedes hacer igual en tu blockchain?
Si tu código P2P solo acepta conexiones entrantes (es decir, espera que otros lo llamen), y no inicia conexiones salientes, entonces necesitarás port forwarding.
Si tus nodos admiten conexiones salientes a los peers (como Bitcoin Core lo hace, simplemente iniciando una conexión a otros nodos), no necesitas port forwarding para operar en modo cliente.

¿Quieres hacerlo igual que Bitcoin Core?
Asegúrate de que tus nodos inicien conexiones salientes a otros peers, y no dependan solo de ser contactados.
Puedes implementar UPnP/NAT-PMP si quieres que tus nodos sean "public relay nodes".
¿Referencia Bitcoin Core config?
bitcoind -upnp=1                 # Activa UPnP
bitcoind -listen=1               # Permite conexiones entrantes
bitcoind -connect=<peer_IP>      # Conexión manual saliente a peer

En la práctica:
Las redes P2P modernas (Bitcoin, Ethereum, etc.) funcionan gracias a que casi todos los nodos inician conexiones salientes y solo algunos "full nodes" tienen puertos abiertos para recibir nuevas conexiones.

¿Quieres adaptar tu blockchain para funcionar sin port forwarding como Bitcoin?
Te puedo guiar para que tus nodos siempre hagan conexiones salientes y concatenen su red aunque estén en NAT.
Incluso puedes agregar UPnP para mayor compatibilidad.

# Arquitectura híbrida que usan casi todas las grandes redes blockchain y P2P!
Es una estrategia muy eficiente, escalable y práctica para el mundo real. Te explico por qué y cómo hacerlo con tus nodos:

¿Cómo funciona la arquitectura híbrida en una red blockchain?
1. ¿Qué es arquitectura híbrida?
Nodo principal ("full node relay"): Por ejemplo, tu nodo en Logroño. Tiene puertos abiertos (ejemplo: HTTP, P2P), recibe conexiones entrantes desde cualquier nodo. Sirve de "puerta de entrada" y "relay" para la red.
Nodos en otras ubicaciones ("outbound-only"): Por ejemplo, las Raspberry Pi en otras bodegas. No necesitan abrir puertos, ni VPN ni ZeroTier; simplemente inician conexiones salientes hacia el nodo de Logroño.
Así, todos los nodos están interconectados, y solo uno tiene la responsabilidad de ser el "hub público".
Esta estrategia la usan Bitcoin, Ethereum, IPFS, y muchos sistemas P2P. En Bitcoin, se llaman "public relay node" (los que tienen puertos abiertos) y "private/outbound nodes" (nodos detrás de NAT/firewall que solo conectan a relays).

2. Ventajas de este modelo
Simplicidad: Solo necesitas abrir puertos en un nodo (el de Logroño).
Seguridad: El resto de nodos están protegidos por su NAT/firewall.
Escalabilidad: Puedes añadir decenas o cientos de nodos sin preocuparte por routers/remotos, solo necesitas que puedan hacer conexiones salientes por internet.
Estabilidad: El nodo público nunca se queda “solo”, pues todos los demás lo buscarán como punto de entrada.
3. Ejemplo concreto para tu caso
Supongamos:

Nodo Logroño (Full Node Relay)
IP pública: A.B.C.D
Puertos abiertos: HTTP 3001, P2P 5001
Recibe conexiones entrantes y hace también salientes si lo deseas
Raspberry Francia (Outbound Node)
IP privada, detrás de NAT
Sin puertos abiertos
Se conecta a Logroño via ws://A.B.C.D:5001, por ejemplo
Configuración de PEERS:

Logroño:
PEERS=ws://francia.duckdns.org:5002,ws://...
(puedes poner otras IP si tienes más nodos públicos, pero con esto basta para empezar)
Francia:
PEERS=ws://A.B.C.D:5001
Solo necesita iniciar conexión saliente a Logroño.
Arranque del nodo Francia:

sh
export HTTP_PORT=3002
export P2P_PORT=5002
export PEERS=ws://A.B.C.D:5001
node server.js
4. Expansión de la red
Puedes tener varios relay nodes en Logroño, Madrid, París, etc. (cada uno con puertos abiertos).
Los nodos “privados” conectan a uno o varios relay nodes, según se requiera (para redundancia).
¿Se corta la conexión a Logroño? El nodo de Francia puede intentar otros relays (lista de peers).
5. ¿Qué tienes que hacer en tu software?
Soportar conexiones salientes a los peers configurados (ya lo tienes).
El nodo relay debe aceptar conexiones entrantes (ya lo tienes si abres los puertos).
Opcional: Los nodos privados pueden intercambiar nodos relays (en caso de caída).
Puedes añadir lógica para que los nodos privados intenten conectarse a otros relays si el principal no responde.
6. Arquitectura gráfica (simplificada)
Code
[ Raspberry Francia ] ---> outbound ----> [ Relay Logroño (puerto abierto) ] <--- inbound <--- [ otra raspberry ]
                                                                          |
                                                           Outbound/inbound a otros relays/nodos
7. Ejemplo en Blockchain reales
En Bitcoin, la mayoría de los nodos están detrás de NAT y solo inician conexiones salientes a los "full nodes relay" (con puertos abiertos).
En Ethereum, igual: "public bootnodes", mucha gente conecta en modo privado sin abrir puertos.
En IPFS y redes P2P de archivos es igual.
Conclusión
Sí, puedes y deberías usar una arquitectura híbrida:

Uno o más nodos públicos (“relays”) con puertos abiertos.
Muchos nodos que solo hacen conexiones salientes (no requieren port forwarding, VPN, ni nada).


📝 Task List: Nodo Relay/BooTNODE + Red Resiliente
1. Preparar el nodo Relay (Logroño como Bootnode)
 a. Elige el nodo relay:
Decide qué máquina será el nodo con IP pública y puertos abiertos (Logroño).

 b. Configura apertura de puertos:
Abre (en el router y firewall) los puertos necesarios:
- HTTP: 3001
- P2P: 5001

 c. Comprueba la IP pública:
Obtén la IP pública de Logroño con curl ifconfig.me o similar.
Apunta un dominio si quieres usar DNS dinámico (opcional).

 d. Configura el nodo/server.js:
Asegúrate de que el server acepta y gestiona conexiones entrantes (ya lo hace si utilizas WebSocket y los puertos están abiertos).

 e. Arranca el nodo relay:
sh     export HTTP_PORT=3001     export P2P_PORT=5001     export PEERS=     node server.js      (Puedes dejar PEERS vacío, o incluir otros relays si quieres, pero como bootnode principal puede estar sin peers)

 f. Verifica acceso externo:
Desde otra ubicación, intenta conectar a ws://IP_PUBLICA_LOGRONO:5001
Con herramientas como telnet IP 5001 o simplemente con otro nodo.

2. Configurar nodos privados/outbound
 a. Instala software en cada Raspberry Pi/remoto
 b. Configura los PEERS:
En cada nodo privado, define el relay como peer principal: sh     export HTTP_PORT=<puerto-local>     export P2P_PORT=<puerto-p2p-local>     export PEERS=ws://IP_PUBLICA_LOGRONO:5001     node server.js      (Sustituye con el puerto local que desees para cada Pi, por ejemplo 3002, 5002, ...)
3. Optimizar lista de peers y resiliencia
 a. Redundancia de relays:
Si puedes, configura más de un relay en diferentes localizaciones; añádelos a la lista de PEERS de cada nodo privado: sh     export PEERS=ws://IP_RELAY1:5001,ws://IP_RELAY2:5001     

 b. Actualiza tu configuración de peers:
Haz que tu software de nodo: - Intente conexión a todos los peers en la lista. - Si un peer cae, intente reconectar periódicamente. - Permite que el nodo actualice su lista de peers desde otros nodos (peer exchange o "peer discovery").

 c. Opcional: implementar “peer discovery”
(Primero puedes implementar lista fija e ir evolucionando a peer exchange/descubrimiento dinámico).

 d. Monitoriza los nodos:
Añade healthchecks o logs para saber si el nodo ha perdido conexión y que intente recuperarla automáticamente.

4. Testea la red distribuida
 a. Arranca los nodos one by one
 b. Comprueba que conectan al relay
Revisa los logs para ver conexiones activas.
 c. Prueba lo que sucede si el relay se apaga y los nodos intentan reconectar/usar otros peers.
5. Mantenimiento y mejoras
 Documenta la arquitectura y revisa regularmente la conectividad.
 Añade nodos relay si creces en horizontal.
 Considera mejorar discovery/redundancia si la red crece mucho.
⏩ Paso a paso resumido
Elige y configura tu nodo relay (“bootnode”) con puertos abiertos y una IP accesible desde fuera.
Configura los demás nodos para que conecten a ese relay como peer principal (conexión saliente).
Opcional: Añade más de un relay y ponlos en la lista de peers de cada nodo privado.
Verifica siempre desde el exterior (otra Pi, PC, VPS, etc.) que los nodos conectan correctamente.
Asegura que si el relay cae, los nodos reconecten y/o intenten los otros relays de la lista.
Monitoriza y mantén la topología.


# Esta es una estrategia muy típica antes de desplegar en dispositivos físicos (“field test”): usar máquinas virtuales (VMs), servicios en la nube o hosting para crear una mini-red distribuida de nodos.
Así puedes controlar todo (IP, puertos, sistema operativo, versiones) y simular el tráfico y la conectividad real entre nodos de usuarios sin los retos de hardware y red local.

¿Qué necesitas para una versión mínima usando hosting/cloud/VMs?
1. Hosting o máquinas virtuales
Ejemplos:
VPS (Virtual Private Server): DigitalOcean, Hetzner, OVH, Linode, AWS Lightsail, Vultr, Azure, Google Cloud, etc.
Máquinas virtuales on-premise (VMware, VirtualBox, Proxmox).
Incluso contenedores en un servidor, si lo prefieres.
2. Dominio y/o IP fija
IP pública fija:
El VPS te da una IP pública para cada nodo (ideal para relay).
Si usas varias máquinas en un servidor físico, puedes mapear puertos.
Dominio:
Opcional, más fácil para los usuarios. Puedes registrar un dominio y apuntarlo a tu nodo principal (relay).
Usar subdominios si quieres separar nodos (node1.blockchain.com, etc.).
3. Puertos abiertos
El principal relay node debe tener abiertos los puertos para HTTP y P2P (como tu sistema local).
Es fácil en la nube, ya sea configurando las reglas de firewall del proveedor o de Linux (iptables, ufw).
4. Despliegue del software
Instalas Node.js y tu blockchain en cada VM.
Lo lanzas igual que en tu PC/Raspberry:
sh
export HTTP_PORT=3001
export P2P_PORT=5001
export PEERS=ws://relayip:5001
node server.js
5. Simulación P2P
Tus nodos se comunican entre sí mediante HTTP y WebSockets exactamente igual que en hardware físico.
Como todo está en la nube, la conectividad será homogénea y rápida → ideal para testeo.
6. Testeo con usuarios
Puedes darle acceso HTTP/web a usuarios reales para que prueben el frontend.
Pruebas cómo funciona la red con nodos caídos, reconexión, inundación de bloques/tx, etc.
Ejemplo de infraestructura mínima
Nodo	Servicio	IP pública	Rol	Puertos abiertos
Logroño	DigitalOcean	2.2.2.2	Relay/Bootnode	3001, 5001
Francia	Hetzner	5.5.5.5	Nodo privado	3002, 5002
Madrid	AWS Lightsail	3.3.3.3	Nodo privado	3003, 5003
¿Qué pasos básicos seguirías?

Contrata los VPS/VMs (1 relay, 1-3 nodos privados).
Configura el relay con puertos abiertos y dominio/IP fija.
Despliega tu blockchain en cada máquina como en local.
Configura los peers por IP pública/dominio.
Abre los puertos según correspondan (en la nube y el firewall del OS).
Testea la red con varios nodos y usuarios.
Escala añadiendo más nodos si lo requieres.
Ventajas de esta estrategia
No dependes de routers/firewalls domésticos.
Tienes control total en acceso remoto/monitorización.
Simulas tráfico real, caída de nodos, reconexión y latencias.
Puedes escalar, duplicar, borrar nodos en segundos.
Apto para pruebas con usuarios finales (frontend real contra nodos reales).
Coste y servicios
Un VPS típico cuesta entre 4 y 10 €/mes por nodo pequeño.
Para test mínimo puedes usar instancias gratuitas que ofrecen algunos proveedores.
¿Necesitas ayuda para elegir proveedor, configurar VMs, scripts de arranque o automatizar despliegue?
Solo dime cuántos nodos quieres, qué proveedores prefieres, y te guío con los comandos y el setup ideal para empezar la red de pruebas.

# LOGS CONEXIONS EN SERVIDOR
El backend muestra logs en la terminal sobre el estado de las conexiones P2P. Cuando un nodo intenta conectarse a los peers configurados en PEERS, verás mensajes en la terminal indicando:

Si la conexión fue exitosa o fallida.
El número de conexiones activas.
Errores de conexión (por ejemplo, si el peer no está disponible).
Además, puedes consultar el endpoint /systemInfo para ver el estado de la red P2P y los peers conectados. Si quieres mejorar el manejo de errores o los logs, puedes añadir más mensajes en el código del servidor para registrar intentos y fallos de conexión. ¿Te gustaría que te indique cómo añadir logs más detallados?
La lógica debería:
Lee la variable PEERS del entorno.
Intenta conectar a cada peer.
Muestra logs en la terminal sobre el estado de cada conexión (exitosa o fallida).
Gestiona los mensajes y errores de la red P2P.


# la cadena se comparta, los PEERS NO se escuchan bidireccionalamente.

magnumslocal                    magnumsmaster (relay)
    |                                |
    +---> socket de salida -------->  (recibe en WebSocketServer)
    |                                |
    (NO PUEDE RECIBIR               (NO CONECTA DE VUELTA)
     aquí porque solo es cliente)

Cuando magnumslocal intenta hacer broadcastTransaction():
broadcastTransaction = (transaction) => {
  this.sockets.forEach((socket) => this.sendTransaction(socket, transaction));
};

this.sockets es un array VACÍO en magnumslocal porque:

magnumslocal solo tiene conexión de salida (cliente P2P)
No actúa como servidor P2P (no tiene WebSocketServer con conexiones entrantes)
Entonces this.sockets siempre está vacío
Resultado: broadcastTransaction() no envía nada a nadie
Cuando magnumsmaster intenta hacer broadcastTransaction():

magnumsmaster no tiene a magnumslocal en su lista de sockets
Porque magnumsmaster NO se conecta a magnumslocal
Apenas espera a que magnumslocal se conecte a él
La única forma de sincronizar transacciones es por HTTP (o hacer que ambos nodos sean servidores P2P, lo que es más complejo).

# Problema 
Tanto magnumsmaster como magnumslocal están configurados como nodos secundarios apuntando al mismo relay externo (Seenode):
magnumsmaster (.env.local):
  HTTP_PORT=6001
  P2P_PORT=6003
  PEERS=wss://app.blockswine.com:443

magnumslocal (.env):
  HTTP_PORT=6001
  P2P_PORT=6003
  PEERS=wss://app.blockswine.com:443

Ninguno de los dos es el relay que actúa como servidor principal.

Para que funcione la sincronización de transacciones entre magnumsmaster y magnumslocal:

Opción 1: Hacer que magnumsmaster sea el relay local

magnumsmaster: PEERS= (vacío, actúa como relay)
magnumslocal: PEERS=ws://localhost:6003 (se conecta a magnumsmaster)
Opción 2: Hacer que ambos se conecten bidireccionalamente entre sí

Más complejo, requiere que ambos sean servidores P2P

