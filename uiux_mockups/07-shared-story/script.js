/**
 * btl.run PWA — UI/UX Mock (Screen 07: Shared Story)
 */

(function () {
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      // Go to start screen to begin their own journey
      window.location.href = '../00-start-screen/index.html';
    });
  }
})();
