// ff-owner.js — Ultimate Property Management Hub (Cloudinary + Advanced Data)
const Owner = {
  _uploadedImages: [],

  _cloudConfig() {
    return {
      cloudName:
        document.querySelector('meta[name="cloudinary-cloud-name"]')?.content ||
        "",
      preset:
        document.querySelector('meta[name="cloudinary-upload-preset"]')
          ?.content || "",
    };
  },

  async init() {
    await this.route();
  },

  async route() {
    const hash = window.location.hash || "#/dashboard";
    if (hash === "#/add-flat") await render(this.viewAddFlat());
    else await render(this.viewDashboard());
    this.bindEvents();
  },

  async viewDashboard() {
    const [fRes, bRes] = await Promise.all([
      apiFetch("/api/flats"),
      apiFetch("/api/bookings"),
    ]);
    const flats = fRes.success ? fRes.data : [];
    const bookings = bRes.success ? bRes.data : [];

    return `
      <div class="container page-content">
        <div class="page-header">
          <h2>Management Hub</h2>
          <a class="btn btn--primary" href="#/add-flat" data-route="/add-flat">➕ List Property</a>
        </div>

        <div class="stat-grid mt-lg">
          <div class="stat-card card">
            <p class="stat-card__label">Active Listings</p>
            <p class="stat-card__value">${flats.length}</p>
          </div>
          <div class="stat-card card">
            <p class="stat-card__label">Tenant Inquiries</p>
            <p class="stat-card__value">${bookings.length}</p>
          </div>
        </div>

        <h3 class="mt-xl">My Properties</h3>
        <div class="grid mt-sm mb-lg">
          ${
            flats.length
              ? flats
                  .map(
                    (f) => `
            <div class="card" data-id="${escHtml(f.id)}">
              <div class="flex-between">
                <h4 style="font-size:1.1rem">${escHtml(f.title)}</h4>
                <button class="badge badge--${f.available ? "success" : "neutral"} btn-toggle" style="cursor:pointer; border:none" data-avail="${f.available ? "1" : "0"}">
                  ${f.available ? "Available" : "Hidden"}
                </button>
              </div>
              <p class="text-muted mt-sm">${formatCurrency(f.rent)}/mo — ${escHtml(f.city)}</p>
              <p class="text-muted" style="font-size:0.85rem">📍 ${escHtml(f.address || "No address set")}</p>
            </div>
          `,
                  )
                  .join("")
              : '<p class="text-muted">No properties listed yet.</p>'
          }
        </div>

        <h3 class="mt-xl">Booking Requests</h3>
        <div class="grid mt-sm">
          ${
            bookings.length
              ? bookings
                  .map(
                    (b) => `
            <div class="card" data-id="${escHtml(b.id)}">
              <div class="flex-between">
                <h4 class="stat-card__label">${escHtml(b.flat_title)}</h4>
                <span class="badge badge--${b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "warning"}">${escHtml(b.status)}</span>
              </div>
              <p class="text-muted mt-sm">Tenant: <b>${escHtml(b.tenant_name)}</b></p>
              <p class="text-muted mt-sm">${formatDate(b.check_in)} — ${formatDate(b.check_out)}</p>
              ${
                b.status === "pending"
                  ? `
                <div class="mt-lg flex-between" style="gap:1rem">
                  <button class="btn btn--primary btn--sm btn-confirm" style="flex:1">Accept</button>
                  <button class="btn btn--danger btn--sm btn-cancel" style="flex:1">Decline</button>
                </div>
              `
                  : ""
              }
            </div>
          `,
                  )
                  .join("")
              : '<p class="text-muted">No booking requests found.</p>'
          }
        </div>
      </div>
    `;
  },

  viewAddFlat() {
    this._uploadedImages = [];
    return `
      <div class="container page-content">
        <a href="#/dashboard" class="back-link">← Back to Hub</a>
        <div class="card form-card" style="max-width:800px; margin-top:1rem">
          <h2>List a New Property</h2>
          <p class="text-muted mb-lg">Complete the details below to list your property for verified tenants.</p>
          
          <form id="add-flat-form">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Property Title <span class="text-danger">*</span></label>
                <input class="form-input" name="title" placeholder="e.g. Modern 2BHK in Downtown" required minlength="5" />
              </div>
              <div class="form-group">
                <label class="form-label">City <span class="text-danger">*</span></label>
                <input class="form-input" name="city" placeholder="e.g. Mumbai" required />
              </div>
              <div class="form-group">
                <label class="form-label">Monthly Rent (₹) <span class="text-danger">*</span></label>
                <input class="form-input" name="rent" type="number" placeholder="25000" required min="1" />
              </div>
              <div class="form-group">
                <label class="form-label">Security Deposit (₹)</label>
                <input class="form-input" name="deposit" type="number" placeholder="50000" min="0" />
              </div>
              <div class="form-group">
                <label class="form-label">Type <span class="text-danger">*</span></label>
                <select class="form-select" name="type" required>
                  <option value="1BHK">1BHK</option>
                  <option value="2BHK" selected>2BHK</option>
                  <option value="3BHK">3BHK</option>
                  <option value="Studio">Studio</option>
                  <option value="Penthouse">Penthouse</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Parking Availability</label>
                <select class="form-select" name="parking">
                  <option value="none">No Parking</option>
                  <option value="bike">Two Wheeler</option>
                  <option value="car">Four Wheeler</option>
                  <option value="both">Both (Car + Bike)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Full Address <span class="text-danger">*</span></label>
              <textarea class="form-textarea" name="address" rows="2" placeholder="Street name, Area, Landmarks, Pincode" required></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Description / Amenities</label>
              <textarea class="form-textarea" name="description" rows="3" placeholder="Tell tenants about the flat, society, furniture, and house rules..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Upload Property Photos</label>
              <div class="image-upload-zone" id="upload-zone" style="border: 2px dashed var(--border); padding: 3rem; text-align: center; border-radius: 0.75rem; background: rgba(0,0,0,0.02);">
                <span style="font-size:2rem">📷</span>
                <p class="mt-sm">Direct Cloud Upload Enabled</p>
                <input type="file" id="image-input" accept="image/*" multiple style="display:none" />
                <button type="button" class="btn btn--secondary btn--sm mt-sm" onclick="document.getElementById('image-input').click()">Select Images</button>
                <div id="image-preview-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:1rem; margin-top:2rem;"></div>
              </div>
            </div>

            <button class="btn btn--primary btn--full mt-xl" type="submit" id="btn-submit-flat">🚀 Publish Listing</button>
          </form>
        </div>
      </div>
    `;
  },

  bindEvents() {
    const { signal } = appState.activeController;
    const form = document.getElementById("add-flat-form");

    if (form) {
      form.addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();
          const btn = document.getElementById("btn-submit-flat");
          showLoading(btn);

          const fd = new FormData(form);
          const data = Object.fromEntries(fd);
          data.images = this._uploadedImages;

          const res = await apiFetch("/api/flats", {
            method: "POST",
            body: data,
          });
          hideLoading(btn);
          if (res.success) {
            showToast("Listing published successfully!", "success");
            window.location.hash = "#/dashboard";
          } else {
            showToast(res.message, "danger");
          }
        },
        { signal },
      );

      // Cloudinary Logic
      const imgInput = document.getElementById("image-input");
      const grid = document.getElementById("image-preview-grid");

      imgInput?.addEventListener(
        "change",
        async () => {
          const files = Array.from(imgInput.files);
          const config = this._cloudConfig();

          if (!config.cloudName || !config.preset) {
            return showToast(
              "Cloudinary config missing. Check environment variables.",
              "warning",
            );
          }

          for (const file of files) {
            const item = document.createElement("div");
            item.className = "img-preview-item";
            item.innerHTML = '<div class="spinner spinner--sm"></div>';
            grid.appendChild(item);

            const fd = new FormData();
            fd.append("file", file);
            fd.append("upload_preset", config.preset);

            try {
              const res = await fetch(
                `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
                {
                  method: "POST",
                  body: fd,
                },
              );
              const json = await res.json();
              if (json.secure_url) {
                this._uploadedImages.push(json.secure_url);
                item.innerHTML = `<img src="${json.secure_url}" style="width:100%; height:100px; object-fit:cover; border-radius:0.5rem; border:1px solid var(--border)">`;
              } else {
                item.remove();
                showToast("Upload failed", "danger");
              }
            } catch (err) {
              item.remove();
              showToast("Network error during upload", "danger");
            }
          }
        },
        { signal },
      );
    }

    // Dashboard Actions (Toggle, Confirm, Cancel)
    document.querySelectorAll(".btn-toggle").forEach((btn) => {
      btn.addEventListener(
        "click",
        async (e) => {
          const id = e.target.closest(".card").dataset.id;
          const isAvail = e.target.dataset.avail === "1";
          showLoading(btn);
          const res = await apiFetch(`/api/flats/${id}`, {
            method: "PATCH",
            body: { available: !isAvail },
          });
          if (res.success) {
            showToast("Visibility toggled");
            await this.route();
          } else {
            showToast(res.message, "danger");
            hideLoading(btn);
          }
        },
        { signal },
      );
    });

    document.querySelectorAll(".btn-confirm, .btn-cancel").forEach((btn) => {
      btn.addEventListener(
        "click",
        async (e) => {
          const id = e.target.closest(".card").dataset.id;
          const status = e.target.classList.contains("btn-confirm")
            ? "confirmed"
            : "cancelled";
          showLoading(btn);
          const res = await apiFetch(`/api/bookings/${id}`, {
            method: "PATCH",
            body: { status },
          });
          if (res.success) {
            showToast(`Inquiry ${status}`);
            await this.route();
          } else {
            showToast(res.message, "danger");
            hideLoading(btn);
          }
        },
        { signal },
      );
    });
  },
};
