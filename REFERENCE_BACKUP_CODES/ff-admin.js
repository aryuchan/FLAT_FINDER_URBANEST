// ff-admin.js — FlatFinder Admin Module
// Views: Dashboard · Approvals · User Management
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

const Admin = {
  viewDashboard() {
    const { users, flats, bookings, listings } = appState;
    const pending = listings.filter(l => l.status === 'pending').length;
    const stats = [
      { label: 'Total Users',    value: users.length,    icon: '👥' },
      { label: 'Total Flats',    value: flats.length,    icon: '🏠' },
      { label: 'Bookings',       value: bookings.length, icon: '📋' },
      { label: 'Pending Reviews', value: pending,         icon: '⏳' },
    ];
    return `
      <div class="container page-content">
        <div class="page-header"><h2>Admin Dashboard</h2></div>
        <div class="stat-grid">
          ${stats.map(s => `
          <div class="stat-card card">
            <p style="font-size:1.5rem;margin-bottom:var(--space-xs)" aria-hidden="true">${s.icon}</p>
            <p class="stat-card__label">${escHtml(s.label)}</p>
            <p class="stat-card__value">${s.value}</p>
          </div>`).join('')}
        </div>
        <div class="flex-between mt-lg">
          <a class="btn btn--primary" href="#/admin/approvals" data-route="/admin/approvals">
            ✅ Review Listings
            ${pending > 0
              ? `<span class="badge badge--danger" style="margin-left:4px" aria-label="${pending} pending">${pending}</span>`
              : ''}
          </a>
          <a class="btn btn--secondary" href="#/admin/users" data-route="/admin/users">👥 Manage Users</a>
        </div>
      </div>`;
  },

  viewApprovals(listings = appState.listings) {
    const rows = listings.length
      ? listings.map(l => `
        <tr>
          <td>
            <strong>${escHtml(l.flat_title)}</strong>
            <br><small class="text-muted">
              📍 ${escHtml(l.city)} · ${escHtml(l.type)} · ₹${Number(l.rent).toLocaleString('en-IN')}
            </small>
          </td>
          <td>${escHtml(l.owner_name)}</td>
          <td>${l.submitted_at?.slice(0, 10) || '—'}</td>
          <td>
            <span class="badge badge--${l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}">
              ${escHtml(l.status)}
            </span>
          </td>
          <td>
            ${l.status === 'pending'
              ? `<button class="btn btn--primary btn--sm" type="button"
                   data-action="approve" data-id="${escHtml(l.id)}"
                   aria-label="Approve listing for ${escHtml(l.flat_title)}">✅ Approve</button>
                 <button class="btn btn--danger btn--sm"  type="button"
                   data-action="reject"  data-id="${escHtml(l.id)}"
                   aria-label="Reject listing for ${escHtml(l.flat_title)}">❌ Reject</button>`
              : l.reviewer_name
                ? `<small class="text-muted">by ${escHtml(l.reviewer_name)}</small>`
                : '—'}
          </td>
        </tr>`)
          .join('')
      : `<tr><td colspan="5" class="empty-cell">No listings found.</td></tr>`;

    return `
      <div class="container page-content">
        <div class="page-header">
          <h2>Listing Approvals</h2>
          <label class="sr-only" for="approval-status-filter">Filter by status</label>
          <select class="form-select" id="approval-status-filter"
            aria-label="Filter listings by status" style="width:auto;min-width:150px">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Flat</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  viewUsers(users = appState.users) {
    const rows = users.length
      ? users.map(u => `
        <tr>
          <td>
            <strong>${escHtml(u.name)}</strong>
            <br><small class="text-muted">${escHtml(u.email)}</small>
          </td>
          <td><span class="badge badge--neutral">${escHtml(u.role)}</span></td>
          <td><span class="badge badge--${u.status === 'active' ? 'success' : 'danger'}">${escHtml(u.status)}</span></td>
          <td>${u.created_at?.slice(0, 10) || '—'}</td>
          <td>
            ${u.id !== appState.currentUser.id
              ? `<button class="btn btn--sm btn--secondary" type="button"
                   data-action="${u.status === 'active' ? 'suspend' : 'activate'}"
                   data-user-id="${escHtml(u.id)}"
                   aria-label="${u.status === 'active' ? 'Suspend' : 'Activate'} ${escHtml(u.name)}">
                   ${u.status === 'active' ? '🚫 Suspend' : '✅ Activate'}
                 </button>
                 <button class="btn btn--sm btn--danger" type="button"
                   data-action="delete" data-user-id="${escHtml(u.id)}"
                   aria-label="Delete ${escHtml(u.name)}">🗑 Delete</button>`
              : '<span class="text-muted">(you)</span>'}
          </td>
        </tr>`)
          .join('')
      : `<tr><td colspan="5" class="empty-cell">No users found.</td></tr>`;

    return `
      <div class="container page-content">
        <div class="page-header"><h2>User Management</h2></div>
        <div class="card">
          <div class="filter-bar filter-bar--inline">
            <input class="form-input" id="user-search-input" type="search"
              aria-label="Search users by name or email"
              placeholder="Search by name or email…" />
            <select class="form-select" id="user-role-filter" aria-label="Filter by role">
              <option value="">All Roles</option>
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
            <select class="form-select" id="user-status-filter" aria-label="Filter by status">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody id="users-tbody">${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  bindEvents(root) {
    // ── Approve / reject / suspend / activate / delete ────────
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id     = btn.dataset.id;
      const userId = btn.dataset.userId;

      if ((action === 'approve' || action === 'reject') && id) {
        btn.disabled = true;
        const status = action === 'approve' ? 'approved' : 'rejected';
        const r = await apiFetch(`/api/listings/${id}`, { method: 'PATCH', body: { status } });
        btn.disabled = false;
        if (r.success) {
          showToast(r.message, action === 'approve' ? 'success' : 'warning');
          const lr = await apiFetch('/api/listings');
          if (lr.success) appState.listings = lr.data;
          render(Admin.viewApprovals());
        } else {
          showToast(r.message, 'error');
        }
      }

      if ((action === 'suspend' || action === 'activate') && userId) {
        btn.disabled = true;
        const status = action === 'suspend' ? 'suspended' : 'active';
        const r = await apiFetch(`/api/users/${userId}`, { method: 'PATCH', body: { status } });
        btn.disabled = false;
        if (r.success) {
          showToast(r.message, action === 'suspend' ? 'warning' : 'success');
          const ur = await apiFetch('/api/users');
          if (ur.success) appState.users = ur.data;
          render(Admin.viewUsers());
        } else {
          showToast(r.message, 'error');
        }
      }

      if (action === 'delete' && userId) {
        if (!confirm('Permanently delete this user and all their data?')) return;
        btn.disabled = true;
        const r = await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
        btn.disabled = false;
        if (r.success) {
          showToast('User deleted.', 'info');
          const ur = await apiFetch('/api/users');
          if (ur.success) appState.users = ur.data;
          render(Admin.viewUsers());
        } else {
          showToast(r.message, 'error');
        }
      }
    });

    // ── User search / filter ──────────────────────────────────
    const userSearch = root.querySelector('#user-search-input');
    if (userSearch) {
      const doFilter = () => {
        const q      = (root.querySelector('#user-search-input')?.value || '').toLowerCase();
        const role   = root.querySelector('#user-role-filter')?.value   || '';
        const status = root.querySelector('#user-status-filter')?.value || '';
        let filtered = [...appState.users];
        if (q)      filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
        if (role)   filtered = filtered.filter(u => u.role   === role);
        if (status) filtered = filtered.filter(u => u.status === status);
        const tbody = root.querySelector('#users-tbody');
        if (!tbody) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = Admin.viewUsers(filtered);
        const newTbody = tmp.querySelector('#users-tbody');
        if (newTbody) tbody.innerHTML = newTbody.innerHTML;
      };
      userSearch.addEventListener('input', doFilter);
      root.querySelector('#user-role-filter')?.addEventListener('change',   doFilter);
      root.querySelector('#user-status-filter')?.addEventListener('change', doFilter);
    }

    // ── Approval status filter ────────────────────────────────
    root.querySelector('#approval-status-filter')?.addEventListener('change', (e) => {
      const val      = e.target.value;
      const filtered = val ? appState.listings.filter(l => l.status === val) : appState.listings;
      const tbody    = root.querySelector('tbody');
      if (!tbody) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = Admin.viewApprovals(filtered);
      const newTbody = tmp.querySelector('tbody');
      if (newTbody) tbody.innerHTML = newTbody.innerHTML;
    });
  },
};
