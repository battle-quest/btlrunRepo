/**
 * btl.run PWA — UI/UX Mock (Screen 01: Tribute Setup)
 *
 * Handles:
 * - Reading game type from URL params (?type=classic|spicy|funny)
 * - Map pack selection
 * - Tribute count selection
 * - Prepopulated AI tributes based on game type
 */

(function () {
  // ========== URL Params ==========
  const params = new URLSearchParams(window.location.search);
  const gameType = params.get('type') || 'classic';
  const userChoice = params.get('choice') || '1';

  // ========== DOM Elements ==========
  /** @type {HTMLElement | null} */
  const screen = document.querySelector('.screen');
  /** @type {HTMLElement | null} */
  const typeBadge = document.getElementById('typeBadge');
  /** @type {HTMLElement | null} */
  const rosterEl = document.getElementById('roster');
  /** @type {HTMLElement | null} */
  const mapStrip = document.getElementById('mapStrip');
  /** @type {HTMLElement[]} */
  const mapCards = Array.from(document.querySelectorAll('.map-card'));
  /** @type {NodeListOf<HTMLElement>} */
  const countBtns = document.querySelectorAll('.count-btn');
  /** @type {HTMLElement | null} */
  const beginSubtext = document.getElementById('beginSubtext');

  // ========== Game Type Config ==========
  // Note: Maps are ordered as: arena-prime, inferno-pit (center), chaos-carnival
  const TYPE_CONFIG = {
    classic: {
      label: 'Classic',
      defaultMap: 'arena-prime', // Balanced map for classic
      tributes: [
        { emoji: '🗡️', name: 'Steel Vanguard', persona: 'Calculated tactician' },
        { emoji: '🏹', name: 'Silent Arrow', persona: 'Strikes from shadows' },
        { emoji: '🛡️', name: 'Iron Wall', persona: 'Unbreakable defender' },
        { emoji: '🔥', name: 'Ember Strike', persona: 'Aggressive rusher' },
        { emoji: '🌿', name: 'Forest Ghost', persona: 'Master of terrain' },
        { emoji: '⚡', name: 'Quick Silver', persona: 'Speed over strength' },
      ],
    },
    spicy: {
      label: 'Spicy',
      defaultMap: 'inferno-pit', // Aggressive map for spicy
      tributes: [
        { emoji: '💀', name: 'Bone Crusher', persona: 'No mercy, no regrets' },
        { emoji: '🔪', name: 'Backstabber', persona: 'Alliances are temporary' },
        { emoji: '💣', name: 'Boom Boom', persona: 'Loves explosions' },
        { emoji: '🩸', name: 'Blood Hound', persona: 'Tracks wounded prey' },
        { emoji: '☠️', name: 'Death Whisper', persona: 'You won\'t hear it coming' },
        { emoji: '🐍', name: 'Venom Fang', persona: 'Poison is patience' },
      ],
    },
    funny: {
      label: 'Funny',
      defaultMap: 'chaos-carnival', // Chaotic map for funny
      tributes: [
        { emoji: '🤡', name: 'Sir Trips-a-Lot', persona: 'Danger to self and others' },
        { emoji: '🦆', name: 'Duck Commander', persona: 'Quacks under pressure' },
        { emoji: '🧀', name: 'The Big Cheese', persona: 'Mysteriously gouda' },
        { emoji: '🦙', name: 'Drama Llama', persona: 'Makes everything worse' },
        { emoji: '🥔', name: 'Spud the Unready', persona: 'Still loading...' },
        { emoji: '🎺', name: 'Trumpet Boy', persona: 'Announces everything' },
      ],
    },
  };

  // ========== State ==========
  // Always start with the center map (inferno-pit) as default for consistency
  let selectedMap = 'inferno-pit';
  let selectedCount = 6;

  // ========== Initialization ==========
  function init() {
    // Apply game type to screen
    if (screen) {
      screen.dataset.type = gameType;
    }

    // Update type badge
    if (typeBadge) {
      typeBadge.textContent = TYPE_CONFIG[gameType]?.label || 'Classic';
    }

    // Always start with the center card (index 1 = inferno-pit)
    scrollToMapIndex(1, 'auto');

    // Set default map selection
    mapCards.forEach((card) => {
      const isDefault = card.dataset.map === selectedMap;
      card.setAttribute('aria-selected', isDefault ? 'true' : 'false');
    });

    // Set default count selection
    countBtns.forEach((btn) => {
      const count = parseInt(btn.dataset.count, 10);
      btn.setAttribute('aria-selected', count === selectedCount ? 'true' : 'false');
    });

    // Render tributes
    renderTributes();
    updateBeginSubtext();
  }

  // ========== Map Selection (scroll-snap sync) ==========
  
  /**
   * Get the map card closest to the center of the strip.
   * @returns {{ index: number; el: HTMLElement | null }}
   */
  function getCenteredMapCard() {
    if (!mapStrip) return { index: 0, el: null };
    const centerX = mapStrip.scrollLeft + mapStrip.clientWidth / 2;
    let best = /** @type {HTMLElement | null} */ (null);
    let bestDist = Number.POSITIVE_INFINITY;
    let bestIndex = 0;

    for (let i = 0; i < mapCards.length; i++) {
      const card = mapCards[i];
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const dist = Math.abs(cardCenter - centerX);
      if (dist < bestDist) {
        bestDist = dist;
        best = card;
        bestIndex = i;
      }
    }
    return { index: bestIndex, el: best };
  }

  /**
   * Scroll to a map card by index, centering it.
   * @param {number} index
   * @param {"auto"|"smooth"} behavior
   */
  function scrollToMapIndex(index, behavior) {
    if (!mapStrip) return;
    const clamped = Math.max(0, Math.min(mapCards.length - 1, index));
    const card = mapCards[clamped];
    if (!card) return;
    const target = card.offsetLeft - (mapStrip.clientWidth - card.clientWidth) / 2;
    mapStrip.scrollTo({ left: Math.max(0, target), behavior });
  }

  /**
   * Apply the selected map based on scroll position.
   */
  function syncMapFromScroll() {
    const centered = getCenteredMapCard();
    if (!centered.el) return;
    const newMap = centered.el.dataset.map;
    if (newMap && newMap !== selectedMap) {
      selectedMap = newMap;
      mapCards.forEach((c) => {
        c.setAttribute('aria-selected', c.dataset.map === selectedMap ? 'true' : 'false');
      });
    }
  }

  // Click/tap on map card: scroll to center and apply
  mapCards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      scrollToMapIndex(idx, 'smooth');
      selectedMap = card.dataset.map || selectedMap;
      mapCards.forEach((c) => {
        c.setAttribute('aria-selected', c === card ? 'true' : 'false');
      });
    });

    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      card.click();
    });
  });

  // Scroll sync
  if (mapStrip) {
    let mapRaf = 0;
    mapStrip.addEventListener('scroll', () => {
      if (mapRaf) window.cancelAnimationFrame(mapRaf);
      mapRaf = window.requestAnimationFrame(syncMapFromScroll);
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (mapRaf) window.cancelAnimationFrame(mapRaf);
      mapRaf = window.requestAnimationFrame(syncMapFromScroll);
    });
  }

  // ========== Count Selection ==========
  countBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCount = parseInt(btn.dataset.count, 10) || 6;
      countBtns.forEach((b) => {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      renderTributes();
      updateBeginSubtext();
    });
  });

  // ========== Render Tributes ==========
  function renderTributes() {
    if (!rosterEl) return;

    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
    const baseTributes = config.tributes;

    // Build tribute list: "You" + AI tributes up to selectedCount
    const tributes = [];

    // First slot is always "You"
    tributes.push({
      emoji: '👤',
      name: 'You',
      persona: 'The protagonist',
      isYou: true,
    });

    // Fill remaining slots with AI tributes (cycle if needed)
    for (let i = 1; i < selectedCount; i++) {
      const ai = baseTributes[(i - 1) % baseTributes.length];
      tributes.push({ ...ai, isAI: true });
    }

    // Render
    rosterEl.innerHTML = tributes.map((t) => `
      <div class="tribute-card">
        <div class="tribute-avatar">${t.emoji}</div>
        <div class="tribute-info">
          <p class="tribute-name">${escapeHtml(t.name)}</p>
          <p class="tribute-persona">${escapeHtml(t.persona)}</p>
        </div>
        <span class="tribute-type ${t.isYou ? 'tribute-type--you' : 'tribute-type--ai'}">
          ${t.isYou ? 'You' : 'AI'}
        </span>
      </div>
    `).join('');
  }

  // ========== Update Begin Subtext ==========
  function updateBeginSubtext() {
    if (beginSubtext) {
      beginSubtext.textContent = `${selectedCount} tributes · 1 survivor`;
    }
  }

  // ========== Utilities ==========
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== Smooth Page Navigation ==========
  /**
   * Navigate with View Transitions API if supported, otherwise fallback to fade-out.
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

  // Back button navigation
  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('../00-start-screen/index.html');
    });
  }

  // Begin button - navigate to waiting screen (Long Play mode)
  const beginBtn = document.getElementById('beginBtn');
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      const url = `../025-waiting-for-players/index.html?type=${encodeURIComponent(gameType)}&map=${encodeURIComponent(selectedMap)}&count=${selectedCount}&choice=${encodeURIComponent(userChoice)}`;
      navigateTo(url);
    });
  }

  // ========== Start ==========
  init();
})();
