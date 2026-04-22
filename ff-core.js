// ff-core.js — FlatFinder Core Module
// Config · Token · State · API · Security · Render · Nav · UI Utilities
// Loaded first. All other modules depend on globals exposed here.
// ─────────────────────────────────────────────────────────────────

// ── CONFIG ──────────────────────────────────────────────────────
const API = "";

// ── TOKEN ────────────────────────────────────────────────────────
const Token = {
  get: () => localStorage.getItem("ff_jwt"),
  save: (t) => t && localStorage.setItem("ff_jwt", t),
  clear: () => localStorage.removeItem("ff_jwt"),
};

// ── GLOBAL STATE ─────────────────────────────────────────────────
const appState = {
  currentUser: null,
  flats: [],
  bookings: [],
  users: [],
  listings: [],
  _selectedFlat: null,
};

// ── API CLIENT ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
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
        message: `Server error ${res.status}. Is 'node server.js' running?`,
      };
    }

    const json = await res.json();
    if (json?.data?.token) Token.save(json.data.token);
    return json;
  } catch (err) {
    console.error("[apiFetch]", path, err);
    return {
      success: false,
      data: null,
      message: `Cannot reach server. Run start.bat or "node server.js" first.`,
    };
  }
}

// ── SECURITY ─────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── RENDER ───────────────────────────────────────────────────────
function render(html) {
  const root = document.getElementById("app-root");
  if (!root) return;
  root.innerHTML = html;
  bindEvents();
}

function renderNavBar() {
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
  nav.innerHTML = `
    <div class="container nav__container">
      <a class="nav__logo" href="#" data-route="/">🏠 FlatFinder</a>
      <div class="nav__links">
        ${links}
        <span class="badge ${badgeClass[u.role]}">${u.role}</span>
        <button class="btn btn--sm btn--outline" id="logout-btn">Logout</button>
      </div>
    </div>`;
}

// ── NAVIGATION HELPERS ───────────────────────────────────────────
function defaultRoute() {
  const u = appState.currentUser;
  if (!u) return "#/login";
  if (u.role === "admin") return "#/admin/dashboard";
  if (u.role === "owner") return "#/owner/dashboard";
  return "#/tenant/dashboard";
}

function bindEvents() {
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
function showToast(message, type = "info") {
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

function showModal(html) {
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

function closeModal() {
  document
    .getElementById("app-modal")
    ?.querySelector(".modal-overlay")
    ?.remove();
}
