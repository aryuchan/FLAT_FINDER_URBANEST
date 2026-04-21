// ff-core.js — FlatFinder Core Module (v4)
// Professional Engine: Theme Management · Global Delegation · API · UI
// ─────────────────────────────────────────────────────────────────

const IS_PROD = (typeof window !== 'undefined') && !['localhost', '127.0.0.1'].includes(window.location.hostname);

const API = (() => {
  if (window.FF_API_BASE) return window.FF_API_BASE.replace(/\/$/, '');
  const metaBase = document.querySelector('meta[name="api-base"]')?.content;
  if (metaBase && metaBase !== '{{API_BASE}}') return metaBase.replace(/\/$/, '');
  return '';
})();

const Token = {
  get:   ()  => localStorage.getItem('ff_jwt'),
  save:  (t) => t && localStorage.setItem('ff_jwt', t),
  clear: ()  => localStorage.removeItem('ff_jwt'),
};

const appState = {
  currentUser:   null,
  flats:         [],
  bookings:      [],
  users:         [],
  listings:      [],
  _selectedFlat: null,
};

// ── THEME ENGINE ──────────────────────────────────────────────────
const Theme = {
  init() {
    const saved = localStorage.getItem('ff_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.set(saved);
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.set(current === 'dark' ? 'light' : 'dark');
  },
  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ff_theme', theme);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  }
};

// ── GLOBAL CLICK SHIELD (The Definitive Link Fix) ──────────────────
// This handles EVERY click on the page. If it's a link with data-route, 
// we intercept it immediately. No more dead buttons.
window.addEventListener('click', (e) => {
  const link = e.target.closest('[data-route]');
  if (!link) return;
  
  const route = link.dataset.route;
  if (route) {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Global Shield] Routing to:', route);
    window.location.hash = (route.startsWith('#') ? '' : '#') + route.replace(/^#/, '');
  }
}, true); // Use capture phase for maximum priority

// ── API CLIENT ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const token = Token.get();
    const isFormData = options.body instanceof FormData;
    const init = {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
      ...options
    };
    if (options.body && !isFormData) {
      init.body = JSON.stringify(options.body);
    }

    const res = await fetch(`${API}${path}`, init);
    const ct = res.headers.get('content-type') || '';

    if (res.status === 401 && !path.includes('/login') && !path.includes('/logout')) {
      showToast('Session expired.', 'warning');
      if (typeof handleLogout === 'function') handleLogout();
      return { success: false, data: null, message: 'Session expired.' };
    }

    if (!ct.includes('application/json')) {
      return { success: false, data: null, message: `Server error ${res.status}` };
    }

    const json = await res.json();
    if (json?.data?.token) Token.save(json.data.token);
    return json;
  } catch (err) {
    console.error('[apiFetch Error]', err);
    return { success: false, data: null, message: 'Connection lost.' };
  }
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── RENDER ENGINE ────────────────────────────────────────────────
function render(html) {
  const root = document.getElementById('app-root');
  if (!root) return;
  
  // Apply a smooth fade-out effect before switching content
  root.style.opacity = '0';
  root.style.transform = 'translateY(10px)';
  root.style.transition = '0.2s';

  setTimeout(() => {
    root.innerHTML = html;
    root.style.opacity = '1';
    root.style.transform = 'translateY(0)';
    
    // Immediately bind module-specific events
    if (typeof bindModuleEvents === 'function') bindModuleEvents();
  }, 200);
}

function bindModuleEvents() {
  const root = document.getElementById('app-root');
  if (!root) return;
  if (typeof Auth   !== 'undefined' && Auth)   Auth.bindEvents(root);
  if (typeof Tenant !== 'undefined' && Tenant) Tenant.bindEvents(root);
  if (typeof Owner  !== 'undefined' && Owner)  Owner.bindEvents(root);
  if (typeof Admin  !== 'undefined' && Admin)  Admin.bindEvents(root);
}

function populateTemplate(templateId, dataMap) {
  const tmpl = document.getElementById(templateId);
  if (!tmpl) return `<div class="glass" style="padding:2rem">Template ${templateId} missing.</div>`;
  return Object.keys(dataMap).reduce((html, key) => {
    const val = dataMap[key] == null ? '' : String(dataMap[key]);
    return html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }, tmpl.innerHTML);
}

function renderNavBar() {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  const u = appState.currentUser;

  const roleLinks = u ? {
    tenant: [{ label: '🏠 Dashboard', route: '/tenant/dashboard' }, { label: '🔍 Search', route: '/tenant/search' }],
    owner:  [{ label: '🏠 Dashboard', route: '/owner/dashboard' }, { label: '➕ Add Flat', route: '/owner/add-flat' }],
    admin:  [{ label: '🏠 Dashboard', route: '/admin/dashboard' }, { label: '👥 Users', route: '/admin/users' }],
  }[u.role] || [] : [];

  const links = linksToHtml(roleLinks);

  nav.innerHTML = `
    <div class="nav-inner container">
      <a class="nav-brand" href="#" data-route="/">🏠 FlatFinder</a>
      <div class="nav-links">${links}</div>
      <div style="display:flex; align-items:center; gap:1rem;">
        <button class="theme-toggle" id="theme-toggle-btn">🌙</button>
        ${u ? `<span class="nav-name">${escHtml(u.name.split(' ')[0])}</span>
               <button class="btn btn-secondary btn--sm" id="logout-btn">Logout</button>` : ''}
      </div>
    </div>`;

  // Attach navbar-specific listeners
  document.getElementById('theme-toggle-btn')?.addEventListener('click', () => Theme.toggle());
  document.getElementById('logout-btn')?.addEventListener('click', () => handleLogout());
  Theme.init(); // Sync toggle icon
}

function linksToHtml(links) {
  return links.map(l => `<a class="nav-link" href="#" data-route="${l.route}">${l.label}</a>`).join('');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('app-toast');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.innerHTML = escHtml(message);
  container.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function defaultRoute() {
  const r = appState.currentUser?.role;
  return r === "admin" ? "#/admin/dashboard" : r === "owner" ? "#/owner/dashboard" : "#/tenant/dashboard";
}

async function handleLogout() {
  await apiFetch("/api/logout", { method: "POST" });
  Token.clear();
  appState.currentUser = null;
  renderNavBar();
  window.location.hash = "#/login";
  showToast("Logged out.", "success");
}

// Initialize Theme
Theme.init();
