// app.js — Global Bootstrapper (v17)
// Fixes: Bug #5 — Use addEventListener for hashchange

const App = {
  async init() {
    const token = localStorage.getItem('ff_token');
    if (token) {
      const res = await apiFetch('/api/me');
      if (res.success) {
        appState.currentUser = res.data;
      } else {
        localStorage.removeItem('ff_token');
      }
    }

    // Fixes: Bug #5 — Prevent overwriting other handlers
    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  async route() {
    const hash = window.location.hash || '#/dashboard';
    
    // Fixes: Architecture — Module Guards
    const isTenant = typeof Tenant !== 'undefined';
    const isOwner = typeof Owner !== 'undefined';
    const isAdmin = typeof Admin !== 'undefined';

    if (!appState.currentUser) {
      return Auth.renderLogin();
    }

    // Role-based portal validation
    const role = appState.currentUser.role;
    const path = window.location.pathname;

    if (path.includes('/tenant') && !isTenant) return window.location.href = '/tenant';
    if (path.includes('/owner') && !isOwner) return window.location.href = '/owner';
    if (path.includes('/admin') && !isAdmin) return window.location.href = '/admin';

    // Route Execution
    try {
      if (role === 'tenant' && isTenant) await Tenant.init(appState.activeController.signal);
      else if (role === 'owner' && isOwner) await Owner.init(appState.activeController.signal);
      else if (role === 'admin' && isAdmin) await Admin.init(appState.activeController.signal);
      else {
        // Fallback to role-specific dashboard
        const routes = { tenant: '/tenant', owner: '/owner', admin: '/admin' };
        if (!path.includes(routes[role])) window.location.href = routes[role];
      }
    } catch (err) {
      logger.error('Routing failed', err.message);
    }
  }
};

// Start the System
App.init();
