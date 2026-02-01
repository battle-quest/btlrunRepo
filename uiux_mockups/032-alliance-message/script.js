/**
 * btl.run PWA — UI/UX Mock (Screen 032: Alliance Message)
 */

(function () {
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Go back to the previous screen (likely status or turn)
      history.back();
    });
  }

  // Scroll to bottom
  const chatHistory = document.getElementById('chatHistory');
  if (chatHistory) {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
})();
