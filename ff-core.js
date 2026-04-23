// ff-core.js — FlatFinder Core Module
// Config · Token · State · API · Security · Render · Nav · UI Utilities
// Loaded first. All other modules depend on globals exposed here.
// ─────────────────────────────────────────────────────────────────

// ── THEME: Apply saved preference immediately to prevent light-mode flash ──
;(function () {
  const saved = localStorage.getItem("ff_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

// ── CONFIG ──────────────────────────────────────────────────────
window.API = (() => {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "";
  return ""; // Same host in prod (Render/Railway)
})();

// ── TOKEN ────────────────────────────────────────────────────────
window.Token = {
  get:   ()  => localStorage.getItem("ff_jwt"),
  save:  (t) => t && localStorage.setItem("ff_jwt", t),
  clear: ()  => localStorage.removeItem("ff_jwt"),
};

// ── GLOBAL STATE ─────────────────────────────────────────────────
window.appState = {
  currentUser:   null,
  flats:         [],
  bookings:      [],
  users:         [],
  listings:      [],
  _selectedFlat: null,
};

// ── API CLIENT ───────────────────────────────────────────────────
window.apiFetch = async function (path, options = {}) {
  showProgress();
  try {
    const token      = Token.get();
    const isFormData = options.body instanceof FormData;
    const init = {
      method: options.method || "GET",
      credentials: "include",
      headers: {
        ...(token      ? { Authorization: `Bearer ${token}` } : {}),
        ...(isFormData ? {}                                   : { "Content-Type": "application/json" }),
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
    const timeoutId  = setTimeout(() => controller.abort(), 30000);
    init.signal      = controller.signal;

    const res = await fetch(`${API}${path}`, init);
    clearTimeout(timeoutId);

    if (res.status === 401) {
      Token.clear();
      if (!window.location.hash.includes("login")) window.location.hash = "#/login";
      return { success: false, data: null, message: "Session expired. Please login again." };
    }

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      console.error("[apiFetch] Non-JSON response:", text);
      return { success: false, data: null, message: `System error (${res.status}).` };
    }

    const json = await res.json();
    if (json?.data?.token) Token.save(json.data.token);
    return json;
  } catch (err) {
    if (err.name === "AbortError") {
      return { success: false, data: null, message: "Request timed out. Please try again." };
    }
    console.error("[apiFetch]", path, err);
    return { success: false, data: null, message: "Connection lost. Please check your internet." };
  } finally {
    hideProgress();
  }
};

// ── SECURITY ─────────────────────────────────────────────────────
window.escHtml = function (str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// ── RENDER ───────────────────────────────────────────────────────
window.render = function (html) {
  const root = document.getElementById("app-root");
  if (!root) return;
  root.innerHTML = html;
  bindEvents();
};

let _navDismissController = null;

// ── NAV BAR ──────────────────────────────────────────────────────
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
      { label: "Dashboard", route: "/tenant/dashboard" },
      { label: "Search Flats", route: "/tenant/search" },
      { label: "My Bookings", route: "/tenant/bookings" },
    ],
    owner: [
      { label: "Dashboard", route: "/owner/dashboard" },
      { label: "Add Flat", route: "/owner/add-flat" },
      { label: "My Profile", route: "/owner/profile" },
    ],
    admin: [
      { label: "Dashboard", route: "/admin/dashboard" },
      { label: "Approvals", route: "/admin/approvals" },
      { label: "Users", route: "/admin/users" },
    ],
  };

  const badgeClass = {
    admin:  "badge--danger",
    owner:  "badge--warning",
    tenant: "badge--success",
  };

  const links = (roleLinks[u.role] || [])
    .map((l) => `<a class="nav__link" href="#${l.route}" data-route="${l.route}">${l.label}</a>`)
    .join("");

  const theme = localStorage.getItem("ff_theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);

  nav.innerHTML = `
    <div class="container nav__container">
      <a class="nav__logo" href="#" data-route="/">FlatFinder</a>

      <!-- Mobile hamburger — CSS hides this on desktop (>767px) -->
      <button class="nav__hamburger" id="nav-hamburger" type="button"
              aria-expanded="false"
              aria-controls="nav-links"
              aria-label="Toggle navigation menu">
        <span></span><span></span><span></span>
      </button>

      <div class="nav__links" id="nav-links">
        ${links}
        <span class="badge ${badgeClass[u.role] || "badge--neutral"}">${escHtml(u.role)}</span>
        <button class="nav__icon-btn" id="btn-theme" type="button"
                title="Toggle Theme"
                aria-label="Toggle color theme">${theme === "dark" ? "Light" : "Dark"}</button>
        <button class="btn btn--sm btn--outline" id="btn-logout" type="button">Logout</button>
      </div>
    </div>`;

  // ── Mobile: hamburger ↔ drawer toggle ────────────────────────
  const hamburger = nav.querySelector("#nav-hamburger");
  const navLinks  = nav.querySelector("#nav-links");
  const closeMobileNav = () => {
    navLinks.classList.remove("nav__links--open");
    hamburger.setAttribute("aria-expanded", "false");
  };

  hamburger.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("nav__links--open");
    hamburger.setAttribute("aria-expanded", String(isOpen));
  });

  // Auto-close drawer when a nav action is tapped
  navLinks.addEventListener("click", (e) => {
    if (
      e.target.closest(".nav__link") ||
      e.target.closest("#btn-logout") ||
      e.target.closest("#btn-theme")
    ) {
      closeMobileNav();
    }
  });

  _navDismissController?.abort();
  _navDismissController = new AbortController();
  const { signal } = _navDismissController;

  document.addEventListener("click", (e) => {
    if (window.innerWidth > 767) return;
    if (!navLinks.classList.contains("nav__links--open")) return;
    if (!nav.contains(e.target)) closeMobileNav();
  }, { signal });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileNav();
  }, { signal });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 767) closeMobileNav();
  }, { signal });

  // ── Theme toggle ─────────────────────────────────────────────
  nav.querySelector("#btn-theme").onclick = () => {
    const cur  = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ff_theme", next);
    renderNavBar();
  };

  // ── Logout ───────────────────────────────────────────────────
  nav.querySelector("#btn-logout").onclick = () => {
    appState.currentUser = null;
    Token.clear();
    renderNavBar();
    window.location.hash = "#/login";
  };
};

// ── NAVIGATION HELPERS ───────────────────────────────────────────
window.defaultRoute = function () {
  const u = appState.currentUser;
  if (!u)                 return "#/login";
  if (u.role === "admin") return "#/admin/dashboard";
  if (u.role === "owner") return "#/owner/dashboard";
  return "#/tenant/dashboard";
};

// ── PROGRESS INDICATOR ───────────────────────────────────────────
let _progressTimer = null;
window.showProgress = function () {
  let bar = document.getElementById("app-progress");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "app-progress";
    bar.className = "progress-bar";
    document.body.appendChild(bar);
  }
  bar.style.width = "0%";
  bar.style.opacity = "1";
  bar.style.display = "block";
  
  clearTimeout(_progressTimer);
  // Simple fake progress
  setTimeout(() => { if (bar) bar.style.width = "30%"; }, 50);
  setTimeout(() => { if (bar) bar.style.width = "70%"; }, 400);
};

window.hideProgress = function () {
  const bar = document.getElementById("app-progress");
  if (!bar) return;
  bar.style.width = "100%";
  _progressTimer = setTimeout(() => {
    bar.style.opacity = "0";
    setTimeout(() => { bar.style.display = "none"; }, 300);
  }, 200);
};

window.bindEvents = function () {
  const root = document.getElementById("app-root");
  if (!root) return;
  const path = window.location.hash.slice(1) || "/";

  // typeof guards prevent crashes if a module hasn't loaded yet
  if (path.includes("login") || path.includes("signup")) {
    if (typeof Auth   !== "undefined") Auth.bindEvents(root);
  }
  if (path.startsWith("/tenant")) {
    if (typeof Tenant !== "undefined") Tenant.bindEvents(root);
  }
  if (path.startsWith("/owner"))  {
    if (typeof Owner  !== "undefined") Owner.bindEvents(root);
  }
  if (path.startsWith("/admin"))  {
    if (typeof Admin  !== "undefined") Admin.bindEvents(root);
  }
};

// ── UI UTILITIES ──────────────────────────────────────────────────

window.showToast = function (message, type = "info") {
  const container = document.getElementById("app-toast");
  if (!container) return;

  // Cap at 3 simultaneous toasts
  if (container.children.length >= 3) container.firstChild.remove();

  const cls = {
    success: "toast--success",
    error:   "toast--error",
    warning: "toast--warning",
    info:    "toast--info",
  };

  const div = document.createElement("div");
  div.className = `toast ${cls[type] || "toast--info"}`;
  div.setAttribute("role", "alert");
  div.innerHTML = `
    <span class="toast__message">${escHtml(message)}</span>
    <button class="toast__close" type="button" onclick="this.parentElement.remove()" aria-label="Dismiss">×</button>
  `;
  container.appendChild(div);

  // Auto-dismiss with fade-out
  setTimeout(() => {
    div.style.opacity   = "0";
    div.style.transform = "translateX(20px)";
    setTimeout(() => div.remove(), 300);
  }, 4000);
};

// Module-scoped Escape handler — ensures only one listener is active at a time
let _modalEscHandler = null;

window.showModal = function (html) {
  closeModal(); // Always clean up any prior modal first

  // Lock body scroll (prevents background page scroll on mobile & desktop)
  document.body.classList.add("modal-open");

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <button class="modal__close" type="button" onclick="closeModal()" aria-label="Close modal">×</button>
      ${html}
    </div>`;

  // Click backdrop to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Escape key to close
  _modalEscHandler = (e) => { if (e.key === "Escape") closeModal(); };
  document.addEventListener("keydown", _modalEscHandler);

  document.getElementById("app-modal")?.appendChild(overlay);
};

window.closeModal = function () {
  // Remove Escape listener before removing the modal
  if (_modalEscHandler) {
    document.removeEventListener("keydown", _modalEscHandler);
    _modalEscHandler = null;
  }

  // Release body scroll lock
  document.body.classList.remove("modal-open");

  document.getElementById("app-modal")
    ?.querySelector(".modal-overlay")
    ?.remove();
};
