# Guía de Configuración UPnP en Routers para Despliegue de Nodos

## 📋 Índice

1. [Introducción](#introducción)
2. [Acceso al Router](#acceso-al-router)
3. [Verificación UPnP por Marca](#verificación-upnp-por-marca)
4. [Validación In Situ (Red Local)](#validación-in-situ-red-local)
5. [Validación Remota](#validación-remota)
6. [Herramientas de Diagnóstico](#herramientas-de-diagnóstico)
7. [Troubleshooting](#troubleshooting)
8. [Seguridad y Permisos](#seguridad-y-permisos)

---

## Introducción

Esta guía te ayudará a verificar y habilitar UPnP en routers de diferentes marcas y modelos para permitir que tus nodos Magnumslocal abran automáticamente los puertos necesarios (puerto 5001 por defecto).

### ✅ Pre-requisitos

- **Acceso físico o remoto** al router
- **Credenciales de administrador** del router
- **IP del router**: Usualmente `192.168.1.1`, `192.168.0.1`, o `10.0.0.1`
- **Permisos de administración** en el nodo (para ejecutar comandos de red)

---

## Acceso al Router

### 🏠 Opción 1: Acceso Local (In Situ)

**Paso 1: Identificar la IP del router**

```bash
# Windows
ipconfig
# Buscar "Puerta de enlace predeterminada" (Default Gateway)

# Linux/Mac
ip route | grep default
# o
netstat -rn | grep default
```

**Ejemplo de salida:**
```
Puerta de enlace predeterminada . . : 192.168.1.1
```

**Paso 2: Acceder vía navegador**

1. Abrir navegador web
2. Ir a `http://192.168.1.1` (o la IP identificada)
3. Introducir credenciales de administrador

**Credenciales comunes** (si no las has cambiado):
- Usuario: `admin` / Password: `admin`
- Usuario: `admin` / Password: `1234`
- Usuario: `admin` / Password: (en blanco)
- **Importante:** Las credenciales suelen estar en pegatina del router

### 🌐 Opción 2: Acceso Remoto

#### A) VPN al nodo

**Recomendado para seguridad**

1. Configurar VPN en el nodo (WireGuard, OpenVPN, Tailscale)
2. Conectar a la VPN desde tu ubicación remota
3. Acceder al router como si estuvieras en red local: `http://192.168.1.1`

**Ejemplo con Tailscale (Recomendado - Muy Sencillo):**

**¿Qué es Tailscale?**
- VPN mesh moderna basada en WireGuard
- Sin necesidad de abrir puertos manualmente
- Configuración en 2 minutos
- Gratis para uso personal (hasta 100 dispositivos)
- Funciona detrás de CGNAT y NAT estrictos

**Paso 1: Instalar Tailscale en el nodo (presencial o SSH existente)**

```bash
# Linux (Ubuntu/Debian/CentOS)
curl -fsSL https://tailscale.com/install.sh | sh

# Windows
# Descargar desde: https://tailscale.com/download/windows
# O con winget:
winget install tailscale.tailscale

# macOS
brew install tailscale
```

**Paso 2: Autenticar el nodo**

```bash
# Iniciar Tailscale (abre navegador para login)
sudo tailscale up

# Si no tienes navegador en el nodo (servidor headless):
sudo tailscale up --authkey=YOUR_AUTH_KEY

# Para obtener auth key:
# 1. Ve a https://login.tailscale.com/admin/settings/keys
# 2. Generate auth key
# 3. Marca "Reusable" y "Ephemeral" según necesites
# 4. Copia la key (tskey-auth-...)
```

**Salida esperada:**
```
Success.
Some peers are advertising routes but --accept-routes is false.
This node: 100.x.x.x
```

**Paso 3: Anotar la IP Tailscale del nodo**

```bash
# Ver IP de Tailscale asignada al nodo
tailscale ip -4
# Ejemplo: 100.101.102.103

# Ver nombre del nodo en la red Tailscale
hostname
# Ejemplo: nodo-barcelona
```

**Paso 4: Instalar Tailscale en tu máquina de trabajo remota**

```bash
# Mismos comandos según tu OS
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Loguearte con la MISMA cuenta que usaste en el nodo
```

**Paso 5: Verificar conectividad**

```bash
# Ping al nodo por IP Tailscale
ping 100.101.102.103

# O por nombre (Tailscale tiene DNS automático)
ping nodo-barcelona

# SSH directo al nodo (sin IP pública)
ssh user@100.101.102.103
# O
ssh user@nodo-barcelona
```

**Paso 6: Acceder al router del nodo**

**Opción A: Navegador web directo (si Tailscale puede acceder a subredes)**

```bash
# En el NODO (configurar subnet routing)
sudo tailscale up --advertise-routes=192.168.1.0/24 --accept-routes

# En TU MÁQUINA (aceptar las rutas)
sudo tailscale up --accept-routes

# Ahora desde tu navegador:
# http://192.168.1.1
# ¡Y funciona! Como si estuvieras en la red local del nodo
```

**Opción B: SSH tunnel vía Tailscale (sin subnet routing)**

```bash
# Conectar por SSH al nodo vía Tailscale y crear tunnel
ssh -L 8080:192.168.1.1:80 user@nodo-barcelona

# En tu navegador local:
http://localhost:8080
# Te redirige al router del nodo
```

**Opción C: Tailscale SSH (sin configurar SSH manualmente)**

```bash
# Habilitar Tailscale SSH en el nodo (una sola vez)
sudo tailscale up --ssh

# Desde tu máquina, conectar sin necesidad de llaves SSH
tailscale ssh user@nodo-barcelona

# Luego desde esa sesión SSH, usar curl o lynx
curl http://192.168.1.1
# O instalar navegador de texto
sudo apt install lynx
lynx http://192.168.1.1
```

**Paso 7: Administrar el router**

Una vez conectado (cualquier método), puedes:
- Navegar a `http://192.168.1.1` (o la IP de tu router)
- Hacer login con credenciales admin
- Habilitar UPnP en la configuración
- Ver logs, port mappings, etc.

**Ventajas de Tailscale:**
- ✅ Sin abrir puertos en el router del nodo
- ✅ Funciona con CGNAT
- ✅ Cifrado automático (WireGuard)
- ✅ DNS automático (nombres en lugar de IPs)
- ✅ ACLs granulares (control de acceso)
- ✅ Compatible con móviles (iOS/Android)

**Limitaciones:**
- ⚠️ Requiere internet activo en ambos extremos
- ⚠️ Subnet routing puede tener algo de latencia
- ⚠️ Gratis hasta 100 dispositivos (más que suficiente)

**Troubleshooting Tailscale:**

```bash
# Verificar estado
tailscale status

# Ver peers conectados
tailscale status | grep online

# Re-autenticar si expira
sudo tailscale up

# Logs de diagnóstico
sudo tailscale bugreport

# Verificar rutas
ip route | grep 100.
```

**Alternativa: WireGuard manual** (más complejo pero más control)

```bash
# En el nodo - generar keys
wg genkey | tee server_private.key | wg pubkey > server_public.key

# Configurar /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <server_private.key>
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <client_public.key>
AllowedIPs = 10.0.0.2/32

# Levantar VPN
sudo wg-quick up wg0

# Abrir puerto 51820 UDP en router (manual o UPnP)
```

**Para OpenVPN:** Ver guías en https://openvpn.net/community-resources/

#### B) SSH Tunnel al nodo

```bash
# Desde tu máquina remota
ssh -L 8080:192.168.1.1:80 user@ip-publica-del-nodo

# Luego en navegador local
http://localhost:8080
```

**Requisitos:**
- SSH habilitado en el nodo
- IP pública o dominio del nodo
- Puerto SSH (22) abierto o port forwarding configurado

#### C) Acceso Web Remoto del Router

**⚠️ NO RECOMENDADO por seguridad**

Algunos routers permiten administración remota vía web:
1. Habilitar "Remote Management" en router
2. Acceder vía `http://ip-publica-router:puerto`

**Riesgos:**
- Expone panel de administración a internet
- Vulnerable a ataques de fuerza bruta
- Solo usar con credenciales fuertes y ACL restrictivas

#### D) Pedir a alguien en la ubicación

Si no hay opciones técnicas:
1. Contactar a personal en la ubicación
2. Guiarlos por videollamada o capturas de pantalla
3. Pedirles que tomen fotos del panel de administración

---

## Verificación UPnP por Marca

### 🔵 TP-Link

**Modelos comunes:** Archer C7, Archer AX50, TL-WR940N

**Pasos:**
1. Login: `192.168.0.1` o `192.168.1.1`
2. Ir a: **Advanced** → **NAT Forwarding** → **UPnP**
3. Verificar que **UPnP** esté **Enabled**
4. Guardar cambios

**Captura de pantalla esperada:**
```
UPnP Settings
━━━━━━━━━━━━━━━━━━━━━━━
Status: [✓] Enabled
UPnP Service List: (tabla con puertos mapeados)
```

### 🔴 Asus

**Modelos comunes:** RT-AC68U, RT-AX88U, RT-N66U

**Pasos:**
1. Login: `192.168.1.1` o `router.asus.com`
2. Ir a: **WAN** → **Internet Connection** → **Enable UPnP**
3. Marcar checkbox **Enable UPnP**
4. Aplicar configuración

**Ubicación alternativa:**
- **Advanced Settings** → **WAN** → **Port Trigger**

### 🟢 Netgear

**Modelos comunes:** Nighthawk R7000, R6400, Orbi

**Pasos:**
1. Login: `192.168.1.1` o `routerlogin.net`
2. Ir a: **Advanced** → **Advanced Setup** → **UPnP**
3. Marcar **Turn UPnP On**
4. Aplicar

### 🟡 Linksys

**Modelos comunes:** WRT3200ACM, EA7500, MR9600

**Pasos:**
1. Login: `192.168.1.1` o `myrouter.local`
2. Ir a: **Security** → **Apps and Gaming** → **UPnP**
3. Activar **Enable**
4. Save Settings

### 🟣 Fritz!Box (AVM)

**Popular en Europa**

**Pasos:**
1. Login: `fritz.box` o `192.168.178.1`
2. Ir a: **Internet** → **Permit Access** → **Port Sharing**
3. Activar **Permit access for applications via UPnP**
4. Aplicar

### 🟠 MikroTik

**Para routers avanzados**

**Pasos (vía CLI):**
```bash
/ip upnp
set enabled=yes
set allow-disable-external-interface=yes

# Configurar interfaz externa (WAN)
/ip upnp interfaces
add interface=ether1 type=external
add interface=bridge type=internal
```

**Vía WebFig:**
1. Login: `192.168.88.1`
2. **IP** → **UPnP** → **Settings**
3. Enabled: ✓
4. Interfaces: agregar WAN como external, LAN como internal

### ⚫ Routers de Operadoras (ISP)

**Movistar (España):** HGU Router
```
1. Login: 192.168.1.1
2. Avanzado → UPnP → Activar
   ⚠️ Nota: Algunos firmwares bloquean UPnP por política
```

**Orange (España):** Livebox
```
1. Login: 192.168.1.1
2. Configuración avanzada → NAT/PAT → UPnP → Activar
```

**Vodafone:** Router HHG2500
```
1. Login: 192.168.1.1
2. Internet → UPnP → Habilitar
```

**Jazztel/Comcast/otros:**
- Buscar en: Configuración → Red Local → UPnP
- O: Avanzado → Seguridad → UPnP

---

## Validación In Situ (Red Local)

### ✅ Paso 1: Verificar que el nodo arranca

```bash
cd /ruta/a/magnumslocal
npm start
```

**Buscar en logs:**
```
✅ UPnP: Puerto 5001 abierto en router (IP pública: X.X.X.X)
```

**Si ves timeout:**
```
⚠️ UPnP no disponible. Este nodo funcionará en modo cliente (outbound-only)
   Razón: timeout
```
→ UPnP no está habilitado o router no lo soporta.

### ✅ Paso 2: Verificar puerto abierto en router

**Acceder a panel del router** y buscar:
- **UPnP Status** / **Estado UPnP**
- **UPnP Port Mappings** / **Mapeo de puertos UPnP**
- **Active Devices** / **Dispositivos activos**

**Deberías ver:**
```
Descripción          | Puerto Interno | Puerto Externo | IP Local       | Protocolo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MagnumsLocal P2P Node| 5001           | 5001           | 192.168.1.100  | TCP
```

### ✅ Paso 3: Comprobar desde la red local

**En otra máquina en la misma red local:**

```bash
# Verificar conectividad WebSocket
wscat -c ws://192.168.1.100:5001

# O con Node.js
node -e "const ws = require('ws'); new ws('ws://192.168.1.100:5001').on('open', () => console.log('✅ Conectado'))"
```

**Si funciona:** Puerto abierto localmente ✓

### ✅ Paso 4: Identificar IP pública

```bash
# Desde el nodo
curl ifconfig.me
# o
curl ipinfo.io/ip
```

**Anotar esta IP** para validación remota.

---

## Validación Remota

### 🌐 Opción 1: Herramienta Online (Simple)

**CanYouSeeMe.org**
1. Ir a: https://canyouseeme.org/
2. Introducir puerto: `5001`
3. Click "Check Port"

**Resultado esperado:**
```
✅ Success: I can see your service on X.X.X.X on port (5001)
Your ISP is not blocking port 5001
```

**Si falla:**
```
❌ Error: I could not see your service on X.X.X.X on port (5001)
Reason: Connection timed out
```
→ UPnP no abrió el puerto o firewall bloqueando

### 🌐 Opción 2: Nmap desde máquina externa

**Desde otra ubicación (diferente red):**

```bash
# Escanear puerto específico
nmap -p 5001 X.X.X.X

# Resultado esperado si está abierto:
# 5001/tcp open  commplex-link

# Si está cerrado/filtrado:
# 5001/tcp closed commplex-link
# o
# 5001/tcp filtered commplex-link
```

### 🌐 Opción 3: Telnet/Netcat

```bash
# Desde máquina externa
telnet X.X.X.X 5001
# O
nc -zv X.X.X.X 5001

# Si abierto:
Connection to X.X.X.X 5001 port [tcp/*] succeeded!

# Si cerrado:
Connection refused / Connection timed out
```

### 🌐 Opción 4: WebSocket desde navegador

**Crear archivo test.html:**

```html
<!DOCTYPE html>
<html>
<head><title>Test WebSocket</title></head>
<body>
  <h1>Test Conexión al Nodo</h1>
  <button onclick="testConnection()">Probar Conexión</button>
  <pre id="output"></pre>
  
  <script>
    function testConnection() {
      const output = document.getElementById('output');
      const ip = prompt('IP pública del nodo:', '');
      const port = prompt('Puerto:', '5001');
      
      output.textContent = `Conectando a ws://${ip}:${port}...\n`;
      
      const ws = new WebSocket(`ws://${ip}:${port}`);
      
      ws.onopen = () => {
        output.textContent += '✅ Conexión establecida!\n';
        ws.close();
      };
      
      ws.onerror = (err) => {
        output.textContent += '❌ Error de conexión\n';
        output.textContent += 'UPnP no está funcionando o puerto bloqueado\n';
      };
      
      ws.onclose = () => {
        output.textContent += '🔒 Conexión cerrada\n';
      };
    }
  </script>
</body>
</html>
```

Abrir en navegador desde **red externa** (móvil con 4G, otra ubicación, etc.)

---

## Herramientas de Diagnóstico

### 🔧 Herramienta 1: UPnP Inspector (GUI)

**En el nodo (si tiene entorno gráfico):**

```bash
# Linux
sudo apt install upnp-router-control
upnp-router-control

# Windows
# Descargar UPnP Wizard: https://www.upnpwizard.com/
```

**Funcionalidad:**
- Lista dispositivos UPnP en red
- Muestra port mappings activos
- Permite crear/eliminar mappings manualmente

### 🔧 Herramienta 2: upnpc (CLI)

**Instalar miniupnpc:**

```bash
# Ubuntu/Debian
sudo apt install miniupnpc

# macOS
brew install miniupnpc

# Windows
# Descargar desde: https://miniupnp.tuxfamily.org/
```

**Comandos útiles:**

```bash
# Listar dispositivos UPnP
upnpc -l

# Verificar mapeo específico
upnpc -l | grep 5001

# Crear mapeo manual (test)
upnpc -a 192.168.1.100 5001 5001 TCP

# Eliminar mapeo
upnpc -d 5001 TCP

# Ver IP externa
upnpc -s | grep ExternalIPAddress
```

**Salida esperada (`upnpc -l`):**
```
Found valid IGD : http://192.168.1.1:49152/ctl/IPConn
Local LAN ip address : 192.168.1.100
Connection Type : IP_Routed
Status : Connected, uptime=123456s
External IP address : X.X.X.X
 i protocol exPort->inAddr:inPort description remoteHost leaseTime
 0 TCP  5001->192.168.1.100:5001  'MagnumsLocal P2P Node' '' 3600
```

### 🔧 Herramienta 3: Script de Validación

**Crear `check-upnp.js` en el nodo:**

```javascript
import natUpnp from 'nat-upnp';

const client = natUpnp.createClient();
const PORT = 5001;

console.log('🔍 Verificando UPnP...');

// Test 1: Obtener IP externa
client.externalIp((err, ip) => {
  if (err) {
    console.error('❌ No se pudo obtener IP externa:', err.message);
    console.log('→ UPnP no está disponible en este router');
    process.exit(1);
  }
  console.log(`✅ IP externa detectada: ${ip}`);
  
  // Test 2: Obtener mappings existentes
  client.getMappings((err, mappings) => {
    if (err) {
      console.error('⚠️ No se pudieron listar mappings:', err.message);
    } else {
      console.log(`📋 Mappings activos: ${mappings.length}`);
      const ourMapping = mappings.find(m => m.public.port === PORT);
      if (ourMapping) {
        console.log(`✅ Puerto ${PORT} está mapeado:`, ourMapping);
      } else {
        console.log(`⚠️ Puerto ${PORT} NO encontrado en mappings`);
      }
    }
    
    client.close();
  });
});
```

**Ejecutar:**
```bash
node check-upnp.js
```

### 🔧 Herramienta 4: Logs del Sistema

**Verificar logs del router** (si accesible):

```bash
# Algunos routers guardan logs en /var/log/ si tienen SSH
# O en panel web: System → Logs → UPnP Events

# Buscar entradas como:
[UPnP] Port 5001 opened for 192.168.1.100
[UPnP] IGD mapping added: TCP 5001->192.168.1.100:5001
```

---

## Troubleshooting

### ❌ Problema 1: "timeout" en logs del nodo

**Síntomas:**
```
⚠️ UPnP no disponible. Este nodo funcionará en modo cliente (outbound-only)
   Razón: timeout
```

**Causas posibles:**

1. **UPnP deshabilitado en router**
   - ✅ Solución: Habilitar en panel del router (ver sección por marca)

2. **Firewall local bloqueando**
   ```bash
   # Linux - permitir UPnP discovery (SSDP)
   sudo ufw allow 1900/udp
   
   # Windows - verificar firewall
   # Panel de Control → Firewall → Permitir app → Node.js
   ```

3. **Router en modo bridge/AP**
   - Router no hace NAT → UPnP no aplicable
   - ✅ Solución: Configurar UPnP en router upstream

4. **Doble NAT** (router → módem-router)
   ```
   Internet → Módem (NAT) → Router (NAT) → Nodo
   ```
   - ✅ Solución 1: Poner módem en modo bridge
   - ✅ Solución 2: Configurar UPnP en ambos dispositivos
   - ✅ Solución 3: DMZ en módem apuntando al router

### ❌ Problema 2: Puerto abierto localmente pero no externamente

**Síntomas:**
- `upnpc -l` muestra el mapeo
- Logs del nodo: `✅ UPnP: Puerto 5001 abierto`
- Tests externos fallan

**Causas posibles:**

1. **Firewall de operadora (ISP)**
   - Algunas operadoras bloquean puertos < 1024 o filtran tráfico P2P
   - ✅ Solución: Cambiar P2P_PORT a puerto alto (ej: 50001)
   ```bash
   # .env
   P2P_PORT=50001
   ```

2. **CGNAT (Carrier-Grade NAT)**
   - IP pública es compartida entre múltiples clientes
   - Detectar: IP pública empieza con `100.64.x.x` o similar
   - ✅ Solución: Solicitar IP pública dedicada a operadora (puede tener coste)

3. **Firewall del ISP bloqueando**
   - ✅ Solución: Contactar ISP para desbloquear puerto

### ❌ Problema 3: El mapeo desaparece después de un tiempo

**Síntomas:**
- Funciona inicialmente
- Después de 1 hora / reinicio router → puerto cerrado

**Causas:**
1. **TTL expirado** (Time To Live del mapeo)
   - Nuestro código usa `ttl: 3600` (1 hora)
   - ✅ Solución: Implementar renovación automática del mapeo

**Mejora sugerida para `p2pServer.js`:**

```javascript
// Añadir método de renovación periódica
setupUPnPRenewal = () => {
  setInterval(async () => {
    if (this.upnpClient && this.upnpMapping) {
      try {
        await this.setupUPnP();
        console.log('🔄 UPnP: Mapeo renovado');
      } catch (err) {
        console.warn('⚠️ Error renovando UPnP:', err.message);
      }
    }
  }, 1800000); // Renovar cada 30 minutos (antes del TTL)
};

// Llamar en listen()
this.setupUPnPRenewal();
```

### ❌ Problema 4: Error "callback is not a function"

**Ya resuelto** en la última versión del código. Si reaparece:

- Verificar que estás usando callbacks explícitos en `portMapping()` y `externalIp()`
- Cerrar el cliente después de obtener datos para evitar polling interno

### ❌ Problema 5: Múltiples nodos en misma red

**Síntomas:**
- Primer nodo funciona
- Segundo nodo falla con "port already mapped"

**Causa:**
- Ambos nodos intentan abrir el mismo puerto (5001)

**✅ Solución:**
```bash
# Nodo 1
P2P_PORT=5001

# Nodo 2
P2P_PORT=5002

# Nodo 3
P2P_PORT=5003
```

---

## Seguridad y Permisos

### 🔐 Permisos Necesarios

#### En el Router

**Acceso mínimo requerido:**
- ✅ Usuario: **admin** o equivalente
- ✅ Permisos: Lectura/escritura en configuración de red
- ✅ Capacidad: Habilitar/deshabilitar UPnP

**No requieres:**
- ❌ Acceso root/telnet al router
- ❌ Modificar firmware
- ❌ Configuración avanzada de routing

#### En el Nodo

**Usuario del nodo debe poder:**
```bash
# Ejecutar Node.js
node --version

# Escribir en puerto > 1024 (5001 es OK)
# Para puertos < 1024 se necesitaría sudo (NO recomendado)

# Leer variables de entorno
echo $P2P_PORT
```

**No requieres:**
- ❌ Permisos root (salvo port < 1024)
- ❌ Modificar iptables manualmente
- ❌ Configurar interfaces de red

### 🛡️ Recomendaciones de Seguridad

#### 1. Credenciales del Router

```bash
# ✅ HACER: Cambiar credenciales por defecto
Usuario: admin_custom_12345
Password: [contraseña fuerte única]

# ❌ EVITAR: Dejar admin/admin
```

#### 2. Filtrado de Acceso UPnP

**Si tu router lo soporta:**
- Limitar UPnP solo a IPs específicas de la LAN
- Ejemplo (MikroTik):
  ```
  /ip upnp interfaces
  add interface=bridge type=internal address=192.168.1.100
  ```

#### 3. Deshabilitar Administración Remota

```
Router Settings:
- Remote Management: ❌ Disabled
- Remote Administration: ❌ Disabled  
- WAN HTTP Access: ❌ Disabled
```

Usar VPN en su lugar para acceso remoto.

#### 4. Monitorización de Puertos Abiertos

**Revisar periódicamente:**
```bash
# En el nodo
upnpc -l

# O en panel del router
# UPnP Status → Port Mappings
```

**Solo deben estar abiertos:**
- Puerto P2P del nodo (5001)
- Otros servicios legítimos

**Si ves puertos desconocidos:**
- Investigar proceso responsable
- Eliminar mapeos sospechosos
- Considerar deshabilitar UPnP temporalmente

#### 5. Firewall Local en el Nodo

**Además de UPnP, configurar firewall:**

```bash
# Linux (ufw)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 5001/tcp comment 'MagnumsLocal P2P'
sudo ufw allow 6001/tcp comment 'MagnumsLocal HTTP'
sudo ufw enable

# Verificar
sudo ufw status
```

### 📊 Checklist de Despliegue

**Antes de activar el nodo:**

- [ ] Router accesible (local o remoto)
- [ ] Credenciales de admin disponibles
- [ ] UPnP habilitado en router
- [ ] Firewall local permite puerto P2P
- [ ] Variable `ENABLE_UPNP=true` en `.env`
- [ ] Puerto P2P único si hay múltiples nodos en red
- [ ] IP pública identificada y anotada
- [ ] Tests locales exitosos (`npm start` → logs OK)
- [ ] Tests remotos exitosos (canyouseeme.org)
- [ ] Credenciales del router cambiadas (no defaults)
- [ ] Administración remota del router deshabilitada
- [ ] VPN configurada para acceso remoto futuro

---

## 📚 Referencias Adicionales

### Documentación del Proyecto

- [UPNP-SETUP.md](UPNP-SETUP.md) - Guía UPnP específica del proyecto
- [ISSUE-17-RESUMEN.md](ISSUE-17-RESUMEN.md) - Resumen implementación Issue #17
- [DESPLIEGUE-NODOS-ENTORNO-REAL.md](DEPLOY/DESPLIEGUE-NODOS-ENTORNO-REAL.md) - Despliegue en producción

### Recursos Externos

- **UPnP Forum**: https://openconnectivity.org/developer/specifications/upnp-resources/
- **MiniUPnP Project**: https://miniupnp.tuxfamily.org/
- **Port Forward Guides**: https://portforward.com/router.htm (guías por modelo)
- **Can You See Me**: https://canyouseeme.org/ (test de puertos)

### Soporte

**Si encuentras problemas:**

1. Revisar logs del nodo: `npm start` y buscar mensajes UPnP
2. Consultar sección Troubleshooting de esta guía
3. Ejecutar `node check-upnp.js` para diagnóstico automatizado
4. Comprobar documentación del fabricante del router
5. Contactar soporte técnico del ISP si hay CGNAT/bloqueos

---

**Última actualización:** 2026-01-15  
**Mantenedor:** Equipo MagnumsLocal  
**Licencia:** MIT
