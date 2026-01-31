/**
 * btl.run PWA — UI/UX Mock (Screen 02: Game Turn)
 *
 * Handles:
 * - Reading game params from URL (type, map, count, choice)
 * - Animating AI tribute choices
 * - Displaying narrative after all choices are made
 * - Presenting next question options
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
  const aiProcessing = document.getElementById('aiProcessing');
  /** @type {HTMLElement | null} */
  const tributeChoices = document.getElementById('tributeChoices');
  /** @type {HTMLElement | null} */
  const progressBar = document.getElementById('progressBar');
  /** @type {HTMLElement | null} */
  const narrative = document.getElementById('narrative');
  /** @type {HTMLElement | null} */
  const narrativeText = document.getElementById('narrativeText');
  /** @type {HTMLElement | null} */
  const eventLog = document.getElementById('eventLog');
  /** @type {HTMLElement | null} */
  const eventToggle = document.getElementById('eventToggle');
  /** @type {HTMLElement | null} */
  const eventList = document.getElementById('eventList');
  /** @type {HTMLElement | null} */
  const eventCount = document.getElementById('eventCount');
  /** @type {HTMLElement | null} */
  const nextQuestion = document.getElementById('nextQuestion');
  /** @type {HTMLElement | null} */
  const questionPrompt = document.getElementById('questionPrompt');
  /** @type {HTMLAnchorElement | null} */
  const leftRail = /** @type {HTMLAnchorElement | null} */ (document.getElementById('leftRail'));

  // Button elements
  /** @type {HTMLElement | null} */
  const opt1Title = document.getElementById('opt1Title');
  /** @type {HTMLElement | null} */
  const opt1Sub = document.getElementById('opt1Sub');
  /** @type {HTMLElement | null} */
  const opt2Title = document.getElementById('opt2Title');
  /** @type {HTMLElement | null} */
  const opt2Sub = document.getElementById('opt2Sub');
  /** @type {HTMLElement | null} */
  const opt3Title = document.getElementById('opt3Title');
  /** @type {HTMLElement | null} */
  const opt3Sub = document.getElementById('opt3Sub');

  // ========== Type/Map Config ==========
  const TYPE_CONFIG = {
    classic: {
      label: 'Classic',
      tributes: [
        { emoji: '🗡️', name: 'Steel Vanguard' },
        { emoji: '🏹', name: 'Silent Arrow' },
        { emoji: '🛡️', name: 'Iron Wall' },
        { emoji: '🔥', name: 'Ember Strike' },
        { emoji: '🌿', name: 'Forest Ghost' },
        { emoji: '⚡', name: 'Quick Silver' },
      ],
      actions: ['secured supplies', 'took cover', 'scouted ahead', 'set a trap', 'found water', 'made camp'],
      nextOptions: [
        ['Scout the perimeter', 'Look for threats and escape routes'],
        ['Rest and recover', 'Conserve energy for tomorrow'],
        ['Search for weapons', 'Risk exposure for better gear'],
      ],
      narrative: {
        1: 'You rushed toward the cornucopia, grabbing a backpack and a small knife before the chaos fully erupted. Steel Vanguard claimed the best weapon—a gleaming sword—while Silent Arrow disappeared into the treeline with a bow.',
        2: 'You bolted for the forest edge, your heart pounding. Behind you, the sounds of the initial scramble echoed. You found a hollow log and caught your breath as other tributes scattered in every direction.',
        3: 'You locked eyes with Forest Ghost and gave a hesitant wave. To your surprise, they nodded back. The two of you slipped away together, forming an uneasy alliance as the bloodbath began behind you.',
      },
      events: [
        { icon: '⚔️', text: '<strong>Steel Vanguard</strong> claimed the sword from the cornucopia' },
        { icon: '🏃', text: '<strong>Silent Arrow</strong> escaped into the northern woods' },
        { icon: '💀', text: 'One tribute fell in the initial scramble' },
      ],
    },
    spicy: {
      label: 'Spicy',
      tributes: [
        { emoji: '💀', name: 'Bone Crusher' },
        { emoji: '🔪', name: 'Backstabber' },
        { emoji: '💣', name: 'Boom Boom' },
        { emoji: '🩸', name: 'Blood Hound' },
        { emoji: '☠️', name: 'Death Whisper' },
        { emoji: '🐍', name: 'Venom Fang' },
      ],
      actions: ['eliminated a rival', 'stole supplies', 'set an ambush', 'poisoned a water source', 'claimed territory', 'intimidated others'],
      nextOptions: [
        ['Hunt the wounded', 'Follow the blood trail'],
        ['Secure the high ground', 'Defensive position with sight lines'],
        ['Loot the fallen', 'They don\'t need it anymore'],
      ],
      narrative: {
        1: 'You dove into the chaos headfirst, grabbing everything you could carry. Bone Crusher was already swinging—you barely ducked under a wild strike. By the time you escaped, your hands were full and your nerves were shot.',
        2: 'You hung back, watching the carnage unfold. Backstabber lived up to their name, already betraying their first ally. You noted who had what, planning your next move from the shadows.',
        3: 'You approached Death Whisper with an offer: "Together until the final five?" They smiled—a cold, calculating smile—and shook your hand. You both knew this alliance had an expiration date.',
      },
      events: [
        { icon: '💀', text: '<strong>Bone Crusher</strong> made the first kill' },
        { icon: '🔪', text: '<strong>Backstabber</strong> betrayed their ally immediately' },
        { icon: '🔥', text: 'The perimeter sparked—hazards are active early' },
      ],
    },
    funny: {
      label: 'Funny',
      tributes: [
        { emoji: '🤡', name: 'Sir Trips-a-Lot' },
        { emoji: '🦆', name: 'Duck Commander' },
        { emoji: '🧀', name: 'The Big Cheese' },
        { emoji: '🦙', name: 'Drama Llama' },
        { emoji: '🥔', name: 'Spud the Unready' },
        { emoji: '🎺', name: 'Trumpet Boy' },
      ],
      actions: ['tripped spectacularly', 'found snacks', 'got distracted', 'narrated themselves', 'befriended wildlife', 'made a dramatic speech'],
      nextOptions: [
        ['Practice your victory pose', 'Confidence is key'],
        ['Find better snacks', 'Survival requires calories'],
        ['Make friends with everyone', 'What could go wrong?'],
      ],
      narrative: {
        1: 'You sprinted toward the supplies, immediately tripped over Sir Trips-a-Lot (who was already on the ground), and somehow rolled into a pile of granola bars. Lucky? You\'ll take it.',
        2: 'You decided running was for people who hadn\'t seen horror movies. You casually strolled away while Drama Llama gave an impromptu monologue about destiny. Everyone was too confused to follow you.',
        3: 'You waved at Duck Commander, who quacked back enthusiastically. Somehow, you\'ve formed an alliance with the most unhinged tribute in the arena. Their eyes are wild, but they have snacks.',
      },
      events: [
        { icon: '🤡', text: '<strong>Sir Trips-a-Lot</strong> tripped immediately' },
        { icon: '🎺', text: '<strong>Trumpet Boy</strong> announced everyone\'s position' },
        { icon: '🦆', text: '<strong>Duck Commander</strong> quacked menacingly' },
      ],
    },
  };

  const MAP_LABELS = {
    'arena-prime': 'Arena Prime',
    'inferno-pit': 'Inferno Pit',
    'chaos-carnival': 'Chaos Carnival',
  };

  const USER_CHOICES = {
    classic: [
      'grabbed supplies',
      'ran for cover',
      'made an ally',
    ],
    spicy: [
      'sprinted to center',
      'observed from shadows',
      'spread rumors',
    ],
    funny: [
      'looted dramatically',
      'crouch-walked away',
      'formed alliance',
    ],
  };

  // ========== Initialization ==========
  function init() {
    // Apply game type to screen
    if (screen) {
      screen.dataset.type = gameType;
    }

    // Populate left-rail quick stats (visual-only) and link
    if (screen) {
      // Light, deterministic variation per turn choice so the mock feels "alive"
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

    // Start the AI processing animation
    startAIProcessing();

    // Wire up back button
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(`../01-tribute-setup/index.html?type=${encodeURIComponent(gameType)}`);
      });
    }

    // Wire up event toggle
    if (eventToggle) {
      eventToggle.addEventListener('click', () => {
        const expanded = eventToggle.getAttribute('aria-expanded') === 'true';
        eventToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      });
    }

    // Wire up option buttons - navigate to waiting screen (Long Play mode)
    document.querySelectorAll('.wide-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        // Submit choice and go to waiting screen
        const choice = idx + 1;
        navigateTo(`../025-waiting-for-players/index.html?type=${encodeURIComponent(gameType)}&map=${encodeURIComponent(gameMap)}&count=${tributeCount}&choice=${choice}`);
      });
    });
  }

  // ========== AI Processing Animation ==========
  function startAIProcessing() {
    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;
    const userChoiceAction = USER_CHOICES[gameType]?.[userChoice - 1] || 'made a choice';

    // Build tribute list
    const tributes = [];
    
    // Add "You" first
    tributes.push({
      emoji: '👤',
      name: 'You',
      action: userChoiceAction,
      isYou: true,
    });

    // Add AI tributes
    for (let i = 1; i < tributeCount; i++) {
      const ai = config.tributes[(i - 1) % config.tributes.length];
      const action = config.actions[Math.floor(Math.random() * config.actions.length)];
      tributes.push({
        emoji: ai.emoji,
        name: ai.name,
        action: action,
        isAI: true,
      });
    }

    // Animate tributes appearing one by one
    let index = 0;
    const interval = 200; // ms between each tribute
    
    function showNextTribute() {
      if (index >= tributes.length) {
        // All tributes shown, complete the processing
        setTimeout(completeProcessing, 500);
        return;
      }

      const tribute = tributes[index];
      const el = document.createElement('div');
      el.className = `tribute-choice${tribute.isYou ? ' is-you' : ''}`;
      el.style.animationDelay = '0ms';
      el.innerHTML = `
        <div class="tribute-choice-avatar">${tribute.emoji}</div>
        <span class="tribute-choice-name">${escapeHtml(tribute.name)}</span>
        <span class="tribute-choice-action">${escapeHtml(tribute.action)}</span>
      `;
      tributeChoices?.appendChild(el);

      // Update progress bar
      const progress = ((index + 1) / tributes.length) * 100;
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }

      index++;
      setTimeout(showNextTribute, interval);
    }

    showNextTribute();
  }

  function completeProcessing() {
    const config = TYPE_CONFIG[gameType] || TYPE_CONFIG.classic;

    // Hide processing section with fade
    if (aiProcessing) {
      aiProcessing.style.transition = 'opacity 300ms ease-out';
      aiProcessing.style.opacity = '0';
      setTimeout(() => {
        aiProcessing.style.display = 'none';
      }, 300);
    }

    // Show narrative
    if (narrative && narrativeText) {
      setTimeout(() => {
        narrativeText.innerHTML = `<p>${config.narrative[userChoice] || config.narrative[1]}</p>`;
        narrative.style.display = 'block';
      }, 200);
    }

    // Show event log
    if (eventLog && eventList && eventCount) {
      setTimeout(() => {
        const events = config.events || [];
        eventCount.textContent = events.length.toString();
        eventList.innerHTML = events.map(e => `
          <div class="event-item">
            <span class="event-item-icon">${e.icon}</span>
            <span class="event-item-text">${e.text}</span>
          </div>
        `).join('');
        eventLog.style.display = 'block';
      }, 400);
    }

    // Show next question
    if (nextQuestion && questionPrompt) {
      setTimeout(() => {
        const options = config.nextOptions || [];
        questionPrompt.textContent = 'What do you do next?';
        
        if (opt1Title && opt1Sub && options[0]) {
          opt1Title.textContent = options[0][0];
          opt1Sub.textContent = options[0][1];
        }
        if (opt2Title && opt2Sub && options[1]) {
          opt2Title.textContent = options[1][0];
          opt2Sub.textContent = options[1][1];
        }
        if (opt3Title && opt3Sub && options[2]) {
          opt3Title.textContent = options[2][0];
          opt3Sub.textContent = options[2][1];
        }
        
        nextQuestion.style.display = 'block';
      }, 600);
    }
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
