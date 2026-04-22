// app.js — FlatFinder SPA Router & App Controller
// Handles URL hash changes, module initialization, and global events.
// Depends on: ff-core.js, ff-auth.js, ff-tenant.js, ff-owner.js, ff-admin.js
// ─────────────────────────────────────────────────────────────────

const App = {
  async init() {
    console.log("🚀 FlatFinder Initializing…");
    window.addEventListener("hashchange", () => this.router());
    window.addEventListener("unhandledrejection", (e) => {
      console.error("Unhandled Error:", e.reason);
      showToast("A network or system error occurred. Please refresh.", "error");
    });
    document.addEventListener("click", (e) => this.handleLinkClick(e));
    await this.checkAuth();
    this.router();
    
    // Hide loader
    const loader = document.querySelector("#app-loader");
    if (loader) loader.classList.add("hidden-loader");
  },

  async checkAuth() {
    if (!Token.get()) return;
    const r = await apiFetch("/api/me");
    if (r.success) {
      appState.currentUser = r.data;
      renderNavBar();
    } else {
      Token.clear();
    }
  },

  handleLinkClick(e) {
    const link = e.target.closest("a[data-route]");
    if (link) {
      e.preventDefault();
      const route = link.getAttribute("data-route");
      window.location.hash = `#${route}`;
    }
    if (e.target.id === "logout-btn") {
      Token.clear();
      appState.currentUser = null;
      window.location.hash = "#/login";
      renderNavBar();
      showToast("Logged out successfully.", "info");
    }
  },

  async router() {
    const hash = window.location.hash || "#/";
    const path = hash.slice(1) || "/";
    const u = appState.currentUser;

    // Public Routes
    if (path === "/login") return render(Auth.viewLogin("login"));
    if (path === "/signup") return render(Auth.viewLogin("signup"));

    // Guard: Auth Required
    if (!u) {
      window.location.hash = "#/login";
      return;
    }

    // Guard: Role Redirects (Index)
    if (path === "/") {
      window.location.hash = defaultRoute();
      return;
    }

    // ── TENANT ROUTES ──
    if (path === "/tenant/dashboard" && u.role === "tenant") {
      const [br, fr] = await Promise.all([apiFetch("/api/bookings"), apiFetch("/api/flats")]);
      if (br.success) appState.bookings = br.data;
      if (fr.success) appState.flats = fr.data;
      return render(Tenant.viewDashboard());
    }
    if (path === "/tenant/search" && u.role === "tenant") {
      const r = await apiFetch("/api/flats");
      if (r.success) appState.flats = r.data;
      return render(Tenant.viewSearch());
    }
    if (path.startsWith("/tenant/flat/") && u.role === "tenant") {
      const id = path.split("/")[3];
      const r = await apiFetch(`/api/flats/${id}`);
      if (r.success) {
        appState._selectedFlat = r.data;
        return render(Tenant.viewFlatDetails(r.data));
      } else {
        return render(`<div class="container page-content"><div class="empty-state"><p>❌</p><h3>Flat Not Found</h3><p>${r.message || "Could not load flat details."}</p><a class="btn btn--primary mt-md" href="#/tenant/search" data-route="/tenant/search">Back to Search</a></div></div>`);
      }
    }
    if (path.startsWith("/tenant/booking/") && u.role === "tenant") {
      const id = path.split("/")[3];
      const r = await apiFetch(`/api/flats/${id}`);
      if (r.success) {
        appState._selectedFlat = r.data;
        return render(Tenant.viewBooking(r.data));
      } else {
        return render(`<div class="container page-content"><div class="empty-state"><h3>Not Available</h3><p>This flat is no longer available for booking.</p></div></div>`);
      }
    }

    // ── OWNER ROUTES ──
    if (path === "/owner/dashboard" && u.role === "owner") {
      const [lr, br] = await Promise.all([apiFetch("/api/listings"), apiFetch("/api/bookings")]);
      if (lr.success) appState.listings = lr.data;
      if (br.success) appState.bookings = br.data;
      return render(Owner.viewDashboard());
    }
    if (path === "/owner/add-flat" && u.role === "owner") {
      return render(Owner.viewAddFlat());
    }
    if (path === "/owner/profile" && u.role === "owner") {
      return render(Owner.viewProfile());
    }

    // ── ADMIN ROUTES ──
    if (u.role === "admin") {
      if (path === "/admin/dashboard") {
        const [ur, fr, br, lr] = await Promise.all([
          apiFetch("/api/users"),
          apiFetch("/api/flats"),
          apiFetch("/api/bookings"),
          apiFetch("/api/listings"),
        ]);
        if (ur.success) appState.users = ur.data;
        if (fr.success) appState.flats = fr.data;
        if (br.success) appState.bookings = br.data;
        if (lr.success) appState.listings = lr.data;
        return render(Admin.viewDashboard());
      }
      if (path === "/admin/approvals") {
        const r = await apiFetch("/api/listings");
        if (r.success) appState.listings = r.data;
        return render(Admin.viewApprovals());
      }
      if (path === "/admin/users") {
        const r = await apiFetch("/api/users");
        if (r.success) appState.users = r.data;
        return render(Admin.viewUsers());
      }
    }

    // Fallback: 404 or Unauthorized
    render(`
      <div class="container page-content">
        <div class="empty-state">
          <p style="font-size:3rem">🔒</p>
          <h3>Access Denied / Not Found</h3>
          <p class="text-muted">You don't have permission to view this page or it doesn't exist.</p>
          <a class="btn btn--primary" href="#" data-route="/">Go to Dashboard</a>
        </div>
      </div>`);
  },
};

// ── HELPERS ──────────────────────────────────────────────────────
function defaultRoute() {
  const u = appState.currentUser;
  if (!u) return "#/login";
  if (u.role === "admin") return "#/admin/dashboard";
  if (u.role === "owner") return "#/owner/dashboard";
  return "#/tenant/dashboard";
}

function bindEvents() {
  const root = document.getElementById("app-root");
  const path = window.location.hash.slice(1) || "/";
  const u = appState.currentUser;

  if (path.includes("login") || path.includes("signup")) Auth.bindEvents(root);
  if (path.startsWith("/tenant")) Tenant.bindEvents(root);
  if (path.startsWith("/owner")) Owner.bindEvents(root);
  if (path.startsWith("/admin")) Admin.bindEvents(root);
}

// ── BOOTSTRAP ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => App.init());
