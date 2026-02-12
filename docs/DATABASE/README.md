# Documentación - Sistema de Denominaciones de Origen

**BlocksWine Development Team**  
**Última actualización:** 12/02/2026

---

## 📚 Índice de Documentación

Esta carpeta contiene la documentación completa del sistema de gestión de Denominaciones de Origen (DO) integrado con el sistema BlocksWine.

### Documentos Principales

#### 1. [ModeloDatos-ampliado.md](./ModeloDatos-ampliado.md) 📘
**Documento Maestro** - Especificación completa del modelo de datos

**Contenido:**
- Arquitectura del sistema
- Schema detallado de base de datos (9 tablas)
- Asociaciones y relaciones N:N
- API Reference completo
- Ejemplos de uso con código
- Consultas SQL avanzadas
- Guía de desarrollo
- Extensibilidad (Fase 2 y 3)
- Mejores prácticas
- Troubleshooting

**Cuándo leerlo:** Punto de partida para entender el sistema completo.

---

#### 2. [QUICKSTART-DO.md](./QUICKSTART-DO.md) 🚀
**Guía de Inicio Rápido** - Setup en 5 minutos

**Contenido:**
- Comandos de instalación
- Configuración de base de datos
- Ejecución de seed
- Prueba de endpoints
- Ejemplos prácticos con curl
- Solución rápida de problemas

**Cuándo leerlo:** Primer día con el proyecto, necesitas tener todo funcionando ya.

---

#### 3. [API-REFERENCE-DO.md](./API-REFERENCE-DO.md) 🔌
**Referencia de API** - Documentación estilo OpenAPI

**Contenido:**
- Especificación completa de endpoints
- Query parameters detallados
- Ejemplos de request/response
- Códigos de error HTTP
- Estructura de paginación
- Filtros y búsqueda

**Cuándo leerlo:** Desarrollo de frontend, integración con API, debugging.

---

#### 4. [ARCHITECTURE-DO.md](./ARCHITECTURE-DO.md) 🏗️
**Arquitectura del Sistema** - Diagramas y flujos

**Contenido:**
- Diagrama de arquitectura ASCII
- Flujo de datos frontend-backend
- ERD (Entity Relationship Diagram)
- Stack tecnológico completo
- Deployment architecture (futuro)

**Cuándo leerlo:** Onboarding de nuevos desarrolladores, diseño de features.

---

## 🎯 Guía de Lectura por Rol

### Desarrollador Frontend
1. **QUICKSTART-DO.md** - Setup rápido
2. **API-REFERENCE-DO.md** - Endpoints disponibles
3. **ModeloDatos-ampliado.md** > "Frontend Integration" - Integración JS

### Desarrollador Backend
1. **ModeloDatos-ampliado.md** - Modelo completo
2. **ARCHITECTURE-DO.md** - Arquitectura backend
3. **API-REFERENCE-DO.md** - Especificación de endpoints

### DBA / DevOps
1. **ModeloDatos-ampliado.md** > "Modelo de Datos" - Schema completo
2. **ModeloDatos-ampliado.md** > "Consultas Avanzadas" - Optimización
3. **ARCHITECTURE-DO.md** > "Deployment" - Infraestructura

### Product Manager / QA
1. **QUICKSTART-DO.md** - Setup de entorno de pruebas
2. **API-REFERENCE-DO.md** - Testing de endpoints
3. **ModeloDatos-ampliado.md** > "Ejemplos de Uso" - Casos de uso

---

## 📂 Estructura de Archivos

```
docs/DATABASE/
├── README.md                       # Este archivo (índice)
├── ModeloDatos-ampliado.md         # Documento maestro
├── QUICKSTART-DO.md                # Guía rápida
├── API-REFERENCE-DO.md             # Referencia de API
└── ARCHITECTURE-DO.md              # Diagramas de arquitectura
```

---

## 🚀 Quick Links

### Comandos Esenciales

```bash
# Setup completo
node init-db.js && node scripts/seed-do.js

# Test endpoints
node scripts/test-do-endpoints.js

# Iniciar servidor
npm run dev

# Abrir frontend
open http://localhost:6001/list-winery.html
```

### Endpoints Base

```bash
GET  /denominaciones          # Listar DOs
GET  /denominaciones/:id      # Detalle DO
POST /denominaciones          # Crear DO
GET  /variedades              # Listar variedades
GET  /tipos-vino              # Listar tipos
```

### Archivos Clave del Código

```
app/models/
├── DenominacionOrigen.js     # Modelo principal
├── Variedad.js               # Variedades de uva
├── TipoVino.js               # Tipos de vino
└── index.js                  # Asociaciones

app/controllers/
├── denominacionOrigenController.js
├── variedadController.js
└── tipoVinoController.js

app/routes/
├── denominacionOrigenRoutes.js
├── variedadRoutes.js
└── tipoVinoRoutes.js

public/
├── list-winery.html          # Frontend
└── js/list-winery.js         # Lógica de filtros

scripts/
├── seed-do.js                # Seed de datos
└── test-do-endpoints.js      # Tests
```

---

## 📊 Estado de Implementación

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 1** | ✅ Completa | Núcleo operativo (DOs, variedades, tipos) |
| **Fase 2** | 🚧 TODO | Regulaciones (rendimientos, crianzas) |
| **Fase 3** | 🚧 TODO | Clima y geografía (PostGIS) |

### Fase 1 (Completa) ✅

**Modelos:**
- ✅ DenominacionOrigen
- ✅ Variedad
- ✅ TipoVino
- ✅ DoVariedad (junction)
- ✅ DoTipoVino (junction)
- ✅ DoBodega (junction)

**API:**
- ✅ 8 endpoints DOs
- ✅ 5 endpoints variedades
- ✅ 5 endpoints tipos de vino
- ✅ Filtros y paginación
- ✅ Eager loading

**Frontend:**
- ✅ Carga dinámica de filtros
- ✅ Cache de labels
- ✅ Integración con badges

**Data:**
- ✅ 10 DOs españolas
- ✅ 14 variedades
- ✅ 14 tipos de vino

---

## 🔮 Roadmap

### Fase 2: Regulaciones (Q2 2026)
- [ ] Modelo RegulacionDo
- [ ] Endpoint POST /denominaciones/:id/regulaciones
- [ ] Validación de tiempos de crianza
- [ ] Seed de regulaciones para DOs principales
- [ ] Frontend: filtro por tipo de crianza

### Fase 3: Clima y Geografía (Q3 2026)
- [ ] Habilitar PostGIS
- [ ] Modelos DoClima, DoGeografia
- [ ] Importar datos climáticos (APIs públicas)
- [ ] Importar polígonos de DOs (shapefiles)
- [ ] Mapa interactivo (Leaflet/MapLibre)
- [ ] Búsqueda por radio geográfico

### Mejoras Continuas
- [ ] Autenticación JWT en endpoints
- [ ] Rate limiting
- [ ] Versionado de API (v1, v2)
- [ ] Swagger/OpenAPI spec
- [ ] Tests unitarios (Jest)
- [ ] Tests de integración
- [ ] CI/CD pipeline
- [ ] Monitorización (Prometheus)

---

## 🐛 Troubleshooting

### Issues Comunes

**"Cannot connect to database"**
```bash
# Verificar PostgreSQL corriendo
sudo service postgresql status

# Verificar .env
cat .env | grep DATABASE_URL
```

**"Table does not exist"**
```bash
node init-db.js
```

**"No data in lists"**
```bash
node scripts/seed-do.js
```

**Filtros vacíos en frontend**
```bash
# Verificar endpoints funcionan
curl http://localhost:6001/denominaciones

# Ver consola del navegador (F12)
```

Ver [ModeloDatos-ampliado.md > Troubleshooting](./ModeloDatos-ampliado.md#troubleshooting) para más detalles.

---

## 📖 Conceptos Clave

### Denominación de Origen (DO)
Indicación geográfica protegida que certifica que un vino proviene de una región específica y cumple con estándares de calidad y producción definidos.

**Tipos en España:**
- **DO** (Denominación de Origen)
- **DOCa** (Denominación de Origen Calificada) - más estricta
- **DOQ** (Denominación de Origen Cualificada) - equivalente catalán de DOCa
- **Vino de Pago** - fincas individuales de calidad excepcional

### Variedades
Cultivares de uva autorizados para producción dentro de una DO.

**Colores:**
- Tinta (uva negra)
- Blanca (uva verde)
- Rosada

### Tipos de Vino
Estilos o categorías de vino permitidos por la DO, a menudo basados en tiempos de crianza.

**Ejemplos:**
- Joven (sin crianza)
- Crianza (mínimo 24 meses)
- Reserva (mínimo 36 meses)
- Gran Reserva (mínimo 60 meses)

---

## 🤝 Contribución

### Workflow
1. Fork del repositorio
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'Add nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Estándares de Código
- ES6+ para JavaScript
- Sequelize para ORM
- Naming: snake_case (DB), camelCase (JS), PascalCase (clases)
- Documentar endpoints nuevos en API-REFERENCE-DO.md

### Testing
```bash
# Antes de PR, ejecutar tests
node scripts/test-do-endpoints.js

# Verificar no hay errores de linting
npm run lint
```

---

## 📞 Contacto

**Email:** dev@blockswine.com  
**Repositorio:** (privado)  
**Documentación:** `/docs/DATABASE/`

---

## 📜 Licencia

Proyecto privado - BlocksWine © 2026

---

## 📝 Changelog

### v1.0.0 (12/02/2026)
- ✅ Implementación completa Fase 1
- ✅ 9 modelos Sequelize con asociaciones
- ✅ 3 controllers, 3 routers
- ✅ Frontend con filtros dinámicos
- ✅ Seed de datos iniciales
- ✅ Documentación completa (4 documentos)

---

**🍷 Happy Coding!**
