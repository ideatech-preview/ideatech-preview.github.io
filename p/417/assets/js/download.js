// ============================================================
// IDEATECH - Download Library Page
// ============================================================

(function () {
  'use strict';

  // ---- Elements ----
  const filterBtns     = document.querySelectorAll('.dl-filter-btn');
  const sidebarCatBtns = document.querySelectorAll('.sidebar-cat-btn');
  const resourceCards  = document.querySelectorAll('.resource-card');
  const searchInput    = document.getElementById('searchInput');
  const cardCountEl    = document.getElementById('cardCount');
  const noResultsEl    = document.getElementById('noResults');
  const modalOverlay   = document.getElementById('modalOverlay');
  const modalClose     = document.getElementById('modalClose');
  const modalResource  = document.getElementById('modalResourceName');
  const dlForm         = document.getElementById('dlForm');
  const modalSuccess   = document.getElementById('modalSuccess');

  let currentFilter = 'all';
  let currentSearch = '';

  // ============================================================
  // Filter & Search
  // ============================================================

  function applyFilters() {
    let visibleCount = 0;

    resourceCards.forEach(card => {
      const category = card.dataset.category || '';
      const title    = (card.dataset.title || '').toLowerCase();

      const matchCategory = currentFilter === 'all' || category === currentFilter;
      const matchSearch   = currentSearch === '' || title.includes(currentSearch);

      const visible = matchCategory && matchSearch;
      card.classList.toggle('is-hidden', !visible);
      if (visible) visibleCount++;
    });

    // Update count
    if (cardCountEl) {
      cardCountEl.textContent = visibleCount + '件';
    }

    // No results message
    if (noResultsEl) {
      noResultsEl.hidden = visibleCount > 0;
    }
  }

  // Toolbar category pills
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filter);
    });
  });

  // Sidebar category buttons
  sidebarCatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filter);

      // Scroll to grid on mobile
      const gridSection = document.getElementById('resourceGrid');
      if (gridSection && window.innerWidth < 768) {
        gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  function setFilter(filter) {
    currentFilter = filter;

    // Sync toolbar pills
    filterBtns.forEach(b => {
      b.classList.toggle('is-active', b.dataset.filter === filter);
    });

    // Sync sidebar buttons
    sidebarCatBtns.forEach(b => {
      b.classList.toggle('is-active', b.dataset.filter === filter);
    });

    applyFilters();
  }

  // Keyword search
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      currentSearch = e.target.value.trim().toLowerCase();
      applyFilters();
    });

    // Clear on Escape
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        currentSearch = '';
        applyFilters();
      }
    });
  }

  // ============================================================
  // Modal
  // ============================================================

  function openModal(resourceName) {
    if (!modalOverlay) return;

    // Set resource name
    if (modalResource) {
      modalResource.textContent = resourceName || '';
    }

    // Show form, hide success
    if (dlForm)        dlForm.hidden = false;
    if (modalSuccess)  modalSuccess.hidden = true;

    // Open overlay
    modalOverlay.classList.add('is-open');
    modalOverlay.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';

    // Focus first input
    requestAnimationFrame(() => {
      const firstInput = dlForm && dlForm.querySelector('input');
      if (firstInput) firstInput.focus();
    });
  }

  function closeModal() {
    if (!modalOverlay) return;

    modalOverlay.classList.remove('is-open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Reset form after transition
    setTimeout(() => {
      if (dlForm) dlForm.reset();
      if (dlForm)       dlForm.hidden = false;
      if (modalSuccess) modalSuccess.hidden = true;
    }, 300);
  }

  // Open: any [data-modal-open] button
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal(btn.dataset.resource || '');
    });
  });

  // Close: X button
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  // Close: backdrop click
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Close: Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOverlay?.classList.contains('is-open')) {
      closeModal();
    }
  });

  // ============================================================
  // Form submit
  // ============================================================

  if (dlForm) {
    dlForm.addEventListener('submit', e => {
      e.preventDefault();

      // Basic validation
      const inputs = dlForm.querySelectorAll('input[required]');
      let valid = true;
      inputs.forEach(input => {
        if (!input.value.trim()) {
          input.focus();
          valid = false;
          return;
        }
        if (input.type === 'email' && !isValidEmail(input.value)) {
          input.focus();
          valid = false;
          return;
        }
      });
      if (!valid) return;

      // Simulate API call (replace with actual endpoint)
      const submitBtn = dlForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = '処理中...';
        submitBtn.disabled = true;
      }

      setTimeout(() => {
        // Show success state
        dlForm.hidden = true;
        if (modalSuccess) modalSuccess.hidden = false;

        // Auto close after 4s
        setTimeout(closeModal, 4000);
      }, 800);
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ============================================================
  // Toolbar: sticky offset adjustment
  // (toolbar sticks below header; dl-sidebar top needs updating)
  // ============================================================

  const dlToolbar = document.getElementById('dlToolbar');

  if (dlToolbar) {
    const updateSidebarTop = () => {
      const toolbarH = dlToolbar.offsetHeight;
      const headerH  = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
        10
      ) || 80;
      const offset = headerH + toolbarH + 24;

      document.querySelectorAll('.dl-sidebar').forEach(el => {
        el.style.top = offset + 'px';
      });
    };

    updateSidebarTop();
    window.addEventListener('resize', updateSidebarTop, { passive: true });
  }

})();
