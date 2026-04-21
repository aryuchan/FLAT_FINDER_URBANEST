// app.js — Global Bootstrapper (v16)
// Fixes: Bug #4 (Boot Auth Check) and Master Routing

const App = {
  async init() {
    // 1. Initial State Check
    const token = localStorage.getItem('ff_token');
    if (token) {
      const res = await apiFetch('/api/me');
      if (res.success) {
        appState.currentUser = res.data;
        renderNavBar();
      } else {
        localStorage.removeItem('ff_token');
      }
    }

    // 2. Routing Logic
    window.onhashchange = () => this.route();
    this.route();
  },

  async route() {
    const hash = window.location.hash || '#/home';
    const signal = appState.activeController.signal;

    // Fixes: Bug #1 — Render module-specific content based on route
    if (hash === '#/login' || hash === '#/signup') {
      Auth.renderLogin();
    } else if (hash.startsWith('#/tenant')) {
      if (!appState.currentUser) return window.location.hash = '#/login';
      await Tenant.init(signal);
    } else if (hash.startsWith('#/owner')) {
      if (!appState.currentUser) return window.location.hash = '#/login';
      await Owner.init(signal);
    } else if (hash.startsWith('#/admin')) {
      if (!appState.currentUser) return window.location.hash = '#/login';
      await Admin.init(signal);
    } else {
      // Default landing behavior or home
      window.location.hash = appState.currentUser ? defaultRoute(appState.currentUser.role) : '#/login';
    }
  }
};

// Start the Engine
App.init();
