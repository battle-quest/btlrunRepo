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
  const entryMode = params.get('mode') || null; // 'solo' for deferred choice
  const userChoice = params.get('choice') || null; // '1', '2', '3' for pre-selected, null for deferred
  const joinCode = params.get('code') || null; // Join code if joining existing game
  
  // Determine choice state: pre-selected (1-3) or deferred (null)
  const hasPreselectedChoice = userChoice && ['1', '2', '3'].includes(userChoice);
  const isJoiningGame = !!joinCode;
  const isSoloMode = entryMode === 'solo';

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
  /** @type {NodeListOf<HTMLElement>} */
  const timerBtns = document.querySelectorAll('.timer-btn');
  /** @type {HTMLElement | null} */
  const beginSubtext = document.getElementById('beginSubtext');
  /** @type {HTMLElement | null} */
  const inviteCodeEl = document.getElementById('inviteCode');
  /** @type {HTMLElement | null} */
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  /** @type {HTMLElement | null} */
  const inviteExpiresEl = document.getElementById('inviteExpires');
  /** @type {HTMLElement | null} */
  const choiceSection = document.getElementById('choiceSection');
  /** @type {HTMLElement | null} */
  const choiceIcon = document.getElementById('choiceIcon');
  /** @type {HTMLElement | null} */
  const choiceTitle = document.getElementById('choiceTitle');
  /** @type {HTMLElement | null} */
  const choiceText = document.getElementById('choiceText');

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
      invite: {
        scenario: 'You wake to distant horns and a glowing perimeter.',
        callToAction: 'You have 30 seconds before the drones start "encouraging" movement.',
        options: [
          { emoji: '🎯', title: 'Grab supplies', sub: 'Risk the center for better gear' },
          { emoji: '🏃', title: 'Run for cover', sub: 'Survive now, loot later' },
          { emoji: '🤝', title: 'Make a friend', sub: 'Wave like you totally won\'t betray them' },
        ],
      },
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
      invite: {
        scenario: 'Heat haze ripples across the grid. The perimeter crackles—too close.',
        callToAction: 'Hazards are active early today. Yes, that\'s on purpose.',
        options: [
          { emoji: '⚡', title: 'Sprint to the center', sub: 'High reward. Also high stabbing.' },
          { emoji: '👁️', title: 'Hide and listen', sub: 'Let others reveal the danger first' },
          { emoji: '🗣️', title: 'Start a rumor', sub: 'Chaos is a resource. Use it.' },
        ],
      },
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
      invite: {
        scenario: 'You stand up, immediately trip, and decide this is "part of the strategy."',
        callToAction: 'Side quest: do NOT eat anything labeled "mystery stew."',
        options: [
          { emoji: '🎭', title: 'Loot dramatically', sub: 'Narrate your own montage' },
          { emoji: '🦆', title: 'Crouch-walk away', sub: 'Stealth (and anxiety) intensifies' },
          { emoji: '🤞', title: 'Form an alliance', sub: 'Trust is real. Probably.' },
        ],
      },
    },
  };

  // ========== State ==========
  // Always start with the center map (inferno-pit) as default for consistency
  let selectedMap = 'inferno-pit';
  let selectedCount = 6;
  let selectedTimer = 30; // Response time in seconds (0 = unlimited)
  let inviteCode = '';

  // ========== Invite Code Generation ==========
  /**
   * Generate a random alphanumeric invite code.
   * Uses uppercase letters and numbers, excluding confusing characters (0, O, I, 1, L).
   * @param {number} length - Length of the code (default: 6)
   * @returns {string}
   */
  function generateInviteCode(length = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Initialize the invite code for this game session.
   */
  function initInviteCode() {
    inviteCode = generateInviteCode();
    if (inviteCodeEl) {
      inviteCodeEl.textContent = inviteCode;
    }
    if (inviteExpiresEl) {
      inviteExpiresEl.textContent = 'Code expires when game starts';
    }
  }

  /**
   * Generate the invite message with scenario, call to action, and 3 choice links.
   * @returns {string}
   */
  function generateInviteMessage() {
    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
    const invite = config.invite;
    const baseUrl = 'https://btl.run/join';
    
    // Build the message with scenario + call to action + 3 options with links
    let message = `🎮 Join my btl.run game!\n\n`;
    message += `${invite.scenario}\n\n${invite.callToAction}\n\n`;
    
    invite.options.forEach((opt, idx) => {
      const choiceNum = idx + 1;
      // Include game settings in the invite link
      const url = `${baseUrl}?code=${inviteCode}&type=${gameType}&map=${selectedMap}&count=${selectedCount}&timer=${selectedTimer}&choice=${choiceNum}`;
      message += `${opt.emoji} ${opt.title}\n${opt.sub}\n${url}\n\n`;
    });
    
    message += `Or enter code: ${inviteCode}`;
    
    return message.trim();
  }

  /**
   * Copy the invite message to clipboard.
   */
  async function copyInviteCode() {
    if (!inviteCode) return;
    
    const message = generateInviteMessage();
    
    try {
      await navigator.clipboard.writeText(message);
      
      // Visual feedback
      if (copyCodeBtn) {
        copyCodeBtn.classList.add('copied');
        const iconEl = copyCodeBtn.querySelector('.copy-icon');
        if (iconEl) {
          iconEl.textContent = '✓';
        }
        
        setTimeout(() => {
          copyCodeBtn.classList.remove('copied');
          if (iconEl) {
            iconEl.textContent = '📋';
          }
        }, 2000);
      }
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // ========== Choice Status Display ==========
  function initChoiceStatus() {
    if (!choiceSection) return;
    
    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
    const invite = config.invite;
    
    if (hasPreselectedChoice) {
      // Show the pre-selected choice
      const choiceIndex = parseInt(userChoice, 10) - 1;
      const selectedOption = invite.options[choiceIndex];
      
      if (selectedOption) {
        choiceSection.hidden = false;
        if (choiceIcon) choiceIcon.textContent = selectedOption.emoji;
        if (choiceTitle) choiceTitle.textContent = 'Your Choice';
        if (choiceText) choiceText.innerHTML = `<strong>${escapeHtml(selectedOption.title)}</strong> — ${escapeHtml(selectedOption.sub)}`;
        
        const card = choiceSection.querySelector('.choice-card');
        if (card) {
          card.classList.add('choice-card--preselected');
          card.classList.remove('choice-card--deferred');
        }
      }
    } else if (isSoloMode || isJoiningGame) {
      // Show deferred choice indicator
      choiceSection.hidden = false;
      if (choiceIcon) choiceIcon.textContent = '⏳';
      if (choiceTitle) choiceTitle.textContent = 'Choose Later';
      if (choiceText) choiceText.textContent = isJoiningGame 
        ? 'You\'ll choose your first action after joining'
        : 'You\'ll choose your first action when the game begins';
      
      const card = choiceSection.querySelector('.choice-card');
      if (card) {
        card.classList.add('choice-card--deferred');
        card.classList.remove('choice-card--preselected');
      }
    } else {
      // Hide choice section for default flow (clicking action buttons shows choice)
      choiceSection.hidden = true;
    }
  }

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

    // Set default timer selection
    timerBtns.forEach((btn) => {
      const timer = parseInt(btn.dataset.timer, 10);
      btn.setAttribute('aria-selected', timer === selectedTimer ? 'true' : 'false');
    });

    // Render tributes
    renderTributes();
    updateBeginSubtext();

    // Initialize invite code
    initInviteCode();
    
    // Initialize choice status display
    initChoiceStatus();
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

  // ========== Timer Selection ==========
  const timerStrip = document.querySelector('.timer-strip');
  const timerBtnsArray = Array.from(timerBtns);

  /**
   * Scroll timer strip to show selected button with hint of next option.
   * @param {HTMLElement} btn - The selected button
   * @param {number} idx - Index of the button
   */
  function scrollTimerToShow(btn, idx) {
    if (!timerStrip) return;
    
    // If not the first button, scroll so selected is slightly left of start
    // This reveals more options to the right
    if (idx > 0) {
      const scrollTarget = btn.offsetLeft - 8; // Small offset from left edge
      timerStrip.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' });
    } else {
      // First button - scroll to start
      timerStrip.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }

  timerBtnsArray.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      selectedTimer = parseInt(btn.dataset.timer, 10) || 0;
      timerBtnsArray.forEach((b) => {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      scrollTimerToShow(btn, idx);
      updateBeginSubtext();
    });
  });

  // ========== Invite Code Copy ==========
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', copyInviteCode);
  }

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
  function formatTimer(seconds) {
    if (seconds >= 86400) return `${seconds / 86400}d`;
    if (seconds >= 3600) return `${seconds / 3600}hr`;
    if (seconds >= 60) return `${seconds / 60}m`;
    return `${seconds}s`;
  }

  function updateBeginSubtext() {
    if (beginSubtext) {
      const timerText = `${formatTimer(selectedTimer)} turns`;
      beginSubtext.textContent = `${selectedCount} tributes · ${timerText}`;
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
      // Build URL with all relevant state
      let url = `../025-waiting-for-players/index.html?type=${encodeURIComponent(gameType)}&map=${encodeURIComponent(selectedMap)}&count=${selectedCount}&timer=${selectedTimer}`;
      
      // Add choice state
      if (hasPreselectedChoice) {
        // Pre-selected choice from action button or shared link
        url += `&choice=${encodeURIComponent(userChoice)}`;
      } else {
        // Deferred choice - will be prompted after game begins
        url += `&choice=deferred`;
      }
      
      // Add mode info
      if (isSoloMode) {
        url += `&mode=solo`;
      } else if (isJoiningGame) {
        url += `&mode=join&code=${encodeURIComponent(joinCode)}`;
      }
      
      navigateTo(url);
    });
  }

  // ========== Start ==========
  init();
})();
