// ff-owner.js — FlatFinder Owner Module (Mature UI + Cloudinary)
// Views: Dashboard · Add Flat (with Cloudinary) · Profile / Contact Details
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

window.Owner = {
  _uploadedImages: [], // holds Cloudinary secure_urls

  _cloudConfig() {
    return {
      cloudName: "dwgyilvip",
      preset: "ffwpreset",
    };
  },

  // ── DASHBOARD ─────────────────────────────────────────────────
  viewDashboard() {
    const u = appState.currentUser || {};
    const flats = appState.listings || [];
    const bookings = appState.bookings || [];

    const rows = flats.length
      ? flats
          .map(
            (l) => `
        <tr data-id="${escHtml(l.id)}" data-flat-id="${escHtml(l.flat_id)}">
          <td>
            <strong>${escHtml(l.flat_title)}</strong>
            <br><small class="text-muted">${escHtml(l.city)} · ${escHtml(l.type)}</small>
          </td>
          <td>₹${Number(l.rent).toLocaleString("en-IN")}</td>
          <td>
            <span class="badge badge--${l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"}">
              ${l.status}
            </span>
          </td>
          <td>
            ${l.status === "approved"
              ? `<button class="badge badge--neutral btn-toggle-flat" type="button">Toggle Visibility</button>`
              : `<small class="text-muted">Awaiting Review</small>`}
          </td>
          <td>${l.submitted_at?.slice(0, 10) || "—"}</td>
          <td>
            <button class="btn btn--danger btn--sm btn-del-flat" type="button">Delete</button>
          </td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="6" class="empty-cell">
          No listings yet. <a href="#/owner/add-flat" data-route="/owner/add-flat">Add your first flat →</a>
         </td></tr>`;

    // Quick contact completeness nudge
    const hasContact = u.phone || u.whatsapp || u.telegram;
    const contactNudge = !hasContact
      ? `<div class="nudge-banner">
           <span>Add your contact details so tenants can reach you directly.</span>
           <a class="btn btn--sm btn--secondary" href="#/owner/profile" data-route="/owner/profile">Update Profile →</a>
         </div>`
      : "";

    return `
      <div class="container page-content">
        ${contactNudge}
        <div class="page-header">
          <h2>Owner Dashboard 🏠</h2>
          <a class="btn btn--primary btn-hover-scale" href="#/owner/add-flat" data-route="/owner/add-flat">+ Add New Flat</a>
        </div>

        <div class="stat-grid stat-grid--sm">
          <div class="stat-card card card-hover-lift">
            <p class="stat-card__icon">📊</p>
            <p class="stat-card__label">Total Listings</p>
            <p class="stat-card__value">${flats.length}</p>
          </div>
          <div class="stat-card card card-hover-lift">
            <p class="stat-card__icon">✅</p>
            <p class="stat-card__label">Active</p>
            <p class="stat-card__value">${flats.filter((l) => l.available).length}</p>
          </div>
          <div class="stat-card card card-hover-lift">
            <p class="stat-card__icon">👁️‍🗨️</p>
            <p class="stat-card__label">Hidden</p>
            <p class="stat-card__value">${flats.filter((l) => !l.available).length}</p>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">My Listings</h3>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Flat</th><th>Rent</th><th>Status</th><th>Visibility</th><th>Submitted</th><th>Actions</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>

        <div class="card mt-lg">
          <h3 class="card-title">Recent Bookings</h3>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Flat</th><th>Tenant</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${
                  bookings.length
                    ? bookings
                        .map(
                          (b) => `
                  <tr>
                    <td><strong>${escHtml(b.flat_title)}</strong></td>
                    <td>${escHtml(b.tenant_name)}</td>
                    <td><small>${b.check_in}</small><br><small>→ ${b.check_out}</small></td>
                    <td><span class="badge badge--${b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "warning"}">${b.status}</span></td>
                    <td>
                      ${
                        b.status === "pending"
                          ? `<button class="btn btn--primary btn--sm" type="button" data-action="confirm-booking" data-id="${b.id}">Confirm</button>
                             <button class="btn btn--danger btn--sm" type="button" data-action="cancel-booking" data-id="${b.id}">Cancel</button>`
                          : "—"
                      }
                    </td>
                  </tr>`,
                        )
                        .join("")
                    : `<tr><td colspan="5" class="empty-cell">No bookings yet.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  // ── ADD FLAT ────────────────────────────────────────────────
  viewAddFlat() {
    this._uploadedImages = [];
    return `
      <div class="container page-content">
        <a class="back-link" href="#/owner/dashboard" data-route="/owner/dashboard">← Dashboard</a>
        <div class="card form-card form-card--lg">
          <h2>List a New Flat</h2>
          <p class="form-card__sub">Fill in the details to publish your property instantly.</p>

          <form id="add-flat-form" novalidate>

            <h4 class="form-section-title">Basic Details</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Title *</label>
                <div class="input-with-icon">
                  <span class="input-icon">🏢</span>
                  <input class="form-input" name="title" type="text" placeholder="2BHK in Koregaon Park" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">City *</label>
                <div class="input-with-icon">
                  <span class="input-icon">📍</span>
                  <input class="form-input" name="city" type="text" placeholder="Pune" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Monthly Rent (₹) *</label>
                <div class="input-with-icon">
                  <span class="input-icon">💰</span>
                  <input class="form-input" name="rent" type="number" min="1" step="100" placeholder="20000" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Deposit (₹)</label>
                <div class="input-with-icon">
                  <span class="input-icon">🔒</span>
                  <input class="form-input" name="deposit" type="number" min="0" step="100" placeholder="e.g. 40000" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Type *</label>
                <select class="form-select" name="type" required>
                  <option value="">Select type…</option>
                  <option>1BHK</option><option>2BHK</option><option>3BHK</option>
                  <option>Studio</option><option>4BHK+</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Furnished</label>
                <select class="form-select" name="furnished">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Full Address *</label>
              <textarea class="form-textarea" name="address" rows="2" placeholder="Street, Area, Landmark" required></textarea>
            </div>

            <h4 class="form-section-title">Property Details</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Floor Number</label>
                <div class="input-with-icon">
                  <span class="input-icon">📶</span>
                  <input class="form-input" name="floor_number" type="number" min="0" placeholder="e.g. 3" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Area (sq. ft.)</label>
                <div class="input-with-icon">
                  <span class="input-icon">📏</span>
                  <input class="form-input" name="area_sqft" type="number" min="0" placeholder="e.g. 850" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Bathrooms</label>
                <select class="form-select" name="bathrooms">
                  <option value="">Select…</option>
                  <option>1</option><option>2</option><option>3</option><option>4+</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Parking</label>
                <select class="form-select" name="parking">
                  <option value="none">None</option>
                  <option value="bike">Bike</option>
                  <option value="car">Car</option>
                  <option value="both">Bike + Car</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Facing Direction</label>
                <select class="form-select" name="facing">
                  <option value="">Select…</option>
                  <option>North</option><option>South</option><option>East</option><option>West</option>
                  <option>North-East</option><option>North-West</option><option>South-East</option><option>South-West</option>
                </select>
              </div>
            </div>

            <h4 class="form-section-title">Preferences and Rules</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Preferred Tenants</label>
                <select class="form-select" name="preferred_tenants">
                  <option value="any">Any</option>
                  <option value="family">Family</option>
                  <option value="bachelors">Bachelors</option>
                  <option value="working_women">Working Women</option>
                  <option value="students">Students</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Food Preference</label>
                <select class="form-select" name="food_preference">
                  <option value="any">Any</option>
                  <option value="veg">Vegetarian Only</option>
                  <option value="nonveg">Non-Veg OK</option>
                </select>
              </div>
            </div>

            <div class="checkbox-row">
              <label class="checkbox-label">
                <input type="checkbox" name="pets_allowed" value="1" /> Pets Allowed
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="smoking_allowed" value="1" /> Smoking Allowed
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="visitors_allowed" value="1" /> Visitors Allowed
              </label>
            </div>

            <h4 class="form-section-title">Description and Extra Info</h4>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" name="description" rows="3"
                placeholder="Describe the flat — location highlights, nearby facilities, house rules…"></textarea>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Amenities <span class="text-muted">(comma-separated)</span></label>
                <input class="form-input" name="amenities" type="text"
                  placeholder="WiFi, AC, Parking, Geyser, Lift, Gym, CCTV…" />
              </div>
              <div class="form-group">
                <label class="form-label">Nearby Landmarks</label>
                <input class="form-input" name="landmarks" type="text"
                  placeholder="2 min walk to Metro, Near Phoenix Mall…" />
              </div>
            </div>

            <h4 class="form-section-title">Property Photos</h4>
            <div class="form-group">
              <label class="form-label">Upload Images <span class="text-muted">(Direct Cloudinary Upload)</span></label>
              <div class="image-upload-zone" id="image-upload-zone">
                <input type="file" id="image-input" class="hidden" accept="image/*" multiple />
                <label class="image-upload-zone__inner" id="img-drop-area" for="image-input">
                  <span class="empty-state__icon empty-state__icon--sm">IMG</span>
                  <p>Click here to browse photos</p>
                </label>
                <div id="image-preview-grid" class="img-preview-grid"></div>
              </div>
            </div>

            <div id="add-flat-error" class="form-error hidden mt-lg"></div>
            <button class="btn btn--primary btn--full mt-lg" type="submit" id="add-flat-submit">Publish Listing</button>
          </form>
        </div>
      </div>`;
  },

  // ── PROFILE ────────────────────────────────────────────────
  viewProfile() {
    const u = appState.currentUser || {};
    return `
      <div class="container page-content">
        <a class="back-link" href="#/owner/dashboard" data-route="/owner/dashboard">← Back to Dashboard</a>
        <div class="card form-card form-card--sm mt-md">
          <h2 class="card-title">Update Contact Details</h2>
          <p class="text-muted form-card__lead">These details help tenants contact you about your flats.</p>

          <form id="owner-profile-form" novalidate>
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <div class="input-with-icon">
                <span class="input-icon">👤</span>
                <input class="form-input" type="text" name="name" value="${escHtml(u.name || "")}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <div class="input-with-icon">
                <span class="input-icon">📞</span>
                <input class="form-input" type="tel" name="phone" value="${escHtml(u.phone || "")}" placeholder="e.g. +91 98765 43210" />
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">WhatsApp (Number only)</label>
                <div class="input-with-icon">
                  <span class="input-icon">💬</span>
                  <input class="form-input" type="text" name="whatsapp"
                    value="${escHtml(u.whatsapp || "")}" placeholder="919876543210" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Telegram Username</label>
                <div class="input-with-icon">
                  <span class="input-icon">✈️</span>
                  <input class="form-input" type="text" name="telegram"
                    value="${escHtml(u.telegram || "")}" placeholder="username" />
                </div>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">City / Location</label>
                <div class="input-with-icon">
                  <span class="input-icon">📍</span>
                  <input class="form-input" type="text" name="location"
                    value="${escHtml(u.location || "")}" placeholder="e.g. Pune, Maharashtra" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Languages Spoken</label>
                <input class="form-input" type="text" name="languages"
                  value="${escHtml(u.languages || "")}" placeholder="e.g. English, Hindi, Marathi" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">About You / Professional Bio</label>
              <textarea class="form-textarea" name="bio"
                placeholder="Tell tenants about your property management style...">${escHtml(u.bio || "")}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">New Password <span class="text-muted">(leave blank to keep current)</span></label>
              <div class="input-with-icon">
                <span class="input-icon">🔒</span>
                <input class="form-input" type="password" name="password"
                  placeholder="At least 8 characters" minlength="8" autocomplete="new-password" />
              </div>
            </div>

            <button type="submit" class="btn btn--primary btn--full mt-md" id="profile-save-btn">Save Profile Details</button>
          </form>
        </div>
      </div>`;
  },

  // ── BIND EVENTS ────────────────────────────────────────────
  bindEvents(root) {
    // Profile form
    const profileForm = root.querySelector("#owner-profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(profileForm);
        const data = Object.fromEntries(fd.entries());
        const btn = root.querySelector("#profile-save-btn");
        btn.disabled = true;
        btn.textContent = "Saving…";
        const res = await apiFetch("/api/me", { method: "PATCH", body: data });
        btn.disabled = false;
        btn.textContent = "Save Profile Details";
        if (res.success) {
          showToast("Profile updated successfully", "success");
          if (res.data) appState.currentUser = res.data;
          renderNavBar();
        } else {
          showToast(res.message, "error");
        }
      });
      return;
    }

    // Add-flat form
    const addFlatForm = root.querySelector("#add-flat-form");
    if (addFlatForm) {
      this._bindAddFlatForm(root);
      return;
    }

    // Dashboard actions
    root.addEventListener("click", async (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const flatId = row.dataset.flatId;

      const btnToggle = e.target.closest(".btn-toggle-flat");
      if (btnToggle) {
        btnToggle.disabled = true;
        const res = await apiFetch(`/api/flats/${flatId}/toggle`, { method: "POST" });
        btnToggle.disabled = false;
        if (res.success) {
          showToast("Visibility toggled", "success");
          const r = await apiFetch("/api/listings");
          if (r.success) appState.listings = r.data;
          render(Owner.viewDashboard());
        } else {
          showToast(res.message, "error");
        }
        return;
      }

      const btnDel = e.target.closest(".btn-del-flat");
      if (btnDel) {
        showModal(`
          <div class="modal-message">
            <p class="empty-state__icon">!</p>
            <h3>Delete Listing?</h3>
            <p class="text-muted">Are you sure you want to permanently delete this property listing? This cannot be undone.</p>
            <div class="modal-btn-row">
              <button class="btn btn--neutral btn--full" type="button" onclick="closeModal()">Cancel</button>
              <button class="btn btn--danger btn--full" type="button" id="confirm-del-flat-btn">Delete Listing</button>
            </div>
          </div>
        `);

        const confirmDeleteBtn = document.getElementById("confirm-del-flat-btn");
        if (!confirmDeleteBtn) return;

        confirmDeleteBtn.addEventListener("click", async () => {
          const confirmBtn = document.getElementById("confirm-del-flat-btn");
          if (!confirmBtn) return;
          confirmBtn.disabled = true;
          confirmBtn.textContent = "Deleting…";
          const res = await apiFetch(`/api/flats/${flatId}`, { method: "DELETE" });
          closeModal();
          if (res.success) {
            showToast("Listing deleted", "success");
            const r = await apiFetch("/api/listings");
            if (r.success) appState.listings = r.data;
            render(Owner.viewDashboard());
          } else {
            showToast(res.message, "error");
          }
        });
        return;
      }

      // Booking actions
      const btnAction = e.target.closest("[data-action]");
      if (!btnAction) return;
      const action = btnAction.dataset.action;
      const bId = btnAction.dataset.id;

      if (action === "confirm-booking" || action === "cancel-booking") {
        btnAction.disabled = true;
        const status = action === "confirm-booking" ? "confirmed" : "cancelled";
        const res = await apiFetch(`/api/bookings/${bId}`, { method: "PATCH", body: { status } });
        if (res.success) {
          showToast(`Booking ${status}`, "success");
          const [lr, br] = await Promise.all([apiFetch("/api/listings"), apiFetch("/api/bookings")]);
          if (lr.success) appState.listings = lr.data;
          if (br.success) appState.bookings = br.data;
          render(Owner.viewDashboard());
        } else {
          showToast(res.message, "error");
          btnAction.disabled = false;
        }
      }
    });
  },

  // ── PRIVATE: Cloudinary upload + form submit ───────────────
  _bindAddFlatForm(root) {
    const addFlatForm = root.querySelector("#add-flat-form");
    if (!addFlatForm) return;

    const imgInput = root.querySelector("#image-input");
    const grid     = root.querySelector("#image-preview-grid");

    imgInput?.addEventListener("change", async () => {
      const files  = Array.from(imgInput.files);
      const config = this._cloudConfig();

      if (!config.cloudName || !config.preset) {
        return showToast("Cloudinary config missing.", "warning");
      }

      for (const file of files) {
        const item = document.createElement("div");
        item.className = "img-preview-item";
        item.innerHTML = '<div class="img-preview-item__loading">Uploading…</div>';
        grid.appendChild(item);

        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", config.preset);

        try {
          const res  = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
            method: "POST",
            body: fd,
          });
          const json = await res.json();
          if (json.secure_url) {
            this._uploadedImages.push(json.secure_url);
            item.innerHTML = `<img src="${json.secure_url}" alt="uploaded" />
              <button type="button" class="img-preview-item__remove"
                      data-url="${json.secure_url}" aria-label="Remove image">×</button>`;
          } else {
            item.remove();
            showToast("Upload failed", "error");
          }
        } catch {
          item.remove();
          showToast("Network error during upload", "error");
        }
      }
      imgInput.value = ""; // reset so same file can be selected again
    });

    grid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".img-preview-item__remove");
      if (!btn) return;
      const url = btn.dataset.url;
      this._uploadedImages = this._uploadedImages.filter((u) => u !== url);
      btn.parentElement.remove();
    });

    addFlatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn   = root.querySelector("#add-flat-submit");
      const errEl = root.querySelector("#add-flat-error");

      const fd   = new FormData(addFlatForm);
      const data = Object.fromEntries(fd);

      if (!data.title || !data.city || !data.rent || !data.type || !data.address) {
        if (errEl) { errEl.textContent = "Please fill in all required fields (*)."; errEl.classList.remove("hidden"); }
        showToast("Please fill in all required fields.", "error");
        return;
      }
      if (errEl) errEl.classList.add("hidden");

      btn.disabled    = true;
      btn.textContent = "Publishing…";

      data.amenities        = (data.amenities || "").split(",").map((s) => s.trim()).filter(Boolean);
      data.images           = this._uploadedImages;
      data.pets_allowed     = addFlatForm.querySelector('[name="pets_allowed"]')?.checked     ? 1 : 0;
      data.smoking_allowed  = addFlatForm.querySelector('[name="smoking_allowed"]')?.checked  ? 1 : 0;
      data.visitors_allowed = addFlatForm.querySelector('[name="visitors_allowed"]')?.checked ? 1 : 0;

      const res = await apiFetch("/api/flats", { method: "POST", body: data });

      btn.disabled    = false;
      btn.textContent = "Publish Listing";

      if (res.success) {
        showToast("Listing published successfully!", "success");
        window.location.hash = "#/owner/dashboard";
      } else {
        showToast(res.message, "error");
      }
    });
  },
};
