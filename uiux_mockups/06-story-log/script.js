/**
 * btl.run PWA — UI/UX Mock (Screen 06: Story Log)
 */

(function () {
  // Navigation
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // In real app, go back to previous screen (waiting room or game)
      history.back();
    });
  }

  // Tabs
  const tabNarrative = document.getElementById('tabNarrative');
  const tabEvents = document.getElementById('tabEvents');
  const viewNarrative = document.getElementById('viewNarrative');
  const viewEvents = document.getElementById('viewEvents');

  function switchTab(tab) {
    if (tab === 'narrative') {
      tabNarrative.classList.add('active');
      tabNarrative.setAttribute('aria-selected', 'true');
      tabEvents.classList.remove('active');
      tabEvents.setAttribute('aria-selected', 'false');
      
      viewNarrative.hidden = false;
      viewEvents.hidden = true;
    } else {
      tabEvents.classList.add('active');
      tabEvents.setAttribute('aria-selected', 'true');
      tabNarrative.classList.remove('active');
      tabNarrative.setAttribute('aria-selected', 'false');
      
      viewEvents.hidden = false;
      viewNarrative.hidden = true;
    }
  }

  if (tabNarrative && tabEvents) {
    tabNarrative.addEventListener('click', () => switchTab('narrative'));
    tabEvents.addEventListener('click', () => switchTab('events'));
  }
})();
