# 🚀 Guía Rápida: Gestión de Nodos Blockchain

> **TL;DR:** Scripts en Node.js para levantar y gestionar una red blockchain de 3 nodos con logs coloridos y sincronización P2P automática.

---

## ⚡ Comandos Esenciales

```bash
# 🛑 SIEMPRE limpiar puertos primero
npm run stop-nodes

# 🚀 Levantar red completa (recomendado)
npm run network

# ⚡ Levantar red simple (minimalista)  
npm run network:simple

# 🔧 Un solo nodo (desarrollo)
npm run single-node
```

---

## 📁 Archivos del Sistema

### 🎯 `nodeLauncher.js` - Launcher Completo
**¿Qué hace?**
- Levanta 3 nodos secuencialmente con pausas de 3 segundos
- Muestra logs coloridos por nodo (🟢 Genesis, 🔵 Node2, 🟣 Node3)
- Tabla de estado de red en tiempo real
- Cierre limpio con Ctrl+C
- Manejo de errores y timeouts

**Uso:** `npm run network` o `node nodeLauncher.js`

### ⚡ `simpleNodeLauncher.js` - Launcher Simple  
**¿Qué hace?**
- Levanta 3 nodos rápidamente sin logs detallados
- Procesos independientes en background
- Mínima información, máxima velocidad

**Uso:** `npm run network:simple` o `node simpleNodeLauncher.js`

### 🛑 `stopNodes.js` - Limpiador de Puertos
**¿Qué hace?**
- Verifica puertos activos (3000, 3001, 3002, 5001, 5002, 5003)
- Mata todos los procesos de nodos blockchain
- Multiplataforma (Windows/Linux/Mac)

**Uso:** `npm run stop-nodes` o `node stopNodes.js`

---

## 🌐 Arquitectura Simple

**Cada nodo = P2P + HTTP + Minero + Wallet**

```
Genesis (3000/5001) ←→ Node2 (3001/5002) ←→ Node3 (3002/5003)
      ↓                      ↓                      ↓
   Blockchain            Blockchain            Blockchain  
   (sincronizada automáticamente vía WebSocket)
```

---

## 🎮 Flujo de Trabajo Típico

### 1. **Iniciar Red**
```bash
npm run stop-nodes  # Limpiar puertos
npm run network     # Levantar 3 nodos
```

### 2. **Verificar Estado**
```bash
# Ver blockchain en cada nodo
curl http://localhost:3000/blocks
curl http://localhost:3001/blocks  
curl http://localhost:3002/blocks
```

### 3. **Crear Transacción**
```bash
curl -X POST http://localhost:3000/transaction \
  -H "Content-Type: application/json" \
  -d '{"recipient":"test_address", "amount":50}'
```

### 4. **Verificar Sincronización**
```bash
# La transacción debe aparecer en todos los nodos
curl http://localhost:3000/transactionsPool
curl http://localhost:3001/transactionsPool
curl http://localhost:3002/transactionsPool
```

### 5. **Minar Bloque**
```bash
# Minar desde cualquier nodo
curl -X POST http://localhost:3001/mine-transactions
```

### 6. **Verificar Propagación**
```bash
# El nuevo bloque debe estar en todos los nodos
curl http://localhost:3000/blocks | grep -c "timestamp"
curl http://localhost:3001/blocks | grep -c "timestamp"
curl http://localhost:3002/blocks | grep -c "timestamp"
```

---

## 🔧 Variables de Entorno por Nodo

| Nodo | HTTP_PORT | P2P_PORT | PEERS |
|------|-----------|----------|-------|
| Genesis | 3000 | 5001 | (vacío) |
| Node 2 | 3001 | 5002 | ws://localhost:5001 |
| Node 3 | 3002 | 5003 | ws://localhost:5002 |

---

## ❌ Troubleshooting Rápido

### **Puerto ocupado**
```bash
# Solución rápida
npm run stop-nodes

# Solución manual
netstat -ano | findstr ":3000"
taskkill //PID [PID_NUMBER] //F
```

### **Nodos no se conectan**
```bash
# Verificar que Genesis esté corriendo
curl http://localhost:3000/blocks

# Reiniciar red completa
npm run stop-nodes
npm run network
```

### **Blockchain no sincroniza**
```bash
# Crear transacción de prueba y verificar que aparece en todos
curl -X POST http://localhost:3000/transaction \
  -H "Content-Type: application/json" \
  -d '{"recipient":"sync_test", "amount":1}'

# Debe aparecer en los 3 nodos
curl http://localhost:3000/transactionsPool
curl http://localhost:3001/transactionsPool  
curl http://localhost:3002/transactionsPool
```

---

## 💡 Tips Importantes

- **✅ SIEMPRE** ejecutar `npm run stop-nodes` antes de iniciar
- **🎯 Usar** `npm run network` para desarrollo normal
- **⚡ Usar** `npm run network:simple` para tests rápidos  
- **🔍 Verificar** sincronización con transacciones de prueba
- **🛑 Parar** con Ctrl+C en el launcher o `npm run stop-nodes`

---

## 📋 Cheat Sheet - Copy & Paste

```bash
# Setup completo
npm run stop-nodes && npm run network

# Test rápido de sincronización  
curl -X POST http://localhost:3000/transaction -H "Content-Type: application/json" -d '{"recipient":"test", "amount":10}' && curl http://localhost:3001/transactionsPool

# Minar y verificar
curl -X POST http://localhost:3002/mine-transactions && curl http://localhost:3000/blocks | tail

# Ver estado de red
curl http://localhost:3000/blocks && echo "---" && curl http://localhost:3001/blocks && echo "---" && curl http://localhost:3002/blocks
```

---

*Guía simplificada para magnumsmaster v1.0.0 | @maestroGit*