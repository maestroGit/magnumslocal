# Mining Endpoints - Test Suite

Tests completos para los endpoints de minado (FASE 2 - Refactorización).

## 📁 Archivos de Test

### 1. `miningEndpoints.test.js` (Node.js)
Test automatizado usando Node.js con fetch.

**Características:**
- ✅ Tests asíncronos con async/await
- ✅ Assertions claras y descriptivas
- ✅ Colores en consola para mejor legibilidad
- ✅ Contador de tests passed/failed
- ✅ Exit code 1 si hay fallos

**Ejecutar:**
```bash
# Asegúrate de que el servidor esté corriendo en puerto 6001
npm run dev

# En otra terminal:
node testing/miningEndpoints.test.js
```

### 2. `test-mining-endpoints.sh` (Bash/curl)
Script bash completo con curl para testing manual e integración.

**Características:**
- ✅ Usa curl (sin dependencias Node.js)
- ✅ Colores y formato visual mejorado
- ✅ Tests secuenciales con preparación de datos
- ✅ Validación de estructura de respuestas JSON
- ✅ Resumen detallado al final

**Ejecutar:**
```bash
# Asegúrate de que el servidor esté corriendo
npm run dev

# En otra terminal:
chmod +x testing/test-mining-endpoints.sh
./testing/test-mining-endpoints.sh

# O usando bash directamente:
bash testing/test-mining-endpoints.sh
```

---

## 🧪 Tests Incluidos

### Test 1: Guard - Mempool vacía
- **Endpoint:** POST `/mine`
- **Espera:** 409 Conflict
- **Valida:** No permite minar cuando no hay transacciones pendientes

### Test 2: Obtener wallet global
- **Endpoint:** GET `/wallet/global`
- **Espera:** 200 OK con publicKey
- **Valida:** Sistema tiene wallet global configurada

### Test 3: Crear transacción
- **Endpoint:** POST `/transact`
- **Espera:** 200/201 OK
- **Valida:** Se puede crear transacción para poblar mempool

### Test 4: Minado exitoso
- **Endpoint:** POST `/mine`
- **Espera:** 200 OK
- **Valida:** 
  - ✓ success: true
  - ✓ message presente
  - ✓ block.hash presente
  - ✓ block.timestamp presente
  - ✓ block.transactionsCount > 0
  - ✓ block.difficulty presente

### Test 5: Mempool vacía post-minado
- **Endpoint:** POST `/mine`
- **Espera:** 409 Conflict
- **Valida:** Mempool se vació después de minar

### Test 6: Endpoint legacy
- **Endpoint:** POST `/mine-transactions`
- **Espera:** 409/302/301/200
- **Valida:** Endpoint legacy funciona correctamente

### Test 7: Validación de estructura completa
- **Endpoint:** POST `/mine`
- **Espera:** Todos los campos requeridos presentes
- **Valida:** Respuesta JSON tiene estructura correcta

---

## 📊 Ejemplo de Salida

```
🧪 ========================================
   Mining Endpoints - Test Suite (FASE 2)
========================================

═══════════════════════════════════════
 Test 1: Guard - Mempool vacía
═══════════════════════════════════════
   Endpoint: POST /mine
   Expected: 409 | Got: 409
✅ POST /mine rechaza cuando mempool vacía
   Response: {"success":false,"error":"No hay transacciones...

═══════════════════════════════════════
 Test 2: Preparación - Obtener wallet
═══════════════════════════════════════
✅ Wallet global obtenida
   Public Key: 04a1b2c3d4e5f6...

...

========================================
   Resumen de Tests
========================================

✅ Tests exitosos: 7
   Tests fallidos: 0

📊 Total tests: 7
========================================

🎉 Todos los tests pasaron exitosamente
```

---

## 🔧 Troubleshooting

### Error: "ECONNREFUSED"
- **Causa:** El servidor no está corriendo
- **Solución:** `npm run dev` en una terminal separada

### Error: "Cannot find module 'node-fetch'"
- **Causa:** Dependencia no instalada
- **Solución:** `npm install node-fetch`

### Error: "Permission denied" (bash)
- **Causa:** Script no tiene permisos de ejecución
- **Solución:** `chmod +x testing/test-mining-endpoints.sh`

### Tests fallan con "No se pudo crear transacción"
- **Causa:** Wallet global no está inicializada o sin fondos
- **Solución:** 
  1. Asegúrate de que `init-db.js` corrió correctamente
  2. Verifica que `GET /wallet/global` retorne una wallet válida

---

## 🎯 Coverage

**Endpoints cubiertos:**
- ✅ POST `/mine` (2 escenarios)
- ✅ POST `/mine-transactions` (legacy)

**Controladores cubiertos:**
- ✅ `miningController.js::mineBlock`
- ✅ `miningController.js::mineTransactionsLegacy`

**Escenarios probados:**
- ✅ Validación de mempool vacía (guard)
- ✅ Minado exitoso con transacciones
- ✅ Estructura de respuesta JSON
- ✅ Actualización de mempool post-minado
- ✅ Compatibilidad con endpoint legacy
- ✅ Integración con sistema de wallets
- ✅ Integración con sistema de transacciones

---

## 📝 Notas

- Los tests son **idempotentes**: pueden ejecutarse múltiples veces
- Los tests **no interfieren** con la blockchain de desarrollo (usan datos de prueba)
- Se recomienda ejecutar en un **ambiente de test** separado
- Para CI/CD, usar `miningEndpoints.test.js` (retorna exit codes)

---

## 🚀 Next Steps

Después de validar estos tests:
1. Continuar con **FASE 3: Transaction Routes**
2. Crear tests similares para endpoints de transacciones
3. Integrar tests en pipeline de CI/CD
4. Agregar tests de performance/carga para minado

---

**Creado:** Febrero 9, 2026  
**Fase:** FASE 2 - Mining Routes  
**Status:** ✅ Completo y funcional
