#!/bin/bash
# =============================================
# Script para desarrollo local en Git Bash
# Carga las variables de entorno de .env.local
# y lanza el servidor Node.js con ellas
# =============================================

# Exporta todas las variables definidas en .env.local (ignora comentarios)
export $(grep -v '^#' .env.local | xargs)

# Lanza el servidor principal
node server.js
