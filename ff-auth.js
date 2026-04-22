// ff-auth.js — Hardened Authentication (v17)
// Fixes: Bug #6 — Removed inline onclick

const Auth = {
  async login(data, btn) {
    showLoading(btn);
    try {
      console.log('[Login] Submitting:', { ...data, password: '***' });
      const res = await apiFetch('/api/login', { method: 'POST', body: data });
      console.log('[Login] Response:', res);
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
    // Fixes: Architecture — await render
    await render(populateTemplate('tmpl-auth', { 
      title: escHtml('Sign In'), 
      sub: escHtml('Access your premium account') 
    }));
    this.bindEvents();
  },

  async renderSignup() {
    if (appState.currentUser) return this.redirectToPortal(appState.currentUser.role);
    await render(populateTemplate('tmpl-signup', {}));
    this.bindEvents();
  },

  async signup(data, btn) {
    if (!data.name || data.name.trim().length < 2) return showToast('Name must be at least 2 characters', 'warning');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) return showToast('Invalid email format', 'warning');
    if (!data.password || data.password.length < 8) return showToast('Password must be at least 8 characters', 'warning');
    
    showLoading(btn);
    try {
      console.log('[Signup] Submitting:', { ...data, password: '***' });
      const res = await apiFetch('/api/signup', { method: 'POST', body: data });
      console.log('[Signup] Response:', res);
      if (res.success) {
        showToast('Account created. Please login.', 'success');
        window.location.hash = '#/login';
      } else {
        showToast(res.message || 'Signup failed', 'danger');
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

    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling to form
        const targetBtn = e.currentTarget;
        const input = targetBtn.parentElement.querySelector('input');
        if (input) {
          const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
          input.setAttribute('type', type);
          targetBtn.textContent = type === 'password' ? '👁️' : '🙈';
        }
      }, { signal: appState.activeController.signal });
    });
  }
};
