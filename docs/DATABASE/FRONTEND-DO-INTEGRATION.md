# Integración DO en Frontend - Resumen de Cambios

**Fecha:** 12 de febrero de 2026  
**Objetivo:** Mostrar Denominaciones de Origen, Variedades y Tipos de vino en las tarjetas de bodegas

---

## 📋 Cambios Realizados

### 1. Backend (API)

#### Modificado: `app/controllers/userController.js`

**Cambio:** Incluir relaciones de Denominaciones de Origen cuando se listan bodegas

```javascript
// Líneas 163-194
if (role === 'winery') {
  const { DenominacionOrigen, Variedad, TipoVino } = await import('../models/index.js');
  
  includes.push({
    model: DenominacionOrigen,
    as: 'denominaciones',
    through: { attributes: [] },
    include: [
      {
        model: Variedad,
        as: 'variedades',
        through: { attributes: [] }
      },
      {
        model: TipoVino,
        as: 'tipos_vino',
        through: { attributes: [] }
      }
    ]
  });
}
```

**Resultado:**  
GET `/users?role=winery` ahora incluye:
- `denominaciones[]` - Array de DOs asociadas a cada bodega
- `denominaciones[].variedades[]` - Variedades autorizadas por cada DO
- `denominaciones[].tipos_vino[]` - Tipos de vino permitidos por cada DO

---

### 2. Frontend (JavaScript)

#### Modificado: `public/js/list-winery.js`

**2.1 Método `createWineryCard()`** (Líneas 418-422)

Añadido procesamiento de datos de DO:

```javascript
// Extraer información de DO, variedades y tipos
const denominacionesData = this.extractDenominacionesInfo(winery);
const dosHtml = this.createDosSection(denominacionesData);
```

Y en el template HTML (Línea 451):
```javascript
${dosHtml}  // Nueva sección entre badges y botones
```

**2.2 Nuevo Método `extractDenominacionesInfo()`** (Líneas 625-665)

Extrae y consolida información de todas las DOs de una bodega:

```javascript
extractDenominacionesInfo(winery) {
  const result = {
    dos: [],           // Array de objetos { id, nombre, tipo }
    variedades: Set(), // Set para eliminar duplicados
    tipos: Set()       // Set para eliminar duplicados
  };
  
  // Itera sobre denominaciones y extrae variedades/tipos únicos
  winery.denominaciones?.forEach(do_ => {
    result.dos.push({ id: do_.id, nombre: do_.nombre, tipo: do_.tipo });
    do_.variedades?.forEach(v => result.variedades.add(v.nombre));
    do_.tipos_vino?.forEach(t => result.tipos.add(t.nombre));
  });
  
  return result;
}
```

**2.3 Nuevo Método `createDosSection()`** (Líneas 667-722)

Genera HTML para mostrar DOs, variedades y tipos:

```javascript
createDosSection(data) {
  let html = '<div class="winery-card-dos">';
  
  // 🏅 Denominaciones (máximo 2 visibles, +N si hay más)
  if (data.dos.length > 0) {
    html += '<div class="winery-dos-section">';
    html += '<span class="winery-dos-label">🏅 DO:</span> ';
    html += data.dos.slice(0, 2).map(do_ => 
      `<span class="winery-do-tag">${do_.tipo} ${do_.nombre}</span>`
    ).join('');
    if (data.dos.length > 2) {
      html += `<span class="winery-more-tag">+${data.dos.length - 2}</span>`;
    }
    html += '</div>';
  }
  
  // 🍇 Variedades (máximo 3 visibles)
  // 🍷 Tipos (máximo 3 visibles)
  
  html += '</div>';
  return html;
}
```

---

### 3. Frontend (CSS)

#### Modificado: `public/list-winery.css`

**3.1 Nueva Sección `.winery-card-dos`** (Líneas 289-358)

```css
.winery-card-dos {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.winery-dos-section,
.winery-variedades-section,
.winery-tipos-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
```

**3.2 Estilos de Tags**

```css
/* DOs - Morado */
.winery-do-tag {
  background: rgba(103, 58, 183, 0.15);
  color: #b39ddb;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.7rem;
}

/* Variedades - Rosa */
.winery-variedad-tag {
  background: rgba(156, 39, 176, 0.15);
  color: #ce93d8;
}

/* Tipos - Rosa intenso */
.winery-tipo-tag {
  background: rgba(233, 30, 99, 0.15);
  color: #f48fb1;
}

/* Tag "+N más" */
.winery-more-tag {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
```

---

### 4. Scripts de Datos

#### Nuevo: `scripts/link-wineries-dos.js`

**Propósito:** Vincular bodegas existentes con DOs

```bash
node scripts/link-wineries-dos.js
```

**Resultado:** 5 vínculos creados
- Bodega Los Maestros Actualizada → Penedès
- Bodega Exp Updated → Rueda
- Bodega Test Frontend → Ribeiro
- JAVIER MAESTRO RODRÍGUEZ → Ribera del Duero, Rioja

#### Nuevo: `scripts/link-dos-variedades-tipos.js`

**Propósito:** Vincular DOs con sus variedades y tipos característicos

```bash
node scripts/link-dos-variedades-tipos.js
```

**Ejemplo de vinculación:**
```javascript
'Rioja': {
  variedades: ['Tempranillo', 'Garnacha'],
  tipos: ['Crianza', 'Reserva', 'Gran Reserva', 'Blanco']
},
'Rías Baixas': {
  variedades: ['Albariño', 'Treixadura'],
  tipos: ['Blanco', 'Espumoso']
}
```

#### Nuevo: `scripts/test-winery-dos.js`

**Propósito:** Probar endpoint de bodegas con relaciones DO

```bash
node scripts/test-winery-dos.js
```

**Output de ejemplo:**
```
📊 RESUMEN DE TODAS LAS BODEGAS:

1. Bodega Los Maestros Actualizada
   DOs: 1 | Variedades: 1 | Tipos: 3
   📍 Penedès

2. JAVIER MAESTRO RODRÍGUEZ
   DOs: 2 | Variedades: 4 | Tipos: 4
   📍 Rioja, Ribera del Duero
```

---

## 📊 Datos de Ejemplo

### Estructura de Respuesta API

```json
{
  "success": true,
  "data": [
    {
      "id": "google-oauth2|123456789",
      "nombre": "Bodega Los Maestros Actualizada",
      "email": "info@maestros.wine",
      "role": "winery",
      "kyc_status": "verified",
      "denominaciones": [
        {
          "id": "383574b0-deb4-4c35-8675-ee4f852fda18",
          "nombre": "Penedès",
          "tipo": "DO",
          "pais": "España",
          "region": "Cataluña",
          "variedades": [
            {
              "id": "uuid",
              "nombre": "Chardonnay",
              "color": "Blanca"
            }
          ],
          "tipos_vino": [
            {
              "id": "uuid",
              "nombre": "Blanco"
            },
            {
              "id": "uuid",
              "nombre": "Reserva"
            },
            {
              "id": "uuid",
              "nombre": "Espumoso"
            }
          ]
        }
      ]
    }
  ],
  "pagination": {
    "total": 4,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## 🎨 Interfaz Visual

### Antes:
```
┌─────────────────────────┐
│ Bodega Los Maestros     │
│ info@maestros.wine      │
├─────────────────────────┤
│ KYC: verified           │
│ Suscripción: inactive   │
├─────────────────────────┤
│ [Vino Tinto] [Reserva]  │  ← Categorías hardcodeadas
├─────────────────────────┤
│ [Sin badges]            │
├─────────────────────────┤
│ [Ver Detalles]          │
└─────────────────────────┘
```

### Después:
```
┌─────────────────────────────────────┐
│ Bodega Los Maestros                 │
│ info@maestros.wine                  │
├─────────────────────────────────────┤
│ KYC: verified                       │
│ Suscripción: inactive               │
├─────────────────────────────────────┤
│ [Vino Tinto] [Reserva]              │
├─────────────────────────────────────┤
│ [Sin badges]                        │
├─────────────────────────────────────┤  ← NUEVA SECCIÓN
│ 🏅 DO: [DO Penedès]                 │
│ 🍇 Uvas: [Chardonnay]               │
│ 🍷 Tipos: [Blanco] [Reserva] [+1]  │
├─────────────────────────────────────┤
│ [Ver Detalles]                      │
└─────────────────────────────────────┘
```

---

## 🔧 Testing

### 1. Verificar Endpoint

```bash
curl "http://localhost:6001/users?role=winery" | jq '.data[0] | {nombre, denominaciones: .denominaciones | length}'
```

**Salida esperada:**
```json
{
  "nombre": "Bodega Los Maestros Actualizada",
  "denominaciones": 1
}
```

### 2. Ver Frontend

Abrir: http://localhost:6001/list-winery.html

**Verificar:**
- ✅ Sección "🏅 DO:" visible en tarjetas con DOs
- ✅ Tags de color morado para DOs
- ✅ Tags de color rosa para variedades
- ✅ Tags de color rosa intenso para tipos
- ✅ Tag "+N" cuando hay más de 2 DOs o 3 variedades/tipos

### 3. Verificar Consola

```bash
node scripts/test-winery-dos.js
```

**Output esperado:**
```
✅ Respuesta exitosa
📊 Total bodegas: 4

📋 EJEMPLO DE BODEGA:
Nombre: Bodega Los Maestros Actualizada
🏅 Denominaciones de Origen (1):
  1. DO Penedès
     🍇 Variedades (1): Chardonnay
     🍷 Tipos (3): Blanco, Reserva, Espumoso
```

---

## 📈 Impacto

### Antes
- Categorías estáticas hardcodeadas
- Sin información de DO real
- No se podía filtrar por variedades o tipos auténticos

### Después
- Datos dinámicos desde base de datos
- Información oficial de DOs, variedades y tipos
- Filtros precisos basados en certificaciones reales
- Escalable: añadir nuevas DOs no requiere cambios de código

---

## 🚀 Próximos Pasos

### Fase 2 Opcional: Regulaciones
- Mostrar normativas de crianza por DO
- Validar cumplimiento de tiempos mínimos

### Fase 3 Opcional: Clima y Geografía
- Integrar PostGIS para datos espaciales
- Mostrar mapa con ubicación de DOs
- Búsqueda por radio geográfico

### Mejoras UX
- Modal de detalle de bodega: incluir sección expandida de DOs
- Tooltip al hacer hover en tags de DO con info completa
- Filtro multi-select específico para DOs en sidebar

---

## 📚 Referencias

- [API-REFERENCE-DO.md](./API-REFERENCE-DO.md) - Documentación completa de endpoints
- [ModeloDatos-ampliado.md](./ModeloDatos-ampliado.md) - Modelo de datos detallado
- [ARCHITECTURE-DO.md](./ARCHITECTURE-DO.md) - Diagramas de arquitectura

---

**✅ Implementación completada exitosamente el 12/02/2026**
