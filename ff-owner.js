// ff-owner.js — Ultimate Property Management Hub (Cloudinary + Advanced UI)
const Owner = {
  _uploadedImages: [],

  _cloudConfig() {
    return {
      cloudName: "dwgyilvip",
      preset: "ffwpreset",
    };
  },

  viewDashboard() {
    const flats = appState.listings || [];
    const u = appState.currentUser || {};
    
    const rows = flats.length
      ? flats
          .map(
            (l) => `
        <tr data-id="${escHtml(l.id)}">
          <td>
            <strong>${escHtml(l.title)}</strong>
            <br><small class="text-muted">📍 ${escHtml(l.city)} · ${escHtml(l.type)}</small>
          </td>
          <td>₹${Number(l.rent).toLocaleString("en-IN")}</td>
          <td>
            <button class="badge badge--${l.available ? "success" : "neutral"} btn-toggle-flat" style="cursor:pointer; border:none" data-avail="${l.available ? "1" : "0"}">
              ${l.available ? "Available" : "Hidden"}
            </button>
          </td>
          <td>${l.created_at?.slice(0, 10) || "—"}</td>
          <td><button class="btn btn--danger btn--sm btn-del-flat">Delete</button></td>
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
            <p class="stat-card__value">${flats.length}</p>
          </div>
          <div class="stat-card card">
            <p style="font-size:1.25rem">✅</p>
            <p class="stat-card__label">Active</p>
            <p class="stat-card__value">${flats.filter((l) => l.available).length}</p>
          </div>
          <div class="stat-card card">
            <p style="font-size:1.25rem">⏸️</p>
            <p class="stat-card__label">Hidden</p>
            <p class="stat-card__value">${flats.filter((l) => !l.available).length}</p>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">My Listings</h3>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Flat</th><th>Rent</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  viewAddFlat() {
    this._uploadedImages = [];
    return `
      <div class="container page-content">
        <a class="back-link" href="#/owner/dashboard" data-route="/owner/dashboard">← Dashboard</a>
        <div class="card form-card" style="max-width:760px">
          <h2>List a New Flat</h2>
          <p class="form-card__sub">Fill in the details to publish your property instantly.</p>

          <form id="add-flat-form" novalidate>

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
                <label class="form-label">Monthly Rent (₹) *</label>
                <input class="form-input" name="rent" type="number" min="1" step="100" placeholder="20000" required />
              </div>
              <div class="form-group">
                <label class="form-label">Deposit (₹)</label>
                <input class="form-input" name="deposit" type="number" min="0" step="100" placeholder="e.g. 40000" />
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

            <!-- ── Section 2: Property Details ── -->
            <h4 class="form-section-title">🏗️ Property Details</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Floor Number</label>
                <input class="form-input" name="floor" type="number" min="0" placeholder="e.g. 3" />
              </div>
              <div class="form-group">
                <label class="form-label">Total Floors in Building</label>
                <input class="form-input" name="total_floors" type="number" min="1" placeholder="e.g. 10" />
              </div>
              <div class="form-group">
                <label class="form-label">Area (sq. ft.)</label>
                <input class="form-input" name="area_sqft" type="number" min="0" placeholder="e.g. 850" />
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

            <!-- ── Section 5: Photos (Cloudinary) ── -->
            <h4 class="form-section-title">📸 Property Photos</h4>
            <div class="form-group">
              <label class="form-label">Upload Images <span class="text-muted">(Direct Cloudinary Upload)</span></label>
              <div class="image-upload-zone" id="image-upload-zone">
                <input type="file" id="image-input" accept="image/*" multiple style="display:none" />
                <div class="image-upload-zone__inner" id="img-drop-area" onclick="document.getElementById('image-input').click()">
                  <span style="font-size:2rem">📷</span>
                  <p>Click here to browse photos</p>
                </div>
                <div id="image-preview-grid" class="img-preview-grid"></div>
              </div>
            </div>

            <div id="add-flat-error" class="form-error hidden mt-lg"></div>
            <button class="btn btn--primary mt-lg" type="submit" id="add-flat-submit" style="width: 100%;">🚀 Publish Listing</button>
          </form>
        </div>
      </div>`;
  },

  viewProfile() {
    const u = appState.currentUser || {};
    return `
      <div class="container page-content">
        <div class="page-header">
          <h2>My Profile</h2>
          <a class="btn btn--secondary" href="#/owner/dashboard" data-route="/owner/dashboard">← Dashboard</a>
        </div>
        <div class="card form-card" style="max-width:640px">
          <h3 class="card-title">👤 Personal Information</h3>
          <form id="profile-form" novalidate>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input class="form-input" name="name" type="text"
                  value="${escHtml(u.name || "")}" required />
              </div>
            </div>

            <h4 class="form-section-title" style="margin-top:var(--space-md)">📞 Contact Details</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input class="form-input" name="phone" type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value="${escHtml(u.phone || "")}" />
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
                  placeholder="Leave blank to keep current" minlength="8" autocomplete="new-password" />
              </div>
              <div class="form-group">
                <label class="form-label">Confirm Password</label>
                <input class="form-input" name="confirm_password" type="password"
                  placeholder="Repeat new password" autocomplete="new-password" />
              </div>
            </div>

            <div id="profile-error" class="form-error hidden"></div>
            <button class="btn btn--primary mt-lg" type="submit" id="profile-submit">Save Changes</button>
          </form>
        </div>
      </div>`;
  },

  bindEvents(root) {
    const profileForm = root.querySelector("#profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(profileForm);
        const newPass = fd.get("new_password");
        const confirmPass = fd.get("confirm_password");
        const errEl = root.querySelector("#profile-error");

        if (newPass && newPass !== confirmPass) {
          if (errEl) { errEl.textContent = "Passwords do not match."; errEl.classList.remove("hidden"); }
          return;
        }
        if (errEl) errEl.classList.add("hidden");

        const payload = {
          name: fd.get("name")?.trim(),
          phone: fd.get("phone")?.trim() || "",
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
    }

    const addFlatForm = root.querySelector("#add-flat-form");
    if (addFlatForm) {
      addFlatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = root.querySelector("#add-flat-submit");
        const errEl = root.querySelector("#add-flat-error");
        
        const fd = new FormData(addFlatForm);
        const data = Object.fromEntries(fd);
        
        // Validation
        if (!data.title || !data.city || !data.rent || !data.type || !data.address) {
          if (errEl) { errEl.textContent = "Please fill in all required fields (*)."; errEl.classList.remove("hidden"); }
          showToast("Please fill in all required fields.", "error");
          return;
        }
        if (errEl) errEl.classList.add("hidden");

        btn.disabled = true;
        btn.textContent = "Submitting...";

        data.amenities = (data.amenities || "").split(",").map(s => s.trim()).filter(Boolean);
        data.images = this._uploadedImages;

        const res = await apiFetch("/api/flats", {
          method: "POST",
          body: data,
        });

        btn.disabled = false;
        btn.textContent = "🚀 Publish Listing";

        if (res.success) {
          showToast("Listing published successfully!", "success");
          window.location.hash = "#/owner/dashboard";
        } else {
          showToast(res.message, "error");
        }
      });

      // Cloudinary Logic
      const imgInput = root.querySelector("#image-input");
      const grid = root.querySelector("#image-preview-grid");

      imgInput?.addEventListener("change", async () => {
        const files = Array.from(imgInput.files);
        const config = this._cloudConfig();

        if (!config.cloudName || !config.preset) {
          return showToast("Cloudinary config missing. Check environment variables.", "warning");
        }

        for (const file of files) {
          const item = document.createElement("div");
          item.className = "img-preview-item";
          item.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:0.8rem;color:#64748b">Uploading...</div>';
          grid.appendChild(item);

          const fd = new FormData();
          fd.append("file", file);
          fd.append("upload_preset", config.preset);

          try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
              method: "POST",
              body: fd,
            });
            const json = await res.json();
            if (json.secure_url) {
              this._uploadedImages.push(json.secure_url);
              item.innerHTML = \`<img src="\${json.secure_url}" />\`;
            } else {
              item.remove();
              showToast("Upload failed", "error");
            }
          } catch (err) {
            item.remove();
            showToast("Network error during upload", "error");
          }
        }
      });
    }

    // Dashboard Actions (Toggle, Delete)
    root.addEventListener("click", async (e) => {
      const btnToggle = e.target.closest(".btn-toggle-flat");
      if (btnToggle) {
        const id = e.target.closest("tr").dataset.id;
        const isAvail = btnToggle.dataset.avail === "1";
        btnToggle.disabled = true;
        const res = await apiFetch(\`/api/flats/\${id}\`, {
          method: "PATCH",
          body: { available: !isAvail },
        });
        btnToggle.disabled = false;
        if (res.success) {
          showToast("Visibility toggled", "success");
          const r = await apiFetch("/api/flats");
          if (r.success) appState.listings = r.data;
          render(Owner.viewDashboard());
        } else {
          showToast(res.message, "error");
        }
        return;
      }

      const btnDel = e.target.closest(".btn-del-flat");
      if (btnDel) {
        if (!confirm("Delete this listing permanently?")) return;
        const id = e.target.closest("tr").dataset.id;
        btnDel.disabled = true;
        const res = await apiFetch(\`/api/flats/\${id}\`, { method: "DELETE" });
        if (res.success) {
          showToast("Listing deleted", "success");
          const r = await apiFetch("/api/flats");
          if (r.success) appState.listings = r.data;
          render(Owner.viewDashboard());
        } else {
          showToast(res.message, "error");
          btnDel.disabled = false;
        }
        return;
      }
    });
  },
};
