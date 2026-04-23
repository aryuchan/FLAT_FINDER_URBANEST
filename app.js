// app.js — FlatFinder SPA Router & App Controller
// Handles URL hash changes, module initialization, and global events.
// Depends on: ff-core.js, ff-auth.js, ff-tenant.js, ff-owner.js, ff-admin.js
// ─────────────────────────────────────────────────────────────────

window.App = {
  async init() {
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
    try {
      const r = await apiFetch("/api/me");
      if (r.success) {
        appState.currentUser = r.data;
        renderNavBar();
      } else {
        Token.clear();
      }
    } catch (e) {
      Token.clear();
    }
  },

  handleLinkClick(e) {
    // Preserve native browser behavior for new-tab/window gestures.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const routeTarget = e.target.closest("[data-route]");
    if (routeTarget) {
      if (routeTarget.hasAttribute("disabled") || routeTarget.getAttribute("aria-disabled") === "true") return;
      const route = routeTarget.getAttribute("data-route");
      if (!route) return;
      e.preventDefault();
      // Close mobile nav drawer on any in-app navigation
      document.getElementById("nav-links")?.classList.remove("nav__links--open");
      document.getElementById("nav-hamburger")?.setAttribute("aria-expanded", "false");
      const nextHash = `#${route}`;
      if (window.location.hash === nextHash) {
        this.router();
      } else {
        window.location.hash = nextHash;
      }
    }
  },

  async router() {
    try {
      window.scrollTo(0, 0); // Professional UX
      const hash = window.location.hash || "#/";
      const path = hash.slice(1) || "/";
      const u = appState.currentUser;

      // Guard: Redirect logged-in users away from Auth pages
      if (u && (path === "/login" || path === "/signup")) {
        window.location.hash = defaultRoute();
        return;
      }

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
      if ((path === "/tenant/dashboard" || path === "/tenant/bookings") && u.role === "tenant") {
        const [br, fr] = await Promise.all([apiFetch("/api/bookings"), apiFetch("/api/flats")]);
        appState.bookings = br.success ? (br.data || []) : [];
        appState.flats = fr.success ? (fr.data || []) : [];
        return render(Tenant.viewDashboard());
      }
      if (path === "/tenant/search" && u.role === "tenant") {
        const r = await apiFetch("/api/flats");
        appState.flats = r.success ? (r.data || []) : [];
        return render(Tenant.viewSearch());
      }
      if (path.startsWith("/tenant/flat/") && u.role === "tenant") {
        const id = path.split("/")[3];
        const r = await apiFetch(`/api/flats/${id}`);
        if (r.success && r.data) {
          appState._selectedFlat = r.data;
          return render(Tenant.viewFlatDetails(r.data));
        } else {
          return render(`<div class="container page-content"><div class="empty-state"><p class="empty-state__icon">!</p><h3>Flat Not Found</h3><p>${r.message || "Could not load flat details."}</p><a class="btn btn--primary mt-md" href="#/tenant/search" data-route="/tenant/search">Back to Search</a></div></div>`);
        }
      }
      if (path.startsWith("/tenant/booking/") && u.role === "tenant") {
        const id = path.split("/")[3];
        const r = await apiFetch(`/api/flats/${id}`);
        if (r.success && r.data) {
          appState._selectedFlat = r.data;
          return render(Tenant.viewBooking(r.data));
        } else {
          return render(`<div class="container page-content"><div class="empty-state"><h3>Not Available</h3><p>This flat is no longer available for booking.</p></div></div>`);
        }
      }

      // ── OWNER ROUTES ──
      if (path === "/owner/dashboard" && u.role === "owner") {
        const [lr, br] = await Promise.all([apiFetch("/api/listings"), apiFetch("/api/bookings")]);
        appState.listings = lr.success ? (lr.data || []) : [];
        appState.bookings = br.success ? (br.data || []) : [];
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
          appState.users = ur.success ? (ur.data || []) : [];
          appState.flats = fr.success ? (fr.data || []) : [];
          appState.bookings = br.success ? (br.data || []) : [];
          appState.listings = lr.success ? (lr.data || []) : [];
          return render(Admin.viewDashboard());
        }
        if (path === "/admin/approvals") {
          const r = await apiFetch("/api/listings");
          appState.listings = r.success ? (r.data || []) : [];
          return render(Admin.viewApprovals());
        }
        if (path === "/admin/users") {
          const r = await apiFetch("/api/users");
          appState.users = r.success ? (r.data || []) : [];
          return render(Admin.viewUsers());
        }
      }

      // Fallback: 404 or Unauthorized
      render(`
        <div class="container page-content">
          <div class="empty-state">
            <p class="empty-state__icon">!</p>
            <h3>Access Denied / Not Found</h3>
            <p class="text-muted">You don't have permission to view this page or it doesn't exist.</p>
            <a class="btn btn--primary" href="#" data-route="/">Go to Dashboard</a>
          </div>
        </div>`);
    } catch (err) {
      console.error("[Router Error]", err);
      showToast("A routing error occurred. Returning to safety...", "error");
      window.location.hash = "#/";
    }
  },
};


// ── BOOTSTRAP ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => App.init());
