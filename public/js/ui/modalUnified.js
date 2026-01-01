// Modal unificado para todo el proyecto (inspirado en view.html)
// Incluye: openModal({title, body, footer, options}), closeModal()

(function(){
  // Crea el modal si no existe
  function ensureModal(){
    let modal = document.getElementById('mainModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mainModal';
      modal.className = 'modal hidden';
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close" id="modalClose" role="button" aria-label="Cerrar" tabindex="0">&times;</span>
          <h2 id="modalTitle"></h2>
          <div id="modalBody"></div>
          <div id="modalFooter"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  }


  window.openModal = function({ title = '', body = '', size = 'md', footer = '', options = {} }) {
    const modal = ensureModal();
    console.log('[openModal] Modal abierto:', { title, size });

    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const closeBtn = document.getElementById('modalClose');

    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    modalFooter.innerHTML = footer || '';

    // Opciones
    closeBtn.style.display = options.showClose === false ? 'none' : '';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';


    // Por defecto, overlayClose es false (no se cierra al hacer click fuera)
    const overlayClose = options.overlayClose === true;
    modal.onclick = (e) => {
      if (e.target === modal && overlayClose) window.closeModal();

    };
    // Cierre por aspa
    closeBtn.onclick = () => window.closeModal();
    // Cierre por Escape
    document.onkeydown = (e) => {
      if (e.key === 'Escape' && options.escClose !== false) window.closeModal();
    };
  };

  window.closeModal = function() {
    const modal = document.getElementById('mainModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
    document.onkeydown = null;
  };
})();
