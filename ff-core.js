// ff-core.js — FlatFinder Core Module
// Config · Token · State · API · Security · Render · Nav · UI Utilities
// Loaded first. All other modules depend on globals exposed here.
// ─────────────────────────────────────────────────────────────────

// ── CONFIG ──────────────────────────────────────────────────────
window.API = (() => {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "";
  return ""; // Same host in prod (Render/Railway)
})();

// ── TOKEN ────────────────────────────────────────────────────────
window.Token = {
  get: () => localStorage.getItem("ff_jwt"),
  save: (t) => t && localStorage.setItem("ff_jwt", t),
  clear: () => localStorage.removeItem("ff_jwt"),
};

// ── GLOBAL STATE ─────────────────────────────────────────────────
window.appState = {
  currentUser: null,
  flats: [],
  bookings: [],
  users: [],
  listings: [],
  _selectedFlat: null,
};

// ── API CLIENT ───────────────────────────────────────────────────
window.apiFetch = async function (path, options = {}) {
  try {
    const token = Token.get();
    const isFormData = options.body instanceof FormData;
    const init = {
      method: options.method || "GET",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    };
    if (options.body) {
      init.body = isFormData
        ? options.body
        : typeof options.body === "object"
          ? JSON.stringify(options.body)
          : options.body;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    init.signal = controller.signal;

    const res = await fetch(`${API}${path}`, init);
    clearTimeout(timeoutId);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return {
        success: false,
        data: null,
        message: `Server error ${res.status}.`,
      };
    }

    const json = await res.json();
    // Professional Auto-Save Token
    if (json?.data?.token) Token.save(json.data.token);
    return json;
  } catch (err) {
    console.error("[apiFetch]", path, err);
    return {
      success: false,
      data: null,
      message: "Network error. Please check your connection.",
    };
  }
}

// ── SECURITY ─────────────────────────────────────────────────────
window.escHtml = function (str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── RENDER ───────────────────────────────────────────────────────
window.render = function (html) {
  const root = document.getElementById("app-root");
  if (!root) return;
  root.innerHTML = html;
  bindEvents();
}

window.renderNavBar = function () {
  const nav = document.getElementById("app-nav");
  if (!nav) return;
  const u = appState.currentUser;
  if (!u) {
    nav.innerHTML = "";
    return;
  }

  const roleLinks = {
    tenant: [
      { label: "🏠 Dashboard", route: "/tenant/dashboard" },
      { label: "🔍 Search Flats", route: "/tenant/search" },
      { label: "📋 My Bookings", route: "/tenant/bookings" },
    ],
    owner: [
      { label: "🏠 Dashboard", route: "/owner/dashboard" },
      { label: "➕ Add Flat", route: "/owner/add-flat" },
      { label: "👤 My Profile", route: "/owner/profile" },
    ],
    admin: [
      { label: "🏠 Dashboard", route: "/admin/dashboard" },
      { label: "✅ Approvals", route: "/admin/approvals" },
      { label: "👥 Users", route: "/admin/users" },
    ],
  };

  const badgeClass = {
    admin: "badge--danger",
    owner: "badge--warning",
    tenant: "badge--success",
  };
  const links = (roleLinks[u.role] || [])
    .map(
      (l) =>
        `<a class="nav__link" href="#${l.route}" data-route="${l.route}">${l.label}</a>`,
    )
    .join("");
  const theme = localStorage.getItem("ff_theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);

  nav.innerHTML = `
    <div class="container nav__container">
      <a class="nav__logo" href="#" data-route="/">🏠 FlatFinder</a>
      <div class="nav__links">
        ${links}
        <span class="badge ${badgeClass[u.role]}">${u.role}</span>
        <button class="nav__icon-btn" id="btn-theme" title="Toggle Theme">${theme === "dark" ? "☀️" : "🌙"}</button>
        <button class="btn btn--sm btn--outline" id="btn-logout">Logout</button>
      </div>
    </div>`;

  nav.querySelector("#btn-theme").onclick = () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ff_theme", next);
    renderNavBar();
  };

  nav.querySelector("#btn-logout").onclick = () => {
    appState.currentUser = null;
    Token.clear();
    renderNavBar();
    window.location.hash = "#/login";
  };
}

// ── NAVIGATION HELPERS ───────────────────────────────────────────
window.defaultRoute = function () {
  const u = appState.currentUser;
  if (!u) return "#/login";
  if (u.role === "admin") return "#/admin/dashboard";
  if (u.role === "owner") return "#/owner/dashboard";
  return "#/tenant/dashboard";
}

window.bindEvents = function () {
  const root = document.getElementById("app-root");
  if (!root) return;
  const path = window.location.hash.slice(1) || "/";
  const u = appState.currentUser;

  if (path.includes("login") || path.includes("signup")) Auth.bindEvents(root);
  if (path.startsWith("/tenant")) Tenant.bindEvents(root);
  if (path.startsWith("/owner")) Owner.bindEvents(root);
  if (path.startsWith("/admin")) Admin.bindEvents(root);
}

// ── UI UTILITIES ──────────────────────────────────────────────────
window.showToast = function (message, type = "info") {
  const container = document.getElementById("app-toast");
  if (!container) return;
  
  // Limit to 3 toasts max
  if (container.children.length >= 3) container.firstChild.remove();

  const cls = {
    success: "toast--success",
    error: "toast--error",
    warning: "toast--warning",
    info: "toast--info",
  };
  const div = document.createElement("div");
  div.className = `toast ${cls[type] || "toast--info"}`;
  div.innerHTML = `
    <span class="toast__message">${escHtml(message)}</span>
    <button class="toast__close" onclick="this.parentElement.remove()" aria-label="Dismiss">×</button>
  `;
  container.appendChild(div);
  
  // Auto-remove with fade-out
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translateX(20px)";
    setTimeout(() => div.remove(), 300);
  }, 4000);
}

window.showModal = function (html) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <button class="modal__close" onclick="closeModal()" aria-label="Close modal">×</button>
      ${html}
    </div>`;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById("app-modal")?.appendChild(overlay);
}

window.closeModal = function () {
  document
    .getElementById("app-modal")
    ?.querySelector(".modal-overlay")
    ?.remove();
}
