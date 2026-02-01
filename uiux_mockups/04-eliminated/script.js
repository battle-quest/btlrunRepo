/**
 * btl.run PWA — UI/UX Mock (Screen 04: Eliminated)
 */

(function () {
  // Navigation
  const hostBtn = document.getElementById('hostBtn');
  if (hostBtn) {
    hostBtn.addEventListener('click', () => {
      window.location.href = '../015-host-lobby/index.html';
    });
  }

  const playBtn = document.getElementById('playBtn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      window.location.href = '../01-tribute-setup/index.html?mode=solo';
    });
  }

  const spectateBtn = document.getElementById('spectateBtn');
  if (spectateBtn) {
    spectateBtn.addEventListener('click', () => {
      // Spectating just goes back to the game turn screen but likely read-only
      // For mock, we'll just go to turn screen
      window.location.href = '../02-game-turn/index.html?spectate=true';
    });
  }

  // Share button logic (Overlay)
  const shareBtn = document.getElementById('shareBtn');
  const cardContent = document.getElementById('cardContent');
  const shareOverlay = document.getElementById('shareOverlay');
  const closeShareBtn = document.getElementById('closeShareBtn');

  if (shareBtn && cardContent && shareOverlay) {
    shareBtn.addEventListener('click', async () => {
      const text = "I just got eliminated in btl.run! 💀 Read my tragic story here: https://btl.run/story/123";
      
      try {
        await navigator.clipboard.writeText(text);
        
        // Show overlay
        cardContent.hidden = true;
        shareOverlay.hidden = false;
        
      } catch (err) {
        console.error('Failed to copy', err);
      }
    });
  }

  if (closeShareBtn) {
    closeShareBtn.addEventListener('click', () => {
      // Hide overlay, show content
      shareOverlay.hidden = true;
      cardContent.hidden = false;
    });
  }
})();
