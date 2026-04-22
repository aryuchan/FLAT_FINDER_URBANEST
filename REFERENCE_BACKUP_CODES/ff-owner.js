//final maybe
// // ff-owner.js — FlatFinder Owner Module
// Views: Dashboard · Add Flat (Cloudinary image upload) · Profile
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

const Owner = {
  // ── Internal image state ──────────────────────────────────────
  // Each entry: { url: <cloudinary URL>, publicId: <string> }
  _uploadedImages: [],
  _uploading: false,

  // ── Cloudinary config (read from <meta> tags injected by server) ──
  _cloudName() {
    return (
      document.querySelector('meta[name="cloudinary-cloud-name"]')?.content ||
      ""
    );
  },
  _uploadPreset() {
    return (
      document.querySelector('meta[name="cloudinary-upload-preset"]')
        ?.content || ""
    );
  },

  // ── DASHBOARD ─────────────────────────────────────────────────
  viewDashboard() {
    const u = appState.currentUser;
    const listings = appState.listings || [];
    const bookings = appState.bookings || [];

    const approved = listings.filter((l) => l.status === "approved").length;
    const pending = listings.filter((l) => l.status === "pending").length;
    const rejected = listings.filter((l) => l.status === "rejected").length;

    const hasContact = u.phone || u.whatsapp || u.telegram;
    const contactNudge = !hasContact
      ? `
      <div class="nudge-banner" role="status">
        <span>💡 Add contact details so tenants can reach you directly.</span>
        <a class="btn btn--sm btn--secondary" href="#/owner/profile" data-route="/owner/profile">Update Profile →</a>
      </div>`
      : "";

    const listingRows = listings.length
      ? listings
          .map((l) => {
            const cover =
              Array.isArray(l.images) && l.images.length
                ? `<img class="listing-thumb" src="${escHtml(l.images[0])}" alt="${escHtml(l.flat_title)}" loading="lazy" onerror="this.style.display='none'" />`
                : "";
            return `
          <tr>
            <td>
              <div class="td--flat">
                ${cover}
                <div class="listing-cell-info">
                  <strong>${escHtml(l.flat_title)}</strong>
                  <small class="text-muted">📍 ${escHtml(l.city)} · ${escHtml(l.type)}</small>
                </div>
              </div>
            </td>
            <td>₹${Number(l.rent).toLocaleString("en-IN")}</td>
            <td>
              <span class="badge badge--${l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"}">
                ${l.status}
              </span>
              ${
                l.status === "rejected" && l.rejection_reason
                  ? `<p class="text-muted" style="font-size:0.75rem;margin-top:2px">${escHtml(l.rejection_reason)}</p>`
                  : ""
              }
            </td>
            <td>${l.submitted_at?.slice(0, 10) || "—"}</td>
            <td>${l.reviewer_name ? escHtml(l.reviewer_name) : "—"}</td>
            <td>
              <button class="btn btn--sm btn--danger" data-action="delete-flat" data-flat-id="${escHtml(l.flat_id)}"
                aria-label="Delete ${escHtml(l.flat_title)}">🗑 Delete</button>
            </td>
          </tr>`;
          })
          .join("")
      : `<tr><td colspan="6" class="empty-cell">
           No listings yet. <a href="#/owner/add-flat" data-route="/owner/add-flat">Add your first flat →</a>
         </td></tr>`;

    const bookingRows = bookings.length
      ? bookings
          .map(
            (b) => `
          <tr>
            <td>
              <strong>${escHtml(b.flat_title)}</strong>
              <br><small class="text-muted">${escHtml(b.tenant_name)} · ${escHtml(b.tenant_email)}</small>
            </td>
            <td>${b.check_in} → ${b.check_out}</td>
            <td>₹${Number(b.total_rent).toLocaleString("en-IN")}</td>
            <td>
              <span class="badge badge--${b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "warning"}">
                ${b.status}
              </span>
            </td>
            <td>
              ${
                b.status === "pending"
                  ? `<button class="btn btn--sm btn--primary"  data-action="confirm-booking" data-booking-id="${b.id}">✅ Confirm</button>
                   <button class="btn btn--sm btn--danger"   data-action="cancel-booking"  data-booking-id="${b.id}">❌ Cancel</button>`
                  : "—"
              }
            </td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" class="empty-cell">No bookings yet.</td></tr>`;

    return `
      <div class="container page-content">
        ${contactNudge}
        <div class="page-header">
          <h2>Owner Dashboard</h2>
          <a class="btn btn--primary" href="#/owner/add-flat" data-route="/owner/add-flat">➕ Add Flat</a>
        </div>

        <div class="stat-grid stat-grid--sm">
          <div class="stat-card card">
            <p style="font-size:1.25rem" aria-hidden="true">🏠</p>
            <p class="stat-card__label">Total Listings</p>
            <p class="stat-card__value">${listings.length}</p>
          </div>
          <div class="stat-card card">
            <p style="font-size:1.25rem" aria-hidden="true">✅</p>
            <p class="stat-card__label">Approved</p>
            <p class="stat-card__value">${approved}</p>
          </div>
          <div class="stat-card card">
            <p style="font-size:1.25rem" aria-hidden="true">⏳</p>
            <p class="stat-card__label">Pending</p>
            <p class="stat-card__value">${pending}</p>
          </div>
          <div class="stat-card card">
            <p style="font-size:1.25rem" aria-hidden="true">❌</p>
            <p class="stat-card__label">Rejected</p>
            <p class="stat-card__value">${rejected}</p>
          </div>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
          <h3 class="card-title">My Listings</h3>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Flat</th>
                  <th scope="col">Rent</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Reviewed By</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>${listingRows}</tbody>
            </table>
          </div>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
          <h3 class="card-title">Incoming Bookings</h3>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Flat / Tenant</th>
                  <th scope="col">Dates</th>
                  <th scope="col">Total Rent</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>${bookingRows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  // ── ADD FLAT ──────────────────────────────────────────────────
  viewAddFlat() {
    Owner._uploadedImages = []; // Reset on each render — prevents stale uploads from a prior session
    const u = appState.currentUser;
    const today = new Date().toISOString().split("T")[0];

    return `
      <div class="container page-content">
        <a class="back-link" href="#/owner/dashboard" data-route="/owner/dashboard">← Dashboard</a>
        <div class="card form-card" style="max-width:800px">
          <h2>List a New Flat</h2>
          <p class="form-card__sub">Fill in the details. An admin will review and approve your listing.</p>

          <form id="add-flat-form" novalidate>

            <!-- ── Section 1: Basic Details ──────────────────── -->
            <h4 class="form-section-title">📋 Basic Details</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="ff-title">Title <span aria-hidden="true">*</span></label>
                <input class="form-input" id="ff-title" name="title" type="text"
                  placeholder="2BHK in Koregaon Park"
                  required minlength="3" maxlength="200"
                  autocomplete="off" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-city">City <span aria-hidden="true">*</span></label>
                <input class="form-input" id="ff-city" name="city" type="text"
                  placeholder="Pune"
                  required minlength="2" maxlength="100"
                  autocomplete="address-level2" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-address">Full Address</label>
                <input class="form-input" id="ff-address" name="address" type="text"
                  placeholder="Street, Area, Landmark" maxlength="300"
                  autocomplete="street-address" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-rent">Monthly Rent (₹) <span aria-hidden="true">*</span></label>
                <input class="form-input" id="ff-rent" name="rent" type="number"
                  min="1" step="100" placeholder="20000"
                  required inputmode="numeric" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-type">Type <span aria-hidden="true">*</span></label>
                <select class="form-select" id="ff-type" name="type" required>
                  <option value="">Select type…</option>
                  <option>1BHK</option>
                  <option>2BHK</option>
                  <option>3BHK</option>
                  <option>Studio</option>
                  <option>4BHK+</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-furnished">Furnished</label>
                <select class="form-select" id="ff-furnished" name="furnished">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-available-from">Available From</label>
                <input class="form-input" id="ff-available-from" name="available_from"
                  type="date" min="${today}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-deposit">Deposit (₹)</label>
                <input class="form-input" id="ff-deposit" name="deposit"
                  type="number" min="0" step="100" placeholder="e.g. 40000"
                  inputmode="numeric" />
              </div>
            </div>

            <!-- ── Section 2: Property Details ──────────────── -->
            <h4 class="form-section-title">🏗️ Property Details</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="ff-floor">Floor Number</label>
                <input class="form-input" id="ff-floor" name="floor"
                  type="number" min="0" max="200" placeholder="e.g. 3"
                  inputmode="numeric" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-total-floors">Total Floors in Building</label>
                <input class="form-input" id="ff-total-floors" name="total_floors"
                  type="number" min="1" max="200" placeholder="e.g. 10"
                  inputmode="numeric" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-area">Area (sq. ft.)</label>
                <input class="form-input" id="ff-area" name="area_sqft"
                  type="number" min="0" placeholder="e.g. 850"
                  inputmode="numeric" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-bathrooms">Bathrooms</label>
                <select class="form-select" id="ff-bathrooms" name="bathrooms">
                  <option value="">Select…</option>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4+</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-parking">Parking</label>
                <select class="form-select" id="ff-parking" name="parking">
                  <option value="none">None</option>
                  <option value="bike">Bike</option>
                  <option value="car">Car</option>
                  <option value="both">Bike + Car</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-facing">Facing Direction</label>
                <select class="form-select" id="ff-facing" name="facing">
                  <option value="">Select…</option>
                  <option>North</option>
                  <option>South</option>
                  <option>East</option>
                  <option>West</option>
                  <option>North-East</option>
                  <option>North-West</option>
                  <option>South-East</option>
                  <option>South-West</option>
                </select>
              </div>
            </div>

            <!-- ── Section 3: Preferences & Rules ───────────── -->
            <h4 class="form-section-title">📜 Preferences &amp; Rules</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="ff-pref-tenants">Preferred Tenants</label>
                <select class="form-select" id="ff-pref-tenants" name="preferred_tenants">
                  <option value="any">Any</option>
                  <option value="family">Family</option>
                  <option value="bachelors">Bachelors</option>
                  <option value="working_women">Working Women</option>
                  <option value="students">Students</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-food">Food Preference</label>
                <select class="form-select" id="ff-food" name="food_preference">
                  <option value="any">Any</option>
                  <option value="veg">Vegetarian Only</option>
                  <option value="nonveg">Non-Veg OK</option>
                </select>
              </div>
            </div>
            <div class="checkbox-row">
              <label class="checkbox-label">
                <input type="checkbox" name="pets_allowed" value="1" /> 🐾 Pets Allowed
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="smoking_allowed" value="1" /> 🚬 Smoking Allowed
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="visitors_allowed" value="1" /> 👥 Visitors Allowed
              </label>
            </div>

            <!-- ── Section 4: Description & Amenities ────────── -->
            <h4 class="form-section-title">📝 Description</h4>
            <div class="form-group">
              <label class="form-label" for="ff-desc">Description</label>
              <textarea class="form-textarea" id="ff-desc" name="description"
                rows="3" maxlength="2000"
                placeholder="Describe the flat — location highlights, nearby facilities, house rules…"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="ff-amenities">
                Amenities <span class="text-muted">(comma-separated)</span>
              </label>
              <input class="form-input" id="ff-amenities" name="amenities" type="text"
                placeholder="WiFi, AC, Geyser, Lift, Gym, CCTV, Washing Machine…"
                maxlength="400" />
            </div>
            <div class="form-group">
              <label class="form-label" for="ff-landmarks">Nearby Landmarks</label>
              <input class="form-input" id="ff-landmarks" name="landmarks" type="text"
                placeholder="2 min walk to Metro, Near Phoenix Mall…"
                maxlength="400" />
            </div>

            <!-- ── Section 5: Photos ──────────────────────────── -->
            <h4 class="form-section-title">📸 Property Photos</h4>
            <div class="form-group">
              <p class="form-label" id="img-upload-label">
                Upload Images <span class="text-muted">(up to 8 · JPG, PNG, WEBP · max 5 MB each)</span>
              </p>
              <div class="image-upload-zone" id="image-upload-zone"
                role="region" aria-labelledby="img-upload-label">
                <input type="file" id="flat-images-input" name="images_native"
                  accept="image/jpeg,image/png,image/webp" multiple
                  aria-label="Select property photos"
                  style="display:none" />
                <div class="image-upload-zone__inner" id="img-drop-area"
                  role="button" tabindex="0"
                  aria-label="Drag and drop photos here, or press Enter to browse">
                  <span style="font-size:2rem" aria-hidden="true">📷</span>
                  <p>Drag &amp; drop photos here, or
                    <button type="button" class="btn-link" id="img-browse-btn">browse files</button>
                  </p>
                  <p class="text-muted" style="font-size:0.75rem">JPG, PNG, WEBP — up to 5 MB each</p>
                </div>
                <div id="img-upload-progress" class="img-upload-progress hidden" role="status" aria-live="polite"></div>
                <div id="img-preview-grid" class="img-preview-grid" aria-label="Uploaded photos"></div>
              </div>
            </div>

            <!-- ── Section 6: Contact Details ─────────────────── -->
            <h4 class="form-section-title">📞 Contact Details for Tenants</h4>
            <p class="text-muted" style="font-size:0.85rem;margin-bottom:var(--space-md)">
              Shown to tenants who view your listing. Fill in what you're comfortable sharing.
            </p>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="ff-c-phone">Contact Phone</label>
                <input class="form-input" id="ff-c-phone" name="contact_phone" type="tel"
                  placeholder="+91 XXXXX XXXXX" maxlength="20"
                  autocomplete="tel"
                  value="${escHtml(u.phone || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-c-whatsapp">WhatsApp Number</label>
                <input class="form-input" id="ff-c-whatsapp" name="contact_whatsapp" type="tel"
                  placeholder="+91 XXXXX XXXXX" maxlength="20"
                  value="${escHtml(u.whatsapp || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-c-email">
                  Contact Email <span class="text-muted">(optional)</span>
                </label>
                <input class="form-input" id="ff-c-email" name="contact_email" type="email"
                  placeholder="your@email.com" maxlength="255"
                  autocomplete="email"
                  value="${escHtml(u.email || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-c-telegram">
                  Telegram Username <span class="text-muted">(optional)</span>
                </label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix" aria-hidden="true">@</span>
                  <input class="form-input input-with-prefix" id="ff-c-telegram"
                    name="contact_telegram" type="text"
                    placeholder="yourusername" maxlength="80"
                    value="${escHtml(u.telegram || "")}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-best-time">Best Time to Call</label>
                <select class="form-select" id="ff-best-time" name="best_time_to_call">
                  <option value="">Anytime</option>
                  <option>Morning (8 AM – 12 PM)</option>
                  <option>Afternoon (12 PM – 4 PM)</option>
                  <option>Evening (4 PM – 8 PM)</option>
                  <option>Night (8 PM – 10 PM)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="ff-pref-contact">Preferred Contact Method</label>
                <select class="form-select" id="ff-pref-contact" name="preferred_contact">
                  <option value="">No preference</option>
                  <option value="phone">Phone Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="ff-owner-note">Short Note for Tenants</label>
              <textarea class="form-textarea" id="ff-owner-note" name="owner_note"
                rows="2" maxlength="500"
                placeholder="e.g. Please call before visiting. Brokerage free. Serious enquiries only."></textarea>
            </div>

            <div id="add-flat-error" class="form-error hidden" role="alert" aria-live="polite"></div>
            <button class="btn btn--primary btn--full" type="submit" id="add-flat-submit">
              Submit for Review
            </button>
          </form>
        </div>
      </div>`;
  },

  // ── OWNER PROFILE ─────────────────────────────────────────────
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
          <form id="profile-form" novalidate autocomplete="on">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="pf-name">Full Name</label>
                <input class="form-input" id="pf-name" name="name" type="text"
                  value="${escHtml(u.name || "")}"
                  required minlength="2" maxlength="120"
                  autocomplete="name" />
              </div>
              <div class="form-group">
                <label class="form-label" for="pf-email">Email</label>
                <input class="form-input" id="pf-email" name="email" type="email"
                  value="${escHtml(u.email || "")}"
                  required maxlength="255"
                  autocomplete="email" />
              </div>
            </div>

            <h4 class="form-section-title" style="margin-top:var(--space-md)">📞 Contact Details</h4>
            <p class="text-muted" style="font-size:0.85rem;margin-bottom:var(--space-md)">
              Saved to your profile and auto-filled when you add a flat.
            </p>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="pf-phone">Phone Number</label>
                <input class="form-input" id="pf-phone" name="phone" type="tel"
                  placeholder="+91 XXXXX XXXXX" maxlength="20"
                  value="${escHtml(u.phone || "")}"
                  autocomplete="tel" />
              </div>
              <div class="form-group">
                <label class="form-label" for="pf-whatsapp">WhatsApp</label>
                <input class="form-input" id="pf-whatsapp" name="whatsapp" type="tel"
                  placeholder="+91 XXXXX XXXXX" maxlength="20"
                  value="${escHtml(u.whatsapp || "")}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="pf-telegram">
                  Telegram Username <span class="text-muted">(optional)</span>
                </label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix" aria-hidden="true">@</span>
                  <input class="form-input input-with-prefix" id="pf-telegram"
                    name="telegram" type="text"
                    placeholder="yourusername" maxlength="80"
                    value="${escHtml(u.telegram || "")}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="pf-location">City / Location</label>
                <input class="form-input" id="pf-location" name="location" type="text"
                  placeholder="Pune, Maharashtra" maxlength="120"
                  value="${escHtml(u.location || "")}"
                  autocomplete="address-level2" />
              </div>
              <div class="form-group">
                <label class="form-label" for="pf-languages">Languages Spoken</label>
                <input class="form-input" id="pf-languages" name="languages" type="text"
                  placeholder="English, Hindi, Marathi" maxlength="200"
                  value="${escHtml(u.languages || "")}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="pf-bio">
                About You <span class="text-muted">(shown to tenants)</span>
              </label>
              <textarea class="form-textarea" id="pf-bio" name="bio" rows="3"
                maxlength="1000"
                placeholder="A short bio — experience as a landlord, response time, etc.">${escHtml(u.bio || "")}</textarea>
            </div>

            <h4 class="form-section-title" style="margin-top:var(--space-md)">🔒 Change Password</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="pf-new-pw">New Password</label>
                <input class="form-input" id="pf-new-pw" name="new_password" type="password"
                  placeholder="Leave blank to keep current"
                  minlength="6" maxlength="128"
                  autocomplete="new-password" />
              </div>
              <div class="form-group">
                <label class="form-label" for="pf-confirm-pw">Confirm Password</label>
                <input class="form-input" id="pf-confirm-pw" name="confirm_password" type="password"
                  placeholder="Repeat new password"
                  maxlength="128"
                  autocomplete="new-password" />
              </div>
            </div>

            <div id="profile-error" class="form-error hidden" role="alert" aria-live="polite"></div>
            <button class="btn btn--primary" type="submit" id="profile-submit">Save Changes</button>
          </form>
        </div>
      </div>`;
  },

  // ── EVENT BINDERS ────────────────────────────────────────────
  bindEvents(root) {
    this._bindDashboardActions(root);
    this._bindAddFlatForm(root);
    this._bindImageUpload(root);
    this._bindProfileForm(root);
  },

  // ── Dashboard: delete flat + booking confirm/cancel ──────────
  _bindDashboardActions(root) {
    root.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === "delete-flat") {
        const flatId = btn.dataset.flatId;
        if (
          !flatId ||
          !confirm("Permanently delete this listing and all its data?")
        )
          return;
        btn.disabled = true;
        const r = await apiFetch(`/api/flats/${flatId}`, { method: "DELETE" });
        btn.disabled = false;
        if (r.success) {
          showToast("Flat deleted.", "info");
          const [lr, br] = await Promise.all([
            apiFetch("/api/listings"),
            apiFetch("/api/bookings"),
          ]);
          if (lr.success) appState.listings = lr.data;
          if (br.success) appState.bookings = br.data;
          render(Owner.viewDashboard());
        } else {
          showToast(r.message || "Delete failed.", "error");
        }
      }

      if (action === "confirm-booking") {
        const bId = btn.dataset.bookingId;
        if (!bId) return;
        btn.disabled = true;
        const r = await apiFetch(`/api/bookings/${bId}`, {
          method: "PATCH",
          body: { status: "confirmed" },
        });
        btn.disabled = false;
        if (r.success) {
          showToast("Booking confirmed!", "success");
          const br = await apiFetch("/api/bookings");
          if (br.success) appState.bookings = br.data;
          render(Owner.viewDashboard());
        } else showToast(r.message, "error");
      }

      if (action === "cancel-booking") {
        const bId = btn.dataset.bookingId;
        if (!bId || !confirm("Cancel this booking?")) return;
        btn.disabled = true;
        const r = await apiFetch(`/api/bookings/${bId}`, {
          method: "PATCH",
          body: { status: "cancelled" },
        });
        btn.disabled = false;
        if (r.success) {
          showToast("Booking cancelled.", "warning");
          const br = await apiFetch("/api/bookings");
          if (br.success) appState.bookings = br.data;
          render(Owner.viewDashboard());
        } else showToast(r.message, "error");
      }
    });
  },

  // ── Add Flat form submit ─────────────────────────────────────
  _bindAddFlatForm(root) {
    const form = root.querySelector("#add-flat-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const errEl = root.querySelector("#add-flat-error");
      const btn = root.querySelector("#add-flat-submit");

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (Owner._uploading) {
        showToast("Please wait — images are still uploading.", "warning");
        return;
      }

      if (errEl) {
        errEl.textContent = "";
        errEl.classList.add("hidden");
      }

      const fd = new FormData(form);

      const amenities = (fd.get("amenities") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

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
        pets_allowed: form.querySelector('[name="pets_allowed"]')?.checked
          ? 1
          : 0,
        smoking_allowed: form.querySelector('[name="smoking_allowed"]')?.checked
          ? 1
          : 0,
        visitors_allowed: form.querySelector('[name="visitors_allowed"]')
          ?.checked
          ? 1
          : 0,
        landmarks: fd.get("landmarks")?.trim() || "",
        contact_phone: fd.get("contact_phone")?.trim() || "",
        contact_whatsapp: fd.get("contact_whatsapp")?.trim() || "",
        contact_email: fd.get("contact_email")?.trim() || "",
        contact_telegram: (fd.get("contact_telegram")?.trim() || "").replace(
          /^@/,
          "",
        ),
        preferred_contact: fd.get("preferred_contact") || "",
        best_time_to_call: fd.get("best_time_to_call") || "",
        owner_note: fd.get("owner_note")?.trim() || "",
        images: Owner._uploadedImages.map((i) => i.url),
        image_public_ids: Owner._uploadedImages.map((i) => i.publicId),
      };

      btn.disabled = true;
      btn.textContent = "Submitting…";

      const r = await apiFetch("/api/flats", { method: "POST", body: payload });

      btn.disabled = false;
      btn.textContent = "Submit for Review";

      if (r.success) {
        Owner._uploadedImages = [];
        showToast("Flat submitted for review!", "success");
        window.location.hash = "#/owner/dashboard";
      } else {
        const msg = r.message || "Submission failed.";
        if (errEl) {
          errEl.textContent = msg;
          errEl.classList.remove("hidden");
        }
        showToast(msg, "error");
      }
    });
  },

  // ── Image upload (Cloudinary unsigned) ───────────────────────
  _bindImageUpload(root) {
    const zone = root.querySelector("#image-upload-zone");
    if (!zone) return;

    const input = root.querySelector("#flat-images-input");
    const dropArea = root.querySelector("#img-drop-area");
    const grid = root.querySelector("#img-preview-grid");
    const progress = root.querySelector("#img-upload-progress");

    root
      .querySelector("#img-browse-btn")
      ?.addEventListener("click", () => input?.click());

    dropArea?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input?.click();
      }
    });

    input?.addEventListener("change", () => {
      Owner._processFiles(Array.from(input.files), grid, progress);
      input.value = "";
    });

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
      Owner._processFiles(Array.from(e.dataTransfer.files), grid, progress);
    });

    grid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".img-preview-item__remove");
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      if (isNaN(idx)) return;
      Owner._uploadedImages.splice(idx, 1);
      Owner._rerenderGrid(grid);
    });
  },

  async _processFiles(files, grid, progress) {
    const MAX_FILES = 8;
    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

    const cloudName = Owner._cloudName()?.trim();
    const uploadPreset = Owner._uploadPreset()?.trim();

    // Guard against un-injected or missing Cloudinary config
    if (
      !cloudName ||
      cloudName.includes("{{") ||
      !uploadPreset ||
      uploadPreset.includes("{{")
    ) {
      showToast(
        "Image uploads are not configured. Set Cloudinary env vars and redeploy.",
        "warning",
      );
      return;
    }

    const toUpload = [];
    for (const file of files) {
      if (Owner._uploadedImages.length + toUpload.length >= MAX_FILES) {
        showToast(`Max ${MAX_FILES} images allowed.`, "warning");
        break;
      }
      if (!ALLOWED.includes(file.type)) {
        showToast(
          `${file.name}: unsupported format. Use JPG, PNG, or WEBP.`,
          "error",
        );
        continue;
      }
      if (file.size > MAX_SIZE) {
        showToast(`${file.name} exceeds 5 MB.`, "error");
        continue;
      }
      toUpload.push(file);
    }

    if (!toUpload.length) return;

    Owner._uploading = true;
    if (progress) {
      progress.textContent = `Uploading ${toUpload.length} image${
        toUpload.length > 1 ? "s" : ""
      }…`;
      progress.classList.remove("hidden");
    }

    const uploads = toUpload.map(async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: fd,
          },
        );

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            data?.error?.message ||
              data?.message ||
              res.statusText ||
              "Upload failed",
          );
        }
        if (!data?.secure_url || !data?.public_id) {
          throw new Error(data?.error?.message || "Upload failed");
        }

        return { url: data.secure_url, publicId: data.public_id };
      } catch (err) {
        showToast(`${file.name}: ${err.message}`, "error");
        return null;
      }
    });

    const results = await Promise.all(uploads);
    Owner._uploadedImages.push(...results.filter(Boolean));

    Owner._uploading = false;
    if (progress) progress.classList.add("hidden");

    Owner._rerenderGrid(grid);
  },

  _rerenderGrid(grid) {
    if (!grid) return;
    grid.innerHTML = "";
    Owner._uploadedImages.forEach(({ url }, i) => {
      const item = document.createElement("div");
      item.className = "img-preview-item";
      item.innerHTML = `
        <img src="${escHtml(url)}" alt="Property photo ${i + 1}" loading="lazy"
          onerror="this.src='';this.alt='Load error'" />
        ${i === 0 ? '<span class="img-preview-item__main-badge">Cover</span>' : ""}
        <button type="button" class="img-preview-item__remove"
          data-idx="${i}" aria-label="Remove photo ${i + 1}">×</button>`;
      grid.appendChild(item);
    });
  },

  // ── Profile form submit ──────────────────────────────────────
  _bindProfileForm(root) {
    const form = root.querySelector("#profile-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const errEl = root.querySelector("#profile-error");
      const btn = root.querySelector("#profile-submit");

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const fd = new FormData(form);
      const newPass = fd.get("new_password") || "";
      const confirmPw = fd.get("confirm_password") || "";

      if (newPass && newPass !== confirmPw) {
        const msg = "Passwords do not match.";
        if (errEl) {
          errEl.textContent = msg;
          errEl.classList.remove("hidden");
        }
        showToast(msg, "error");
        return;
      }
      if (errEl) errEl.classList.add("hidden");

      const payload = {
        name: fd.get("name")?.trim(),
        email: fd.get("email")?.trim(),
        phone: fd.get("phone")?.trim() || "",
        whatsapp: fd.get("whatsapp")?.trim() || "",
        telegram: (fd.get("telegram")?.trim() || "").replace(/^@/, ""),
        location: fd.get("location")?.trim() || "",
        languages: fd.get("languages")?.trim() || "",
        bio: fd.get("bio")?.trim() || "",
        ...(newPass ? { password: newPass } : {}),
      };

      btn.disabled = true;
      btn.textContent = "Saving…";

      const r = await apiFetch("/api/me", { method: "PATCH", body: payload });

      btn.disabled = false;
      btn.textContent = "Save Changes";

      if (r.success) {
        Object.assign(appState.currentUser, r.data ?? payload);
        renderNavBar();
        showToast("Profile updated successfully!", "success");
      } else {
        const msg = r.message || "Update failed.";
        if (errEl) {
          errEl.textContent = msg;
          errEl.classList.remove("hidden");
        }
        showToast(msg, "error");
      }
    });
  },
};
