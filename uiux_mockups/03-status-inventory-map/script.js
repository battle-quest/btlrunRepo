/**
 * btl.run PWA — UI/UX Mock (Screen 03: Status / Inventory / Map)
 *
 * Handles:
 * - Tab switching (Status / Map / Tributes)
 * - Mock data population
 * - Back navigation (rail click)
 */

(function () {
  // Navigation
  const backRail = document.getElementById('backRail');
  if (backRail) {
    backRail.addEventListener('click', (e) => {
      e.preventDefault();
      // In real app, go back to previous screen
      history.back();
    });
  }

  // Tabs
  const tabs = {
    status: document.getElementById('tabStatus'),
    map: document.getElementById('tabMap'),
    tributes: document.getElementById('tabTributes'),
  };

  const panels = {
    status: document.getElementById('panelStatus'),
    map: document.getElementById('panelMap'),
    tributes: document.getElementById('panelTributes'),
  };

  function switchTab(tabId) {
    // Reset all
    Object.values(tabs).forEach(el => {
      el?.classList.remove('tab-btn--active');
      el?.setAttribute('aria-selected', 'false');
    });
    Object.values(panels).forEach(el => {
      if (el) el.hidden = true;
      el?.classList.remove('tab-panel--active');
    });

    // Activate target
    const btn = tabs[tabId];
    const pnl = panels[tabId];
    
    if (btn && pnl) {
      btn.classList.add('tab-btn--active');
      btn.setAttribute('aria-selected', 'true');
      pnl.hidden = false;
      pnl.classList.add('tab-panel--active');
    }
  }

  // Bind click events
  if (tabs.status) tabs.status.addEventListener('click', () => switchTab('status'));
  if (tabs.map) tabs.map.addEventListener('click', () => switchTab('map'));
  if (tabs.tributes) tabs.tributes.addEventListener('click', () => switchTab('tributes'));

  // Initialize from URL param
  const params = new URLSearchParams(window.location.search);
  const activeTab = params.get('tab') || 'status';
  if (tabs[activeTab]) {
    switchTab(activeTab);
  }

  // Render Mock Inventory
  const invGrid = document.getElementById('invGrid');
  if (invGrid) {
    const items = [
      { emoji: '🗡️', name: 'Rusty Shiv', meta: 'DMG +2' },
      { emoji: '🎒', name: 'Backpack', meta: 'Slots +2' },
      { emoji: '🍎', name: 'Dried Fruit', meta: 'Food +15' },
      { emoji: '💧', name: 'Water Bottle', meta: 'Empty' },
      { emoji: '🗺️', name: 'Torn Map', meta: 'Sector 4' },
    ];

    invGrid.innerHTML = items.map(item => `
      <div class="inv-item">
        <div class="inv-icon">${item.emoji}</div>
        <div class="inv-name">${item.name}</div>
        <div class="inv-meta">
          <span class="inv-chip">${item.meta}</span>
        </div>
      </div>
    `).join('');
  }

  // Render Mock Tributes
  const tributesList = document.getElementById('tributesList');
  if (tributesList) {
    const tributes = [
      { emoji: '👤', name: 'You', status: 'Alive', isYou: true, isDead: false },
      { emoji: '🏹', name: 'Cato', status: 'Alive', isYou: false, isDead: false },
      { emoji: '🦊', name: 'Foxface', status: 'Deceased', isYou: false, isDead: true },
      { emoji: '🛡️', name: 'Thresh', status: 'Alive', isYou: false, isDead: false },
      { emoji: '🌿', name: 'Rue', status: 'Alive', isYou: false, isDead: false },
      { emoji: '⚡', name: 'Marvel', status: 'Deceased', isYou: false, isDead: true },
    ];

    tributesList.innerHTML = tributes.map(t => `
      <div class="tribute-row ${t.isYou ? 'is-you' : ''} ${t.isDead ? 'is-dead' : ''}">
        <div class="tribute-avatar-mini">${t.emoji}</div>
        <div class="tribute-info">
          <div class="tribute-name-mini">${t.name}</div>
          <div class="tribute-status">${t.status}</div>
        </div>
        <div class="tribute-badge ${t.isDead ? 'badge--dead' : (t.isYou ? 'badge--you' : 'badge--alive')}">
          ${t.isDead ? '💀' : (t.isYou ? 'YOU' : '❤')}
        </div>
      </div>
    `).join('');
  }

  // Mock Map Grid Generation
  const mapGrid = document.getElementById('mapGrid');
  if (mapGrid) {
    const rows = 10;
    const cols = 8;
    mapGrid.style.setProperty('--map-rows', rows);
    mapGrid.style.setProperty('--map-cols', cols);

    let html = '';
    for (let i = 0; i < rows * cols; i++) {
      // Randomly assign states for demo
      const isExplored = Math.random() > 0.6;
      const isPath = isExplored && Math.random() > 0.7;
      const isCurrent = i === 43; // Arbitrary center tile

      let className = 'map-tile map-tile--fog';
      let content = '';

      if (isCurrent) {
        className = 'map-tile map-tile--current';
        content = '<div class="map-tile-icon">📍</div>';
      } else if (isPath) {
        className = 'map-tile map-tile--path';
      } else if (isExplored) {
        className = 'map-tile map-tile--explored';
        if (Math.random() > 0.8) content = '<div class="map-tile-icon">🌲</div>';
      }

      html += `<div class="${className}">${content}</div>`;
    }
    mapGrid.innerHTML = html;
  }
})();
