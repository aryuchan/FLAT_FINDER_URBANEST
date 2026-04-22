// ff-auth.js — Hardened Authentication (v18.0)

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
        showToast(res.message || 'Login failed', 'danger');
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
    if (appState.currentUser) return this.redirectToPortal(appState.currentUser.role);
    await render(populateTemplate('tmpl-auth', { 
      title: 'Sign In', 
      sub: 'Access your premium account' 
    }));
    this.bindEvents();
  },

  async renderSignup() {
    if (appState.currentUser) return this.redirectToPortal(appState.currentUser.role);
    await render(populateTemplate('tmpl-signup', {}));
    this.bindEvents();
  },

  async signup(data, btn) {
    if (!data.name || data.name.trim().length < 2) return showToast('Name too short', 'warning');
    if (!data.password || data.password.length < 8) return showToast('Password min 8 chars', 'warning');
    
    showLoading(btn);
    try {
      const res = await apiFetch('/api/signup', { method: 'POST', body: data });
      if (res.success) {
        showToast('Account created! Please sign in.', 'success');
        window.location.hash = '#/login';
      } else {
        showToast(res.message || 'Signup failed', 'danger');
      }
    } finally {
      hideLoading(btn);
    }
  },

  bindEvents() {
    const { signal } = appState.activeController;

    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(authForm));
        this.login(data, e.target.querySelector('button[type="submit"]'));
      }, { signal });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(signupForm));
        this.signup(data, e.target.querySelector('button[type="submit"]'));
      }, { signal });
    }

    // Standardized Password Toggle (Delegated)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-password');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const input = btn.parentElement.querySelector('input');
      if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.textContent = isPass ? '🙈' : '👁️';
      }
    }, { signal });
  }
};
