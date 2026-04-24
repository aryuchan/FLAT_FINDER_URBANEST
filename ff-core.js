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

    const res = await fetch(`${API}${path}`, init);
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
    if (!json.success && json.error && !json.message) {
      json.message = json.error.message;
    }
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
      { label: "📋 Listings", route: "/owner/listings" },
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
    <div class="nav__inner container">
      <a class="nav__brand" href="#" data-route="/${u.role}/dashboard">🏠 FlatFinder</a>
      <div class="nav__links">${links}</div>
      <div class="nav__user">
        <span class="nav__name">${escHtml(u.name)}</span>
        <span class="badge ${badgeClass[u.role] || "badge--neutral"}">${u.role}</span>
        <button class="btn btn--secondary btn--sm" id="logout-btn">Logout</button>
      </div>
    </div>`;
}

// ── UI UTILITIES ──────────────────────────────────────────────────
function showToast(message, type = "info") {
  const toast = document.getElementById("app-toast");
  if (!toast) return;
  const cls = {
    success: "toast--success",
    error: "toast--error",
    warning: "toast--warning",
    info: "toast--info",
  };
  const div = document.createElement("div");
  div.className = `toast ${cls[type] || "toast--info"}`;
  div.innerHTML = `<span class="toast__message">${escHtml(message)}</span>
    <button class="toast__close" onclick="this.parentElement.remove()" aria-label="Dismiss">×</button>`;
  toast.appendChild(div);
  setTimeout(() => div.remove(), 4000);
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

// ── CAROUSEL & LIGHTBOX ──────────────────────────────────────────
window.Carousel = {
  init(container) {
    const carousels = container.querySelectorAll(".carousel");
    carousels.forEach((car) => {
      const track = car.querySelector(".carousel__track");
      const prevBtn = car.querySelector(".carousel__btn--prev");
      const nextBtn = car.querySelector(".carousel__btn--next");
      if (!track) return;
      const images = Array.from(track.querySelectorAll(".carousel__img"));
      
      if (images.length <= 1) {
        if (prevBtn) prevBtn.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";
      }
      if (images.length === 0) return;

      let currentIndex = 0;
      const update = () => {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      };

      prevBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        currentIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
        update();
      });

      nextBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        currentIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
        update();
      });

      // Lightbox binding
      images.forEach((img, idx) => {
        img.addEventListener("click", () => {
          Lightbox.open(images.map((i) => i.src), idx);
        });
      });
    });
  },
};

window.Lightbox = {
  open(imageSrcs, startIndex = 0) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    
    overlay.innerHTML = `
      <button class="lightbox-close" aria-label="Close Lightbox">&times;</button>
      <button class="lightbox-btn lightbox-btn--prev" aria-label="Previous image">&#10094;</button>
      <div class="lightbox-content">
        <img class="lightbox-img" src="${escHtml(imageSrcs[currentIndex])}" alt="Fullscreen View" />
      </div>
      <button class="lightbox-btn lightbox-btn--next" aria-label="Next image">&#10095;</button>
    `;

    const updateImg = () => {
      overlay.querySelector(".lightbox-img").src = imageSrcs[currentIndex];
    };

    // Keyboard support — declared first so closeLightbox can reference it
    let keydownHandler;
    const closeLightbox = () => {
      overlay.remove();
      document.removeEventListener("keydown", keydownHandler);
    };
    keydownHandler = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") overlay.querySelector(".lightbox-btn--prev").click();
      if (e.key === "ArrowRight") overlay.querySelector(".lightbox-btn--next").click();
    };

    overlay.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    
    overlay.querySelector(".lightbox-btn--prev").addEventListener("click", (e) => {
      e.stopPropagation();
      currentIndex = currentIndex > 0 ? currentIndex - 1 : imageSrcs.length - 1;
      updateImg();
    });
    
    overlay.querySelector(".lightbox-btn--next").addEventListener("click", (e) => {
      e.stopPropagation();
      currentIndex = currentIndex < imageSrcs.length - 1 ? currentIndex + 1 : 0;
      updateImg();
    });

    document.addEventListener("keydown", keydownHandler);

    // Close on backdrop click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.classList.contains("lightbox-content")) closeLightbox();
    });

    document.body.appendChild(overlay);
  },
};
