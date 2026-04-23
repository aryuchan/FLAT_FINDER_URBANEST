// ff-owner.js — FlatFinder Owner Module
// Views: Dashboard · Add Flat (with image upload) · Profile / Contact Details
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

const Owner = {
  // ── helpers ──────────────────────────────────────────────────
  _imgPreviews: [], // holds base64 data-URLs for preview

  // ── DASHBOARD ─────────────────────────────────────────────────
  viewDashboard() {
    const u = appState.currentUser;
    const rows = appState.listings.length
      ? appState.listings
          .map(
            (l) => `
        <tr>
          <td>
            <strong>${escHtml(l.flat_title)}</strong>
            <br><small class="text-muted">📍 ${escHtml(l.city)} · ${escHtml(l.type)}</small>
          </td>
          <td>₹${Number(l.rent).toLocaleString("en-IN")}</td>
          <td>
            <span class="badge badge--${l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"}">
              ${l.status}
            </span>
          </td>
          <td>${l.submitted_at?.slice(0, 10) || "—"}</td>
          <td>${l.reviewer_name ? escHtml(l.reviewer_name) : "—"}</td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" class="empty-cell">
          No listings yet. <a href="#/owner/add-flat" data-route="/owner/add-flat">Add your first flat →</a>
         </td></tr>`;

    // Quick contact completeness nudge
    const hasContact = u.phone || u.whatsapp || u.telegram;
    const contactNudge = !hasContact
      ? `<div class="nudge-banner">
           <span>💡 Add your contact details so tenants can reach you directly.</span>
           <a class="btn btn--sm btn--secondary" href="#/owner/profile" data-route="/owner/profile">Update Profile →</a>
         </div>`
      : "";

    return `
      <div class="container page-content">
        ${contactNudge}
        <div class="page-header">
          <h2>Owner Dashboard</h2>
          <a class="btn btn--primary" href="#/owner/add-flat" data-route="/owner/add-flat">+ Add Flat</a>
        </div>

        <!-- Quick stats -->
        <div class="stat-grid stat-grid--sm">
          <div class="stat-card card">
            <p style="font-size:1.25rem">🏠</p>
            <p class="stat-card__label">Total Listings</p>
            <p class="stat-card__value">${appState.listings.length}</p>
          </div>
          <div class="stat-card card">
            <p style="font-size:1.25rem">✅</p>
            <p class="stat-card__label">Approved</p>
            <p class="stat-card__value">${appState.listings.filter((l) => l.status === "approved").length}</p>
          </div>
          <div class="stat-card card">
            <p style="font-size:1.25rem">⏳</p>
            <p class="stat-card__label">Pending</p>
            <p class="stat-card__value">${appState.listings.filter((l) => l.status === "pending").length}</p>
          </div>
          <div class="stat-card card">
            <p style="font-size:1.25rem">❌</p>
            <p class="stat-card__label">Rejected</p>
            <p class="stat-card__value">${appState.listings.filter((l) => l.status === "rejected").length}</p>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">My Listings</h3>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Flat</th><th>Rent</th><th>Status</th><th>Submitted</th><th>Reviewed By</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  // ── ADD FLAT (with image upload) ──────────────────────────────
    viewAddFlat() {
    const template = document.getElementById("add-flat-template");
    if (!template) return "<p>Error: Template not found</p>";
    const clone = template.content.cloneNode(true);
    const u = appState.currentUser || {};

    const setVal = (name, val) => {
      const el = clone.querySelector(`[name="${name}"]`);
      if (el) el.value = val || "";
    };

    // Auto-fill values
    const today = new Date().toISOString().split("T")[0];
    const availableFromEl = clone.querySelector('[name="available_from"]');
    if (availableFromEl) availableFromEl.min = today;

    setVal("contact_phone", u.phone);
    setVal("contact_whatsapp", u.whatsapp);
    setVal("contact_email", u.email);
    setVal("contact_telegram", u.telegram);

    const tempDiv = document.createElement("div");
    tempDiv.appendChild(clone);
    return tempDiv.innerHTML;
  },

  // ── OWNER PROFILE ──────────────────────────────────────────────
    viewProfile() {
    const template = document.getElementById("owner-profile-template");
    if (!template) return "<p>Error: Template not found</p>";
    const clone = template.content.cloneNode(true);
    const u = appState.currentUser || {};

    const setVal = (name, val) => {
      const el = clone.querySelector(`[name="${name}"]`);
      if (el) el.value = val || "";
    };

    setVal("name", u.name);
    setVal("email", u.email);
    setVal("phone", u.phone);
    setVal("whatsapp", u.whatsapp);
    setVal("telegram", u.telegram);
    setVal("location", u.location);
    setVal("languages", u.languages);
    setVal("bio", u.bio);

    const tempDiv = document.createElement("div");
    tempDiv.appendChild(clone);
    return tempDiv.innerHTML;
  },

  // ── EVENT BINDERS ─────────────────────────────────────────────
  bindEvents(root) {
    this._bindAddFlatForm(root);
    this._bindImageUpload(root);
    this._bindProfileForm(root);
  },

  _bindAddFlatForm(root) {
    const addFlatForm = root.querySelector("#add-flat-form");
    if (!addFlatForm) return;

    addFlatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(addFlatForm);

      // Collect amenities
      const amenities = (fd.get("amenities") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Collect checkboxes
      const pets_allowed = addFlatForm.querySelector('[name="pets_allowed"]')
        ?.checked
        ? 1
        : 0;
      const smoking_allowed = addFlatForm.querySelector(
        '[name="smoking_allowed"]',
      )?.checked
        ? 1
        : 0;
      const visitors_allowed = addFlatForm.querySelector(
        '[name="visitors_allowed"]',
      )?.checked
        ? 1
        : 0;

      const payload = {
        title: fd.get("title")?.trim(),
        city: fd.get("city")?.trim(),
        address: fd.get("address")?.trim() || "",
        rent: fd.get("rent"),
        type: fd.get("type"),
        furnished: fd.get("furnished"),
        description: fd.get("description")?.trim() || "",
        amenities,
        available_from: fd.get("available_from") || "",
        deposit: fd.get("deposit") || "",
        floor: fd.get("floor") || "",
        total_floors: fd.get("total_floors") || "",
        area_sqft: fd.get("area_sqft") || "",
        bathrooms: fd.get("bathrooms") || "",
        parking: fd.get("parking") || "none",
        facing: fd.get("facing") || "",
        preferred_tenants: fd.get("preferred_tenants") || "any",
        food_preference: fd.get("food_preference") || "any",
        pets_allowed,
        smoking_allowed,
        visitors_allowed,
        landmarks: fd.get("landmarks")?.trim() || "",
        contact_phone: fd.get("contact_phone")?.trim() || "",
        contact_whatsapp: fd.get("contact_whatsapp")?.trim() || "",
        contact_email: fd.get("contact_email")?.trim() || "",
        contact_telegram: fd.get("contact_telegram")?.trim().replace(/^@/, "") || "",
        preferred_contact: fd.get("preferred_contact") || "",
        best_time_to_call: fd.get("best_time_to_call") || "",
        owner_note: fd.get("owner_note")?.trim() || "",
        images: Owner._imgPreviews, // base64 strings for server-side processing
      };

      const errEl = root.querySelector("#add-flat-error");
      if (!payload.title || !payload.city || !payload.rent || !payload.type) {
        if (errEl) {
          errEl.textContent =
            "Please fill in all required fields (Title, City, Rent, Type).";
          errEl.classList.remove("hidden");
        }
        showToast("Please fill in all required fields.", "error");
        return;
      }
      if (errEl) errEl.classList.add("hidden");

      const btn = root.querySelector("#add-flat-submit");
      btn.disabled = true;
      btn.textContent = "Submitting…";
      const r = await apiFetch("/api/flats", { method: "POST", body: payload });
      btn.disabled = false;
      btn.textContent = "Submit for Review";

      if (r.success) {
        Owner._imgPreviews = [];
        showToast("Flat submitted for review!", "success");
        window.location.hash = "#/owner/dashboard";
      } else {
        showToast(r.message || "Submission failed.", "error");
      }
    });
  },

  _bindImageUpload(root) {
    const zone = root.querySelector("#image-upload-zone");
    if (!zone) return;

    const input = root.querySelector("#flat-images-input");
    const dropArea = root.querySelector("#img-drop-area");
    const previewGrid = root.querySelector("#img-preview-grid");
    Owner._imgPreviews = [];

    root
      .querySelector("#img-browse-btn")
      ?.addEventListener("click", () => input?.click());

    input?.addEventListener("change", () =>
      Owner._handleFiles(Array.from(input.files), previewGrid),
    );

    dropArea?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropArea.classList.add("drag-over");
    });
    dropArea?.addEventListener("dragleave", () =>
      dropArea.classList.remove("drag-over"),
    );
    dropArea?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropArea.classList.remove("drag-over");
      Owner._handleFiles(Array.from(e.dataTransfer.files), previewGrid);
    });
  },

  _handleFiles(files, previewGrid) {
    if (!previewGrid) return;
    const maxFiles = 8;
    const maxSize = 2 * 1024 * 1024;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    let added = 0;

    for (const file of files) {
      if (Owner._imgPreviews.length >= maxFiles) {
        showToast(`Max ${maxFiles} images allowed.`, "warning");
        break;
      }
      if (!allowed.includes(file.type)) {
        showToast(`${file.name}: unsupported format.`, "error");
        continue;
      }
      if (file.size > maxSize) {
        showToast(`${file.name} exceeds 2 MB.`, "error");
        continue;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target.result;
        Owner._imgPreviews.push(src);
        const idx = Owner._imgPreviews.length - 1;

        const wrapper = document.createElement("div");
        wrapper.className = "img-preview-item";
        wrapper.dataset.idx = idx;
        wrapper.innerHTML = `
          <img src="${src}" alt="Preview ${idx + 1}" />
          <button type="button" class="img-preview-item__remove" data-idx="${idx}" aria-label="Remove image">×</button>
          ${idx === 0 ? '<span class="img-preview-item__main-badge">Cover</span>' : ""}
        `;
        previewGrid.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
      added++;
    }

    // Remove button delegation
    previewGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".img-preview-item__remove");
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      Owner._imgPreviews.splice(idx, 1);
      // Re-render all previews
      previewGrid.innerHTML = "";
      Owner._imgPreviews.forEach((src, i) => {
        const w = document.createElement("div");
        w.className = "img-preview-item";
        w.dataset.idx = i;
        w.innerHTML = `
          <img src="${src}" alt="Preview ${i + 1}" />
          <button type="button" class="img-preview-item__remove" data-idx="${i}" aria-label="Remove image">×</button>
          ${i === 0 ? '<span class="img-preview-item__main-badge">Cover</span>' : ""}
        `;
        previewGrid.appendChild(w);
      });
    });
  },

  _bindProfileForm(root) {
    const profileForm = root.querySelector("#profile-form");
    if (!profileForm) return;

    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(profileForm);
      const newPass = fd.get("new_password");
      const confirmPass = fd.get("confirm_password");
      const errEl = root.querySelector("#profile-error");

      if (newPass && newPass !== confirmPass) {
        if (errEl) {
          errEl.textContent = "Passwords do not match.";
          errEl.classList.remove("hidden");
        }
        return;
      }
      if (errEl) errEl.classList.add("hidden");

      const payload = {
        name: fd.get("name")?.trim(),
        email: fd.get("email")?.trim(),
        phone: fd.get("phone")?.trim() || "",
        whatsapp: fd.get("whatsapp")?.trim() || "",
        telegram: fd.get("telegram")?.trim().replace(/^@/, "") || "",
        location: fd.get("location")?.trim() || "",
        languages: fd.get("languages")?.trim() || "",
        bio: fd.get("bio")?.trim() || "",
        ...(newPass ? { password: newPass } : {}),
      };

      const btn = root.querySelector("#profile-submit");
      btn.disabled = true;
      btn.textContent = "Saving…";
      const r = await apiFetch("/api/me", { method: "PATCH", body: payload });
      btn.disabled = false;
      btn.textContent = "Save Changes";

      if (r.success) {
        Object.assign(appState.currentUser, payload);
        renderNavBar();
        showToast("Profile updated successfully!", "success");
      } else {
        showToast(r.message || "Update failed.", "error");
      }
    });
  },
};
