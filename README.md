# MagnumLocal - Blockchain Wine System

> **Sistema blockchain completo para trazabilidad de vinos con red P2P, minado distribuido, gestión UTXO avanzada y soporte UPnP automático.** 

## 🏁 Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar UPnP (opcional - habilitado por defecto)
# Edita .env: ENABLE_UPNP=true

# 3. Iniciar servidor blockchain
npm start:local

# 4. Acceder al dashboard
http://localhost:3000
```

## 📋 Índice

- [🏗️ Arquitectura](#️-arquitectura)
- [🔓 Soporte UPnP](#-soporte-upnp)
- [🎮 Gestión de Nodos](#-gestión-de-nodos)
- [🔧 API Endpoints](#-api-endpoints)
- [📚 Documentación](#-documentación)
- [🛠️ Scripts Disponibles](#️-scripts-disponibles)

---

## 🏗️ Arquitectura

### **Componentes Clave**
- **🔗 Blockchain Core**: Gestión de bloques y transacciones
- **🌐 P2P Network**: Red descentralizada entre nodos
- **⛏️ Mining System**: Minado con proof-of-work
- **💰 UTXO Management**: Sistema de outputs no gastados
- **� Wallet System**: Gestión de claves y firmas

---

## 📈 Métricas del Sistema - Octubre 2025

- **Líneas de código:** ~23K+
- **Funcionalidad:** 100% operacional
- **Bug fixes aplicados:** 18+ críticos resueltos
- **Tests implementados:** Suite completa
- **Estado:** ✅ **LISTO PARA PRODUCCIÓN**

---

## 🔓 Soporte UPnP

### **Configuración Automática de Puertos**

Este repositorio (`magnumslocal`) incluye soporte UPnP para apertura automática de puertos:

```bash
# Configurar en .env
ENABLE_UPNP=true  # Activar UPnP (por defecto)
P2P_PORT=5001     # Puerto a abrir automáticamente
```

#### **Arquitectura:**
- **magnumsmaster** (relay): Port forwarding manual → Producción
- **magnumslocal** (nodos cliente): UPnP automático → Desarrollo/Local

#### **Comportamiento:**
- ✅ **UPnP disponible** → Puerto abierto automáticamente, nodo puede recibir conexiones
- ⚠️ **UPnP no disponible** → Nodo funciona en modo cliente (solo conexiones salientes)
- 🔧 **No bloqueante** → El arranque continúa aunque UPnP falle

#### **Logs de Arranque:**
```bash
# Éxito
🔄 Intentando abrir puerto 5001 con UPnP...
✅ UPnP: Puerto 5001 abierto en router (IP pública: 203.0.113.45)

# Fallback
🔄 Intentando abrir puerto 5001 con UPnP...
⚠️ UPnP no disponible. Este nodo funcionará en modo cliente (outbound-only)
```

📖 **Documentación completa:** [docs/UPNP-SETUP.md](docs/UPNP-SETUP.md)


## 🔧 API Endpoints

### **Blockchain**
- `GET /blocks` - Obtener todos los bloques
- `POST /mine` - Minar nuevo bloque
- `GET /transactions` - Pool de transacciones

### **Wallet**
- `POST /transact` - Crear transacción
- `GET /balance?address=<addr>` - Consultar balance
- `GET /public-key` - Obtener clave pública

### **Sistema**
- `GET /peers` - Nodos conectados
- `GET /` - Dashboard principal


## ⚠️ Formato de Wallet Soportado

> Solo se admite el formato keystore generado por el backend actual. Cualquier wallet legacy, plano o sin los campos requeridos NO será aceptada. Consulta [docs/WALLET-FORMATO-2025.md](docs/WALLET-FORMATO-2025.md) para detalles y ejemplo de JSON válido.


## ✨ Características Avanzadas

### **🔗 Blockchain Completo**
- ✅ Proof-of-Work mining
- ✅ UTXO transaction model
- ✅ P2P network discovery
- ✅ Block validation
- ✅ Transaction pool

### **🌐 Interfaz Web**
- ✅ Dashboard en tiempo real
- ✅ Visualización de bloques
- ✅ Monitor de transacciones
- ✅ Gestión de wallets

### **🔐 Seguridad**
- ✅ Firma digital ECDSA
- ✅ Verificación QR
- ✅ Validación de transacciones
- ✅ Control de double-spending


## 🚀 Estado del Proyecto

**✅ SISTEMA COMPLETAMENTE FUNCIONAL Y VERIFICADO**

- **Backend**: Servidor blockchain estable en puerto 3000
- **P2P Network**: Red distribuida operacional
- **Mining**: Sistema de minado robusto y optimizado
- **Frontend**: Dashboard completo y responsive
- **Testing**: Suite de tests completa y validada


## � Integración con CartoLMM

Este proyecto se integra con **CartoLMM** para visualización geográfica de bodegas:
- **magnumsmaster**: Backend blockchain (puerto 3000)
- **CartoLMM**: Frontend geográfico (puerto 8080)


## 🏗️ Arquitectura del Sistema
### 🎯 Topics Covered

- [x] **Creating a basic P2P network** ✅
- [x] **Sending and receiving blocks** ✅  
- [x] **Registering miners and creating new blocks** ✅
- [x] **Creating a private-public wallet** ✅
- [x] **Creating an API** ✅
- [ ] **Setting up a name-value database, LevelDB**
- [ ] **Creating a command-line interface**

### 🧩 Componentes Principales

| Componente | Función | Archivo Principal |
|------------|---------|-------------------|
| **Blockchain** | Gestión de bloques y validación | `src/blockchain.js` |
| **P2P Network** | Sincronización entre nodos | `app/p2pServer.js` |
| **Wallet System** | Gestión de claves y balances | `wallet/index.js` |
| **Mining** | Proof of Work y creación de bloques | `app/miner.js` |
| **UTXO Manager** | Optimización de balances | `src/utxomanager.js` |
| **🔐 QR Blockchain Proof** | QR con verificación criptográfica | `wallet/lote.js` |
| **🍷 Wine Traceability** | Sistema de trazabilidad vinícola integrado | `wallet/lote.js` |
| **🎨 Web Interface** | Dashboard moderno con flujo completo | `public/view.html` |
| **🧪 QR Testing** | Interface de pruebas QR | `public/test-qr-proof.html` |
| **📡 API REST** | Endpoints HTTP con integración completa | `app/index.js` |

### 📁 Estructura del Proyecto

```
magnumsmaster/
├── app/                         # Core blockchain logic
│   ├── index.js                # Main API server + routes
│   ├── p2pServer.js            # WebSocket P2P network
│   ├── miner.js                # Mining and validation
│   └── test/                   # Integration tests
├── src/                        # Blockchain core
│   ├── blockchain.js           # Chain management
│   ├── block.js                # Block structure
│   ├── utxomanager.js          # UTXO optimization
│   └── test/
│       └── utxosTest.js        # UTXO system testing
├── wallet/                     # Wallet system
│   ├── index.js                # Wallet logic
│   ├── transactions.js         # Transaction handling
│   ├── transactionsPool.js     # MemPool management
│   ├── lote.js                 # Wine lot traceability
│   └── test/                   # Wallet test suite
│       ├── qrProofTest.js      # 🔐 QR blockchain proof testing
│       ├── walletTest.js       # Wallet functionality
│       ├── poolTest.js         # Transaction pool
│       ├── loteTest.js         # Lot management
│       └── loteTestMejorado.js # Enhanced lot testing
├── public/                     # Web interface
│   ├── view.html               # Main dashboard
│   ├── styles.css              # Unified styling
│   ├── test-qr-proof.html      # 🧪 QR testing interface con modales
│   └── js/fetchData.js         # Frontend logic
├── nodeLauncher.js            # Node management system
├── simpleNodeLauncher.js      # Simple node launcher
├── stopNodes.js               # Node cleanup utility
├── QR-PROOF-BLOCKCHAIN.md     # 🔐 QR system documentation
└── README-HISTORICO-COMPLETO.md # Complete project history
```


#### 📡 **Conexiones Directas vs Propagación**
- **Node 2**: Conectado directamente a Genesis → Recibe bloques inmediatamente
- **Node 3**: Conectado solo a Node 2 → **No recibe automáticamente todos los broadcasts**

#### 🔄 **Cuándo se Sincroniza Node 3:**
1. **Al crear actividad propia** (transacciones, consultas)
2. **Al solicitar la cadena** por algún evento específico
3. **Detección automática** de cadenas más largas

#### ✅ **Ejemplo de Sincronización:**
```bash
# Crear actividad en Node 3 para activar sincronización
curl -X POST http://localhost:3002/transaction \
  -H "Content-Type: application/json" \
  -d '{"recipient":"test", "amount":10}'

# Node 3 automáticamente solicita la cadena más reciente a Node 2
# Node 2 envía la blockchain completa actualizada
# Node 3 se sincroniza con la cadena más larga
```

#### 🎯 **Comportamiento Normal P2P:**
- **Broadcast directo**: Solo entre nodos directamente conectados
- **Sincronización bajo demanda**: Cuando hay actividad o consultas
- **Red descentralizada**: No todos los nodos reenvían automáticamente
- **Cadena más larga**: Se sincroniza cuando es solicitada o detectada

#### ⚠️ **Errores Esperados en Frontend:**
**Causas normales EN DESARROLLO:**
- **CORS Policy**: Frontend accede desde puerto diferente al backend
- **Nodo no ejecutándose**: El puerto target no está activo
- **File:// protocol**: HTML abierto directamente sin servidor web

**🚀 EN PRODUCCIÓN:**
- ✅ **CORS configurado**: Headers `Access-Control-Allow-Origin` habilitados
- ✅ **Mismo dominio**: Frontend y backend en mismo servidor/puerto
- ✅ **Reverse proxy**: Nginx/Apache maneja el routing interno
- ✅ **SSL/HTTPS**: Protocolos seguros sin restricciones de mixed content

**🔧 CORS IMPLEMENTADO EN DESARROLLO:**
```javascript
// app/index.js - Configuración CORS multi-nodo
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",     // Genesis node
      "http://localhost:3001",     // Node 2
      "http://localhost:3002",     // Node 3
      "http://127.0.0.1:5500"      // Live server
    ];
    // Permitir cualquier localhost en desarrollo
    if (!origin || allowedOrigins.includes(origin) || 
        origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

**Solución DESARROLLO**: Acceder siempre desde el puerto correcto del nodo activo:
- ✅ `http://localhost:3000` (Genesis)
- ✅ `http://localhost:3001` (Node 2) 
- ✅ `http://localhost:3002` (Node 3)

**Solución PRODUCCIÓN**: Despliegue con configuración adecuada:
- ✅ `https://blockchain.dominio.com` (Unified endpoint)
- ✅ Load balancer configurado para múltiples nodos
- ✅ CORS headers configurados en servidor web

## 🔧 API Endpoints
### 🌐 Principales Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Interfaz web principal |
| `GET` | `/blocks` | Blockchain completa |
| `GET` | `/transactionsPool` | Transacciones pendientes |
| `POST` | `/transaction` | Crear nueva transacción |
| `POST` | `/mine` | Minar transacciones (corregido) |
| `GET` | `/balance` | Balance de wallet local |
| `POST` | `/address-balance` | Balance de dirección específica |
| **🔐** | `/qr-with-proof` | Generar QR con prueba blockchain |
| **🔍** | `/verify-qr-proof` | Verificar autenticidad de QR |
| **🍷** | `/lote` | Crear lote de trazabilidad |

### 📋 **Características del Sistema**

| Característica | Estado | Descripción |
|----------------|--------|-------------|
| **🔗 Transacción → Lote** | ✅ Completo | Integración automática |
| **📱 Modal Trazabilidad** | ✅ Completo | UI/UX optimizado |
| **🔐 QR con Proof** | ✅ Completo | Verificación criptográfica |
| **⛏️ Mining System** | ✅ Robusto | Bug crítico resuelto - Manejo graceful de errores |
| **🌐 P2P Network** | ✅ Activo | Sincronización automática |
| **💾 Mempool** | ✅ Funcional | Gestión de transacciones |
| **🧪 Testing Suite** | ✅ Completo | Validación integral |
| **🔍 Verificación Avanzada** | ✅ **NUEVO** | Estados diferenciados |


## 🎯 Estado Actual del Proyecto

### ✅ Completado - OCTUBRE 2025
- ✅ Sistema blockchain funcional con P2P
- ✅ Interfaz web con modales unificados  
- ✅ Sistema UTXO optimizado
- ✅ Gestión de nodos automatizada
- ✅ Testing multi-nodo
- ✅ **Sistema de trazabilidad vinícola completo**
- ✅ **QR con prueba blockchain integrado**
- ✅ **Frontend → Backend → Mining workflow**
- ✅ **Bug crítico de mining resuelto**
- ✅ **API REST completamente funcional**
- ✅ **Sistema de verificación QR avanzado** 
- ✅ **Estados diferenciados de validación**
- ✅ **Interface de testing renovada y simplificada** (**NUEVO**)
- ✅ **Verificación real confirmada con Transaction ID exitoso** (**NUEVO**)
- ✅ **Caso de uso validado en producción** (**NUEVO**)
- ✅ **Scripts de minado multiplataforma** (**OCTUBRE 2025**)
- ✅ **Bug crítico de servidor resuelto** (**OCTUBRE 2025 - NUEVO**)
- ✅ **Mining curl command validado en producción** (**OCTUBRE 2025 - CONFIRMADO**)
- ✅ **Red P2P multi-nodo completamente funcional** (**OCTUBRE 2025 - VALIDADO**)

### 🔄 En Desarrollo
- LevelDB integration
- Command-line interface
- Advanced mining features
- Mobile app para escaneado QR

### � **Sistema de Producción Listo**
El proyecto incluye **flujo completo funcional**:
- **Frontend moderno** con modal system
- **Backend robusto** con error handling
- **Mining system estable** (bug fix aplicado)
- **QR blockchain proof** implementado
- **Trazabilidad vinícola** integrada

### �📈 Métricas Actualizadas
- **Líneas de código:** ~20K+
- **Archivos principales:** 30+
- **Tests implementados:** Suite completa
- **Documentación:** 4 README especializados
- **Bug fixes aplicados:** 15+ críticos resueltos
- **Funcionalidad:** 100% operacional

## 🔗 Proyectos Relacionados

### 🍷 CartoLMM - Sistema de Visualización Geográfica
**Repositorio independiente:** [CartoLMM](https://github.com/maestroGit/CartoLMM)

Sistema de visualización geográfica blockchain para bodegas de vino españolas que complementa magnumsmaster:

- 🗺️ **Mapas interactivos** de bodegas y winelovers
- 📊 **Dashboards en tiempo real** con métricas de blockchain
- 🔗 **Integración API** con magnumsmaster via REST/WebSocket
- 🍇 **Gestión de bodegas** y trazabilidad vinícola
- 📱 **Interfaz responsiva** para visualización de datos blockchain


**Versión:** 1.0.0  
**Autor:** @maestroGit  
**Licencia:** GPLv3 (General Public License)