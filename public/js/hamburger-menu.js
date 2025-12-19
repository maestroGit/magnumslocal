// Hamburger menu logic for mobile nav in view.html

document.addEventListener('DOMContentLoaded', function () {
  const nav = document.querySelector('.site-header .nav');
  const hamburger = document.getElementById('hamburger-menu-btn');
  if (!nav || !hamburger) return;

  hamburger.addEventListener('click', function (e) {
    e.stopPropagation();
    nav.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
    if (nav.classList.contains('open')) {
      nav.style.display = 'flex';
    } else {
      nav.style.display = '';
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== hamburger) {
      nav.classList.remove('open');
      nav.style.display = '';
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  // Optional: close menu on navigation
  nav.querySelectorAll('a,button').forEach(function (el) {
    el.addEventListener('click', function () {
      nav.classList.remove('open');
      nav.style.display = '';
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
});
