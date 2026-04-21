// landing.js — External script for landing page (Fixes CSP inline script block)

document.addEventListener('DOMContentLoaded', () => {
    // FIX [2]: Moved inline script to external file for CSP compliance
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
});
