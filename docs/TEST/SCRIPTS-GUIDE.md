# 🚀 Scripts de Gestión del Sistema Large Magnum Master

> **Scripts automatizados para el levantamiento, monitoreo y apagado completo del ecosistema blockchain + visualización geográfica**

## 📋 **Índice de Scripts**

| Script | Plataforma | Función | Uso |
|--------|------------|---------|-----|
| `startup-complete.sh` | Linux/Mac | 🚀 Levantamiento completo | `./startup-complete.sh` |
| `startup-complete.bat` | Windows | 🚀 Levantamiento completo | `startup-complete.bat` |
| `shutdown-complete.sh` | Linux/Mac | 🛑 Apagado graceful | `./shutdown-complete.sh` |
| `shutdown-complete.bat` | Windows | 🛑 Apagado graceful | `shutdown-complete.bat` |
| `status-check.sh` | Linux/Mac | 🔍 Verificación estado | `./status-check.sh` |

---

## 🚀 **Script de Levantamiento Completo**

### **Funcionalidades:**

#### **📋 PASO 1: Verificación de Prerrequisitos**
- ✅ Verificación de existencia de directorios
- ✅ Verificación de puertos libres (3000, 3001, 3002, 8080)
- ✅ Creación automática de directorios de logs

#### **📋 PASO 2: Nodo Génesis (magnumsmaster)**
- ✅ Inicio del nodo blockchain principal en puerto 3000
- ✅ Logging automático en `logs/genesis.log`
- ✅ Verificación de disponibilidad HTTP

#### **📋 PASO 3: Nodos P2P Adicionales**
- ✅ Nodo P2P 2 en puerto 3001 (`logs/node2.log`)
- ✅ Nodo P2P 3 en puerto 3002 (`logs/node3.log`)
- ✅ Sincronización automática de blockchain

#### **📋 PASO 4: Sistema de Visualización (CartoLMM)**
- ✅ Inicio de CartoLMM en puerto 8080
- ✅ Logging en `logs/cartolmm.log`
- ✅ Integración con nodos blockchain

#### **📋 PASO 5: Verificación de Red P2P**
- ✅ Test de conectividad HTTP de todos los nodos
- ✅ Verificación de endpoints `/blocks`
- ✅ Estado de la red blockchain

#### **📋 PASO 6: Interfaces Web**
- ✅ Apertura automática de navegador
- ✅ Dashboard principal (puerto 3000)
- ✅ Mapa de bodegas (puerto 8080)
- ✅ Interface de testing QR

### **Salida del Script:**

```bash
🍷 =====================================
🚀 Large Magnum Master - Startup Script
🌍 Del Terruño al Ciberespacio
🍷 =====================================

📋 PASO 1: Verificación de Prerrequisitos
==============================================
✅ Directorios verificados
✅ Puerto 3000 disponible
✅ Puerto 3001 disponible
✅ Puerto 3002 disponible
✅ Puerto 8080 disponible

📋 PASO 2: Iniciar Nodo Génesis (magnumsmaster)
=================================================
✅ Nodo génesis iniciado (PID: 12345)
✅ Nodo Génesis está listo!

📋 PASO 3: Iniciar Nodos P2P Adicionales
==========================================
✅ Nodo P2P 2 iniciado (PID: 12346)
✅ Nodo P2P 3 iniciado (PID: 12347)

📋 PASO 4: Iniciar Sistema de Visualización (CartoLMM)
====================================================
✅ CartoLMM iniciado (PID: 12348)
✅ CartoLMM está listo!

🎉 =====================================
✅ SISTEMA COMPLETAMENTE LEVANTADO!
🍷 Del Terruño al Ciberespacio
🎉 =====================================

📊 RESUMEN DE SERVICIOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Blockchain Network:
   • Nodo Génesis:  http://localhost:3000
   • Nodo P2P 2:    http://localhost:3001
   • Nodo P2P 3:    http://localhost:3002

🌐 Interfaces Web:
   • Dashboard:     http://localhost:3000
   • Mapa Bodegas:  http://localhost:8080
   • Testing QR:    http://localhost:3000/test-qr-proof.html
```

---

## 🛑 **Script de Apagado Completo**

### **Funcionalidades:**

#### **🔍 Detección de Servicios**
- ✅ Búsqueda de procesos por puerto específico
- ✅ Identificación de PIDs activos
- ✅ Logging detallado de operaciones

#### **🔄 Apagado Graceful**
- ✅ Terminación controlada por puerto
- ✅ Verificación de cierre exitoso
- ✅ Cleanup de procesos residuales

#### **🧹 Limpieza Final**
- ✅ Eliminación de procesos node.js restantes
- ✅ Verificación final de puertos
- ✅ Confirmación de liberación completa

### **Salida del Script:**

```bash
🍷 =====================================
🛑 Large Magnum Master - Shutdown Script
🌍 Del Terruño al Ciberespacio
🍷 =====================================

📋 Deteniendo Large Magnum Master...
====================================
✅ Nodo Génesis detenido correctamente
✅ Nodo P2P 2 detenido correctamente
✅ Nodo P2P 3 detenido correctamente
✅ CartoLMM detenido correctamente

🧹 Limpieza adicional...
========================
✅ Puerto 3000 liberado
✅ Puerto 3001 liberado
✅ Puerto 3002 liberado
✅ Puerto 8080 liberado

🎉 =====================================
✅ SISTEMA COMPLETAMENTE DETENIDO!
🍷 Todos los servicios han sido cerrados
🎉 =====================================
```

---

## 🔍 **Script de Verificación de Estado**

### **Funcionalidades:**

#### **📊 Verificación de Servicios**
- ✅ Estado de puertos (activo/inactivo)
- ✅ Respuesta HTTP de endpoints
- ✅ Información de blockchain en tiempo real

#### **🔄 Análisis de Sincronización**
- ✅ Comparación de número de bloques entre nodos
- ✅ Estado de sincronización de la red P2P
- ✅ Detección de nodos desincronizados

#### **📈 Información Detallada**
- ✅ Número de bloques por nodo
- ✅ Tamaño del pool de transacciones
- ✅ Número de peers conectados

### **Salida del Script:**

```bash
🍷 =====================================
🔍 Large Magnum Master - Status Check
🌍 Del Terruño al Ciberespacio
🍷 =====================================

📋 VERIFICACIÓN DE PUERTOS
============================
🔍 Nodo Génesis (puerto 3000): ✅ ACTIVO
🔍 Nodo P2P 2 (puerto 3001): ✅ ACTIVO
🔍 Nodo P2P 3 (puerto 3002): ✅ ACTIVO
🔍 CartoLMM (puerto 8080): ✅ ACTIVO

📋 VERIFICACIÓN HTTP
====================
🌐 Nodo Génesis HTTP: ✅ RESPONDIENDO
🌐 Nodo P2P 2 HTTP: ✅ RESPONDIENDO
🌐 Nodo P2P 3 HTTP: ✅ RESPONDIENDO
🌐 CartoLMM HTTP: ✅ RESPONDIENDO

📋 INFORMACIÓN DE BLOCKCHAIN
===============================
📊 Nodo Génesis - Información de Blockchain:
   🔗 Bloques: 3
   💾 Pool transacciones: 0
   🌐 Peers conectados: 2

📊 Nodo P2P 2 - Información de Blockchain:
   🔗 Bloques: 3
   💾 Pool transacciones: 0
   🌐 Peers conectados: 1

📊 Nodo P2P 3 - Información de Blockchain:
   🔗 Bloques: 3
   💾 Pool transacciones: 0
   🌐 Peers conectados: 1

📋 VERIFICACIÓN DE SINCRONIZACIÓN
==================================
🔄 Estado de sincronización: ✅ SINCRONIZADO
   • Nodo Génesis: 3 bloques
   • Nodo P2P 2: 3 bloques
   • Nodo P2P 3: 3 bloques

📊 RESUMEN GENERAL
==================
🔢 Servicios activos: 4/4
✅ SISTEMA COMPLETAMENTE OPERATIVO
```

---

## 🎯 **Casos de Uso**

### **🚀 Desarrollo Diario**
```bash
# Iniciar todo el sistema
npm run startup

# Verificar estado
npm run status

# Trabajar con el sistema...

# Detener al final del día
npm run shutdown
```

### **🧪 Testing y QA**
```bash
# Verificar estado antes de testing
./status-check.sh

# Si hay problemas, reiniciar
./shutdown-complete.sh
./startup-complete.sh

# Ejecutar tests...
```

### **🚀 Deployment**
```bash
# En servidor de producción
./startup-complete.sh

# Monitorear logs
tail -f logs/genesis.log
tail -f logs/cartolmm.log

# Verificar estado periódicamente
watch -n 30 ./status-check.sh
```

---

## 🔧 **Personalización**

### **Modificar Puertos**
Editar variables en la parte superior de cada script:
```bash
# Configuración de puertos
GENESIS_PORT=3000
NODE2_PORT=3001
NODE3_PORT=3002
CARTOLMM_PORT=8080
```

### **Cambiar Directorios**
```bash
# Configuración de directorios
MAGNUMS_DIR="/ruta/a/magnumsmaster"
CARTOLMM_DIR="/ruta/a/CartoLMM"
```

### **Ajustar Timeouts**
```bash
# Tiempo de espera entre inicios
WAIT_TIME=3
```

---

## 📞 **Soporte y Troubleshooting**

### **Problemas Comunes:**

#### **Error: Puerto ocupado**
```bash
# Verificar qué proceso usa el puerto
lsof -i :3000

# Forzar liberación
./shutdown-complete.sh
```

#### **Nodos no sincronizan**
```bash
# Verificar estado
./status-check.sh

# Reiniciar si es necesario
./shutdown-complete.sh && ./startup-complete.sh
```

#### **Scripts no ejecutables (Linux/Mac)**
```bash
chmod +x *.sh
```

### **Logs de Diagnóstico:**
- `logs/genesis.log` - Nodo principal
- `logs/node2.log` - Nodo P2P 2
- `logs/node3.log` - Nodo P2P 3
- `logs/cartolmm.log` - Sistema de visualización

---

**🍷 Del Terruño al Ciberespacio - Scripts de Gestión Automatizada 2025**