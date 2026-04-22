// ff-admin.js — Ultimate Global Control Terminal (v18.0) - Upgraded UI
const Admin = {
  viewDashboard() {
    const flats = appState.flats || [];

    return `
      <div class="container page-content">
        <div class="page-header">
          <h2>Global Inventory</h2>
          <a class="btn btn--secondary btn--sm" href="#/admin/users" data-route="/admin/users">👥 System Users</a>
        </div>

        <div class="stat-grid mt-lg">
          <div class="stat-card card">
            <p class="stat-card__label">Total Properties</p>
            <p class="stat-card__value">${flats.length}</p>
          </div>
          <div class="stat-card card" style="border-top: 4px solid var(--color-success)">
            <p class="stat-card__label">Active Listings</p>
            <p class="stat-card__value">${flats.filter((f) => f.available).length}</p>
          </div>
          <div class="stat-card card" style="border-top: 4px solid var(--color-danger)">
            <p class="stat-card__label">Hidden/Pending</p>
            <p class="stat-card__value">${flats.filter((f) => !f.available).length}</p>
          </div>
        </div>

        <div class="card mt-xl">
          <h3 class="card-title">Property Audit Log</h3>
          <div class="table-wrap" id="admin-table-container">
            ${
              flats.length
                ? `
              <table class="table">
                <thead><tr><th>Property</th><th>Location</th><th>Visibility</th><th>Owner</th><th>Actions</th></tr></thead>
                <tbody>
                  ${flats
                    .map(
                      (f) => `
                    <tr data-id="${escHtml(f.id)}">
                      <td><b>${escHtml(f.title)}</b><br><small class="text-muted">${escHtml(f.type)}</small></td>
                      <td>${escHtml(f.city)}</td>
                      <td>
                        <span class="badge ${f.available ? "badge--success" : "badge--neutral"} btn-toggle-flat" style="cursor:pointer" data-avail="${f.available ? "1" : "0"}">
                          ${f.available ? "Public" : "Hidden"}
                        </span>
                      </td>
                      <td><small>${escHtml(f.owner_id.slice(0, 8))}...</small></td>
                      <td><button class="btn btn--danger btn--sm btn-del">Delete</button></td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
                : '<div class="empty-state"><h3>Inventory Empty</h3><p class="text-muted">No properties have been listed yet.</p></div>'
            }
          </div>
        </div>
      </div>
    `;
  },

  viewApprovals() {
    return this.viewDashboard();
  },

  viewUsers() {
    const users = appState.users || [];

    return `
      <div class="container page-content">
        <div class="page-header">
          <h2>User Management</h2>
          <a class="btn btn--secondary btn--sm" href="#/admin/dashboard" data-route="/admin/dashboard">← Back to Terminal</a>
        </div>

        <div class="card mt-lg">
          <h3 class="card-title">System Participants</h3>
          <div class="table-wrap" id="admin-user-container">
            ${
              users.length
                ? `
              <table class="table">
                <thead><tr><th>Identity</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${users
                    .map(
                      (u) => `
                    <tr data-id="${escHtml(u.id)}">
                      <td><b>${escHtml(u.name)}</b><br><small class="text-muted">${escHtml(u.email)}</small></td>
                      <td><span class="badge badge--neutral">${escHtml(u.role)}</span></td>
                      <td><span class="badge badge--${u.status === "suspended" ? "danger" : "success"}">${escHtml(u.status || "active")}</span></td>
                      <td>
                        ${
                          u.role !== "admin"
                            ? `<button class="btn btn--${u.status === "suspended" ? "success" : "danger"} btn--sm btn-suspend">${u.status === "suspended" ? "Restore" : "Suspend"}</button>`
                            : '<small class="text-muted">Immutable</small>'
                        }
                      </td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
                : '<p class="text-muted">No users found in database.</p>'
            }
          </div>
        </div>
      </div>
    `;
  },

  bindEvents(root) {
    // Hardened Global Click Handlers
    root.addEventListener("click", async (e) => {
      const btnDel = e.target.closest(".btn-del");
      if (btnDel) {
        if (!confirm("This will permanently delete the listing and all associated images/bookings. Proceed?")) return;
        const id = e.target.closest("tr").dataset.id;
        btnDel.disabled = true;
        btnDel.textContent = "Deleting...";
        const res = await apiFetch(`/api/flats/${id}`, { method: "DELETE" });
        btnDel.disabled = false;
        if (res.success) {
          showToast("Property purged", "success");
          const r = await apiFetch("/api/flats");
          if (r.success) appState.flats = r.data;
          render(Admin.viewDashboard());
        } else {
          showToast(res.message, "error");
        }
        return;
      }

      const btnToggle = e.target.closest(".btn-toggle-flat");
      if (btnToggle) {
        const id = e.target.closest("tr").dataset.id;
        const isAvail = btnToggle.dataset.avail === "1";
        btnToggle.style.opacity = 0.5;
        const res = await apiFetch(`/api/flats/${id}`, {
          method: "PATCH",
          body: { available: !isAvail },
        });
        btnToggle.style.opacity = 1;
        if (res.success) {
          showToast("Visibility updated", "success");
          const r = await apiFetch("/api/flats");
          if (r.success) appState.flats = r.data;
          render(Admin.viewDashboard());
        } else {
          showToast(res.message, "error");
        }
        return;
      }

      const btnSuspend = e.target.closest(".btn-suspend");
      if (btnSuspend) {
        const id = e.target.closest("tr").dataset.id;
        const action = e.target.textContent;
        const newStatus = action === "Suspend" ? "suspended" : "active";
        if (!confirm(`Mark this user as ${newStatus}?`)) return;

        btnSuspend.disabled = true;
        const res = await apiFetch(`/api/users/${id}`, {
          method: "PATCH",
          body: { status: newStatus },
        });
        if (res.success) {
          showToast(`User account ${newStatus}`, "success");
          const r = await apiFetch("/api/users");
          if (r.success) appState.users = r.data;
          render(Admin.viewUsers());
        } else {
          btnSuspend.disabled = false;
          showToast(res.message, "error");
        }
        return;
      }
    });
  },
};
