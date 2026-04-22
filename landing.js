// landing.js — Production Landing Experience (v18.0)

document.addEventListener('DOMContentLoaded', () => {
  console.log('Landing Engine Online');

  // 1. Theme Sync
  const savedTheme = localStorage.getItem('ff_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const themeBtn = document.getElementById('btn-theme-landing');
  if (themeBtn) {
    themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ff_theme', next);
      themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }

  // 2. Smooth Scroll CTAs
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href.startsWith('#/')) return; // SPA route
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 3. Hero Entrance Animation
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.style.opacity = '0';
    hero.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      hero.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      hero.style.opacity = '1';
      hero.style.transform = 'translateY(0)';
    });
  }
});
