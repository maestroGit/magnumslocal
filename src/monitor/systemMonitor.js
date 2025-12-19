"use strict";
// funciones necesarias para monitorizar el sistema operativo de los nodos. 
// Utilizar el módulo: os para obtener información del sistema.
import os from 'node:os';

class SystemMonitor {
  static getSystemInfo() {
    const nets = os.networkInterfaces();
    const interfaces = [];
    const ips = [];
    Object.keys(nets).forEach((name) => {
      for (const net of nets[name]) {
        const entry = {
          interface: name,
          address: net.address,
          family: net.family,
          mac: net.mac,
          internal: net.internal,
          cidr: net.cidr,
        };
        interfaces.push(entry);
        // Prefer non-internal IPv4 addresses for quick display
        if (!net.internal && net.family === 'IPv4') ips.push({ interface: name, address: net.address });
      }
    });

    return {
      hostName: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpuCores: os.cpus().length,
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      uptime: os.uptime(),
      network: {
        interfaces,
        ips: ips.length > 0 ? ips : interfaces.filter(i => i.family === 'IPv4').map(i => ({ interface: i.interface, address: i.address }))
      }
    };
  }

  static logSystemInfo() {
    const info = SystemMonitor.getSystemInfo();
    console.log("System Information:", info);
  }
}

export default SystemMonitor;

