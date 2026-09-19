// ============================================================
// IDEATECH - Main JavaScript
// ============================================================

// ---- Header: scroll shadow ----
const header  = document.getElementById('header');
const menuBtn = document.getElementById('menuBtn');
const nav     = document.getElementById('nav');

if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ---- Mobile menu toggle ----
if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    menuBtn.classList.toggle('is-active', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
  });

  // Close on nav link click
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menuBtn.classList.remove('is-active');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'メニューを開く');
    });
  });
}
