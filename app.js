// app.js — Hardened Router (v18.0)

const App = {
  async init() {
    window.addEventListener('hashchange', () => this.route());
    
    const res = await apiFetch('/api/me');
    if (res.success) appState.currentUser = res.data;
    
    this.bindGlobalEvents();
    this.route();
  },

  bindGlobalEvents() {
    const oldRoot = document.getElementById('app-root');
    if (!oldRoot) return;
    
    // Hardened Click Handling: Clone node to purge old listeners
    const root = oldRoot.cloneNode(true);
    oldRoot.replaceWith(root);
    
    root.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#/"]');
      if (link) {
        // App.route() will trigger on hashchange
      }
    });
  },

  async route() {
    const hash = window.location.hash || '#/';
    const path = hash.slice(1) || '/';
    const portal = window.location.pathname;

    // Identify Portal Module
    let module = null;
    if (portal.includes('tenant')) module = typeof Tenant !== 'undefined' ? Tenant : null;
    if (portal.includes('owner'))  module = typeof Owner  !== 'undefined' ? Owner  : null;
    if (portal.includes('admin'))  module = typeof Admin  !== 'undefined' ? Admin  : null;

    if (!module) return;

    // Auth Guard
    if (!appState.currentUser) {
      if (path === '/signup') return Auth.renderSignup();
      return Auth.renderLogin();
    }

    // Role Guard
    if (portal.includes('tenant') && appState.currentUser.role !== 'tenant') return window.location.href = '/';
    if (portal.includes('owner') && appState.currentUser.role !== 'owner') return window.location.href = '/';
    if (portal.includes('admin') && appState.currentUser.role !== 'admin') return window.location.href = '/';

    // Delegate
    if (module.route) await module.route();
    
    // Refresh Global Events
    this.bindGlobalEvents();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
