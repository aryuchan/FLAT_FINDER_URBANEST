// ff-core.js — Master SPA Engine (v17)
// Fixes: Bug #1 (stringify body) | Architecture: render awaitable, populateTemplate raw

const logger = {
  info:  (...a) => console.log('[INFO]',  ...a),
  error: (...a) => console.error('[ERR]', ...a)
};

const appState = {
  currentUser: null,
  flats: [],
  bookings: [],
  activeController: new AbortController()
};

/**
 * Fixes: Bug #1 — apiFetch stringifies body
 */
async function apiFetch(url, opts = {}) {
  // FIX [14]: Added simple loading state
  if (opts.method && opts.method !== 'GET') showToast('Loading...', 'info');

  const token = localStorage.getItem('ff_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(opts.headers || {})
  };

  // Fixes: Bug #1 — Stringify body if object
  const body = opts.body && typeof opts.body === 'object' 
    ? JSON.stringify(opts.body) 
    : opts.body;

  try {
    const res = await fetch(url, { ...opts, body, headers, credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    logger.error(`API FAIL: ${url}`, err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Fixes: Architecture — render() resolves after DOM update
 */
async function render(html) {
  appState.activeController.abort();
  appState.activeController = new AbortController();

  const root = document.getElementById('app-root');
  if (!root) return;

  // Fixes: Architecture — Ensure assignment is atomic and awaitable
  return new Promise((resolve) => {
    root.innerHTML = html;
    // FIX [22]: requestAnimationFrame ensures DOM paints before event listeners attach
    requestAnimationFrame(() => {
      renderNavBar();
      resolve();
    });
  });
}

/**
 * Fixes: Architecture — Raw token replacement (No auto-escHtml)
 */
function populateTemplate(templateId, vars = {}) {
  const template = document.getElementById(templateId);
  if (!template) return '';
  let content = template.innerHTML;
  for (const [key, val] of Object.entries(vars)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), val);
  }
  return content;
}

function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('app-toast');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function renderNavBar() {
  const nav = document.getElementById('app-nav');
  if (!nav || !appState.currentUser) return;

  // Initialize theme from storage
  const savedTheme = localStorage.getItem('ff_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  nav.innerHTML = `
    <div class="nav-inner flex-between">
      <a href="/" class="logo">URBANEST.</a>
      <div class="nav-user" style="display:flex; gap:1rem; align-items:center;">
        <span class="nav-name">${escHtml(appState.currentUser.name)}</span>
        <button class="btn btn--secondary btn--sm" id="btn-theme" title="Toggle Dark Mode">🌙</button>
        <button class="btn btn--primary btn--sm" id="btn-logout">Logout</button>
      </div>
    </div>
  `;

  document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout(), { signal: appState.activeController.signal });
  
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ff_theme', next);
    document.getElementById('btn-theme').textContent = next === 'dark' ? '☀️' : '🌙';
  }, { signal: appState.activeController.signal });

  // Update initial icon
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}
