/**
 * btl.run PWA — UI/UX Mock (Screen 012: Join Waiting)
 *
 * Handles:
 * - Reading URL params (type, map, count, timer, code, choice)
 * - Dual mode: show choice options OR show locked-in choice
 * - Mock player list
 * - Choice selection (deferred mode only)
 */

(function () {
  // ========== URL Params ==========
  const params = new URLSearchParams(window.location.search);
  const gameType = params.get('type') || 'classic';
  const mapName = params.get('map') || 'inferno-pit';
  const tributeCount = parseInt(params.get('count'), 10) || 6;
  const responseTimer = parseInt(params.get('timer'), 10) || 30;
  const joinCode = params.get('code') || 'ABC123';
  const preselectedChoice = params.get('choice') || null; // '1', '2', '3', or null

  const hasPreselectedChoice = preselectedChoice && ['1', '2', '3'].includes(preselectedChoice);

  // ========== DOM Elements ==========
  /** @type {HTMLElement | null} */
  const screen = document.querySelector('.screen');
  /** @type {HTMLElement | null} */
  const typeBadge = document.getElementById('typeBadge');
  /** @type {HTMLElement | null} */
  const gameCodeEl = document.getElementById('gameCode');
  /** @type {HTMLElement | null} */
  const mapNameEl = document.getElementById('mapName');
  /** @type {HTMLElement | null} */
  const playerCountEl = document.getElementById('playerCount');
  /** @type {HTMLElement | null} */
  const choicePrompt = document.getElementById('choicePrompt');
  /** @type {HTMLElement | null} */
  const choiceLocked = document.getElementById('choiceLocked');
  /** @type {HTMLElement | null} */
  const choiceSubtitle = document.getElementById('choiceSubtitle');
  /** @type {HTMLElement | null} */
  const playersSection = document.querySelector('.players-section');
  /** @type {HTMLElement | null} */
  const playersListEl = document.getElementById('playersList');

  // Choice option elements
  /** @type {HTMLElement | null} */
  const choice1Title = document.getElementById('choice1Title');
  /** @type {HTMLElement | null} */
  const choice1Sub = document.getElementById('choice1Sub');
  /** @type {HTMLElement | null} */
  const choice2Title = document.getElementById('choice2Title');
  /** @type {HTMLElement | null} */
  const choice2Sub = document.getElementById('choice2Sub');
  /** @type {HTMLElement | null} */
  const choice3Title = document.getElementById('choice3Title');
  /** @type {HTMLElement | null} */
  const choice3Sub = document.getElementById('choice3Sub');

  // Locked choice elements
  /** @type {HTMLElement | null} */
  const lockedCard = document.getElementById('lockedCard');
  /** @type {HTMLElement | null} */
  const lockedTitle = document.getElementById('lockedTitle');
  /** @type {HTMLElement | null} */
  const lockedSub = document.getElementById('lockedSub');
  /** @type {HTMLElement | null} */
  const lockedHint = document.getElementById('lockedHint');

  // ========== Game Type Config ==========
  const TYPE_CONFIG = {
    classic: {
      label: 'Classic',
      invite: {
        scenario: 'You wake to distant horns and a glowing perimeter.',
        options: [
          { emoji: '🎯', title: 'Grab supplies', sub: 'Risk the center for better gear' },
          { emoji: '🏃', title: 'Run for cover', sub: 'Survive now, loot later' },
          { emoji: '🤝', title: 'Make a friend', sub: 'Wave like you totally won\'t betray them' },
        ],
      },
    },
    spicy: {
      label: 'Spicy',
      invite: {
        scenario: 'Heat haze ripples across the grid. The perimeter crackles—too close.',
        options: [
          { emoji: '⚡', title: 'Sprint to the center', sub: 'High reward. Also high stabbing.' },
          { emoji: '👁️', title: 'Hide and listen', sub: 'Let others reveal the danger first' },
          { emoji: '🗣️', title: 'Start a rumor', sub: 'Chaos is a resource. Use it.' },
        ],
      },
    },
    funny: {
      label: 'Funny',
      invite: {
        scenario: 'You stand up, immediately trip, and decide this is "part of the strategy."',
        options: [
          { emoji: '🎭', title: 'Loot dramatically', sub: 'Narrate your own montage' },
          { emoji: '🦆', title: 'Crouch-walk away', sub: 'Stealth (and anxiety) intensifies' },
          { emoji: '🤞', title: 'Form an alliance', sub: 'Trust is real. Probably.' },
        ],
      },
    },
  };

  const MAP_LABELS = {
    'arena-prime': 'Arena Prime',
    'inferno-pit': 'Inferno Pit',
    'chaos-carnival': 'Chaos Carnival',
  };

  // ========== State ==========
  let selectedChoice = hasPreselectedChoice ? parseInt(preselectedChoice, 10) : null;

  // Mock players list (in real app, this would come from backend)
  const mockPlayers = [
    { id: 'you', emoji: '👤', name: 'You', isYou: true, ready: hasPreselectedChoice || selectedChoice !== null },
    { id: 'host', emoji: '👑', name: 'GameHost42', isYou: false, ready: true },
  ];

  // ========== Initialize Choice Display ==========
  function initChoiceDisplay() {
    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
    const invite = config.invite;

    if (hasPreselectedChoice) {
      // Mode 2: Show locked-in choice (pre-selected via link, not changeable)
      choicePrompt.hidden = true;
      choiceLocked.hidden = false;

      const choiceIndex = parseInt(preselectedChoice, 10) - 1;
      const selectedOption = invite.options[choiceIndex];

      if (selectedOption && lockedTitle && lockedSub) {
        lockedTitle.textContent = selectedOption.title;
        lockedSub.textContent = selectedOption.sub;
      }

      // Mark as pre-selected (not changeable)
      if (lockedCard) {
        lockedCard.classList.add('locked-card--preselected');
      }

      // Show players list immediately (choice already made)
      if (playersSection) {
        playersSection.hidden = false;
      }
    } else {
      // Mode 1: Show choice options (deferred choice)
      choicePrompt.hidden = false;
      choiceLocked.hidden = true;

      if (choiceSubtitle) {
        choiceSubtitle.textContent = invite.scenario;
      }

      // Populate choice button text
      if (choice1Title && choice1Sub) {
        choice1Title.textContent = invite.options[0].title;
        choice1Sub.textContent = invite.options[0].sub;
      }
      if (choice2Title && choice2Sub) {
        choice2Title.textContent = invite.options[1].title;
        choice2Sub.textContent = invite.options[1].sub;
      }
      if (choice3Title && choice3Sub) {
        choice3Title.textContent = invite.options[2].title;
        choice3Sub.textContent = invite.options[2].sub;
      }

      // Hide players list until choice is made
      if (playersSection) {
        playersSection.hidden = true;
      }

      // Attach choice button handlers
      const choiceBtns = document.querySelectorAll('.wide-btn[data-choice]');
      choiceBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const choice = parseInt(btn.dataset.choice, 10);
          selectChoice(choice);
        });
      });
    }
  }

  /**
   * Change your choice (go back to selection screen).
   * Only available for choices made in this session (not pre-selected).
   */
  function changeChoice() {
    if (hasPreselectedChoice) return; // Can't change pre-selected choice
    
    selectedChoice = null;

    // Hide locked choice, show choice prompt again
    if (choicePrompt) choicePrompt.hidden = false;
    if (choiceLocked) choiceLocked.hidden = true;

    // Hide players list
    if (playersSection) playersSection.hidden = true;

    // Update player ready state
    updatePlayersList();
  }

  /**
   * Select a choice (deferred mode only).
   * @param {number} choice - 1, 2, or 3
   */
  function selectChoice(choice) {
    if (hasPreselectedChoice) return; // Can't change pre-selected choice
    
    selectedChoice = choice;

    // Hide choice prompt, show locked choice confirmation
    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
    const invite = config.invite;
    const choiceIndex = choice - 1;
    const selectedOption = invite.options[choiceIndex];

    if (selectedOption) {
      // Update locked choice display
      if (lockedTitle) lockedTitle.textContent = selectedOption.title;
      if (lockedSub) lockedSub.textContent = selectedOption.sub;

      // Swap UI
      if (choicePrompt) choicePrompt.hidden = true;
      if (choiceLocked) choiceLocked.hidden = false;

      // Show players section
      if (playersSection) playersSection.hidden = false;

      // Update player ready state
      updatePlayersList();
    }
  }

  // ========== Render Players List ==========
  function updatePlayersList() {
    if (!playersListEl) return;

    // Update "You" ready state based on whether choice is selected
    const youPlayer = mockPlayers.find(p => p.isYou);
    if (youPlayer) {
      youPlayer.ready = hasPreselectedChoice || selectedChoice !== null;
    }

    playersListEl.innerHTML = mockPlayers.map((p) => {
      const cardClass = p.isYou ? 'player-card player-card--you' : 'player-card';
      const badgeClass = p.isYou ? 'player-badge player-badge--you' : 'player-badge player-badge--ready';
      const badgeText = p.isYou ? 'You' : (p.ready ? 'Ready' : 'Joining...');

      return `
        <div class="${cardClass}">
          <div class="player-avatar">${p.emoji}</div>
          <span class="player-name">${escapeHtml(p.name)}</span>
          <span class="${badgeClass}">${badgeText}</span>
        </div>
      `;
    }).join('');
  }

  // ========== Initialize Game Info ==========
  function initGameInfo() {
    if (screen) {
      screen.dataset.type = gameType;
    }

    if (typeBadge) {
      const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
      typeBadge.textContent = config.label;
    }

    if (gameCodeEl) {
      gameCodeEl.textContent = joinCode;
    }

    if (mapNameEl) {
      mapNameEl.textContent = MAP_LABELS[mapName] || 'Inferno Pit';
    }

    if (playerCountEl) {
      // In real app, this would update dynamically as players join
      const joinedCount = mockPlayers.length;
      playerCountEl.textContent = `${joinedCount} / ${tributeCount}`;
    }
  }

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

  // Locked choice card click handler (change choice)
  if (lockedCard) {
    lockedCard.addEventListener('click', () => {
      changeChoice();
    });
  }

  // ========== Utilities ==========
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== Initialize ==========
  function init() {
    initGameInfo();
    initChoiceDisplay();
    updatePlayersList();
  }

  init();
})();
