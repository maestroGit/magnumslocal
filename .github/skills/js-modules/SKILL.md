# Skill: JavaScript Module Architect (ESM) — MagnumLocal

**Estándar para el desarrollo modular, limpio y escalable del sistema blockchain para trazabilidad de vinos.**

---

## 📦 Reglas de Estructura (ES Modules)

- **Responsabilidad única (Single Responsibility):**  
  Cada archivo debe cubrir solo una lógica o entidad. Por ejemplo, `wallet/index.js` gestiona la lógica de wallets, mientras que `src/blockchain.js` solo gestiona la cadena de bloques.

- **Exportación:**  
  Usa `export default` para las entidades centrales (clases, servicios)  
  ```js
  // wallet/index.js
  export default class Wallet { ... }
  ```
  Usa `export const` para helpers/utilidades:
  ```js
  // public/js/fetchData.js
  export const fetchBlocks = async () => { ... };
  ```

- **Importación:**  
  Siempre con rutas relativas explícitas:
  ```js
  import Blockchain from '../../src/blockchain.js';
  import { fetchBlocks } from '../public/js/fetchData.js';
  ```

- **No Global Scope:**  
  Nunca uses variables globales (`window.x = ...`).  
  Toda función debe estar encapsulada en su módulo.

---

## 🛠 Patrones de Diseño

- **Singleton para Servicios:**  
  Si la instancia gestiona estado global (ejemplo: conexión P2P, auth service), expórtala como instancia única.
  ```js
  // app/p2pServer.js
  class P2PServer { ... }
  export default new P2PServer();
  ```

- **Factory Pattern:**  
  Usa funciones fábrica o clases para crear componentes del sistema:
  ```js
  // src/block.js
  export function createBlock({ data, prevHash }) { ... }
  ```

- **Separación de Concerns (SoC):**
  - `app/`: Servidor blockchain, controladores API y P2P.
  - `src/`: Lógica del core blockchain (block, chain, UTXO).
  - `wallet/`: Gestión de wallets, firmas y transacciones.
  - `public/js/`: Lógica frontend y utilidades visuales.
  - `utils/` (opcional en nuevas versiones): utilidades puras.

---

## 🚀 Calidad de Código

- **Async/Await**:  
  Prioriza `async/await` para operaciones asíncronas y legibles:
  ```js
  export async function getBlocks() {
    const res = await fetch('/blocks');
    return await res.json();
  }
  ```

- **Strict Mode:**  
  Todo el código debe funcionar con `"use strict"` (ESM lo activa por defecto).

- **Desestructuración:**  
  Aplica desestructuración en funciones y params:
  ```js
  function renderWallet({ address, balance }) { ... }
  ```

---

## 📁 Ejemplo de Estructura de MagnumLocal

```
magnumsmaster/
├── app/
│   ├── index.js
│   ├── p2pServer.js
│   ├── miner.js
├── src/
│   ├── blockchain.js
│   ├── block.js
│   ├── utxomanager.js
├── wallet/
│   ├── index.js
│   ├── transactions.js
│   ├── transactionsPool.js
├── public/
│   ├── view.html
│   ├── js/
│   │   └── fetchData.js
│   └── styles.css
```

---

## �� Buenas Prácticas para magnumlocal

- Organiza helpers y funciones puras en `public/js/` o bajo `src/utils/` si necesitas lógica común.
- Sigue los patrones descritos para futuras expansiones o cuando refactorices legacy code.
- Consulta e inspírate en la arquitectura de los archivos:  
  - `wallet/index.js` (gestión de claves y firmas)
  - `src/blockchain.js` (main chain)
  - `app/p2pServer.js` (red descentralizada)
  - `public/js/fetchData.js` (fetch y procesos frontend)


