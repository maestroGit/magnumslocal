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
    const pendingSockets = Array.isArray(networkInfo.pendingSockets) ? networkInfo.pendingSockets : [];

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
        role: peer?.role || 'secondary',
        blockHeight: typeof peer?.blockHeight === 'number' ? peer.blockHeight : null,
        mempoolCount: typeof peer?.mempoolCount === 'number' ? peer.mempoolCount : null,
        latencyMs: typeof peer?.latencyMs === 'number' ? peer.latencyMs : null,
        direction: peer?.direction || 'unknown',
        remoteAddress: peer?.remoteAddress || host,
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
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h3 class="monitor-title" style="margin:0;">🌍 P2P Network</h3>
              ${networkInfo.role ? `<span style="background:#3b82f6; color:#fff; font-size:11px; padding:2px 8px; border-radius:4px; text-transform:uppercase; font-weight:600;">${networkInfo.role}</span>` : ''}
            </div>
            <ul class="monitor-list">
              <li><strong>Status:</strong> <span class="${systemInfo.blockchain?.network?.networkStatus === 'connected' ? 'status-online' : 'status-standalone'}">${systemInfo.blockchain?.network?.networkStatus === 'connected' ? '🔗 Connected' : '🔍 Standalone'}</span></li>
              <li><strong>Node ID:</strong> ${networkInfo.nodeId || 'N/A'}</li>
              <li><strong>Local Chain:</strong> ${typeof networkInfo.blockHeight === 'number' ? `${networkInfo.blockHeight} blocks` : 'N/A'}</li>
              <li><strong>Local Mempool:</strong> ${typeof networkInfo.pendingTransactions === 'number' ? `${networkInfo.pendingTransactions} txs` : 'N/A'}</li>
              <li><strong>Active Connections:</strong> ${p2pConnections}</li>
              <li><strong>Identified Peers:</strong> ${uniquePeersDetailed.length}</li>
              <li><strong>Peer Details:</strong></li>
              <li class="monitor-sublist">
                ${uniquePeersDetailed.length
                  ? `<ul style="margin-left:12px; list-style:none; padding-left:0;">${uniquePeersDetailed
                      .map(
                        (peer) => `
                          <li style="margin-bottom:8px; padding:8px; background:rgba(255,255,255,0.04); border-radius:6px; border-left:3px solid #10b981;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                              <strong>🟢 ${peer.nodeId}</strong>
                              <span style="font-size:10px; background:#1e40af; color:#fff; padding:1px 6px; border-radius:3px; text-transform:uppercase;">${peer.role}</span>
                            </div>
                            <div style="font-size:12px; margin-top:4px; line-height:1.5;">
                              <strong>Connection:</strong> ${peer.direction.toUpperCase()} (${peer.remoteAddress || peer.host || 'N/A'})${peer.latencyMs !== null ? ` • ⚡ ${peer.latencyMs}ms` : ''}<br>
                              <strong>HTTP:</strong> ${peer.httpUrl ? `<a href="${peer.httpUrl}" target="_blank" class="monitor-link">${peer.httpUrl}</a>` : 'N/A'}<br>
                              <strong>Chain:</strong> ${peer.blockHeight !== null ? `${peer.blockHeight} blocks` : 'N/A'} • <strong>Mempool:</strong> ${peer.mempoolCount !== null ? `${peer.mempoolCount} txs` : 'N/A'}<br>
                              <strong>Last Seen:</strong> ${formatDate(peer.lastSeen)}
                            </div>
                          </li>
                        `
                      )
                      .join('')}</ul>`
                  : '<span style="color:#94a3b8">No identified peers</span>'}
              </li>
              ${pendingSockets.length > 0
                ? `
                  <li style="margin-top:6px;"><strong>Pending Handshake Sockets (${pendingSockets.length}):</strong></li>
                  <li class="monitor-sublist">
                    <ul style="margin-left:12px; list-style:none; padding-left:0;">
                      ${pendingSockets.map(s => `
                        <li style="font-size:12px; margin-bottom:4px; color:#cbd5e1;">
                          ⚪ <strong>${s.id}:</strong> ${s.direction} (${s.remoteAddress}) - <em>${s.readyState}</em>
                        </li>
                      `).join('')}
                    </ul>
                  </li>
                `
                : ''}
              ${mismatchP2P && pendingSockets.length === 0
                ? `<li><strong>Notice:</strong> <span style="color:#f59e0b">⚠️ ${uniquePeersDetailed.length} identified of ${p2pConnections} active connections</span></li>`
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
