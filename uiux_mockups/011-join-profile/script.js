/**
 * btl.run PWA — UI/UX Mock (Screen 011: Join Profile)
 */

(function () {
  const params = new URLSearchParams(window.location.search);
  const gameType = params.get('type') || 'classic';
  const code = params.get('code') || '';

  // Avatar handling
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarOptions = document.querySelectorAll('.avatar-option');
  const shuffleBtn = document.getElementById('shuffleAvatar');
  const inputName = document.getElementById('inputName');
  const inputTagline = document.getElementById('inputTagline');

  // Random names for shuffle
  const names = [
    'District 12 Hero', 'Katniss Fan', 'Peeta Bread', 'Cato Slayer', 'Rue\'s Ally',
    'Nightlock', 'Mockingjay', 'Capital Citizen', 'Gamemaker', 'Career Tribute'
  ];

  const taglines = [
    'I volunteer!', 'May the odds be ever in your favor.', 'Real or not real?',
    'If we burn, you burn with us.', 'Stay alive.', 'Remember who the enemy is.'
  ];

  // Select avatar
  avatarOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update visual selection
      avatarOptions.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      
      // Update preview
      const emoji = btn.dataset.emoji;
      if (avatarPreview) avatarPreview.textContent = emoji;
    });
  });

  // Shuffle button
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      // Pick random avatar
      const randomBtn = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
      randomBtn.click();
      randomBtn.scrollIntoView({ behavior: 'smooth', inline: 'center' });

      // Pick random name/tagline
      if (inputName) inputName.value = names[Math.floor(Math.random() * names.length)];
      if (inputTagline) inputTagline.value = taglines[Math.floor(Math.random() * taglines.length)];
    });
  }

  // Navigation
  const joinBtn = document.getElementById('joinBtn');
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      // Pass profile data to waiting room (in mock via URL params or just navigate)
      // In real app, this would POST to backend
      const url = `../012-join-waiting/index.html?type=${gameType}&code=${code}&map=inferno-pit&count=6`;
      window.location.href = url;
    });
  }

  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      history.back();
    });
  }
})();
