/**
 * btl.run PWA — UI/UX Mock (Screen 021: Battle Encounter)
 */

(function () {
  // Navigation
  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Go back to the turn screen or map
      window.location.href = '../02-game-turn/index.html';
    });
  }

  // Combat choices -> resolve turn (back to 02 or maybe 025 in future)
  const choiceBtns = document.querySelectorAll('.wide-btn');
  choiceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Simulate combat resolution
      // For mock purposes, just go back to turn screen as if turn completed
      window.location.href = '../02-game-turn/index.html?outcome=combat_resolved';
    });
  });
})();
