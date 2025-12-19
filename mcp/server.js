#!/usr/bin/env node

/**
 * 🍷 Large Magnum Master - Model Context Protocol Server
 * 
 * DESCRIPCIÓN:
 * Este MCP Server permite a modelos de IA (Claude, ChatGPT, etc.) interactuar
 * directamente con el ecosistema blockchain de Large Magnum Master.
 * 
 * CAPACIDADES:
 * - Consultar estado de blockchain en tiempo real
 * - Crear transacciones de bodegas automáticamente
 * - Monitorear red P2P distribuida
 * - Analizar datos geográficos de CartoLMM
 * - Detectar problemas y sugerir soluciones
 * 
 * ARQUITECTURA MCP:
 * [Modelo IA] ←→ [MCP Server] ←→ [Large Magnum Master Blockchain]
 *                     ↓
 *              [CartoLMM Geographic Data]
 * 
 * @author Large Magnum Master Team
 * @version 1.0.0
 * @since 2025-10-07
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// 🔧 CONFIGURACIÓN DEL SERVIDOR MCP
// ============================================================================

const MCP_SERVER_INFO = {
  name: 'large-magnum-master-mcp',
  version: '1.0.0',
  description: '🍷 MCP Server para ecosistema blockchain vitivinícola - Del Terruño al Ciberespacio',
  capabilities: {
    blockchain: 'Gestión completa de blockchain de trazabilidad',
    geographic: 'Análisis geográfico de bodegas y terroir',
    monitoring: 'Monitoreo proactivo de red distribuida',
    analytics: 'Análisis predictivo de datos vitivinícolas'
  }
};

// Configuración de endpoints (auto-detecta red local)
const DEFAULT_ENDPOINTS = {
  genesis: 'http://localhost:3000',
  node2: 'http://localhost:3001', 
  node3: 'http://localhost:3002',
  cartolmm: 'http://localhost:8080'
};

// ============================================================================
// 🏗️ INICIALIZACIÓN DEL SERVIDOR MCP
// ============================================================================

const server = new Server(MCP_SERVER_INFO, {
  capabilities: {
    tools: {},
    resources: {},
    logging: {}
  }
});

// ============================================================================
// 🔧 UTILIDADES Y HELPERS
// ============================================================================

/**
 * Realiza una petición HTTP con manejo de errores
 * @param {string} url - URL a consultar
 * @param {object} options - Opciones de fetch
 * @returns {Promise<object>} Respuesta JSON o error
 */
async function safeFetch(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      error: true,
      message: error.message,
      url: url,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Detecta automáticamente la configuración de red
 * @returns {Promise<object>} Configuración de endpoints detectados
 */
async function detectNetworkConfiguration() {
  const config = { ...DEFAULT_ENDPOINTS };
  const detectedNodes = [];
  
  // Detectar nodos activos
  for (const [nodeName, endpoint] of Object.entries(DEFAULT_ENDPOINTS)) {
    const response = await safeFetch(`${endpoint}/blocks`);
    if (!response.error) {
      detectedNodes.push({
        name: nodeName,
        endpoint: endpoint,
        status: 'online',
        blocks: Array.isArray(response) ? response.length : 0
      });
    }
  }
  
  return {
    configuration: config,
    detectedNodes: detectedNodes,
    networkHealth: detectedNodes.length > 0,
    detectionTimestamp: new Date().toISOString()
  };
}

// ============================================================================
// 🔗 HERRAMIENTAS MCP - BLOCKCHAIN CORE
// ============================================================================

/**
 * 📊 Herramienta: Obtener estado completo de blockchain
 */
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'get_blockchain_status') {
    try {
      console.error('🔍 MCP: Consultando estado de blockchain...');
      
      const networkConfig = await detectNetworkConfiguration();
      
      if (!networkConfig.networkHealth) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'No se detectaron nodos blockchain activos',
              suggestion: 'Ejecuta: npm run startup:windows para iniciar la red',
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }
      
      // Obtener datos de todos los nodos detectados
      const nodeData = await Promise.all(
        networkConfig.detectedNodes.map(async (node) => {
          const blocks = await safeFetch(`${node.endpoint}/blocks`);
          const peers = await safeFetch(`${node.endpoint}/peers`);
          const pool = await safeFetch(`${node.endpoint}/transaction-pool`);
          
          return {
            name: node.name,
            endpoint: node.endpoint,
            blocks: blocks.error ? [] : blocks,
            peers: peers.error ? [] : peers,
            transactionPool: pool.error ? [] : pool,
            health: !blocks.error && !peers.error
          };
        })
      );
      
      // Análisis de sincronización
      const blockCounts = nodeData
        .filter(node => node.health)
        .map(node => node.blocks.length);
      
      const isSynchronized = blockCounts.length > 1 && 
        blockCounts.every(count => count === blockCounts[0]);
      
      // Información de último bloque
      const lastBlock = nodeData[0]?.blocks?.slice(-1)[0];
      
      const result = {
        status: 'success',
        networkHealth: networkConfig.networkHealth,
        synchronization: {
          isSynchronized: isSynchronized,
          blockCounts: blockCounts,
          consensusReached: isSynchronized
        },
        nodes: nodeData.map(node => ({
          name: node.name,
          endpoint: node.endpoint,
          online: node.health,
          blockCount: node.blocks.length,
          peerCount: Array.isArray(node.peers) ? node.peers.length : 0,
          pendingTransactions: Array.isArray(node.transactionPool) ? node.transactionPool.length : 0
        })),
        lastBlock: lastBlock ? {
          hash: lastBlock.hash?.substring(0, 16) + '...',
          timestamp: lastBlock.timestamp,
          transactionCount: Array.isArray(lastBlock.data) ? lastBlock.data.length : 0
        } : null,
        recommendations: [],
        timestamp: new Date().toISOString()
      };
      
      // Generar recomendaciones inteligentes
      if (!isSynchronized && blockCounts.length > 1) {
        result.recommendations.push('⚠️ Nodos desincronizados - considera reiniciar la red');
      }
      
      if (nodeData.some(node => node.transactionPool.length > 10)) {
        result.recommendations.push('💰 Pool de transacciones grande - considera minar un bloque');
      }
      
      if (networkConfig.detectedNodes.length === 1) {
        result.recommendations.push('🔗 Solo 1 nodo activo - inicia más nodos para descentralización');
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error en get_blockchain_status:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }
  
  // ============================================================================
  // 🍷 Herramienta: Crear transacción de bodega
  // ============================================================================
  
  if (name === 'create_winery_transaction') {
    try {
      console.error('🍷 MCP: Creando transacción de bodega...');
      
      const { bodegaName, location, wineType, vintage, amount, metadata } = args;
      
      // Validaciones
      if (!bodegaName || !location || !amount) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'Faltan campos requeridos: bodegaName, location, amount',
              required: ['bodegaName', 'location', 'amount'],
              optional: ['wineType', 'vintage', 'metadata']
            }, null, 2)
          }]
        };
      }
      
      // Verificar que haya al menos un nodo activo
      const networkConfig = await detectNetworkConfiguration();
      if (!networkConfig.networkHealth) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'No hay nodos blockchain activos',
              suggestion: 'Inicia la red con: npm run startup:windows'
            }, null, 2)
          }]
        };
      }
      
      // Construir datos de transacción
      const transactionData = {
        type: 'winery_registration',
        bodega: {
          name: bodegaName,
          location: location,
          wineType: wineType || 'Tinto',
          vintage: vintage || new Date().getFullYear(),
          metadata: metadata || {},
          registrationDate: new Date().toISOString(),
          terroir: {
            region: location,
            climate: 'Continental', // Placeholder
            soil: 'Arcilloso'      // Placeholder
          }
        },
        amount: amount,
        timestamp: Date.now(),
        origin: 'mcp_server'
      };
      
      // Enviar transacción al nodo génesis
      const genesisEndpoint = networkConfig.detectedNodes.find(n => n.name === 'genesis')?.endpoint || 
                             networkConfig.detectedNodes[0]?.endpoint;
      
      const response = await safeFetch(`${genesisEndpoint}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });
      
      if (response.error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'Error creando transacción',
              details: response.message,
              endpoint: genesisEndpoint
            }, null, 2)
          }]
        };
      }
      
      // Intentar minar automáticamente (opcional)
      console.error('⛏️ MCP: Intentando minar transacción automáticamente...');
      const mineResponse = await safeFetch(`${genesisEndpoint}/mine`, {
        method: 'POST'
      });
      
      const result = {
        status: 'success',
        transaction: {
          created: true,
          data: transactionData,
          response: response
        },
        mining: {
          attempted: true,
          success: !mineResponse.error,
          response: mineResponse.error ? mineResponse.message : mineResponse
        },
        bodega: {
          name: bodegaName,
          location: location,
          wineType: wineType || 'Tinto',
          vintage: vintage || new Date().getFullYear()
        },
        nextSteps: [
          '✅ Transacción creada en blockchain',
          mineResponse.error ? 
            '⚠️ Mining manual requerido: POST /mine' : 
            '✅ Bloque minado automáticamente',
          '🗺️ Actualizar CartoLMM para mostrar nueva bodega',
          '📊 Verificar sincronización de nodos'
        ],
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error en create_winery_transaction:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }
  
  // ============================================================================
  // 🌐 Herramienta: Análisis de red P2P
  // ============================================================================
  
  if (name === 'analyze_network_health') {
    try {
      console.error('🌐 MCP: Analizando salud de red P2P...');
      
      const startTime = Date.now();
      const networkConfig = await detectNetworkConfiguration();
      
      // Test de latencia para cada nodo
      const latencyTests = await Promise.all(
        networkConfig.detectedNodes.map(async (node) => {
          const testStart = Date.now();
          const response = await safeFetch(`${node.endpoint}/blocks`);
          const testEnd = Date.now();
          
          return {
            node: node.name,
            endpoint: node.endpoint,
            latency: testEnd - testStart,
            responsive: !response.error,
            blockCount: Array.isArray(response) ? response.length : 0,
            error: response.error ? response.message : null
          };
        })
      );
      
      // Análisis de conectividad P2P
      const peerConnectivity = await Promise.all(
        networkConfig.detectedNodes.map(async (node) => {
          const peers = await safeFetch(`${node.endpoint}/peers`);
          return {
            node: node.name,
            connectedPeers: Array.isArray(peers) ? peers.length : 0,
            peerList: Array.isArray(peers) ? peers : []
          };
        })
      );
      
      // Métricas de salud
      const onlineNodes = latencyTests.filter(test => test.responsive);
      const averageLatency = onlineNodes.length > 0 ? 
        onlineNodes.reduce((sum, test) => sum + test.latency, 0) / onlineNodes.length : 0;
      
      const totalPeers = peerConnectivity.reduce((sum, node) => sum + node.connectedPeers, 0);
      
      // Detección de problemas
      const issues = [];
      const recommendations = [];
      
      if (onlineNodes.length < networkConfig.detectedNodes.length) {
        issues.push('🔴 Algunos nodos están offline');
        recommendations.push('Verificar conectividad de red y estado de servicios');
      }
      
      if (averageLatency > 1000) {
        issues.push('🐌 Latencia alta detectada (>1s)');
        recommendations.push('Verificar ancho de banda y congestión de red');
      }
      
      if (totalPeers === 0) {
        issues.push('🔗 Sin conexiones P2P detectadas');
        recommendations.push('Verificar configuración de peers y puertos');
      }
      
      // Verificar sincronización
      const blockCounts = onlineNodes.map(node => node.blockCount);
      const isSynchronized = blockCounts.length > 1 && 
        blockCounts.every(count => count === blockCounts[0]);
      
      if (!isSynchronized && blockCounts.length > 1) {
        issues.push('⚠️ Blockchain desincronizada entre nodos');
        recommendations.push('Reiniciar nodos o forzar resincronización');
      }
      
      const result = {
        status: 'success',
        analysisTimestamp: new Date().toISOString(),
        analysisTime: Date.now() - startTime,
        networkOverview: {
          totalNodes: networkConfig.detectedNodes.length,
          onlineNodes: onlineNodes.length,
          offlineNodes: networkConfig.detectedNodes.length - onlineNodes.length,
          healthScore: Math.round((onlineNodes.length / networkConfig.detectedNodes.length) * 100)
        },
        performance: {
          averageLatency: Math.round(averageLatency),
          fastestNode: onlineNodes.length > 0 ? 
            onlineNodes.reduce((fastest, node) => 
              node.latency < fastest.latency ? node : fastest
            ).node : null,
          slowestNode: onlineNodes.length > 0 ? 
            onlineNodes.reduce((slowest, node) => 
              node.latency > slowest.latency ? node : slowest
            ).node : null
        },
        connectivity: {
          totalPeerConnections: totalPeers,
          peerDistribution: peerConnectivity
        },
        synchronization: {
          isSynchronized: isSynchronized,
          blockCounts: blockCounts,
          consensusReached: isSynchronized && blockCounts.length > 0
        },
        nodeDetails: latencyTests,
        issues: issues,
        recommendations: recommendations,
        healthStatus: issues.length === 0 ? 'excellent' : 
                     issues.length <= 2 ? 'good' : 'needs_attention'
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error en analyze_network_health:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }
  
  // ============================================================================
  // 🗺️ Herramienta: Análisis geográfico CartoLMM
  // ============================================================================
  
  if (name === 'analyze_geographic_data') {
    try {
      console.error('🗺️ MCP: Analizando datos geográficos...');
      
      // Intentar obtener datos de CartoLMM
      const cartolmmResponse = await safeFetch(`${DEFAULT_ENDPOINTS.cartolmm}/api/bodegas`);
      
      if (cartolmmResponse.error) {
        // Fallback file legacy eliminado: devolver dataset vacío con aviso
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'fallback',
              message: 'CartoLMM offline y dataset legacy de bodegas eliminado',
              details: 'No hay datos locales. Devuelto conjunto geográfico vacío.',
              data: { bodegas: [], network: { nodes: [] } },
              suggestions: [
                'Iniciar CartoLMM para datos en tiempo real',
                'O proporcionar un endpoint /api/bodegas en CartoLMM'
              ]
            }, null, 2)
          }]
        };
      }
      
      return await processGeographicData(cartolmmResponse, 'api');
      
    } catch (error) {
      console.error('❌ Error en analyze_geographic_data:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }
  
  // Si no se encuentra la herramienta
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        status: 'error',
        message: `Herramienta MCP '${name}' no encontrada`,
        availableTools: [
          'get_blockchain_status',
          'create_winery_transaction', 
          'analyze_network_health',
          'analyze_geographic_data'
        ]
      }, null, 2)
    }]
  };
});

/**
 * Procesa datos geográficos de bodegas
 * @param {Array} bodegas - Array de bodegas
 * @param {string} source - Fuente de datos ('api' o 'file')
 * @returns {Promise<object>} Análisis geográfico procesado
 */
async function processGeographicData(bodegas, source) {
  if (!Array.isArray(bodegas)) {
    bodegas = [];
  }
  
  // Análisis por región
  const regionStats = bodegas.reduce((stats, bodega) => {
    const region = bodega.region || bodega.location || 'Sin clasificar';
    if (!stats[region]) {
      stats[region] = {
        count: 0,
        bodegas: [],
        avgLatitude: 0,
        avgLongitude: 0
      };
    }
    stats[region].count++;
    stats[region].bodegas.push(bodega.name);
    
    if (bodega.latitude && bodega.longitude) {
      stats[region].avgLatitude += bodega.latitude;
      stats[region].avgLongitude += bodega.longitude;
    }
    
    return stats;
  }, {});
  
  // Calcular promedios
  Object.keys(regionStats).forEach(region => {
    const stat = regionStats[region];
    stat.avgLatitude = stat.avgLatitude / stat.count;
    stat.avgLongitude = stat.avgLongitude / stat.count;
  });
  
  // Análisis de distribución geográfica
  const coordinates = bodegas
    .filter(b => b.latitude && b.longitude)
    .map(b => ({ lat: b.latitude, lng: b.longitude, name: b.name }));
  
  const bounds = coordinates.length > 0 ? coordinates.reduce(
    (bounds, coord) => ({
      north: Math.max(bounds.north, coord.lat),
      south: Math.min(bounds.south, coord.lat),
      east: Math.max(bounds.east, coord.lng),
      west: Math.min(bounds.west, coord.lng)
    }),
    { north: -90, south: 90, east: -180, west: 180 }
  ) : null;
  
  const result = {
    status: 'success',
    dataSource: source,
    summary: {
      totalBodegas: bodegas.length,
      bodegasWithCoordinates: coordinates.length,
      regionsCount: Object.keys(regionStats).length,
      coverage: coordinates.length > 0 ? 
        Math.round((coordinates.length / bodegas.length) * 100) : 0
    },
    regionalDistribution: regionStats,
    geographicBounds: bounds,
    centerPoint: bounds ? {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2
    } : null,
    recommendations: [],
    timestamp: new Date().toISOString()
  };
  
  // Generar recomendaciones
  if (result.summary.coverage < 50) {
    result.recommendations.push('📍 Menos del 50% de bodegas tienen coordenadas - considera añadir geolocalización');
  }
  
  if (result.summary.regionsCount < 3) {
    result.recommendations.push('🌍 Pocas regiones representadas - expandir cobertura geográfica');
  }
  
  if (result.summary.totalBodegas < 10) {
    result.recommendations.push('🍷 Base de datos pequeña - añadir más bodegas para mejor análisis');
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(result, null, 2)
    }]
  };
}

// ============================================================================
// 📋 REGISTRO DE HERRAMIENTAS MCP
// ============================================================================

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'get_blockchain_status',
        description: '📊 Obtiene el estado completo de la red blockchain de Large Magnum Master, incluyendo sincronización, salud de nodos y métricas de red',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'create_winery_transaction',
        description: '🍷 Crea una nueva transacción para registrar una bodega en la blockchain, incluyendo datos de terroir y trazabilidad',
        inputSchema: {
          type: 'object',
          properties: {
            bodegaName: {
              type: 'string',
              description: 'Nombre de la bodega (requerido)'
            },
            location: {
              type: 'string', 
              description: 'Ubicación geográfica (requerido)'
            },
            wineType: {
              type: 'string',
              description: 'Tipo de vino (Tinto, Blanco, Rosado, Espumoso)'
            },
            vintage: {
              type: 'number',
              description: 'Año de cosecha'
            },
            amount: {
              type: 'number',
              description: 'Cantidad en tokens blockchain (requerido)'
            },
            metadata: {
              type: 'object',
              description: 'Metadatos adicionales (opcional)'
            }
          },
          required: ['bodegaName', 'location', 'amount']
        }
      },
      {
        name: 'analyze_network_health',
        description: '🌐 Realiza un análisis completo de la salud de la red P2P, incluyendo latencia, conectividad y sincronización entre nodos',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'analyze_geographic_data',
        description: '🗺️ Analiza la distribución geográfica de bodegas en CartoLMM, proporcionando estadísticas regionales y recomendaciones de cobertura',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]
  };
});

// ============================================================================
// 🚀 INICIALIZACIÓN Y STARTUP
// ============================================================================

async function startMCPServer() {
  console.error('🍷 ===============================================');
  console.error('🚀 Large Magnum Master - MCP Server Starting...');
  console.error('🌍 Del Terruño al Ciberespacio');
  console.error('🍷 ===============================================');
  console.error('');
  console.error('📋 Servidor MCP iniciado con capacidades:');
  console.error('   🔗 Gestión de blockchain de trazabilidad');
  console.error('   🍷 Creación de transacciones de bodegas');
  console.error('   🌐 Monitoreo de red P2P distribuida');
  console.error('   🗺️ Análisis geográfico de terroir');
  console.error('');
  console.error('🔧 Configuración:');
  console.error(`   📡 Endpoints: ${Object.values(DEFAULT_ENDPOINTS).join(', ')}`);
  console.error(`   📅 Versión: ${MCP_SERVER_INFO.version}`);
  console.error('');
  console.error('✅ MCP Server listo para recibir comandos de IA');
  console.error('');
  
  // Verificar conectividad inicial
  try {
    const networkStatus = await detectNetworkConfiguration();
    console.error('📊 Estado inicial de red:');
    console.error(`   🔗 Nodos detectados: ${networkStatus.detectedNodes.length}`);
    console.error(`   🌡️ Salud de red: ${networkStatus.networkHealth ? 'Saludable' : 'Necesita atención'}`);
    
    if (networkStatus.detectedNodes.length > 0) {
      networkStatus.detectedNodes.forEach(node => {
        console.error(`   ✅ ${node.name}: ${node.endpoint} (${node.blocks} bloques)`);
      });
    } else {
      console.error('   ⚠️ No se detectaron nodos activos');
      console.error('   💡 Sugerencia: Ejecuta "npm run startup:windows"');
    }
  } catch (error) {
    console.error('⚠️ Error en verificación inicial:', error.message);
  }
  
  console.error('');
  console.error('🎯 El servidor MCP está escuchando en STDIO');
  console.error('🤖 Conecta desde Claude/ChatGPT para comenzar');
  console.error('');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Manejo de errores globales
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada:', reason);
});

// Iniciar servidor
startMCPServer().catch((error) => {
  console.error('❌ Error fatal iniciando MCP Server:', error);
  process.exit(1);
});