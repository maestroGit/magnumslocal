# 🔒 Guía de Seguridad para Dependencias

## 🎯 Problema: Ataques a la Cadena de Suministro

Los **supply chain attacks** son ataques donde los hackers comprometen paquetes de npm para:
- 🚨 Robar datos sensibles (claves, tokens)
- 💸 Minería de criptomonedas
- 🔓 Crear backdoors en aplicaciones
- 📡 Exfiltrar información

(Episodio Lunaticoin L234 PGP)

### 📰 Casos Famosos:
- **event-stream** (2018) - 2M descargas/semana comprometidas
- **ua-parser-js** (2021) - Cryptominer inyectado
- **node-ipc** (2022) - Sabotaje geopolítico

## ✅ Medidas de Seguridad Implementadas

### 1. **📦 package.json Seguro**
```json
{
  "engines": {
    "node": ">=18.0.0",    // Versión mínima de Node.js
    "npm": ">=8.0.0"       // Versión mínima de npm
  },
  "engineStrict": true,    // Forzar versiones específicas
  "overrides": {           // Forzar versiones seguras
    "semver": ">=7.5.4"
  }
}
```

### 2. **🔒 .npmrc Configurado**
- ✅ `save-exact=true` - Versiones exactas, no rangos
- ✅ `audit-level=moderate` - Auditoría automática
- ✅ `verify-store-integrity=true` - Verificar integridad
- ✅ `fund=false` - No mostrar solicitudes de funding

### 3. **🛡️ Scripts de Seguridad**
```bash
npm run security:audit        # Revisar vulnerabilidades
npm run security:fix          # Arreglar automáticamente
npm run security:check        # Ver paquetes desactualizados
npm run security:update-safe  # Actualizar con versiones exactas
```

## 🔧 Comandos de Mantenimiento Seguro

### 📊 Auditoría Regular
```bash
# Revisar vulnerabilidades
npm audit

# Ver reporte detallado
npm audit --audit-level=high

# Arreglar automáticamente (solo vulnerabilidades)
npm audit fix
```

### 🔄 Actualizaciones Controladas
```bash
# ❌ NUNCA: Actualización automática
npm update

# ✅ MEJOR: Revisar qué se puede actualizar
npm outdated

# ✅ MEJOR: Actualizar manualmente cada paquete
npm install package@latest --save-exact

# ✅ MEJOR: Usar nuestro script seguro
npm run security:update-safe
```

### 🔍 Verificación de Paquetes
```bash
# Verificar integridad de package-lock.json
npm ci

# Verificar sin instalar
npm audit --audit-level=moderate --dry-run
```

## 🚨 Señales de Alerta

### ⚠️ Paquetes Sospechosos:
- 📅 Publicados recientemente sin historial
- 👤 Mantenedores desconocidos
- 📈 Descargas extrañamente altas
- 🔄 Actualizaciones muy frecuentes
- 📝 Descripciones vagas

### 🔍 Antes de Instalar:
1. **Revisar en npmjs.com** el paquete
2. **Verificar GitHub** del mantenedor
3. **Leer issues** y discusiones
4. **Comprobar dependencias** del paquete
5. **Verificar fecha** de última actualización

## 📋 Checklist de Seguridad

### ✅ Configuración Inicial:
- [x] `.npmrc` configurado
- [x] `package-lock.json` en git
- [x] Versiones exactas en dependencies
- [x] Scripts de auditoría configurados
- [x] Engines específicos definidos

### 🔄 Mantenimiento Regular:
- [ ] Auditoría semanal: `npm run security:audit`
- [ ] Revisar outdated: `npm run security:check`
- [ ] Actualizar críticos: Solo CVE High/Critical
- [ ] Testing después de updates
- [ ] Backup antes de cambios importantes

## 🛠️ Herramientas Adicionales (Opcionales)

### 🔍 Análisis Avanzado:
```bash
# Instalar herramientas globales de seguridad
npm install -g @npmcli/security-audit
npm install -g snyk

# Análisis con Snyk
snyk test
snyk monitor
```

### 🤖 Automatización:
- **Dependabot** (GitHub) - PRs automáticos para vulnerabilidades
- **Renovate** - Actualizaciones controladas
- **Snyk** - Monitoreo continuo

## 🎯 Filosofía de Seguridad

> **"Si no está roto, no lo actualices sin razón específica"**

1. **🔒 Estabilidad > Novedad**
2. **🧪 Testing antes de actualizar**
3. **📊 Monitoreo continuo**
4. **🚨 Respuesta rápida a CVEs críticos**
5. **📝 Documentar todos los cambios**

---

**💡 Recuerda:** La seguridad es un proceso continuo, no una configuración única.