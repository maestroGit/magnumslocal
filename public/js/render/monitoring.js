// Monitoring renderer (ESM)
// Exports: renderMonitoring()

import { safeModal, showModal, showToast } from '../ui/modals.js';
import { fetchData } from '../core/api.js';

export async function renderMonitoring() {
  try {
    showToast && showToast('Fetching system info...', 'info');
    const systemInfo = await fetchData('/system-info');
    if (systemInfo.error) {
      showModal && showModal(`Error fetching system info: ${systemInfo.error}`, 'System Error');
      showToast && showToast('Error fetching system info', 'error');
      return;
    }

    const formatUptime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${hours}h ${minutes}m ${secs}s`;
    };
    const formatDate = (timestamp) => timestamp ? new Date(timestamp).toLocaleString() : 'N/A';

    const networkInfo = systemInfo.blockchain?.network || {};
    const p2pConnections = typeof networkInfo.p2pConnections === 'number' ? networkInfo.p2pConnections : 0;
    const p2pPeersRaw = Array.isArray(networkInfo.p2pPeers) ? networkInfo.p2pPeers : [];

    const peersDetailed = p2pPeersRaw.map((peer, index) => {
      const nodeId =
        typeof peer?.nodeId === 'string' && peer.nodeId.trim().length > 0
          ? peer.nodeId.trim()
          : `peer-${index + 1}`;
      const httpUrl =
        typeof peer?.httpUrl === 'string' && peer.httpUrl.trim().length > 0
          ? peer.httpUrl.trim()
          : null;
      let host = null;
      if (httpUrl) {
        try {
          host = new URL(httpUrl).hostname;
        } catch {
          host = null;
        }
      }

      return {
        nodeId,
        httpUrl,
        host,
        lastSeen: peer?.lastSeen || null,
      };
    });

    const uniquePeersDetailed = [];
    const seenPeerKeys = new Set();
    for (const peer of peersDetailed) {
      const key = `${peer.nodeId}|${peer.httpUrl || peer.host || 'unknown'}`;
      if (!seenPeerKeys.has(key)) {
        uniquePeersDetailed.push(peer);
        seenPeerKeys.add(key);
      }
    }

    const mismatchP2P = p2pConnections !== uniquePeersDetailed.length;

    const monitoringModalContent = `
      <div class="modal-info" style="max-height:60vh;overflow-y:auto;padding-right:8px;box-sizing:border-box;">
        <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
        <div class="modal-body">
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🌐 Server</h3>
            <ul class="monitor-list">
              <li><strong>HTTP Port:</strong> ${systemInfo.blockchain?.server?.httpPort || 'N/A'}</li>
              <li><strong>P2P Port:</strong> ${systemInfo.blockchain?.server?.p2pPort || 'N/A'}</li>
              <li><strong>URL:</strong> <a href="${systemInfo.blockchain?.server?.httpUrl || '#'}" target="_blank" class="monitor-link">${systemInfo.blockchain?.server?.httpUrl || 'N/A'}</a></li>
              <li><strong>Uptime:</strong> ${formatUptime(systemInfo.blockchain?.server?.uptime || 0)}</li>
              <li><strong>Started:</strong> ${formatDate(systemInfo.blockchain?.server?.startTime)}</li>
                <li><strong>Blockchain Storage:</strong> ${systemInfo.blockchain?.server?.blockchainStorageBytes || 'N/A'} bytes (${systemInfo.blockchain?.server?.blockchainStorageMB || 'N/A'} MB)</li>
            </ul>
          </div>
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🌍 P2P Network</h3>
            <ul class="monitor-list">
              <li><strong>Status:</strong> <span class="${systemInfo.blockchain?.network?.networkStatus === 'connected' ? 'status-online' : 'status-standalone'}">${systemInfo.blockchain?.network?.networkStatus === 'connected' ? '🔗 Connected' : '🔍 Standalone'}</span></li>
              <li><strong>Active Connections:</strong> ${p2pConnections}</li>
              <li><strong>Peers:</strong> ${uniquePeersDetailed.length}</li>
              <li><strong>Peer Details:</strong></li>
              <li class="monitor-sublist">
                ${uniquePeersDetailed.length
                  ? `<ul style="margin-left:12px">${uniquePeersDetailed
                      .map(
                        (peer) => `
                          <li style="margin-bottom:6px">
                            <strong>${peer.nodeId}</strong><br>
                            <strong>Host/IP:</strong> ${peer.host || 'N/A'}<br>
                            <strong>HTTP:</strong> ${peer.httpUrl ? `<a href="${peer.httpUrl}" target="_blank" class="monitor-link">${peer.httpUrl}</a>` : 'N/A'}<br>
                            <strong>Last Seen:</strong> ${formatDate(peer.lastSeen)}
                          </li>
                        `
                      )
                      .join('')}</ul>`
                  : 'N/A'}
              </li>
              ${mismatchP2P
                ? `<li><strong>Alert:</strong> <span style="color:#f59e0b">⚠️ Detail mismatch ${uniquePeersDetailed.length}/${p2pConnections}</span></li>`
                : ''}
            </ul>
          </div>
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🖥️ System</h3>
            <ul class="monitor-list">
              <li><strong>Host:</strong> ${systemInfo.system?.host || 'N/A'}</li>
              <li><strong>IPs:</strong> ${(systemInfo.system?.ips?.length ? systemInfo.system.ips.join(', ') : 'N/A')}</li>
              <li><strong>Interfaces:</strong></li>
              <li class="monitor-sublist">${
                systemInfo.system?.interfaces
                  ? Object.entries(systemInfo.system.interfaces)
                      .map(([iface, addrs]) => `
                        <details style="margin-bottom:4px">
                          <summary><strong>${iface}</strong></summary>
                          <ul style="margin-left:12px">
                            ${addrs.map(addr => `
                              <li>
                                <strong>Address:</strong> ${addr.address}<br>
                                <strong>Family:</strong> ${addr.family}<br>
                                <strong>MAC:</strong> ${addr.mac}<br>
                                <strong>Internal:</strong> ${addr.internal ? 'Yes' : 'No'}<br>
                                <strong>Netmask:</strong> ${addr.netmask}<br>
                                <strong>CIDR:</strong> ${addr.cidr}<br>
                                ${addr.scopeid !== undefined ? `<strong>ScopeId:</strong> ${addr.scopeid}<br>` : ''}
                              </li>
                            `).join('')}
                          </ul>
                        </details>
                      `).join('')
                  : 'N/A'
              }</li>
              <li><strong>Platform:</strong> ${systemInfo.system?.platform || 'N/A'}</li>
              <li><strong>Architecture:</strong> ${systemInfo.system?.architecture || 'N/A'}</li>
              <li><strong>Node.js:</strong> ${systemInfo.system?.nodeVersion || 'N/A'}</li>
              <li><strong>Free Memory:</strong> ${typeof systemInfo.system?.freeMemory === 'number' ? (systemInfo.system.freeMemory / (1024*1024)).toFixed(2) + ' MB' : 'N/A'}</li>
              <li><strong>Total Memory:</strong> ${typeof systemInfo.system?.totalMemory === 'number' ? (systemInfo.system.totalMemory / (1024*1024)).toFixed(2) + ' MB' : 'N/A'}</li>
              <li><strong>CPU cores:</strong> ${systemInfo.system?.cpuCores || 'N/A'}</li>
              <li><strong>Version:</strong> ${systemInfo.version || '1.0.0'}</li>
            </ul>
          </div>
        </div>
      </div>`;

  safeModal('System', monitoringModalContent);

    showToast && showToast('System information loaded', 'success');
  } catch (error) {
    showModal && showModal(`Connection error: ${error.message}`, 'Network Error');
    showToast && showToast('Connection error', 'error');
  }
}
