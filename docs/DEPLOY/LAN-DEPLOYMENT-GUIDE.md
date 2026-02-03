# 🌐 Guía de Despliegue LAN - BlocksWine

> **Despliegue distribuido en red local: Raspberry Pi + PC + Testing multi-dispositivo**

## 📋 **Índice**

1. [🎯 Arquitectura de Red](#-arquitectura-de-red)
2. [📦 Preparación de Dispositivos](#-preparación-de-dispositivos)
3. [🔧 Configuración de Red](#-configuración-de-red)
4. [🚀 Despliegue Paso a Paso](#-despliegue-paso-a-paso)
5. [🧪 Testing Multi-Dispositivo](#-testing-multi-dispositivo)
6. [📊 Monitoreo y Troubleshooting](#-monitoreo-y-troubleshooting)
7. [⚡ Scripts de Automatización LAN](#-scripts-de-automatización-lan)

---

## 🎯 **Arquitectura de Red**

### **Topología Recomendada:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Red LAN (192.168.1.x)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   PC Principal  │    │  Raspberry Pi   │                │
│  │  (192.168.1.10) │    │ (192.168.1.100) │                │
│  │                 │    │                 │                │
│  │ • Nodo Génesis  │    │ • Nodo P2P 2    │                │
│  │   Puerto 3000   │    │   Puerto 3001   │                │
│  │ • CartoLMM      │    │ • Nodo P2P 3    │                │
│  │   Puerto 8080   │    │   Puerto 3002   │                │
│  │ • Dashboard     │    │ • Logs/Monitor  │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           └───────────────────────┼────────────────────┐   │
│                                   │                    │   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────▼───┐ │
│  │ Dispositivo 1   │    │ Dispositivo 2   │    │ Router/   │ │
│  │ Testing Client  │    │ Testing Client  │    │ Switch    │ │
│  │(192.168.1.201) │    │(192.168.1.202) │    │           │ │
│  └─────────────────┘    └─────────────────┘    └───────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **Distribución de Servicios:**

| Dispositivo | IP Sugerida | Servicios | Función |
|-------------|-------------|-----------|---------|
| **PC Principal** | 192.168.1.10 | Nodo Génesis (3000)<br/>CartoLMM (8080) | Coordinador central |
| **Raspberry Pi** | 192.168.1.100 | Nodo P2P 2 (3001)<br/>Nodo P2P 3 (3002) | Red descentralizada |
| **Cliente 1** | 192.168.1.201 | Navegador web | Testing/Monitoreo |
| **Cliente 2** | 192.168.1.202 | Navegador web | Testing/Monitoreo |

---

## 📦 **Preparación de Dispositivos**

### **🖥️ PC Principal (Windows/Linux/Mac)**

#### **Prerrequisitos:**
```bash
# Verificar Node.js (versión 16+)
node --version
npm --version

# Verificar Git
git --version

# Verificar puertos disponibles
netstat -an | findstr ":3000"
netstat -an | findstr ":8080"
```

#### **Preparación del código:**
```bash
# Clonar o actualizar repositorio
cd /ruta/a/proyectos
git clone https://github.com/maestroGit/magnumsmaster.git
cd magnumsmaster

# Instalar dependencias
npm install

# Verificar estructura
ls -la
```

### **🍓 Raspberry Pi (Raspbian/Ubuntu)**

#### **Instalación inicial:**
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (método NodeSource - recomendado)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # Debe ser v18+
npm --version

# Instalar Git si no está
sudo apt install git -y

# Instalar herramientas adicionales
sudo apt install curl wget htop nano -y
```

#### **Configuración de red:**
```bash
# Verificar IP actual
ip addr show

# Configurar IP estática (opcional pero recomendado)
sudo nano /etc/dhcpcd.conf

# Añadir al final:
# interface eth0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=192.168.1.1 8.8.8.8

# Reiniciar red
sudo systemctl restart dhcpcd
```

#### **Preparación del código:**
```bash
# Crear directorio de trabajo
mkdir -p /home/pi/blockchain
cd /home/pi/blockchain

# Clonar repositorio
git clone https://github.com/maestroGit/magnumsmaster.git
cd magnumsmaster

# Instalar dependencias
npm install

# Verificar que todo funciona
npm test
```

### **📱 Dispositivos Cliente (Cualquier OS con navegador)**

#### **Preparación mínima:**
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conectividad a la misma red LAN
- Opcional: herramientas de testing (curl, Postman)

---

## 🔧 **Configuración de Red**

### **🔍 Paso 1: Descubrimiento de Red**

En cada dispositivo, ejecutar:

```bash
# Encontrar la IP de la red
ipconfig  # Windows
ifconfig  # Linux/Mac
ip addr   # Linux moderno

# Verificar conectividad entre dispositivos
ping 192.168.1.10   # Desde Pi a PC
ping 192.168.1.100  # Desde PC a Pi
```

### **🔥 Paso 2: Configuración de Firewall**

#### **Windows (PC Principal):**
```powershell
# Abrir PowerShell como administrador
# Permitir puertos de blockchain
netsh advfirewall firewall add rule name="Magnum Genesis" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Magnum P2P1" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="Magnum P2P2" dir=in action=allow protocol=TCP localport=3002
netsh advfirewall firewall add rule name="CartoLMM" dir=in action=allow protocol=TCP localport=8080

# Verificar reglas
netsh advfirewall firewall show rule name="Magnum Genesis"
```

#### **Linux (Raspberry Pi):**
```bash
# Usando ufw (recomendado)
sudo ufw enable
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw allow 3002
sudo ufw allow 8080
sudo ufw allow ssh

# Verificar estado
sudo ufw status

# Alternativamente con iptables
sudo iptables -A INPUT -p tcp --dport 3000:3002 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

### **📝 Paso 3: Configuración de Hosts (Opcional)**

En todos los dispositivos, editar `/etc/hosts` (Linux/Mac) o `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
192.168.1.10    magnum-master
192.168.1.100   magnum-pi
192.168.1.10    cartolmm-server
```

---

## 🚀 **Despliegue Paso a Paso**

### **🔄 Paso 1: Configuración de Código para LAN**

#### **En PC Principal - Modificar configuraciones:**

Crear archivo de configuración LAN:

```bash
# En magnumsmaster/
nano config/lan-config.js
```

```javascript
// config/lan-config.js
export const LAN_CONFIG = {
    // PC Principal (Nodo Génesis + CartoLMM)
    GENESIS_NODE: {
        host: '192.168.1.10',
        port: 3000,
        publicUrl: 'http://192.168.1.10:3000'
    },
    
    // Raspberry Pi (Nodos P2P)
    P2P_NODES: [
        {
            host: '192.168.1.100',
            port: 3001,
            publicUrl: 'http://192.168.1.100:3001'
        },
        {
            host: '192.168.1.100', 
            port: 3002,
            publicUrl: 'http://192.168.1.100:3002'
        }
    ],
    
    // CartoLMM
    CARTOLMM: {
        host: '192.168.1.10',
        port: 8080,
        publicUrl: 'http://192.168.1.10:8080'
    },
    
    // Peers para descubrimiento automático
    PEER_DISCOVERY: [
        'http://192.168.1.10:3000',
        'http://192.168.1.100:3001',
        'http://192.168.1.100:3002'
    ]
};
```

#### **Modificar server.js para LAN:**

```bash
# Respaldar archivo original
cp server.js server-localhost.js

# Editar server.js
nano server.js
```

Modificar la configuración de bind:

```javascript
// En server.js, cambiar:
// app.listen(PORT, () => {
// Por:
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍷 Large Magnum Master Node running on http://0.0.0.0:${PORT}`);
    console.log(`🌐 LAN Access: http://192.168.1.10:${PORT}`);
});
```

### **🔄 Paso 2: Transferir Código a Raspberry Pi**

```bash
# Desde PC Principal, enviar código actualizado
scp -r magnumsmaster/ pi@192.168.1.100:/home/pi/blockchain/

# O usando rsync (recomendado)
rsync -avz --exclude node_modules/ magnumsmaster/ pi@192.168.1.100:/home/pi/blockchain/magnumsmaster/

# SSH a la Pi para verificar
ssh pi@192.168.1.100
cd /home/pi/blockchain/magnumsmaster
npm install
```

### **🔄 Paso 3: Scripts de Inicio LAN**

#### **En PC Principal:**

Crear `startup-lan-pc.sh`:

```bash
#!/bin/bash

echo "🍷 ====================================="
echo "🖥️  PC Principal - Large Magnum Master"
echo "🌐 Inicio de servicios LAN"
echo "🍷 ====================================="

# Verificar IP
echo "📍 IP del PC Principal:"
hostname -I | awk '{print $1}'

# Crear directorio de logs
mkdir -p logs

echo "🚀 Iniciando Nodo Génesis..."
# Nodo Génesis en todas las interfaces
NODE_ENV=lan HOST=0.0.0.0 PORT=3000 nohup node server.js > logs/genesis-lan.log 2>&1 &
GENESIS_PID=$!
echo "✅ Nodo Génesis iniciado (PID: $GENESIS_PID)"

sleep 5

echo "🗺️ Iniciando CartoLMM..."
cd ../CartoLMM
HOST=0.0.0.0 PORT=8080 nohup node server.js > ../magnumsmaster/logs/cartolmm-lan.log 2>&1 &
CARTOLMM_PID=$!
echo "✅ CartoLMM iniciado (PID: $CARTOLMM_PID)"

cd ../magnumsmaster

echo ""
echo "🎉 ====================================="
echo "✅ PC Principal configurado!"
echo "🔗 Nodo Génesis: http://192.168.1.10:3000"
echo "🗺️ CartoLMM: http://192.168.1.10:8080"
echo "🍷 ====================================="
echo ""
echo "🔧 Próximo paso: Iniciar servicios en Raspberry Pi"
echo "   ssh pi@192.168.1.100"
echo "   cd /home/pi/blockchain/magnumsmaster"
echo "   ./startup-lan-pi.sh"
```

#### **En Raspberry Pi:**

Crear `startup-lan-pi.sh`:

```bash
#!/bin/bash

echo "🍷 ====================================="
echo "🍓 Raspberry Pi - Large Magnum Master"
echo "🌐 Nodos P2P para red LAN"
echo "🍷 ====================================="

# Verificar IP
echo "📍 IP de la Raspberry Pi:"
hostname -I | awk '{print $1}'

# Crear directorio de logs
mkdir -p logs

echo "🔗 Esperando a que el Nodo Génesis esté disponible..."
while ! curl -s http://192.168.1.10:3000/blocks > /dev/null; do
    echo "⏳ Esperando conexión con Nodo Génesis..."
    sleep 2
done
echo "✅ Nodo Génesis detectado!"

echo "🚀 Iniciando Nodo P2P 2..."
# Nodo P2P 2
GENESIS_PEER=http://192.168.1.10:3000 HOST=0.0.0.0 PORT=3001 nohup node server.js > logs/node2-lan.log 2>&1 &
NODE2_PID=$!
echo "✅ Nodo P2P 2 iniciado (PID: $NODE2_PID)"

sleep 3

echo "🚀 Iniciando Nodo P2P 3..."
# Nodo P2P 3
GENESIS_PEER=http://192.168.1.10:3000 HOST=0.0.0.0 PORT=3002 nohup node server.js > logs/node3-lan.log 2>&1 &
NODE3_PID=$!
echo "✅ Nodo P2P 3 iniciado (PID: $NODE3_PID)"

echo ""
echo "🎉 ====================================="
echo "✅ Raspberry Pi configurada!"
echo "🔗 Nodo P2P 2: http://192.168.1.100:3001"
echo "🔗 Nodo P2P 3: http://192.168.1.100:3002"
echo "🍷 ====================================="
echo ""
echo "🧪 Testing desde cualquier dispositivo:"
echo "   http://192.168.1.10:3000"
echo "   http://192.168.1.10:8080"
```

### **🔄 Paso 4: Ejecución Secuencial**

#### **1. En PC Principal:**
```bash
cd /ruta/a/magnumsmaster
chmod +x startup-lan-pc.sh
./startup-lan-pc.sh
```

#### **2. En Raspberry Pi:**
```bash
ssh pi@192.168.1.100
cd /home/pi/blockchain/magnumsmaster
chmod +x startup-lan-pi.sh
./startup-lan-pi.sh
```

---

## 🧪 **Testing Multi-Dispositivo**

### **🔬 Paso 1: Verificación Básica**

#### **Desde cualquier dispositivo en la LAN:**

```bash
# Test de conectividad de nodos
curl http://192.168.1.10:3000/blocks    # Nodo Génesis
curl http://192.168.1.100:3001/blocks   # P2P Node 2
curl http://192.168.1.100:3002/blocks   # P2P Node 3

# Test de CartoLMM
curl http://192.168.1.10:8080
```

### **🔬 Paso 2: Test de Sincronización**

Script para verificar sincronización entre nodos:

```bash
#!/bin/bash
# sync-test.sh

echo "🔍 Test de Sincronización de Red LAN"
echo "=================================="

# Obtener número de bloques de cada nodo
GENESIS_BLOCKS=$(curl -s http://192.168.1.10:3000/blocks | jq length)
NODE2_BLOCKS=$(curl -s http://192.168.1.100:3001/blocks | jq length)
NODE3_BLOCKS=$(curl -s http://192.168.1.100:3002/blocks | jq length)

echo "📊 Estado de la blockchain:"
echo "   🔗 Nodo Génesis (PC):     $GENESIS_BLOCKS bloques"
echo "   🔗 Nodo P2P 2 (Pi):       $NODE2_BLOCKS bloques"
echo "   🔗 Nodo P2P 3 (Pi):       $NODE3_BLOCKS bloques"

if [ "$GENESIS_BLOCKS" = "$NODE2_BLOCKS" ] && [ "$NODE2_BLOCKS" = "$NODE3_BLOCKS" ]; then
    echo "✅ RED SINCRONIZADA CORRECTAMENTE"
else
    echo "⚠️  DETECTADA DESINCRONIZACIÓN"
fi
```

### **🔬 Paso 3: Test de Transacciones Distribuidas**

```bash
#!/bin/bash
# distributed-transaction-test.sh

echo "💰 Test de Transacciones Distribuidas"
echo "====================================="

# Crear transacción desde PC
echo "📤 Creando transacción desde PC Principal..."
TX_RESPONSE=$(curl -s -X POST http://192.168.1.10:3000/transaction \
  -H "Content-Type: application/json" \
  -d '{"recipient":"test-lan", "amount":100}')

echo "✅ Transacción creada: $TX_RESPONSE"

sleep 2

# Verificar pool de transacciones en todos los nodos
echo "📋 Pool de transacciones:"
echo "   PC:  $(curl -s http://192.168.1.10:3000/transaction-pool | jq length)"
echo "   Pi1: $(curl -s http://192.168.1.100:3001/transaction-pool | jq length)"
echo "   Pi2: $(curl -s http://192.168.1.100:3002/transaction-pool | jq length)"

# Minar desde Raspberry Pi
echo "⛏️  Minando desde Raspberry Pi..."
MINE_RESPONSE=$(curl -s -X POST http://192.168.1.100:3001/mine)
echo "✅ Bloque minado: $MINE_RESPONSE"

sleep 3

# Verificar sincronización post-mining
echo "🔄 Verificando sincronización..."
./sync-test.sh
```

### **🔬 Paso 4: Test de Interfaz Web**

#### **Desde dispositivos cliente:**

1. **Abrir navegador en dispositivo cliente**
2. **Acceder a interfaces:**
   - Dashboard: `http://192.168.1.10:3000`
   - Mapa de Bodegas: `http://192.168.1.10:8080`
   - API Explorer: `http://192.168.1.10:3000/api`

3. **Test de funcionalidades:**
   - Crear transacciones desde interfaz
   - Visualizar bloques en tiempo real
   - Explorar mapa de bodegas
   - Verificar WebSocket en tiempo real

---

## 📊 **Monitoreo y Troubleshooting**

### **📈 Script de Monitoreo Continuo**

```bash
#!/bin/bash
# monitor-lan.sh

watch -n 5 '
echo "🍷 Large Magnum Master - Estado LAN"
echo "=================================="
echo "$(date)"
echo ""

echo "🔗 Estado de Nodos:"
if curl -s http://192.168.1.10:3000/blocks > /dev/null; then
    echo "   ✅ Génesis (PC):     ONLINE"
else
    echo "   ❌ Génesis (PC):     OFFLINE"
fi

if curl -s http://192.168.1.100:3001/blocks > /dev/null; then
    echo "   ✅ P2P 2 (Pi):       ONLINE"
else
    echo "   ❌ P2P 2 (Pi):       OFFLINE"
fi

if curl -s http://192.168.1.100:3002/blocks > /dev/null; then
    echo "   ✅ P2P 3 (Pi):       ONLINE"
else
    echo "   ❌ P2P 3 (Pi):       OFFLINE"
fi

if curl -s http://192.168.1.10:8080 > /dev/null; then
    echo "   ✅ CartoLMM:         ONLINE"
else
    echo "   ❌ CartoLMM:         OFFLINE"
fi

echo ""
echo "📊 Estadísticas de Red:"
GENESIS_BLOCKS=$(curl -s http://192.168.1.10:3000/blocks 2>/dev/null | jq length 2>/dev/null || echo "N/A")
echo "   🔗 Bloques totales:   $GENESIS_BLOCKS"

PEERS=$(curl -s http://192.168.1.10:3000/peers 2>/dev/null | jq length 2>/dev/null || echo "N/A")
echo "   👥 Peers conectados:  $PEERS"

echo ""
'
```

### **🛠️ Troubleshooting Común**

#### **Problema: Nodos no se conectan**

```bash
# Verificar conectividad de red
ping 192.168.1.10   # Desde Pi
ping 192.168.1.100  # Desde PC

# Verificar puertos abiertos
nmap -p 3000-3002,8080 192.168.1.10
nmap -p 3000-3002,8080 192.168.1.100

# Verificar logs
tail -f logs/genesis-lan.log     # En PC
tail -f logs/node2-lan.log       # En Pi
```

#### **Problema: Firewall bloqueando conexiones**

```bash
# Linux - verificar y ajustar iptables
sudo iptables -L -n
sudo ufw status verbose

# Windows - verificar reglas de firewall
netsh advfirewall firewall show rule name=all | findstr 3000
```

#### **Problema: Desincronización de blockchain**

```bash
# Reiniciar red completa
# 1. Parar todos los servicios
./shutdown-lan-all.sh

# 2. Limpiar datos temporales
rm -rf data/blockchain/*.json

# 3. Reiniciar secuencialmente
./startup-lan-pc.sh    # PC primero
./startup-lan-pi.sh    # Pi después
```

---

## ⚡ **Scripts de Automatización LAN**

### **🚦 Script de Control Maestro**

```bash
#!/bin/bash
# lan-control.sh

case "$1" in
    start)
        echo "🚀 Iniciando Large Magnum Master LAN..."
        ./startup-lan-pc.sh
        sleep 10
        ssh pi@192.168.1.100 "cd /home/pi/blockchain/magnumsmaster && ./startup-lan-pi.sh"
        ;;
    stop)
        echo "🛑 Deteniendo Large Magnum Master LAN..."
        ./shutdown-lan-pc.sh
        ssh pi@192.168.1.100 "cd /home/pi/blockchain/magnumsmaster && ./shutdown-lan-pi.sh"
        ;;
    status)
        ./monitor-lan.sh
        ;;
    test)
        ./sync-test.sh
        ./distributed-transaction-test.sh
        ;;
    *)
        echo "Uso: $0 {start|stop|status|test}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start  - Iniciar toda la red LAN"
        echo "  stop   - Detener toda la red LAN"
        echo "  status - Monitorear estado en tiempo real"
        echo "  test   - Ejecutar tests distribuidos"
        exit 1
        ;;
esac
```

### **📱 App móvil de monitoreo (HTML)**

```html
<!-- mobile-monitor.html -->
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>LMM LAN Monitor</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #1a1a1a; color: white; }
        .status { padding: 10px; margin: 5px; border-radius: 5px; }
        .online { background: #2d5a27; }
        .offline { background: #5a2727; }
        .stats { background: #2a2a2a; padding: 15px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>🍷 LMM LAN Monitor</h1>
    <div id="status"></div>
    <button onclick="updateStatus()">🔄 Actualizar</button>
    
    <script>
        async function updateStatus() {
            const nodes = [
                {name: 'Génesis (PC)', url: 'http://192.168.1.10:3000/blocks'},
                {name: 'P2P 2 (Pi)', url: 'http://192.168.1.100:3001/blocks'},
                {name: 'P2P 3 (Pi)', url: 'http://192.168.1.100:3002/blocks'},
                {name: 'CartoLMM', url: 'http://192.168.1.10:8080'}
            ];
            
            let html = '';
            for(let node of nodes) {
                try {
                    await fetch(node.url);
                    html += `<div class="status online">✅ ${node.name}: ONLINE</div>`;
                } catch(e) {
                    html += `<div class="status offline">❌ ${node.name}: OFFLINE</div>`;
                }
            }
            
            document.getElementById('status').innerHTML = html;
        }
        
        updateStatus();
        setInterval(updateStatus, 10000);
    </script>
</body>
</html>
```

---

## 🎯 **Checklist de Despliegue**

### **Preparación (Hacer una vez):**
- [ ] ✅ Configurar IPs estáticas
- [ ] ✅ Abrir puertos en firewall
- [ ] ✅ Instalar Node.js en todos los dispositivos
- [ ] ✅ Clonar/sincronizar código
- [ ] ✅ Crear scripts de automatización
- [ ] ✅ Configurar SSH entre dispositivos

### **Cada despliegue:**
- [ ] ✅ Verificar conectividad de red
- [ ] ✅ Iniciar PC Principal (Génesis + CartoLMM)
- [ ] ✅ Iniciar Raspberry Pi (P2P Nodes)
- [ ] ✅ Ejecutar tests de sincronización
- [ ] ✅ Verificar interfaces web
- [ ] ✅ Monitorear logs
- [ ] ✅ Test transacciones distribuidas

### **Testing completo:**
- [ ] ✅ Acceso desde múltiples clientes
- [ ] ✅ Creación de transacciones
- [ ] ✅ Minado distribuido
- [ ] ✅ Sincronización automática
- [ ] ✅ Tolerancia a fallos
- [ ] ✅ Reconexión automática

---

