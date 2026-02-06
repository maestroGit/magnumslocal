// app/controllers/adminController.js
import os from 'os';

// GET /system-info y /systemInfo
export async function getSystemInfo(req, res) {
  try {
    const info = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      uptime: os.uptime(),
      hostname: os.hostname(),
      networkInterfaces: os.networkInterfaces(),
      userInfo: os.userInfo(),
      loadavg: os.loadavg(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
      release: os.release(),
      type: os.type(),
      endianness: os.endianness(),
      nodeVersion: process.version,
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
      pid: process.pid,
      execPath: process.execPath,
      date: new Date().toISOString(),
    };
    res.json({ success: true, info });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo información del sistema',
      details: error.message,
    });
  }
}
