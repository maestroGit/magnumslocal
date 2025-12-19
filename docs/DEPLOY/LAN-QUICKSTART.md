# 🚀 Quick Start - Despliegue LAN

> **Guía rápida para desplegar BlocksWine en red local con Raspberry Pi + PC**

## 📦 **Pasos Rápidos**

### **1. Preparación Inicial (Solo una vez)**

#### **En PC Principal:**
```bash
# Verificar Node.js
node --version  # Debe ser 16+

# Abrir puertos en firewall (Windows)
netsh advfirewall firewall add rule name="LMM-Genesis" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="LMM-CartoLMM" dir=in action=allow protocol=TCP localport=8080

# Clonar/actualizar proyecto
git pull origin main
npm install
```

#### **En Raspberry Pi:**
```bash
# Instalar Node.js (si no está)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Configurar firewall
sudo ufw allow 3001
sudo ufw allow 3002

# Clonar proyecto
git clone https://github.com/maestroGit/magnumsmaster.git
cd magnumsmaster
npm install
```

### **2. Despliegue Rápido**

#### **Ejecutar en PC Principal:**
```bash
cd magnumsmaster
./startup-lan-pc.sh
```

#### **Ejecutar en Raspberry Pi:**
```bash
cd magnumsmaster
./startup-lan-pi.sh
```

### **3. Testing Inmediato**

#### **Desde cualquier dispositivo en la red:**
```bash
./test-lan-complete.sh
```

## 🎯 **URLs de Acceso**

Una vez desplegado, accede desde cualquier dispositivo:

- **Dashboard**: `http://IP_DEL_PC:3000`
- **Mapa Bodegas**: `http://IP_DEL_PC:8080`
- **API Génesis**: `http://IP_DEL_PC:3000/blocks`
- **API P2P Node 2**: `http://IP_DE_LA_PI:3001/blocks`
- **API P2P Node 3**: `http://IP_DE_LA_PI:3002/blocks`

## 🔧 **Comandos NPM**

```bash
# Gestión LAN
npm run lan:startup-pc    # Iniciar servicios en PC
npm run lan:startup-pi    # Iniciar servicios en Pi
npm run lan:shutdown-pc   # Detener servicios en PC
npm run lan:shutdown-pi   # Detener servicios en Pi
npm run lan:test         # Test completo de red

# Gestión local (single machine)
npm run startup:windows  # Iniciar todo localmente
npm run shutdown:windows # Detener todo localmente
npm run status          # Ver estado
```

## 🛠️ **Troubleshooting Rápido**

### **Problema: No conecta**
```bash
# Verificar IPs
ipconfig  # Windows
ifconfig  # Linux/Mac

# Test básico
ping IP_DEL_OTRO_DISPOSITIVO
curl http://IP_DEL_PC:3000/blocks
```

### **Problema: Puertos ocupados**
```bash
# Ver qué usa el puerto
netstat -an | findstr :3000  # Windows
lsof -i :3000              # Linux/Mac

# Forzar cierre
./shutdown-lan-pc.sh
./shutdown-lan-pi.sh
```

### **Problema: Firewall**
```bash
# Windows
netsh advfirewall firewall show rule name=all | findstr 3000

# Linux
sudo ufw status
```

## 📱 **Testing desde Móvil/Tablet**

1. Conectar dispositivo a la misma WiFi
2. Abrir navegador
3. Ir a: `http://IP_DEL_PC:3000`
4. ¡Listo! Blockchain funcionando en tu dispositivo móvil

## 🎉 **Arquitectura Final**

```
PC Principal (192.168.1.10)     Raspberry Pi (192.168.1.100)
├── Nodo Génesis :3000          ├── Nodo P2P 2 :3001
├── CartoLMM :8080              └── Nodo P2P 3 :3002
└── Dashboard Web               
                                
                Dispositivos Cliente
                ├── Móvil/Tablet
                ├── Laptop
                └── Otros PCs
```

---

**🍷 Del Terruño al Ciberespacio - Blockchain Distribuido 2025**

> Para la guía completa, consulta: [LAN-DEPLOYMENT-GUIDE.md](./LAN-DEPLOYMENT-GUIDE.md)