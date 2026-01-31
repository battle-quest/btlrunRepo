/**
 * btl.run PWA — UI/UX Mock (Screen 03: Status / Inventory / Map)
 *
 * Reads URL params and renders a status/inventory/map snapshot.
 * Two tabs: Status (health/inventory) and Map (explored territory).
 * Navigation back to 02 uses View Transitions when available.
 *
 * STORAGE NOTE: The explored map data is stored in localStorage under the key
 * 'btlrun:exploredMap:{gameId}'. This allows the map to persist across sessions
 * and be rendered without server round-trips.
 */

(function () {
  const params = new URLSearchParams(window.location.search);
  const gameType = params.get('type') || 'classic';
  const gameMap = params.get('map') || 'inferno-pit';
  const tributeCount = parseInt(params.get('count'), 10) || 6;
  const userChoice = parseInt(params.get('choice'), 10) || 1;
  const activeTab = params.get('tab') || 'status';

  /** @type {HTMLElement | null} */
  const screen = document.querySelector('.screen');
  /** @type {HTMLElement | null} */
  const typeBadge = document.getElementById('typeBadge');
  /** @type {HTMLElement | null} */
  const mapPill = document.getElementById('mapPill');
  /** @type {HTMLElement | null} */
  const alivePill = document.getElementById('alivePill');
  /** @type {HTMLElement | null} */
  const turnPill = document.getElementById('turnPill');
  /** @type {HTMLAnchorElement | null} */
  const backRail = /** @type {HTMLAnchorElement | null} */ (document.getElementById('backRail'));

  // Vitals elements
  const hpFill = document.getElementById('hpFill');
  const stamFill = document.getElementById('stamFill');
  const foodFill = document.getElementById('foodFill');
  const heatFill = document.getElementById('heatFill');
  const hpVal = document.getElementById('hpVal');
  const stamVal = document.getElementById('stamVal');
  const foodVal = document.getElementById('foodVal');
  const heatVal = document.getElementById('heatVal');
  const invGrid = document.getElementById('invGrid');

  // Tab elements
  const tabStatus = document.getElementById('tabStatus');
  const tabMap = document.getElementById('tabMap');
  const panelStatus = document.getElementById('panelStatus');
  const panelMap = document.getElementById('panelMap');
  const mapGrid = document.getElementById('mapGrid');
  const playerMarker = document.getElementById('playerMarker');

  const TYPE_LABELS = { classic: 'Classic', spicy: 'Spicy', funny: 'Funny' };
  const MAP_LABELS = { 'arena-prime': 'Arena Prime', 'inferno-pit': 'Inferno Pit', 'chaos-carnival': 'Chaos Carnival' };

  /**
   * Map size presets based on tribute count
   * Smaller games = smaller arena, larger games = bigger arena
   */
  const MAP_SIZES = {
    small:  { cols: 6,  rows: 8,  gap: 4, label: 'Small Arena' },   // 6-8 tributes
    medium: { cols: 8,  rows: 10, gap: 3, label: 'Standard Arena' }, // 10-16 tributes
    large:  { cols: 10, rows: 12, gap: 2, label: 'Grand Arena' },    // 20-24 tributes
  };

  /**
   * Get map size preset based on tribute count
   * @param {number} count
   * @returns {'small' | 'medium' | 'large'}
   */
  function getMapSizeKey(count) {
    if (count <= 8) return 'small';
    if (count <= 16) return 'medium';
    return 'large';
  }

  const mapSizeKey = getMapSizeKey(tributeCount);
  const mapSize = MAP_SIZES[mapSizeKey];

  /** LocalStorage key for explored map data (includes size for different presets) */
  const EXPLORED_MAP_KEY = `btlrun:exploredMap:mock-${mapSizeKey}-v1`;

  function init() {
    if (screen) screen.dataset.type = gameType;
    if (typeBadge) typeBadge.textContent = TYPE_LABELS[gameType] || 'Classic';
    if (mapPill) mapPill.textContent = MAP_LABELS[gameMap] || 'Inferno Pit';
    if (alivePill) alivePill.textContent = `${tributeCount} alive`;
    if (turnPill) turnPill.textContent = 'Turn 1';

    // Set map dimensions based on tribute count
    MAP_COLS = mapSize.cols;
    MAP_ROWS = mapSize.rows;

    // Apply CSS variables for grid sizing
    if (mapGrid) {
      mapGrid.style.setProperty('--map-cols', String(MAP_COLS));
      mapGrid.style.setProperty('--map-rows', String(MAP_ROWS));
      mapGrid.style.setProperty('--map-gap', `${mapSize.gap}px`);
    }

    // Mirror the 02 left-rail values so the transition feels consistent.
    const hp = userChoice === 1 ? 82 : userChoice === 2 ? 74 : 68;
    const stam = userChoice === 1 ? 66 : userChoice === 2 ? 80 : 58;
    const food = userChoice === 1 ? 52 : userChoice === 2 ? 64 : 44;
    const heat = gameMap === 'inferno-pit' ? (userChoice === 2 ? 58 : 42) : 28;

    setFill(hpFill, hpVal, hp);
    setFill(stamFill, stamVal, stam);
    setFill(foodFill, foodVal, food);
    setFill(heatFill, heatVal, heat);

    renderInventory();
    initTabs();
    renderExploredMap();

    if (backRail) {
      backRail.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(
          `../02-game-turn/index.html?type=${encodeURIComponent(gameType)}&map=${encodeURIComponent(gameMap)}&count=${tributeCount}&choice=${userChoice}`
        );
      });
    }
  }

  /**
   * Initialize tab switching behavior
   */
  function initTabs() {
    // Set initial active tab from URL param
    if (activeTab === 'map') {
      switchToTab('map');
    }

    if (tabStatus) {
      tabStatus.addEventListener('click', () => switchToTab('status'));
    }

    if (tabMap) {
      tabMap.addEventListener('click', () => switchToTab('map'));
    }
  }

  /**
   * Switch to the specified tab
   * @param {'status' | 'map'} tab
   */
  function switchToTab(tab) {
    const isStatus = tab === 'status';

    // Update tab buttons
    if (tabStatus) {
      tabStatus.classList.toggle('tab-btn--active', isStatus);
      tabStatus.setAttribute('aria-selected', String(isStatus));
    }
    if (tabMap) {
      tabMap.classList.toggle('tab-btn--active', !isStatus);
      tabMap.setAttribute('aria-selected', String(!isStatus));
    }

    // Update panels
    if (panelStatus) {
      panelStatus.classList.toggle('tab-panel--active', isStatus);
      panelStatus.hidden = !isStatus;
    }
    if (panelMap) {
      panelMap.classList.toggle('tab-panel--active', !isStatus);
      panelMap.hidden = isStatus;
    }

    // Update URL without reload (for deep linking)
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }

  /** Map dimensions (set dynamically based on tribute count) */
  let MAP_COLS = 8;
  let MAP_ROWS = 10;

  /** Terrain types with icons */
  const TERRAIN = {
    empty: '',
    forest: '🌲',
    water: '💧',
    mountain: '⛰️',
    ruins: '🏚️',
    camp: '🏕️',
    danger: '⚠️',
    start: '🚩',
  };

  /**
   * Get explored map data from localStorage
   * @returns {{ tiles: string[][], path: Array<{col: number, row: number}>, current: {col: number, row: number} }}
   */
  function getExploredMapData() {
    try {
      const stored = localStorage.getItem(EXPLORED_MAP_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to read explored map from localStorage:', e);
    }

    // Generate mock exploration data
    // Tile states: 'fog' | 'explored' | 'path' | 'current'
    // We'll also store terrain type for explored tiles
    const mockData = generateMockMapData();
    saveExploredMapData(mockData);
    return mockData;
  }

  /**
   * Generate mock map data with exploration appropriate to map size
   * @returns {{ tiles: Array<Array<{state: string, terrain: string}>>, path: Array<{col: number, row: number}>, current: {col: number, row: number} }}
   */
  function generateMockMapData() {
    // Initialize all tiles as fog
    const tiles = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      tiles[row] = [];
      for (let col = 0; col < MAP_COLS; col++) {
        tiles[row][col] = { state: 'fog', terrain: 'empty' };
      }
    }

    // Get path and terrain based on map size
    const { pathCoords, terrainMap, exploredTerrain, dangerZones } = getMapPreset();

    // Mark path tiles
    pathCoords.forEach((coord) => {
      if (coord.row < MAP_ROWS && coord.col < MAP_COLS) {
        tiles[coord.row][coord.col].state = 'path';
        const key = `${coord.col},${coord.row}`;
        if (terrainMap[key]) {
          tiles[coord.row][coord.col].terrain = terrainMap[key];
        }
      }
    });

    // Mark current position
    const current = pathCoords[pathCoords.length - 1];
    tiles[current.row][current.col].state = 'current';

    // Mark tiles visible from path (adjacent tiles become "explored")
    pathCoords.forEach((coord) => {
      const adjacentOffsets = [
        { dc: -1, dr: -1 }, { dc: 0, dr: -1 }, { dc: 1, dr: -1 },
        { dc: -1, dr: 0 },                      { dc: 1, dr: 0 },
        { dc: -1, dr: 1 },  { dc: 0, dr: 1 },  { dc: 1, dr: 1 },
      ];

      adjacentOffsets.forEach((offset) => {
        const newCol = coord.col + offset.dc;
        const newRow = coord.row + offset.dr;
        if (newRow >= 0 && newRow < MAP_ROWS && newCol >= 0 && newCol < MAP_COLS) {
          if (tiles[newRow][newCol].state === 'fog') {
            tiles[newRow][newCol].state = 'explored';
          }
        }
      });
    });

    // Add terrain to explored tiles
    Object.entries(exploredTerrain).forEach(([key, terrain]) => {
      const [col, row] = key.split(',').map(Number);
      if (tiles[row] && tiles[row][col] && tiles[row][col].state === 'explored') {
        tiles[row][col].terrain = terrain;
      }
    });

    // Add danger zones in fog
    dangerZones.forEach(([col, row]) => {
      if (tiles[row] && tiles[row][col] && tiles[row][col].state === 'fog') {
        tiles[row][col].terrain = 'danger';
      }
    });

    return {
      tiles,
      path: pathCoords,
      current,
    };
  }

  /**
   * Get exploration preset based on current map size
   */
  function getMapPreset() {
    if (mapSizeKey === 'small') {
      return getSmallMapPreset();
    } else if (mapSizeKey === 'large') {
      return getLargeMapPreset();
    }
    return getMediumMapPreset();
  }

  /**
   * Small map (6x8) - cozy arena for 6-8 tributes
   * More densely explored since arena is smaller
   */
  function getSmallMapPreset() {
    const pathCoords = [
      { col: 1, row: 0 },  // Start
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
      { col: 3, row: 2 },
      { col: 4, row: 2 },
      { col: 4, row: 3 },
      { col: 3, row: 3 },
      { col: 3, row: 4 },
      { col: 2, row: 4 },
      { col: 2, row: 5 },
      { col: 3, row: 5 },
      { col: 4, row: 5 },
      { col: 4, row: 6 },
      { col: 3, row: 6 },  // Current
    ];

    const terrainMap = {
      '1,0': 'start',
      '4,2': 'ruins',
      '3,4': 'camp',
      '2,5': 'water',
    };

    const exploredTerrain = {
      '0,1': 'forest',
      '5,3': 'mountain',
      '1,5': 'forest',
      '5,5': 'mountain',
    };

    const dangerZones = [[5, 7], [4, 7]];

    return { pathCoords, terrainMap, exploredTerrain, dangerZones };
  }

  /**
   * Medium map (8x10) - standard arena for 10-16 tributes
   */
  function getMediumMapPreset() {
    const pathCoords = [
      { col: 1, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
      { col: 3, row: 2 },
      { col: 4, row: 1 },
      { col: 5, row: 1 },
      { col: 6, row: 1 },
      { col: 6, row: 2 },
      { col: 6, row: 3 },
      { col: 5, row: 3 },
      { col: 5, row: 4 },
      { col: 6, row: 4 },
      { col: 6, row: 5 },
      { col: 5, row: 5 },
      { col: 4, row: 5 },
      { col: 4, row: 4 },
      { col: 3, row: 4 },
      { col: 3, row: 5 },
      { col: 2, row: 5 },
      { col: 2, row: 6 },
      { col: 3, row: 6 },
      { col: 3, row: 7 },
      { col: 2, row: 7 },
      { col: 1, row: 7 },
      { col: 1, row: 6 },
      { col: 0, row: 6 },
      { col: 0, row: 5 },
      { col: 1, row: 5 },
      { col: 2, row: 8 },
      { col: 3, row: 8 },
      { col: 4, row: 7 },  // Current
    ];

    const terrainMap = {
      '1,0': 'start',
      '6,2': 'ruins',
      '4,4': 'camp',
      '0,5': 'water',
      '5,1': 'forest',
      '6,5': 'mountain',
      '1,6': 'forest',
      '3,7': 'ruins',
    };

    const exploredTerrain = {
      '0,4': 'water',
      '7,3': 'mountain',
      '7,4': 'mountain',
      '4,6': 'forest',
      '5,7': 'forest',
      '0,7': 'water',
      '1,8': 'forest',
    };

    const dangerZones = [[5, 9], [6, 9], [7, 7]];

    return { pathCoords, terrainMap, exploredTerrain, dangerZones };
  }

  /**
   * Large map (10x12) - grand arena for 20-24 tributes
   * More unexplored territory, longer exploration path
   */
  function getLargeMapPreset() {
    const pathCoords = [
      // Start in corner
      { col: 1, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
      { col: 3, row: 2 },
      // Explore right
      { col: 4, row: 2 },
      { col: 5, row: 2 },
      { col: 6, row: 2 },
      { col: 7, row: 2 },
      { col: 7, row: 3 },
      { col: 8, row: 3 },
      { col: 8, row: 4 },
      // Down right side
      { col: 7, row: 4 },
      { col: 7, row: 5 },
      { col: 8, row: 5 },
      { col: 8, row: 6 },
      // Cut back to center
      { col: 7, row: 6 },
      { col: 6, row: 6 },
      { col: 5, row: 6 },
      { col: 5, row: 5 },
      { col: 4, row: 5 },
      { col: 4, row: 4 },
      { col: 3, row: 4 },
      // Explore left side
      { col: 2, row: 4 },
      { col: 2, row: 5 },
      { col: 1, row: 5 },
      { col: 1, row: 6 },
      { col: 0, row: 6 },
      { col: 0, row: 7 },
      { col: 1, row: 7 },
      { col: 2, row: 7 },
      // Move toward center-bottom
      { col: 3, row: 7 },
      { col: 3, row: 8 },
      { col: 4, row: 8 },
      { col: 5, row: 8 },
      { col: 5, row: 9 },
      { col: 4, row: 9 },  // Current position
    ];

    const terrainMap = {
      '1,0': 'start',
      '7,2': 'ruins',
      '8,4': 'mountain',
      '4,4': 'camp',
      '0,6': 'water',
      '5,2': 'forest',
      '2,7': 'ruins',
      '5,8': 'forest',
    };

    const exploredTerrain = {
      '0,5': 'water',
      '9,3': 'mountain',
      '9,5': 'mountain',
      '6,5': 'forest',
      '3,6': 'forest',
      '0,8': 'water',
      '1,8': 'forest',
      '6,8': 'forest',
      '9,6': 'mountain',
    };

    const dangerZones = [[7, 10], [8, 10], [9, 8], [6, 11], [7, 11]];

    return { pathCoords, terrainMap, exploredTerrain, dangerZones };
  }

  /**
   * Save explored map data to localStorage
   * @param {{ tiles: Array<Array<{state: string, terrain: string}>>, path: Array<{col: number, row: number}>, current: {col: number, row: number} }} data
   */
  function saveExploredMapData(data) {
    try {
      localStorage.setItem(EXPLORED_MAP_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save explored map to localStorage:', e);
    }
  }

  /**
   * Render the grid-based explored map
   */
  function renderExploredMap() {
    if (!mapGrid) return;

    const mapData = getExploredMapData();
    const tilesHtml = [];

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = mapData.tiles[row][col];
        const terrainIcon = TERRAIN[tile.terrain] || '';
        const stateClass = `map-tile--${tile.state}`;

        tilesHtml.push(`
          <div class="map-tile ${stateClass}" data-col="${col}" data-row="${row}">
            ${terrainIcon ? `<span class="map-tile-icon">${terrainIcon}</span>` : ''}
          </div>
        `);
      }
    }

    mapGrid.innerHTML = tilesHtml.join('');

    // Position player marker on current tile
    if (playerMarker && mapData.current) {
      const tileWidth = 100 / MAP_COLS;
      const tileHeight = 100 / MAP_ROWS;
      const markerLeft = (mapData.current.col + 0.5) * tileWidth;
      const markerTop = (mapData.current.row + 0.5) * tileHeight;
      
      playerMarker.style.left = `calc(8px + ${markerLeft}%)`;
      playerMarker.style.top = `calc(8px + ${markerTop}%)`;
    }
  }

  /**
   * @param {HTMLElement | null} fillEl
   * @param {HTMLElement | null} valEl
   * @param {number} pct
   */
  function setFill(fillEl, valEl, pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    if (fillEl) fillEl.style.width = `${clamped}%`;
    if (valEl) valEl.textContent = `${clamped}%`;
  }

  function renderInventory() {
    if (!invGrid) return;

    const base = [
      { icon: '🗡️', name: 'Small knife', chip: 'Weapon', meta: 'Light' },
      { icon: '🎒', name: 'Backpack', chip: 'Gear', meta: '+capacity' },
      { icon: '🩹', name: 'Bandage', chip: 'Recovery', meta: 'x2' },
      { icon: '🥤', name: 'Water', chip: 'Supply', meta: 'x1' },
    ];

    const spicyAdds = [
      { icon: '💣', name: 'Improvised bomb', chip: 'Risk', meta: 'Single-use' },
    ];

    const funnyAdds = [
      { icon: '🧀', name: 'Cheese wheel', chip: 'Food', meta: '+morale?' },
    ];

    const items = gameType === 'spicy'
      ? base.concat(spicyAdds)
      : gameType === 'funny'
        ? base.concat(funnyAdds)
        : base;

    invGrid.innerHTML = items.map((it) => `
      <div class="inv-item">
        <div class="inv-icon">${escapeHtml(it.icon)}</div>
        <div class="inv-name">${escapeHtml(it.name)}</div>
        <div class="inv-meta">
          <div class="inv-chip">${escapeHtml(it.chip)}</div>
          <div>${escapeHtml(it.meta)}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * @param {string} str
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * @param {string} url
   */
  function navigateTo(url) {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        window.location.href = url;
      });
    } else {
      const panel = document.querySelector('.panel');
      if (panel) {
        panel.style.animation = 'fadeSlideOut 200ms ease-out forwards';
        setTimeout(() => {
          window.location.href = url;
        }, 180);
      } else {
        window.location.href = url;
      }
    }
  }

  init();
})();

