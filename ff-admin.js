// ff-admin.js — Hardened Admin Engine (v17)
// Fixes: Bug #6 — Removed inline onclick

const Admin = {
  // FIX [7]: Renamed init to route
  async route() {
    if (window.location.hash === '#/users') await this.viewUsers();
    else await this.viewDashboard();
  },

  async viewDashboard() {
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
                <tr data-id="${escHtml(String(f.id))}">
                  <td><b>${escHtml(f.title)}</b></td>
                  <td>${escHtml(f.city)}</td>
                  <!-- FIX [24]: Sanitized fields -->
                  <td><span class="badge ${f.available ? 'badge--success' : 'badge--danger'}">${f.available ? 'Live' : 'Hidden'}</span></td>
                  <td><button class="btn btn--danger btn--sm btn-del">Delete</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `);
    this.bindEvents();
  },

  async viewUsers() {
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
                <tr data-id="${escHtml(String(u.id))}">
                  <td><b>${escHtml(u.name)}</b></td>
                  <td>${escHtml(u.role)}</td>
                  <!-- FIX [24]: Real user status -->
                  <td><span class="badge badge--neutral">${escHtml(String(u.status || 'active'))}</span></td>
                  <!-- FIX [11]: Fully implemented suspend button -->
                  <td>
                    ${u.role !== 'admin' ? 
                      `<button class="btn btn--danger btn--sm btn-suspend">${u.status === 'suspended' ? 'Activate' : 'Suspend'}</button>` 
                      : ''
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `);
    this.bindEvents();
  },

  bindEvents() {
    // FIX [5], [20]: Extract signal AFTER await render completes
    const { signal } = appState.activeController;

    // Delete Flat
    document.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        if (!confirm('Permanent delete?')) return;
        const res = await apiFetch(`/api/flats/${id}`, { method: 'DELETE' });
        if (res.success) { showToast('Property deleted'); await this.viewDashboard(); }
      }, { signal });
    });

    // Suspend User
    document.querySelectorAll('.btn-suspend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        const newStatus = e.target.textContent === 'Suspend' ? 'suspended' : 'active';
        const res = await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: { status: newStatus } });
        if (res.success) {
          showToast(`User ${newStatus}`);
          await this.viewUsers();
        } else {
          showToast(res.message, 'danger');
        }
      }, { signal });
    });
  }
};
