"use strict";

import WebSocket, { WebSocketServer } from "ws";
import os from "os";
import fs from "fs";
import https from "https";

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
    this.connectToPeers();
  };

  // Conecta este nodo a cada peer definido en la configuración
  connectToPeers = () => {
    if (this.peersEnv.length === 0) {
      console.log("🔗 Sin peers configurados - Nodo Genesis.");
      return;
    }

    this.peersEnv.forEach((peerUrl) => {
      const cleanPeer = peerUrl.trim();
      if (!cleanPeer) {
        console.warn(`⚠️ Peer vacío ignorado: "${peerUrl}"`);
        return;
      }
      console.log(`🔗 Intentando conectar a peer: ${cleanPeer}`);

      try {
        const socket = new WebSocket(cleanPeer);

        socket.on("open", () => {
          console.log(`✅ Conectado exitosamente a peer: ${cleanPeer}`);
          this.connectSocket(socket);
        });

        socket.on("error", (error) => {
          console.warn(
            `⚠️ Error conectando a peer ${cleanPeer}: ${error.message}`
          );
          console.log(
            `🔄 Reintentando conexión a ${cleanPeer} en 5 segundos...`
          );
          setTimeout(() => {
            this.connectToPeers();
          }, 5000);
        });
      } catch (error) {
        console.warn(
          `❌ Error creando WebSocket para ${cleanPeer}: ${error.message}`
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
          // Guarda y registra la cadena de bloques completa recibida
          console.log("⛓️  Recibida nueva cadena");
          this.blockchain.replaceChain(data.chain);

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
            this.transactionsPool.transactions = this.transactionsPool.transactions.filter(tx => !includedTxIds.has(tx.id));
            const after = this.transactionsPool.transactions.length;
            console.log(`[SYNC][REPLACE_CHAIN] Mempool limpiada tras replaceChain: antes=${before}, después=${after}`);
          }

          // --- Sincronizar utxoManager con la nueva cadena ---
          if (typeof global.utxoManager !== 'undefined' && global.utxoManager) {
            global.utxoManager.utxoSet = {};
            this.blockchain.chain.forEach((block) => global.utxoManager.updateWithBlock(block));
            console.log("[SYNC] utxoManager sincronizado tras replaceChain");
          }
          console.log(
            "⛓️  Cadena local actual:",
            JSON.stringify(this.blockchain.chain, null, 2)
          );
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
          // Log antes de limpiar la mempool
          console.log("[SYNC][P2P] CLEAR_TRANSACTIONS recibido. Mempool antes de limpiar:",
            Array.isArray(this.transactionsPool.transactions) ? this.transactionsPool.transactions.map(t => t.id) : this.transactionsPool.transactions);
          this.transactionsPool.clear();
          // Log después de limpiar la mempool
          console.log("[SYNC][P2P] Mempool después de limpiar:",
            Array.isArray(this.transactionsPool.transactions) ? this.transactionsPool.transactions.map(t => t.id) : this.transactionsPool.transactions);
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
}

export { P2PServer };