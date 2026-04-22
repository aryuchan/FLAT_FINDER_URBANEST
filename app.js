// app.js — Hardened Router (v18.0)

const App = {
  async init() {
    console.log('Urbanest Bootstrapping...');
    
    // Fix: Path-based Role Guard
    const path = window.location.pathname;
    const res = await apiFetch('/api/me');
    
    if (res.success) {
      appState.currentUser = res.data;
      // Redirect if on wrong portal
      if (path === '/tenant' && res.data.role !== 'tenant') return window.location.href = `/${res.data.role}`;
      if (path === '/owner' && res.data.role !== 'owner') return window.location.href = `/${res.data.role}`;
      if (path === '/admin' && res.data.role !== 'admin') return window.location.href = `/${res.data.role}`;
    } else {
      // Not logged in: allow portal root (for login/signup) but redirect sub-pages if needed
      // (SPA handles templates, so just ensure state is null)
      appState.currentUser = null;
    }

    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  async route() {
    const hash = window.location.hash || '#/';
    const path = window.location.pathname;

    // 1. Identify Portal Module
    let module = null;
    if (path === '/tenant') module = typeof Tenant !== 'undefined' ? Tenant : null;
    if (path === '/owner')  module = typeof Owner  !== 'undefined' ? Owner  : null;
    if (path === '/admin')  module = typeof Admin  !== 'undefined' ? Admin  : null;

    if (!module) return; // Not a portal page (e.g. index.html handled by landing.js)

    // 2. Auth Interception
    if (!appState.currentUser) {
      if (hash === '#/signup') return Auth.renderSignup();
      return Auth.renderLogin();
    }

    // 3. Delegation
    if (module.route) await module.route();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
