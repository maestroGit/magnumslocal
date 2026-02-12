# API Reference - Denominaciones de Origen

**Version:** 1.0.0  
**Base URL:** `http://localhost:6001`  
**Content-Type:** `application/json`

---

## Authentication

🚧 **TODO Fase 2:** Actualmente sin autenticación. Se implementará JWT/OAuth2.

---

## Endpoints

### Denominaciones de Origen

#### `GET /denominaciones`

Lista todas las denominaciones de origen con filtros opcionales.

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Número de página |
| `limit` | integer | 20 | Resultados por página (max 100) |
| `tipo` | string | - | Filtrar por tipo (DO, DOCa, DOQ, DOP, IGP) |
| `pais` | string | - | Filtrar por país |
| `region` | string | - | Filtrar por región |
| `clima` | string | - | Filtrar por clima |
| `search` | string | - | Búsqueda en nombre y región (case-insensitive) |
| `includeVariedades` | boolean | false | Incluir variedades autorizadas |
| `includeTipos` | boolean | false | Incluir tipos de vino permitidos |
| `includeBodegas` | boolean | false | Incluir bodegas asociadas |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Rioja",
      "tipo": "DOCa",
      "pais": "España",
      "region": "La Rioja",
      "subzona": null,
      "fecha_registro": "2000-01-01T00:00:00.000Z",
      "superficie_vinedo_ha": 65000,
      "produccion_anual_hl": 2800000,
      "altitud_min": 300,
      "altitud_max": 700,
      "clima": "Atlántico-continental",
      "suelos_predominantes": "Arcillo-calcáreos",
      "descripcion_terroir": "Suelos arcillo-calcáreos y aluviales",
      "normativa_url": "https://riojawine.com/normativa",
      "consejo_regulador": "Consejo Regulador DOCa Rioja"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**Response 500:**
```json
{
  "success": false,
  "error": "Error al listar denominaciones",
  "details": "..."
}
```

**Examples:**
```bash
# Todas las DOs
curl http://localhost:6001/denominaciones

# DOs de España
curl "http://localhost:6001/denominaciones?pais=España"

# Buscar por nombre
curl "http://localhost:6001/denominaciones?search=Rioja"

# Con variedades y tipos
curl "http://localhost:6001/denominaciones?includeVariedades=true&includeTipos=true"

# Paginación
curl "http://localhost:6001/denominaciones?page=2&limit=10"
```

---

#### `GET /denominaciones/:id`

Obtiene detalles completos de una DO específica, incluyendo todas sus relaciones.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | UUID | ID de la denominación |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Rioja",
    "tipo": "DOCa",
    "pais": "España",
    "region": "La Rioja",
    "clima": "Atlántico-continental",
    "variedades": [
      {
        "id": "uuid",
        "nombre": "Tempranillo",
        "color": "tinta",
        "descripcion": "Variedad tinta principal de España"
      }
    ],
    "tipos_vino": [
      {
        "id": "uuid",
        "nombre": "Crianza",
        "descripcion": "Vino con crianza reglamentaria"
      }
    ],
    "bodegas": [
      {
        "id": "user-id",
        "name": "Bodega López",
        "email": "info@bodegalopez.com"
      }
    ],
    "regulaciones": [],
    "climas": [],
    "geografia": []
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": "Denominacion de origen no encontrada"
}
```

**Example:**
```bash
curl http://localhost:6001/denominaciones/uuid-here
```

---

#### `POST /denominaciones`

Crea una nueva denominación de origen.

**Request Body:**
```json
{
  "nombre": "Rueda",
  "tipo": "DO",
  "pais": "España",
  "region": "Castilla y León",
  "subzona": null,
  "superficie_vinedo_ha": 15000,
  "produccion_anual_hl": 80000,
  "altitud_min": 600,
  "altitud_max": 900,
  "clima": "Continental",
  "suelos_predominantes": "Pedregosos y calcáreos",
  "descripcion_terroir": "Suelos pedregosos con piedras calizas"
}
```

**Required Fields:**
- `nombre` (string, unique)
- `tipo` (string)
- `pais` (string)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "nombre": "Rueda",
    "tipo": "DO",
    ...
  }
}
```

**Response 400:**
```json
{
  "success": false,
  "error": "Campos requeridos: nombre, tipo, pais"
}
```

**Response 409:**
```json
{
  "success": false,
  "error": "Ya existe una DO con ese nombre"
}
```

**Example:**
```bash
curl -X POST http://localhost:6001/denominaciones \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Rueda",
    "tipo": "DO",
    "pais": "España",
    "region": "Castilla y León",
    "clima": "Continental"
  }'
```

---

#### `PUT /denominaciones/:id`

Actualiza una DO existente.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | UUID | ID de la denominación |

**Request Body:**
```json
{
  "superficie_vinedo_ha": 16000,
  "produccion_anual_hl": 85000,
  "descripcion_terroir": "Actualizado..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Rueda",
    "superficie_vinedo_ha": 16000,
    ...
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": "Denominacion de origen no encontrada"
}
```

**Example:**
```bash
curl -X PUT http://localhost:6001/denominaciones/uuid-here \
  -H "Content-Type: application/json" \
  -d '{"superficie_vinedo_ha": 16000}'
```

---

#### `DELETE /denominaciones/:id`

Elimina una DO.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | UUID | ID de la denominación |

**Response 200:**
```json
{
  "success": true,
  "message": "Denominacion eliminada correctamente"
}
```

**Response 404:**
```json
{
  "success": false,
  "error": "Denominacion de origen no encontrada"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:6001/denominaciones/uuid-here
```

---

#### `POST /denominaciones/:id/variedades`

Vincula una variedad a una DO.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | UUID | ID de la denominación |

**Request Body:**
```json
{
  "variedad_id": "uuid-variedad"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Variedad agregada a la DO"
}
```

**Response 404:**
```json
{
  "success": false,
  "error": "DO no encontrada"
}
```

**Example:**
```bash
curl -X POST http://localhost:6001/denominaciones/uuid-do/variedades \
  -H "Content-Type: application/json" \
  -d '{"variedad_id": "uuid-variedad"}'
```

---

#### `POST /denominaciones/:id/tipos`

Vincula un tipo de vino a una DO.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | UUID | ID de la denominación |

**Request Body:**
```json
{
  "tipo_vino_id": "uuid-tipo"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Tipo de vino agregado a la DO"
}
```

**Example:**
```bash
curl -X POST http://localhost:6001/denominaciones/uuid-do/tipos \
  -H "Content-Type: application/json" \
  -d '{"tipo_vino_id": "uuid-tipo"}'
```

---

#### `POST /denominaciones/:id/bodegas`

Vincula una bodega (User con role='winery') a una DO.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | UUID | ID de la denominación |

**Request Body:**
```json
{
  "bodega_id": "user-id-string"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Bodega agregada a la DO"
}
```

**Response 404:**
```json
{
  "success": false,
  "error": "Bodega no encontrada"
}
```

**Example:**
```bash
curl -X POST http://localhost:6001/denominaciones/uuid-do/bodegas \
  -H "Content-Type: application/json" \
  -d '{"bodega_id": "user-id"}'
```

---

### Variedades

#### `GET /variedades`

Lista todas las variedades de uva.

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `color` | string | - | Filtrar por color (tinta, blanca, rosada) |
| `includeDenominaciones` | boolean | false | Incluir DOs que autorizan esta variedad |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Tempranillo",
      "color": "tinta",
      "descripcion": "Variedad tinta principal de España"
    }
  ]
}
```

**Example:**
```bash
# Todas las variedades
curl http://localhost:6001/variedades

# Solo tintas
curl "http://localhost:6001/variedades?color=tinta"

# Con denominaciones
curl "http://localhost:6001/variedades?includeDenominaciones=true"
```

---

#### `GET /variedades/:id`

Obtiene detalle de una variedad con sus DOs.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Tempranillo",
    "color": "tinta",
    "descripcion": "Variedad tinta principal de España",
    "denominaciones": [
      {
        "id": "uuid",
        "nombre": "Rioja",
        "tipo": "DOCa"
      }
    ]
  }
}
```

---

#### `POST /variedades`

Crea una nueva variedad.

**Request Body:**
```json
{
  "nombre": "Hondarribi Zuri",
  "color": "blanca",
  "descripcion": "Variedad autóctona del País Vasco"
}
```

**Required Fields:**
- `nombre` (string, unique)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "nombre": "Hondarribi Zuri",
    ...
  }
}
```

---

#### `PUT /variedades/:id`

Actualiza una variedad.

**Request Body:**
```json
{
  "descripcion": "Descripción actualizada"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {...}
}
```

---

#### `DELETE /variedades/:id`

Elimina una variedad.

**Response 200:**
```json
{
  "success": true,
  "message": "Variedad eliminada correctamente"
}
```

---

### Tipos de Vino

#### `GET /tipos-vino`

Lista todos los tipos de vino.

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `includeDenominaciones` | boolean | false | Incluir DOs que permiten este tipo |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Crianza",
      "descripcion": "Vino con crianza reglamentaria"
    }
  ]
}
```

---

#### `GET /tipos-vino/:id`

Obtiene detalle de un tipo con sus DOs.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Crianza",
    "descripcion": "Vino con crianza reglamentaria",
    "denominaciones": [...]
  }
}
```

---

#### `POST /tipos-vino`

Crea un nuevo tipo de vino.

**Request Body:**
```json
{
  "nombre": "Vino de Hielo",
  "descripcion": "Vino elaborado con uvas congeladas"
}
```

**Required Fields:**
- `nombre` (string, unique)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "nombre": "Vino de Hielo",
    ...
  }
}
```

---

#### `PUT /tipos-vino/:id`

Actualiza un tipo de vino.

**Request Body:**
```json
{
  "descripcion": "Descripción actualizada"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {...}
}
```

---

#### `DELETE /tipos-vino/:id`

Elimina un tipo de vino.

**Response 200:**
```json
{
  "success": true,
  "message": "Tipo de vino eliminado correctamente"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Parámetros inválidos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Violación de constraint (único, etc.) |
| 500 | Internal Server Error - Error del servidor |

---

## Rate Limiting

🚧 **TODO:** No implementado aún.

Plan futuro: 100 requests/minuto por IP.

---

## Pagination

Todos los endpoints de listado soportan paginación:

```json
{
  "pagination": {
    "total": 100,       // Total de registros
    "page": 1,          // Página actual
    "limit": 20,        // Registros por página
    "totalPages": 5     // Total de páginas
  }
}
```

---

## Filtering & Search

### Búsqueda de Texto
- `search` - Case-insensitive, busca en múltiples campos

### Filtros Exactos
- `tipo`, `pais`, `region`, `clima`, `color`

### Eager Loading
- `includeVariedades`, `includeTipos`, `includeBodegas`, `includeDenominaciones`

---

## Testing

```bash
# Test suite completo
node scripts/test-do-endpoints.js

# Test individual
curl http://localhost:6001/denominaciones | jq
```

---

## Postman Collection

🚧 **TODO:** Exportar colección de Postman.

---

## OpenAPI/Swagger

🚧 **TODO:** Generar especificación OpenAPI 3.0.

---

## Changelog

### v1.0.0 (12/02/2026)
- Implementación inicial
- CRUD completo para DOs, variedades, tipos
- Endpoints de vinculación
- Filtros y búsqueda
- Paginación

---

**Fin de API Reference**
