// app.js — FlatFinder Entry Point
// Router · Boot · Auth Guard
// ─────────────────────────────────────────────────────────────────

const ROLE_ROUTES = {
  "/login": null,
  "/signup": null,
  "/tenant/dashboard": ["tenant"],
  "/tenant/search": ["tenant"],
  "/tenant/flat": ["tenant"],
  "/tenant/booking": ["tenant"],
  "/tenant/bookings": ["tenant"],
  "/owner/dashboard": ["owner"],
  "/owner/listings": ["owner"],
  "/owner/add-flat": ["owner"],
  "/owner/profile": ["owner"],
  "/admin/dashboard": ["admin"],
  "/admin/approvals": ["admin"],
  "/admin/users": ["admin"],
};

function guardRoute(path) {
  const segments = path.split("/").filter(Boolean);
  const base = "/" + segments.slice(0, 2).join("/");
  const roles = ROLE_ROUTES[base];
  if (roles === null) return true;
  if (!appState.currentUser) return false;
  return roles?.includes(appState.currentUser.role) ?? false;
}

async function loadRouteData(base, param) {
  if (!appState.currentUser) return;
  if (base === "/tenant/dashboard" || base === "/tenant/bookings") {
    const r = await apiFetch("/api/bookings");
    if (r.success) appState.bookings = r.data;
  }
  if (base === "/tenant/search") {
    const r = await apiFetch("/api/flats");
    if (r.success) { appState.flats = r.data; appState.flatsMeta = r.meta; }
  }
  if (base === "/tenant/flat" && param) {
    const r = await apiFetch(`/api/flats/${param}`);
    appState._selectedFlat = r.success ? r.data : null;
  }
  if (base === "/tenant/booking" && param) {
    const r = await apiFetch(`/api/flats/${param}`);
    appState._selectedFlat = r.success ? r.data : null;
  }
  if (base === "/owner/dashboard" || base === "/owner/listings") {
    const [lr, br] = await Promise.all([apiFetch("/api/listings"), apiFetch("/api/bookings")]);
    if (lr.success) appState.listings = lr.data;
    if (br.success) appState.bookings = br.data;
  }
  if (base === "/admin/dashboard") {
    const [ur, fr, br, lr] = await Promise.all([apiFetch("/api/users"), apiFetch("/api/flats"), apiFetch("/api/bookings"), apiFetch("/api/listings")]);
    if (ur.success) appState.users = ur.data;
    if (fr.success) appState.flats = fr.data;
    if (br.success) appState.bookings = br.data;
    if (lr.success) appState.listings = lr.data;
  }
}

function resolveView(base, param) {
  const map = {
    "/login": () => Auth.viewLogin("login"),
    "/signup": () => Auth.viewLogin("signup"),
    "/tenant/dashboard": () => Tenant.viewDashboard(),
    "/tenant/search": () => Tenant.viewSearch(),
    "/tenant/flat": () => Tenant.viewFlatDetails(appState._selectedFlat),
    "/tenant/booking": () => Tenant.viewBooking(appState._selectedFlat),
    "/tenant/bookings": () => Tenant.viewDashboard(),
    "/owner/dashboard": () => Owner.viewDashboard(),
    "/owner/listings": () => Owner.viewDashboard(),
    "/owner/add-flat": () => Owner.viewAddFlat(),
    "/owner/profile": () => Owner.viewProfile(),
    "/admin/dashboard": () => Admin.viewDashboard(),
    "/admin/approvals": () => Admin.viewApprovals(),
    "/admin/users": () => Admin.viewUsers(),
  };
  return (map[base] ?? map["/login"])();
}

let _navigating = false;
async function navigate(hash) {
  if (_navigating) return;
  _navigating = true;
  try {
    const raw = (hash || "").replace(/^#/, "") || "/login";
    const path = raw.startsWith("/") ? raw : "/" + raw;
    const segments = path.split("/").filter(Boolean);
    const base = "/" + segments.slice(0, 2).join("/");
    const param = segments[2] || null;

    if (!guardRoute(path)) {
      window.location.hash = appState.currentUser ? defaultRoute() : "#/login";
      return;
    }

    await loadRouteData(base, param);
    render(resolveView(base, param));
    renderNavBar();
  } catch (err) {
    console.error("[Router]", err);
    render(`<div class="container page-content"><div class="empty-state"><p>Something went wrong.</p><a class="btn btn--secondary" href="#/login">Go to Login</a></div></div>`);
  } finally {
    _navigating = false;
  }
}

window.addEventListener("hashchange", () => navigate(window.location.hash));

window.addEventListener("load", async () => {
  // Clear any existing Service Workers to prevent stale code caching
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (let reg of regs) await reg.unregister();
  }

  const r = await apiFetch('/api/me').catch(() => ({ success: false }));
  if (r.success && r.data) {
    appState.currentUser = r.data;
    renderNavBar();
    const h = window.location.hash;
    navigate(h && h !== "#" && h !== "#/" ? h : defaultRoute());
  } else {
    const h = window.location.hash || "#/login";
    navigate(h.startsWith("#/login") || h.startsWith("#/signup") ? h : "#/login");
  }
});
