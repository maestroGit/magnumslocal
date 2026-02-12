# Modelo de Datos Ampliado - Denominaciones de Origen

**Fecha:** 12/02/2026  
**Estado:** Implementado ✅  
**Version:** 1.0.0  
**Autor:** BlocksWine Development Team

---

## Tabla de Contenido
1. [Objetivo](#objetivo)
2. [Arquitectura](#arquitectura)
3. [Modelo de Datos](#modelo-de-datos)
4. [API Reference](#api-reference)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [Frontend Integration](#frontend-integration)
7. [Consultas Avanzadas](#consultas-avanzadas)
8. [Guía de Desarrollo](#guía-de-desarrollo)
9. [Extensibilidad](#extensibilidad)

---

## Objetivo
Definir e implementar un modelo de datos ampliado para Denominaciones de Origen (DO) que permita:
- Catalogar denominaciones de origen vitivinícolas internacionales
- Relacionar DOs con variedades de uva autorizadas
- Gestionar tipos de vino permitidos por DO
- Vincular bodegas a sus denominaciones
- Almacenar regulaciones, datos climáticos y geográficos
- Proporcionar filtros dinámicos en el frontend

---

## Arquitectura

### Stack Tecnológico
```
Frontend:  Vanilla JS (ES6 modules) + HTML5 + CSS3
Backend:   Node.js 18+ + Express 4.22.0
ORM:       Sequelize 6.37.7
Database:  PostgreSQL 8.18.0
```

### Flujo de Datos
```
┌─────────────────┐
│  list-winery.js │  ← Carga opciones al init()
└────────┬────────┘
         │ fetch()
         ▼
┌─────────────────────────────────┐
│  denominacionOrigenController   │
│  variedadController             │  ← Lógica de negocio
│  tipoVinoController             │
└────────┬────────────────────────┘
         │ Sequelize ORM
         ▼
┌─────────────────────────────────┐
│  PostgreSQL Database            │
│  ├─ denominaciones_origen       │
│  ├─ variedades                  │
│  ├─ tipos_vino                  │
│  ├─ do_variedades (junction)    │  ← Tablas
│  ├─ do_tipos_vino (junction)    │
│  ├─ do_bodegas (junction)       │
│  ├─ regulaciones_do             │
│  ├─ do_clima                    │
│  └─ do_geografia                │
└─────────────────────────────────┘
```

### Capa de Modelos (Sequelize)
```javascript
// app/models/index.js
DenominacionOrigen.belongsToMany(Variedad, {
  through: 'do_variedades',
  foreignKey: 'do_id',
  otherKey: 'variedad_id',
  as: 'variedades'
});

DenominacionOrigen.belongsToMany(TipoVino, {
  through: 'do_tipos_vino',
  foreignKey: 'do_id',
  otherKey: 'tipo_vino_id',
  as: 'tipos_vino'
});

DenominacionOrigen.belongsToMany(User, {
  through: 'do_bodegas',
  foreignKey: 'do_id',
  otherKey: 'bodega_id',
  as: 'bodegas'
});
```

---

---

## Modelo de Datos

## Fase 1 (Nucleo Operativo) ✅ IMPLEMENTADO

### 1) Tabla principal: `denominaciones_origen`

**Propósito:** Catálogo principal de denominaciones de origen vitivinícolas.

**Schema Sequelize:**
```javascript
// app/models/DenominacionOrigen.js
{
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true  // Evita duplicados
  },
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    // Valores: 'DO', 'DOCa', 'DOQ', 'DOP', 'IGP', 'Vino de Pago'
  },
  pais: {
    type: DataTypes.STRING(80),
    allowNull: false,
  },
  region: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  subzona: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  superficie_vinedo_ha: {
    type: DataTypes.INTEGER,
    allowNull: true,
    // Superficie en hectáreas
  },
  produccion_anual_hl: {
    type: DataTypes.INTEGER,
    allowNull: true,
    // Producción en hectolitros
  },
  altitud_min: {
    type: DataTypes.INTEGER,
    allowNull: true,
    // Metros sobre el nivel del mar
  },
  altitud_max: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  clima: {
    type: DataTypes.STRING(100),
    allowNull: true,
    // Ej: 'Atlántico-continental', 'Mediterráneo', 'Continental'
  },
  suelos_predominantes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  descripcion_terroir: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  normativa_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    // URL al consejo regulador o BOE
  },
  consejo_regulador: {
    type: DataTypes.STRING(255),
    allowNull: true,
  }
}
```

**Índices:**
```sql
CREATE INDEX idx_do_tipo ON denominaciones_origen(tipo);
CREATE INDEX idx_do_pais_region ON denominaciones_origen(pais, region);
CREATE INDEX idx_do_nombre ON denominaciones_origen(nombre);
```

**Ejemplos de Datos:**
- Rioja (DOCa) - España - La Rioja
- Ribera del Duero (DO) - España - Castilla y León
- Priorat (DOQ) - España - Cataluña
- Bordeaux (AOC) - Francia - Nouvelle-Aquitaine
- Chianti (DOCG) - Italia - Toscana

---

### 2) Tabla: `variedades`

**Propósito:** Catálogo de variedades de uva (cultivares).

**Schema Sequelize:**
```javascript
// app/models/Variedad.js
{
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    // Valores: 'tinta', 'blanca', 'rosada'
  }
}
```

**Tabla puente: `do_variedades`**

Relación N:N entre denominaciones y variedades autorizadas.

```javascript
// app/models/DoVariedad.js
{
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'denominaciones_origen', key: 'id' }
  },
  variedad_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'variedades', key: 'id' }
  }
}
```

**Índice único:**
```sql
CREATE UNIQUE INDEX idx_do_variedad_unique 
ON do_variedades(do_id, variedad_id);
```

**Ejemplos:**
- Rioja permite: Tempranillo, Garnacha, Graciano, Mazuelo, Viura
- Ribera del Duero permite: Tempranillo (Tinto Fino), Cabernet Sauvignon, Merlot
- Rías Baixas permite: Albariño (mínimo 70%)

---

### 3) Tabla: `tipos_vino`

**Propósito:** Catálogo de tipos o estilos de vino permitidos.

**Schema Sequelize:**
```javascript
// app/models/TipoVino.js
{
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}
```

**Tabla puente: `do_tipos_vino`**

```javascript
// app/models/DoTipoVino.js
{
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'denominaciones_origen', key: 'id' }
  },
  tipo_vino_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'tipos_vino', key: 'id' }
  }
}
```

**Ejemplos:**
- Tinto, Tinto Joven, Crianza, Reserva, Gran Reserva
- Blanco, Blanco Fermentado en Barrica
- Rosado, Clarete
- Espumoso, Cava
- Generoso (Jerez), Fortificado

---

### 4) Bodegas (Reutilización de `User`)

Se reutiliza el modelo `User` con `role = 'winery'`.

**Tabla puente: `do_bodegas`**

```javascript
// app/models/DoBodega.js
{
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'denominaciones_origen', key: 'id' }
  },
  bodega_id: {
    type: DataTypes.STRING(32),  // User.id es STRING
    allowNull: false,
    references: { model: 'usuarios', key: 'id' }
  }
}
```

**Ventajas:**
- No duplica información de bodegas
- Reutiliza autenticación y autorización existente
- Compatibilidad con sistema de badges actual

---

## Fase 2 (Regulaciones) 🚧 TODO

### 5) Tabla: `regulaciones_do`

**Propósito:** Almacenar normativas específicas de cada DO (rendimientos, crianzas, etc.).

Cada DO puede tener múltiples regulaciones para:
- Diferentes añadas
- Actualizaciones históricas del consejo regulador
- Regulaciones específicas por tipo de vino

**Schema Propuesto:**
```javascript
{
  id: UUID (PK),
  do_id: UUID (FK),
  rendimiento_max_kg_ha: INTEGER,       // Ej: 6500 kg/ha
  densidad_plantacion_min: INTEGER,     // Ej: 2500 cepas/ha
  densidad_plantacion_max: INTEGER,     // Ej: 4000 cepas/ha
  sistema_conduccion: STRING,           // Ej: 'vaso', 'espaldera'
  metodo_elaboracion: TEXT,
  tiempos_crianza_json: JSONB,          // {"crianza": {barrica: 12, botella: 12}}
  fecha_vigencia: DATE,
  activo: BOOLEAN
}
```

**Ejemplo de `tiempos_crianza_json`:**
```json
{
  "crianza": {
    "barrica_meses": 12,
    "botella_meses": 12,
    "total_meses": 24
  },
  "reserva": {
    "barrica_meses": 12,
    "botella_meses": 24,
    "total_meses": 36
  },
  "gran_reserva": {
    "barrica_meses": 24,
    "botella_meses": 36,
    "total_meses": 60
  }
}
```

---

## Fase 3 (Clima y Geografia) 🚧 TODO

### 6) Tabla: `do_clima`

**Propósito:** Datos climáticos promedio para análisis de terroir.

Puede ser 1:1 (promedio DO) o 1:N (múltiples estaciones).

```javascript
{
  id: UUID (PK),
  do_id: UUID (FK),
  temp_media: DECIMAL,                  // °C
  precipitacion_anual: INTEGER,         // mm
  amplitud_termica: DECIMAL,            // °C
  dias_helada: INTEGER,                 // días/año
  horas_sol: INTEGER,                   // horas/año
  fecha_muestreo: DATE,
  estacion_nombre: STRING               // Opcional, si hay múltiples estaciones
}
```

---

### 7) Tabla: `do_geografia`

**Propósito:** Datos geográficos detallados para mapeo y análisis.

```javascript
{
  id: UUID (PK),
  do_id: UUID (FK),
  lat: DECIMAL(10,8),
  lng: DECIMAL(11,8),
  altitud: INTEGER,                     // metros
  pendiente: DECIMAL,                   // grados
  orientacion: STRING,                  // N, S, E, O, NE, etc.
  tipo_suelo: STRING,                   // 'calizo', 'arcilloso', 'pizarra', etc.
  geom: GEOMETRY(POLYGON, 4326)         // PostGIS opcional
}
```

**Uso con PostGIS (futuro):**
```sql
-- Habilitar PostGIS
CREATE EXTENSION postgis;

-- Crear índice espacial
CREATE INDEX idx_do_geo_geom ON do_geografia USING GIST(geom);

-- Query: DOs dentro de un radio
SELECT d.nombre
FROM denominaciones_origen d
JOIN do_geografia g ON g.do_id = d.id
WHERE ST_DWithin(
  g.geom,
  ST_SetSRID(ST_MakePoint(-3.7038, 40.4168), 4326),  -- Madrid
  100000  -- 100 km
);
```

---

---

## Relaciones clave
- DO <-> Variedades (N:N) via `do_variedades`
- DO <-> Tipos de vino (N:N) via `do_tipos_vino`
- DO <-> Bodegas (N:N) via `do_bodegas`
- DO <-> Regulaciones (1:N)
- DO <-> Clima (1:1 o 1:N)
- DO <-> Geografia (1:N)

---

## API Reference

### Base URL
```
http://localhost:6001
```

### Endpoints de Denominaciones

#### `GET /denominaciones`
Lista todas las denominaciones con filtros opcionales.

**Query Parameters:**
- `page` (number, default: 1) - Número de página
- `limit` (number, default: 20) - Resultados por página
- `tipo` (string) - Filtrar por tipo (DO, DOCa, DOQ, etc.)
- `pais` (string) - Filtrar por país
- `region` (string) - Filtrar por región
- `clima` (string) - Filtrar por clima
- `search` (string) - Búsqueda en nombre y región
- `includeVariedades` (boolean, default: false) - Incluir variedades autorizadas
- `includeTipos` (boolean, default: false) - Incluir tipos de vino
- `includeBodegas` (boolean, default: false) - Incluir bodegas asociadas

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "nombre": "Rioja",
      "tipo": "DOCa",
      "pais": "España",
      "region": "La Rioja",
      "clima": "Atlántico-continental",
      "descripcion_terroir": "Suelos arcillo-calcáreos y aluviales",
      "variedades": [...]  // Si includeVariedades=true
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

**Ejemplo:**
```bash
# Listar todas las DO de España
curl "http://localhost:6001/denominaciones?pais=España"

# Buscar DOs por nombre
curl "http://localhost:6001/denominaciones?search=Ribera"

# Obtener DOs con sus variedades
curl "http://localhost:6001/denominaciones?includeVariedades=true"
```

---

#### `GET /denominaciones/:id`
Obtiene detalles completos de una DO específica.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "nombre": "Rioja",
    "tipo": "DOCa",
    "pais": "España",
    "region": "La Rioja",
    "variedades": [
      {
        "id": "uuid",
        "nombre": "Tempranillo",
        "color": "tinta"
      }
    ],
    "tipos_vino": [
      {
        "id": "uuid",
        "nombre": "Crianza"
      }
    ],
    "bodegas": [
      {
        "id": "user-id",
        "name": "Bodega López",
        "email": "info@bodegalopez.com"
      }
    ],
    "regulaciones": [...],
    "climas": [...],
    "geografia": [...]
  }
}
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
  "clima": "Continental",
  "superficie_vinedo_ha": 15000,
  "descripcion_terroir": "Suelos pedregosos con piedras calizas"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "nombre": "Rueda",
    ...
  }
}
```

---

#### `PUT /denominaciones/:id`
Actualiza una DO existente.

**Request Body:**
```json
{
  "superficie_vinedo_ha": 16000,
  "produccion_anual_hl": 120000
}
```

---

#### `DELETE /denominaciones/:id`
Elimina una DO.

**Response:**
```json
{
  "success": true,
  "message": "Denominacion eliminada correctamente"
}
```

---

#### `POST /denominaciones/:id/variedades`
Vincula una variedad a una DO.

**Request Body:**
```json
{
  "variedad_id": "uuid-variedad"
}
```

---

#### `POST /denominaciones/:id/tipos`
Vincula un tipo de vino a una DO.

**Request Body:**
```json
{
  "tipo_vino_id": "uuid-tipo"
}
```

---

#### `POST /denominaciones/:id/bodegas`
Vincula una bodega a una DO.

**Request Body:**
```json
{
  "bodega_id": "user-id"
}
```

---

### Endpoints de Variedades

#### `GET /variedades`
Lista todas las variedades.

**Query Parameters:**
- `color` (string) - Filtrar por color (tinta, blanca)
- `includeDenominaciones` (boolean) - Incluir DOs que autorizan esta variedad

**Response:**
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

**CRUD Completo:**
- `POST /variedades` - Crear
- `GET /variedades/:id` - Detalle
- `PUT /variedades/:id` - Actualizar
- `DELETE /variedades/:id` - Eliminar

---

### Endpoints de Tipos de Vino

#### `GET /tipos-vino`
Lista todos los tipos de vino.

**Query Parameters:**
- `includeDenominaciones` (boolean) - Incluir DOs que permiten este tipo

**Response:**
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

**CRUD Completo:**
- `POST /tipos-vino` - Crear
- `GET /tipos-vino/:id` - Detalle
- `PUT /tipos-vino/:id` - Actualizar
- `DELETE /tipos-vino/:id` - Eliminar

---

## Ejemplos de Uso

### Flujo Completo: Crear una DO con Variedades y Tipos

```javascript
// 1. Crear la DO
const doResponse = await fetch('http://localhost:6001/denominaciones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre: 'Ribera del Duero',
    tipo: 'DO',
    pais: 'España',
    region: 'Castilla y León',
    clima: 'Continental',
    altitud_min: 750,
    altitud_max: 1000
  })
});
const { data: do_ } = await doResponse.json();

// 2. Obtener ID de variedad Tempranillo
const variedadesRes = await fetch('http://localhost:6001/variedades');
const { data: variedades } = await variedadesRes.json();
const tempranillo = variedades.find(v => v.nombre === 'Tempranillo');

// 3. Vincular variedad a DO
await fetch(`http://localhost:6001/denominaciones/${do_.id}/variedades`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ variedad_id: tempranillo.id })
});

// 4. Obtener ID de tipo Crianza
const tiposRes = await fetch('http://localhost:6001/tipos-vino');
const { data: tipos } = await tiposRes.json();
const crianza = tipos.find(t => t.nombre === 'Crianza');

// 5. Vincular tipo a DO
await fetch(`http://localhost:6001/denominaciones/${do_.id}/tipos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tipo_vino_id: crianza.id })
});

// 6. Verificar DO completa
const doDetailRes = await fetch(`http://localhost:6001/denominaciones/${do_.id}`);
const { data: doDetail } = await doDetailRes.json();
console.log(doDetail);
// Output: { nombre: "Ribera del Duero", variedades: [{...Tempranillo}], tipos_vino: [{...Crianza}] }
```

---

### Búsquedas Comunes

```javascript
// Buscar DOs de clima continental
const continentales = await fetch(
  'http://localhost:6001/denominaciones?clima=Continental'
).then(r => r.json());

// Buscar bodegas en una DO específica
const rioja = await fetch(
  'http://localhost:6001/denominaciones?search=Rioja&includeBodegas=true'
).then(r => r.json());
const bodegasRioja = rioja.data[0].bodegas;

// Listar variedades tintas
const tintas = await fetch(
  'http://localhost:6001/variedades?color=tinta'
).then(r => r.json());
```

---

## Frontend Integration

### Carga Dinámica de Filtros

El frontend en `list-winery.js` carga opciones dinámicamente:

```javascript
// public/js/list-winery.js

class WineryListManager {
  async populateFilterOptions() {
    // Cargar opciones en paralelo
    const [denominaciones, variedades, tiposVino] = await Promise.all([
      this.loadDenominaciones(),
      this.loadVariedades(),
      this.loadTiposVino()
    ]);

    // Poblar select de DO
    this.populateSelect('doFilter', denominaciones, 'Selecciona DO');
    
    // Poblar select de Uva (variedades)
    this.populateSelect('uvaFilter', variedades, 'Selecciona uva');
    
    // Poblar select de Estilo (tipos de vino)
    this.populateSelect('estiloFilter', tiposVino, 'Selecciona estilo');
  }

  async loadDenominaciones() {
    const response = await fetch('/denominaciones');
    const result = await response.json();
    return result.data.map(do_ => ({
      value: `do_${do_.id}`,
      label: `${do_.tipo || 'DO'} ${do_.nombre}`
    }));
  }

  async loadVariedades() {
    const response = await fetch('/variedades');
    const result = await response.json();
    return result.data.map(variedad => ({
      value: `uva_${variedad.id}`,
      label: `Uva ${variedad.nombre}`
    }));
  }

  async loadTiposVino() {
    const response = await fetch('/tipos-vino');
    const result = await response.json();
    return result.data.map(tipo => ({
      value: `estilo_${tipo.id}`,
      label: tipo.nombre
    }));
  }
}
```

### Formato de Badges

Los badges se almacenan en `User.badges` como array de strings:

```json
{
  "badges": [
    "do_uuid-rioja",
    "uva_uuid-tempranillo",
    "estilo_uuid-crianza",
    "medalla_oro"
  ]
}
```

El frontend traduce estos IDs a labels legibles usando el cache `badgeLabels`:

```javascript
getBadgeLabel(badge) {
  // Buscar en cache dinámico (cargado en populateFilterOptions)
  if (this.badgeLabels[badge]) {
    return this.badgeLabels[badge];
  }
  // Fallback hardcoded para medallas y otros
  const fallback = {
    medalla_oro: 'Medalla Oro',
    medalla_plata: 'Medalla Plata',
    medalla_bronce: 'Medalla Bronce',
    // ...
  };
  return fallback[badge] || badge;
}
```

---

## Consultas Avanzadas

### Query 1: DOs donde Garnacha es autorizada

```javascript
// Backend Controller
const dosConGarnacha = await DenominacionOrigen.findAll({
  include: [{
    model: Variedad,
    as: 'variedades',
    where: { nombre: 'Garnacha' }
  }]
});
```

**SQL Equivalente:**
```sql
SELECT d.*
FROM denominaciones_origen d
JOIN do_variedades dv ON dv.do_id = d.id
JOIN variedades v ON v.id = dv.variedad_id
WHERE v.nombre = 'Garnacha';
```

---

### Query 2: DOs que producen espumosos

```javascript
const dosEspumosos = await DenominacionOrigen.findAll({
  include: [{
    model: TipoVino,
    as: 'tipos_vino',
    where: { nombre: { [Op.like]: '%Espumoso%' } }
  }]
});
```

---

### Query 3: Bodegas en DOs de clima continental

```javascript
const bodegasContinentales = await User.findAll({
  where: { role: 'winery' },
  include: [{
    model: DenominacionOrigen,
    as: 'denominaciones',
    where: { clima: { [Op.like]: '%Continental%' } }
  }]
});
```

**SQL Equivalente:**
```sql
SELECT u.*
FROM usuarios u
JOIN do_bodegas db ON db.bodega_id = u.id
JOIN denominaciones_origen d ON d.id = db.do_id
WHERE u.role = 'winery'
  AND d.clima LIKE '%Continental%';
```

---

### Query 4: DOs con rendimiento máximo < 6000 kg/ha

```javascript
const dosRendimientoBajo = await DenominacionOrigen.findAll({
  include: [{
    model: RegulacionDo,
    as: 'regulaciones',
    where: {
      rendimiento_max_kg_ha: { [Op.lt]: 6000 },
      activo: true
    }
  }]
});
```

---

### Query 5: Análisis de variedades más comunes

```sql
-- Top 10 variedades más utilizadas
SELECT v.nombre, COUNT(dv.do_id) as num_dos
FROM variedades v
JOIN do_variedades dv ON dv.variedad_id = v.id
GROUP BY v.id, v.nombre
ORDER BY num_dos DESC
LIMIT 10;

-- Output esperado:
-- Tempranillo: 35 DOs
-- Garnacha: 28 DOs
-- Cabernet Sauvignon: 22 DOs
```

---

### Query 6: Bodegas multi-DO

```sql
-- Bodegas certificadas en múltiples DOs
SELECT u.name, COUNT(db.do_id) as num_dos
FROM usuarios u
JOIN do_bodegas db ON db.bodega_id = u.id
WHERE u.role = 'winery'
GROUP BY u.id, u.name
HAVING COUNT(db.do_id) > 1
ORDER BY num_dos DESC;
```

---

## Guía de Desarrollo

### Setup Inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar DATABASE_URL en .env

# 3. Sincronizar base de datos
node init-db.js

# 4. Seed de datos iniciales
node scripts/seed-do.js

# 5. Iniciar servidor
npm run dev
```

---

### Agregar una Nueva DO Manualmente

```bash
# Crear nueva DO
curl -X POST http://localhost:6001/denominaciones \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Txakoli de Getaria",
    "tipo": "DO",
    "pais": "España",
    "region": "País Vasco",
    "clima": "Atlántico húmedo"
  }'

# Output: { "success": true, "data": { "id": "uuid-here", ... } }
```

---

### Agregar Nueva Variedad

```bash
curl -X POST http://localhost:6001/variedades \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Hondarribi Zuri",
    "color": "blanca",
    "descripcion": "Variedad autóctona del País Vasco"
  }'
```

---

### Vincular Variedad a DO

```bash
# Obtener IDs
DO_ID=$(curl -s 'http://localhost:6001/denominaciones?search=Txakoli' | jq -r '.data[0].id')
VAR_ID=$(curl -s 'http://localhost:6001/variedades?search=Hondarribi' | jq -r '.data[0].id')

# Vincular
curl -X POST "http://localhost:6001/denominaciones/$DO_ID/variedades" \
  -H "Content-Type: application/json" \
  -d "{\"variedad_id\": \"$VAR_ID\"}"
```

---

### Testing

```bash
# Test manual de endpoints
node scripts/test-do-endpoints.js

# Output esperado:
# 🧪 Testing DO endpoints...
# 1️⃣ GET /denominaciones
#    ✅ 10 denominaciones encontradas
# 2️⃣ GET /variedades
#    ✅ 14 variedades encontradas
# 3️⃣ GET /tipos-vino
#    ✅ 14 tipos de vino encontrados
# ✅ Todos los tests pasaron exitosamente!
```

---

### Extensión: Agregar Campo a DO

```javascript
// 1. Actualizar modelo
// app/models/DenominacionOrigen.js
{
  // ...campos existentes
  website_oficial: {
    type: DataTypes.STRING(255),
    allowNull: true,
  }
}

// 2. Sincronizar base de datos
node init-db.js

// 3. Actualizar controller
// app/controllers/denominacionOrigenController.js
// (No requiere cambios, acepta campos dinámicamente)

// 4. Actualizar frontend (opcional)
// public/js/list-winery.js
// Agregar campo en render de cards
```

---

## Extensibilidad

### Fase 2: Implementar Regulaciones

```javascript
// app/models/RegulacionDo.js
const RegulacionDo = sequelize.define('RegulacionDo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'denominaciones_origen', key: 'id' }
  },
  rendimiento_max_kg_ha: DataTypes.INTEGER,
  densidad_plantacion_min: DataTypes.INTEGER,
  densidad_plantacion_max: DataTypes.INTEGER,
  sistema_conduccion: DataTypes.STRING,
  metodo_elaboracion: DataTypes.TEXT,
  tiempos_crianza_json: DataTypes.JSONB,
  fecha_vigencia: DataTypes.DATE,
  activo: DataTypes.BOOLEAN
}, {
  underscored: true,
  tableName: 'regulaciones_do',
  timestamps: false,
});

// Asociación en models/index.js
DenominacionOrigen.hasMany(RegulacionDo, {
  foreignKey: 'do_id',
  as: 'regulaciones'
});
```

---

### Fase 3: Implementar GeoData con PostGIS

```sql
-- Habilitar extensión PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Crear tabla con geometría
CREATE TABLE do_geografia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  do_id UUID REFERENCES denominaciones_origen(id),
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  altitud INTEGER,
  geom GEOMETRY(POLYGON, 4326)
);

-- Índice espacial
CREATE INDEX idx_do_geo_geom ON do_geografia USING GIST(geom);

-- Query: DOs a 50km de Barcelona
SELECT d.nombre, ST_Distance(g.geom, ST_Point(2.1734, 41.3851)) as distancia_m
FROM denominaciones_origen d
JOIN do_geografia g ON g.do_id = d.id
WHERE ST_DWithin(g.geom, ST_Point(2.1734, 41.3851)::geography, 50000)
ORDER BY distancia_m;
```

---

### Integración con Blockchain

```javascript
// Al crear una DO, registrar en blockchain
async function createDOWithBlockchain(doData) {
  // 1. Crear DO en PostgreSQL
  const do_ = await DenominacionOrigen.create(doData);
  
  // 2. Registrar hash en blockchain
  const txData = {
    type: 'DO_REGISTRATION',
    doId: do_.id,
    nombre: do_.nombre,
    tipo: do_.tipo,
    timestamp: Date.now()
  };
  
  const tx = await blockchainClient.createTransaction(txData);
  
  // 3. Actualizar DO con txHash
  await do_.update({ blockchain_tx_hash: tx.hash });
  
  return do_;
}
```

---

### Analytics Dashboard (Futuro)

```javascript
// Endpoint: GET /analytics/dos-stats
async function getDOStats() {
  return {
    total_dos: await DenominacionOrigen.count(),
    total_variedades: await Variedad.count(),
    total_bodegas_certificadas: await DoBodega.count({
      distinct: true,
      col: 'bodega_id'
    }),
    por_pais: await DenominacionOrigen.findAll({
      attributes: [
        'pais',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['pais'],
      order: [[sequelize.literal('count'), 'DESC']]
    }),
    top_variedades: await sequelize.query(`
      SELECT v.nombre, COUNT(dv.do_id) as num_dos
      FROM variedades v
      JOIN do_variedades dv ON dv.variedad_id = v.id
      GROUP BY v.id, v.nombre
      ORDER BY num_dos DESC
      LIMIT 10
    `)
  };
}
```

---

---

## Implementacion (completada) ✅

### 1. Modelos Sequelize
**Ubicación:** `app/models/`

- ✅ `DenominacionOrigen.js` - Tabla principal de DOs
- ✅ `Variedad.js` - Catálogo de variedades
- ✅ `TipoVino.js` - Catálogo de tipos de vino
- ✅ `DoVariedad.js` - Tabla puente DO-Variedades
- ✅ `DoTipoVino.js` - Tabla puente DO-Tipos
- ✅ `DoBodega.js` - Tabla puente DO-Bodegas
- 🚧 `RegulacionDo.js` - Regulaciones (TODO Fase 2)
- 🚧 `DoClima.js` - Datos climáticos (TODO Fase 3)
- 🚧 `DoGeografia.js` - Datos geográficos (TODO Fase 3)

### 2. Asociaciones
**Ubicación:** `app/models/index.js`

```javascript
// N:N - DO <-> Variedades
DenominacionOrigen.belongsToMany(Variedad, {
  through: 'do_variedades',
  foreignKey: 'do_id',
  otherKey: 'variedad_id',
  as: 'variedades'
});

Variedad.belongsToMany(DenominacionOrigen, {
  through: 'do_variedades',
  foreignKey: 'variedad_id',
  otherKey: 'do_id',
  as: 'denominaciones'
});

// N:N - DO <-> Tipos de Vino
DenominacionOrigen.belongsToMany(TipoVino, {
  through: 'do_tipos_vino',
  foreignKey: 'do_id',
  otherKey: 'tipo_vino_id',
  as: 'tipos_vino'
});

TipoVino.belongsToMany(DenominacionOrigen, {
  through: 'do_tipos_vino',
  foreignKey: 'tipo_vino_id',
  otherKey: 'do_id',
  as: 'denominaciones'
});

// N:N - DO <-> Bodegas (User)
DenominacionOrigen.belongsToMany(User, {
  through: 'do_bodegas',
  foreignKey: 'do_id',
  otherKey: 'bodega_id',
  as: 'bodegas'
});

User.belongsToMany(DenominacionOrigen, {
  through: 'do_bodegas',
  foreignKey: 'bodega_id',
  otherKey: 'do_id',
  as: 'denominaciones'
});
```

### 3. Controllers
**Ubicación:** `app/controllers/`

- ✅ `denominacionOrigenController.js` - CRUD completo + vincular relaciones
- ✅ `variedadController.js` - CRUD completo
- ✅ `tipoVinoController.js` - CRUD completo

### 4. Routes
**Ubicación:** `app/routes/`

- ✅ `denominacionOrigenRoutes.js` - Endpoints de DOs
- ✅ `variedadRoutes.js` - Endpoints de variedades
- ✅ `tipoVinoRoutes.js` - Endpoints de tipos

**Montaje en server.js:**
```javascript
app.use('/denominaciones', denominacionOrigenRoutes);
app.use('/variedades', variedadRoutes);
app.use('/tipos-vino', tipoVinoRoutes);
```

### 5. Frontend Integration
**Ubicación:** `public/js/list-winery.js`

- ✅ `populateFilterOptions()` - Carga dinámica de filtros
- ✅ `loadDenominaciones()` - Fetch DOs
- ✅ `loadVariedades()` - Fetch variedades
- ✅ `loadTiposVino()` - Fetch tipos de vino
- ✅ Cache de labels (`badgeLabels`)
- ✅ `getBadgeLabel()` mejorado

### 6. Seed Data
**Ubicación:** `scripts/seed-do.js`

Ejecutar: `node scripts/seed-do.js`

**Datos incluidos:**
- 10 denominaciones españolas (Rioja, Ribera del Duero, Priorat, Rías Baixas, etc.)
- 14 variedades (Tempranillo, Garnacha, Albariño, Verdejo, Mencía, etc.)
- 14 tipos de vino (Tinto, Crianza, Reserva, Gran Reserva, Espumoso, etc.)

### 7. Tests
**Ubicación:** `scripts/test-do-endpoints.js`

Ejecutar: `node scripts/test-do-endpoints.js`

Verifica:
- GET /denominaciones
- GET /variedades
- GET /tipos-vino
- GET /denominaciones/:id

---

## Notas de Compatibilidad

### Reutilización de User Model
- Se mantiene `User` como fuente de verdad para bodegas
- No se duplica información de bodega en otro modelo
- Compatibilidad total con sistema de autenticación OAuth2 existente
- Badges en `User.badges` permiten filtrado por DO/variedad/tipo

### Validaciones
- Nombres de DO, variedades y tipos deben ser únicos
- UUIDs generados automáticamente con `DataTypes.UUIDV4`
- Foreign keys validadas por Sequelize
- Índices únicos en tablas puente para evitar duplicados

### PostgreSQL Específico
- Uso de UUIDs nativos de PostgreSQL
- JSONB disponible para campos JSON (regulaciones)
- PostGIS opcional para datos geográficos (Fase 3)
- Transacciones ACID garantizadas

---

## Mejores Prácticas

### Naming Conventions
```javascript
// Tablas: snake_case plural
denominaciones_origen
do_variedades

// Modelos: PascalCase singular
DenominacionOrigen
DoVariedad

// Campos: snake_case con sufijos de unidad
superficie_vinedo_ha (hectáreas)
produccion_anual_hl (hectolitros)
rendimiento_max_kg_ha (kg/hectárea)
```

### Queries Eficientes
```javascript
// ❌ BAD: N+1 queries
const dos = await DenominacionOrigen.findAll();
for (const do_ of dos) {
  const variedades = await do_.getVariedades(); // Query por cada DO
}

// ✅ GOOD: Eager loading
const dos = await DenominacionOrigen.findAll({
  include: [{ model: Variedad, as: 'variedades' }]
});
```

### Índices
```javascript
// Definir índices en modelos para queries frecuentes
DenominacionOrigen.addIndex(['tipo']);
DenominacionOrigen.addIndex(['pais', 'region']);
DenominacionOrigen.addIndex(['clima']);
```

### Manejo de Errores
```javascript
try {
  const do_ = await DenominacionOrigen.create(data);
  return res.status(201).json({ success: true, data: do_ });
} catch (error) {
  console.error('[DO] Error:', error);
  
  // Violación de unique constraint
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Ya existe una DO con ese nombre'
    });
  }
  
  // Error genérico
  return res.status(500).json({
    success: false,
    error: 'Error al crear DO',
    details: error.message
  });
}
```

---

## Troubleshooting

### Error: "invalid input syntax for type uuid"
**Causa:** Intentar usar string como UUID en lugar de UUID válido.

**Solución:**
```javascript
// ❌ Incorrecto
await DenominacionOrigen.findByPk('rioja');

// ✅ Correcto
await DenominacionOrigen.findOne({ where: { nombre: 'Rioja' } });
```

---

### Error: "relation does not exist"
**Causa:** Tablas no sincronizadas en base de datos.

**Solución:**
```bash
node init-db.js
```

---

### Frontend: Filtros vacíos
**Causa:** Endpoints no retornan datos o frontend no carga opciones.

**Debug:**
```javascript
// Verificar en consola del navegador
console.log(await fetch('/denominaciones').then(r => r.json()));
console.log(await fetch('/variedades').then(r => r.json()));
```

**Verificar servidor:**
```bash
node scripts/test-do-endpoints.js
```

---

### Badges no se muestran correctamente
**Causa:** Cache de labels no poblado.

**Solución:**
```javascript
// Asegurar que populateFilterOptions() se ejecute antes de render
await this.populateFilterOptions();
this.loadFiltersFromURL();
```

---

## Performance Considerations

### Paginación
```javascript
// Siempre usar paginación en listados grandes
const { page = 1, limit = 20 } = req.query;
const offset = (page - 1) * limit;

const { count, rows } = await DenominacionOrigen.findAndCountAll({
  limit: parseInt(limit),
  offset,
  order: [['nombre', 'ASC']]
});
```

### Caching (Futuro)
```javascript
// Redis cache para catálogos estáticos
const cachedVariedades = await redis.get('variedades:all');
if (cachedVariedades) {
  return JSON.parse(cachedVariedades);
}

const variedades = await Variedad.findAll();
await redis.setex('variedades:all', 3600, JSON.stringify(variedades));
return variedades;
```

### Database Connection Pooling
```javascript
// config/database.js
const sequelize = new Sequelize(DATABASE_URL, {
  pool: {
    max: 10,      // Máximo 10 conexiones
    min: 2,       // Mínimo 2 conexiones
    acquire: 30000,
    idle: 10000
  },
  logging: false  // Desactivar logs SQL en producción
});
```

---

## Referencias

### Documentación Oficial
- [Sequelize Associations](https://sequelize.org/docs/v6/core-concepts/assocs/)
- [PostgreSQL UUID](https://www.postgresql.org/docs/current/datatype-uuid.html)
- [PostGIS](https://postgis.net/documentation/)
- [Express REST API Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

### Consejos Reguladores (España)
- [DOCa Rioja](https://www.riojawine.com/)
- [DO Ribera del Duero](https://www.riberadelduero.es/)
- [DO Rías Baixas](https://doriasbaixas.com/)

### Normativa
- [Ley 24/2003 de la Viña y del Vino (España)](https://www.boe.es/buscar/act.php?id=BOE-A-2003-13864)
- [Reglamento UE 1308/2013 (OCM Vitivinícola)](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32013R1308)

---

## Changelog

### Version 1.0.0 (12/02/2026)
- ✅ Implementación completa de Fase 1 (núcleo operativo)
- ✅ 9 modelos Sequelize con asociaciones
- ✅ 3 controllers con CRUD completo
- ✅ 3 routers montados en Express
- ✅ Frontend con carga dinámica de filtros
- ✅ Seed inicial con 10 DOs, 14 variedades, 14 tipos
- ✅ Tests de endpoints
- ✅ Documentación completa

### Version 0.1.0 (12/02/2026)
- 📝 Diseño inicial del modelo de datos
- 📝 Definición de arquitectura
- 📝 Planificación de fases

---

## Próximos Pasos

### Fase 2: Regulaciones (Estimado: 3-5 días)
- [ ] Implementar modelo `RegulacionDo`
- [ ] Controller y routes para regulaciones
- [ ] Seed de regulaciones para DOs principales
- [ ] Validación de tiempos de crianza
- [ ] Frontend: filtro por tipo de crianza

### Fase 3: Clima y Geografía (Estimado: 5-7 días)
- [ ] Habilitar extensión PostGIS
- [ ] Implementar modelos `DoClima` y `DoGeografia`
- [ ] Importar datos climáticos de APIs públicas
- [ ] Importar polígonos de DOs
- [ ] Mapa interactivo en frontend (Leaflet/MapLibre GL JS)
- [ ] Búsqueda por radio geográfico

### Mejoras Continuas
- [ ] Autenticación en endpoints (JWT/OAuth)
- [ ] Rate limiting por endpoint
- [ ] Versionado de API (v1, v2)
- [ ] Swagger/OpenAPI documentation
- [ ] Tests unitarios (Jest)
- [ ] Tests de integración (Supertest)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitorización (Prometheus + Grafana)

---

## Contacto y Contribución

**Equipo:** BlocksWine Development Team  
**Repositorio:** (privado)  
**Email:** dev@blockswine.com

Para contribuir:
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Add nueva funcionalidad'`
4. Push a rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

---

**Fin del documento**  
Última actualización: 12/02/2026 12:30 UTC
- 14 variedades de uva (Tempranillo, Garnacha, Albariño, etc.)
- 14 tipos de vino (Tinto, Crianza, Reserva, etc.)

---

## Notas de compatibilidad
- Se mantiene `User` como fuente de verdad para bodegas.
- Evitar duplicar informacion de bodega en otro modelo.
- Mantener validaciones consistentes con el esquema actual.
