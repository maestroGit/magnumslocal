# API de Denominaciones de Origen - Quick Start

**BlocksWine Development Team**  
**Fecha:** 12/02/2026

---

## Setup en 5 Minutos

```bash
# 1. Clonar y dependencias
cd magnumslocal
npm install

# 2. Configurar DB
# Editar .env con tus credenciales PostgreSQL
nano .env

# 3. Sincronizar DB
node init-db.js

# 4. Cargar datos iniciales
node scripts/seed-do.js

# 5. Iniciar servidor
npm run dev

# 6. Probar endpoints
node scripts/test-do-endpoints.js

# 7. Abrir frontend
open http://localhost:6001/list-winery.html
```

---

## Endpoints Principales

### Listar Denominaciones
```bash
curl http://localhost:6001/denominaciones
```

### Buscar por país
```bash
curl "http://localhost:6001/denominaciones?pais=España"
```

### Buscar por nombre
```bash
curl "http://localhost:6001/denominaciones?search=Rioja"
```

### Detalle completo (con variedades, tipos, bodegas)
```bash
curl "http://localhost:6001/denominaciones/UUID-AQUI"
```

---

## Crear Nueva DO

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

## Vincular Variedad a DO

```bash
# 1. Obtener IDs
curl http://localhost:6001/denominaciones | jq '.data[0].id'
curl http://localhost:6001/variedades | jq '.data[0].id'

# 2. Vincular
curl -X POST http://localhost:6001/denominaciones/DO_ID/variedades \
  -H "Content-Type: application/json" \
  -d '{"variedad_id": "VAR_ID"}'
```

---

## Frontend

Abrir [http://localhost:6001/list-winery.html](http://localhost:6001/list-winery.html)

Los filtros de DO, Uva y Estilo se cargan automáticamente desde la base de datos.

---

## Datos Incluidos en Seed

### 10 Denominaciones Españolas
- Rioja (DOCa)
- Ribera del Duero (DO)
- Priorat (DOQ)
- Rías Baixas (DO)
- Ribeira Sacra (DO)
- Penedès (DO)
- Rueda (DO)
- Ribeiro (DO)
- Jerez-Xérès-Sherry (DO)
- Toro (DO)

### 14 Variedades
Tempranillo, Garnacha, Albariño, Verdejo, Mencía, Cabernet Sauvignon, Merlot, Syrah, Chardonnay, Sauvignon Blanc, Monastrell, Cariñena, Godello, Palomino

### 14 Tipos de Vino
Tinto, Tinto Joven, Crianza, Reserva, Gran Reserva, Blanco, Rosado, Espumoso, Cava, Dulce, Fortificado, Generoso, Natural, Naranja

---

## Estructura de Respuesta

Todos los endpoints retornan JSON con este formato:

### Éxito
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Mensaje de error",
  "details": "Stack trace en dev"
}
```

---

## Query Parameters

### GET /denominaciones
- `page` (number) - Página actual
- `limit` (number) - Resultados por página
- `tipo` (string) - DO, DOCa, DOQ, IGP
- `pais` (string) - España, Francia, Italia, etc.
- `region` (string) - Nombre de región
- `clima` (string) - Continental, Atlántico, Mediterráneo
- `search` (string) - Búsqueda en nombre y región
- `includeVariedades` (boolean) - Incluir variedades autorizadas
- `includeTipos` (boolean) - Incluir tipos de vino
- `includeBodegas` (boolean) - Incluir bodegas asociadas

### GET /variedades
- `color` (string) - tinta, blanca, rosada
- `includeDenominaciones` (boolean) - Incluir DOs que permiten esta variedad

### GET /tipos-vino
- `includeDenominaciones` (boolean) - Incluir DOs que permiten este tipo

---

## Troubleshooting

### "Cannot connect to database"
```bash
# Verificar PostgreSQL está corriendo
sudo service postgresql status

# Verificar credenciales en .env
cat .env | grep DATABASE
```

### "Table does not exist"
```bash
# Sincronizar base de datos
node init-db.js
```

### "No data returned"
```bash
# Ejecutar seed
node scripts/seed-do.js
```

### Filtros vacíos en frontend
```bash
# Verificar endpoints funcionan
curl http://localhost:6001/denominaciones
curl http://localhost:6001/variedades
curl http://localhost:6001/tipos-vino

# Verificar consola del navegador
# F12 > Console > ver errores
```

---

## Documentación Completa

Ver [ModeloDatos-ampliado.md](./ModeloDatos-ampliado.md) para:
- Arquitectura detallada
- Schema completo de base de datos
- Consultas avanzadas SQL
- Mejores prácticas
- Roadmap de Fases 2 y 3

---

## Contacto

**Email:** dev@blockswine.com  
**Docs:** `/docs/DATABASE/`  
**Tests:** `scripts/test-do-endpoints.js`
