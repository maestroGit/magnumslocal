// Monitoring renderer (ESM)
// Exports: renderMonitoring()

import { safeModal, showModal, showToast } from '../ui/modals.js';
import { fetchData } from '../core/api.js';

export async function renderMonitoring() {
  try {
    showToast && showToast('Fetching system info...', 'info');
    const systemInfo = await fetchData('/system-info');
    if (systemInfo.error) {
      showModal && showModal(`Error al obtener información del sistema: ${systemInfo.error}`, 'System Error');
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

    const monitoringModalContent = `
      <div class="modal-info" style="max-height:60vh;overflow-y:auto;padding-right:8px;box-sizing:border-box;">
        <p><strong>🖥️ System Monitor</strong></p>
        <p><strong>Status:</strong> <span class="status-online">● Online</span></p>
        <p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
        <div class="modal-body">
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🌐 Server</h3>
            <ul class="monitor-list">
              <li><strong>HTTP Port:</strong> ${systemInfo.blockchain?.server?.httpPort || 'N/A'}</li>
              <li><strong>P2P Port:</strong> ${systemInfo.blockchain?.server?.p2pPort || 'N/A'}</li>
              <li><strong>URL:</strong> <a href="${systemInfo.blockchain?.server?.httpUrl || '#'}" target="_blank" class="monitor-link">${systemInfo.blockchain?.server?.httpUrl || 'N/A'}</a></li>
              <li><strong>Uptime:</strong> ${formatUptime(systemInfo.blockchain?.server?.uptime || 0)}</li>
              <li><strong>Started:</strong> ${formatDate(systemInfo.blockchain?.server?.startTime)}</li>
            </ul>
          </div>
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🌍 P2P Network</h3>
            <ul class="monitor-list">
              <li><strong>Status:</strong> <span class="${systemInfo.blockchain?.network?.networkStatus === 'connected' ? 'status-online' : 'status-standalone'}">${systemInfo.blockchain?.network?.networkStatus === 'connected' ? '🔗 Connected' : '🔍 Standalone'}</span></li>
              <li><strong>Active Connections:</strong> ${systemInfo.blockchain?.network?.p2pConnections || 0}</li>
              <li><strong>Peers:</strong> ${systemInfo.blockchain?.network?.p2pPeers?.length || 0}</li>
            </ul>
          </div>
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🖥️ System</h3>
            <ul class="monitor-list">
              <li><strong>Host:</strong> ${systemInfo.hostName || 'N/A'}</li>
              <li><strong>IPs:</strong> ${(systemInfo.network?.ips?.length ? systemInfo.network.ips.map(i => `${i.interface}: ${i.address}`).join(' | ') : 'N/A')}</li>
              <li><strong>Interfaces:</strong></li>
              <li class="monitor-sublist">${(systemInfo.network?.interfaces ? '<ul class="monitor-subitems">' + systemInfo.network.interfaces.map(it => `<li><strong>${it.interface}</strong> ${it.family} ${it.address} ${it.internal ? '(internal)' : ''}</li>`).join('') + '</ul>' : 'N/A')}</li>
              <li><strong>Platform:</strong> ${systemInfo.platform || 'N/A'}</li>
              <li><strong>Architecture:</strong> ${systemInfo.arch || 'N/A'}</li>
              <li><strong>Node.js:</strong> ${systemInfo.nodeVersion || 'N/A'}</li>
              <li><strong>Free Memory:</strong> ${systemInfo.freeMemory ? Math.round(systemInfo.freeMemory/1024/1024) + ' MB' : 'N/A'}</li>
              <li><strong>CPU cores:</strong> ${systemInfo.cpus || 'N/A'}</li>
              <li><strong>Version:</strong> ${systemInfo.version || '1.0.0'}</li>
            </ul>
          </div>
        </div>
      </div>`;

  safeModal('Monitor del Sistema', monitoringModalContent);

    showToast && showToast('System information loaded', 'success');
  } catch (error) {
    showModal && showModal(`Connection error: ${error.message}`, 'Network Error');
    showToast && showToast('Connection error', 'error');
  }
}
