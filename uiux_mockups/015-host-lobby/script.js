/**
 * btl.run PWA — UI/UX Mock (Screen 015: Host Lobby)
 *
 * Handles:
 * - Reading game type from URL params (?type=classic|spicy|funny)
 * - Empty roster that can be built up
 * - Adding AI tributes one at a time
 * - Invite code generation and sharing
 * - Settings toggle for map and timer
 */

(function () {
  // ========== URL Params ==========
  const params = new URLSearchParams(window.location.search);
  const gameType = params.get('type') || 'classic';

  // ========== DOM Elements ==========
  /** @type {HTMLElement | null} */
  const screen = document.querySelector('.screen');
  /** @type {HTMLElement | null} */
  const typeBadge = document.getElementById('typeBadge');
  /** @type {HTMLElement | null} */
  const rosterEl = document.getElementById('roster');
  /** @type {HTMLElement | null} */
  const playerCountEl = document.getElementById('playerCount');
  /** @type {HTMLElement | null} */
  const rosterHint = document.getElementById('rosterHint');
  /** @type {HTMLElement | null} */
  const addAiBtn = document.getElementById('addAiBtn');
  /** @type {HTMLElement | null} */
  const beginBtn = document.getElementById('beginBtn');
  /** @type {HTMLElement | null} */
  const beginSubtext = document.getElementById('beginSubtext');
  /** @type {HTMLElement | null} */
  const inviteCodeEl = document.getElementById('inviteCode');
  /** @type {HTMLElement | null} */
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  /** @type {HTMLElement | null} */
  const inviteStatus = document.getElementById('inviteStatus');
  /** @type {HTMLElement | null} */
  const settingsToggle = document.getElementById('settingsToggle');
  /** @type {HTMLElement | null} */
  const settingsContent = document.getElementById('settingsContent');
  /** @type {HTMLElement | null} */
  const mapStrip = document.getElementById('mapStrip');
  /** @type {HTMLElement[]} */
  const mapCards = Array.from(document.querySelectorAll('.map-card'));
  /** @type {NodeListOf<HTMLElement>} */
  const timerBtns = document.querySelectorAll('.timer-btn');

  // ========== Game Type Config ==========
  const TYPE_CONFIG = {
    classic: {
      label: 'Classic',
      aiTributes: [
        { emoji: '🗡️', name: 'Steel Vanguard', persona: 'Calculated tactician' },
        { emoji: '🏹', name: 'Silent Arrow', persona: 'Strikes from shadows' },
        { emoji: '🛡️', name: 'Iron Wall', persona: 'Unbreakable defender' },
        { emoji: '🔥', name: 'Ember Strike', persona: 'Aggressive rusher' },
        { emoji: '🌿', name: 'Forest Ghost', persona: 'Master of terrain' },
        { emoji: '⚡', name: 'Quick Silver', persona: 'Speed over strength' },
        { emoji: '🎯', name: 'Hawk Eye', persona: 'Never misses' },
        { emoji: '🌙', name: 'Night Stalker', persona: 'Patient hunter' },
      ],
      invite: {
        scenario: 'You wake to distant horns and a glowing perimeter.',
        callToAction: 'Choose your opening move:',
        options: [
          { emoji: '🎯', title: 'Grab supplies', sub: 'Risk the center for better gear' },
          { emoji: '🏃', title: 'Run for cover', sub: 'Survive now, loot later' },
          { emoji: '🤝', title: 'Make a friend', sub: 'Wave like you totally won\'t betray them' },
        ],
      },
    },
    spicy: {
      label: 'Spicy',
      aiTributes: [
        { emoji: '💀', name: 'Bone Crusher', persona: 'No mercy, no regrets' },
        { emoji: '🔪', name: 'Backstabber', persona: 'Alliances are temporary' },
        { emoji: '💣', name: 'Boom Boom', persona: 'Loves explosions' },
        { emoji: '🩸', name: 'Blood Hound', persona: 'Tracks wounded prey' },
        { emoji: '☠️', name: 'Death Whisper', persona: 'You won\'t hear it coming' },
        { emoji: '🐍', name: 'Venom Fang', persona: 'Poison is patience' },
        { emoji: '🔥', name: 'Inferno', persona: 'Burns everything' },
        { emoji: '⛓️', name: 'Chain Master', persona: 'No escape' },
      ],
      invite: {
        scenario: 'Heat haze ripples across the grid. The perimeter crackles—too close.',
        callToAction: 'Choose your opening move:',
        options: [
          { emoji: '⚡', title: 'Sprint to the center', sub: 'High reward. Also high stabbing.' },
          { emoji: '👁️', title: 'Hide and listen', sub: 'Let others reveal the danger first' },
          { emoji: '🗣️', title: 'Start a rumor', sub: 'Chaos is a resource. Use it.' },
        ],
      },
    },
    funny: {
      label: 'Funny',
      aiTributes: [
        { emoji: '🤡', name: 'Sir Trips-a-Lot', persona: 'Danger to self and others' },
        { emoji: '🦆', name: 'Duck Commander', persona: 'Quacks under pressure' },
        { emoji: '🧀', name: 'The Big Cheese', persona: 'Mysteriously gouda' },
        { emoji: '🦙', name: 'Drama Llama', persona: 'Makes everything worse' },
        { emoji: '🥔', name: 'Spud the Unready', persona: 'Still loading...' },
        { emoji: '🎺', name: 'Trumpet Boy', persona: 'Announces everything' },
        { emoji: '🦀', name: 'Crabby Carl', persona: 'Walks sideways only' },
        { emoji: '🌮', name: 'Taco Destroyer', persona: 'Has snack priorities' },
      ],
      invite: {
        scenario: 'You stand up, immediately trip, and decide this is "part of the strategy."',
        callToAction: 'Choose your opening move:',
        options: [
          { emoji: '🎭', title: 'Loot dramatically', sub: 'Narrate your own montage' },
          { emoji: '🦆', title: 'Crouch-walk away', sub: 'Stealth (and anxiety) intensifies' },
          { emoji: '🤞', title: 'Form an alliance', sub: 'Trust is real. Probably.' },
        ],
      },
    },
  };

  // ========== Constants ==========
  const MIN_PLAYERS = 4;
  const MAX_PLAYERS = 24;

  // ========== State ==========
  let selectedMap = 'inferno-pit';
  let selectedTimer = 30;
  let inviteCode = '';
  
  // Roster: starts with just "You"
  /** @type {Array<{id: string, emoji: string, name: string, persona: string, type: 'you' | 'ai' | 'human'}>} */
  let roster = [
    { id: 'you', emoji: '👤', name: 'You', persona: 'The host', type: 'you' },
  ];
  
  // Track which AI tributes have been added
  let aiTributeIndex = 0;

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
    updateInviteStatus();
  }

  /**
   * Update the invite status text based on roster state.
   */
  function updateInviteStatus() {
    if (!inviteStatus) return;
    
    const humanCount = roster.filter(t => t.type === 'human').length;
    if (humanCount > 0) {
      inviteStatus.textContent = `${humanCount} friend${humanCount > 1 ? 's' : ''} joined!`;
      inviteStatus.classList.remove('invite-status--waiting');
    } else {
      inviteStatus.textContent = 'Waiting for players to join...';
      inviteStatus.classList.add('invite-status--waiting');
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
    message += `${invite.scenario}\n\n`;
    message += `${invite.callToAction}\n\n`;
    
    invite.options.forEach((opt, idx) => {
      const choiceNum = idx + 1;
      // Include map and count in the invite link so joiners see full game context
      const url = `${baseUrl}?code=${inviteCode}&type=${gameType}&map=${selectedMap}&count=${roster.length}&timer=${selectedTimer}&choice=${choiceNum}`;
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

  // ========== Roster Management ==========
  
  /**
   * Add an AI tribute to the roster.
   */
  function addAiTribute() {
    if (roster.length >= MAX_PLAYERS) return;
    
    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
    const aiTributes = config.aiTributes;
    
    // Get next available AI tribute (cycle if needed)
    const ai = aiTributes[aiTributeIndex % aiTributes.length];
    aiTributeIndex++;
    
    roster.push({
      id: `ai-${Date.now()}-${aiTributeIndex}`,
      emoji: ai.emoji,
      name: ai.name,
      persona: ai.persona,
      type: 'ai',
    });
    
    renderRoster();
    updateBeginButton();
    updateRosterHint();
  }

  /**
   * Remove a tribute from the roster.
   * @param {string} id
   */
  function removeTribute(id) {
    // Can't remove "You"
    if (id === 'you') return;
    
    roster = roster.filter(t => t.id !== id);
    renderRoster();
    updateBeginButton();
    updateRosterHint();
  }

  /**
   * Render the roster.
   */
  function renderRoster() {
    if (!rosterEl) return;

    rosterEl.innerHTML = roster.map((t) => {
      const typeClass = t.type === 'you' ? 'tribute-type--you' : 
                        t.type === 'ai' ? 'tribute-type--ai' : 
                        'tribute-type--human';
      const typeLabel = t.type === 'you' ? 'Host' : 
                        t.type === 'ai' ? 'AI' : 
                        'Friend';
      
      const removeBtn = t.type === 'ai' ? 
        `<button class="tribute-remove" data-id="${t.id}" aria-label="Remove ${escapeHtml(t.name)}">×</button>` : '';
      
      return `
        <div class="tribute-card">
          <div class="tribute-avatar">${t.emoji}</div>
          <div class="tribute-info">
            <p class="tribute-name">${escapeHtml(t.name)}</p>
            <p class="tribute-persona">${escapeHtml(t.persona)}</p>
          </div>
          <span class="tribute-type ${typeClass}">${typeLabel}</span>
          ${removeBtn}
        </div>
      `;
    }).join('');

    // Update player count
    if (playerCountEl) {
      playerCountEl.textContent = `(${roster.length})`;
    }

    // Attach remove button handlers
    const removeBtns = rosterEl.querySelectorAll('.tribute-remove');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (id) removeTribute(id);
      });
    });
  }

  /**
   * Update the roster hint text.
   */
  function updateRosterHint() {
    if (!rosterHint) return;
    
    if (roster.length < MIN_PLAYERS) {
      const needed = MIN_PLAYERS - roster.length;
      rosterHint.textContent = `Add ${needed} more player${needed > 1 ? 's' : ''} to start`;
      rosterHint.hidden = false;
    } else {
      rosterHint.hidden = true;
    }
  }

  /**
   * Update the Begin button state.
   */
  function updateBeginButton() {
    if (!beginBtn || !beginSubtext) return;
    
    const canBegin = roster.length >= MIN_PLAYERS;
    beginBtn.disabled = !canBegin;
    
    if (canBegin) {
      beginSubtext.textContent = `${roster.length} players · Ready to start`;
    } else {
      const needed = MIN_PLAYERS - roster.length;
      beginSubtext.textContent = `Need ${needed} more player${needed > 1 ? 's' : ''}`;
    }
  }

  // ========== Settings Toggle ==========
  
  function toggleSettings() {
    if (!settingsToggle || !settingsContent) return;
    
    const isExpanded = settingsToggle.getAttribute('aria-expanded') === 'true';
    settingsToggle.setAttribute('aria-expanded', (!isExpanded).toString());
    settingsContent.hidden = isExpanded;
  }

  // ========== Map Selection ==========
  
  function scrollToMapIndex(index, behavior) {
    if (!mapStrip) return;
    const clamped = Math.max(0, Math.min(mapCards.length - 1, index));
    const card = mapCards[clamped];
    if (!card) return;
    const target = card.offsetLeft - (mapStrip.clientWidth - card.clientWidth) / 2;
    mapStrip.scrollTo({ left: Math.max(0, target), behavior });
  }

  function getCenteredMapCard() {
    if (!mapStrip) return { index: 0, el: null };
    const centerX = mapStrip.scrollLeft + mapStrip.clientWidth / 2;
    let best = null;
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

    // Initialize invite code
    initInviteCode();

    // Render initial roster (just "You")
    renderRoster();
    updateBeginButton();
    updateRosterHint();

    // Set default map selection (center card)
    scrollToMapIndex(1, 'auto');
    mapCards.forEach((card) => {
      const isDefault = card.dataset.map === selectedMap;
      card.setAttribute('aria-selected', isDefault ? 'true' : 'false');
    });

    // Set default timer selection
    timerBtns.forEach((btn) => {
      const timer = parseInt(btn.dataset.timer, 10);
      btn.setAttribute('aria-selected', timer === selectedTimer ? 'true' : 'false');
    });
  }

  // ========== Event Handlers ==========

  // Settings toggle
  if (settingsToggle) {
    settingsToggle.addEventListener('click', toggleSettings);
  }

  // Add AI button
  if (addAiBtn) {
    addAiBtn.addEventListener('click', addAiTribute);
  }

  // Copy invite code
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', copyInviteCode);
  }

  // Map selection
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

  // Map scroll sync
  if (mapStrip) {
    let mapRaf = 0;
    mapStrip.addEventListener('scroll', () => {
      if (mapRaf) window.cancelAnimationFrame(mapRaf);
      mapRaf = window.requestAnimationFrame(syncMapFromScroll);
    }, { passive: true });
  }

  // Timer selection
  timerBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedTimer = parseInt(btn.dataset.timer, 10) || 30;
      timerBtns.forEach((b) => {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
    });
  });

  // ========== Smooth Page Navigation ==========
  
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

  // Begin button - navigate to waiting screen
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      if (roster.length < MIN_PLAYERS) return;
      
      const url = `../025-waiting-for-players/index.html?type=${encodeURIComponent(gameType)}&map=${encodeURIComponent(selectedMap)}&count=${roster.length}&timer=${selectedTimer}&mode=host`;
      navigateTo(url);
    });
  }

  // ========== Utilities ==========
  
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== Start ==========
  init();
})();
