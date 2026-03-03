# Matriz de Endpoints Testeados

**Proyecto:** magnumslocal  
**Última actualización:** 02/03/2026  
**Objetivo:** Fuente única para estado de pruebas por endpoint (DO + Users)

---

## Convención de estados

- `✅ Pass`: caso probado y validado
- `⚠️ Parcial`: probado parcialmente (faltan escenarios)
- `❌ Fail`: probado y fallando
- `⏳ Pendiente`: aún no ejecutado

---

## Matriz — Denominaciones de Origen

| Endpoint | Método | Casos cubiertos | Estado | Última ejecución | Evidencia/Notas | Owner |
|---|---|---|---|---|---|---|
| `/denominaciones` | GET | listado básico, paginación, filtros | ⚠️ Parcial | 2026-02-12 | Ver scripts de prueba DO | Backend |
| `/denominaciones/:id` | GET | detalle + includes | ⚠️ Parcial | 2026-02-12 | Validar 404 explícito en smoke | Backend |
| `/denominaciones` | POST | creación válida, nombre duplicado | ⚠️ Parcial | 2026-02-12 | Completar validación de campos inválidos | Backend |
| `/denominaciones/:id` | PUT | actualización parcial | ⏳ Pendiente | - | Falta prueba automatizada | Backend |
| `/denominaciones/:id` | DELETE | borrado exitoso/404 | ⏳ Pendiente | - | Falta smoke test | Backend |
| `/denominaciones/:id/variedades` | POST | vínculo DO-variedad | ⏳ Pendiente | - | Probar duplicado (409) | Backend |
| `/denominaciones/:id/tipos` | POST | vínculo DO-tipo | ⏳ Pendiente | - | Probar duplicado (409) | Backend |
| `/denominaciones/:id/bodegas` | POST | vínculo DO-bodega | ⏳ Pendiente | - | Probar FK inválida | Backend |

---

## Matriz — Usuarios

| Endpoint | Método | Casos cubiertos | Estado | Última ejecución | Evidencia/Notas | Owner |
|---|---|---|---|---|---|---|
| `/users` | POST | creación válida | ✅ Pass | 2026-02-10 | Registrado en changelog v1.1.0 | Backend |
| `/users` | GET | listado + paginación + filtros básicos | ✅ Pass | 2026-02-10 | Registrado en changelog v1.1.0 | Backend |
| `/users/stats` | GET | agregación por rol/KYC | ✅ Pass | 2026-02-10 | Fix import sequelize aplicado | Backend |
| `/users/:id` | GET | lectura por id | ⚠️ Parcial | 2026-02-10 | `includeWallets` dependía de restart | Backend |
| `/users/:id` | PUT | update de campos permitidos | ⏳ Pendiente | - | Falta caso de campos protegidos | Backend |
| `/users/:id` | DELETE | soft/hard delete | ⏳ Pendiente | - | Falta validación de cascada wallets | Backend |
| `/users/:id/wallets` | POST | vincular wallet | ⏳ Pendiente | - | Falta prueba de address duplicado | Backend |
| `/users/:id/wallets` | GET | listar wallets de usuario | ⏳ Pendiente | - | Falta smoke test | Backend |
| `/users/:id/kyc` | PUT | transición de estado KYC | ⏳ Pendiente | - | Definir estados canónicos primero | Backend |

---

## Criterio de “endpoint cubierto”

Un endpoint pasa a `✅ Pass` solo si tiene, como mínimo:
1. Caso exitoso (`2xx`)
2. Caso de validación (`400` o `422`)
3. Caso de no encontrado o conflicto (`404`/`409`, según aplique)
4. Evidencia registrada (script, comando o test automático)

---

## Próximas acciones sugeridas

1. Convertir pendientes a pruebas automatizadas (`Jest + Supertest`).
2. Añadir columna de enlace a archivo de test (`test/api/...`).
3. Ejecutar esta matriz en cada release candidate y actualizar fecha/estado.
