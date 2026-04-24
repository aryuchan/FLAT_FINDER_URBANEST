// ff-tenant.js — FlatFinder Tenant Module
// Views: Dashboard · Search · Flat Details · Booking
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

const Tenant = {
  viewDashboard() {
    const rows = appState.bookings.length
      ? appState.bookings
          .map(
            (b) => `
        <tr>
          <td>
            <strong>${escHtml(b.flat_title)}</strong>
            <br><small class="text-muted">📍 ${escHtml(b.city)}</small>
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
                ? `<button class="btn btn--danger btn--sm" data-action="cancel-booking" data-booking-id="${b.id}">Cancel</button>`
                : "—"
            }
          </td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" class="empty-cell">
          No bookings yet. <a href="#/tenant/search" data-route="/tenant/search">Search flats →</a>
         </td></tr>`;

    return `
      <div class="container page-content">
        <div class="page-header">
          <h2>Welcome back, ${escHtml(appState.currentUser.name.split(" ")[0])} 👋</h2>
          <a class="btn btn--primary" href="#/tenant/search" data-route="/tenant/search">🔍 Search Flats</a>
        </div>
        <div class="card">
          <h3 class="card-title">My Bookings</h3>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Flat</th><th>Dates</th><th>Total Rent</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  viewSearch(flats = appState.flats) {
    const cards = flats.length
      ? flats
          .map(
            (f) => `
        <div class="flat-card card">
          <div class="flat-card__header">
            <span class="badge badge--neutral">${escHtml(f.type)}</span>
            ${
              f.furnished
                ? '<span class="badge badge--success">Furnished</span>'
                : '<span class="badge badge--neutral">Unfurnished</span>'
            }
          </div>
          ${
            f.images && f.images.length
              ? `<div class="flat-card__img-wrap">
                   <img class="flat-card__img" src="${escHtml(f.images[0])}" alt="${escHtml(f.title || f.flat_title || '')}" loading="lazy" onerror="this.style.display='none'" />
                 </div>`
              : ""
          }
          <h3 class="flat-card__title">${escHtml(f.title || f.flat_title || '')}</h3>
          <p class="flat-card__city">📍 ${escHtml(f.city)}</p>
          <p class="flat-card__rent">₹${Number(f.rent).toLocaleString("en-IN")}<span>/mo</span></p>
          <p class="text-muted" style="font-size:0.8rem">Owner: ${escHtml(f.owner_name || "N/A")}</p>
          <a class="btn btn--primary btn--sm mt-sm" href="#/tenant/flat/${f.id}" data-route="/tenant/flat/${f.id}">
            View Details →
          </a>
        </div>`,
          )
          .join("")
      : `<div class="empty-state">
          <p style="font-size:2rem">🏚️</p>
          <p>No flats match your filters.</p>
          <p class="text-muted">Try adjusting your search criteria.</p>
         </div>`;

    return `
      <div class="container page-content">
        <div class="page-header"><h2>Search Flats</h2></div>
        <form id="flat-search-filter-form" class="filter-bar card" onsubmit="return false;">
          <input class="form-input" name="city" placeholder="City…" />
          <select class="form-select" name="type">
            <option value="">All Types</option>
            <option value="1BHK">1BHK</option>
            <option value="2BHK">2BHK</option>
            <option value="3BHK">3BHK</option>
            <option value="Studio">Studio</option>
            <option value="4BHK+">4BHK+</option>
          </select>
          <select class="form-select" name="furnished">
            <option value="">Furnished?</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
          <input class="form-input" name="min_rent" type="text" inputmode="numeric" placeholder="Min ₹" />
          <input class="form-input" name="max_rent" type="text" inputmode="numeric" placeholder="Max ₹" />
          <button class="btn btn--primary" type="submit">Filter</button>
          <button class="btn btn--secondary" type="reset" id="filter-reset-btn">Clear</button>
        </form>
        <p class="text-muted" style="margin-bottom:var(--space-md)">${flats.length} flat${flats.length !== 1 ? "s" : ""} found</p>
        <div class="flat-grid">${cards}</div>
      </div>`;
  },

  viewFlatDetails(flat) {
    if (!flat)
      return `
      <div class="container page-content">
        <div class="empty-state">
          <p style="font-size:2rem">😕</p>
          <p>Flat not found.</p>
          <a class="btn btn--secondary" href="#/tenant/search" data-route="/tenant/search">Back to Search</a>
        </div>
      </div>`;

    const amenities = Array.isArray(flat.amenities) ? flat.amenities : [];
    const images = Array.isArray(flat.images) ? flat.images : [];

    // ── Property Specifications Grid ──
    const specs = [
      flat.type       ? { icon: "🏠", label: "Type",       value: flat.type } : null,
      flat.area_sqft  ? { icon: "📐", label: "Area",       value: `${Number(flat.area_sqft).toLocaleString("en-IN")} sq.ft` } : null,
      flat.floor      ? { icon: "🏢", label: "Floor",      value: flat.total_floors ? `${flat.floor} of ${flat.total_floors}` : flat.floor } : null,
      flat.bathrooms  ? { icon: "🚿", label: "Bathrooms",  value: flat.bathrooms } : null,
      flat.facing     ? { icon: "🧭", label: "Facing",     value: flat.facing } : null,
      flat.parking && flat.parking !== "none" ? { icon: "🅿️", label: "Parking", value: flat.parking.charAt(0).toUpperCase() + flat.parking.slice(1) } : null,
      flat.deposit    ? { icon: "💰", label: "Deposit",    value: `₹${Number(flat.deposit).toLocaleString("en-IN")}` } : null,
      flat.furnished  ? { icon: "🛋️", label: "Furnished",  value: "Yes" } : { icon: "📦", label: "Furnished", value: "No" },
    ].filter(Boolean);

    const specsHtml = specs.length ? `
      <div class="flat-specs">
        ${specs.map(s => `
          <div class="flat-specs__item">
            <span class="flat-specs__icon">${s.icon}</span>
            <span class="flat-specs__label">${escHtml(s.label)}</span>
            <span class="flat-specs__value">${escHtml(String(s.value))}</span>
          </div>`).join("")}
      </div>` : "";

    // ── House Rules ──
    const rules = [];
    if (flat.pets_allowed)     rules.push("🐾 Pets Allowed");
    if (flat.smoking_allowed)  rules.push("🚬 Smoking Allowed");
    if (flat.visitors_allowed) rules.push("👥 Visitors Allowed");
    if (flat.preferred_tenants && flat.preferred_tenants !== "any") {
      const tenantLabel = { family: "Family", bachelors: "Bachelors", working_women: "Working Women", students: "Students" };
      rules.push("👤 Preferred: " + (tenantLabel[flat.preferred_tenants] || flat.preferred_tenants));
    }
    if (flat.food_preference && flat.food_preference !== "any") {
      rules.push(flat.food_preference === "veg" ? "🥬 Vegetarian Only" : "🍗 Non-Veg Allowed");
    }
    const rulesHtml = rules.length ? `
      <div style="margin-top:var(--space-sm)">
        <p class="form-label" style="margin-bottom:var(--space-xs)">House Rules & Preferences</p>
        <div class="amenity-tags">${rules.map(r => '<span class="badge badge--neutral">' + r + '</span>').join("")}</div>
      </div>` : "";

    // ── Landmarks ──
    const landmarkHtml = flat.landmarks ? `
      <div style="margin-top:var(--space-sm)">
        <p class="form-label" style="margin-bottom:var(--space-xs)">📍 Nearby Landmarks</p>
        <p class="flat-detail__desc">${escHtml(flat.landmarks)}</p>
      </div>` : "";

    // ── Owner Contact Card (Professional) ──
    const ownerInitial = (flat.owner_name || "O").charAt(0).toUpperCase();
    const hasContact = flat.owner_phone || flat.owner_email || flat.owner_whatsapp || flat.owner_telegram;
    const ownerContact = `
      <div class="owner-contact-card">
        <div class="owner-contact-card__header">
          <div class="owner-avatar">${ownerInitial}</div>
          <div>
            <p class="owner-contact-card__name">${escHtml(flat.owner_name || "Property Owner")}</p>
            ${flat.owner_location ? '<p class="owner-contact-card__location">📍 ' + escHtml(flat.owner_location) + '</p>' : ""}
          </div>
        </div>
        ${flat.owner_languages ? '<div class="owner-contact-card__meta"><span class="owner-contact-card__meta-item">🗣️ ' + escHtml(flat.owner_languages) + '</span></div>' : ""}
        ${flat.owner_bio ? '<p class="owner-contact-card__bio">' + escHtml(flat.owner_bio) + '</p>' : ""}
        ${hasContact ? `
          <div class="owner-contact-card__divider"></div>
          <p class="owner-contact-card__section-title">Contact Owner</p>
          <div class="owner-contact-card__actions">
            ${flat.owner_phone ? '<a class="owner-contact-card__item" href="tel:' + escHtml(flat.owner_phone) + '">📞 ' + escHtml(flat.owner_phone) + '</a>' : ""}
            ${flat.owner_email ? '<a class="owner-contact-card__item" href="mailto:' + escHtml(flat.owner_email) + '">✉️ ' + escHtml(flat.owner_email) + '</a>' : ""}
            ${flat.owner_whatsapp ? '<a class="owner-contact-card__item owner-contact-card__item--whatsapp" href="https://wa.me/' + String(flat.owner_whatsapp).replace(/\D/g,"") + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : ""}
            ${flat.owner_telegram ? '<a class="owner-contact-card__item owner-contact-card__item--telegram" href="https://t.me/' + escHtml(flat.owner_telegram) + '" target="_blank" rel="noopener">✈️ Telegram</a>' : ""}
          </div>` : ""}
        <p class="owner-contact-card__trust">✅ Verified on FlatFinder</p>
      </div>`;

    // ── Image Carousel ──
    const gallery = images.length
      ? `<div class="carousel" aria-roledescription="carousel" aria-label="Flat images">
          <div class="carousel__track-container">
            <div class="carousel__track">
              ${images.map((src, i) => '<img class="carousel__img" src="' + escHtml(src) + '" alt="Flat image ' + (i + 1) + '" loading="lazy" />').join("")}
            </div>
          </div>
          <button class="carousel__btn carousel__btn--prev" aria-label="Previous image">❮</button>
          <button class="carousel__btn carousel__btn--next" aria-label="Next image">❯</button>
          ${images.length > 1 ? '<span class="carousel__counter">' + images.length + ' photos</span>' : ""}
         </div>`
      : "";

    return `
      <div class="container page-content">
        <a class="back-link" href="#/tenant/search" data-route="/tenant/search">← Back to Search</a>
        ${gallery}
        <div class="flat-detail-layout">
          <div class="flat-detail card">
            <div class="flat-detail__meta">
              <span class="badge badge--neutral">${escHtml(flat.type)}</span>
              ${flat.furnished ? '<span class="badge badge--success">Furnished</span>' : '<span class="badge badge--neutral">Unfurnished</span>'}
              ${flat.available ? '<span class="badge badge--success">Available</span>' : '<span class="badge badge--danger">Not Available</span>'}
            </div>
            <h2>${escHtml(flat.title)}</h2>
            <p class="flat-detail__city">📍 ${escHtml(flat.city)}${flat.address ? " — " + escHtml(flat.address) : ""}</p>
            <p class="flat-detail__rent">₹${Number(flat.rent).toLocaleString("en-IN")} <span>/ month</span></p>
            ${specsHtml}
            ${flat.description ? '<p class="flat-detail__desc">' + escHtml(flat.description) + '</p>' : ""}
            ${amenities.length ? `
            <div>
              <p class="form-label" style="margin-bottom:var(--space-xs)">Amenities</p>
              <div class="amenity-tags">
                ${amenities.map((a) => '<span class="badge badge--neutral">✓ ' + escHtml(a) + '</span>').join("")}
              </div>
            </div>` : ""}
            ${rulesHtml}
            ${landmarkHtml}
            ${flat.available
              ? '<a class="btn btn--primary" href="#/tenant/booking/' + flat.id + '" data-route="/tenant/booking/' + flat.id + '" style="margin-top:var(--space-md)">📅 Book This Flat →</a>'
              : '<button class="btn btn--secondary" disabled style="margin-top:var(--space-md)">Not Available</button>'}
          </div>
          <aside>${ownerContact}</aside>
        </div>
      </div>`;
  },

  viewBooking(flat) {
    if (!flat)
      return `
      <div class="container page-content">
        <div class="empty-state">
          <p>Flat not found.</p>
          <a class="btn btn--secondary" href="#/tenant/search" data-route="/tenant/search">Back to Search</a>
        </div>
      </div>`;

    const today = new Date().toISOString().split("T")[0];
    return `
      <div class="container page-content">
        <a class="back-link" href="#/tenant/flat/${flat.id}" data-route="/tenant/flat/${flat.id}">← Back to Details</a>
        <div class="card form-card" style="max-width:680px">
          <h2>Book Flat</h2>
          <p class="form-card__sub">${escHtml(flat.title)} — ₹${Number(flat.rent).toLocaleString("en-IN")}/month</p>
          <form id="booking-form" novalidate onsubmit="return false;">
            <input type="hidden" name="flat_id" value="${flat.id}" />
            <div class="form-group">
              <label class="form-label" for="check-in">Check-in Date</label>
              <input class="form-input" id="check-in" name="check_in" type="date" min="${today}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="check-out">Check-out Date</label>
              <input class="form-input" id="check-out" name="check_out" type="date" min="${today}" required />
            </div>
            <div id="rent-preview" class="rent-preview hidden">
              <p>Estimated Rent: <strong id="rent-preview-value"></strong></p>
            </div>
            <button class="btn btn--primary btn--full" type="submit">Confirm Booking</button>
          </form>
        </div>
      </div>`;
  },

  bindEvents(root) {
    if (window.Carousel) window.Carousel.init(root);

    const filterForm = root.querySelector("#flat-search-filter-form");
    if (filterForm) {
      filterForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(filterForm);
        const params = new URLSearchParams();
        for (const [k, v] of fd.entries()) {
          if (!v) continue;
          if (k === "min_rent" || k === "max_rent") {
            const cleaned = v.replace(/,/g, "").trim();
            if (cleaned) params.set(k, cleaned);
          } else {
            params.set(k, v);
          }
        }
        const r = await apiFetch(`/api/flats?${params}`);
        if (r.success) { appState.flats = r.data; render(Tenant.viewSearch(r.data)); }
        else showToast(r.message, "error");
      });

      root.querySelector("#filter-reset-btn")?.addEventListener("click", async () => {
        filterForm.reset();
        const r = await apiFetch("/api/flats");
        if (r.success) { appState.flats = r.data; render(Tenant.viewSearch(r.data)); }
      });
    }

    // ── Booking form: date validation + check-out min enforcement ──
    const bookingForm = root.querySelector("#booking-form");
    if (bookingForm) {
      const ciInput = bookingForm.querySelector('[name="check_in"]');
      const coInput = bookingForm.querySelector('[name="check_out"]');
      const today = new Date().toISOString().split("T")[0];

      // When check-in changes, force check-out min to be at least check-in + 1 day
      const syncCheckOut = () => {
        if (ciInput && coInput && ciInput.value) {
          const nextDay = new Date(ciInput.value);
          nextDay.setDate(nextDay.getDate() + 1);
          const minCO = nextDay.toISOString().split("T")[0];
          coInput.min = minCO;
          if (coInput.value && coInput.value < minCO) {
            coInput.value = "";
          }
        }
      };

      const calcRent = () => {
        const ci = ciInput?.value;
        const co = coInput?.value;
        const pre = root.querySelector("#rent-preview");
        const val = root.querySelector("#rent-preview-value");
        if (ci && co && appState._selectedFlat) {
          const days = Math.ceil((new Date(co) - new Date(ci)) / 86400000);
          if (days > 0) {
            const est = ((parseFloat(appState._selectedFlat.rent) / 30) * days).toFixed(2);
            if (val) val.textContent = "₹" + Number(est).toLocaleString("en-IN") + " (" + days + " days)";
            if (pre) pre.classList.remove("hidden");
            return;
          }
        }
        if (pre) pre.classList.add("hidden");
      };

      ciInput?.addEventListener("change", () => { syncCheckOut(); calcRent(); });
      coInput?.addEventListener("change", calcRent);

      bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(bookingForm);
        const payload = {
          flat_id: fd.get("flat_id"),
          check_in: fd.get("check_in"),
          check_out: fd.get("check_out"),
        };
        if (!payload.check_in || !payload.check_out) {
          showToast("Please select both check-in and check-out dates.", "error");
          return;
        }
        // JS-level past-date guard
        if (payload.check_in < today) {
          showToast("Check-in date cannot be in the past.", "error");
          return;
        }
        if (payload.check_out <= payload.check_in) {
          showToast("Check-out must be after check-in date.", "error");
          return;
        }
        const btn = bookingForm.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.textContent = "Submitting…";
        const r = await apiFetch("/api/bookings", { method: "POST", body: payload });
        btn.disabled = false;
        btn.textContent = "Confirm Booking";
        if (r.success) {
          showToast("Booking submitted successfully!", "success");
          window.location.hash = "#/tenant/dashboard";
        } else {
          showToast(r.message || "Booking failed.", "error");
        }
      });
    }

    const cancelBtns = root.querySelectorAll('[data-action="cancel-booking"]');
    cancelBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const bId = btn.dataset.bookingId;
        if (!bId || !confirm("Cancel this booking?")) return;
        btn.disabled = true;
        const r = await apiFetch(`/api/bookings/${bId}`, { method: "PATCH", body: { status: "cancelled" } });
        btn.disabled = false;
        if (r.success) {
          showToast("Booking cancelled.", "info");
          const br = await apiFetch("/api/bookings");
          if (br.success) appState.bookings = br.data;
          render(Tenant.viewDashboard());
        } else showToast(r.message, "error");
      });
    });
  },
};
