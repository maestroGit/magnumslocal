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

    // Blockchain info (mejorada con datos P2P reales y metadata)
    const p2pServer = global.p2pServer;
    const p2pConnections = p2pServer && Array.isArray(p2pServer.sockets) ? p2pServer.sockets.length : 0;
    const p2pPeers = p2pServer && Array.isArray(p2pServer.peers) ? p2pServer.peers.map(p => ({
      nodeId: p.nodeId,
      role: p.role || 'secondary',
      blockHeight: p.blockHeight ?? null,
      mempoolCount: p.mempoolCount ?? null,
      direction: p.direction || p.socket?.direction || 'unknown',
      remoteAddress: p.remoteAddress || p.socket?.remoteAddress || null,
      latencyMs: p.socket?.latencyMs ?? null,
      httpUrl: p.httpUrl,
      lastSeen: p.lastSeen
    })) : [];

    // Identificar sockets activos que aún no han completado el handshake (anónimos o pendientes)
    const peerSockets = new Set(p2pServer?.peers?.map(p => p.socket) || []);
    const pendingSockets = p2pServer && Array.isArray(p2pServer.sockets)
      ? p2pServer.sockets
          .filter(s => !peerSockets.has(s))
          .map((s, idx) => ({
            id: `socket-${idx + 1}`,
            direction: s.direction || 'unknown',
            remoteAddress: s.remoteAddress || s.peerUrl || '(desconocido)',
            readyState: s.readyState === 1 ? 'OPEN' : (s.readyState === 0 ? 'CONNECTING' : 'CLOSING')
          }))
      : [];

    const networkStatus = p2pConnections > 0 ? 'connected' : 'standalone';
    const blockchainInfo = {
      server: {
        httpPort: process.env.HTTP_PORT || 6001,
        status: "running",
        uptime: process.uptime(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      },
      network: {
        nodeId: process.env.NODE_ID || process.env.NODE_NAME || 'node-local',
        role: process.env.ROLE || (p2pConnections > 0 ? 'node' : 'standalone'),
        blockHeight: global.bc?.chain?.length || 0,
        pendingTransactions: global.tp ? global.tp.transactions.length : 0,
        p2pConnections,
        p2pPeers,
        pendingSockets,
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

// GET /peers
export const getPeers = async (req, res) => {
  try {
    const p2pServer = global.p2pServer;
    const bc = global.bc;
    const tp = global.tp;

    const totalSockets = p2pServer?.sockets?.length || 0;
    const peersList = p2pServer?.peers || [];
    const chainLength = bc?.chain?.length || 0;
    const mempoolCount = tp?.transactions?.length || 0;
    const nodeId = process.env.NODE_ID || process.env.NODE_NAME || 'node-local';
    const role = process.env.ROLE || (totalSockets > 0 ? 'node' : 'standalone');

    const peerSockets = new Set(peersList.map(p => p.socket));
    const pendingSockets = p2pServer && Array.isArray(p2pServer.sockets)
      ? p2pServer.sockets
          .filter(s => !peerSockets.has(s))
          .map((s, idx) => ({
            id: `socket-${idx + 1}`,
            direction: s.direction || 'unknown',
            remoteAddress: s.remoteAddress || s.peerUrl || '(desconocido)',
            readyState: s.readyState === 1 ? 'OPEN' : (s.readyState === 0 ? 'CONNECTING' : 'CLOSING')
          }))
      : [];

    const enrichedPeers = peersList.map(p => ({
      nodeId: p.nodeId,
      role: p.role || 'secondary',
      blockHeight: p.blockHeight ?? null,
      mempoolCount: p.mempoolCount ?? null,
      direction: p.direction || p.socket?.direction || 'unknown',
      remoteAddress: p.remoteAddress || p.socket?.remoteAddress || null,
      latencyMs: p.socket?.latencyMs ?? null,
      httpUrl: p.httpUrl,
      lastSeen: p.lastSeen
    }));

    // Si se consulta por API o curl (no pide text/html):
    if (req.headers.accept && !req.headers.accept.includes('text/html')) {
      return res.json({
        nodeId,
        role,
        blockHeight: chainLength,
        mempoolCount,
        totalSockets,
        peersCount: enrichedPeers.length,
        peers: enrichedPeers,
        pendingSockets
      });
    }

    // Si entra con un navegador: Vista visual rápida con auto-refresh
    const peersHtml = enrichedPeers.length > 0
      ? enrichedPeers.map(p => `
          <div style="background:#1e293b; padding:14px; border-radius:8px; margin-bottom:10px; border-left:4px solid #10b981;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:16px; color:#f8fafc;">🟢 ${p.nodeId}</strong>
              <span style="background:#3b82f6; color:#fff; font-size:11px; padding:2px 8px; border-radius:4px; text-transform:uppercase;">${p.role}</span>
            </div>
            <div style="color:#94a3b8; font-size:13px; margin-top:6px; line-height:1.5;">
              <strong>Conexión:</strong> ${p.direction.toUpperCase()} (${p.remoteAddress || 'N/A'})${p.latencyMs !== null ? ` • ⚡ ${p.latencyMs}ms` : ''}<br>
              <strong>HTTP:</strong> ${p.httpUrl ? `<a href="${p.httpUrl}" target="_blank" style="color:#38bdf8;">${p.httpUrl}</a>` : 'N/A'}<br>
              <strong>Cadena:</strong> ${p.blockHeight !== null ? `${p.blockHeight} bloques` : 'N/A'} • <strong>Mempool:</strong> ${p.mempoolCount !== null ? `${p.mempoolCount} txs` : 'N/A'}<br>
              <strong>Última señal:</strong> ${p.lastSeen ? new Date(p.lastSeen).toLocaleTimeString() : 'Reciente'}
            </div>
          </div>
        `).join('')
      : `<div style="background:#1e293b; padding:14px; border-radius:8px; color:#94a3b8;">⚠️ No hay peers identificados (Sockets abiertos: ${totalSockets})</div>`;

    const pendingHtml = pendingSockets.length > 0
      ? `<h4 style="color:#f59e0b; margin-top:20px; font-size:14px;">⚠️ Sockets Pendientes de Handshake (${pendingSockets.length})</h4>
         ${pendingSockets.map(s => `
           <div style="background:#1e293b; padding:10px; border-radius:6px; margin-bottom:6px; font-size:12px; color:#cbd5e1; border-left:3px solid #f59e0b;">
             ⚪ <strong>${s.id}:</strong> ${s.direction} (${s.remoteAddress}) - Estado: <em>${s.readyState}</em>
           </div>
         `).join('')}`
      : '';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>P2P Peers - ${nodeId}</title>
        <meta http-equiv="refresh" content="5">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0f172a; color:#f8fafc; padding:20px; max-width:800px; margin:0 auto; }
          .card { background:#1e293b; padding:16px; border-radius:10px; margin-bottom:20px; }
          .badge { background:#10b981; color:#fff; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:600; text-transform:uppercase; }
          .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-top:14px; }
          .stat { background:#0f172a; padding:10px; border-radius:6px; text-align:center; }
          .stat-val { font-size:20px; font-weight:bold; color:#38bdf8; }
          .stat-lbl { font-size:11px; color:#64748b; text-transform:uppercase; margin-top:2px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="margin:0; font-size:20px;">🌐 ${nodeId} <span class="badge">${role}</span></h2>
            <span style="font-size:12px; color:#64748b;">Auto-refresh: 5s</span>
          </div>
          <div class="grid">
            <div class="stat"><div class="stat-val">${totalSockets}</div><div class="stat-lbl">Sockets Activos</div></div>
            <div class="stat"><div class="stat-val">${enrichedPeers.length}</div><div class="stat-lbl">Peers Identificados</div></div>
            <div class="stat"><div class="stat-val">${chainLength}</div><div class="stat-lbl">Bloques Locales</div></div>
            <div class="stat"><div class="stat-val">${mempoolCount}</div><div class="stat-lbl">Mempool Local</div></div>
          </div>
        </div>
        <h3 style="font-size:16px; margin-bottom:12px; color:#cbd5e1;">Peers Conectados</h3>
        ${peersHtml}
        ${pendingHtml}
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error fetching peers:", error);
    res.status(500).json({ error: "Error fetching peers", details: error.message });
  }
};

