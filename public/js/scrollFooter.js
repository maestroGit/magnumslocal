// Scroll suave al footer de wallet global

document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('go-bodega-wallet');
  if (btn) {
    btn.addEventListener('click', function() {
      var el = document.getElementById('wallet-global-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
});
