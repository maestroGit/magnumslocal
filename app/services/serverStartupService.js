// Server startup helper

export const startServerWhenReady = async ({
  server,
  HTTP_PORT,
  NODE_NAME,
  p2pServer,
  getGlobalWallet,
  getBlockchain,
}) => {
  try {
    const getWallet = () => getGlobalWallet && getGlobalWallet();
    const getChain = () => getBlockchain && getBlockchain();

    if (!getWallet() || !getWallet().publicKey) {
      let retries = 0;
      while ((!getWallet() || !getWallet().publicKey) && retries < 30) {
        console.log(`[STARTUP][WALLET] Esperando a que globalWallet este lista... intento ${retries + 1}`);
        const wallet = getWallet();
        if (typeof wallet === 'undefined') {
          console.log('[STARTUP][WALLET] globalWallet es undefined');
        } else if (!wallet) {
          console.log('[STARTUP][WALLET] globalWallet es null o falsy');
        } else if (!wallet.publicKey) {
          console.log('[STARTUP][WALLET] globalWallet existe pero no tiene publicKey');
        }
        await new Promise((res) => setTimeout(res, 500));
        retries++;
      }
      if (!getWallet() || !getWallet().publicKey) {
        console.warn('[STARTUP][WALLET] Advertencia: globalWallet no esta lista tras esperar. El endpoint /utxo-balance/global podria fallar.');
      } else {
        console.log(`[STARTUP][WALLET] globalWallet lista tras ${retries} intentos. publicKey: ${getWallet().publicKey}`);
      }
    } else {
      console.log(`[STARTUP][WALLET] globalWallet ya estaba lista. publicKey: ${getWallet() && getWallet().publicKey}`);
    }

    const bc = getChain();
    if (!bc || !bc.chain || bc.chain.length === 0) {
      let retries = 0;
      while ((!bc || !bc.chain || bc.chain.length === 0) && retries < 30) {
        console.log(`[STARTUP][CHAIN] Esperando a que la blockchain este lista... intento ${retries + 1}`);
        if (!bc) {
          console.log('[STARTUP][CHAIN] bc es undefined o null');
        } else if (!bc.chain) {
          console.log('[STARTUP][CHAIN] bc existe pero bc.chain es undefined o null');
        } else if (bc.chain.length === 0) {
          console.log('[STARTUP][CHAIN] bc.chain existe pero esta vacio');
        }
        await new Promise((res) => setTimeout(res, 500));
        retries++;
      }
      if (!bc || !bc.chain || bc.chain.length === 0) {
        console.warn('[STARTUP][CHAIN] Advertencia: Blockchain no esta lista tras esperar.');
      } else {
        console.log(`[STARTUP][CHAIN] Blockchain lista tras ${retries} intentos. Longitud: ${bc.chain.length}`);
      }
    } else {
      console.log(`[STARTUP][CHAIN] Blockchain ya estaba lista. Longitud: ${bc.chain && bc.chain.length}`);
    }

    console.log('[STARTUP] Iniciando server.listen y p2pServer.listen...');
    server.listen(HTTP_PORT, () => {
      console.log(`Server HTTP is running on port ${HTTP_PORT} [${NODE_NAME}] (${process.env.NODE_ENV})`);
    });
    p2pServer.listen(server);
    console.log('[STARTUP] Servidor HTTP y P2P inicializados correctamente.');
  } catch (err) {
    console.error('[STARTUP] Error al iniciar el servidor:', err);
    process.exit(1);
  }
};
