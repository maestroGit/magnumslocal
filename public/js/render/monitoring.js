// Monitoring renderer (ESM)
// Exports: renderMonitoring()

import { safeModal, showModal, showToast } from '../ui/modals.js';
import { fetchData } from '../core/api.js';

export async function renderMonitoring() {
  try {
    showToast && showToast('Consultando sistema...', 'info');
    const systemInfo = await fetchData('/system-info');
    if (systemInfo.error) {
      showModal && showModal(`Error al obtener información del sistema: ${systemInfo.error}`, 'Error del Sistema');
      showToast && showToast('Error en consulta del sistema', 'error');
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
        <p><strong>🖥️ Monitor del Sistema Blockchain</strong></p>
        <p><strong>Estado:</strong> <span class="status-online">● Online</span></p>
        <p><strong>Última actualización:</strong> ${new Date().toLocaleString()}</p>
        <div class="modal-body">
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🌐 Servidor</h3>
            <ul class="monitor-list">
              <li><strong>Puerto HTTP:</strong> ${systemInfo.blockchain?.server?.httpPort || 'N/A'}</li>
              <li><strong>Puerto P2P:</strong> ${systemInfo.blockchain?.server?.p2pPort || 'N/A'}</li>
              <li><strong>URL:</strong> <a href="${systemInfo.blockchain?.server?.httpUrl || '#'}" target="_blank" class="monitor-link">${systemInfo.blockchain?.server?.httpUrl || 'N/A'}</a></li>
              <li><strong>Tiempo activo:</strong> ${formatUptime(systemInfo.blockchain?.server?.uptime || 0)}</li>
              <li><strong>Iniciado:</strong> ${formatDate(systemInfo.blockchain?.server?.startTime)}</li>
            </ul>
          </div>
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🌍 Red P2P</h3>
            <ul class="monitor-list">
              <li><strong>Estado:</strong> <span class="${systemInfo.blockchain?.network?.networkStatus === 'connected' ? 'status-online' : 'status-standalone'}">${systemInfo.blockchain?.network?.networkStatus === 'connected' ? '🔗 Conectado' : '🔍 Standalone'}</span></li>
              <li><strong>Conexiones activas:</strong> ${systemInfo.blockchain?.network?.p2pConnections || 0}</li>
              <li><strong>Peers:</strong> ${systemInfo.blockchain?.network?.p2pPeers?.length || 0}</li>
            </ul>
          </div>
          <div class="monitor-card" style="min-width:0;word-break:break-word;">
            <h3 class="monitor-title">🖥️ Sistema</h3>
            <ul class="monitor-list">
              <li><strong>Host:</strong> ${systemInfo.hostName || 'N/A'}</li>
              <li><strong>IPs:</strong> ${(systemInfo.network?.ips?.length ? systemInfo.network.ips.map(i => `${i.interface}: ${i.address}`).join(' | ') : 'N/A')}</li>
              <li><strong>Interfaces:</strong></li>
              <li class="monitor-sublist">${(systemInfo.network?.interfaces ? '<ul class="monitor-subitems">' + systemInfo.network.interfaces.map(it => `<li><strong>${it.interface}</strong> ${it.family} ${it.address} ${it.internal ? '(internal)' : ''}</li>`).join('') + '</ul>' : 'N/A')}</li>
              <li><strong>Plataforma:</strong> ${systemInfo.platform || 'N/A'}</li>
              <li><strong>Arquitectura:</strong> ${systemInfo.arch || 'N/A'}</li>
              <li><strong>Node.js:</strong> ${systemInfo.nodeVersion || 'N/A'}</li>
              <li><strong>Memoria libre:</strong> ${systemInfo.freeMemory ? Math.round(systemInfo.freeMemory/1024/1024) + ' MB' : 'N/A'}</li>
              <li><strong>CPU cores:</strong> ${systemInfo.cpus || 'N/A'}</li>
              <li><strong>Versión:</strong> ${systemInfo.version || '1.0.0'}</li>
            </ul>
          </div>
        </div>
      </div>`;

  safeModal('Monitor del Sistema', monitoringModalContent);

    showToast && showToast('Información del sistema cargada', 'success');
  } catch (error) {
    showModal && showModal(`Error de conexión: ${error.message}`, 'Error de Red');
    showToast && showToast('Error de conexión', 'error');
  }
}
