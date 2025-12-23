
import { fetchUTXOs } from './utxo-api.js';

const statusEl = document.getElementById('transferStatus');
const form = document.getElementById('transferForm');
const recipientInput = document.getElementById('recipientAddress');
const amountInput = document.getElementById('transferAmount');

let utxos = [];
let selectedUTXO = null;

// Recuperar publicKey de sessionStorage (guardada tras importación)
const pubKey = sessionStorage.getItem('importedPubKey');
if (!pubKey) {
  statusEl.textContent = 'No hay wallet importada. Vuelve a importar tu keystore.';
  form.style.display = 'none';
} else {
  // Mostrar UTXOs al cargar
  loadUTXOs(pubKey);
}

async function loadUTXOs(address) {
  statusEl.textContent = 'Cargando UTXOs...';
  utxos = await fetchUTXOs(address);
  renderUTXOList();
}

function renderUTXOList() {
  let utxoListEl = document.getElementById('utxoList');
  if (!utxoListEl) {
    utxoListEl = document.createElement('div');
    utxoListEl.id = 'utxoList';
    form.insertBefore(utxoListEl, form.querySelector('.card-actions'));
  }
  utxoListEl.innerHTML = '';
  if (!utxos.length) {
    utxoListEl.innerHTML = '<div style="color:#f7931a;margin-bottom:8px;">No hay UTXOs disponibles.</div>';
    amountInput.disabled = true;
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }
  utxos.forEach((utxo, i) => {
    const cont = document.createElement('div');
    cont.className = 'utxo-row';
    cont.style = 'margin-bottom:6px;';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'utxoSelect';
    radio.value = i;
    radio.id = 'utxo_' + i;
    radio.className = 'utxo-radio';
    radio.onclick = () => selectUTXO(i);
    cont.appendChild(radio);
    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.style = 'margin-left:8px;color:#fff;';
    label.textContent = `UTXO #${i+1}: ${utxo.amount} unidades`;
    cont.appendChild(label);
    utxoListEl.appendChild(cont);
  });
  amountInput.disabled = true;
  form.querySelector('button[type="submit"]').disabled = true;
}

function selectUTXO(idx) {
  selectedUTXO = utxos[idx];
  amountInput.value = selectedUTXO.amount;
  amountInput.disabled = false;
  validateForm();
}

function validateRecipient(addr) {
  // Simple: empieza por 0x y longitud >= 10 (ajustar según formato real)
  return /^0x[a-fA-F0-9]{8,}$/.test(addr);
}

function validateForm() {
  const recipient = recipientInput.value.trim();
  const amount = amountInput.value.trim();
  let valid = true;
  if (!selectedUTXO) valid = false;
  if (!validateRecipient(recipient)) valid = false;
  if (!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > Number(selectedUTXO?.amount)) valid = false;
  form.querySelector('button[type="submit"]').disabled = !valid;
}

recipientInput.addEventListener('input', validateForm);
amountInput.addEventListener('input', validateForm);

form.addEventListener('submit', function(e) {
  e.preventDefault();
  const recipient = recipientInput.value.trim();
  const amount = amountInput.value.trim();
  if (!selectedUTXO) {
    statusEl.textContent = 'Selecciona un UTXO.';
    return;
  }
  if (!validateRecipient(recipient)) {
    statusEl.textContent = 'Dirección de destino inválida.';
    return;
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > Number(selectedUTXO.amount)) {
    statusEl.textContent = 'Cantidad inválida.';
    return;
  }
  // Aquí iría la lógica real de transferencia (firmar, enviar, etc.)
  statusEl.textContent = `Transferencia simulada de ${amount} unidades a ${recipient} usando UTXO #${utxos.indexOf(selectedUTXO)+1}.`;
  console.log(`[transfer-keystore] Transferencia: ${amount} a ${recipient} usando UTXO`, selectedUTXO);
});
