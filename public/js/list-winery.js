/**
 * list-winery.js
 * Funcionalidad para el listado de bodegas desde la base de datos PostgreSQL
 * GET /users?role=winery&kyc_status=...&subscription_status=...&badges=...
 */

class WineryListManager {
  constructor() {
    this.wineries = [];
    this.filteredWineries = [];
    this.currentPage = 1;
    this.itemsPerPage = 12;
    
    // Filtros
    this.searchQuery = '';
    this.kycStatus = '';
    this.subscriptionStatus = '';
    this.badges = [];
    this.sortBy = 'name-asc';
    this.hasSearched = false;

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.loadFiltersFromURL();
    this.syncHeaderOffset();
    window.addEventListener('resize', () => this.syncHeaderOffset());
    
    // Si hay filtros en URL, ejecutar búsqueda automáticamente
    if (this.hasSearched) {
      await this.loadWineries();
    }
  }

  setupEventListeners() {
    // Botón Buscar
    document.getElementById('searchButton')?.addEventListener('click', () => {
      this.currentPage = 1;
      this.hasSearched = true;
      this.updateURLFilters();
      this.loadWineries();
    });

    // Botón Limpiar
    document.getElementById('resetButton')?.addEventListener('click', () => {
      this.clearFilters();
    });

    // Búsqueda (tiempo real)
    document.getElementById('searchWinery')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      if (this.hasSearched) {
        this.currentPage = 1;
        this.filterAndSort();
        this.render();
      }
    });

    // KYC Status
    document.getElementById('kycStatus')?.addEventListener('change', (e) => {
      this.kycStatus = e.target.value;
    });

    // Subscription Status
    document.getElementById('subscriptionStatus')?.addEventListener('change', (e) => {
      this.subscriptionStatus = e.target.value;
    });

    // Badges (multi-select por listas)
    const updateBadgesFromLists = () => {
      this.badges = [
        ...this.getSelectValues('doFilter'),
        ...this.getSelectValues('uvaFilter'),
        ...this.getSelectValues('estiloFilter'),
        ...this.getSelectValues('medallaFilter'),
      ];
    };

    document.getElementById('doFilter')?.addEventListener('change', updateBadgesFromLists);
    document.getElementById('uvaFilter')?.addEventListener('change', updateBadgesFromLists);
    document.getElementById('estiloFilter')?.addEventListener('change', updateBadgesFromLists);
    document.getElementById('medallaFilter')?.addEventListener('change', updateBadgesFromLists);

    // Ordenamiento
    document.getElementById('sortBy')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      if (this.hasSearched) {
        this.currentPage = 1;
        this.filterAndSort();
        this.render();
      }
    });

    // Reintentar en caso de error
    document.getElementById('retryButton')?.addEventListener('click', () => {
      this.loadWineries();
    });

    // Modal
    document.getElementById('closeWineryModal')?.addEventListener('click', this.closeModal.bind(this));
    document.getElementById('closeWineryModalBtn')?.addEventListener('click', this.closeModal.bind(this));
    
    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    this.searchQuery = params.get('search') || '';
    this.kycStatus = params.get('kyc_status') || '';
    this.subscriptionStatus = params.get('subscription_status') || '';
    this.badges = params.get('badges') ? params.get('badges').split(',').filter(Boolean) : [];
    this.sortBy = params.get('sort') || 'name-asc';

    // Actualizar inputs
    document.getElementById('searchWinery').value = this.searchQuery;
    document.getElementById('kycStatus').value = this.kycStatus;
    document.getElementById('subscriptionStatus').value = this.subscriptionStatus;
    this.applySelectValues('doFilter', this.badges);
    this.applySelectValues('uvaFilter', this.badges);
    this.applySelectValues('estiloFilter', this.badges);
    this.applySelectValues('medallaFilter', this.badges);
    document.getElementById('sortBy').value = this.sortBy;

    // Si hay filtros en URL, buscar automáticamente
    if (this.searchQuery || this.kycStatus || this.subscriptionStatus || this.badges.length > 0) {
      this.hasSearched = true;
    }
  }

  updateURLFilters() {
    const params = new URLSearchParams();
    
    if (this.searchQuery) params.set('search', this.searchQuery);
    if (this.kycStatus) params.set('kyc_status', this.kycStatus);
    if (this.subscriptionStatus) params.set('subscription_status', this.subscriptionStatus);
    if (this.badges.length > 0) params.set('badges', this.badges.join(','));
    if (this.sortBy !== 'name-asc') params.set('sort', this.sortBy);

    const queryString = params.toString();
    const url = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }

  clearFilters() {
    this.searchQuery = '';
    this.kycStatus = '';
    this.subscriptionStatus = '';
    this.badges = [];
    this.sortBy = 'name-asc';
    this.hasSearched = false;
    this.wineries = [];
    this.filteredWineries = [];

    // Limpiar inputs
    document.getElementById('searchWinery').value = '';
    document.getElementById('kycStatus').value = '';
    document.getElementById('subscriptionStatus').value = '';
    this.clearSelect('doFilter');
    this.clearSelect('uvaFilter');
    this.clearSelect('estiloFilter');
    this.clearSelect('medallaFilter');
    document.getElementById('sortBy').value = 'name-asc';

    // Limpiar URL
    window.history.replaceState({}, '', window.location.pathname);
  }

  async loadWineries() {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');

    try {
      // Construir URL con filtros
      const params = new URLSearchParams({
        role: 'winery'
      });

      if (this.kycStatus) params.append('kyc_status', this.kycStatus);
      if (this.subscriptionStatus) params.append('subscription_status', this.subscriptionStatus);
      if (this.badges.length > 0) params.append('badges', this.badges.join(','));

      const url = `/users?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Normalizar respuesta
      if (Array.isArray(data)) {
        this.wineries = data;
      } else if (data.data && Array.isArray(data.data)) {
        this.wineries = data.data;
      } else if (data.users && Array.isArray(data.users)) {
        this.wineries = data.users;
      } else {
        console.warn('Estructura de respuesta inesperada:', data);
        this.wineries = data || [];
      }

      if (this.wineries.length === 0) {
        console.warn('No se encontraron bodegas con los filtros especificados');
      }

      loadingState.classList.add('hidden');
      this.filterAndSort();
      this.render();

    } catch (error) {
      console.error('Error al cargar bodegas:', error);
      
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
      document.getElementById('errorMessage').textContent = 
        `Error: ${error.message}`;
    }
  }

  filterAndSort() {
    // Filtrar por búsqueda
    this.filteredWineries = this.wineries.filter(winery => {
      const nameMatch = (winery.nombre || '').toLowerCase().includes(this.searchQuery);
      const emailMatch = (winery.email || '').toLowerCase().includes(this.searchQuery);
      return nameMatch || emailMatch;
    });

    // Ordenar
    this.filteredWineries.sort((a, b) => {
      switch (this.sortBy) {
        case 'name-asc':
          return (a.nombre || '').localeCompare(b.nombre || '');
        case 'name-desc':
          return (b.nombre || '').localeCompare(a.nombre || '');
        case 'created-newest':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'created-oldest':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        default:
          return 0;
      }
    });
  }

  render() {
    const container = document.getElementById('wineryListContainer');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');

    if (this.filteredWineries.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      paginationContainer.innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');

    // Calcular paginación
    const totalPages = Math.ceil(this.filteredWineries.length / this.itemsPerPage);
    const startIdx = (this.currentPage - 1) * this.itemsPerPage;
    const endIdx = startIdx + this.itemsPerPage;
    const paginatedWineries = this.filteredWineries.slice(startIdx, endIdx);

    // Renderizar tarjetas
    container.innerHTML = paginatedWineries.map(winery => this.createWineryCard(winery)).join('');

    // Agregar event listeners a botones de tarjetas
    document.querySelectorAll('.winery-view-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        this.showWineryDetail(paginatedWineries[idx]);
      });
    });

    // Renderizar paginación
    this.renderPagination(totalPages, paginationContainer);
  }

  createWineryCard(winery) {
    const nombre = winery.nombre || 'Sin nombre';
    const email = winery.email || 'No especificado';
    const kycStatus = winery.kyc_status || 'pendiente';
    const subscribStatus = winery.subscription_status || 'activa';
    const createdAt = winery.created_at 
      ? new Date(winery.created_at).toLocaleDateString('es-ES') 
      : 'N/A';
    
    const categoriesHtml = winery.categorias && winery.categorias.length > 0
      ? winery.categorias.slice(0, 3).map(cat => 
          `<span class="winery-category-tag">${this.escapeHtml(cat)}</span>`
        ).join('')
      : '<span class="winery-category-tag">Sin categorías</span>';

    const badgesHtml = winery.badges && winery.badges.length > 0
      ? winery.badges.slice(0, 3).map((badge) => 
          `<span class="winery-badge-tag">${this.escapeHtml(this.getBadgeLabel(badge))}</span>`
        ).join('')
      : '<span class="winery-badge-tag">Sin badges</span>';

    return `
      <div class="winery-card">
        <div class="winery-card-header">
          <h3 class="winery-card-name">${this.escapeHtml(nombre)}</h3>
          <span class="winery-role-badge">Bodega</span>
        </div>
        <p class="winery-card-email">${this.escapeHtml(email)}</p>
        
        <div class="winery-card-info">
          <div class="winery-info-row">
            <span class="winery-info-label">KYC:</span>
            <span class="winery-info-value">${this.escapeHtml(kycStatus)}</span>
          </div>
          <div class="winery-info-row">
            <span class="winery-info-label">Suscripción:</span>
            <span class="winery-info-value">${this.escapeHtml(subscribStatus)}</span>
          </div>
          <div class="winery-info-row">
            <span class="winery-info-label">Registrado:</span>
            <span class="winery-info-value">${createdAt}</span>
          </div>
        </div>

        <div class="winery-card-categories">
          ${categoriesHtml}
        </div>

        <div class="winery-card-badges">
          ${badgesHtml}
        </div>

        <div class="winery-card-actions">
          <button class="winery-view-btn">Ver Detalles</button>
        </div>
      </div>
    `;
  }

  showWineryDetail(winery) {
    const modal = document.getElementById('wineryDetailModal');
    
    document.getElementById('modalWineryName').textContent = winery.nombre || 'Sin nombre';
    document.getElementById('modalWineryEmail').textContent = winery.email || 'No especificado';
    document.getElementById('modalWineryId').textContent = winery.id || 'N/A';
    document.getElementById('modalWineryProvider').textContent = winery.provider || 'email';
    document.getElementById('modalWineryKYC').textContent = winery.kyc_status || 'pendiente';
    document.getElementById('modalWinerySubscription').textContent = winery.subscription_status || 'activa';
    
    const createdAt = winery.created_at 
      ? new Date(winery.created_at).toLocaleDateString('es-ES')
      : 'N/A';
    document.getElementById('modalWineryCreated').textContent = createdAt;

    // Categorías
    const categoriesHtml = winery.categorias && winery.categorias.length > 0
      ? winery.categorias.map(cat => `<span class="winery-category-tag">${this.escapeHtml(cat)}</span>`).join(' ')
      : 'Sin categorías';
    document.getElementById('modalWineryCategories').innerHTML = categoriesHtml;

    const badgesHtml = winery.badges && winery.badges.length > 0
      ? winery.badges.map((badge) => `<span class="winery-badge-tag">${this.escapeHtml(this.getBadgeLabel(badge))}</span>`).join(' ')
      : 'Sin badges';
    document.getElementById('modalWineryBadges').innerHTML = badgesHtml;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    const modal = document.getElementById('wineryDetailModal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  renderPagination(totalPages, container) {
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `<span class="pagination-info">Página ${this.currentPage} de ${totalPages}</span>`;
    
    // Botón anterior
    html += `<button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
             onclick="wineryManager.goToPage(${this.currentPage - 1})">← Anterior</button>`;
    
    // Botones de páginas
    const maxButtons = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      html += `<button class="pagination-btn" onclick="wineryManager.goToPage(1)">1</button>`;
      if (startPage > 2) html += '<span class="pagination-info">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
               onclick="wineryManager.goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="pagination-info">...</span>';
      html += `<button class="pagination-btn" onclick="wineryManager.goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Botón siguiente
    html += `<button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} 
             onclick="wineryManager.goToPage(${this.currentPage + 1})">Siguiente →</button>`;

    container.innerHTML = html;
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredWineries.length / this.itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.selectedOptions)
      .map((option) => option.value)
      .filter((value) => value);
  }

  applySelectValues(selectId, values) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const hasValues = values.length > 0;
    Array.from(select.options).forEach((option) => {
      if (!option.value) {
        option.selected = !hasValues;
        return;
      }
      option.selected = values.includes(option.value);
    });
  }

  clearSelect(selectId) {
    this.applySelectValues(selectId, []);
  }

  syncHeaderOffset() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const measured = Math.ceil(header.offsetHeight || 0);
    const height = Math.max(96, Math.min(measured || 0, 180));
    document.documentElement.style.setProperty('--header-height', `${height}px`);
  }

  getBadgeLabel(badge) {
    const labels = {
      do_rioja: 'DO Rioja',
      doca_rioja: 'DOCa Rioja',
      do_ribera_duero: 'DO Ribera del Duero',
      do_ribeiro: 'DO Ribeiro',
      do_rueda: 'DO Rueda',
      do_ribera_sacra: 'DO Ribeira Sacra',
      do_priorat: 'DO Priorat',
      do_penedes: 'DO Penedes',
      do_rias_baixas: 'DO Rias Baixas',
      do_jerez: 'DO Jerez',
      uva_tempranillo: 'Uva Tempranillo',
      uva_garnacha: 'Uva Garnacha',
      uva_albarino: 'Uva Albarino',
      uva_verdejo: 'Uva Verdejo',
      uva_mencia: 'Uva Mencia',
      uva_cabernet: 'Uva Cabernet',
      uva_merlot: 'Uva Merlot',
      uva_syrah: 'Uva Syrah',
      uva_chardonnay: 'Uva Chardonnay',
      uva_sauvignon_blanc: 'Uva Sauvignon Blanc',
      estilo_tinto: 'Estilo Tinto',
      estilo_blanco: 'Estilo Blanco',
      estilo_rosado: 'Estilo Rosado',
      estilo_espumoso: 'Estilo Espumoso',
      estilo_dulce: 'Estilo Dulce',
      estilo_fortificado: 'Estilo Fortificado',
      estilo_natural: 'Estilo Natural',
      crianza_joven: 'Crianza Joven',
      crianza_crianza: 'Crianza',
      crianza_reserva: 'Reserva',
      crianza_gran_reserva: 'Gran Reserva',
      cert_ecologico: 'Cert Ecologico',
      cert_biodinamico: 'Cert Biodinamico',
      cert_vegano: 'Cert Vegano',
      cert_sin_sulfitos: 'Cert Sin Sulfitos',
      premiada: 'Premiada',
      medalla_oro: 'Medalla Oro',
      medalla_plata: 'Medalla Plata',
      medalla_bronce: 'Medalla Bronce',
    };

    return labels[badge] || badge;
  }
}

// Inicializar cuando el DOM esté listo
let wineryManager;
document.addEventListener('DOMContentLoaded', () => {
  wineryManager = new WineryListManager();
});
