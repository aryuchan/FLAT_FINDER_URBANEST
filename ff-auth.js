// ff-auth.js — Secure Authentication (v16)
// Fixes: Hash-based routing and Global state sync

const Auth = {
  async login(credentials) {
    const res = await apiFetch('/api/login', {
      method: 'POST',
      body: credentials
    });

    if (res.success) {
      localStorage.setItem('ff_token', res.data.token);
      appState.currentUser = res.data.user;
      showToast('Welcome back!', 'success');
      this.redirectToPortal(res.data.user.role);
    } else {
      showToast(res.message, 'danger');
    }
  },

  async signup(data) {
    const res = await apiFetch('/api/signup', {
      method: 'POST',
      body: data
    });

    if (res.success) {
      showToast('Account created. Please login.', 'success');
      window.location.hash = '#/login';
    } else {
      showToast(res.message, 'danger');
    }
  },

  async logout() {
    await apiFetch('/api/logout', { method: 'POST' });
    localStorage.removeItem('ff_token');
    appState.currentUser = null;
    window.location.href = '/'; // Reset to landing
  },

  /**
   * Fixes: Security — Use hash routing to avoid full page reloads
   */
  redirectToPortal(role) {
    window.location.hash = defaultRoute(role);
  },

  renderLogin() {
    render(populateTemplate('tmpl-auth', { 
      title: 'Sign In', 
      sub: 'Access your premium account' 
    }));
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('auth-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      this.login(data);
    });
  }
};
