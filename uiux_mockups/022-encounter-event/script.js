/**
 * btl.run PWA — UI/UX Mock (Screen 022: Event Encounter)
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

  // Event choices -> resolve turn
  const choiceBtns = document.querySelectorAll('.wide-btn');
  choiceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Simulate event resolution
      window.location.href = '../02-game-turn/index.html?outcome=event_resolved';
    });
  });
})();
