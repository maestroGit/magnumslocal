# VARIABLES-ENTORNO.md
El archivo VARIABLES-ENTORNO.md ha sido creado con la explicación sobre la carga de variables de entorno y la selección de puertos en server.js, incluyendo ejemplos y ventajas del uso de dotenv.

## Carga de variables de entorno y selección de puertos en `server.js`

### 1. Uso de dotenv
El backend utiliza la librería `dotenv` para cargar variables de entorno desde el archivo `.env` al arrancar el servidor. Esto permite configurar parámetros sensibles o variables de entorno sin exponerlos directamente en el código fuente.

```js
import dotenv from "dotenv";
dotenv.config();
```


### 2. Selección de puertos
El puerto HTTP y el puerto P2P se seleccionan en el arranque del backend siguiendo esta prioridad:
- **HTTP_PORT**: Se toma primero de los argumentos de línea de comandos (`process.argv[2]`), luego de la variable de entorno `HTTP_PORT`, y por último se usa el valor por defecto `3000` si no se encuentra ninguno de los anteriores.
- **P2P_PORT**: Se toma de la variable de entorno `P2P_PORT` o se usa el valor por defecto `5001`.

```js
const HTTP_PORT = process.argv[2] || process.env.HTTP_PORT || 3000;
const P2P_PORT = process.env.P2P_PORT || 5001;
```

---
## Explicación de los valores y funciones del archivo `.env`

### Valores principales

- **HTTP_PORT**: Puerto en el que el servidor HTTP escucha las peticiones. Si no se define, se usa el valor por defecto `3000`.
- **P2P_PORT**: Puerto para la comunicación P2P entre nodos de la blockchain. Si no se define, se usa el valor por defecto `5001`.
- **NODE_ENV**: Entorno de ejecución (`development`, `production`, `test`). Permite cambiar el comportamiento del backend según el entorno.
- **PEERS**: Lista de direcciones de otros nodos P2P con los que se conecta el backend. Se usa para inicializar la red de nodos.
- **BODEGA_ADDRESS**: Dirección especial utilizada para bajas temporales (bodega) en la blockchain. Si no se define, se usa un valor por defecto en el código.


### Funciones y uso en el backend

- **dotenv.config()**: Carga automáticamente las variables definidas en `.env` y las pone en `process.env`.
- **process.env**: Objeto global de Node.js que contiene todas las variables de entorno cargadas. El backend consulta aquí los valores para configurar puertos, peers, entorno, etc.
- **Selección de puertos**: El backend elige el puerto HTTP y P2P usando primero los argumentos de línea de comandos, luego las variables de entorno, y finalmente los valores por defecto.
- **Configuración de nodos P2P**: El backend lee la variable `PEERS` para saber a qué otros nodos debe conectarse en la red blockchain.
	- La variable `PEERS` contiene las direcciones (IP y puerto) de otros nodos que han descargado el mismo repositorio y han arrancado el backend en sus propias máquinas (PC, Raspberry, servidores, etc.).
	- Cada nodo ejecuta el backend y expone su puerto P2P; al iniciar, tu backend lee `PEERS` y trata de conectarse a esas direcciones para formar una red blockchain distribuida.
	- Por ejemplo, si tienes tres nodos:
		- Nodo 1: `http://192.168.1.10:5001`
		- Nodo 2: `http://192.168.1.11:5001`
		- Nodo 3: `http://192.168.1.12:5001`
	- En el `.env` de cada uno puedes poner en `PEERS` las IPs y puertos de los otros nodos. Así, todos se conectan entre sí y comparten bloques y transacciones.
- **Dirección de bodega**: Se usa en operaciones de baja temporal de tokens. Si no está definida en `.env`, se usa un valor por defecto.

### 3. Flujo de arranque
- Se inicializan las variables globales y se carga la wallet global desde `wallet_default.json` si existe.
- Si no existe, se genera una nueva wallet cifrada usando una passphrase por defecto.
- Se inicializan los servicios de blockchain, pool de transacciones y servidor P2P.
- Se configuran los endpoints y se sirve la carpeta `public` como estática.

### 4. Resumen de ventajas
- Permite cambiar puertos y configuraciones sin modificar el código fuente.
- Facilita la gestión de entornos de desarrollo, pruebas y producción.
- Mejora la seguridad al no exponer datos sensibles en el código.

---
**Ejemplo de archivo `.env`:**
```
HTTP_PORT=3000
P2P_PORT=5001
NODE_ENV=development
PEERS=http://localhost:3001,http://localhost:3002
BODEGA_ADDRESS=0xBODEGA...
```

---

---
## Pasos estándar para desplegar un nuevo nodo

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
**Referencia:**
- Archivo principal: `server.js`
- Librería utilizada: [dotenv](https://www.npmjs.com/package/dotenv)

# VARIABLE PEERS
# Explicación sobre la variable PEERS y conexión entre nodos P2P:
la variable PEERS contiene las direcciones (IP y puerto) de otros nodos que han descargado el mismo repositorio y han arrancado el backend en sus propias máquinas (PC, Raspberry, servidores, etc.). Cada nodo ejecuta el backend y expone su puerto P2P; al iniciar, tu backend lee PEERS y trata de conectarse a esas direcciones para formar una red blockchain distribuida.

Por ejemplo, si tienes tres nodos:

Nodo 1: http://192.168.1.10:5001
Nodo 2: http://192.168.1.11:5001
Nodo 3: http://192.168.1.12:5001
En el .env de cada uno puedes poner en PEERS las IPs y puertos de los otros nodos. Así, todos se conectan entre sí y comparten bloques y transacciones.

# CASO PRÁCTICO:
Deploy en Seenode como tengo ahora elrepositorio y quiero que mi maquina, este pc con la ip de mi red local y la ip pública del proveedor de interne, que valos tego que poner en PEERS para que se conecte el relay de Seenode y mi pc?

Para que tu backend se conecte tanto al relay de Seenode como a tu PC local, debes poner en la variable PEERS las direcciones (IP y puerto) de ambos nodos:

La IP y puerto del relay de Seenode (te la proporciona Seenode, por ejemplo: http://relay.seenode.com:5001).
La IP local de tu PC (por ejemplo: http://192.168.1.100:5001 si tu PC está en esa IP en tu red local).
Si tu PC tiene IP pública y el puerto está abierto, también puedes añadirla (por ejemplo: http://X.X.X.X:5001).
Ejemplo de valor para PEERS en tu .env:

Así, tu nodo intentará conectarse a todos esos peers al arrancar y formará parte de la red con Seenode y tu PC. Recuerda que cada nodo debe tener su puerto P2P abierto y accesible desde la red correspondiente.

Al clonar el repositorio en diferentes máquinas debes modificar el archivo .env en cada una para que los valores de PEERS, puertos y otras variables reflejen la configuración y direcciones de red específicas de cada nodo. Así aseguras que todos los nodos puedan conectarse correctamente entre sí y formar la red distribuida.

