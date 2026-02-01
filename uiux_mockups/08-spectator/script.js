/**
 * btl.run PWA — UI/UX Mock (Screen 08: Spectator)
 */

(function () {
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
})();
