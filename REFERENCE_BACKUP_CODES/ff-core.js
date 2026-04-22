// ff-core.js — FlatFinder Core Module
// Config · Token · State · API · Security · Render · Nav · UI Utilities
// Loaded first. All other modules depend on globals exposed here.
// ─────────────────────────────────────────────────────────────────

// ── CONFIG ───────────────────────────────────────────────────────
// On Railway the static frontend is served by the SAME Express server
// that hosts the API, so the origin is always identical — use "" (empty).
const API = (() => {
  if (window.FF_API_BASE) return window.FF_API_BASE.replace(/\/$/, '');
  const metaBase = document.querySelector('meta[name="api-base"]')?.content;
  if (metaBase && metaBase !== '{{API_BASE}}') return metaBase.replace(/\/$/, '');
  return '';
})();

// ── TOKEN ────────────────────────────────────────────────────────
// Wrapped in try/catch: localStorage throws in some private-browsing contexts.
const Token = {
  get:   ()  => { try { return localStorage.getItem('ff_jwt'); }    catch { return null; } },
  save:  (t) => { try { if (t) localStorage.setItem('ff_jwt', t); } catch {} },
  clear: ()  => { try { localStorage.removeItem('ff_jwt'); }        catch {} },
};

// ── GLOBAL STATE ─────────────────────────────────────────────────
const appState = {
  currentUser:   null,
  flats:         [],
  bookings:      [],
  users:         [],
  listings:      [],
  _selectedFlat: null,
};

// ── API CLIENT ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const token      = Token.get();
    const isFormData = options.body instanceof FormData;
    const init = {
      method:      options.method || 'GET',
      credentials: 'include',
      headers: {
        ...(token      ? { Authorization: `Bearer ${token}` } : {}),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    };
    if (options.body !== undefined) {
      init.body = isFormData
        ? options.body
        : typeof options.body === 'object'
          ? JSON.stringify(options.body)
          : options.body;
    }

    const res = await fetch(`${API}${path}`, init);
    const ct  = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return {
        success: false,
        data:    null,
        message: `Server error ${res.status}. Is the backend running?`,
      };
    }

    const json = await res.json();
    if (json?.data?.token) Token.save(json.data.token);
    return json;
  } catch (err) {
    console.error('[apiFetch]', path, err);
    return {
      success: false,
      data:    null,
      message: 'Cannot reach server. Check your connection or backend status.',
    };
  }
}

// ── SECURITY ─────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ── RENDER ───────────────────────────────────────────────────────
function render(html) {
  const root = document.getElementById('app-root');
  if (!root) return;
  root.innerHTML = html;
  // bindEvents() is defined in app.js — guard avoids ReferenceError if loaded standalone.
  if (typeof bindEvents === 'function') bindEvents();
}

// ── NAV BAR ──────────────────────────────────────────────────────
function renderNavBar() {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  const u = appState.currentUser;
  if (!u) { nav.innerHTML = ''; return; }

  const roleLinks = {
    tenant: [
      { label: '🏠 Dashboard',    route: '/tenant/dashboard' },
      { label: '🔍 Search Flats', route: '/tenant/search'    },
      { label: '📋 My Bookings',  route: '/tenant/bookings'  },
    ],
    owner: [
      { label: '🏠 Dashboard',  route: '/owner/dashboard' },
      { label: '📋 Listings',   route: '/owner/listings'  },
      { label: '➕ Add Flat',   route: '/owner/add-flat'  },
      { label: '👤 My Profile', route: '/owner/profile'   },
    ],
    admin: [
      { label: '🏠 Dashboard', route: '/admin/dashboard' },
      { label: '✅ Approvals', route: '/admin/approvals' },
      { label: '👥 Users',     route: '/admin/users'     },
    ],
  };

  const badgeClass = {
    admin:  'badge--danger',
    owner:  'badge--warning',
    tenant: 'badge--success',
  };

  const currentHash = window.location.hash;
  const links = (roleLinks[u.role] || [])
    .map(l => {
      const isActive = currentHash === '#' + l.route;
      return `<a class="nav__link${isActive ? ' nav__link--active' : ''}"
           href="#${l.route}" data-route="${l.route}"
           ${isActive ? 'aria-current="page"' : ''}>${escHtml(l.label)}</a>`;
    })
    .join('');

  nav.innerHTML = `
    <div class="nav__inner container">
      <a class="nav__brand" href="#" aria-label="FlatFinder home">🏠 FlatFinder</a>
      <nav class="nav__links" aria-label="Section navigation">${links}</nav>
      <div class="nav__user">
        <span class="nav__name">${escHtml(u.name)}</span>
        <span class="badge ${escHtml(badgeClass[u.role] || 'badge--neutral')}">${escHtml(u.role)}</span>
        <button class="btn btn--secondary btn--sm" id="logout-btn" type="button">Logout</button>
      </div>
    </div>`;

  // Bind logout after nav is rendered (fresh element — no listener accumulation)
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (typeof handleLogout === 'function') handleLogout();
  });
}

// ── UI UTILITIES ─────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('app-toast');
  if (!toast) return;
  const cls = {
    success: 'toast--success',
    error:   'toast--error',
    warning: 'toast--warning',
    info:    'toast--info',
  };
  const div = document.createElement('div');
  div.className = `toast ${cls[type] || 'toast--info'}`;
  const msgSpan = document.createElement('span');
  msgSpan.className   = 'toast__message';
  msgSpan.textContent = message;
  const closeBtn = document.createElement('button');
  closeBtn.className  = 'toast__close';
  closeBtn.type       = 'button';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => div.remove());
  div.appendChild(msgSpan);
  div.appendChild(closeBtn);
  toast.appendChild(div);
  setTimeout(() => div.remove(), 4500);
}

function showModal(html) {
  closeModal();
  const container = document.getElementById('app-modal');
  if (!container) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" tabindex="-1">
      <button class="modal__close" type="button" aria-label="Close modal">×</button>
      ${html}
    </div>`;
  overlay.querySelector('.modal__close')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  container.appendChild(overlay);
  container.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => overlay.querySelector('.modal-box')?.focus());
}

function closeModal() {
  const container = document.getElementById('app-modal');
  if (!container) return;
  container.querySelector('.modal-overlay')?.remove();
  container.setAttribute('aria-hidden', 'true');
}
