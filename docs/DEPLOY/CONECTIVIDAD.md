🔍 Estado actual de conectividad
Tu red P2P funciona así actualmente:
┌─────────────────────────────────────────────────────────────┐
│  MODELO ACTUAL (magnumslocal)                               │
├─────────────────────────────────────────────────────────────┤
│  ✅ Conexiones salientes (outbound): SÍ                    │
│  ✅ Conexiones entrantes (inbound): SÍ (manual)            │
│  ❌ Port forwarding automático:  NO                         │
│  ❌ UPnP/NAT-PMP: NO                                        │
├─────────────────────────────────────────────────────────────┤
│  📌 Requisito: Port forwarding MANUAL en router            │
└─────────────────────────────────────────────────────────────┘

🎯 ¿Qué significa esto en la práctica?
Para LAN (red local):
✅ Funciona perfectamente sin problemas

Para WAN (internet/diferentes redes):
⚠️ Necesitas configurar manualmente:

Port forwarding en el router
Firewall exceptions
IP estática o DDNS
💡 ¿Quieres que implemente UPnP/NAT-PMP automático?
Puedo crear una Pull Request que agregue:

Opción 1: Implementación básica con nat-upnp
JavaScript
// Funcionalidad que agregaría: 
✅ Intento automático de abrir puerto en router al iniciar
✅ Fallback a modo "outbound-only" si falla
✅ Logging detallado del estado UPnP
✅ Cierre automático del puerto al apagar el nodo
Opción 2: Implementación completa (recomendada)
JavaScript
// Incluiría:
✅ Soporte UPnP (routers estándar)
✅ Soporte NAT-PMP (routers Apple/algunos ISPs)
✅ Detección automática de IP pública
✅ Health checks periódicos del mapping
✅ Variables de entorno para control: 
   - ENABLE_UPNP=true/false
   - ENABLE_NATPMP=true/false
   - UPNP_TIMEOUT=5000
__________________

⚠️ NO TOCAR magnumsmaster (relay en producción)
┌──────────────────────────────────────────────────┐
│  magnumsmaster (PRODUCCIÓN)                      │
├──────────────────────────────────────────────────┤
│  ✅ Ya está funcionando como relay/seednode     │
│  ✅ Ya tiene port forwarding configurado manual │
│  ✅ Es estable y en deployment                  │
│  ❌ NO modificar                                 │
└──────────────────────────────────────────────────┘

         ↓ conectan (outbound)

┌──────────────────────────────────────────────────┐
│  magnumslocal (DESARROLLO/TESTING)               │
├──────────────────────────────────────────────────┤
│  🆕 Aquí SÍ implementar UPnP                     │
│  🎯 Para nodos cliente/privados                  │
│  ✅ Safe para experimentar                       │
└──────────────────────────────────────────────────┘

🏗️ ARQUITECTURA CORRECTA:
magnumsmaster (relay público)
// NO MODIFICAR
// Configuración actual:
- Port forwarding:  MANUAL (ya configurado)
- Rol:  Seednode/Relay público
- UPnP: NO necesario (puerto ya abierto)
- Estado: PRODUCCIÓN - NO TOCAR

magnumslocal (nodos privados)
// SÍ IMPLEMENTAR UPnP
// Casos de uso:
- Nodos detrás de NAT en bodegas
- Nodos en redes domésticas
- Testing en distintas ubicaciones
- UPnP: SÍ (para apertura automática)
- Estado: DESARROLLO - Safe para cambios

promt:
Implementa la solución para el issue #17: Implementación básica de apertura automática de puertos con UPnP usando nat-upnp

CONTEXTO:
- Repositorio: maestroGit/magnumslocal (SOLO este repositorio)
- NO modificar magnumsmaster (relay en producción)
- Archivo principal a modificar: app/p2pServer.js
- Objetivo: Añadir soporte UPnP para nodos privados/cliente que se conectan al relay

ARQUITECTURA: 
- magnumsmaster = Relay público (port forwarding manual, NO TOCAR)
- magnumslocal = Nodos privados (UPnP automático, SÍ IMPLEMENTAR)

REQUISITOS DE IMPLEMENTACIÓN: 

1. INSTALACIÓN DE DEPENDENCIA:
   - Añadir "nat-upnp":  "^1.1.1" a package.json en dependencies

2. MODIFICACIONES EN app/p2pServer. js:

   a) Importar la librería al inicio del archivo:
      import natUpnp from 'nat-upnp';

   b) Añadir propiedades a la clase P2PServer (en el constructor):
      this.upnpClient = null;
      this.upnpMapping = null;

   c) Crear método setupUPnP() con las siguientes características:
      - Modo NO BLOQUEANTE (se ejecuta en paralelo, no detiene el arranque)
      - Timeout de 5 segundos para la conexión al router
      - Mapea el puerto P2P_PORT (TCP) desde el router a la máquina local
      - Descripción del mapping: "MagnumsLocal P2P Node"
      - TTL del mapping:  3600 segundos (1 hora)
      - Logs claros: 
        * "🔄 Intentando abrir puerto {P2P_PORT} con UPnP..."
        * Si éxito: "✅ UPnP: Puerto {P2P_PORT} abierto en router (IP pública: {ip})"
        * Si falla:  "⚠️ UPnP no disponible. Este nodo funcionará en modo cliente (outbound-only)"
      - Manejo de errores con try/catch
      - No lanza excepciones (solo logs de advertencia)

   d) Crear método closeUPnP() para cerrar el mapping al apagar:
      - Cierra el mapping si existe
      - Log: "🔒 UPnP: Puerto {P2P_PORT} cerrado en router"
      - Manejo de errores silencioso

   e) Modificar el método listen() existente:
      - NO cambiar a async (mantenerlo síncrono)
      - Después de configurar el WebSocketServer y ANTES de this. connectToPeers()
      - Añadir esta lógica:
        ```javascript
        // Intenta abrir puerto con UPnP (no bloqueante)
        if (process. env.ENABLE_UPNP !== 'false') {
          this.setupUPnP().catch(err => {
            console. warn("⚠️ UPnP: Error silencioso durante setup:", err.message);
          });
        }
        ```

3. VARIABLE DE ENTORNO:
   - Añadir a archivo .env.example:
     ```
     # UPnP - Apertura automática de puertos (solo para nodos locales)
     ENABLE_UPNP=true
     ```

4. GESTIÓN DE CIERRE:
   - Buscar dónde se maneja el cierre del servidor (probablemente en server.js o manejadores de se��ales)
   - Añadir llamada a p2pServer.closeUPnP() antes de cerrar la aplicación

5. ACTUALIZACIÓN DE DOCUMENTACIÓN:
   - Añadir sección en README. md sobre UPnP
   - Actualizar docs/DEPLOY/DESPLIEGUE-NODOS-ENTORNO-REAL.md mencionando:
     * magnumsmaster (relay): port forwarding manual
     * magnumslocal (nodos): UPnP automático
   - Aclarar que UPnP es solo para nodos cliente, no para el relay

RESTRICCIONES: 
- NO modificar magnumsmaster (está en producción)
- Solo implementar en magnumslocal
- NO usar NAT-PMP (solo UPnP)
- NO hacer el arranque bloqueante (debe ser asíncrono/paralelo)
- NO romper funcionalidad existente
- Código simple y legible (~50-80 líneas totales)
- Fallback transparente: si UPnP falla, el nodo funciona en modo outbound-only

CASO DE USO TÍPICO:
- Nodo relay (magnumsmaster): Puerto 5001 abierto manualmente → Siempre accesible
- Nodos locales (magnumslocal): Intentan UPnP → Si funciona, pueden recibir conexiones entrantes
- Si UPnP falla:  Nodos locales funcionan en modo cliente (solo outbound)

¿Puedes generar el código completo para estos cambios? 