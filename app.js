// app.js — FlatFinder Entry Point
// Router · Event Delegation · Boot
//
// Load order in HTML:
//   1. ff-core.js    (globals: API, Token, appState, apiFetch, escHtml,
//                    render, renderNavBar, showToast, showModal, closeModal)
//   2. ff-auth.js    (Auth)
//   3. ff-tenant.js  (Tenant)
//   4. ff-owner.js   (Owner)
//   5. ff-admin.js   (Admin)
//   6. app.js        (Router + Boot — this file)
// ─────────────────────────────────────────────────────────────────

// ── ROLE → DEFAULT ROUTE ─────────────────────────────────────────
function defaultRoute() {
  const r = appState.currentUser?.role;
  if (r === "admin") return "#/admin/dashboard";
  if (r === "owner") return "#/owner/dashboard";
  return "#/tenant/dashboard";
}

// ── ROUTE GUARD ──────────────────────────────────────────────────
const ROLE_ROUTES = {
  "/login":              null,
  "/signup":             null,
  "/tenant/dashboard":   ["tenant"],
  "/tenant/search":      ["tenant"],
  "/tenant/flat":        ["tenant"],
  "/tenant/booking":     ["tenant"],
  "/tenant/bookings":    ["tenant"],
  "/owner/dashboard":    ["owner"],
  "/owner/listings":     ["owner"],
  "/owner/add-flat":     ["owner"],
  "/owner/profile":      ["owner"],
  "/admin/dashboard":    ["admin"],
  "/admin/approvals":    ["admin"],
  "/admin/users":        ["admin"],
};

function guardRoute(path) {
  const base = "/" + path.split("/").filter(Boolean).slice(0, 2).join("/");
  const roles = ROLE_ROUTES[base];
  if (roles === null) {
    if (appState.currentUser && (base === "/login" || base === "/signup")) return false;
    return true;
  }
  if (!appState.currentUser) return false;  // unauthenticated
  return roles?.includes(appState.currentUser.role) ?? false;
}

// ── DATA LOADER ──────────────────────────────────────────────────
async function loadRouteData(base, param) {
  const u = appState.currentUser;
  if (!u) return;

  if (base === "/tenant/dashboard" || base === "/tenant/bookings") {
    const r = await apiFetch("/api/bookings");
    if (r.success) appState.bookings = r.data;
  }
  if (base === "/tenant/search") {
    const r = await apiFetch("/api/flats");
    if (r.success) appState.flats = r.data;
  }
  if (base === "/tenant/flat" && param) {
    const r = await apiFetch(`/api/flats/${param}`);
    appState._selectedFlat = r.success ? r.data : null;
  }
  if (base === "/tenant/booking" && param) {
    if (!appState._selectedFlat || appState._selectedFlat.id !== param) {
      const r = await apiFetch(`/api/flats/${param}`);
      appState._selectedFlat = r.success ? r.data : null;
    }
  }
  if (base === "/owner/dashboard" || base === "/owner/listings") {
    const r = await apiFetch("/api/listings");
    if (r.success) appState.listings = r.data;
  }
  if (base === "/owner/profile") {
    // Profile reads from appState.currentUser — no extra fetch needed
  }
  if (base === "/admin/dashboard") {
    const [ur, fr, br, lr] = await Promise.all([
      apiFetch("/api/users"),
      apiFetch("/api/flats?all=1"),
      apiFetch("/api/bookings"),
      apiFetch("/api/listings"),
    ]);
    if (ur.success) appState.users    = ur.data;
    if (fr.success) appState.flats    = fr.data;
    if (br.success) appState.bookings = br.data;
    if (lr.success) appState.listings = lr.data;
  }
  if (base === "/admin/approvals") {
    const r = await apiFetch("/api/listings");
    if (r.success) appState.listings = r.data;
  }
  if (base === "/admin/users") {
    const r = await apiFetch("/api/users");
    if (r.success) appState.users = r.data;
  }
}

// ── VIEW RESOLVER ────────────────────────────────────────────────
function resolveView(base, param) {
  const map = {
    "/login":             () => Auth.viewLogin("login"),
    "/signup":            () => Auth.viewLogin("signup"),
    "/tenant/dashboard":  () => Tenant.viewDashboard(),
    "/tenant/search":     () => Tenant.viewSearch(),
    "/tenant/flat":       () => Tenant.viewFlatDetails(appState._selectedFlat),
    "/tenant/booking":    () => Tenant.viewBooking(appState._selectedFlat),
    "/tenant/bookings":   () => Tenant.viewDashboard(),
    "/owner/dashboard":   () => Owner.viewDashboard(),
    "/owner/listings":    () => Owner.viewDashboard(),
    "/owner/add-flat":    () => Owner.viewAddFlat(),
    "/owner/profile":     () => Owner.viewProfile(),
    "/admin/dashboard":   () => Admin.viewDashboard(),
    "/admin/approvals":   () => Admin.viewApprovals(),
    "/admin/users":       () => Admin.viewUsers(),
  };
  return (map[base] ?? map["/login"])();
}

// ── NAVIGATE ─────────────────────────────────────────────────────
async function navigate(hash) {
  const raw  = hash.replace(/^#/, "") || "/login";
  const path = raw.startsWith("/") ? raw : "/" + raw;
  const segments = path.split("/").filter(Boolean);
  const base  = "/" + segments.slice(0, 2).join("/");
  const param = segments[2] || null;

  if (!guardRoute(path)) {
    window.location.hash = appState.currentUser ? defaultRoute() : "#/login";
    return;
  }

  document.getElementById("app-root").innerHTML =
    `<div class="container page-content" style="text-align:center;padding:4rem"><p class="text-muted">Loading…</p></div>`;

  try {
    await loadRouteData(base, param);
    render(resolveView(base, param));
  } catch (err) {
    console.error("[Router]", err);
    render(`<div class="container page-content">
      <div class="empty-state">
        <p style="font-size:2rem">⚠️</p>
        <p>Something went wrong.</p>
        <p class="text-muted">${escHtml(err.message)}</p>
        <a class="btn btn--secondary" href="#/login" data-route="/login">Go to Login</a>
      </div>
    </div>`);
  }
}

// ── EVENT DELEGATION ─────────────────────────────────────────────
function bindEvents() {
  const root = document.getElementById("app-root");
  if (!root) return;

  // Module binders
  Auth.bindEvents(root);
  Tenant.bindEvents(root);
  Owner.bindEvents(root);
  Admin.bindEvents(root);
}

// ── BOOT ─────────────────────────────────────────────────────────
window.addEventListener("hashchange", () => navigate(window.location.hash));

window.addEventListener("load", async () => {
  // Global event delegations
  document.body.addEventListener("click", async (e) => {
    // 1. SPA Navigation
    const link = e.target.closest("[data-route]");
    if (link && link.dataset.route) {
      e.preventDefault();
      window.location.hash = "#" + link.dataset.route;
      return;
    }

    // 2. Global Logout
    const logoutBtn = e.target.closest("#logout-btn");
    if (logoutBtn) {
      e.preventDefault();
      await apiFetch("/api/logout", { method: "POST" });
      Token.clear();
      Object.assign(appState, {
        currentUser: null, flats: [], bookings: [], users: [], listings: [], _selectedFlat: null,
      });
      renderNavBar();
      window.location.hash = "#/login";
      showToast("Logged out successfully.", "info");
      return;
    }
  });

  // Ping server
  try {
    await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(3000) });
  } catch (_) {
    document.getElementById("app-nav").innerHTML = "";
    document.getElementById("app-root").innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card" style="text-align:center">
          <div style="font-size:3rem;margin-bottom:.75rem">⚠️</div>
          <h2 style="color:#dc2626;margin-bottom:.5rem">Server Not Running</h2>
          <p style="color:#64748b;margin-bottom:1.25rem">
            FlatFinder needs its backend server to connect to MySQL.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:.75rem;padding:1.25rem;text-align:left;font-size:.875rem;line-height:2">
            <strong>▶ How to start (Windows):</strong><br>
            &nbsp;&nbsp;Double-click <code style="background:#e2e8f0;padding:.15rem .4rem;border-radius:.3rem">start.bat</code> in your project folder<br><br>
            <strong>▶ Or in terminal:</strong><br>
            &nbsp;&nbsp;<code style="background:#e2e8f0;padding:.15rem .4rem;border-radius:.3rem">node server.js</code><br><br>
            <strong>▶ Then refresh this page.</strong>
          </div>
          <button class="btn btn--primary" style="margin-top:1.5rem;width:100%" onclick="location.reload()">
            🔄 Retry Connection
          </button>
        </div>
      </div>`;
    return;
  }

  // Restore session
  const r = await apiFetch("/api/me");
  if (r.success && r.data) {
    appState.currentUser = r.data;
    renderNavBar();
    await navigate(window.location.hash || defaultRoute());
  } else {
    const h = window.location.hash || "#/login";
    await navigate(
      h.startsWith("#/login") || h.startsWith("#/signup") ? h : "#/login",
    );
  }
});
