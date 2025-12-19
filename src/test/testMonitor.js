import SystemMonitor from '../monitor/systemMonitor.js';
import FileSystemMonitor from '../monitor/fileSystemMonitor.js';

// Probar la clase SystemMonitor
console.log("---- Información del Sistema ----");
SystemMonitor.logSystemInfo();

// Probar la clase FileSystemMonitor
const testDirectory = './';
console.log(`\n---- Contenido del Directorio ${testDirectory} ----`);
FileSystemMonitor.logDirectoryContents(testDirectory);

