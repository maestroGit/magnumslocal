// Hamburger menu logic for mobile nav in view.html

document.addEventListener('DOMContentLoaded', function () {
  const nav = document.querySelector('.site-header .nav');
  const hamburger = document.getElementById('hamburger-menu-btn');
  if (!nav || !hamburger) return;

  hamburger.addEventListener('click', function (e) {
    e.stopPropagation();
    nav.classList.toggle('open');
    const isOpen = nav.classList.contains('open');
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
      hamburger.classList.add('active');
    } else {
      hamburger.classList.remove('active');
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== hamburger) {
      nav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('active');
    }
  });

  // Optional: close menu on navigation
  nav.querySelectorAll('a,button').forEach(function (el) {
    el.addEventListener('click', function () {
      nav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('active');
    });
  });
});
