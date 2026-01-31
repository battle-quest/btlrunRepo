/**
 * btl.run PWA — UI/UX Mock (Screen 025: Waiting for Players)
 *
 * Handles:
 * - Reading game params from URL (type, map, count, choice)
 * - Displaying user's submitted choice
 * - Showing player submission status
 * - Countdown timer for daily cutoff
 * - Notification toggle
 */

(function () {
  // ========== URL Params ==========
  const params = new URLSearchParams(window.location.search);
  const gameType = params.get('type') || 'classic';
  const gameMap = params.get('map') || 'inferno-pit';
  const tributeCount = parseInt(params.get('count'), 10) || 6;
  const userChoice = parseInt(params.get('choice'), 10) || 1;

  // ========== DOM Elements ==========
  /** @type {HTMLElement | null} */
  const screen = document.querySelector('.screen');
  /** @type {HTMLElement | null} */
  const typeBadge = document.getElementById('typeBadge');
  /** @type {HTMLElement | null} */
  const aliveCount = document.getElementById('aliveCount');
  /** @type {HTMLElement | null} */
  const mapPill = document.getElementById('mapPill');
  /** @type {HTMLElement | null} */
  const yourChoice = document.getElementById('yourChoice');
  /** @type {HTMLElement | null} */
  const changeBtn = document.getElementById('changeBtn');
  /** @type {HTMLElement | null} */
  const progressFill = document.getElementById('progressFill');
  /** @type {HTMLElement | null} */
  const progressLabel = document.getElementById('progressLabel');
  /** @type {HTMLElement | null} */
  const playerList = document.getElementById('playerList');
  /** @type {HTMLElement | null} */
  const notifyBtn = document.getElementById('notifyBtn');
  /** @type {HTMLAnchorElement | null} */
  const leftRail = /** @type {HTMLAnchorElement | null} */ (document.getElementById('leftRail'));

  // ========== Type/Map Config ==========
  const TYPE_CONFIG = {
    classic: {
      label: 'Classic',
      choices: ['Scout the perimeter', 'Rest and recover', 'Search for weapons'],
      players: [
        { emoji: '🗡️', name: 'Steel Vanguard' },
        { emoji: '🏹', name: 'Silent Arrow' },
        { emoji: '🛡️', name: 'Iron Wall' },
        { emoji: '🔥', name: 'Ember Strike' },
        { emoji: '🌿', name: 'Forest Ghost' },
        { emoji: '⚡', name: 'Quick Silver' },
      ],
    },
    spicy: {
      label: 'Spicy',
      choices: ['Hunt the wounded', 'Secure the high ground', 'Loot the fallen'],
      players: [
        { emoji: '💀', name: 'Bone Crusher' },
        { emoji: '🔪', name: 'Backstabber' },
        { emoji: '💣', name: 'Boom Boom' },
        { emoji: '🩸', name: 'Blood Hound' },
        { emoji: '☠️', name: 'Death Whisper' },
        { emoji: '🐍', name: 'Venom Fang' },
      ],
    },
    funny: {
      label: 'Funny',
      choices: ['Practice your victory pose', 'Find better snacks', 'Make friends with everyone'],
      players: [
        { emoji: '🤡', name: 'Sir Trips-a-Lot' },
        { emoji: '🦆', name: 'Duck Commander' },
        { emoji: '🧀', name: 'The Big Cheese' },
        { emoji: '🦙', name: 'Drama Llama' },
        { emoji: '🥔', name: 'Spud the Unready' },
        { emoji: '🎺', name: 'Trumpet Boy' },
      ],
    },
  };

  const MAP_LABELS = {
    'arena-prime': 'Arena Prime',
    'inferno-pit': 'Inferno Pit',
    'chaos-carnival': 'Chaos Carnival',
  };

  // ========== Initialization ==========
  function init() {
    // Apply game type to screen
    if (screen) {
      screen.dataset.type = gameType;
    }

    // Populate left-rail quick stats
    if (screen) {
      const hp = userChoice === 1 ? 82 : userChoice === 2 ? 74 : 68;
      const stam = userChoice === 1 ? 66 : userChoice === 2 ? 80 : 58;
      const hung = userChoice === 1 ? 52 : userChoice === 2 ? 64 : 44;

      screen.style.setProperty('--hp-fill', `${hp}%`);
      screen.style.setProperty('--stam-fill', `${stam}%`);
      screen.style.setProperty('--hung-fill', `${hung}%`);
    }

    if (leftRail) {
      leftRail.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(
          `../03-status-inventory-map/index.html?type=${encodeURIComponent(gameType)}&map=${encodeURIComponent(gameMap)}&count=${tributeCount}&choice=${userChoice}`
        );
      });
    }

    // Update type badge
    if (typeBadge) {
      typeBadge.textContent = TYPE_CONFIG[gameType]?.label || 'Classic';
    }

    // Update alive count
    if (aliveCount) {
      aliveCount.textContent = `${tributeCount} alive`;
    }

    // Update map pill
    if (mapPill) {
      mapPill.textContent = MAP_LABELS[gameMap] || 'Inferno Pit';
    }

    // Update user's choice
    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
    if (yourChoice) {
      yourChoice.textContent = config.choices[userChoice - 1] || config.choices[0];
    }

    // Populate player list with mock submission states
    renderPlayerList(config);

    // Wire up back button
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(`../02-game-turn/index.html?type=${encodeURIComponent(gameType)}&map=${encodeURIComponent(gameMap)}&count=${tributeCount}&choice=${userChoice}`);
      });
    }

    // Wire up change button
    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        // Go back to game turn to change choice
        navigateTo(`../02-game-turn/index.html?type=${encodeURIComponent(gameType)}&map=${encodeURIComponent(gameMap)}&count=${tributeCount}&choice=${userChoice}`);
      });
    }

    // Wire up notification button
    if (notifyBtn) {
      notifyBtn.addEventListener('click', () => {
        const isEnabled = notifyBtn.classList.contains('enabled');
        if (isEnabled) {
          notifyBtn.classList.remove('enabled');
          notifyBtn.textContent = 'Enable';
        } else {
          notifyBtn.classList.add('enabled');
          notifyBtn.textContent = 'Enabled ✓';
        }
      });
    }

    // Start countdown timer
    startCountdown();
  }

  // ========== Player List ==========
  function renderPlayerList(config) {
    if (!playerList) return;

    // Simulate some players have submitted, some haven't
    // User is always first and submitted
    const submittedCount = Math.floor(Math.random() * (tributeCount - 2)) + 1; // At least 1 (user)
    
    const players = [];
    
    // Add "You" first - always submitted
    players.push({
      emoji: '👤',
      name: 'You',
      isYou: true,
      submitted: true,
    });

    // Add other players
    for (let i = 1; i < tributeCount; i++) {
      const player = config.players[(i - 1) % config.players.length];
      // Random subset have submitted (excluding the user who already submitted)
      const hasSubmitted = i < submittedCount;
      players.push({
        emoji: player.emoji,
        name: player.name,
        isYou: false,
        submitted: hasSubmitted,
      });
    }

    // Render player rows
    playerList.innerHTML = players.map(p => {
      const classes = ['player-row'];
      if (p.isYou) classes.push('is-you');
      classes.push(p.submitted ? 'is-submitted' : 'is-pending');
      
      return `
        <div class="${classes.join(' ')}">
          <div class="player-avatar">${p.emoji}</div>
          <span class="player-name">${escapeHtml(p.name)}</span>
          <span class="player-status ${p.submitted ? 'submitted' : 'pending'}">
            ${p.submitted ? '✓ Submitted' : 'Waiting...'}
          </span>
        </div>
      `;
    }).join('');

    // Update progress
    const totalSubmitted = players.filter(p => p.submitted).length;
    if (progressFill) {
      const pct = (totalSubmitted / tributeCount) * 100;
      progressFill.style.width = `${pct}%`;
    }
    if (progressLabel) {
      progressLabel.textContent = `${totalSubmitted} of ${tributeCount} submitted`;
    }
  }

  // ========== Countdown Timer ==========
  function startCountdown() {
    // Calculate time until 9 PM ET (mock)
    // For the demo, we'll just show a static-ish countdown that ticks
    let hours = 8;
    let minutes = 42;
    let seconds = 15;

    const timerHours = document.querySelector('.timer-hours');
    const timerMinutes = document.querySelector('.timer-minutes');
    const timerSeconds = document.querySelector('.timer-seconds');

    function updateTimer() {
      if (timerHours) timerHours.textContent = String(hours).padStart(2, '0');
      if (timerMinutes) timerMinutes.textContent = String(minutes).padStart(2, '0');
      if (timerSeconds) timerSeconds.textContent = String(seconds).padStart(2, '0');
    }

    function tick() {
      seconds--;
      if (seconds < 0) {
        seconds = 59;
        minutes--;
        if (minutes < 0) {
          minutes = 59;
          hours--;
          if (hours < 0) {
            // Timer finished - would resolve turn
            hours = 0;
            minutes = 0;
            seconds = 0;
            return;
          }
        }
      }
      updateTimer();
    }

    updateTimer();
    setInterval(tick, 1000);
  }

  // ========== Utilities ==========
  /**
   * Escape HTML for safe DOM insertion.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Navigate with View Transitions API if supported, otherwise fallback.
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

  // ========== Start ==========
  init();
})();
