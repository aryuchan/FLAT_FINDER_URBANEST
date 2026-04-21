// ff-core.js — FlatFinder Core Module
// Config · Token · State · API · Security · Render · Nav · UI Utilities
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

async function apiFetch(path, options = {}) {
  try {
    const token      = Token.get();
    const isFormData = options.body instanceof FormData;
    const init = {
      method:      options.method || 'GET',
      credentials: 'include',
      headers: {
        ...(token       ? { Authorization: `Bearer ${token}` } : {}),
        ...(isFormData  ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
      ...options
    };
    if (options.body) {
      init.body = isFormData ? options.body : JSON.stringify(options.body);
    }

    const res = await fetch(`${API}${path}`, init);
    const ct  = res.headers.get('content-type') || '';

    if (res.status === 401 && !path.includes('/login') && !path.includes('/logout')) {
      showToast('Session expired. Please log in again.', 'warning');
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
    console.error('[apiFetch]', path, err);
    return { success: false, data: null, message: `Cannot reach server.` };
  }
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── RENDER ENGINE ────────────────────────────────────────────────
function render(html) {
  const root = document.getElementById('app-root');
  if (!root) return;
  root.innerHTML = html;
  
  // Trigger event bindings
  if (typeof bindGlobalEvents === 'function') bindGlobalEvents();
  if (typeof bindModuleEvents === 'function') bindModuleEvents();
}

function bindGlobalEvents() {
  const root = document.getElementById('app-root');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';

  root.addEventListener('click', (e) => {
    const link = e.target.closest('[data-route]');
    if (!link) return;
    const route = link.dataset.route;
    if (route) {
      e.preventDefault();
      window.location.hash = (route.startsWith('#') ? '' : '#') + route;
    }
  });
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
  if (!tmpl) return `<p>Template ${templateId} missing.</p>`;
  return Object.keys(dataMap).reduce((html, key) => {
    const val = dataMap[key] == null ? '' : String(dataMap[key]);
    return html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }, tmpl.innerHTML);
}

function renderNavBar() {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  const u = appState.currentUser;
  if (!u) { nav.innerHTML = ''; return; }

  const roleLinks = {
    tenant: [
      { label: '🏠 Dashboard', route: '/tenant/dashboard' },
      { label: '🔍 Search',    route: '/tenant/search'    },
      { label: '📋 Bookings',  route: '/tenant/bookings'  },
    ],
    owner: [
      { label: '🏠 Dashboard', route: '/owner/dashboard' },
      { label: '📋 Listings',  route: '/owner/listings'  },
      { label: '➕ Add Flat',  route: '/owner/add-flat'  },
      { label: '👤 Profile',   route: '/owner/profile'   },
    ],
    admin: [
      { label: '🏠 Dashboard', route: '/admin/dashboard' },
      { label: '✅ Approvals', route: '/admin/approvals' },
      { label: '👥 Users',     route: '/admin/users'     },
    ],
  };

  const links = (roleLinks[u.role] || [])
    .map((l) => `<a class="nav__link" href="#" data-route="${l.route}">${l.label}</a>`)
    .join('');

  nav.innerHTML = `
    <div class="nav__inner container">
      <a class="nav__brand" href="#" data-route="/">🏠 FlatFinder</a>
      <div class="nav__links">${links}</div>
      <div class="nav__user">
        <span class="nav__name">${escHtml(u.name)}</span>
        <button class="btn btn--secondary btn--sm" id="logout-btn">Logout</button>
      </div>
    </div>`;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (typeof handleLogout === 'function') handleLogout();
  });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('app-toast');
  if (!toast) return;
  const div = document.createElement('div');
  div.className = `toast toast--${type}`;
  div.innerHTML = `<span>${escHtml(message)}</span><button onclick="this.parentElement.remove()">×</button>`;
  toast.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function defaultRoute() {
  const role = appState.currentUser?.role;
  if (role === "admin") return "#/admin/dashboard";
  if (role === "owner") return "#/owner/dashboard";
  return "#/tenant/dashboard";
}

async function handleLogout() {
  await apiFetch("/api/logout", { method: "POST" });
  Token.clear();
  Object.assign(appState, { currentUser: null });
  renderNavBar();
  window.location.hash = "#/login";
  showToast("Logged out.", "info");
}
