# 🛣️ Plan de Refactorización de server.js - Roadmap de Testeo

**Versión:** 2.0  
**Fecha:** Febrero 9, 2026  
**Objetivo:** Completar la modularización de server.js de 2,309 lineas a ~500 líneas

---

## 📊 Fases de Trabajo

### **FASE 1: Extracción de Auth Routes** ⛔→🟢
**Complejidad:** Baja | **Tiempo:** 30 min | **Riesgo:** Bajo

#### 1.1 - Crear `authRoutes.js`
- [ ] Extraer `/auth/google` → GET
- [ ] Extraer `/auth/google/callback` → GET  
- [ ] Extraer `/auth/user` → GET
- [ ] Extraer configuración de Passport

**Líneas en server.js afectadas:** 57-95 (~38 líneas)

#### 1.2 - Testeo FASE 1
```bash
# Test 1: Verificar que OAuth redirect funciona
curl -s http://localhost:6001/auth/google | grep -i "google" && echo "✅ Auth redirect OK"

# Test 2: Verificar /auth/user sin login (debe devolver 401)
curl -s -w "\n%{http_code}" http://localhost:6001/auth/user | tail -1 && echo "✅ Auth check OK"

# Test 3: Verificar que no hay errores en logs
npm run dev 2>&1 | grep -i "error" | head -5
```

**Criterio de éxito:** 
- ✅ Server inicia sin errores
- ✅ GET /auth/google devuelve redirect
- ✅ GET /auth/user devuelve 401 sin usuario

---

### **FASE 2: Extracción de Mining Routes** 🟡→🟢
**Complejidad:** Media | **Tiempo:** 45 min | **Riesgo:** Medio

#### 2.1 - Crear `miningRoutes.js` y `miningController.js`
- [ ] Extraer `POST /mine` (actualmente líneas ~1289)
- [ ] Extraer `POST /mine-transactions` (líneas ~1415)
- [ ] Crear controlador con lógica de minería
- [ ] Validar acceso a `global.bc`, `global.tp`, `global.miner`, `global.utxoManager`

**Líneas en server.js afectadas:** ~200 líneas (1289-1415 + lógica asociada)

#### 2.2 - Testeo FASE 2
```bash
# Test 1: Verificar POST /mine funciona
curl -X POST http://localhost:6001/mine \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.success' && echo "✅ Mine endpoint OK"

# Test 2: Verificar que mempool vaciada después de minar
curl http://localhost:6001/transactionsPool | jq '.length' && echo "✅ Mempool check OK"

# Test 3: Verificar blocks en blockchain
curl http://localhost:6001/blocks | jq '.chain | length' && echo "✅ Blocks check OK"

# Test 4: Revisar logs de minería
npm run dev 2>&1 | grep -i "mined\|block" | head -3
```

**Criterio de éxito:**
- ✅ POST /mine devuelve JSON con success
- ✅ Bloque se agrega a blockchain
- ✅ UTXO Manager se actualiza
- ✅ Mempool se vacía

---

### **FASE 3: Extracción de Transaction Routes** 🟡→🟢
**Complejidad:** Alta | **Tiempo:** 1 hora | **Riesgo:** Alto (lógica critica)

#### 3.1 - Crear `transactionRoutes.js` y `transactionController.js`
- [ ] Extraer `POST /transaction` (líneas ~815-1213)
- [ ] Extraer `GET /transactionsPool` (líneas ~803-811)
- [ ] Separar flujo BODEGA vs USUARIO
- [ ] Validaciones de UTXO
- [ ] Prevención de doble gasto

**Observación:** Verificar que NO haya duplicación en `createTransaction()`

**Líneas en server.js afectadas:** ~400 líneas

#### 3.2 - Testeo FASE 3
```bash
# Test 1: Verificar GET /transactionsPool (debe estar vacío al inicio)
curl http://localhost:6001/transactionsPool | jq '.' && echo "✅ TransactionsPool GET OK"

# Test 2: Crear transacción válida (necesita wallet con UTXOs)
# (Requiere primero minar bloques en FASE 2)
curl -X POST http://localhost:6001/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "bodega",
    "recipient": "04...",
    "amount": 10
  }' | jq '.success' && echo "✅ Transaction POST OK"

# Test 3: Verificar que la transacción está en mempool
curl http://localhost:6001/transactionsPool | jq '.length'

# Test 4: Verificar prevención de doble gasto (enviar TX igual 2x rápido)
# Debe fallar la segunda
for i in {1..2}; do
  curl -X POST http://localhost:6001/transaction ... & 
done
wait
echo "✅ Double-spend prevention OK"
```

**Criterio de éxito:**
- ✅ GET /transactionsPool devuelve array
- ✅ POST /transaction acepta y propaga
- ✅ No hay duplicación en mempool
- ✅ Doble gasto es rechazado

---

### **FASE 4: Extracción de QR Routes** 🟡→🟢
**Complejidad:** Media | **Tiempo:** 40 min | **Riesgo:** Bajo

#### 4.1 - Crear `qrRoutes.js` y `qrController.js`
- [ ] Extraer `POST /qr` (líneas ~1575-1642)
- [ ] Extraer `POST /qr-with-proof` (líneas ~1643-1790)
- [ ] Extraer `POST /verify-qr-proof` (líneas ~1901-2120)
- [ ] Mantener deps: `loteRoutes`, multer, fs

**Líneas en server.js afectadas:** ~250 líneas

#### 4.2 - Testeo FASE 4
```bash
# Test 1: Verificar POST /qr genera código
curl -X POST http://localhost:6001/qr \
  -H "Content-Type: application/json" \
  -d '{
    "loteId": "test-lote-001",
    "nombreProducto": "Rioja 2020",
    "bodega": "Casa Beronia"
  }' | jq '.qrBase64 | length' && echo "✅ QR generation OK"

# Test 2: Verificar que qrBase64 es válido
curl ... | jq '.qrBase64' | grep "data:image" && echo "✅ QR format OK"

# Test 3: Verificar POST /qr-with-proof con archivo
curl -X POST http://localhost:6001/qr-with-proof \
  -F "file=@path/to/file.pdf" \
  -F "loteId=test" | jq '.success' && echo "✅ QR with proof OK"
```

**Criterio de éxito:**
- ✅ POST /qr devuelve base64 válido
- ✅ POST /qr-with-proof soporta file upload
- ✅ POST /verify-qr-proof valida pruebas

---

### **FASE 5: Extracción de UTXO & Balance Routes** 🟢 (parcial)
**Complejidad:** Media | **Tiempo:** 45 min | **Riesgo:** Bajo

#### 5.1 - Extracción de endpoints en server.js
- [x] GET `/utxo-balance/global` (ya en utxoRoutes?)
- [x] GET `/balance` (ya en walletRoutes?)
- [x] POST `/address-balance` (ya modularizado?)

**Verificar:** Qué está en `utxoRoutes.js` vs `walletRoutes.js`

**Líneas en server.js afectadas:** ~50 líneas

#### 5.2 - Testeo FASE 5
```bash
# Test 1: GET /utxo-balance/global
curl http://localhost:6001/utxo-balance/global | jq '.balance' && echo "✅ Global balance OK"

# Test 2: GET /balance (wallet global)
curl http://localhost:6001/balance | jq '.balance' && echo "✅ Wallet balance OK"

# Test 3: POST /address-balance
curl -X POST http://localhost:6001/address-balance \
  -H "Content-Type: application/json" \
  -d '{"address": "04..."}' | jq '.balance' && echo "✅ Address balance OK"
```

**Criterio de éxito:**
- ✅ Todos los endpoints devuelven balance numérico
- ✅ Valores son consistentes entre endpoints

---

### **FASE 6: Extracción de Logs & Dev Routes** 🟢 (baja prioridad)
**Complejidad:** Baja | **Tiempo:** 20 min | **Riesgo:** Muy Bajo

#### 6.1 - Crear `logsRoutes.js`
- [ ] Extraer `GET /logs` (líneas ~116-120)

#### 6.2 - Crear `devRoutes.js`
- [ ] Extraer `GET /directory-contents` (líneas ~2121)
- [ ] Solo habilitar en desarrollo (NODE_ENV !== 'production')

**Líneas en server.js afectadas:** ~20 líneas

#### 6.3 - Testeo FASE 6
```bash
# Test 1: GET /logs debe devolver historial
curl http://localhost:6001/logs | jq 'length' && echo "✅ Logs OK"

# Test 2: GET /directory-contents solo en DEV
curl http://localhost:6001/directory-contents && echo "✅ Dev routes OK (DEV mode)"
# En PROD debe dar 404
```

---

### **FASE 7: Cleanup & Consolidation** 🧹
**Complejidad:** Baja | **Tiempo:** 30 min | **Riesgo:** Muy Bajo

#### 7.1 - Eliminar código duplicado
- [ ] Revisar rutas duplicadas
- [ ] Eliminar middleware middleware-js innecesarios
- [ ] Consolidar inicializaciones

#### 7.2 - Testeo FASE 7
```bash
# Test 1: Server inicia sin warnings
npm run dev 2>&1 | grep -i "warning" && echo "⚠️ Warnings found"

# Test 2: Revisar server.js final
wc -l server.js && echo "Should be ~500-600 lines target"

# Test 3: Contar endpoints en server.js
grep -E "^app\.(get|post|put|delete)" server.js | wc -l && echo "Should be ~3-5 remaining"
```

---

## 🔄 Flujo de Testeo Integrado

### Full System Test (después de CADA fase)

```bash
#!/bin/bash
# test-integration.sh

echo "=== FULL INTEGRATION TEST ==="

# 1. Server startup
npm run dev &
SERVER_PID=$!
sleep 3

# 2. Health check
curl -s http://localhost:6001/ > /dev/null && echo "✅ Server responsive" || { echo "❌ Server not responding"; exit 1; }

# 3. Auth endpoints
curl -s http://localhost:6001/auth/user | jq '.user' && echo "✅ Auth endpoints OK"

# 4. Blockchain endpoints
curl -s http://localhost:6001/blocks | jq '.chain | length' && echo "✅ Blockchain OK"

# 5. Transaction endpoints
curl -s http://localhost:6001/transactionsPool | jq '.' && echo "✅ Transactions OK"

# 6. Wallet endpoints
curl -s http://localhost:6001/wallet/global | jq '.publicKey' && echo "✅ Wallet OK"

# 7. Mining (bonus)
curl -X POST -s http://localhost:6001/mine | jq '.success' && echo "✅ Mining OK"

# Kill server
kill $SERVER_PID

echo "=== ALL TESTS PASSED ✅ ==="
```

---

## 📅 Timeline Recomendado

| Fase | Estimado | Acumulado |
|------|----------|-----------|
| FASE 1 (Auth) | 30 min | 30 min |
| **TEST** | 10 min | 40 min |
| FASE 2 (Mining) | 45 min | 1h 25m |
| **TEST** | 15 min | 1h 40m |
| FASE 3 (Transactions) | 1h | 2h 40m |
| **TEST** | 20 min | 3h |
| FASE 4 (QR) | 40 min | 3h 40m |
| **TEST** | 15 min | 3h 55m |
| FASE 5 (UTXO/Balance) | 45 min | 4h 40m |
| **TEST** | 15 min | 4h 55m |
| FASE 6 (Logs/Dev) | 20 min | 5h 15m |
| **TEST** | 10 min | 5h 25m |
| FASE 7 (Cleanup) | 30 min | 5h 55m |
| **FULL TEST** | 20 min | 6h 15m |

**Total estimado:** ~6-7 horas (en secciones de 1-2 horas)

---

## ✅ Checklist de Aceptación Global

Al final del refactor, verificar:

- [ ] `server.js` tiene <600 líneas (target: ~500)
- [ ] Máximo 5 endpoints directo en server.js (auth + estáticos)
- [ ] 15+ archivos de rutas modularizadas
- [ ] Todos los tests pasan
- [ ] No hay código duplicado
- [ ] No hay imports innecesarios
- [ ] CORS, helmet, rate-limit aún funcionan
- [ ] Multer/uploads funciona
- [ ] OAuth Google funciona
- [ ] P2P network funciona
- [ ] UTXO Manager sincronizado
- [ ] Prevención doble gasto funciona
- [ ] Zero warnings en logs

---

## 🚨 Puntos Críticos a Verificar

1. **Orden de middlewares:**
   - `dotenv` → `helmet` → `cors` → `express.json()` → `passport` → rate-limit → `routers`

2. **Estado global accesible:**
   - `global.bc`, `global.tp`, `global.miner`, `global.p2pServer`, `global.utxoManager`

3. **Multer debe funcionar:**
   - QR routes necesita file uploads

4. **OAuth no debe romperse:**
   - Passport session + Google strategy

5. **P2P debe continuar:**
   - Mining necesita `p2pServer.broadcastTransaction()`

---

## 📝 Notas de Implementación

### Para cada fase:
1. **Crear archivos nuevos** en `/app/routes/` y `/app/controllers/`
2. **Copiar código** de server.js a los nuevos archivos
3. **Importar rutas** en server.js con `import RouterName from './app/routes/...'`
4. **Registrar con app.use()** en server.js
5. **COMENTAR (no eliminar)** el código antiguo en server.js primero
6. **Testear** paso a paso
7. **Eliminar** código solo después de confirmar que funciona

### Revert rápido:
Si algo se rompe:
```bash
git checkout -- server.js  # Revertir cambios en server.js
```

---

**Próximo paso:** ¿Comenzamos por FASE 1 (Auth)?

