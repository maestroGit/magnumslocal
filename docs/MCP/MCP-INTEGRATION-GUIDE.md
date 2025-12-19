# 🧠 MCP Integration - Large Magnum Master

> **Model Context Protocol para conectar IA con el ecosistema blockchain de bodegas**

## 🎯 **Objetivo**

Crear MCPs personalizados que permitan a modelos de IA interactuar directamente con:
- Red blockchain de Large Magnum Master
- Sistema geográfico CartoLMM
- Base de datos de bodegas
- Logs y monitoreo del sistema

## 📦 **MCPs Recomendados para el Proyecto**

### **1. 🍷 Blockchain Magnum MCP**

#### **Funcionalidades:**
- ✅ Consultar estado de blockchain
- ✅ Crear transacciones de bodegas
- ✅ Minar bloques
- ✅ Monitorear red P2P
- ✅ Analizar datos de vinos

#### **Instalación:**
```bash
npm install @modelcontextprotocol/sdk
npm install @modelcontextprotocol/server-stdio
```

#### **Implementación:**
```javascript
// mcp/blockchain-magnum-mcp.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'blockchain-magnum-mcp',
  version: '1.0.0',
  description: 'MCP para interactuar con Large Magnum Master blockchain'
});

// Herramienta: Estado de blockchain
server.addTool({
  name: 'get_blockchain_status',
  description: 'Obtiene el estado actual de la blockchain de bodegas',
  handler: async () => {
    try {
      const blocks = await fetch('http://localhost:3000/blocks');
      const peers = await fetch('http://localhost:3000/peers');
      const pool = await fetch('http://localhost:3000/transaction-pool');
      
      return {
        blocks: await blocks.json(),
        peers: await peers.json(),
        transactionPool: await pool.json(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Herramienta: Crear transacción de bodega
server.addTool({
  name: 'create_winery_transaction',
  description: 'Crear transacción para registrar nueva bodega',
  parameters: {
    type: 'object',
    properties: {
      bodegaName: { type: 'string', description: 'Nombre de la bodega' },
      location: { type: 'string', description: 'Ubicación geográfica' },
      wineType: { type: 'string', description: 'Tipo de vino' },
      vintage: { type: 'number', description: 'Año de cosecha' },
      amount: { type: 'number', description: 'Cantidad en blockchain' }
    },
    required: ['bodegaName', 'location', 'amount']
  },
  handler: async ({ bodegaName, location, wineType, vintage, amount }) => {
    try {
      const transactionData = {
        type: 'winery_registration',
        bodega: {
          name: bodegaName,
          location: location,
          wineType: wineType || 'Tinto',
          vintage: vintage || new Date().getFullYear(),
          timestamp: new Date().toISOString()
        },
        amount: amount
      };

      const response = await fetch('http://localhost:3000/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });

      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Herramienta: Análisis de red
server.addTool({
  name: 'analyze_network_health',
  description: 'Analiza la salud de la red blockchain',
  handler: async () => {
    try {
      const nodes = [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:3002'
      ];

      const results = await Promise.all(
        nodes.map(async (node) => {
          try {
            const start = Date.now();
            const response = await fetch(`${node}/blocks`);
            const end = Date.now();
            const blocks = await response.json();
            
            return {
              node: node,
              status: 'online',
              responseTime: end - start,
              blockCount: blocks.length,
              lastBlock: blocks[blocks.length - 1]?.hash.substring(0, 16)
            };
          } catch (error) {
            return {
              node: node,
              status: 'offline',
              error: error.message
            };
          }
        })
      );

      const onlineNodes = results.filter(r => r.status === 'online');
      const syncStatus = onlineNodes.every(node => 
        node.blockCount === onlineNodes[0].blockCount
      );

      return {
        networkHealth: {
          totalNodes: nodes.length,
          onlineNodes: onlineNodes.length,
          synchronized: syncStatus,
          averageResponseTime: onlineNodes.reduce((sum, node) => 
            sum + node.responseTime, 0) / onlineNodes.length
        },
        nodeDetails: results
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

export default server;
```

### **2. 🗺️ CartoLMM Geographic MCP**

```javascript
// mcp/cartolmm-geographic-mcp.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'cartolmm-geographic-mcp',
  version: '1.0.0',
  description: 'MCP para datos geográficos de bodegas'
});

// Herramienta: Obtener bodegas por región
server.addTool({
  name: 'get_bodegas_by_region',
  description: 'Obtiene bodegas filtradas por región geográfica',
  parameters: {
    type: 'object',
    properties: {
      region: { type: 'string', description: 'Región a consultar' },
      radius: { type: 'number', description: 'Radio en km (opcional)' }
    },
    required: ['region']
  },
  handler: async ({ region, radius = 50 }) => {
    try {
      const response = await fetch('http://localhost:8080/api/bodegas');
      const allBodegas = await response.json();
      
      const filteredBodegas = allBodegas.filter(bodega => 
        bodega.region?.toLowerCase().includes(region.toLowerCase()) ||
        bodega.location?.toLowerCase().includes(region.toLowerCase())
      );

      return {
        region: region,
        count: filteredBodegas.length,
        bodegas: filteredBodegas,
        searchRadius: radius
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

// Herramienta: Análisis geográfico
server.addTool({
  name: 'analyze_geographic_distribution',
  description: 'Analiza la distribución geográfica de bodegas',
  handler: async () => {
    try {
      const response = await fetch('http://localhost:8080/api/bodegas');
      const bodegas = await response.json();
      
      const regionStats = bodegas.reduce((stats, bodega) => {
        const region = bodega.region || 'Sin clasificar';
        stats[region] = (stats[region] || 0) + 1;
        return stats;
      }, {});

      const coordinates = bodegas
        .filter(b => b.latitude && b.longitude)
        .map(b => ({ lat: b.latitude, lng: b.longitude }));

      const bounds = coordinates.reduce(
        (bounds, coord) => ({
          north: Math.max(bounds.north, coord.lat),
          south: Math.min(bounds.south, coord.lat),
          east: Math.max(bounds.east, coord.lng),
          west: Math.min(bounds.west, coord.lng)
        }),
        { north: -90, south: 90, east: -180, west: 180 }
      );

      return {
        totalBodegas: bodegas.length,
        regionDistribution: regionStats,
        geographicBounds: bounds,
        centerPoint: {
          lat: (bounds.north + bounds.south) / 2,
          lng: (bounds.east + bounds.west) / 2
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

export default server;
```

### **3. 📊 Analytics MCP**

```javascript
// mcp/analytics-magnum-mcp.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import fs from 'fs/promises';

const server = new Server({
  name: 'analytics-magnum-mcp',
  version: '1.0.0',
  description: 'MCP para análisis y métricas del sistema'
});

// Herramienta: Análisis de logs
server.addTool({
  name: 'analyze_system_logs',
  description: 'Analiza logs del sistema para detectar patrones',
  parameters: {
    type: 'object',
    properties: {
      logType: { 
        type: 'string', 
        enum: ['genesis', 'node2', 'node3', 'cartolmm'],
        description: 'Tipo de log a analizar' 
      },
      timeRange: { type: 'string', description: 'Rango temporal (1h, 24h, 7d)' }
    },
    required: ['logType']
  },
  handler: async ({ logType, timeRange = '1h' }) => {
    try {
      const logFile = `logs/${logType}-lan.log`;
      const logContent = await fs.readFile(logFile, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      // Análisis básico
      const errors = lines.filter(line => 
        line.toLowerCase().includes('error') || 
        line.toLowerCase().includes('failed')
      );
      
      const warnings = lines.filter(line => 
        line.toLowerCase().includes('warning') || 
        line.toLowerCase().includes('warn')
      );

      const transactions = lines.filter(line => 
        line.includes('transaction') || 
        line.includes('mining')
      );

      return {
        logType: logType,
        timeRange: timeRange,
        totalLines: lines.length,
        errors: {
          count: errors.length,
          samples: errors.slice(-5) // Últimos 5 errores
        },
        warnings: {
          count: warnings.length,
          samples: warnings.slice(-5)
        },
        transactions: {
          count: transactions.length,
          samples: transactions.slice(-5)
        },
        lastActivity: lines[lines.length - 1]
      };
    } catch (error) {
      return { error: error.message };
    }
  }
});

export default server;
```

## 🚀 **Configuración e Instalación**

### **Paso 1: Instalar Dependencies**
```bash
cd magnumsmaster
npm install @modelcontextprotocol/sdk
npm install @modelcontextprotocol/server-stdio
mkdir mcp
```

### **Paso 2: Configurar MCP Server**
```javascript
// mcp/server.js
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import blockchainMCP from './blockchain-magnum-mcp.js';
import geographicMCP from './cartolmm-geographic-mcp.js';
import analyticsMCP from './analytics-magnum-mcp.js';

async function main() {
  const transport = new StdioServerTransport();
  
  // Combinar todos los MCPs
  const combinedServer = new Server({
    name: 'large-magnum-master-mcp',
    version: '1.0.0',
    description: 'Complete MCP suite for Large Magnum Master blockchain'
  });

  // Registrar todas las herramientas
  [blockchainMCP, geographicMCP, analyticsMCP].forEach(mcp => {
    mcp.tools.forEach(tool => combinedServer.addTool(tool));
  });

  await transport.start();
}

main().catch(console.error);
```

### **Paso 3: Configurar Claude/ChatGPT**
```json
{
  "mcpServers": {
    "large-magnum-master": {
      "command": "node",
      "args": ["mcp/server.js"],
      "cwd": "/path/to/magnumsmaster"
    }
  }
}
```

## 🎯 **Casos de Uso Prácticos**

### **1. Consulta Inteligente**
```
Usuario: "¿Cuál es el estado actual de mi red blockchain?"
IA + MCP: Consulta automáticamente /blocks, /peers, analiza logs
```

### **2. Gestión Automática**
```
Usuario: "Añade la bodega 'Viña del Mar' en Valparaíso"
IA + MCP: Crea transacción, la mina, actualiza mapa
```

### **3. Análisis Predictivo**
```
Usuario: "¿Hay problemas en la red?"
IA + MCP: Analiza logs, métricas, detecta patrones
```

## 📈 **Beneficios para Tu Proyecto**

✅ **Automatización inteligente**  
✅ **Análisis en tiempo real**  
✅ **Debugging asistido por IA**  
✅ **Gestión de bodegas conversacional**  
✅ **Monitoreo predictivo**  
✅ **Integración natural con blockchain**

---

**🧠 Los MCPs transformarán tu blockchain en un sistema verdaderamente inteligente!** 🍷