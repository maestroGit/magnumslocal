// app/controllers/systemController.js
import path from 'path';
import os from 'os';
import fs from 'fs';

// GET /system-info
export const getSystemInfo = async (req, res) => {
  try {
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const nodeVersion = process.version;
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const interfaces = os.networkInterfaces();
    const ips = Object.values(interfaces)
      .flat()
      .filter(net => net && net.family === "IPv4" && !net.internal)
      .map(net => net.address);

    // Blockchain info (mejorada con datos P2P reales)
    const p2pServer = global.p2pServer;
    const p2pConnections = p2pServer && Array.isArray(p2pServer.sockets) ? p2pServer.sockets.length : 0;
    const p2pPeers = p2pServer && Array.isArray(p2pServer.peers) ? p2pServer.peers.map(p => ({
      nodeId: p.nodeId,
      httpUrl: p.httpUrl,
      lastSeen: p.lastSeen
    })) : [];
    const networkStatus = p2pConnections > 0 ? 'connected' : 'standalone';
    const blockchainInfo = {
      server: {
        httpPort: process.env.HTTP_PORT || 6001,
        status: "running",
        uptime: process.uptime(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      },
      network: {
        pendingTransactions: global.tp ? global.tp.transactions.length : 0,
        p2pConnections,
        p2pPeers,
        networkStatus
      },
    };

    const systemInfo = {
      host: hostname,
      ips,
      interfaces,
      platform,
      architecture: arch,
      nodeVersion,
      freeMemory: freeMem,
      totalMemory: totalMem,
      cpuCores: cpuCount,
    };

    const completeInfo = {
      system: systemInfo,
      blockchain: blockchainInfo,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };

    res.json(completeInfo);
  } catch (error) {
    console.error("Error fetching system information:", error);
    res.status(500).json({
      error: "Error fetching system information",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /directory-contents
export const getDirectoryContents = async (req, res) => {
  try {
    const directoryPath = "./";
    const files = fs.readdirSync(directoryPath);
    res.json(files);
  } catch (error) {
    console.error("Error fetching directory contents:", error);
    res.status(500).json({ success: false, error: "Error fetching directory contents" });
  }
};
