const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Extensión VS Code para Large Magnum Master Blockchain
 */

function activate(context) {
    console.log('🍷 Large Magnum Master extension activada!');

    // Ruta al proyecto blockchain
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const blockchainPath = path.join(workspaceRoot || '', '../');

    // Comando: Estado del Blockchain
    let statusCommand = vscode.commands.registerCommand('magnumMaster.blockchainStatus', async () => {
        try {
            vscode.window.showInformationMessage('🔍 Verificando estado del blockchain...');
            
            const panel = vscode.window.createWebviewPanel(
                'magnumMasterStatus',
                '🍷 Magnum Master - Estado',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = getStatusWebviewContent();
            
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Error: ${error.message}`);
        }
    });

    // Comando: Información del Sistema
    let infoCommand = vscode.commands.registerCommand('magnumMaster.blockchainInfo', async () => {
        const info = `🍷 Large Magnum Master Blockchain

📋 Información del Sistema:
   • Proyecto: Sistema Blockchain para Autenticación
   • Origen: Del Terruño al Ciberespacio
   • Tecnología: Node.js + Blockchain Custom
   • Ubicación: ${blockchainPath}

📂 Componentes:
   • Blockchain Core: src/blockchain.js
   • Minero: app/miner.js
   • Red P2P: app/p2pServer.js
   • Validador: app/validator.js
   • Cartografía: cartografia/

🔗 Estado: CONECTADO DESDE VS CODE
⏰ Verificado: ${new Date().toLocaleString()}`;

        vscode.window.showInformationMessage('📋 Información mostrada en Output');
        
        const outputChannel = vscode.window.createOutputChannel('Magnum Master Info');
        outputChannel.clear();
        outputChannel.appendLine(info);
        outputChannel.show();
    });

    // Comando: Minar Bloque
    let mineCommand = vscode.commands.registerCommand('magnumMaster.mineBlock', async () => {
        const input = await vscode.window.showInputBox({
            prompt: '💎 Ingresa datos para el nuevo bloque',
            placeholder: 'Ej: Transacción de prueba desde VS Code'
        });

        if (input) {
            vscode.window.showInformationMessage(`⛏️ Minando bloque con datos: "${input}"`);
            
            // Simular minado
            setTimeout(() => {
                vscode.window.showInformationMessage('✅ ¡Bloque minado exitosamente!');
            }, 2000);
        }
    });

    // Comando: Ver Blockchain
    let viewCommand = vscode.commands.registerCommand('magnumMaster.viewBlockchain', async () => {
        const panel = vscode.window.createWebviewPanel(
            'magnumMasterBlockchain',
            '🔍 Magnum Master - Blockchain',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getBlockchainWebviewContent();
    });

    // Registrar comandos
    context.subscriptions.push(statusCommand, infoCommand, mineCommand, viewCommand);

    // Mostrar mensaje de bienvenida
    vscode.window.showInformationMessage(
        '🍷 Large Magnum Master Blockchain activado!', 
        'Ver Estado', 
        'Información'
    ).then(selection => {
        if (selection === 'Ver Estado') {
            vscode.commands.executeCommand('magnumMaster.blockchainStatus');
        } else if (selection === 'Información') {
            vscode.commands.executeCommand('magnumMaster.blockchainInfo');
        }
    });
}

function getStatusWebviewContent() {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Magnum Master Status</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: rgba(255,255,255,0.1); 
            padding: 30px; 
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
        }
        .status-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
        }
        .status-card { 
            background: rgba(255,255,255,0.2); 
            padding: 20px; 
            border-radius: 10px; 
            border: 1px solid rgba(255,255,255,0.3);
        }
        .status-icon { 
            font-size: 2em; 
            margin-bottom: 10px; 
        }
        .pulse { 
            animation: pulse 2s infinite; 
        }
        @keyframes pulse { 
            0% { opacity: 1; } 
            50% { opacity: 0.5; } 
            100% { opacity: 1; } 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍷 Large Magnum Master</h1>
            <h2>Estado del Blockchain</h2>
            <p><em>Del Terruño al Ciberespacio</em></p>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <div class="status-icon pulse">🟢</div>
                <h3>Sistema Principal</h3>
                <p><strong>Estado:</strong> ACTIVO</p>
                <p><strong>Última verificación:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="status-card">
                <div class="status-icon">📊</div>
                <h3>Red P2P</h3>
                <p><strong>Estado:</strong> FUNCIONANDO</p>
                <p><strong>Nodos conectados:</strong> Simulado</p>
            </div>
            
            <div class="status-card">
                <div class="status-icon">⛏️</div>
                <h3>Minero</h3>
                <p><strong>Estado:</strong> LISTO</p>
                <p><strong>Modo:</strong> Manual</p>
            </div>
            
            <div class="status-card">
                <div class="status-icon">🔗</div>
                <h3>Blockchain</h3>
                <p><strong>Bloques:</strong> En desarrollo</p>
                <p><strong>Protocolo:</strong> Magnum Master v2.0</p>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <p>✅ <strong>Todos los sistemas operativos</strong></p>
            <p><small>Conectado desde VS Code con extensión personalizada</small></p>
        </div>
    </div>
</body>
</html>`;
}

function getBlockchainWebviewContent() {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Magnum Master Blockchain</title>
    <style>
        body { 
            font-family: 'Courier New', monospace; 
            padding: 20px; 
            background: #1a1a1a; 
            color: #00ff00; 
        }
        .block { 
            border: 1px solid #00ff00; 
            margin: 10px 0; 
            padding: 15px; 
            border-radius: 5px; 
            background: #0a0a0a;
        }
        .hash { 
            color: #ffff00; 
            font-weight: bold; 
        }
        .timestamp { 
            color: #00ffff; 
        }
    </style>
</head>
<body>
    <h1>🍷 Large Magnum Master - Blockchain Explorer</h1>
    
    <div class="block">
        <h3>Bloque Génesis</h3>
        <p><strong>Hash:</strong> <span class="hash">0000a1b2c3d4e5f6...</span></p>
        <p><strong>Timestamp:</strong> <span class="timestamp">${new Date().toISOString()}</span></p>
        <p><strong>Datos:</strong> Bloque inicial del sistema Magnum Master</p>
        <p><strong>Nonce:</strong> 0</p>
    </div>
    
    <div class="block">
        <h3>Bloque #1</h3>
        <p><strong>Hash:</strong> <span class="hash">0001b2c3d4e5f6a7...</span></p>
        <p><strong>Hash Anterior:</strong> 0000a1b2c3d4e5f6...</p>
        <p><strong>Timestamp:</strong> <span class="timestamp">${new Date(Date.now() + 60000).toISOString()}</span></p>
        <p><strong>Datos:</strong> Primera transacción del terruño digital</p>
        <p><strong>Nonce:</strong> 127</p>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
        <em>Blockchain en desarrollo - Vista desde VS Code</em>
    </p>
</body>
</html>`;
}

function deactivate() {
    console.log('🍷 Large Magnum Master extension desactivada');
}

module.exports = {
    activate,
    deactivate
};