# DESPLIEGUE-NUEVO-NODO.md
23/12/2025
Iniciar con la misma wallet que le relay para iguale el block génesis.
Te conectarás con la wallet_global del Relay al Relay (dos relay)
Envía desde relay seenode a wallet que cargarás en el nodo peer para que al iniciar ya tenga saldo.
Les envío 100 q es lo q el relay volverá a recibir por minado.

Actualmente no hay un límite finito de bloques minados ni una cifra de saldo total que se distribuya por minado. El saldo inicial se configura en el bloque génesis y las recompensas de minado no parecen estar limitadas por un máximo global ni por un suministro total predefinido.

Para implementar un suministro máximo de tokens o limitar el número de bloques minados, hay que modificar la lógica para añadir estas restricciones. 

SOLUCIÓN:
para que todos los nodos compartan la misma cadena y puedan sincronizarse, debes “hardcodear” (fijar en el código) los datos del bloque génesis: su timestamp, datos, dirección de recompensa, y cualquier otro campo relevante. Así, todos los nodos, al arrancar por primera vez, generarán exactamente el mismo bloque génesis, independientemente de la wallet local.

Esto es lo que hace Bitcoin: el bloque génesis es idéntico y está definido en el código fuente, no depende de ninguna wallet privada local.

De este modo:

El bloque génesis será igual en todos los nodos.
Cada nodo podrá tener su propia wallet para minar y firmar.
No será necesario compartir la wallet global entre nodos.

Para fijar el bloque génesis y asegurar compatibilidad entre nodos, necesitas definir en el código los siguientes datos del relay (o del primer nodo que creó la red):

Timestamp del bloque génesis (fecha/hora exacta de creación).
Hash del bloque génesis (opcional, pero recomendable para validación).
Datos de la transacción de génesis:
Dirección de recompensa (publicKey del destinatario de la recompensa inicial).
Monto inicial (saldo asignado en el bloque génesis).
Otros campos relevantes de la transacción (inputs, outputs, firma si aplica).
Nonce y dificultad inicial (si tu blockchain los usa).
Cualquier otro campo personalizado que tu implementación requiera en el bloque génesis.
Con estos datos, puedes “hardcodear” la creación del bloque génesis en todos los nodos, asegurando que todos generen exactamente el mismo bloque inicial.

Para extraer los datos fijos del bloque génesis del relay actual, sigue estos pasos:

1. Busca el archivo de la blockchain (o consulta el nodo relay en ejecución) y localiza el bloque génesis (el primer bloque de la cadena).

2. Extrae y anota los siguientes campos del bloque génesis:

timestamp (marca de tiempo)
hash
previousHash (debe ser “0” o el valor que uses)
nonce
dificultad (difficulty)
transacciones (transactions/data), especialmente:
dirección de recompensa (publicKey)
monto inicial (amount)
cualquier otro campo relevante
3. Puedes obtener estos datos:

Consultando el endpoint GET /blocks del relay (te devolverá toda la cadena, el primer elemento es el génesis).
O abriendo el archivo donde se guarda la cadena (si existe persistencia en disco).
O revisando el log de arranque del relay, donde suele imprimirse el bloque génesis.

Ambas opciones son válidas, pero cada una tiene ventajas y desventajas:

Hardcodear los datos del bloque génesis:

Ventajas:
Simplicidad: todos los nodos arrancan igual, sin depender de la red.
Robusto: no depende de que el relay esté disponible.
Es el enfoque estándar en blockchains públicas (como Bitcoin, Ethereum).
Desventajas:
Si cambias el génesis, debes actualizar el código en todos los nodos.
Menos flexible ante cambios futuros.
Obtener el bloque génesis por petición al relay:

Ventajas:
Flexibilidad: puedes cambiar el génesis en el relay y los nuevos nodos lo obtienen automáticamente.
Útil en entornos de desarrollo o pruebas donde el génesis puede variar.
Desventajas:
El primer arranque depende de la disponibilidad del relay.
Si el relay cambia o hay inconsistencias, puedes tener problemas de sincronización.
No es el enfoque habitual en blockchains públicas.
Recomendación:
Para producción y máxima robustez, lo más seguro y estándar es hardcodear los datos del bloque génesis en el código de magnumslocal. Así, todos los nodos serán compatibles y no dependerán de la red para arrancar.



## Pasos estándar para desplegar un nuevo nodo en la red

1. **Clona el repositorio** en la nueva máquina.
2. **Instala las dependencias**:
   ```bash
   npm install
   ```
3. **Crea o edita el archivo `.env`** con los valores específicos para ese nodo:
   - Define el `HTTP_PORT` y `P2P_PORT`.
   - Añade en `PEERS` las direcciones (IP:puerto) de los otros nodos de la red.
   - Configura cualquier otra variable necesaria (`NODE_ENV`, `BODEGA_ADDRESS`, etc.).
4. **Abre el puerto P2P** en el firewall/router si es necesario.
5. **Arranca el backend**:
   ```bash
   npm run dev
   ```
6. **Verifica la conexión** con los otros nodos (revisa los logs y endpoints).

De este modo, cada nodo se integra correctamente en la red distribuida y puede comunicarse con los demás.

---
---
## Cómo obtener tu IP local y pública para configurar el nodo principal o relay

1. **Obtener tu IP local (LAN):**
    - En Windows:
       ```
       ipconfig
       ```
    - En Linux/Mac:
       ```
       ifconfig
       ip a
       ```
    - Busca la dirección IPv4 (ejemplo: 192.168.x.x).

2. **Obtener tu IP pública (Internet):**
    - En terminal:
       ```
       curl ifconfig.me
       curl ipinfo.io/ip
       ```
    - O visita en navegador: https://ifconfig.me o https://ipinfo.io

3. **Configura el nodo principal o relay público:**
    - Usa la IP pública y el puerto P2P configurado (ejemplo: `http://TU_IP_PUBLICA:5001`).
    - Si tienes un dominio, puedes usarlo en vez de la IP.

Con estos datos, pon las direcciones en la variable `PEERS` del `.env` de cada nodo para que todos puedan conectarse correctamente.

---

# Despliegas el relay en Seenode

Si despliegas el relay en Seenode, normalmente tendrás una IP pública (o un dominio público) asignado por el proveedor. Esa IP pública permite que otros nodos, desde cualquier parte del mundo, puedan conectarse a tu relay añadiendo esa dirección en la variable `PEERS` de sus archivos `.env`.

Por ejemplo, si Seenode te asigna la IP pública `45.67.89.123`, los otros nodos pondrán en su `.env`:
```
PEERS=http://45.67.89.123:5001
```
Así tu relay será accesible globalmente y funcionará como punto de conexión para la red.

---
## Ejemplo de archivo `.env`
```
HTTP_PORT=3000
P2P_PORT=5001
NODE_ENV=production
PEERS=http://relay.seenode.com:5001,http://192.168.1.100:5001,http://X.X.X.X:5001
BODEGA_ADDRESS=0xBODEGA_DEFAULT_ADDRESS
```

---
**Referencia:**
- Archivo principal: `server.js`
- Librería utilizada: [dotenv](https://www.npmjs.com/package/dotenv)

# Conexión sin abrir puertos ni usar VPN
Sí, puedes conectar nodos en diferentes países (como una Raspberry en Francia y otra en Perú) sin abrir puertos ni usar VPN, siempre que todos los nodos puedan iniciar conexiones salientes hacia los peers configurados en PEERS.

Este patrón es común en redes blockchain públicas como Bitcoin, Ethereum o IPFS:

Cada nodo inicia conexiones salientes hacia los peers (no requiere abrir puertos en el router).
Si algún nodo actúa como relay (por ejemplo, Seenode), ese nodo sí debe tener el puerto P2P abierto y accesible públicamente.
Los demás nodos solo necesitan acceso a Internet para conectarse al relay y entre sí.
Así, la red queda interconectada de forma sencilla y segura, y cada nodo puede participar sin configuraciones complicadas de red. Solo asegúrate de que los peers en PEERS sean accesibles desde cada nodo.

los nodos pueden estar conectados en distintas redes físicas o lógicas:

Red local (LAN): Nodos conectados dentro de la misma red doméstica o de oficina, usando IPs privadas (ejemplo: 192.168.x.x).
Red pública (Internet): Nodos accesibles desde cualquier lugar, usando IPs públicas o dominios (ejemplo: relay.seenode.com o X.X.X.X).
Redes mixtas: Algunos nodos en LAN y otros en Internet, conectados entre sí mediante la variable PEERS.
Esto afecta cómo configuras las IPs y puertos en el .env y si necesitas abrir puertos en el router/firewall para permitir la comunicación entre nodos que no están en la misma red local.