## 1. Lenguaje y Estilo

- **Lenguajes:** Node.js con JavaScript ESM (type: "module" en package.json). No se detecta TypeScript ni Solidity en el backend. Uso de WebSocket (`ws`) y Express para HTTP.
- **Módulos e imports:** Importaciones ESM con `import ... from` y utilidades de `url` para `__filename`/`__dirname` vía `fileURLToPath`. No se usa `require` salvo módulos nativos en comentarios.
- **Funciones:** Predominio de arrow functions para métodos y handlers (p.ej. `listen = () => {}`, `messageHandler = (socket) => {}`), y `async/await` para operaciones asíncronas en endpoints.
- **Estilo de nombres:**
	- Clases en PascalCase: `Blockchain`, `P2PServer`, `Wallet`, `Transaction`, `TransactionsPool`, `Miner`, `UTXOManager`.
	- Métodos y variables en camelCase: `connectSocket`, `messageHandler`, `decryptPrivateKeyFromKeystore`.
	- Constantes y configuraciones en MAYÚSCULAS con guiones bajos: `INITIAL_BALANCE`, `MESSAGE_TYPES`.
- **Formato e indentación:** Código con indentación de 2 espacios, comillas dobles en strings, JSON formateado con `JSON.stringify(..., null, 2)`. Uso consistente de punto y coma omitido.
- **Estilo general:**
	- Logs detallados con prefijos contextuales `[BOOT]`, `[INIT]`, `[CORS]`, `[LOAD-GLOBAL]`.
	- Validaciones de entrada con `express-validator` y manejo de errores vía `try/catch` en endpoints.
	- Frontend: evitar estilos inline en HTML; preferir clases CSS en `public/styles.css` y utilidades (`.hidden`) para mostrar/ocultar.

## 2. Arquitectura

- **Estructura de carpetas:**
	- `server.js`: Entrypoint HTTP/WS y API REST. Configura seguridad (Helmet, Rate Limit, CORS), estáticos y endpoints.
	- `app/`: Componentes de infraestructura del nodo
		- `p2pServer.js`: Servidor WebSocket P2P, handshake, sincronización de cadena y pool.
		- `miner.js`: Minado de bloques (no inspeccionado aquí en detalle).
		- `blockchainClient.js`: Cliente RPC HTTP minimal.
		- `validator.js`: Validaciones (no inspeccionado aquí en detalle).
		- `walletCrypto.js`: cifrado/descifrado de wallet.
		- `uploads/`: keystore persistido (`wallet_default.json`).
		- `test/`: pruebas de app (si existen).
	- `src/`: Lógica de dominio
		- `blockchain.js`: cadena, validación, y mantenimiento de `utxoSet` con eliminación por `inputs` y alta por `outputs`.
		- `monitor/`: utilidades de monitor de sistema y FS.
		- `utxomanager.js`: gestión de UTXOs.
	- `wallet/`: Modelos y lógica de wallet y transacciones (`wallet.js`, `transactions.js`, `transactionsPool.js`, `lote.js`).
	- `config/`: Configuración (`constantConfig.js`, `jest.config.js`).
	- `public/`: activos estáticos servidos por Express.
	- `scripts/`: utilidades para lanzar/red de nodos (Windows y *nix).
	- `docs/`: documentación funcional y operativa.
	- `src/monitor`: monitorización de sistema y ficheros para nodos.

- **Patrones de diseño:**
	- Separación por capas: HTTP/API (`server.js`), P2P (`app/p2pServer.js`), dominio blockchain (`src/blockchain.js`), wallet (`wallet/*`).
	- Objetos de servicio y modelos: `Blockchain`, `P2PServer`, `Wallet`, `TransactionsPool`, `UTXOManager`.
	- Handlers orientados a eventos en P2P (listeners de `message`, `open`, `close`).

- **Integraciones externas:**
	- HTTP REST con Express y middleware: `helmet`, `cors`, `express-rate-limit`, `express-validator`, `multer`.
	- WebSocket con `ws` para red P2P.
	- Criptografía: `crypto` nativo, `elliptic`, `scrypt-js` (parámetros PBKDF2 en keystore), `crypto-js`.
	- Entorno: `dotenv` para variables de entorno; CSP y CORS condicionados a `NODE_ENV`/dominios.

- **Tests y CI/CD:**
	- Pruebas con Jest (`jest` + `babel-jest`), `testEnvironment: 'node'` y `transform` para `.js`.
	- No se observan flujos CI/CD en el repo; scripts de red y arranque en `package.json` cubren dev/prod/test.

### Operación y Scripts

- Lanzadores multi-nodo y simulaciones en `scripts/` con variantes para Windows (`.bat`) y *nix (`.sh`).
- Scripts clave:
	- `nodeLauncher*.js`: bootstrap de nodos múltiples, lectura de `PEERS` y `HTTP_PORT` del entorno.
	- `mine.*`: utilidades para iniciar minado y pruebas.
	- `kill-ports.*`: liberación de puertos ocupados.
	- `startup-complete.*` / `shutdown-complete.*`: orquestación de arranque/parada.
	- `rotate-logs.js`: rotación de logs.
- Monitores en `src/monitor/`:
	- `systemMonitor.js`: inventario de interfaces, hostname, CPU/mem, uptime.
	- `fileSystemMonitor.js`: listado y permisos de directorios.

## 3. Temáticas Básicas

- **Funciones comunes y asincronía:**
	- Arrow functions para métodos de clase y callbacks.
	- `async/await` en endpoints y operaciones de cifrado/descifrado.
	- Serialización/parseo robusto (`JSON.parse` con try/catch en P2P).

- **Manejo de errores:**
	- Validaciones previas con `express-validator` y respuesta `400` detallando `errors.array()`.
	- `try/catch` en operaciones críticas (lectura de keystore, descifrado, escritura FS) con respuestas `401`/`400` y logs explicativos.
	- Protección con rate limiting global y CORS restrictivo por patrón.

- **Dependencias principales:**
	- Servidor: `express`, `helmet`, `cors`, `express-rate-limit`, `express-validator`, `multer`.
	- Red P2P: `ws`.
	- Cripto: `crypto` (nativo), `elliptic`, `scrypt-js`, `crypto-js`.
	- Utilidades: `dotenv`, `uuid`, `qrcode`, `node-fetch` (ESM), `axios` en dev.

- **Seguridad y entorno:**
	- Carga temprana de `.env` (`dotenv.config()`), `engineStrict` con `node>=18`.
	- CSP via `helmet` con `default-src 'self'` y `connect-src` acotado; `script-src` incluye `'unsafe-inline'`/`'unsafe-eval'` por compatibilidad del frontend.
	- CORS condicional: permite `localhost` y `app.blockswine.com` según entorno, con `credentials: true`.
	- Límite de `express.json({ limit: "32kb" })`.
	- Persistencia de keystore en `app/uploads/wallet_default.json` y sincronización de wallet global en memoria.

## 4. Ejemplos

- **Endpoint con validación y manejo de keystore** (extracto de `server.js`):

```js
app.post(
	"/wallet/load-global",
	[
		check("encryptedPrivateKey").isString().notEmpty(),
		check("salt").isString().notEmpty(),
		check("iv").isString().notEmpty(),
		check("tag").isString().notEmpty(),
		check("passphrase").isString().notEmpty(),
		check("publicKey").isString().notEmpty(),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		try {
			const privateKeyBuf = await decryptPrivateKeyFromKeystore(keystore, passphrase);
			globalWallet = new Wallet(null, undefined, privateKeyBuf.toString("hex"));
			// ...
			return res.json({ ok: true, publicKey: globalWallet.publicKey });
		} catch (e) {
			return res.status(401).json({ error: "Passphrase incorrecta o wallet corrupta" });
		}
	}
);
```

- **Servidor P2P con arrow functions** (extracto de `app/p2pServer.js`):

```js
class P2PServer {
	constructor(blockchain, transactionsPool) {
		this.blockchain = blockchain;
		this.transactionsPool = transactionsPool;
		this.sockets = [];
		this.peers = [];
	}

	listen = () => {
		const server = new WebSocketServer({ port: P2P_PORT });
		server.on("connection", (socket) => this.connectSocket(socket));
		this.connectToPeers();
	};

	messageHandler = (socket) => {
		socket.on("message", (message) => {
			let data;
			try { data = JSON.parse(message); } catch { return; }
			switch (data.type) { /* ... */ }
		});
	};
}
```

- **Imports ESM y utilidades de entorno** (extracto de `server.js`):

```js
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import path from "path";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### Convenciones a mantener

- Mantener ESM con `type: "module"` y `import`/`export`.
- Usar arrow functions para handlers y métodos de clase.
- Validar entradas con `express-validator` y responder con códigos HTTP apropiados.
- Centralizar seguridad: `helmet` (CSP), `cors` con lista blanca, rate limiting global.
- Formatear JSON con sangría de 2 espacios y logs con prefijos claros.
- Organizar nuevas funcionalidades siguiendo las capas existentes: API (`server.js`), P2P (`app/`), dominio (`src/`), wallet (`wallet/`).

#### Ejemplos adicionales de `src/` y `wallet/`

- **Actualización de UTXO Set** (extracto de `src/blockchain.js`):

```js
updateUTXOSet(block) {
	if (!this.utxoSet) this.utxoSet = [];
	block.data.forEach(transaction => {
		if (transaction.inputs && Array.isArray(transaction.inputs)) {
			transaction.inputs.forEach(input => {
				this.utxoSet = this.utxoSet.filter(
					utxo => !(utxo.txId === input.txId && utxo.outputIndex === input.outputIndex)
				);
			});
		}
	});
	block.data.forEach(transaction => {
		transaction.outputs.forEach((output, idx) => {
			const exists = this.utxoSet.some(
				(u) => u.txId === transaction.id && u.outputIndex === idx
			);
			if (!exists) {
				this.utxoSet.push({ txId: transaction.id, outputIndex: idx, amount: output.amount, address: output.address });
			}
		});
	});
}
```

- **Creación de transacción UTXO** (extracto de `wallet/transactions.js`):

```js
static newTransaction(senderWallet, recipient, amount, balance, utxoSet = []) {
	let total = 0;
	const selectedUtxos = [];
	for (const utxo of utxoSet.filter((u) => u.address === senderWallet.publicKey)) {
		selectedUtxos.push(utxo);
		total += utxo.amount;
		if (total >= amount) break;
	}
	if (total < amount) return null;
	const inputs = selectedUtxos.map((utxo) => ({ txId: utxo.txId, outputIndex: utxo.outputIndex, address: utxo.address, amount: utxo.amount }));
	const outputs = [{ amount, address: recipient }];
	const change = total - amount;
	if (change > 0) outputs.push({ amount: change, address: senderWallet.publicKey });
	const transaction = new Transaction();
	transaction.inputs = inputs;
	transaction.outputs = outputs;
	Transaction.signTransaction(transaction, senderWallet);
	transaction.id = ChainUtil.hash(ChainUtil.hash({ inputs: transaction.inputs, outputs: transaction.outputs }));
	transaction.lote = transaction.id;
	return transaction;
}
```

- **Selección de UTXOs por wallet** (extracto de `wallet/wallet.js`):

```js
coinSelectUTXO(utxoSet, amount) {
	const myUtxos = Array.isArray(utxoSet)
		? utxoSet.filter(u => u.address === this.publicKey && u.amount > 0)
		: [];
	return Wallet.coinSelectUTXO(myUtxos, amount);
}
```

- **Monitor del sistema** (extracto de `src/monitor/systemMonitor.js`):

```js
static getSystemInfo() {
	const nets = os.networkInterfaces();
	const interfaces = [];
	const ips = [];
	// ... recopila hostname, plataforma, memoria, uptime y IPv4 no internas
	return { hostName: os.hostname(), platform: os.platform(), network: { interfaces, ips } };
}
```

- **Gestión de arranque/parada por scripts** (convención operativa):

```sh
# Windows
startup-complete.bat
shutdown-complete.bat

# Linux/macOS
./startup-complete.sh
./shutdown-complete.sh
```

### Convenciones de operación

- Preferir variables de entorno (`.env`) para puertos, peers y URLs.
- Mantener paridad de scripts entre Windows y *nix cuando sea posible.
- Usar monitores para diagnóstico rápido de nodos en red local.
 - En frontend, controlar visibilidad con clases (`.hidden`) en lugar de `style.display` y mantener estilos en hojas CSS.

## Checklist para PRs

- **CSS sin inline:** evitar `style="..."` en HTML; usar clases en `public/styles.css`.
- **Visibilidad:** usar `.hidden` para mostrar/ocultar elementos, no `style.display`.
- **Botones dashboard:** usar `.dashboard-btn` dentro de `.dashboard-card` para tamaño uniforme; tipografía con `clamp(...)`.
- **Imports ESM:** mantener `type: "module"`, `import/export` y utilidades `__filename/__dirname` vía `fileURLToPath`.
- **Seguridad:** respetar `helmet` (CSP), CORS whitelist y rate limiting.
- **Validaciones:** usar `express-validator` en endpoints y `try/catch` con códigos HTTP adecuados.
- **Arquitectura:** colocar nuevas funciones en la capa correcta (API, P2P, dominio `src/`, `wallet/`).



