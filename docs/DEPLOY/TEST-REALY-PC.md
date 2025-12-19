1. .env para tu PC (relay):
HTTP_PORT=3000
P2P_PORT=5001
NODE_ENV=production
PEERS=  # (vacío o solo los nodos a los que quieras que tu relay se conecte)
BODEGA_ADDRESS=0xBODEGA_DEFAULT_ADDRESS


curl ifconfig.me
37.223.66.52


Ahora, en los otros nodos (por ejemplo, en Seenode), pon en el archivo .env:

2. .env para Seenode (nodo secundario):
HTTP_PORT=3000
P2P_PORT=5001
NODE_ENV=production
PEERS=http://TU_IP_PUBLICA_DEL_PC:5001
BODEGA_ADDRESS=0xBODEGA_DEFAULT_ADDRESS


Tu archivo .env.production de Seenode está bien, pero para que actúe como relay público y seguro, deberías asegurarte de:

En Seenode (relay): No necesitas poner PEERS si solo quieres que otros nodos se conecten a él. Puedes dejar la línea PEERS comentada o vacía.
En los nodos secundarios (los que se conectan al relay): En su .env (o .env.production), pon PEERS=wss://app.blockswine.com:443.
Resumen:

Solo modifica los .env de los nodos secundarios para apuntar al relay Seenode.

###############################################################
# Ejemplo de archivo .env.example para nodo secundario
# que se conecta al relay público y seguro en Seenode
#
# Usa este archivo como plantilla para nodos que NO actúan como relay,
# sino que se conectan a la red a través del relay principal (Seenode).
#
# Relay principal: wss://app.blockswine.com:443
###############################################################

 Ahora tienes el script npm start:example, que copia .env.example a .env y arranca el servidor con esa configuración. Solo ejecuta:

npm run start:example


Hello again,

I have a Node.js backend deployed on Seenode that listens for WebSocket connections on ws://localhost:6001. I want to expose it securely via wss://app.blockswine.com:443 using Seenode’s managed SSL and proxy.

However, when I try to connect from the outside (using wscat or a client) to wss://app.blockswine.com:443, I always get “Unexpected server response: 200” and my backend does not receive any connection attempt. It seems the proxy is handling the request as HTTP instead of forwarding the WebSocket upgrade to my backend.

How can I configure my Seenode service so that wss://app.blockswine.com:443 properly forwards WebSocket connections to ws://localhost:6001? Is there a specific setting to enable WebSocket/Upgrade support in the proxy?

If there is an alternative approach or a recommended way to achieve secure public WebSocket connectivity for my backend, I would appreciate your guidance or suggestions.

Thank you!

me responden: 

Your app must listen on host 0.0.0.0 and port you have selected in the settings.
Erik • 18m ago
Then it’ll be automatically exposed through our proxy.
La respuesta de Seenode indica que tu backend debe escuchar en la IP 0.0.0.0 (no en localhost) y en el puerto que hayas configurado en el panel de Seenode para el servicio.

Esto es clave:

host: 0.0.0.0
port: (el que hayas puesto en la configuración del servicio, por ejemplo, 6001)
Así el proxy podrá redirigir correctamente tanto HTTP como WebSocket.

Pasos:

Asegúrate de que en tu código, al crear el WebSocketServer, usas host: "0.0.0.0" (no el valor por defecto).
Verifica que el puerto coincide con el configurado en Seenode

I see that your app is listening on host and port 0.0.0.0:6001 but in your setting you have port 80 so our proxy proxies everything to your app on port 80 root@deployment-web-sdzlt1djuiql-674674f695-nfjrg:/usr/src/app# netstat -tulpn
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address Foreign Address State PID/Program name
tcp 0 0 0.0.0.0:6001 0.0.0.0:* LISTEN 20/node
tcp6 0 0 :::80 These ports are opened in your app, that's why HTTP works but WS is not. Can you please keep only 1 port open, for instance 6001 and then also change the port in the settings from 80 to 6001 then it should work . ESta es la respuesta.

La respuesta indica que tu app está escuchando en 0.0.0.0:6001 (WebSocket) y en :::80 (HTTP), pero el proxy de Seenode solo reenvía tráfico al puerto 80. Por eso HTTP funciona pero WebSocket no.

Solución recomendada:

Haz que tu app escuche solo en un puerto (por ejemplo, 6001).
Cambia la configuración del proxy en Seenode para que apunte a 6001 en vez de 80.
O bien, haz que tu app escuche solo en el puerto 80 (tanto HTTP como WebSocket en el mismo puerto).

maest@WALK CLANGARM64 ~/Documents/magnumsmaster (main)
$ npx wscat -c wss://app.blockswine.com:443
Connected (press CTRL+C to quit)
< {"type":"HANDSHAKE_HTTP_URL","nodeId":"node_8252","httpUrl":"http://192.168.5.192:80","timestamp":1765901079615}
< {"type":"CHAIN","chain":[{"timestamp":1738879340000,"previousHash":"0000000000000000000000000000000000000000000000000000000000000000","hash":"000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f","data":[{"id":"init-fund-1","lote":null,"inputs":[],"outputs":[{"amount":500,"address":"04788167aa54d7998c72a27c2aa4d912851c17e4e58111a7a309b1a92174db1b9cc28f29f4454e7eb762b0c8a3245b843c9f990598a534be11463ea72a5c80e889"}]}],"body":"5b7b226964223a22696e69742d66756e642d31222c226c6f7465223a6e756c6c2c22696e70757473223a5b5d2c226f757470757473223a5b7b22616d6f756e74223a3530302c2261646472657373223a22303437383831223a2230343738383136376161353464373939386337326132376332616134643931323835316331376534653538313131613761333039623161393231373464623162396363323866323966343435346537656237363262306338613332343562383433633966393930353938613533346265313134363365613732613563383065383839227d5d7d5d","nonce":"5b7b226964223a22696e69742d66756e642d31222c226c6f7465223a6e756c6c2c22696e70757473223a5b5d2c226f757470757473223a5b7b22616d6f756e74223a3530302c2261646472657373223a2230343738383136376161353464373939386337326132376332616134643931323835316331376534653538313131613761333039623161393231373464623162396363323866323966343435346537656237363262306338613332343562383433633966393930353938613533346265313134363365613732613563383065383839227d5d7d5d","difficulty":2,"processTime":0}]}
>


¿Quieres que te ayude a modificar tu server.js para que todo escuche en el mismo puerto (por ejemplo, 80) y así el proxy funcione para ambos protocolos?


Para probar WebSockets en local, puedes usar la herramienta wscat o un cliente WebSocket en JavaScript. Aquí tienes dos formas sencillas:

1. Usando wscat (recomendado):

Instala wscat si no lo tienes:
npm install -g wscat
Conecta a tu servidor WebSocket en local (ajusta el puerto si es diferente):
wscat -c ws://localhost:6001
2. Usando el navegador (consola JS):
Abre la consola de tu navegador y ejecuta:

const ws = new WebSocket('ws://localhost:6001');
ws.onopen = () => console.log('WebSocket abierto');
ws.onmessage = (msg) => console.log('Mensaje:', msg.data);
ws.onerror = (err) => console.error('Error:', err);

El error persiste porque tu archivo HTML (view.html) tiene una política CSP fija en la etiqueta meta que no incluye ws://localhost:6001 en connect-src. Aunque el backend la envíe bien, el navegador prioriza la meta tag.

Solución:

Debes agregar ws://localhost:6001 a la directiva connect-src en la meta tag de tu HTML para desarrollo local.
Ejemplo, cambia:

<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' http://localhost:3000 ws://localhost:6001 https://*.apps.run-on-seenode.com http://*.apps.run-on-seenode.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">

Pero tu HTTP está en el puerto 3000, no en 6001.
Por eso wscat -c ws://localhost:6001 falla: ¡no hay nada escuchando en 6001!

Solución:

Cambia tu .env o la variable de entorno para que HTTP_PORT=6001
O arranca el servidor así:
HTTP_PORT=6001 node server.js
(o en Windows: set HTTP_PORT=6001 && node server.js)
Luego prueba:

wscat -c ws://localhost:6001
http://localhost:6001