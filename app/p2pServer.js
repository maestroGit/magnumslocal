"use strict";

import WebSocket, { WebSocketServer } from "ws";
import os from "os";
import fs from "fs";
import https from "https";
import natUpnp from "nat-upnp";

// Utilidad: obtiene la primera IP externa IPv4 disponible (no interna)
const getLocalExternalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
};

// Tipos de mensajes utilizados en la red P2P
const MESSAGE_TYPES = {
  chain: "CHAIN",
  transaction: "TRANSACTION",
  clear_transactions: "CLEAR_TRANSACTIONS",
  handshake: "HANDSHAKE_HTTP_URL",
};

const P2P_PORT = process.env.P2P_PORT || 5001;

// Clase que representa el servidor P2P
class P2PServer {
  constructor(blockchain, transactionsPool) {
    this.blockchain = blockchain;
    this.transactionsPool = transactionsPool;
    this.sockets = [];   // Sockets conectados (WebSocket)
    this.peers = [];     // Lista de peers enriquecida: [{ socket, nodeId, httpUrl, lastSeen }]
    // Propiedades para UPnP
    this.upnpClient = null;
    this.upnpMapping = null;
    // Leer peers desde process.env.PEERS en el momento de instanciar la clase
    console.log("[DEBUG][P2PServer] process.env.PEERS:", process.env.PEERS);
    this.peersEnv = process.env.PEERS && process.env.PEERS.trim()
      ? process.env.PEERS.split(",").filter((peer) => peer.trim())
      : [];
    console.log("[DEBUG][P2PServer] peersEnv:", this.peersEnv);
  }

  // Inicia el servidor WebSocket y se conecta a los peers definidos
  listen = (httpServer) => {
    // Si se pasa un servidor HTTP, adjunta el WebSocketServer a ese servidor (misma raíz)
    let wss;
    if (httpServer) {
      wss = new WebSocketServer({ server: httpServer });
      console.log("🚀 WebSocketServer adjuntado al servidor HTTP (misma raíz)");
    } else {
      wss = new WebSocketServer({ port: P2P_PORT, host: "0.0.0.0" });
      console.log(`🚀 WebSocketServer escuchando en puerto: ${P2P_PORT}`);
    }
    wss.on("connection", (socket, req) => {
      const remoteAddr = req?.socket?.remoteAddress || "(desconocida)";
      console.log("🔗 Nueva conexión entrante al relay desde:", remoteAddr);
      console.log("🔗 Headers de la conexión:", req?.headers);
      this.connectSocket(socket);
    });
    wss.on("error", (err) => {
      console.error("❌ Error en WebSocketServer (relay):", err);
    });

    // Intenta abrir puerto con UPnP (no bloqueante)
    if (process.env.ENABLE_UPNP !== "false") {
      this.setupUPnP().catch(err => {
        console.warn("⚠️ UPnP: Error silencioso durante setup:", err.message);
      });
    }

    console.log("[P2P][DEBUG] Llamando a connectToPeers() con peersEnv:", this.peersEnv);
    this.connectToPeers();
  };

  // Conecta este nodo a cada peer definido en la configuración
  connectToPeers = () => {
    console.log("[P2P][DEBUG] connectToPeers() ejecutado. peersEnv:", this.peersEnv);
    if (this.peersEnv.length === 0) {
      console.log("🔗 Sin peers configurados - Nodo Genesis.");
      return;
    }

    this.peersEnv.forEach((peerUrl) => {
      const cleanPeer = peerUrl.trim();
      if (!cleanPeer) {
        console.warn(`[P2P][DEBUG] Peer vacío ignorado: "${peerUrl}"`);
        return;
      }
      console.log(`[P2P][DEBUG] Intentando conectar a peer: ${cleanPeer}`);

      try {
        const socket = new WebSocket(cleanPeer);

        socket.on("open", () => {
          console.log(`[P2P][DEBUG] ✅ Conectado exitosamente a peer: ${cleanPeer}`);
          this.connectSocket(socket);
        });

        // Log detallado en caso de error en el socket cliente
        socket.on("error", (error) => {
          console.error("[P2P][DEBUG][ERROR][Cliente] Socket error al conectar a peer:", {
            peer: cleanPeer,
            message: error.message,
            stack: error.stack,
            socketReadyState: socket.readyState
          });
          console.log(
            `[P2P][DEBUG] 🔄 Reintentando conexión a ${cleanPeer} en 5 segundos...`
          );
          setTimeout(() => {
            this.connectToPeers();
          }, 5000);
        });

        // Log detallado en caso de cierre de la conexión desde el cliente
        socket.on("close", (code, reason) => {
          console.warn("[P2P][DEBUG][CLOSE][Cliente] Socket cerrado por el peer:", {
            peer: cleanPeer,
            code,
            reason: reason ? reason.toString() : undefined,
            socketReadyState: socket.readyState
          });
        });
      } catch (error) {
        console.warn(
          `[P2P][DEBUG] ❌ Error creando WebSocket para ${cleanPeer}: ${error.message}`
        );
      }
    });
  };

  // Conecta y registra un nuevo socket, anuncia handshake, y limpia al desconectar
  connectSocket = (socket) => {
    this.sockets.push(socket);

    // Handshake: anuncia la URL HTTP propia a este peer
    const HTTP_PORT = process.env.HTTP_PORT || 3001;
    const NODE_ID =
      process.env.NODE_ID || "node_" + Math.round(Math.random() * 10000);
    const httpUrl = `http://${getLocalExternalIP()}:${HTTP_PORT}`;

    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPES.handshake,
        nodeId: NODE_ID,
        httpUrl: httpUrl,
        timestamp: Date.now(),
      })
    );

    console.log("[+] Socket connected (relay)");


    // Log de cada mensaje recibido en el relay
    socket.on("message", (message) => {
      console.log("[WS] Mensaje recibido en relay:", message);
    });
    this.messageHandler(socket);

    // Limpia el peer cuando se cierra la conexión
    socket.on("close", () => {
      const pi = this.peers.findIndex((p) => p.socket === socket);
      if (pi >= 0) this.peers.splice(pi, 1);
      this.sockets = this.sockets.filter((s) => s !== socket);
      console.log("[-] Socket desconectado en relay (ws://localhost:" + P2P_PORT + ") y eliminado de peers/sockets");
    });

    this.sendChain(socket); // Sincroniza la blockchain actual al nuevo peer
  };

  // Maneja los mensajes entrantes desde un socket WebSocket
  messageHandler = (socket) => {
    socket.on("message", (message) => {
      console.log("[P2P][DEBUG] Mensaje recibido en socket:", message);
      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        console.warn("⚠️ Mensaje recibido no es JSON válido", message);
        return;
      }

      switch (data.type) {
        case MESSAGE_TYPES.handshake: {
          // Valida handshake y registra (o actualiza) los datos del peer en memoria
          if (
            typeof data.nodeId !== "string" ||
            typeof data.httpUrl !== "string"
          ) {
            console.warn("⚠️ Handshake inválido:", data);
            break;
          }
          // Log [whoami] antes de mostrar el handshake recibido
          const HTTP_PORT = process.env.HTTP_PORT || 3001;
          const NODE_ID = process.env.NODE_ID || "node_" + Math.round(Math.random() * 10000);
          const httpUrl = `http://${getLocalExternalIP()}:${HTTP_PORT}`;
          console.log(`[whoami] nodeId: ${NODE_ID} - ${httpUrl}`);
          const already = this.peers.find((p) => p.socket === socket);
          if (!already) {
            this.peers.push({
              socket,
              nodeId: data.nodeId,
              httpUrl: data.httpUrl,
              lastSeen: data.timestamp || Date.now(),
            });
            console.log(
              `🤝 [HANDSHAKE] recibido de ${data.nodeId} - ${data.httpUrl}`
            );
          } else {
            already.nodeId = data.nodeId;
            already.httpUrl = data.httpUrl;
            already.lastSeen = data.timestamp || Date.now();
          }
          break;
        }
        case MESSAGE_TYPES.chain: {
          console.log("[DEBUG][HANDLER] Entrando en handler clear_transactions");
          (async () => {
            // Guarda y registra la cadena de bloques completa recibida
            const receivedLength = Array.isArray(data.chain) ? data.chain.length : 'N/A';
            console.log(`[P2P][CHAIN][RECEIVED] ⛓️  Recibida nueva cadena desde peer. Longitud: ${receivedLength}`);
            if (receivedLength > 1) {
              console.log(`[P2P][CHAIN][RECEIVED] ¡Cadena recibida con más de 1 bloque! Hash último bloque: ${data.chain[receivedLength-1]?.hash}`);
            }
            console.log("[P2P][CHAIN][RECEIVED] Estado mempool antes de replaceChain:", Array.isArray(this.transactionsPool.transactions) ? this.transactionsPool.transactions.map(t => t.id) : this.transactionsPool.transactions);

            // Rebroadcast: propaga la cadena a todos los peers excepto el origen
            this.sockets.forEach((peerSocket) => {
              if (peerSocket !== socket && peerSocket.readyState === 1) {
                peerSocket.send(JSON.stringify({
                  type: MESSAGE_TYPES.chain,
                  chain: data.chain
                }));
                console.log("[REBROADCAST][CHAIN] Cadena reenviada a un peer");
              }
            });

            // Log antes de reemplazar la cadena
            const prevChainLength = this.blockchain.chain.length;
            const prevChainHash = this.blockchain.chain[this.blockchain.chain.length-1]?.hash;
            console.log(`[P2P][CHAIN][RECEIVED] replaceChain llamado. Longitud anterior: ${prevChainLength}, hash último bloque local: ${prevChainHash}`);
            const result = await this.blockchain.replaceChain(data.chain);
            const newChainLength = this.blockchain.chain.length;
            const newChainHash = this.blockchain.chain[this.blockchain.chain.length-1]?.hash;
            console.log(`[P2P][CHAIN][RESULT] replaceChain ejecutado. Longitud nueva: ${newChainLength}, hash último bloque local: ${newChainHash}`);
            if (prevChainLength !== receivedLength) {
              console.log(`[P2P][CHAIN][TRACE] replaceChain intentado con cadena de longitud ${receivedLength}. Resultado: ${newChainLength}`);
            }
            if (result === false) {
              console.warn('[P2P][CHAIN][REJECTED] La cadena recibida fue rechazada o no se pudo persistir en disco. El frontend no se actualizará.');
            } else {
              console.log('[P2P][CHAIN][ACCEPTED] La cadena recibida fue aceptada, reemplazada y persistida en disco. El frontend puede actualizarse.');
            }

            // --- Limpiar la mempool de transacciones ya incluidas en la nueva cadena (robusto, estilo Bitcoin Core) ---
            if (this.transactionsPool && Array.isArray(this.transactionsPool.transactions)) {
              // Obtener todos los IDs de transacciones incluidas en la nueva cadena
              const includedTxIds = new Set();
              data.chain.forEach(block => {
                if (Array.isArray(block.data)) {
                  block.data.forEach(tx => includedTxIds.add(tx.id));
                }
              });
              const before = this.transactionsPool.transactions.length;
              const beforeIds = this.transactionsPool.transactions.map(tx => tx.id);
              this.transactionsPool.transactions = this.transactionsPool.transactions.filter(tx => !includedTxIds.has(tx.id));
              const after = this.transactionsPool.transactions.length;
              const afterIds = this.transactionsPool.transactions.map(tx => tx.id);
              console.log(`[P2P][CHAIN][SYNC][REPLACE_CHAIN] Mempool limpiada tras replaceChain: antes=${before} (${beforeIds}), después=${after} (${afterIds})`);
            }

            // --- Sincronizar utxoManager con la nueva cadena ---
            if (typeof global.utxoManager !== 'undefined' && global.utxoManager) {
              global.utxoManager.utxoSet = {};
              this.blockchain.chain.forEach((block) => global.utxoManager.updateWithBlock(block));
              console.log("[P2P][CHAIN][SYNC] utxoManager sincronizado tras replaceChain");
            }
            const chainLength = this.blockchain.chain.length;
            const firstBlock = this.blockchain.chain[0];
            const lastBlock = this.blockchain.chain[chainLength - 1];
            console.log(
              `[P2P][CHAIN][FINAL] Cadena local actualizada: ${chainLength} bloques`,
              `\n  Genesis: ${firstBlock?.hash?.substring(0, 16)}...`,
              `\n  Último: ${lastBlock?.hash?.substring(0, 16)}... (height: ${chainLength})`
            );
          })();
          break;
        }
        case MESSAGE_TYPES.transaction: {
          // Registra/actualiza una transacción recibida
          console.log("⬇️  Nueva transacción recibida");
          this.transactionsPool.updateOrAddTransaction(data.transaction);
          console.log(
            "📋 Pool de transacciones actual:",
            this.transactionsPool.transactions
          );
          break;
        }
        case MESSAGE_TYPES.clear_transactions: {
          (async () => {
            // Log antes de limpiar la mempool
            console.log("[SYNC][P2P] CLEAR_TRANSACTIONS recibido. Mempool antes de limpiar:", Array.isArray(this.transactionsPool.transactions) ? this.transactionsPool.transactions.map(t => t.id) : this.transactionsPool.transactions);
            // Log cadena en memoria antes de limpiar
            console.log("[SYNC][P2P][CHAIN][MEMORIA][ANTES] Cadena en memoria:", JSON.stringify(this.blockchain.chain, null, 2));
            // Log cadena en disco antes de limpiar
            try {
              const { readBlockSeq } = await import('../storage/blockFile.js');
              const blocksEnDisco = [];
              await readBlockSeq(this.blockchain.blockFilePath, (block) => blocksEnDisco.push(block));
              console.log("[SYNC][P2P][CHAIN][DISCO][ANTES] Cadena en disco:", JSON.stringify(blocksEnDisco, null, 2));
            } catch (err) {
              console.error("[SYNC][P2P][CHAIN][DISCO][ANTES] Error leyendo cadena en disco:", err);
            }
            this.transactionsPool.clear();
            // Log después de limpiar la mempool
            console.log("[SYNC][P2P] Mempool después de limpiar:", Array.isArray(this.transactionsPool.transactions) ? this.transactionsPool.transactions.map(t => t.id) : this.transactionsPool.transactions);
            // Log cadena en memoria después de limpiar
            console.log("[SYNC][P2P][CHAIN][MEMORIA][DESPUES] Cadena en memoria:", JSON.stringify(this.blockchain.chain, null, 2));
            // Log cadena en disco después de limpiar
            try {
              const { readBlockSeq } = await import('../storage/blockFile.js');
              const blocksEnDisco = [];
              await readBlockSeq(this.blockchain.blockFilePath, (block) => blocksEnDisco.push(block));
              console.log("[SYNC][P2P][CHAIN][DISCO][DESPUES] Cadena en disco:", JSON.stringify(blocksEnDisco, null, 2));
            } catch (err) {
              console.error("[SYNC][P2P][CHAIN][DISCO][DESPUES] Error leyendo cadena en disco:", err);
            }
          })();
          break;
        }
        default:
          console.log("⚠️ Tipo de mensaje desconocido:", data.type);
      }
    });
  };

  // Envía la cadena de bloques actual al socket destino
  sendChain = (socket) => {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPES.chain,
        chain: this.blockchain.chain,
      })
    );
  };

  // Sincroniza la cadena a todos los sockets conectados
  syncChains = () => {
    this.sockets.forEach((socket) => this.sendChain(socket));
  };

  // Envía una transacción concreta a un socket
  sendTransaction = (socket, transaction) => {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPES.transaction,
        transaction,
      })
    );
  };

  // Difunde una transacción a todos los peers conectados
  broadcastTransaction = (transaction) => {
    this.sockets.forEach((socket) => this.sendTransaction(socket, transaction));
  };

  // Ordena a todos los peers limpiar el pool de transacciones
  broadcastClearTransactions = () => {
    this.sockets.forEach((socket) =>
      socket.send(
        JSON.stringify({ type: MESSAGE_TYPES.clear_transactions })
      )
    );
  };
  // tendrías que agregarlo manualmente en server.js, por ejemplo después de los otros endpoints admin.
  // Sería como un comando administrativo de emergencia que ordena a todos los peers limpiar el pool de transacciones
  // ❌ Pero nadie lo llama (no hay endpoint ni código que lo use)
  // ❌ No existe /admin/clear-all-mempools en server.js
  broadcastClearTransactions = () => {
    this.sockets.forEach((socket) =>
      socket.send(
        JSON.stringify({ type: MESSAGE_TYPES.clear_transactions })
      )
    );
  };

  // Configura UPnP para apertura automática de puertos (modo no bloqueante)
  setupUPnP = async () => {
    let client = null;
    try {
      console.log(`🔄 Intentando abrir puerto ${P2P_PORT} con UPnP...`);
      
      // Crear cliente UPnP con timeout de 5 segundos
      client = natUpnp.createClient();
      
      // Timeout para la conexión al router
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout UPnP: 5 segundos")), 5000)
      );

      // Mapear puerto P2P (TCP)
      const mappingPromise = new Promise((resolve, reject) => {
        client.portMapping({
          public: P2P_PORT,
          private: P2P_PORT,
          ttl: 3600, // 1 hora
          description: "MagnumsLocal P2P Node"
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await Promise.race([mappingPromise, timeoutPromise]);
      
      // Obtener IP pública (con callback para evitar errores de nat-upnp)
      const externalIp = await new Promise((resolve, reject) => {
        client.externalIp((err, ip) => {
          if (err) reject(err);
          else resolve(ip);
        });
      });
      
      console.log(`✅ UPnP: Puerto ${P2P_PORT} abierto en router (IP pública: ${externalIp})`);
      
      // Cerrar cliente inmediatamente - no necesitamos polling continuo
      if (client && client.close) {
        client.close();
      }
      
      // Guardar referencia para cleanup al cerrar
      this.upnpMapping = { public: P2P_PORT };
      this.upnpClient = natUpnp.createClient(); // Cliente nuevo para cleanup
      
    } catch (err) {
      console.warn(`⚠️ UPnP no disponible. Este nodo funcionará en modo cliente (outbound-only)`);
      console.warn(`   Razón: ${err.message}`);
      
      // Cerrar cliente si hubo error
      if (client && client.close) {
        client.close();
      }
      // No lanzar excepción - el nodo puede funcionar sin UPnP
    }
  };

  // Cierra el mapping UPnP al apagar el servidor
  closeUPnP = async () => {
    try {
      if (this.upnpClient && this.upnpMapping) {
        await this.upnpClient.portUnmapping({
          public: P2P_PORT
        });
        console.log(`🔒 UPnP: Puerto ${P2P_PORT} cerrado en router`);
        this.upnpClient = null;
        this.upnpMapping = null;
      }
    } catch (err) {
      // Error silencioso al cerrar - no es crítico
    }
  };
}

export { P2PServer };