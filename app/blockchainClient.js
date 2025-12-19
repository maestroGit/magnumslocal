// import https from 'https';
import http from 'http'; // módulo http de Node.js para realizar las solicitudes HTTP.
// NO REALIZADO !!!

// Servicio/utilidad que interactúa con los nodos de la red blockchain.
// Esta clase se encarga de encapsular la lógica para interactuar con los nodos de la red blockchain utilizando solicitudes HTTP/JSON-RPC.
// definición de la clase BlockchainClient que realiza la solicitud RPC.

class BlockchainClient {
  constructor(nodeUrl) {
    this.nodeUrl = new URL(nodeUrl); // El constructor toma una URL del nodo como parámetro y la almacena en this.nodeUrl
  }
  // Método para enviar una solicitud JSON-RPC
  // Entrada: El método sendRpcRequest toma dos parámetros: el método RPC que deseas llamar y los parámetros para esa llamada.
  // Salida: Retorna una Promesa que resolverá con el resultado de la solicitud RPC o se rechazará si hay un error.
  sendRpcRequest(method, params) {
    return new Promise((resolve, reject) => {
      // Preparar datos: Convierte la solicitud JSON-RPC en una cadena JSON.
      const data = JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: 1,
      });
  // Configurar opciones: Configura las opciones para la solicitud HTTP.
      const options = {
        hostname: this.nodeUrl.hostname,
        port: this.nodeUrl.port || 443, // Cambiar a 80 para HTTP
        path: this.nodeUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };
    // Enviar solicitud: Envía la solicitud HTTP y maneja la respuesta.
      const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve(result.result);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => reject(error));
      req.write(data);
      req.end();
    });
  }
}

export {BlockchainClient};


