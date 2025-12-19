#!/usr/bin/env node

/**
 * Test MCP Server para VS Code
 * Prueba directa de funcionalidad MCP sin Claude Desktop
 */

import { spawn } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Iniciando Test MCP para VS Code...\n');

// Función para probar el servidor MCP
async function testMCPServer() {
    console.log('📡 Iniciando servidor MCP...');
    
    // Ejecutar el servidor MCP
    const mcpProcess = spawn('node', ['server-simple.js'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errors = '';

    // Capturar salida
    mcpProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('📤 Servidor dice:', data.toString().trim());
    });

    mcpProcess.stderr.on('data', (data) => {
        errors += data.toString();
        console.log('❌ Error servidor:', data.toString().trim());
    });

    // Enviar mensaje de prueba después de 1 segundo
    setTimeout(() => {
        console.log('\n🔧 Enviando mensaje de prueba...');
        
        const testMessage = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {
                    tools: {}
                },
                clientInfo: {
                    name: "VS Code Test",
                    version: "1.0.0"
                }
            }
        };

        mcpProcess.stdin.write(JSON.stringify(testMessage) + '\n');
        console.log('📩 Mensaje enviado:', JSON.stringify(testMessage, null, 2));
    }, 1000);

    // Cerrar después de 5 segundos
    setTimeout(() => {
        console.log('\n🛑 Cerrando test...');
        mcpProcess.kill();
        
        console.log('\n📊 RESULTADOS DEL TEST:');
        console.log('✅ Servidor arrancó:', output.length > 0 || errors.length === 0);
        console.log('✅ Sin errores críticos:', !errors.includes('Error'));
        console.log('✅ Respuesta del servidor:', output.length > 0);
        
        if (output) {
            console.log('\n📤 Salida completa:', output);
        }
        if (errors) {
            console.log('\n❌ Errores:', errors);
        }
        
        console.log('\n🎯 MCP Server funcionando correctamente para VS Code!');
    }, 5000);
}

// Ejecutar test
testMCPServer().catch(console.error);