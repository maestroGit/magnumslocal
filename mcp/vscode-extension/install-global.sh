#!/bin/bash

echo "🍷 ==============================================="
echo "🌐 Instalador GLOBAL - Magnum Master VS Code"
echo "🍷 ==============================================="

# Detectar directorio global de VS Code
if [ -d "/c/Program Files/Microsoft VS Code/resources/app/extensions" ]; then
    GLOBAL_DIR="/c/Program Files/Microsoft VS Code/resources/app/extensions"
elif [ -d "/c/Users/All Users/Microsoft/VisualStudio/Code/extensions" ]; then
    GLOBAL_DIR="/c/Users/All Users/Microsoft/VisualStudio/Code/extensions"
else
    echo "❌ No se encontró directorio global de VS Code"
    echo "📁 Ubicaciones buscadas:"
    echo "   • /c/Program Files/Microsoft VS Code/resources/app/extensions"
    echo "   • /c/Users/All Users/Microsoft/VisualStudio/Code/extensions"
    exit 1
fi

echo "📁 Directorio global encontrado: $GLOBAL_DIR"
echo "⚠️  ADVERTENCIA: Requiere permisos de administrador"
echo ""

read -p "🔐 ¿Continuar con instalación global? (y/N): " confirm

if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    EXTENSION_DIR="$GLOBAL_DIR/large-magnum-master-tools-1.0.0"
    
    echo "📁 Creando directorio global..."
    mkdir -p "$EXTENSION_DIR"
    
    echo "📋 Copiando archivos..."
    cp package.json "$EXTENSION_DIR/"
    cp extension.js "$EXTENSION_DIR/"
    
    echo "✅ Extensión instalada GLOBALMENTE"
    echo "👥 Disponible para TODOS los usuarios"
    echo "🔄 Reinicia VS Code para activar"
else
    echo "❌ Instalación cancelada"
    echo "💡 La extensión sigue disponible solo para tu usuario"
fi