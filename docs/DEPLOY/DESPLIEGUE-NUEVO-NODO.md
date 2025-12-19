# DESPLIEGUE-NUEVO-NODO.md

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