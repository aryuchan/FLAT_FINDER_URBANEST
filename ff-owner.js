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
    return `
      <div class="container page-content">
        <a class="back-link" href="#/owner/dashboard" data-route="/owner/dashboard">← Dashboard</a>
        <div class="card form-card" style="max-width:760px">
          <h2>List a New Flat</h2>
          <p class="form-card__sub">Fill in the details. An admin will review and approve your listing.</p>

          <form id="add-flat-form" novalidate enctype="multipart/form-data" onsubmit="return false;">

            <!-- ── Section 1: Basic Details ── -->
            <h4 class="form-section-title">📋 Basic Details</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Title *</label>
                <input class="form-input" name="title" type="text" placeholder="2BHK in Koregaon Park" required />
              </div>
              <div class="form-group">
                <label class="form-label">City *</label>
                <input class="form-input" name="city" type="text" placeholder="Pune" required />
              </div>
              <div class="form-group">
                <label class="form-label">Full Address</label>
                <input class="form-input" name="address" type="text" placeholder="Street, Area, Landmark" />
              </div>
              <div class="form-group">
                <label class="form-label">Monthly Rent (₹) *</label>
                <input class="form-input" name="rent" type="text" inputmode="numeric" placeholder="20000" required />
              </div>
              <div class="form-group">
                <label class="form-label">Type *</label>
                <select class="form-select" name="type" required>
                  <option value="">Select type…</option>
                  <option value="1BHK">1BHK</option>
                  <option value="2BHK">2BHK</option>
                  <option value="3BHK">3BHK</option>
                  <option value="Studio">Studio</option>
                  <option value="4BHK+">4BHK+</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Furnished</label>
                <select class="form-select" name="furnished">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Available From</label>
                <input class="form-input" name="available_from" type="date" min="${new Date().toISOString().split("T")[0]}" />
              </div>
              <div class="form-group">
                <label class="form-label">Deposit (₹)</label>
                <input class="form-input" name="deposit" type="text" inputmode="numeric" placeholder="e.g. 40000" />
              </div>
            </div>

            <!-- ── Section 2: Property Details ── -->
            <h4 class="form-section-title">🏗️ Property Details</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Floor Number</label>
                <input class="form-input" name="floor" type="text" inputmode="numeric" placeholder="e.g. 3" />
              </div>
              <div class="form-group">
                <label class="form-label">Total Floors in Building</label>
                <input class="form-input" name="total_floors" type="text" inputmode="numeric" placeholder="e.g. 10" />
              </div>
              <div class="form-group">
                <label class="form-label">Area (sq. ft.)</label>
                <input class="form-input" name="area_sqft" type="text" inputmode="numeric" placeholder="e.g. 850" />
              </div>
              <div class="form-group">
                <label class="form-label">Bathrooms</label>
                <select class="form-select" name="bathrooms">
                  <option value="">Select…</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4+">4+</option>
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
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="North-East">North-East</option>
                  <option value="North-West">North-West</option>
                  <option value="South-East">South-East</option>
                  <option value="South-West">South-West</option>
                </select>
              </div>
            </div>

            <!-- ── Section 3: Preferences / Rules ── -->
            <h4 class="form-section-title">📜 Preferences & Rules</h4>
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
              <label class="checkbox-label"><input type="checkbox" name="pets_allowed" value="1" /> 🐾 Pets Allowed</label>
              <label class="checkbox-label"><input type="checkbox" name="smoking_allowed" value="1" /> 🚬 Smoking Allowed</label>
              <label class="checkbox-label"><input type="checkbox" name="visitors_allowed" value="1" /> 👥 Visitors Allowed</label>
            </div>

            <!-- ── Section 4: Description & Amenities ── -->
            <h4 class="form-section-title">📝 Description</h4>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" name="description" rows="3"
                placeholder="Describe the flat — location highlights, nearby facilities, house rules…"></textarea>
            </div>
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

            <!-- ── Section 5: Photos ── -->
            <h4 class="form-section-title">📸 Property Photos</h4>
            <div class="form-group">
              <label class="form-label">Upload Images <span class="text-muted">(up to 8, max 2 MB each)</span></label>
              <div class="image-upload-zone" id="image-upload-zone">
                <input type="file" id="flat-images-input" name="images" accept="image/*" multiple
                  style="display:none" />
                <div class="image-upload-zone__inner" id="img-drop-area">
                  <span style="font-size:2rem">📷</span>
                  <p>Drag &amp; drop photos here, or <button type="button" class="btn-link" id="img-browse-btn">browse</button></p>
                  <p class="text-muted" style="font-size:0.75rem">JPG, PNG, WEBP — up to 2 MB each</p>
                </div>
                <div id="img-preview-grid" class="img-preview-grid"></div>
              </div>
            </div>

            <!-- ── Section 6: Owner Contact Details ── -->
            <h4 class="form-section-title">📞 Contact Details for Tenants</h4>
            <p class="text-muted" style="font-size:0.85rem;margin-bottom:var(--space-md)">
              These details will be shown to tenants who view your listing. Fill what you're comfortable sharing.
            </p>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Contact Phone</label>
                <input class="form-input" name="contact_phone" type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value="${escHtml(appState.currentUser.phone || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp Number</label>
                <input class="form-input" name="contact_whatsapp" type="tel"
                  placeholder="+91 XXXXX XXXXX (if different)"
                  value="${escHtml(appState.currentUser.whatsapp || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label">Contact Email <span class="text-muted">(optional)</span></label>
                <input class="form-input" name="contact_email" type="email"
                  placeholder="your@email.com"
                  value="${escHtml(appState.currentUser.email || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label">Telegram Username <span class="text-muted">(optional)</span></label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix">@</span>
                  <input class="form-input input-with-prefix" name="contact_telegram" type="text"
                    placeholder="yourusername"
                    value="${escHtml(appState.currentUser.telegram || '')}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Best Time to Call</label>
                <select class="form-select" name="best_time_to_call">
                  <option value="">Anytime</option>
                  <option value="Morning (8 AM – 12 PM)">Morning (8 AM – 12 PM)</option>
                  <option value="Afternoon (12 PM – 4 PM)">Afternoon (12 PM – 4 PM)</option>
                  <option value="Evening (4 PM – 8 PM)">Evening (4 PM – 8 PM)</option>
                  <option value="Night (8 PM – 10 PM)">Night (8 PM – 10 PM)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Preferred Contact Method</label>
                <select class="form-select" name="preferred_contact">
                  <option value="">No preference</option>
                  <option value="phone">Phone Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Short Note for Tenants</label>
              <textarea class="form-textarea" name="owner_note" rows="2"
                placeholder="e.g. Please call before visiting. Brokerage free. Serious inquiries only."></textarea>
            </div>

            <div id="add-flat-error" class="form-error hidden"></div>
            <button class="btn btn--primary" type="submit" id="add-flat-submit">Submit for Review</button>
          </form>
        </div>
      </div>`;
  },

  // ── OWNER PROFILE ──────────────────────────────────────────────
  viewProfile() {
    const u = appState.currentUser;
    return `
      <div class="container page-content">
        <div class="page-header">
          <h2>My Profile</h2>
          <a class="btn btn--secondary" href="#/owner/dashboard" data-route="/owner/dashboard">← Dashboard</a>
        </div>
        <div class="card form-card" style="max-width:640px">
          <h3 class="card-title">👤 Personal Information</h3>
          <form id="profile-form" novalidate onsubmit="return false;">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input class="form-input" name="name" type="text"
                  value="${escHtml(u.name || "")}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" name="email" type="email"
                  value="${escHtml(u.email || "")}" required />
              </div>
            </div>

            <h4 class="form-section-title" style="margin-top:var(--space-md)">📞 Contact Details</h4>
            <p class="text-muted" style="font-size:0.85rem;margin-bottom:var(--space-md)">
              These are saved to your profile and auto-filled when you add a flat.
            </p>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input class="form-input" name="phone" type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value="${escHtml(u.phone || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp</label>
                <input class="form-input" name="whatsapp" type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value="${escHtml(u.whatsapp || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label">Telegram Username <span class="text-muted">(optional)</span></label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix">@</span>
                  <input class="form-input input-with-prefix" name="telegram" type="text"
                    placeholder="yourusername"
                    value="${escHtml(u.telegram || '')}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">City / Location</label>
                <input class="form-input" name="location" type="text"
                  placeholder="Pune, Maharashtra"
                  value="${escHtml(u.location || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label">Languages Spoken</label>
                <input class="form-input" name="languages" type="text"
                  placeholder="English, Hindi, Marathi"
                  value="${escHtml(u.languages || "")}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">About You <span class="text-muted">(shown to tenants)</span></label>
              <textarea class="form-textarea" name="bio" rows="3"
                placeholder="A short bio — experience as a landlord, response time, etc.">${escHtml(u.bio || "")}</textarea>
            </div>

            <h4 class="form-section-title" style="margin-top:var(--space-md)">🔒 Change Password</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input class="form-input" name="new_password" type="password"
                  placeholder="Leave blank to keep current" minlength="6" autocomplete="new-password" />
              </div>
              <div class="form-group">
                <label class="form-label">Confirm Password</label>
                <input class="form-input" name="confirm_password" type="password"
                  placeholder="Repeat new password" autocomplete="new-password" />
              </div>
            </div>

            <div id="profile-error" class="form-error hidden"></div>
            <button class="btn btn--primary" type="submit" id="profile-submit">Save Changes</button>
          </form>
        </div>
      </div>`;
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
        rent: (fd.get("rent") || "").toString().replace(/,/g, "").trim(),
        type: fd.get("type"),
        furnished: fd.get("furnished"),
        description: fd.get("description")?.trim() || "",
        amenities,
        available_from: fd.get("available_from") || "",
        deposit: (fd.get("deposit") || "").toString().replace(/,/g, "").trim(),
        floor: (fd.get("floor") || "").toString().replace(/,/g, "").trim(),
        total_floors: (fd.get("total_floors") || "").toString().replace(/,/g, "").trim(),
        area_sqft: (fd.get("area_sqft") || "").toString().replace(/,/g, "").trim(),
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

    // Remove button delegation — attached ONCE here, not inside _handleFiles
    previewGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".img-preview-item__remove");
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      Owner._imgPreviews.splice(idx, 1);
      Owner._renderPreviews(previewGrid);
    });
  },

  _handleFiles(files, previewGrid) {
    if (!previewGrid) return;
    const maxFiles = 8;
    const maxSize = 2 * 1024 * 1024;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
        showToast(`${file.name} exceeds 2 MB limit.`, "error");
        continue;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Compress image via Canvas
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          } else if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to highly optimized webp format
          const src = canvas.toDataURL("image/webp", 0.7);
          Owner._imgPreviews.push(src);
          Owner._renderPreviews(previewGrid);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  },

  _renderPreviews(previewGrid) {
    if (!previewGrid) return;
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
