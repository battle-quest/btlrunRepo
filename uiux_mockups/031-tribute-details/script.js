/**
 * btl.run PWA — UI/UX Mock (Screen 031: Tribute Details)
 */

(function () {
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // In real app, close modal or go back
      history.back();
    });
  }

  // Populate from URL params (mock)
  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');
  if (name) {
    const nameEl = document.getElementById('tributeName');
    if (nameEl) nameEl.textContent = name;
  }
})();
