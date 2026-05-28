#!/usr/bin/env node

/**
 * 🍷 Large Magnum Master - MCP Server (Versión de Testing)
 * Versión simplificada para pruebas seguras
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

console.error('🍷 ===============================================');
console.error('🧪 Large Magnum Master - MCP Server TESTING');
console.error('🌍 Del Terruño al Ciberespacio');
console.error('🍷 ===============================================');

// Servidor MCP básico para testing
const server = new Server(
  {
    name: 'large-magnum-master-test',
    version: '1.0.0-test'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Lista de herramientas disponibles
server.setRequestHandler('tools/list', async () => {
  console.error('📋 MCP: Solicitando lista de herramientas...');
  return {
    tools: [
      {
        name: 'test_connection',
        description: '🔬 Prueba básica de conectividad MCP',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]
  };
});

// Manejo de llamadas a herramientas
server.setRequestHandler('tools/call', async (request) => {
  const { name } = request.params;
  
  console.error(`🔧 MCP: Ejecutando herramienta '${name}'...`);
  
  if (name === 'test_connection') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          message: '✅ MCP Server funcionando correctamente',
          timestamp: new Date().toISOString(),
          test: 'basic_connectivity'
        }, null, 2)
      }]
    };
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        status: 'error',
        message: `Herramienta '${name}' no encontrada`,
        available: ['test_connection']
      }, null, 2)
    }]
  };
});

// Inicialización
async function startTestMCP() {
  try {
    console.error('🚀 Iniciando MCP Server de Testing...');
    console.error('📡 Esperando conexión de Claude/ChatGPT...');
    console.error('✅ Servidor listo - Envía comandos para probar');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
  } catch (error) {
    console.error('❌ Error en MCP Server:', error.message);
    process.exit(1);
  }
}

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promesa rechazada:', reason);
  process.exit(1);
});

// Iniciar servidor de testing
startTestMCP();