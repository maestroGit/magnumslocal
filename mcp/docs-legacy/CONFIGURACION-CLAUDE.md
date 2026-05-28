# 🔧 Configuración Segura - Claude Desktop MCP

## 📋 **Paso 1: Ubicar el Archivo de Configuración**

### **Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

### **Ruta completa típica:**
```
C:\Users\TU_USUARIO\AppData\Roaming\Claude\claude_desktop_config.json
```

## 📝 **Paso 2: Configuración Básica (Cópiala exactamente)**

```json
{
  "mcpServers": {
    "large-magnum-master": {
      "command": "node", 
      "args": ["server-simple.js"],
      "cwd": "C:/Users/maest/Documents/magnumsmaster/mcp"
    }
  }
}
```

## 🚨 **Importante: Copia Exacta de Rutas**

**TU ruta específica:**
```
"cwd": "C:/Users/maest/Documents/magnumsmaster/mcp"
```

## ✅ **Paso 3: Verificación**

1. **Guarda el archivo** de configuración
2. **Reinicia Claude Desktop** completamente  
3. **Busca el ícono 🔧** en la interfaz de Claude
4. Si aparece el ícono = ✅ **Configuración exitosa**
5. Si no aparece = ⚠️ **Revisar rutas**

## 🧪 **Paso 4: Primera Prueba Segura**

Una vez que veas el ícono 🔧, prueba:

```
"Hola, ¿puedes ejecutar blockchain_ping?"
```

**Respuesta esperada:**
- ✅ Información del sistema
- ✅ Estados de endpoints
- ✅ Sin errores

## 🛡️ **Seguridades Implementadas**

- ✅ **Solo lectura** por defecto
- ✅ **Proceso independiente** del blockchain
- ✅ **Timeout automático** si hay problemas  
- ✅ **Fácil desactivación** (borrar config y reiniciar)

## 🔧 **Si Algo Sale Mal**

### **Desactivar Inmediatamente:**
1. Borrar el archivo `claude_desktop_config.json`
2. Reiniciar Claude Desktop
3. Todo vuelve a la normalidad

### **Logs para Debugging:**
```
El MCP mostrará errores en la salida de Claude
Sin logs complejos que analizar
```

## 📊 **¿Qué Puedes Esperar?**

### **✅ Funcionalidad Básica:**
- Consultar estado de blockchain de forma conversacional
- Información de red en lenguaje natural
- Sin modificaciones a tu sistema existente

### **⚠️ Sin Riesgo Porque:**
- MCP no puede dañar tu blockchain
- Es solo una interfaz de consulta
- Se desactiva fácilmente
- Proceso totalmente separado

---

**🍷 ¡Listos para probarlo de forma segura!**