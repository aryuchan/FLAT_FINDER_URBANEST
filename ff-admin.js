// ff-admin.js — FlatFinder Admin Module
// Views: Dashboard · Approvals · User Management
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

window.Admin = {
    viewDashboard() {
    const template = document.getElementById("admin-dashboard-template");
    if (!template) return "<p>Error: admin dashboard template missing</p>";
    const clone = template.content.cloneNode(true);
    
    const users = appState.users || [];
    const flats = appState.flats || [];
    const bookings = appState.bookings || [];
    const listings = appState.listings || [];
    const pending = listings.filter((l) => l.status === "pending").length;
    const stats = [
      { label: "Total Users", value: users.length, icon: "👥" },
      { label: "Total Flats", value: flats.length, icon: "🏢" },
      { label: "Bookings", value: bookings.length, icon: "📅" },
      { label: "Pending Reviews", value: pending, icon: "📝" },
    ];
    
    const grid = clone.querySelector("#admin-stat-grid");
    grid.innerHTML = stats.map((s) => 
      "<div class=\"stat-card card card-hover-lift\">" +
        "<p class=\"stat-card__icon stat-card__icon--lg\">" + s.icon + "</p>" +
        "<p class=\"stat-card__label\">" + s.label + "</p>" +
        "<p class=\"stat-card__value\">" + s.value + "</p>" +
      "</div>"
    ).join("");
    
    const btn = clone.querySelector("#admin-review-btn");
    if (pending > 0) btn.innerHTML = 'Review Listings <span class="badge badge--danger badge--offset">' + pending + '</span>';
    
    const div = document.createElement("div");
    div.appendChild(clone);
    return div.innerHTML;
  },

    viewApprovals(listings = appState.listings) {
    const template = document.getElementById("admin-approvals-template");
    if (!template) return "<p>Error: admin approvals template missing</p>";
    const clone = template.content.cloneNode(true);
    
    const tbody = clone.querySelector("#approvals-tbody");
    if (listings.length) {
      tbody.innerHTML = listings.map((l) => {
        const statusIcon = l.status === "approved" ? "✅ " : l.status === "rejected" ? "❌ " : "⏳ ";
        const statusClass = l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning";
        let actions = "";
        if (l.status === "pending") {
          actions = '<button class="btn btn--primary btn--sm" type="button" data-action="approve" data-id="' + l.id + '">Approve</button> ' +
                    '<button class="btn btn--danger  btn--sm" type="button" data-action="reject"  data-id="' + l.id + '">Reject</button>';
        } else if (l.reviewer_name) {
          actions = '<small class="text-muted">by ' + escHtml(l.reviewer_name) + '</small>';
        } else {
          actions = "—";
        }
        return "<tr>" +
          "<td>" +
            "<strong>🏠 " + escHtml(l.flat_title) + "</strong><br>" +
            "<small class=\"text-muted\">📍 " + escHtml(l.city) + " · 🏢 " + escHtml(l.type) + " · 💰 ₹" + Number(l.rent).toLocaleString("en-IN") + "</small>" +
          "</td>" +
          "<td>👤 " + escHtml(l.owner_name) + "</td>" +
          "<td>📅 " + (l.submitted_at?.slice(0, 10) || "—") + "</td>" +
          "<td><span class=\"badge badge--" + statusClass + "\">" + statusIcon + l.status + "</span></td>" +
          "<td>" + actions + "</td>" +
        "</tr>";
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No listings found.</td></tr>';
    }
    
    const div = document.createElement("div");
    div.appendChild(clone);
    return div.innerHTML;
  },

    viewUsers(users = appState.users) {
    const template = document.getElementById("admin-users-template");
    if (!template) return "<p>Error: admin users template missing</p>";
    const clone = template.content.cloneNode(true);
    
    const tbody = clone.querySelector("#users-tbody");
    if (users.length) {
      tbody.innerHTML = users.map((u) => {
        const statusIcon = u.status === "active" ? "🟢 " : "🔴 ";
        const statusClass = u.status === "active" ? "success" : "danger";
        let actions = "";
        if (u.id !== appState.currentUser.id) {
          const toggleAction = u.status === "active" ? "suspend" : "activate";
          const toggleLabel = u.status === "active" ? "Suspend" : "Activate";
          actions = '<button class="btn btn--sm btn--secondary" type="button" data-action="' + toggleAction + '" data-user-id="' + u.id + '">' + toggleLabel + '</button> ' +
                    '<button class="btn btn--sm btn--danger" type="button" data-action="delete" data-user-id="' + u.id + '">Delete</button>';
        } else {
          actions = '<span class="text-muted">(you)</span>';
        }
        return "<tr>" +
          "<td>" +
            "<strong>👤 " + escHtml(u.name) + "</strong><br>" +
            "<small class=\"text-muted\">✉️ " + escHtml(u.email) + "</small>" +
          "</td>" +
          "<td><span class=\"badge badge--neutral\">🛡️ " + u.role + "</span></td>" +
          "<td><span class=\"badge badge--" + statusClass + "\">" + statusIcon + u.status + "</span></td>" +
          "<td>📅 " + (u.created_at?.slice(0, 10) || "—") + "</td>" +
          "<td>" + actions + "</td>" +
        "</tr>";
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No users found.</td></tr>';
    }
    
    const div = document.createElement("div");
    div.appendChild(clone);
    return div.innerHTML;
  },

  bindEvents(root) {
    // Approve / reject / suspend / activate / delete
    root.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const userId = btn.dataset.userId;

      if ((action === "approve" || action === "reject") && id) {
        btn.disabled = true;
        const status = action === "approve" ? "approved" : "rejected";
        const r = await apiFetch(`/api/listings/${id}`, { method: "PATCH", body: { status } });
        btn.disabled = false;
        if (r.success) {
          showToast(r.message, action === "approve" ? "success" : "warning");
          const lr = await apiFetch("/api/listings");
          if (lr.success) appState.listings = lr.data;
          render(Admin.viewApprovals());
        } else showToast(r.message, "error");
      }

      if ((action === "suspend" || action === "activate") && userId) {
        btn.disabled = true;
        const status = action === "suspend" ? "suspended" : "active";
        const r = await apiFetch(`/api/users/${userId}`, { method: "PATCH", body: { status } });
        btn.disabled = false;
        if (r.success) {
          showToast(r.message, action === "suspend" ? "warning" : "success");
          const ur = await apiFetch("/api/users");
          if (ur.success) appState.users = ur.data;
          render(Admin.viewUsers());
        } else showToast(r.message, "error");
      }

      if (action === "delete" && userId) {
        showModal(`
          <div class="modal-message">
            <p class="empty-state__icon">⚠️</p>
            <h3>Confirm Deletion</h3>
            <p class="text-muted">Are you sure you want to permanently delete this user and all their associated data (flats, bookings, etc.)?</p>
            <div class="modal-btn-row">
              <button class="btn btn--neutral btn--full" type="button" onclick="closeModal()">Cancel</button>
              <button class="btn btn--danger btn--full" type="button" id="confirm-delete-btn">Yes, Delete</button>
            </div>
          </div>
        `);

        const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
        if (!confirmDeleteBtn) return;

        confirmDeleteBtn.addEventListener("click", async () => {
          const confirmBtn = document.getElementById("confirm-delete-btn");
          if (!confirmBtn) return;
          confirmBtn.disabled = true;
          confirmBtn.textContent = "Deleting...";
          
          const r = await apiFetch(`/api/users/${userId}`, { method: "DELETE" });
          closeModal();
          
          if (r.success) {
            showToast("User and data deleted.", "success");
            const ur = await apiFetch("/api/users");
            if (ur.success) appState.users = ur.data;
            render(Admin.viewUsers());
          } else {
            showToast(r.message, "error");
          }
        });
      }
    });

    // User search / filter
    const userSearch = root.querySelector("#user-search-input");
    if (userSearch) {
      const doFilter = () => {
        const q = (root.querySelector("#user-search-input")?.value || "").toLowerCase();
        const role = root.querySelector("#user-role-filter")?.value || "";
        const status = root.querySelector("#user-status-filter")?.value || "";
        let filtered = [...appState.users];
        if (q) filtered = filtered.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
        if (role) filtered = filtered.filter((u) => u.role === role);
        if (status) filtered = filtered.filter((u) => u.status === status);
        const tbody = root.querySelector("#users-tbody");
        const tmp = document.createElement("div");
        tmp.innerHTML = Admin.viewUsers(filtered);
        const newTbody = tmp.querySelector("#users-tbody");
        if (tbody && newTbody) tbody.innerHTML = newTbody.innerHTML;
      };
      root.querySelector("#user-search-input")?.addEventListener("input", doFilter);
      root.querySelector("#user-role-filter")?.addEventListener("change", doFilter);
      root.querySelector("#user-status-filter")?.addEventListener("change", doFilter);
    }

    // Approval status filter
    root.querySelector("#approval-status-filter")?.addEventListener("change", (e) => {
      const val = e.target.value;
      const filtered = val ? appState.listings.filter((l) => l.status === val) : appState.listings;
      const tbody = root.querySelector("#approvals-tbody");
      const tmp = document.createElement("div");
      tmp.innerHTML = Admin.viewApprovals(filtered);
      const newTbody = tmp.querySelector("#approvals-tbody");
      if (tbody && newTbody) tbody.innerHTML = newTbody.innerHTML;
    });
  },
};
