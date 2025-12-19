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
