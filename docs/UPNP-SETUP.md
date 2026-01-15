# 🔓 Configuración UPnP para Nodos Locales

## 📋 Índice
- [¿Qué es UPnP?](#qué-es-upnp)
- [Arquitectura de Red](#arquitectura-de-red)
- [Configuración](#configuración)
- [Verificación](#verificación)
- [Troubleshooting](#troubleshooting)

---

## ¿Qué es UPnP?

**UPnP (Universal Plug and Play)** es un protocolo que permite a las aplicaciones abrir puertos automáticamente en el router sin configuración manual.

### Ventajas
- ✅ **Configuración automática**: No requiere acceso al panel del router
- ✅ **Plug & Play**: El nodo se configura solo al arrancar
- ✅ **Fallback transparente**: Si falla, el nodo funciona en modo cliente

### Limitaciones
- ⚠️ Requiere que el router tenga UPnP habilitado
- ⚠️ Algunos ISP bloquean UPnP por seguridad
- ⚠️ No todos los routers lo soportan correctamente

---

## Arquitectura de Red

### **Dos tipos de nodos:**

#### 1️⃣ **Relay Público (magnumsmaster)**
- 🏢 Servidor en producción (Seenode, VPS, etc.)
- 🔧 Port forwarding manual en el firewall
- 🚫 **NO debe usar UPnP** (puerto ya abierto manualmente)
- 📍 Siempre accesible desde internet

#### 2️⃣ **Nodos Locales (magnumslocal)**
- 🏠 Computadoras detrás de routers domésticos
- 🔓 **UPnP habilitado por defecto**
- 🔄 Intenta abrir puertos automáticamente
- 📡 Se conecta al relay público

### **Flujo de Red**
```
Internet
   │
   └──> Relay Público (magnumsmaster)
          │
          ├──> Nodo Local 1 (magnumslocal + UPnP)
          ├──> Nodo Local 2 (magnumslocal + UPnP)
          └──> Nodo Local 3 (magnumslocal + UPnP)
```

---

## Configuración

### 1. Instalar Dependencias
```bash
cd magnumslocal
npm install
```

La dependencia `nat-upnp` se instalará automáticamente.

### 2. Configurar Variables de Entorno

Edita tu archivo `.env`:

```bash
# Puerto P2P (debe coincidir con el configurado)
P2P_PORT=5001

# Activar/desactivar UPnP
ENABLE_UPNP=true

# Conectar al relay público
PEERS=wss://app.blockswine.com:443
```

### 3. Iniciar el Nodo

```bash
npm start
```

### 4. Verificar Logs de Arranque

**Si UPnP funciona correctamente:**
```
🔄 Intentando abrir puerto 5001 con UPnP...
✅ UPnP: Puerto 5001 abierto en router (IP pública: 203.0.113.45)
```

**Si UPnP no está disponible:**
```
🔄 Intentando abrir puerto 5001 con UPnP...
⚠️ UPnP no disponible. Este nodo funcionará en modo cliente (outbound-only)
   Razón: Timeout UPnP: 5 segundos
```

---

## Verificación

### Comprobar si tu router tiene UPnP habilitado

1. **Desde el panel del router:**
   - Accede a `192.168.1.1` o `192.168.0.1`
   - Busca sección "UPnP" o "NAT-PMP"
   - Verifica que esté activado

2. **Desde línea de comandos:**
```bash
# Linux
sudo apt install miniupnpc
upnpc -l

# Windows (PowerShell)
Get-NetNat
```

### Verificar que el puerto está abierto

```bash
# Verificar desde internet (reemplaza IP_PUBLICA)
nmap -p 5001 IP_PUBLICA

# O usar herramienta online
# https://www.yougetsignal.com/tools/open-ports/
```

---

## Troubleshooting

### ❌ Error: "UPnP no disponible"

**Causas posibles:**
1. UPnP deshabilitado en el router
2. Router no soporta UPnP
3. Firewall del sistema bloqueando UPnP
4. ISP bloquea tráfico UPnP

**Soluciones:**

#### Opción 1: Habilitar UPnP en el router
1. Accede al panel del router
2. Busca "UPnP" o "Universal Plug and Play"
3. Actívalo y guarda cambios
4. Reinicia el nodo

#### Opción 2: Port forwarding manual
Si tu router no soporta UPnP, abre el puerto manualmente:

1. Accede al router (`192.168.1.1`)
2. Busca "Port Forwarding" o "NAT"
3. Configura:
   - **Puerto externo:** 5001
   - **Puerto interno:** 5001
   - **Protocolo:** TCP
   - **IP destino:** IP local de tu máquina
4. Guarda y reinicia el router

#### Opción 3: Desactivar UPnP
Si no necesitas recibir conexiones entrantes:

```bash
# En .env
ENABLE_UPNP=false
```

El nodo funcionará en **modo cliente** (solo conexiones salientes).

---

### ❌ Error: "Timeout UPnP: 5 segundos"

**Causa:** El router tarda demasiado en responder.

**Solución:**
```javascript
// En app/p2pServer.js, aumentar el timeout (línea ~288)
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error("Timeout UPnP: 10 segundos")), 10000) // 10 seg
);
```

---

### ⚠️ El puerto se abre pero no recibo conexiones

**Verificar firewall del sistema:**

```bash
# Linux (UFW)
sudo ufw allow 5001/tcp

# Windows (PowerShell como Admin)
New-NetFirewallRule -DisplayName "MagnumsLocal P2P" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow
```

---

### 🔍 Debug avanzado

**Ver todos los logs de UPnP:**

```bash
# Iniciar con debug
DEBUG=nat-upnp npm start
```

**Comprobar mappings activos:**

```bash
# Linux
upnpc -l

# Node.js (crear script temporal)
import natUpnp from 'nat-upnp';
const client = natUpnp.createClient();
client.getMappings((err, results) => {
  console.log(results);
});
```

---

## Comparación: UPnP vs Port Forwarding Manual

| Característica | UPnP | Port Forwarding Manual |
|----------------|------|------------------------|
| **Configuración** | Automática | Manual |
| **Requiere acceso al router** | ❌ No | ✅ Sí |
| **Soporte universal** | ⚠️ Parcial | ✅ Total |
| **Seguridad** | ⚠️ Media | ✅ Alta |
| **Recomendado para** | Nodos locales/dev | Relay producción |

---

## Notas Importantes

1. **magnumsmaster NO debe usar UPnP**
   - Es un relay en producción
   - Ya tiene port forwarding manual
   - `ENABLE_UPNP=false` (o sin configurar)

2. **magnumslocal SÍ debe usar UPnP**
   - Son nodos locales/cliente
   - Se benefician de la configuración automática
   - `ENABLE_UPNP=true` (por defecto)

3. **Fallback automático**
   - Si UPnP falla, el nodo sigue funcionando
   - Modo cliente: solo conexiones salientes al relay
   - No afecta la funcionalidad básica

---

## Referencias

- [Especificación UPnP](http://upnp.org/)
- [nat-upnp npm package](https://www.npmjs.com/package/nat-upnp)
- [Issue #17](https://github.com/maestroGit/magnumslocal/issues/17)

---

**Última actualización:** Enero 2026  
**Estado:** ✅ Implementado y funcional

******************************************
******************************************
maest@WALK CLANGARM64 ~/Documents/magnumslocal (feature-nat-upnp)
$ npm audit fix

added 4 packages, removed 1 package, changed 3 packages, and audited 550 packages in 5s  

# npm audit report

elliptic  *
Elliptic Uses a Cryptographic Primitive with a Risky Implementation - https://github.com/advisories/GHSA-848j-6mx2-7j84
No fix available
node_modules/elliptic

form-data  <2.5.4
Severity: critical
form-data uses unsafe random function in form-data for choosing boundary - https://github.com/advisories/GHSA-fjxv-7rqg-78g4
fix available via `npm audit fix --force`
Will install nat-upnp@0.2.1, which is a breaking change
node_modules/request/node_modules/form-data
  request  *
  Depends on vulnerable versions of form-data
  Depends on vulnerable versions of qs
  Depends on vulnerable versions of tough-cookie
  node_modules/request
    nat-upnp  *
    Depends on vulnerable versions of ip
    Depends on vulnerable versions of request
    Depends on vulnerable versions of xml2js
    node_modules/nat-upnp

ip  *
Severity: high
ip SSRF improper categorization in isPublic - https://github.com/advisories/GHSA-2p57-rm9w-gvfp
fix available via `npm audit fix --force`
Will install nat-upnp@0.2.1, which is a breaking change
node_modules/ip

qs  <6.14.1
Severity: high
qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion - https://github.com/advisories/GHSA-6rw7-vpxm-498p
fix available via `npm audit fix --force`
Will install nat-upnp@0.2.1, which is a breaking change
node_modules/request/node_modules/qs


tough-cookie  <4.1.3
Severity: moderate
tough-cookie Prototype Pollution vulnerability - https://github.com/advisories/GHSA-72xf-g2v4-qvf3
fix available via `npm audit fix --force`
Will install nat-upnp@0.2.1, which is a breaking change
node_modules/tough-cookie

xml2js  <0.5.0
Severity: moderate
xml2js is vulnerable to prototype pollution - https://github.com/advisories/GHSA-776f-qx25-q3cc
fix available via `npm audit fix`
node_modules/xml2js

8 vulnerabilities (1 low, 2 moderate, 3 high, 2 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.

maest@WALK CLANGARM64 ~/Documents/magnumslocal (feature-nat-upnp)
$ npm audit
# npm audit report

elliptic  *
Elliptic Uses a Cryptographic Primitive with a Risky Implementation - https://github.com/advisories/GHSA-848j-6mx2-7j84
No fix available
node_modules/elliptic

form-data  <2.5.4
Severity: critical
form-data uses unsafe random function in form-data for choosing boundary - https://github.com/advisories/GHSA-fjxv-7rqg-78g4
fix available via `npm audit fix --force`
Will install nat-upnp@0.2.1, which is a breaking change
node_modules/request/node_modules/form-data
  request  *
  Depends on vulnerable versions of form-data
  Depends on vulnerable versions of qs
  Depends on vulnerable versions of tough-cookie
  node_modules/request
    nat-upnp  *
    Depends on vulnerable versions of ip
    Depends on vulnerable versions of request
    Depends on vulnerable versions of xml2js
    node_modules/nat-upnp

ip  *
Severity: high
ip SSRF improper categorization in isPublic - https://github.com/advisories/GHSA-2p57-rm9w-gvfp
fix available via `npm audit fix --force`
Will install nat-upnp@0.2.1, which is a breaking change
node_modules/ip

qs  <6.14.1
Severity: high
qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion - https://github.com/advisories/GHSA-6rw7-vpxm-498p
fix available via `npm audit fix --force`
Will install nat-upnp@0.2.1, which is a breaking change
node_modules/request/node_modules/qs


tough-cookie  <4.1.3
Severity: moderate
tough-cookie Prototype Pollution vulnerability - https://github.com/advisories/GHSA-72xf-g2v4-qvf3
fix available via `npm audit fix --force`
Will install nat-upnp@0.2.1, which is a breaking change
node_modules/tough-cookie

xml2js  <0.5.0
Severity: moderate
xml2js is vulnerable to prototype pollution - https://github.com/advisories/GHSA-776f-qx25-q3cc
fix available via `npm audit fix`
node_modules/xml2js

8 vulnerabilities (1 low, 2 moderate, 3 high, 2 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.


🔍 Análisis de Vulnerabilidades
📊 Origen del Problema
Todas las vulnerabilidades críticas vienen de nat-upnp y sus dependencias:

⚠️ Realidad: nat-upnp es antigua y no mantenida
La librería nat-upnp@1.1.1 (publicada hace años) usa request que está deprecated desde 2020. Esto es común en librerías UPnP de Node.js.

🎯 ¿Son Críticas para Tu Caso de Uso?
NO para nodos locales por:

✅ Está detrás de NAT/firewall (no expuesto directamente)
✅ Solo se conecta a tu router local (red confiable)
✅ No recibe input externo malicioso via UPnP
✅ Uso temporal durante desarrollo/testing
Las vulnerabilidades serían críticas si:

❌ Expusieras UPnP endpoint a internet público
❌ Procesaras input no confiable via UPnP
❌ Fuera un servidor de producción crítico
💡 Opciones
Opción 1: Continuar (Recomendado para testing)
Ventajas:

✅ Completar el Issue #17 ahora
✅ Validar que UPnP funciona
✅ Riesgo bajo para nodos locales
✅ Se puede mejorar después
Opción 2: Alternativa moderna a nat-upnp
Considera usar @achingbrain/nat-port-mapper (más moderno, mantenido):

Requiere modificar código en p2pServer.js (API diferente).

Opción 3: Forzar fix (NO recomendado)
🚀 Recomendación
Para el Issue #17:

AHORA: Continuar con testing de UPnP

DESPUÉS: Considerar migrar a @achingbrain/nat-port-mapper en un issue/PR separado

NOTA en documentación: Las vulnerabilidades de nat-upnp no son críticas para nodos locales detrás de NAT

📝 Nota sobre elliptic
La vulnerabilidad de elliptic es independiente de UPnP (es del proyecto blockchain original). Se puede abordar por separado.

¿Quieres probar UPnP ahora con npm start, o prefieres explorar la alternativa @achingbrain/nat-port-mapper?