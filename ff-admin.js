// ff-admin.js — Hardened Admin Engine (v18.0)

const Admin = {
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
          <h1 class="page-title">Global Inventory</h1>
          <a href="#/users" class="btn btn--secondary">Manage Accounts</a>
        </div>
        <div class="table-wrap mt-lg" id="admin-table-container">
          ${flats.length === 0 ? `<div class="empty-state"><h3>Inventory Empty</h3></div>` : `
            <table class="table">
              <thead><tr><th>Title</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${flats.map(f => `
                  <tr data-id="${escHtml(f.id)}">
                    <td><b>${escHtml(f.title)}</b></td>
                    <td>${escHtml(f.city)}</td>
                    <td><span class="badge ${f.available ? 'badge--success' : 'badge--danger'} btn-toggle-flat" style="cursor:pointer" data-avail="${f.available ? '1' : '0'}">${f.available ? 'Live' : 'Hidden'}</span></td>
                    <td><button class="btn btn--danger btn--sm btn-del">Delete</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
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
        <div class="flex-between page-header">
          <h1 class="page-title">System Users</h1>
          <a href="#/dashboard" class="btn btn--secondary btn--sm">← Dashboard</a>
        </div>
        <div class="table-wrap mt-lg" id="admin-table-container">
          ${users.length === 0 ? `<div class="empty-state"><h3>No users found</h3></div>` : `
            <table class="table">
              <thead><tr><th>Full Name</th><th>Role</th><th>Security Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${users.map(u => `
                  <tr data-id="${escHtml(u.id)}">
                    <td><b>${escHtml(u.name)}</b></td>
                    <td style="text-transform:capitalize">${escHtml(u.role)}</td>
                    <td><span class="badge badge--${u.status === 'suspended' ? 'danger' : 'success'}">${escHtml(u.status || 'active')}</span></td>
                    <td>
                      ${u.role !== 'admin' ? 
                        `<button class="btn btn--${u.status === 'suspended' ? 'success' : 'danger'} btn--sm btn-suspend">${u.status === 'suspended' ? 'Activate' : 'Suspend'}</button>` 
                        : '<span class="text-muted">Protected</span>'
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `);
    this.bindEvents();
  },

  bindEvents() {
    const { signal } = appState.activeController;
    const container = document.getElementById('admin-table-container');

    const setLoading = (loading) => {
      if (container) container.style.opacity = loading ? '0.5' : '1';
    };

    document.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Permanent deletion. Continue?')) return;
        const id = e.target.closest('tr').dataset.id;
        showLoading(btn);
        setLoading(true);
        try {
          const res = await apiFetch(`/api/flats/${id}`, { method: 'DELETE' });
          if (res.success) { showToast('Removed from database'); await this.viewDashboard(); }
        } finally { hideLoading(btn); setLoading(false); }
      }, { signal });
    });

    document.querySelectorAll('.btn-toggle-flat').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        const isAvail = e.target.dataset.avail === '1';
        setLoading(true);
        try {
          const res = await apiFetch(`/api/flats/${id}`, { method: 'PATCH', body: { available: !isAvail } });
          if (res.success) { showToast('Visibility toggled'); await this.viewDashboard(); }
        } finally { setLoading(false); }
      }, { signal });
    });

    document.querySelectorAll('.btn-suspend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        const current = e.target.textContent;
        const newStatus = current === 'Suspend' ? 'suspended' : 'active';
        if (!confirm(`Confirm ${newStatus} account?`)) return;
        showLoading(btn);
        setLoading(true);
        try {
          const res = await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: { status: newStatus } });
          if (res.success) { showToast(`User ${newStatus}`); await this.viewUsers(); }
          else showToast(res.message, 'danger');
        } finally { hideLoading(btn); setLoading(false); }
      }, { signal });
    });
  }
};
