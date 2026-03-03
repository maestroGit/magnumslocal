# Estándares de Documentación Canónica

**Proyecto:** magnumslocal  
**Última actualización:** 02/03/2026  
**Objetivo:** Normalizar KYC statuses, ejemplos API y consistencia entre documentos.

---

## 1) Fuente de verdad por tema

- **Modelo de datos / relaciones:** `ModeloDatos-ampliado.md`
- **Contrato de API DO:** `API-REFERENCE-DO.md`
- **Contrato de API Users:** `USER-MANAGEMENT-API.md`
- **Estado real de pruebas:** `ENDPOINTS-TEST-MATRIX.md`
- **Cambios históricos:** `CHANGELOG-USER-API.md`

Si hay conflicto, prevalece el orden anterior.

---

## 2) Estados KYC canónicos

Para evitar divergencias entre documentos, usar solo este conjunto:

- `none` → sin proceso KYC iniciado
- `pending` → en proceso/revisión
- `approved` → validado
- `rejected` → rechazado

### Regla
- No usar sinónimos en docs (`verified`, `review`, etc.) salvo mapeo explícito.
- Si el código aún usa otro valor, documentar transición en changelog y plan de migración.

---

## 3) Estructura canónica de ejemplos API

Cada endpoint documentado debe incluir siempre:

1. **Request mínimo válido**
2. **Response de éxito**
3. **Response de error esperable** (al menos uno)
4. **Notas de validación** (campos requeridos, constraints)

### Formato recomendado
- JSON compacto y realista
- Campos realmente soportados por el endpoint
- Evitar placeholders ambiguos

---

## 4) Reglas de consistencia terminológica

- Usar nombres de campo exactos del modelo (`usuario_id`, `kyc_status`, `subscription_status`).
- Mantener singular/plural consistente entre tabla, modelo y endpoint.
- Evitar mezclar idiomas dentro del mismo bloque técnico.

---

## 5) Flujo de actualización documental (obligatorio)

Cuando cambie un endpoint o modelo:

1. Actualizar el documento de contrato correspondiente.
2. Actualizar la matriz de tests (`ENDPOINTS-TEST-MATRIX.md`).
3. Registrar cambio en changelog si impacta comportamiento.
4. Revisar ejemplos canónicos para evitar drift.

---

## 6) Checklist de normalización rápida

- [ ] KYC statuses unificados en todos los `.md`
- [ ] Endpoints con ejemplos de éxito + error
- [ ] Matriz de tests actualizada con fecha y estado
- [ ] Inconsistencias corregidas entre docs de DO y Users
- [ ] Changelog alineado con el estado actual de API
