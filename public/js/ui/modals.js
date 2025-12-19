// UI Modals & Toasts (ESM)
// Lightweight extraction; styling relies on existing CSS classes.

export function showModal(message, title = 'Información') {
  const modal = document.getElementById('errorModal');
  const modalMessage = document.getElementById('modalMessage');
  const closeButton = modal?.querySelector('.close');
  if (!modal || !modalMessage) {
    console.error('Modal base no encontrado');
    alert(`${title}: ${message}`);
    return;
  }
  let titleElement = modal.querySelector('.modal-title');
  if (!titleElement) {
    titleElement = document.createElement('h2');
    titleElement.className = 'modal-title';
    modal.querySelector('.modal-content').insertBefore(titleElement, modalMessage);
  }
  titleElement.textContent = title;
  modalMessage.innerHTML = message;
  // Position this modal side-by-side and above others
  modal.style.zIndex = '25000';
  modal.classList.remove('hidden');
  // Offset the modal to the right if wallet modal is open
  try {
    const wallet = document.getElementById('walletModalContainer');
    const isWalletOpen = wallet && !wallet.classList.contains('hidden');
    const content = modal.querySelector('.modal-content');
    if (isWalletOpen && content) {
      content.style.marginLeft = '24px';
    } else if (content) {
      content.style.marginLeft = '';
    }
  } catch {}
  if (closeButton) closeButton.onclick = () => modal.classList.add('hidden');
}

export function showModalForm(title, bodyContent) {
  const modal = document.getElementById('loteModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  if (!modal || !modalTitle || !modalBody) {
    console.error('Elementos del modal de formulario no encontrados');
    return;
  }
  modalTitle.innerHTML = title;
  modalBody.innerHTML = bodyContent;
  // Raise z-index and offset when wallet modal is open to avoid stacking behind
  modal.style.zIndex = '25000';
  modal.classList.remove('hidden');
  try {
    const wallet = document.getElementById('walletModalContainer');
    const isWalletOpen = wallet && !wallet.classList.contains('hidden');
    if (isWalletOpen) {
      modal.style.alignItems = 'flex-start';
      const content = modal.querySelector('.modal-content');
      if (content) {
        content.style.marginTop = '24px';
        content.style.marginLeft = '24px';
      }
    }
  } catch {}
  const closeButton = modal.querySelector('.close');
  if (closeButton) closeButton.onclick = () => modal.classList.add('hidden');
}

export function showConfirmModal(message, onConfirm, onCancel = null, title = 'Confirmación') {
  const confirmContent = `
    <div class="modal-info"><p>${message}</p></div>
    <div class="modal-actions">
      <button id="confirmBtn">Confirmar</button>
      <button id="cancelBtn" class="cancel-btn">Cancelar</button>
    </div>`;
  showModalForm(title, confirmContent);
  const confirmBtn = document.getElementById('confirmBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  if (confirmBtn) confirmBtn.onclick = () => { hideModals(); onConfirm && onConfirm(); };
  if (cancelBtn) cancelBtn.onclick = () => { hideModals(); onCancel && onCancel(); };
}

export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideInFromRight 0.3s ease-out reverse';
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, duration);
}

export function showProgressModal(message, title = 'Procesando', steps = []) {
  const modal = document.getElementById('errorModal');
  const modalMessage = document.getElementById('modalMessage');
  if (!modal || !modalMessage) return;
  let titleElement = modal.querySelector('.modal-title');
  if (!titleElement) {
    titleElement = document.createElement('h2');
    titleElement.className = 'modal-title';
    modal.querySelector('.modal-content').insertBefore(titleElement, modalMessage);
  }
  titleElement.textContent = title;
  const progressContent = `
    <div class="progress-container">
      <div class="loading-spinner"></div>
      <h3>${message}</h3>
      <div class="progress-steps">
        ${steps.map((s,i)=>`<div class="progress-step" id="step-${i}"><span class="step-icon">⏳</span><span class="step-text">${s}</span></div>`).join('')}
      </div>
      <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
      <p class="progress-message">Esto puede tomar unos segundos...</p>
    </div>`;
  modalMessage.innerHTML = progressContent;
  modal.classList.remove('hidden');
  animateProgress(steps.length);
}

export function animateProgress(totalSteps) {
  let currentStep = 0;
  const stepDuration = 300;
  const interval = setInterval(() => {
    if (currentStep < totalSteps) {
      const el = document.getElementById(`step-${currentStep}`);
      if (el) {
        const icon = el.querySelector('.step-icon');
        if (icon) icon.textContent = '✅';
        el.classList.add('completed');
      }
      const fill = document.getElementById('progressFill');
      if (fill) fill.style.width = `${((currentStep+1)/totalSteps)*100}%`;
      currentStep++;
    } else { clearInterval(interval); }
  }, stepDuration);
}

export function closeCurrentModal() { hideModals(); }

function hideModals() {
  ['errorModal','loteModal','walletModalContainer'].forEach(id => {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
  });
}

export function showInlineModal(payload, title = 'Detalle') {
  try {
    const existing = document.getElementById('inlineUtxoModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'inlineUtxoModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.zIndex = '25000';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    const box = document.createElement('div');
    box.style.maxWidth = '920px';
    box.style.width = 'min(92vw,920px)';
    box.style.maxHeight = '82vh';
    box.style.overflow = 'auto';
    box.style.background = 'linear-gradient(180deg,#081226,#04121a)';
    box.style.border = '1px solid rgba(255,255,255,0.06)';
    box.style.borderRadius = '10px';
    box.style.padding = '18px';
    box.style.color = '#fff';
    const h = document.createElement('h3'); h.textContent = title; h.style.marginTop='0';
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-word';
    pre.style.fontSize = '13px';
    pre.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload,null,2);
    const close = document.createElement('button');
    close.textContent = 'Cerrar';
    close.className = 'dashboard-btn secondary';
    close.style.marginTop = '12px';
    close.onclick = () => modal.remove();
    box.append(h, pre, close);
    modal.appendChild(box);
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  } catch (e) {
    console.warn('showInlineModal fallback', e);
    alert(typeof payload === 'string' ? payload : JSON.stringify(payload,null,2));
  }
}

// Side modal: fixed panel that slides at right or bottom, above everything
export function showSideModal(htmlContent, title = 'Detalle', side = 'right') {
  try {
    const existing = document.getElementById('sideModalPanel');
    if (existing) existing.remove();
    const panel = document.createElement('div');
    panel.id = 'sideModalPanel';
    panel.style.position = 'fixed';
    panel.style.zIndex = '30000';
    panel.style.background = '#220F17';
    panel.style.color = '#fff';
    panel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
    panel.style.borderRadius = '10px';
    panel.style.border = '1px solid rgba(0,0,0,0.08)';
    panel.style.padding = '16px';
    panel.style.maxWidth = '600px';
    panel.style.width = 'min(42vw, 600px)';
    panel.style.maxHeight = '80vh';
    panel.style.overflow = 'auto';
    if (side === 'right') {
      panel.style.top = '24px';
      panel.style.right = '24px';
    } else {
      panel.style.left = '24px';
      panel.style.bottom = '24px';
    }
    // Add close button (aspa) always at top right
    const closeBtn = document.createElement('button');
    closeBtn.className = 'dashboard-btn close-modal-btn';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.float = 'right';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '22px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.margin = '-8px -8px 0 0';
    closeBtn.onclick = window.closeSideModalPanel;
    panel.appendChild(closeBtn);
    const h = document.createElement('h3');
    h.textContent = title;
    h.style.marginTop = '0';
    panel.appendChild(h);
    const content = document.createElement('div');
    // Remove any close button from injected HTML to avoid duplicate aspas
    content.innerHTML = htmlContent.replace(/<button[^>]*close-modal-btn[^>]*>[\s\S]*?<\/button>/gi, '');
    panel.appendChild(content);
    document.body.appendChild(panel);
  } catch (e) {
    console.warn('showSideModal fallback', e);
    showModal(htmlContent, title);
  }
}
// Unified safe modal helper (title, htmlContent)
// Uses showModalForm when available, otherwise falls back to showModal swapping parameter order.
export function safeModal(title, htmlContent) {
  try {
    // Log when safeModal is called, including title and HTML content
    console.log('[SAFE-MODAL-DEBUG] safeModal called with title:', title);
    if (typeof htmlContent === 'string' && htmlContent.includes('Clave Pública')) {
      console.log('[SAFE-MODAL-DEBUG] Modal HTML contains Clave Pública:', htmlContent);
    }
    const hasDOM = typeof document !== 'undefined' && !!document.getElementById;
    const hasFormContainer = hasDOM && !!document.getElementById('loteModal');
    const hasErrorContainer = hasDOM && !!document.getElementById('errorModal');
    // Prefer the richer form modal when its container exists
    if (hasFormContainer) return showModalForm(title, htmlContent);
    if (hasErrorContainer) return showModal(htmlContent, title);
    // Last resort
    alert(`${title}: ${typeof htmlContent === 'string' ? htmlContent : '[contenido]'}`);
  } catch (e) {
    console.warn('[safeModal] fallo mostrando modal', e);
    try { alert(`${title}: (Error mostrando modal)`); } catch {}
  }
}

// Expose on window for legacy code convenience
try { window.safeModal = safeModal; window.showSideModal = showSideModal; } catch(e) {}
