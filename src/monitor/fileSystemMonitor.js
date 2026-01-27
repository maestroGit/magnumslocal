"use strict";

import fs from 'fs';
import path from 'path';

class FileSystemMonitor {
  /**
   * Calcula el tamaño total (en bytes) de todos los archivos en un directorio.
   * @param {string} directoryPath
   * @returns {Promise<number>} tamaño total en bytes
   */
  static async getDirectorySize(directoryPath) {
    try {
      const files = await fs.promises.readdir(directoryPath);
      let totalSize = 0;
      for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const stat = await fs.promises.stat(filePath);
        if (stat.isFile()) {
          totalSize += stat.size;
        }
      }
      return totalSize;
    } catch (err) {
      console.error(`Error calculating directory size for ${directoryPath}:`, err);
      return 0;
    }
  }
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




