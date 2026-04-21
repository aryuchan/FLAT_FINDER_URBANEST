// app.js — FlatFinder Entry Point (v4)
// Professional Router · State Synchronization · Boot
// ─────────────────────────────────────────────────────────────────

const ROLE_ROUTES = {
  "/login": null, "/signup": null,
  "/tenant/dashboard": ["tenant"], "/tenant/search": ["tenant"], "/tenant/flat": ["tenant"],
  "/tenant/booking": ["tenant"], "/tenant/bookings": ["tenant"],
  "/owner/dashboard": ["owner"], "/owner/listings": ["owner"], "/owner/add-flat": ["owner"], "/owner/profile": ["owner"],
  "/admin/dashboard": ["admin"], "/admin/approvals": ["admin"], "/admin/users": ["admin"],
};

function guardRoute(path) {
  const base = "/" + path.split("/").filter(Boolean).slice(0, 2).join("/");
  const roles = ROLE_ROUTES[base];
  if (roles === null) return true;
  if (!appState.currentUser) return false;
  return roles?.includes(appState.currentUser.role) ?? false;
}

async function loadRouteData(base, param) {
  if (!appState.currentUser) return;
  try {
    if (base === "/tenant/dashboard" || base === "/tenant/bookings") {
      const r = await apiFetch("/api/bookings");
      if (r.success) appState.bookings = r.data;
    }
    if (base === "/tenant/search") {
      const r = await apiFetch("/api/flats");
      if (r.success) { appState.flats = r.data; appState.flatsMeta = r.meta; }
    }
    if (base === "/tenant/flat" || base === "/tenant/booking") {
      if (param) {
        const r = await apiFetch(`/api/flats/${param}`);
        if (r.success) appState._selectedFlat = r.data;
      }
    }
    if (base === "/owner/dashboard" || base === "/owner/listings") {
      const [lr, br] = await Promise.all([apiFetch("/api/listings"), apiFetch("/api/bookings")]);
      if (lr.success) appState.listings = lr.data;
      if (br.success) appState.bookings = br.data;
    }
    if (base === "/admin/dashboard") {
      const [ur, fr, br, lr] = await Promise.all([apiFetch("/api/users"), apiFetch("/api/flats"), apiFetch("/api/bookings"), apiFetch("/api/listings")]);
      if (ur.success) { appState.users = ur.data; appState.flats = fr.data; appState.bookings = br.data; appState.listings = lr.data; }
    }
  } catch (err) { console.error("[Data Load Error]", err); }
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

async function navigate(hash) {
  const raw = (hash || "").replace(/^#/, "") || "/login";
  const path = raw.startsWith("/") ? raw : "/" + raw;
  const segments = path.split("/").filter(Boolean);
  const base = "/" + segments.slice(0, 2).join("/");
  const param = segments[2] || null;

  if (!guardRoute(path)) {
    window.location.hash = appState.currentUser ? defaultRoute() : "#/login";
    return;
  }

  // Show a sleek skeleton while loading
  document.getElementById("app-root").innerHTML = `
    <div class="container page-content">
      <div class="skeleton" style="height: 40px; width: 300px; margin-bottom: 2rem;"></div>
      <div class="dashboard-grid">
        <div class="skeleton glass" style="height: 250px;"></div>
        <div class="skeleton glass" style="height: 250px;"></div>
        <div class="skeleton glass" style="height: 250px;"></div>
      </div>
    </div>`;

  await loadRouteData(base, param);
  render(resolveView(base, param));
  renderNavBar();
}

window.addEventListener("hashchange", () => navigate(window.location.hash));

window.addEventListener("load", async () => {
  // 1. Force clear Service Workers to ensure fresh code
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (let reg of regs) await reg.unregister();
  }

  // 2. Initial Auth Check
  const r = await apiFetch('/api/me').catch(() => ({ success: false }));
  if (r.success && r.data) {
    appState.currentUser = r.data;
  }
  
  // 3. Initial Navigation
  renderNavBar();
  const h = window.location.hash;
  if (!appState.currentUser) {
    navigate(h.startsWith("#/login") || h.startsWith("#/signup") ? h : "#/login");
  } else {
    navigate(h && h !== "#" && h !== "#/" ? h : defaultRoute());
  }
});
