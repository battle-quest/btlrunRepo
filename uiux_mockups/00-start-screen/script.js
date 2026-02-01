/**
 * btl.run PWA — UI/UX Mock (Screen 00: Start Screen)
 *
 * UI/UX Mock behavior:
 * - Observe which Type card is centered (scroll-snap) and update:
 *   - `.screen[data-type]` for palette tinting
 *   - GM broadcast copy
 *   - Button labels/subtitles
 *
 * This intentionally avoids app-level architecture. It's for mock review only.
 */

(function () {
  /** @type {HTMLElement | null} */
  const screen = document.querySelector('.screen');
  /** @type {HTMLElement | null} */
  const strip = document.getElementById('typeStrip') || document.querySelector('.type-strip');
  /** @type {HTMLElement[]} */
  const cards = Array.from(document.querySelectorAll('.type-card'));

  /** @type {HTMLElement | null} */
  const arenaText = document.getElementById('arenaText');
  /** @type {HTMLElement | null} */
  const broadcastSubtext = document.getElementById('broadcastSubtext');

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

  const COPY = {
    classic: {
      arena: 'You wake to distant horns and a glowing perimeter.',
      broadcast: 'Tributes. The arena is live. Choose quickly.',
      sub: 'You have 30 seconds before the drones start "encouraging" movement.',
      options: [
        ['Grab supplies', 'Risk the center for better gear'],
        ['Run for cover', 'Survive now, loot later'],
        ['Make a friend', 'Wave like you totally won\'t betray them'],
      ],
    },
    spicy: {
      arena: 'Heat haze ripples across the grid. The perimeter crackles—too close.',
      broadcast: 'Attention. The perimeter is unstable. Make your opening move.',
      sub: 'Hazards are active early today. Yes, that\'s on purpose.',
      options: [
        ['Sprint to the center', 'High reward. Also high stabbing.'],
        ['Hide and listen', 'Let others reveal the danger first'],
        ['Start a rumor', 'Chaos is a resource. Use it.'],
      ],
    },
    funny: {
      arena: 'You stand up, immediately trip, and decide this is "part of the strategy."',
      broadcast: 'Good morning, tributes. Please enjoy your complimentary panic.',
      sub: 'Side quest: do NOT eat anything labeled "mystery stew."',
      options: [
        ['Loot dramatically', 'Narrate your own montage'],
        ['Crouch-walk away', 'Stealth (and anxiety) intensifies'],
        ['Form an alliance', 'Trust is real. Probably.'],
      ],
    },
  };

  /**
   * @param {"classic"|"spicy"|"funny"} type
   */
  function applyType(type) {
    if (!screen) return;
    screen.dataset.type = type;

    cards.forEach((el) => {
      el.setAttribute('aria-selected', el.dataset.type === type ? 'true' : 'false');
    });

    const cfg = COPY[type];
    if (!cfg) return;

    if (arenaText) arenaText.textContent = cfg.arena;
    if (broadcastSubtext) broadcastSubtext.textContent = cfg.sub;

    if (opt1Title) opt1Title.textContent = cfg.options[0][0];
    if (opt1Sub) opt1Sub.textContent = cfg.options[0][1];
    if (opt2Title) opt2Title.textContent = cfg.options[1][0];
    if (opt2Sub) opt2Sub.textContent = cfg.options[1][1];
    if (opt3Title) opt3Title.textContent = cfg.options[2][0];
    if (opt3Sub) opt3Sub.textContent = cfg.options[2][1];
  }

  // Click/keyboard: scroll the tapped card into center and apply immediately.
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      if (strip) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      const t = card.dataset.type;
      if (t === 'classic' || t === 'spicy' || t === 'funny') applyType(t);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      card.click();
    });
  });

  // Scroll-snap sync (deterministic): pick the card closest to the strip center.
  if (strip) {
    let raf = 0;
    let current = /** @type {"classic"|"spicy"|"funny"} */ ('classic');
    let currentIndex = 0;

    /**
     * @returns {{ index: number; el: HTMLElement | null }}
     */
    function getCenteredCard() {
      const centerX = strip.scrollLeft + strip.clientWidth / 2;
      let best = /** @type {HTMLElement | null} */ (null);
      let bestDist = Number.POSITIVE_INFINITY;
      let bestIndex = 0;

      for (let i = 0; i < cards.length; i += 1) {
        const card = cards[i];
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
     * Scroll to a given card index and center it.
     *
     * We compute scrollLeft instead of relying on scrollIntoView() because
     * scrollIntoView() often centers imperfectly when the container has padding.
     *
     * @param {number} index
     * @param {"auto"|"smooth"} behavior
     */
    function scrollToIndex(index, behavior) {
      const clamped = Math.max(0, Math.min(cards.length - 1, index));
      const card = cards[clamped];
      if (!card) return;

      const target =
        card.offsetLeft - (strip.clientWidth - card.clientWidth) / 2;

      strip.scrollTo({ left: Math.max(0, target), behavior });
    }

    function syncFromScroll() {
      const centered = getCenteredCard();
      currentIndex = centered.index;
      const best = centered.el;
      if (!best) return;
      const t = best.dataset.type;
      if (t === current) return;
      if (t === 'classic' || t === 'spicy' || t === 'funny') {
        current = t;
        applyType(t);
      }
    }

    strip.addEventListener(
      'scroll',
      () => {
        if (raf) window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(syncFromScroll);
      },
      { passive: true }
    );

    window.addEventListener('resize', () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(syncFromScroll);
    });

    // Initial state: center Classic (middle card) and sync copy/state.
    scrollToIndex(1, 'auto');
    applyType('classic');
    syncFromScroll();
  } else {
    // Initial state (no strip found — should not happen in this mock)
    applyType('classic');
  }

  // ========== Smooth Page Navigation ==========
  /**
   * Navigate with View Transitions API if supported, otherwise fallback to normal navigation.
   * @param {string} url
   */
  function navigateTo(url) {
    // Use View Transitions API if available (Chrome 111+, Edge 111+)
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        window.location.href = url;
      });
    } else {
      // Fallback: add fade-out class then navigate
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

  // When user clicks any action button (wide buttons), navigate to tribute setup with choice pre-selected.
  // This flow is for users who want to make their choice immediately (e.g., from a shared link).
  const wideBtns = document.querySelectorAll('.wide-btn');
  wideBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const currentType = screen?.dataset.type || 'classic';
      const choice = idx + 1; // 1, 2, or 3
      navigateTo('../01-tribute-setup/index.html?type=' + encodeURIComponent(currentType) + '&choice=' + choice);
    });
  });

  // ========== Join Game (code input) ==========
  const joinInput = document.getElementById('joinCode');
  const joinBtn = document.getElementById('joinBtn');

  // Auto-uppercase and validate input
  if (joinInput) {
    joinInput.addEventListener('input', () => {
      // Convert to uppercase and remove invalid characters
      joinInput.value = joinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // Enable/disable join button based on code length
      if (joinBtn) {
        joinBtn.disabled = joinInput.value.length !== 6;
      }
    });

    // Handle Enter key in input
    joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && joinInput.value.length === 6) {
        joinBtn?.click();
      }
    });
  }

  // Initially disable join button
  if (joinBtn) {
    joinBtn.disabled = true;
    
    joinBtn.addEventListener('click', () => {
      const code = joinInput?.value || '';
      if (code.length !== 6) return;
      
      const currentType = screen?.dataset.type || 'classic';
      // Navigate to join waiting room (deferred choice)
      // In the real app, this would validate the code first
      navigateTo('../012-join-waiting/index.html?type=' + encodeURIComponent(currentType) + '&code=' + encodeURIComponent(code) + '&map=inferno-pit&count=6&timer=30');
    });
  }

  // ========== Play Solo Button ==========
  const playSoloBtn = document.getElementById('playSoloBtn');
  if (playSoloBtn) {
    playSoloBtn.addEventListener('click', () => {
      const currentType = screen?.dataset.type || 'classic';
      // Navigate to tribute setup without a pre-selected choice (choice deferred until game starts)
      navigateTo('../01-tribute-setup/index.html?type=' + encodeURIComponent(currentType) + '&mode=solo');
    });
  }

  // ========== Host Button (Friends Mode) ==========
  const hostBtn = document.getElementById('hostBtn');
  if (hostBtn) {
    hostBtn.addEventListener('click', () => {
      const currentType = screen?.dataset.type || 'classic';
      // Navigate to host lobby (empty roster, add AI or wait for friends)
      navigateTo('../015-host-lobby/index.html?type=' + encodeURIComponent(currentType));
    });
  }

  // Settings button removed (intentionally).
})();
