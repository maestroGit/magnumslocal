#!/bin/bash

echo "🍷 ==============================================="
echo "🔧 Instalador de Extensión Magnum Master VS Code"
echo "🍷 ==============================================="

# Crear directorio de extensiones si no existe
EXTENSION_DIR="$HOME/.vscode/extensions/large-magnum-master-tools-1.0.0"

echo "📁 Creando directorio de extensión..."
mkdir -p "$EXTENSION_DIR"

# Copiar archivos de la extensión
echo "📋 Copiando archivos de extensión..."
cp package.json "$EXTENSION_DIR/"
cp extension.js "$EXTENSION_DIR/"

echo "✅ Extensión instalada en: $EXTENSION_DIR"
echo ""
echo "🚀 PRÓXIMOS PASOS:"
echo "1. Reinicia VS Code completamente"
echo "2. Presiona Ctrl+Shift+P"
echo "3. Busca 'Magnum Master'"
echo "4. ¡Disfruta de tu blockchain integrado!"
echo ""
echo "🔧 Comandos disponibles:"
echo "   • 🍷 Ver Estado del Blockchain"
echo "   • 📋 Información del Sistema"
echo "   • ⛏️ Minar Nuevo Bloque"
echo "   • 🔍 Ver Blockchain Completo"
echo ""
echo "✨ ¡Extensión lista para usar!"