// ff-core.js — Production SPA Engine (v18.0)

const logger = {
  info:  (...a) => console.log('[INFO]',  ...a),
  warn:  (...a) => console.warn('[WARN]', ...a),
  error: (...a) => console.error('[ERR]', ...a)
};

const appState = {
  currentUser: null,
  flats: [],
  bookings: [],
  activeController: new AbortController(),
  lastToast: { msg: '', time: 0 }
};

window.onerror = (msg) => {
  showToast('Interface error. Please refresh.', 'danger');
  logger.error('Global Error:', msg);
};

window.onunhandledrejection = (event) => {
  logger.error('Unhandled Promise Rejection:', event.reason);
};

/**
 * Hardened Fetch with timeout and auto-JSON handling
 */
async function apiFetch(url, opts = {}) {
  const timeout = 10000; // 10s
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const token = localStorage.getItem('ff_token');
  const headers = { ...(token && { 'Authorization': `Bearer ${token}` }), ...opts.headers };

  // Fix: Don't set Content-Type for FormData (browser does it with boundary)
  const isFormData = opts.body instanceof FormData;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const body = opts.body && !isFormData && typeof opts.body === 'object' 
    ? JSON.stringify(opts.body) 
    : opts.body;

  try {
    const res = await fetch(url, { 
      ...opts, 
      body, 
      headers, 
      signal: controller.signal,
      credentials: 'include' 
    });
    
    clearTimeout(id);

    if (res.status === 401) {
      localStorage.removeItem('ff_token');
      if (window.location.pathname !== '/') window.location.href = '/';
      return { success: false, message: 'Session expired' };
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    clearTimeout(id);
    const msg = err.name === 'AbortError' ? 'Request timeout' : err.message;
    logger.error(`API FAIL [${url}]:`, msg);
    return { success: false, message: msg };
  }
}

async function render(html) {
  appState.activeController.abort();
  appState.activeController = new AbortController();

  const root = document.getElementById('app-root');
  if (!root) return;

  return new Promise((resolve) => {
    root.innerHTML = html;
    requestAnimationFrame(() => {
      renderNavBar();
      resolve();
    });
  });
}

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
  div.textContent = String(str);
  return div.innerHTML;
}

function showToast(msg, type = 'info') {
  const now = Date.now();
  if (appState.lastToast.msg === msg && now - appState.lastToast.time < 1500) return;
  
  appState.lastToast = { msg, time: now };
  const container = document.getElementById('app-toast');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

function showLoading(btn) {
  if (!btn) return;
  btn.dataset.origText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Loading...';
}

function hideLoading(btn) {
  if (!btn) return;
  btn.textContent = btn.dataset.origText || 'Submit';
  btn.disabled = false;
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function renderNavBar() {
  const nav = document.getElementById('app-nav');
  if (!nav || !appState.currentUser) return;

  const savedTheme = localStorage.getItem('ff_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  nav.innerHTML = `
    <div class="nav-inner flex-between">
      <a href="/" class="logo">URBANEST.</a>
      <div class="nav-user" style="display:flex; gap:1.5rem; align-items:center;">
        <span class="nav-name" style="font-weight:700">Hi, ${escHtml(appState.currentUser.name)}</span>
        <button class="btn btn--secondary btn--sm" id="btn-theme" title="Toggle Theme" style="min-width:44px">🌙</button>
        <button class="btn btn--primary btn--sm" id="btn-logout">Logout</button>
      </div>
    </div>
  `;

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (typeof Auth !== 'undefined') Auth.logout();
  }, { signal: appState.activeController.signal });
  
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ff_theme', next);
    document.getElementById('btn-theme').textContent = next === 'dark' ? '☀️' : '🌙';
  }, { signal: appState.activeController.signal });

  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}
