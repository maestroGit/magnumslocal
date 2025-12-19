#!/bin/bash

echo "🍷 ==============================================="
echo "📦 Generador VSIX - Magnum Master Extension"
echo "🍷 ==============================================="

# Verificar si vsce está instalado
if ! command -v vsce &> /dev/null; then
    echo "📥 Instalando vsce (VS Code Extension Manager)..."
    npm install -g vsce
fi

echo "📦 Generando paquete VSIX..."

# Generar archivo VSIX
vsce package

if [ $? -eq 0 ]; then
    echo "✅ Paquete VSIX generado exitosamente!"
    echo ""
    echo "📤 Distribución:"
    echo "   • Archivo: large-magnum-master-tools-1.0.0.vsix"
    echo "   • Instalación: code --install-extension large-magnum-master-tools-1.0.0.vsix"
    echo "   • Compartir: Email, GitHub, servidor, etc."
    echo ""
    echo "🌐 Alcance: Cualquier usuario, cualquier máquina"
else
    echo "❌ Error generando VSIX"
    echo "💡 Revisar package.json y archivos requeridos"
fi