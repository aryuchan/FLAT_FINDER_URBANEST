// ff-admin.js — Ultimate Global Control Terminal (v18.0)
const Admin = {
  async init() {
    await this.route();
  },

  async route() {
    const hash = window.location.hash || '#/dashboard';
    if (hash === '#/users') await this.viewUsers();
    else await this.viewDashboard();
    this.bindEvents();
  },

  async viewDashboard() {
    const res = await apiFetch('/api/flats');
    const flats = res.success ? res.data : [];

    await render(`
      <div class="container page-content">
        <div class="page-header">
          <h2>Global Inventory</h2>
          <a class="btn btn--secondary btn--sm" href="#/users" data-route="/users">👥 System Users</a>
        </div>

        <div class="stat-grid mt-lg">
          <div class="stat-card card">
            <p class="stat-card__label">Total Properties</p>
            <p class="stat-card__value">${flats.length}</p>
          </div>
          <div class="stat-card card" style="border-top: 4px solid var(--success)">
            <p class="stat-card__label">Active Listings</p>
            <p class="stat-card__value">${flats.filter(f => f.available).length}</p>
          </div>
          <div class="stat-card card" style="border-top: 4px solid var(--danger)">
            <p class="stat-card__label">Hidden/Pending</p>
            <p class="stat-card__value">${flats.filter(f => !f.available).length}</p>
          </div>
        </div>

        <div class="card mt-xl">
          <h3 class="card-title">Property Audit Log</h3>
          <div class="table-wrap" id="admin-table-container">
            ${flats.length ? `
              <table class="table">
                <thead><tr><th>Property</th><th>Location</th><th>Visibility</th><th>Owner</th><th>Actions</th></tr></thead>
                <tbody>
                  ${flats.map(f => `
                    <tr data-id="${escHtml(f.id)}">
                      <td><b>${escHtml(f.title)}</b><br><small class="text-muted">${escHtml(f.type)}</small></td>
                      <td>${escHtml(f.city)}</td>
                      <td>
                        <span class="badge ${f.available ? 'badge--success' : 'badge--neutral'} btn-toggle-flat" style="cursor:pointer" data-avail="${f.available ? '1' : '0'}">
                          ${f.available ? 'Public' : 'Hidden'}
                        </span>
                      </td>
                      <td><small>${escHtml(f.owner_id.slice(0,8))}...</small></td>
                      <td><button class="btn btn--danger btn--sm btn-del">Delete</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="empty-state"><h3>Inventory Empty</h3><p class="text-muted">No properties have been listed yet.</p></div>'}
          </div>
        </div>
      </div>
    `);
  },

  async viewUsers() {
    const res = await apiFetch('/api/users');
    const users = res.success ? res.data : [];

    await render(`
      <div class="container page-content">
        <div class="page-header">
          <h2>User Management</h2>
          <a class="btn btn--secondary btn--sm" href="#/dashboard" data-route="/dashboard">← Back to Terminal</a>
        </div>

        <div class="card mt-lg">
          <h3 class="card-title">System Participants</h3>
          <div class="table-wrap" id="admin-user-container">
            ${users.length ? `
              <table class="table">
                <thead><tr><th>Identity</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${users.map(u => `
                    <tr data-id="${escHtml(u.id)}">
                      <td><b>${escHtml(u.name)}</b><br><small class="text-muted">${escHtml(u.email)}</small></td>
                      <td><span class="badge badge--neutral">${escHtml(u.role)}</span></td>
                      <td><span class="badge badge--${u.status === 'suspended' ? 'danger' : 'success'}">${escHtml(u.status || 'active')}</span></td>
                      <td>
                        ${u.role !== 'admin' ? 
                          `<button class="btn btn--${u.status === 'suspended' ? 'success' : 'danger'} btn--sm btn-suspend">${u.status === 'suspended' ? 'Restore' : 'Suspend'}</button>` 
                          : '<small class="text-muted">Immutable</small>'
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p class="text-muted">No users found in database.</p>'}
          </div>
        </div>
      </div>
    `);
  },

  bindEvents() {
    const { signal } = appState.activeController;

    // Hardened Global Click Handlers
    document.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('This will permanently delete the listing and all associated images/bookings. Proceed?')) return;
        const id = e.target.closest('tr').dataset.id;
        showLoading(btn);
        const res = await apiFetch(`/api/flats/${id}`, { method: 'DELETE' });
        if (res.success) { showToast('Property purged'); await this.route(); }
        else { showToast(res.message, 'danger'); hideLoading(btn); }
      }, { signal });
    });

    document.querySelectorAll('.btn-toggle-flat').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        const isAvail = e.target.dataset.avail === '1';
        showLoading(btn);
        const res = await apiFetch(`/api/flats/${id}`, { method: 'PATCH', body: { available: !isAvail } });
        if (res.success) { showToast('Visibility updated'); await this.route(); }
        else { showToast(res.message, 'danger'); hideLoading(btn); }
      }, { signal });
    });

    document.querySelectorAll('.btn-suspend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        const action = e.target.textContent;
        const newStatus = action === 'Suspend' ? 'suspended' : 'active';
        if (!confirm(`Mark this user as ${newStatus}?`)) return;
        
        showLoading(btn);
        const res = await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: { status: newStatus } });
        if (res.success) { showToast(`User account ${newStatus}`); await this.route(); }
        else { showToast(res.message, 'danger'); hideLoading(btn); }
      }, { signal });
    });
  }
};
