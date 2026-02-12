# Arquitectura del Sistema - Denominaciones de Origen

**BlocksWine Development Team**  
**Fecha:** 12/02/2026

---

## Diagrama de Arquitectura

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  list-winery.html                                                    │    │
│  │  ├─ Multi-select filters (DO, Uva, Estilo, Medalla)                 │    │
│  │  ├─ Search bar                                                       │    │
│  │  ├─ Winery cards grid                                                │    │
│  │  └─ Pagination                                                       │    │
│  └──────────────────────────┬───────────────────────────────────────────┘    │
│                             │                                                 │
│  ┌──────────────────────────▼──────────────────────────────────────────┐    │
│  │  list-winery.js (ES6 Module)                                        │    │
│  │  ├─ WineryListManager class                                          │    │
│  │  ├─ populateFilterOptions() ──────┐                                 │    │
│  │  ├─ loadDenominaciones()          │                                 │    │
│  │  ├─ loadVariedades()              │ Carga dinámica al init()        │    │
│  │  ├─ loadTiposVino()               │                                 │    │
│  │  ├─ badgeLabels cache         ◄───┘                                 │    │
│  │  └─ filterAndSort()                                                  │    │
│  └──────────────────────────┬───────────────────────────────────────────┘    │
│                             │                                                 │
└─────────────────────────────┼─────────────────────────────────────────────────┘
                              │ fetch() HTTP/JSON
                              │
┌─────────────────────────────▼─────────────────────────────────────────────────┐
│                                BACKEND LAYER                                   │
│                                                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │  server.js (Express 4.22.0)                                           │   │
│  │  ├─ app.use('/denominaciones', denominacionOrigenRoutes)             │   │
│  │  ├─ app.use('/variedades', variedadRoutes)                           │   │
│  │  └─ app.use('/tipos-vino', tipoVinoRoutes)                           │   │
│  └────────────────────────────┬──────────────────────────────────────────┘   │
│                                │                                              │
│  ┌────────────────────────────▼──────────────────────────────────────────┐   │
│  │  ROUTES LAYER                                                         │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │ denominacionOrigenRoutes.js                                  │    │   │
│  │  │ ├─ GET    /denominaciones                                    │    │   │
│  │  │ ├─ GET    /denominaciones/:id                                │    │   │
│  │  │ ├─ POST   /denominaciones                                    │    │   │
│  │  │ ├─ PUT    /denominaciones/:id                                │    │   │
│  │  │ ├─ DELETE /denominaciones/:id                                │    │   │
│  │  │ ├─ POST   /denominaciones/:id/variedades                     │    │   │
│  │  │ ├─ POST   /denominaciones/:id/tipos                          │    │   │
│  │  │ └─ POST   /denominaciones/:id/bodegas                        │    │   │
│  │  └──────────────────────────┬───────────────────────────────────┘    │   │
│  │  ┌──────────────────────────▼───────────────────────────────────┐    │   │
│  │  │ variedadRoutes.js                                            │    │   │
│  │  │ ├─ GET    /variedades                                        │    │   │
│  │  │ ├─ GET    /variedades/:id                                    │    │   │
│  │  │ ├─ POST   /variedades                                        │    │   │
│  │  │ ├─ PUT    /variedades/:id                                    │    │   │
│  │  │ └─ DELETE /variedades/:id                                    │    │   │
│  │  └──────────────────────────┬───────────────────────────────────┘    │   │
│  │  ┌──────────────────────────▼───────────────────────────────────┐    │   │
│  │  │ tipoVinoRoutes.js                                            │    │   │
│  │  │ ├─ GET    /tipos-vino                                        │    │   │
│  │  │ ├─ GET    /tipos-vino/:id                                    │    │   │
│  │  │ ├─ POST   /tipos-vino                                        │    │   │
│  │  │ ├─ PUT    /tipos-vino/:id                                    │    │   │
│  │  │ └─ DELETE /tipos-vino/:id                                    │    │   │
│  │  └──────────────────────────┬───────────────────────────────────┘    │   │
│  └────────────────────────────┬┘                                         │   │
│                                │                                              │
│  ┌────────────────────────────▼──────────────────────────────────────────┐   │
│  │  CONTROLLER LAYER                                                     │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ denominacionOrigenController.js                                │  │   │
│  │  │ ├─ createDO(req, res)                                         │  │   │
│  │  │ ├─ getDOs(req, res)         ──► Filters, pagination, includes│  │   │
│  │  │ ├─ getDOById(req, res)      ──► Eager load all relations     │  │   │
│  │  │ ├─ updateDO(req, res)                                         │  │   │
│  │  │ ├─ deleteDO(req, res)                                         │  │   │
│  │  │ ├─ addVariedadToDO(req, res)                                  │  │   │
│  │  │ ├─ addTipoToDO(req, res)                                      │  │   │
│  │  │ └─ addBodegaToDO(req, res)                                    │  │   │
│  │  └────────────────────────┬───────────────────────────────────────┘  │   │
│  │  ┌────────────────────────▼───────────────────────────────────────┐  │   │
│  │  │ variedadController.js                                          │  │   │
│  │  │ ├─ createVariedad(req, res)                                   │  │   │
│  │  │ ├─ getVariedades(req, res)                                    │  │   │
│  │  │ ├─ getVariedadById(req, res)                                  │  │   │
│  │  │ ├─ updateVariedad(req, res)                                   │  │   │
│  │  │ └─ deleteVariedad(req, res)                                   │  │   │
│  │  └────────────────────────┬───────────────────────────────────────┘  │   │
│  │  ┌────────────────────────▼───────────────────────────────────────┐  │   │
│  │  │ tipoVinoController.js                                          │  │   │
│  │  │ ├─ createTipoVino(req, res)                                   │  │   │
│  │  │ ├─ getTiposVino(req, res)                                     │  │   │
│  │  │ ├─ getTipoVinoById(req, res)                                  │  │   │
│  │  │ ├─ updateTipoVino(req, res)                                   │  │   │
│  │  │ └─ deleteTipoVino(req, res)                                   │  │   │
│  │  └────────────────────────┬───────────────────────────────────────┘  │   │
│  └────────────────────────────┘                                          │   │
│                                │                                              │
│  ┌────────────────────────────▼──────────────────────────────────────────┐   │
│  │  ORM LAYER (Sequelize 6.37.7)                                         │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ app/models/index.js                                            │  │   │
│  │  │ ├─ DenominacionOrigen model                                   │  │   │
│  │  │ ├─ Variedad model                                              │  │   │
│  │  │ ├─ TipoVino model                                              │  │   │
│  │  │ ├─ DoVariedad model (junction)                                 │  │   │
│  │  │ ├─ DoTipoVino model (junction)                                 │  │   │
│  │  │ ├─ DoBodega model (junction)                                   │  │   │
│  │  │ └─ Associations:                                               │  │   │
│  │  │    ├─ DenominacionOrigen.belongsToMany(Variedad)              │  │   │
│  │  │    ├─ DenominacionOrigen.belongsToMany(TipoVino)              │  │   │
│  │  │    └─ DenominacionOrigen.belongsToMany(User)                  │  │   │
│  │  └────────────────────────┬───────────────────────────────────────┘  │   │
│  └────────────────────────────┘                                          │   │
│                                │                                              │
└────────────────────────────────┼──────────────────────────────────────────────┘
                                 │ SQL Queries
                                 │
┌────────────────────────────────▼──────────────────────────────────────────────┐
│                           DATABASE LAYER                                       │
│                                                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 8.18.0                                                    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │  Schema: public                                                 │ │   │
│  │  │                                                                 │ │   │
│  │  │  CORE TABLES:                                                  │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ denominaciones_origen                                    │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ nombre (VARCHAR UNIQUE)                              │ │ │   │
│  │  │  │ ├─ tipo (VARCHAR)                                        │ │ │   │
│  │  │  │ ├─ pais, region, subzona                                │ │ │   │
│  │  │  │ ├─ superficie_vinedo_ha, produccion_anual_hl            │ │ │   │
│  │  │  │ ├─ altitud_min, altitud_max                             │ │ │   │
│  │  │  │ ├─ clima, suelos_predominantes                          │ │ │   │
│  │  │  │ └─ descripcion_terroir, normativa_url                   │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ variedades                                               │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ nombre (VARCHAR UNIQUE)                              │ │ │   │
│  │  │  │ ├─ descripcion (TEXT)                                    │ │ │   │
│  │  │  │ └─ color (VARCHAR: tinta/blanca/rosada)                 │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ tipos_vino                                               │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ nombre (VARCHAR UNIQUE)                              │ │ │   │
│  │  │  │ └─ descripcion (TEXT)                                    │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  │  JUNCTION TABLES:                                              │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ do_variedades                                            │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ do_id (UUID, FK → denominaciones_origen.id)          │ │ │   │
│  │  │  │ └─ variedad_id (UUID, FK → variedades.id)               │ │ │   │
│  │  │  │ UNIQUE(do_id, variedad_id)                               │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ do_tipos_vino                                            │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ do_id (UUID, FK → denominaciones_origen.id)          │ │ │   │
│  │  │  │ └─ tipo_vino_id (UUID, FK → tipos_vino.id)              │ │ │   │
│  │  │  │ UNIQUE(do_id, tipo_vino_id)                              │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ do_bodegas                                               │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ do_id (UUID, FK → denominaciones_origen.id)          │ │ │   │
│  │  │  │ └─ bodega_id (STRING, FK → usuarios.id)                 │ │ │   │
│  │  │  │ UNIQUE(do_id, bodega_id)                                 │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  │  FUTURE (Fase 2 & 3):                                          │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ regulaciones_do                                          │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ do_id (UUID, FK)                                      │ │ │   │
│  │  │  │ ├─ rendimiento_max_kg_ha, densidad_plantacion           │ │ │   │
│  │  │  │ └─ tiempos_crianza_json (JSONB)                          │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ do_clima                                                 │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ do_id (UUID, FK)                                      │ │ │   │
│  │  │  │ └─ temp_media, precipitacion_anual, etc.                │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ do_geografia                                             │ │ │   │
│  │  │  │ ├─ id (UUID, PK)                                         │ │ │   │
│  │  │  │ ├─ do_id (UUID, FK)                                      │ │ │   │
│  │  │  │ ├─ lat, lng, altitud                                     │ │ │   │
│  │  │  │ └─ geom (GEOMETRY POLYGON) [PostGIS]                     │ │ │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                 │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                       │   │
│  │  INDEXES:                                                             │   │
│  │  ├─ idx_do_tipo ON denominaciones_origen(tipo)                      │   │
│  │  ├─ idx_do_pais_region ON denominaciones_origen(pais, region)       │   │
│  │  ├─ idx_do_nombre ON denominaciones_origen(nombre)                  │   │
│  │  ├─ idx_do_variedad_unique ON do_variedades(do_id, variedad_id)    │   │
│  │  └─ idx_do_tipo_unique ON do_tipos_vino(do_id, tipo_vino_id)       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos: Carga de Filtros

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Usuario abre list-winery.html                                            │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. DOMContentLoaded → new WineryListManager()                               │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. init() → populateFilterOptions()                                         │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Promise.all([                                                            │
│      fetch('/denominaciones'),                                              │
│      fetch('/variedades'),                                                  │
│      fetch('/tipos-vino')                                                   │
│    ])                                                                        │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. Backend: denominacionOrigenController.getDOs()                           │
│    - Query: SELECT * FROM denominaciones_origen ORDER BY nombre             │
│    - Return: { success: true, data: [...] }                                 │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. Backend: variedadController.getVariedades()                              │
│    - Query: SELECT * FROM variedades ORDER BY nombre                        │
│    - Return: { success: true, data: [...] }                                 │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. Backend: tipoVinoController.getTiposVino()                               │
│    - Query: SELECT * FROM tipos_vino ORDER BY nombre                        │
│    - Return: { success: true, data: [...] }                                 │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. Frontend: Mapear datos a formato de opciones                             │
│    denominaciones.map(do => ({                                               │
│      value: `do_${do.id}`,                                                   │
│      label: `${do.tipo} ${do.nombre}`                                        │
│    }))                                                                       │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 9. Frontend: populateSelect('doFilter', options)                            │
│    - Crear <option> elements                                                │
│    - Insertar en <select id="doFilter">                                     │
│    - Guardar labels en cache: badgeLabels['do_uuid'] = 'DOCa Rioja'         │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 10. Usuario ve filtros poblados dinámicamente                               │
│     ✓ DO: [DOCa Rioja, DO Ribera del Duero, ...]                            │
│     ✓ Uva: [Uva Tempranillo, Uva Garnacha, ...]                             │
│     ✓ Estilo: [Crianza, Reserva, Gran Reserva, ...]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagrama de Relaciones (ERD Simplificado)

```
┌──────────────────────────┐
│  denominaciones_origen   │
│ ────────────────────────│
│  id (UUID PK)            │◄──────┐
│  nombre (UNIQUE)         │       │
│  tipo                    │       │
│  pais, region            │       │
│  clima                   │       │
└────────────┬─────────────┘       │
             │                     │
             │ 1:N                 │ N:N
             │                     │
             ▼                     │
┌──────────────────────────┐       │
│  regulaciones_do         │       │
│ ────────────────────────│       │
│  id (UUID PK)            │       │
│  do_id (FK)              │       │
│  rendimiento_max_kg_ha   │       │
│  tiempos_crianza_json    │       │
└──────────────────────────┘       │
                                   │
             ┌─────────────────────┘
             │
             ▼
┌──────────────────────────┐       ┌──────────────────────────┐
│    do_variedades         │       │      variedades          │
│ ────────────────────────│       │ ────────────────────────│
│  id (UUID PK)            │       │  id (UUID PK)            │
│  do_id (FK)              ├──────►│  nombre (UNIQUE)         │
│  variedad_id (FK)        │       │  color                   │
│  UNIQUE(do_id, var_id)   │       │  descripcion             │
└──────────────────────────┘       └──────────────────────────┘


┌──────────────────────────┐       ┌──────────────────────────┐
│    do_tipos_vino         │       │      tipos_vino          │
│ ────────────────────────│       │ ────────────────────────│
│  id (UUID PK)            │       │  id (UUID PK)            │
│  do_id (FK)              ├──────►│  nombre (UNIQUE)         │
│  tipo_vino_id (FK)       │       │  descripcion             │
│  UNIQUE(do_id, tipo_id)  │       └──────────────────────────┘
└──────────────────────────┘


┌──────────────────────────┐       ┌──────────────────────────┐
│      do_bodegas          │       │      usuarios (User)     │
│ ────────────────────────│       │ ────────────────────────│
│  id (UUID PK)            │       │  id (STRING PK)          │
│  do_id (FK)              ├──────►│  name                    │
│  bodega_id (FK)          │       │  email                   │
│  UNIQUE(do_id, bod_id)   │       │  role = 'winery'         │
└──────────────────────────┘       │  badges []               │
                                   └──────────────────────────┘
```

---

## Stack Tecnológico Completo

```
┌───────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
├───────────────────────────────────────────────────────────────────┤
│  Language:  JavaScript ES6+ (Vanilla, no frameworks)             │
│  Module:    ES6 Modules (type="module")                          │
│  HTML:      HTML5                                                │
│  CSS:       CSS3 (Grid, Flexbox, Custom Properties)              │
│  Browser:   Chrome/Firefox/Safari (modern browsers)              │
└───────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP/JSON (fetch API)
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                         BACKEND                                   │
├───────────────────────────────────────────────────────────────────┤
│  Runtime:   Node.js 18+                                           │
│  Framework: Express 4.22.0                                        │
│  ORM:       Sequelize 6.37.7                                      │
│  Auth:      Passport.js + OAuth2 Google                           │
│  Middleware:                                                      │
│    - CORS                                                         │
│    - Helmet (security headers)                                    │
│    - express-session                                              │
│    - Rate Limiting (TODO)                                         │
└───────────────────────────────────────────────────────────────────┘
                               │
                               │ SQL (Sequelize ORM)
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                         DATABASE                                  │
├───────────────────────────────────────────────────────────────────┤
│  RDBMS:     PostgreSQL 8.18.0                                     │
│  Driver:    pg 8.13.0 + pg-hstore 2.3.4                           │
│  Extensions:                                                      │
│    - uuid-ossp (UUID generation)                                  │
│    - PostGIS (TODO Fase 3 - geographic data)                      │
│  Features:                                                        │
│    - ACID transactions                                            │
│    - Foreign keys + cascades                                      │
│    - Unique constraints                                           │
│    - JSONB (for regulaciones)                                     │
└───────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture (Futuro)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION                                      │
│                                                                              │
│  ┌───────────────┐         ┌───────────────┐         ┌──────────────────┐  │
│  │   Cloudflare  │────────►│  Nginx Proxy  │────────►│  Node.js App     │  │
│  │   (CDN + DDoS)│         │  (Load Bal.)  │         │  (PM2 Cluster)   │  │
│  └───────────────┘         └───────────────┘         └────────┬─────────┘  │
│                                                                │             │
│                                                                ▼             │
│                                                     ┌──────────────────┐     │
│                                                     │  PostgreSQL      │     │
│                                                     │  (Primary +      │     │
│                                                     │   Read Replicas) │     │
│                                                     └──────────────────┘     │
│                                                                              │
│  ┌───────────────┐         ┌───────────────┐                               │
│  │   Redis       │         │  Prometheus   │                               │
│  │   (Cache)     │         │  (Monitoring) │                               │
│  └───────────────┘         └───────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**Fin del documento de arquitectura**
