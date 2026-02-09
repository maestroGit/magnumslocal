# FASE 3: Transaction Routes - Cambios Manuales Requeridos

## Estado Actual
✅ Creado: app/controllers/transactionController.js
✅ Creado: app/routes/transactionRoutes.js
⚠️ Pendiente: Modificar server.js (cambios manuales necesarios)

## Cambios Requeridos en server.js

### 1. Añadir import de transactionRoutes (línea ~777)

**Ubicación:** Después de `import miningRoutes from './app/routes/miningRoutes.js';`

```javascript
// ✅ Mining routes - MIGRADO FASE 2 (POST /mine, POST /mine-transactions)
import miningRoutes from './app/routes/miningRoutes.js';

// ✅ Transaction routes - MIGRADO FASE 3 (POST /transaction, GET /transactionsPool)
import transactionRoutes from './app/routes/transactionRoutes.js';

import utxoRoutes from './app/routes/utxoRoutes.js';
```

### 2. Exponer serverKeystore globalmente (línea ~303)

**Ubicación:** Después de `let serverKeystore = null;`

```javascript
// Variable global para almacenar el keystore del servidor
let serverKeystore = null;
global.serverKeystore = serverKeystore; // Exponer para transactionController
```

### 3. Actualizar serverKeystore cuando se carga (línea ~307)

**Ubicación:** Dentro del bloque `if (fs.existsSync(walletPathInit))`

```javascript
serverKeystore = keystore; // Guardar referencia global al keystore
global.serverKeystore = serverKeystore; // Actualizar referencia global
```

### 4. Exponer decryptPrivateKeyFromKeystore globalmente (línea ~546)

**Ubicación:** Después del cierre de la función `decryptPrivateKeyFromKeystore`

```javascript
  }
};

// Exponer función globalmente para transactionController
global.decryptPrivateKeyFromKeystore = decryptPrivateKeyFromKeystore;

// --- FUNCIÓN DE CARGA DE WALLET CON PASSPHRASE ---
```

### 5. Registrar transactionRoutes (línea ~831)

**Ubicación:** Después de `app.use('/', blockchainRoutes);`

```javascript
// ✅ Blockchain routes - MIGRADO
app.use('/', blockchainRoutes);
// ✅ Transaction routes - MIGRADO FASE 3
app.use('/', transactionRoutes);
```

### 6. ELIMINAR código legacy (líneas ~838-1244)

**IMPORTANTE:** Eliminar completamente estos dos bloques:

#### A. GET /transactionsPool (eliminar ~10 líneas)
```javascript
// Eliminar desde:
app.get("/transactionsPool", (req, res) => {
  try {
    res.json(tp.transactions);
  } catch (error) {
    console.error("Error fetching transactions pool:", error);
    res
      .status(500)
      .json({ success: false, error: "Error fetching transactions pool" });
  }
});
```

#### B. POST /transaction (eliminar ~406 líneas)
```javascript
// Eliminar desde:
app.post("/transaction", async (req, res) => {
  // ... TODO EL CONTENIDO ...
});
```

**Reemplazar con comentarios:**
```javascript
// GET /transactionsPool - Obtener mempool
// ✅ MIGRADO A: app/routes/transactionRoutes.js
// Se registra con app.use('/', transactionRoutes) línea ~831
// Controlador: app/controllers/transactionController.js::getTransactionsPool

// POST /transaction - Crear transacciones (usuario o bodega)
// ✅ MIGRADO A: app/routes/transactionRoutes.js
// Se registra con app.use('/', transactionRoutes) línea ~831
// Controlador: app/controllers/transactionController.js::createTransaction
```

## Resumen de Impacto

- **Líneas añadidas:** ~20 líneas (imports, globals, registros)
- **Líneas eliminadas:** ~416 líneas (endpoints legacy)
- **Reducción neta:** ~396 líneas
- **Nuevo total estimado:** 1,077 líneas (desde 1,473)
- **Reducción total acumulada:** 53.4% (desde 2,309 iniciales)

## Validación Post-Cambios

Después de hacer los cambios, ejecutar:

```bash
# Validar sintaxis
node -c server.js

# Validar que no haya errores de imports
node --check server.js

# Ejecutar servidor (modo desarrollo)
npm run dev
```

## Testing

Usar los tests existentes o crear nuevos:
```bash
# Test de endpoints de transacciones
curl -X GET http://localhost:6001/transactionsPool
curl -X POST http://localhost:6001/transaction -H "Content-Type: application/json" -d '{"mode":"bodega","recipient":"...","amount":10,"passphrase":"..."}'
```

## Archivos Afectados
- ✅ app/controllers/transactionController.js (NUEVO)
- ✅ app/routes/transactionRoutes.js (NUEVO)
- ⚠️ server.js (MODIFICAR MANUALMENTE)

## Próximos Pasos
Una vez completados estos cambios:
1. ✅ Validar sintaxis con `node -c server.js`
2. ✅ Iniciar servidor con `npm run dev`
3. ✅ Probar ambos flujos (usuario y bodega)
4. ✅ Commit cambios con mensaje descriptivo
5. 📋 Actualizar REFACTOR-ROADMAP.md
