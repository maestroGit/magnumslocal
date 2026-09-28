import { getCurrentPublicKey } from "../core/walletUtils.js";

let wsUrl = "";
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  wsUrl = "ws://localhost:6001";
} else if (window.location.hostname.includes("app.blockswine.com")) {
  wsUrl = "wss://app.blockswine.com";
} else if (window.location.hostname.includes("apps.run-on-seenode.com")) {
  wsUrl = "wss://web-sdzlt1djuiql.up-de-fra1-k8s-1.apps.run-on-seenode.com";
}

let currentWallet = null;

async function updateCurrentWallet() {
  currentWallet = await getCurrentPublicKey();
}

function mostrarBurnNotification({ txId, bodegaId, wineloverWallet, amount, fecha }) {
  const panel = document.getElementById("burnNotificationPanel");
  const content = document.getElementById("burnNotificationContent");
  if (!panel || !content) return;

  content.innerHTML =
    `<b>Tx:</b> <span style='color:#ffb74d'>${txId}</span><br>` +
    `<b>Bodega:</b> <span style='color:#fbc02d'>${bodegaId}</span><br>` +
    `<b>Wallet:</b> <span style='color:#b2ff59'>${wineloverWallet}</span><br>` +
    `<b>Amount:</b> <span style='color:#ff5252'>${amount}</span><br>` +
    `<b>Date:</b> <span style='color:#fff'>${new Date(fecha).toLocaleString()}</span>`;
  panel.style.display = "block";
}

function connectWS() {
  if (!wsUrl) return;

  const ws = new WebSocket(wsUrl);
  ws.onopen = () => console.log("[BURN][WS] Connected to", wsUrl);
  ws.onclose = () => {
    console.warn("[BURN][WS] Disconnected. Reconnecting in 3s...");
    setTimeout(connectWS, 3000);
  };
  ws.onerror = (err) => console.error("[BURN][WS] Error:", err);
  ws.onmessage = async (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === "BURN_NOTIFICATION" || data.type === "burn_notification") {
        await updateCurrentWallet();
        if (!currentWallet) return;
        if (data.wineloverWallet && data.wineloverWallet !== currentWallet) return;
        mostrarBurnNotification(data);
        window.dispatchEvent(new CustomEvent("burn-notification-received", { detail: data }));
      }
    } catch (e) {
      console.warn("[BURN][WS] Mensaje no valido", e);
    }
  };
}

updateCurrentWallet();
window.addEventListener("walletChanged", updateCurrentWallet);
connectWS();

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("closeBurnNotificationPanel");
  if (closeBtn) {
    closeBtn.onclick = () => {
      const panel = document.getElementById("burnNotificationPanel");
      if (panel) panel.style.display = "none";
    };
  }
});
