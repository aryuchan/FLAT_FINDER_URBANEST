// ff-auth.js — Hardened Authentication (v17)
// Fixes: Bug #6 — Removed inline onclick

const Auth = {
  async login(credentials) {
    const res = await apiFetch('/api/login', { method: 'POST', body: credentials });
    if (res.success) {
      localStorage.setItem('ff_token', res.data.token);
      appState.currentUser = res.data.user;
      this.redirectToPortal(res.data.user.role);
    } else {
      showToast(res.message, 'danger');
    }
  },

  async logout() {
    await apiFetch('/api/logout', { method: 'POST' });
    localStorage.removeItem('ff_token');
    appState.currentUser = null;
    window.location.href = '/';
  },

  redirectToPortal(role) {
    const routes = { tenant: '/tenant', owner: '/owner', admin: '/admin' };
    window.location.href = routes[role] || '/';
  },

  async renderLogin() {
    // Fixes: Architecture — await render
    await render(populateTemplate('tmpl-auth', { 
      title: escHtml('Sign In'), 
      sub: escHtml('Access your premium account') 
    }));
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('auth-form');
    if (!form) return;
    // Fixes: Quality — AbortController signal
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      this.login(data);
    }, { signal: appState.activeController.signal });
  }
};
