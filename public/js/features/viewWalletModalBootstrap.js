import {
  showWalletModal,
  initWalletModalFeature,
  handleUTXOCheckClick,
} from "./walletModal.js";

try {
  initWalletModalFeature();
} catch {}

const btn = document.getElementById("walletModal");
if (btn) {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      showWalletModal();
    } catch (err) {
      console.error("[view] wallet modal error", err);
    }
  });
}

const utxoBtn = document.getElementById("utxoSetBtn");
if (utxoBtn) {
  utxoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleUTXOCheckClick();
  });
}
