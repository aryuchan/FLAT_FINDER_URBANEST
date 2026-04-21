// ff-core.js — Master SPA Engine (v16)
// Fixes: Bug #1 (render mismatch) & Bug #2 (missing globals)

// Architecture: Frozen-shape appState
const appState = Object.seal({
  currentUser: null,
  flats: [],
  listings: [],
  bookings: [],
  users: [],
  flatsMeta: null,
  _selectedFlat: null,
  activeController: new AbortController()
});

/**
 * Fixes: Bug #2 — Global apiFetch with fallback JWT logic
 */
async function apiFetch(url, opts = {}) {
  const token = localStorage.getItem('ff_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(opts.headers || {})
  };

  try {
    const res = await fetch(url, {
      ...opts,
      headers,
      credentials: 'include' // Fixes: Bug #5 — Support cookie auth
    });
    return await res.json();
  } catch (err) {
    console.error(`[API ERROR] ${url}`, err);
    return { success: false, message: 'Network error' };
  }
}

/**
 * Fixes: Bug #1 — Unified render engine (Accepts HTML string)
 */
async function render(htmlContent) {
  // Cleanup previous listeners
  appState.activeController.abort();
  appState.activeController = new AbortController();

  const root = document.getElementById('app-root');
  if (!root) return;

  // Fixes: Safety — Clear root before injection
  root.innerHTML = htmlContent;

  // Bind dynamic nav
  renderNavBar();
}

/**
 * Architecture: populateTemplate using cloning and token replacement
 */
function populateTemplate(templateId, vars = {}) {
  const template = document.getElementById(templateId);
  if (!template) return '';
  
  let content = template.innerHTML;
  for (const [key, val] of Object.entries(vars)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), escHtml(val));
  }
  return content;
}

/**
 * Fixes: Security — HTML Escape Utility
 */
function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Architecture: Global Toast Moved from ff-auth.js
 */
function showToast(msg, type = 'info') {
  const container = document.getElementById('app-toast');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/**
 * Architecture: Role-based default routes
 */
function defaultRoute(role) {
  const routes = {
    admin: '#/admin/dashboard',
    owner: '#/owner/dashboard',
    tenant: '#/tenant/dashboard'
  };
  return routes[role] || '#/home';
}

/**
 * Architecture: Consistent Navbar Injection
 */
function renderNavBar() {
  const nav = document.getElementById('app-nav');
  if (!nav || !appState.currentUser) return;

  nav.innerHTML = `
    <div class="nav-inner flex-between">
      <a href="/" class="logo">URBANEST.</a>
      <div class="nav-user">
        <span class="nav-name">${escHtml(appState.currentUser.name)}</span>
        <button class="btn btn--sm" onclick="Auth.logout()">Logout</button>
      </div>
    </div>
  `;
}
