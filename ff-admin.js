// ff-admin.js — Hardened Admin Engine (v16)
// Fixes: Bug #1 (render mismatch) and Architecture (apiFetch)

const Admin = {
  async init(signal) {
    const route = window.location.hash;
    if (route === '#/admin/users') await this.viewUsers(signal);
    else await this.viewDashboard(signal);
  },

  async viewDashboard(signal) {
    const res = await apiFetch('/api/flats');
    appState.listings = res.success ? res.data : [];

    const html = `
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">Admin Terminal</h1>
          <a href="#/admin/users" class="btn btn--secondary">Manage Users</a>
        </div>
        <div class="stat-grid mt-lg">
          <div class="stat-card" style="border-left: 5px solid var(--primary)">
            <p class="stat-card__label">Total Inventory</p>
            <p class="stat-card__value">${appState.listings.length}</p>
          </div>
        </div>
        <h2 class="mt-lg">Global Audit</h2>
        <div class="table-wrap mt-sm">
          <table class="table">
            <thead>
              <tr><th>Property</th><th>City</th><th>Owner</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${appState.listings.map(l => `
                <tr>
                  <td><b>${escHtml(l.title)}</b></td>
                  <td>${escHtml(l.city)}</td>
                  <td><code style="font-size:0.7rem">${l.owner_id}</code></td>
                  <td><span class="badge ${l.available ? 'badge--success' : 'badge--danger'}">${l.available ? 'Active' : 'Archived'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    render(html);
  },

  async viewUsers(signal) {
    const res = await apiFetch('/api/users');
    appState.users = res.success ? res.data : [];

    const html = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">User Directory</h1></div>
        <div class="table-wrap mt-lg">
          <table class="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr>
            </thead>
            <tbody>
              ${appState.users.map(u => `
                <tr>
                  <td><b>${escHtml(u.name)}</b></td>
                  <td>${escHtml(u.email)}</td>
                  <td><span class="badge badge--neutral">${u.role}</span></td>
                  <td class="text-muted">${new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    render(html);
  }
};
