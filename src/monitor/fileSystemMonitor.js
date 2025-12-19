"use strict";

import fs from 'fs';
import path from 'path';

class FileSystemMonitor {
  static async listFilesInDirectory(directoryPath) {
    try {
      // Verificar si se tiene acceso al directorio
      await fs.access(directoryPath, fs.constants.R_OK, (err) => {
        if (err) {
          console.error(`No se tiene permiso para leer el directorio ${directoryPath}:`, err);
        } else {
          console.log(`Permisos de lectura confirmados para el directorio ${directoryPath}`);
        }
      });

      const files = await fs.promises.readdir(directoryPath);
      return files.map(file => {
        return path.join(directoryPath, file);
      });
    } catch (err) {
      console.error(`Error reading directory ${directoryPath}:`, err);
    }
  }

  static async logDirectoryContents(directoryPath) {
    const files = await FileSystemMonitor.listFilesInDirectory(directoryPath);
    console.log(`Contents of ${directoryPath}:`, files);
  }
}

// // Ejemplo de uso
// (async () => {
//   await FileSystemMonitor.logDirectoryContents('/path/to/directory');
// })();

export default FileSystemMonitor;




