// ff-auth.js — Hardened Authentication (v17)
// Fixes: Bug #6 — Removed inline onclick

const Auth = {
  async login(data, btn) {
    showLoading(btn);
    try {
      const res = await apiFetch('/api/login', { method: 'POST', body: data });
      if (res.success) {
        localStorage.setItem('ff_token', res.data.token);
        appState.currentUser = res.data.user;
        this.redirectToPortal(res.data.user.role);
      } else {
        showToast(res.message, 'danger');
      }
    } finally {
      hideLoading(btn);
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

  async renderSignup() {
    await render(populateTemplate('tmpl-signup', {}));
    this.bindEvents();
  },

  async signup(data, btn) {
    showLoading(btn);
    try {
      const res = await apiFetch('/api/signup', { method: 'POST', body: data });
      if (res.success) {
        showToast('Account created. Please login.', 'success');
        window.location.hash = '#/login';
      } else {
        showToast(res.message, 'danger');
      }
    } finally {
      hideLoading(btn);
    }
  },

  bindEvents() {
    const loginForm = document.getElementById('auth-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(loginForm));
        this.login(data, e.target.querySelector('button[type="submit"]'));
      }, { signal: appState.activeController.signal });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(signupForm));
        this.signup(data, e.target.querySelector('button[type="submit"]'));
      }, { signal: appState.activeController.signal });
    }
  }
};
