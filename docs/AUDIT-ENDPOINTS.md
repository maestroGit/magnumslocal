# 🔍 AUDITORÍA COMPLETA DE ENDPOINTS EN server.js

**Fecha:** Febrero 9, 2026  
**Objetivo:** Identificar duplicados, endpoints activos y oportunidades de modularización

---

## 📊 Estado Actual de Endpoints

### ✅ FASE 1 (AUTH) - COMPLETADA

| Endpoint | Línea | Estado | Nota |
|----------|-------|--------|------|
| GET /auth/google | 78 | ❌ Comentado | ✓ Migrado a authRoutes.js |
| GET /auth/google/callback | 82 | ❌ Comentado | ✓ Migrado a authRoutes.js |
| GET /auth/user | 89 | ❌ Comentado | ✓ Migrado a authRoutes.js |

---

### 🔴 ACTIVOS EN SERVER.JS (Sin migrar)

#### Estáticos (Frontend)
| Endpoint | Línea | Estado | Router | Acción |
|----------|-------|--------|--------|--------|
| GET /view | 748 | ✅ Activo | - | OK (archivo estático) |
| GET / | 753 | ✅ Activo | - | OK (archivo estático) |

#### UTXO & Balance
| Endpoint | Línea | Estado | Router | Acción |
|----------|-------|--------|--------|--------|
| GET /utxo-balance/global | 764 | ✅ Activo | utxoRoutes.js | ⚠️ Verificar duplicado |
| GET /balance | 1221 | ✅ Activo | walletRoutes.js | ⚠️ Verificar duplicado |
| POST /address-balance | 1235 | ✅ Activo | walletRoutes.js | ⚠️ Verificar duplicado |

#### Transacciones
| Endpoint | Línea | Estado | Router | Acción |
|----------|-------|--------|--------|--------|
| GET /transactionsPool | 810 | ✅ Activo | - | 📋 PENDIENTE FASE 3 |
| POST /transaction | 822 | ✅ Activo | - | 📋 PENDIENTE FASE 3 |

#### Minería
| Endpoint | Línea | Estado | Router | Acción |
|----------|-------|--------|--------|--------|
| POST /mine | 1296 | ✅ Activo | - | 📋 PENDIENTE FASE 2 |
| POST /mine-transactions | 1422 | ✅ Activo | - | 📋 PENDIENTE FASE 2 |

#### QR & Trazabilidad
| Endpoint | Línea | Estado | Router | Acción |
|----------|-------|--------|--------|--------|
| POST /qr | 1491 | ✅ Activo | - | 📋 PENDIENTE FASE 4 |
| POST /qr-with-proof | 1559 | ✅ Activo | - | 📋 PENDIENTE FASE 4 |
| POST /verify-qr-proof | 1817 | ✅ Activo | - | 📋 PENDIENTE FASE 4 |

#### Lotes
| Endpoint | Línea | Estado | Router | Acción |
|----------|-------|--------|--------|--------|
| POST /lotes | 1707 | ✅ Activo | loteRoutes.js | ⚠️ Verificar duplicado |
| GET /lotes/:loteId | 2053 | ✅ Activo | - | 📋 Verificar si en loteRoutes |

#### Utilidad
| Endpoint | Línea | Estado | Router | Acción |
|----------|-------|--------|--------|--------|
| GET /directory-contents | 2037 | ✅ Activo | - | 📋 PENDIENTE FASE 6 |
| GET /propietario/:ownerPublicKey | 2076 | ✅ Activo | - | 📋 Verificar si necesario |

---

## ⚠️ DUPLICADOS ENCONTRADOS

### 1. **GET /system-info** - DUPLICADO (pero comentado)
```
Línea 785:  ❌ Comentado en /* ... */
Línea 1485: ❌ Comentado en /* ... */
```
**Estado:** ✅ Ya filtrado, ambos comentados

### 2. **GET /systemInfo** - ADICIONAL NO DOCUMENTADO
```
Línea 793: ❌ Comentado en /* ... */
```
**Estado:** ✅ Comentado (no es grave)

---

## 🔍 VERIFICACIONES NECESARIAS

### A. Endpoints que podrían estar duplicados entre router y server.js

#### ✓ Revisar utxoRoutes.js
```bash
grep -n "GET /utxo-balance" app/routes/utxoRoutes.js
# Línea 764 en server.js podría duplicar una ruta existente
```

#### ✓ Revisar walletRoutes.js
```bash
grep -n "GET /balance\|POST /address-balance" app/routes/walletRoutes.js
# Líneas 1221, 1235 en server.js podrían duplicar rutas existentes
```

#### ✓ Revisar loteRoutes.js
```bash
grep -n "POST /lotes\|GET /lotes" app/routes/loteRoutes.js
# Línea 1707 en server.js podría duplicar una ruta
# Línea 2053 podría no estar en loteRoutes
```

### B. Endpoints que deberían estar en routers pero aún en server.js

**PENDIENTE MIGRACIÓN:**
- ✅ POST /mine → miningRoutes.js (FASE 2)
- ✅ POST /mine-transactions → miningRoutes.js (FASE 2)
- ✅ GET /transactionsPool → transactionRoutes.js (FASE 3)
- ✅ POST /transaction → transactionRoutes.js (FASE 3)
- ✅ POST /qr → qrRoutes.js (FASE 4)
- ✅ POST /qr-with-proof → qrRoutes.js (FASE 4)
- ✅ POST /verify-qr-proof → qrRoutes.js (FASE 4)
- ✅ GET /directory-contents → devRoutes.js (FASE 6)

---

## 📈 RESUMEN ACTUAL

| Categoría | Cantidad | Estado |
|-----------|----------|--------|
| Endpoints totales | 23 | - |
| Migrados (FASE 1) | 3 | ✅ Comentados |
| Activos directos | 14 | ⚠️ Requieren revisión |
| Estáticos (frontend) | 2 | ✅ OK |
| Pendientes migración | 8 | 📋 FASES 2-6 |
| Comentados/Duplicados | 4+ | ✅ Limpios |

---

## 🎯 Próximos Pasos (Prioridad)

### URGENTE (Validar):
1. [ ] ¿GET /utxo-balance/global está en utxoRoutes.js?
2. [ ] ¿GET /balance está en walletRoutes.js?
3. [ ] ¿POST /address-balance está en walletRoutes.js?
4. [ ] ¿POST /lotes está en loteRoutes.js?
5. [ ] ¿GET /lotes/:loteId está registrada?

### LUEGO (Completar Roadmap):
- Línea 1296-1421: POST /mine + POST /mine-transactions → FASE 2
- Línea 810-1213: GET /transactionsPool + POST /transaction → FASE 3
- Línea 1491-2036: POST /qr + POST /qr-with-proof + POST /verify-qr-proof → FASE 4
- Línea 2037: GET /directory-contents → FASE 6
- Comentarios obsoletos: Limpiar

---

**Generado:** 2026-02-09  
**Versión:** Auditoría Pre-FASE 2
