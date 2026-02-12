/**
 * scrollFooter.js
 * Maneja la navegación del botón "Winery" en el header
 * - Si está en view.html con wallet global: scroll a la sección
 * - Si está en otras páginas: navega a list-winery.html
 */

document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('go-bodega-wallet');
  if (btn) {
    btn.addEventListener('click', function() {
      // Intentar scroll a wallet-global-card (si está en view.html)
      var el = document.getElementById('wallet-global-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Si no existe el elemento, navegar a list-winery.html
        window.location.href = 'list-winery.html';
      }
    });
  }
});
