// ff-admin.js — Hardened Admin Engine (v17)
// Fixes: Bug #6 — Removed inline onclick

const Admin = {
  async init(signal) {
    if (window.location.hash === '#/users') await this.viewUsers(signal);
    else await this.viewDashboard(signal);
  },

  async viewDashboard(signal) {
    const res = await apiFetch('/api/flats');
    const flats = res.success ? res.data : [];
    await render(`
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">Global Control</h1>
          <a href="#/users" class="btn btn--secondary">Manage Users</a>
        </div>
        <div class="table-wrap mt-lg">
          <table class="table">
            <thead><tr><th>Flat</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${flats.map(f => `
                <tr data-id="${escHtml(f.id)}">
                  <td><b>${escHtml(f.title)}</b></td>
                  <td>${escHtml(f.city)}</td>
                  <td><span class="badge ${f.available ? 'badge--success' : 'badge--danger'}">${f.available ? 'Live' : 'Hidden'}</span></td>
                  <td><button class="btn btn--danger btn--sm btn-del">Delete</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `);
    this.bindEvents(signal);
  },

  async viewUsers(signal) {
    const res = await apiFetch('/api/users');
    const users = res.success ? res.data : [];
    await render(`
      <div class="container">
        <div class="page-header"><h1 class="page-title">User Management</h1></div>
        <div class="table-wrap mt-lg">
          <table class="table">
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr data-id="${escHtml(u.id)}">
                  <td><b>${escHtml(u.name)}</b></td>
                  <td>${u.role}</td>
                  <td><span class="badge badge--neutral">Active</span></td>
                  <td><button class="btn btn--danger btn--sm btn-suspend">Suspend</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `);
    this.bindEvents(signal);
  },

  bindEvents(signal) {
    // Delete Flat
    document.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        if (!confirm('Permanent delete?')) return;
        const res = await apiFetch(`/api/flats/${id}`, { method: 'DELETE' });
        if (res.success) { showToast('Property deleted'); await this.viewDashboard(signal); }
      }, { signal });
    });

    // Suspend User
    document.querySelectorAll('.btn-suspend').forEach(btn => {
      btn.addEventListener('click', (e) => {
        showToast('Administrative Suspension: Coming Soon', 'warning');
      }, { signal });
    });
  }
};
