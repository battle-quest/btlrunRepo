/**
 * btl.run PWA — UI/UX Mock (Screen 023: Scout Encounter)
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

  // Map card click -> Go to full map
  const mapCard = document.getElementById('mapCard');
  if (mapCard) {
    mapCard.addEventListener('click', () => {
      window.location.href = '../03-status-inventory-map/index.html?tab=map';
    });
  }

  // Choices -> resolve turn
  const choiceBtns = document.querySelectorAll('.wide-btn');
  choiceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Simulate resolution
      window.location.href = '../02-game-turn/index.html?outcome=scout_resolved';
    });
  });
})();
