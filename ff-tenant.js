// ff-tenant.js — FlatFinder Tenant Module
// Views: Dashboard · Search · Flat Details · Booking
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

const Tenant = {
  viewDashboard() {
    const bookings = appState.bookings || [];
    const rows = bookings.length
      ? bookings
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
          <div class="flat-card__img-wrap">
            <img class="flat-card__img" 
                 src="${(f.images && f.images.length > 0) ? escHtml(f.images[0]) : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop'}" 
                 alt="${escHtml(f.title || f.flat_title || 'Flat image')}" 
                 loading="lazy" 
                 onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop'" />
          </div>
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
        <form id="flat-search-filter-form" class="filter-bar card">
          <input class="form-input" name="city" placeholder="City…" />
          <select class="form-select" name="type">
            <option value="">All Types</option>
            <option>1BHK</option><option>2BHK</option><option>3BHK</option>
            <option>Studio</option><option>4BHK+</option>
          </select>
          <select class="form-select" name="furnished">
            <option value="">Furnished?</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
          <input class="form-input" name="min_rent" type="number" min="0" placeholder="Min ₹" />
          <input class="form-input" name="max_rent" type="number" min="0" placeholder="Max ₹" />
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

    // Owner contact card
    const ownerContact = `
      <div class="owner-contact-card">
        <h4 class="owner-contact-card__title">🔑 About the Owner</h4>
        <p class="owner-contact-card__name">${escHtml(flat.owner_name || "Property Owner")}</p>
        ${flat.owner_phone ? `<a class="owner-contact-card__item" href="tel:${escHtml(flat.owner_phone)}">📞 ${escHtml(flat.owner_phone)}</a>` : ""}
        ${flat.owner_email ? `<a class="owner-contact-card__item" href="mailto:${escHtml(flat.owner_email)}">✉️ ${escHtml(flat.owner_email)}</a>` : ""}
        ${flat.owner_whatsapp ? `<a class="owner-contact-card__item owner-contact-card__item--whatsapp" href="https://wa.me/${flat.owner_whatsapp.replace(/\D/g,"")}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ""}
        ${flat.owner_telegram ? `<a class="owner-contact-card__item owner-contact-card__item--telegram" href="https://t.me/${flat.owner_telegram}" target="_blank" rel="noopener">✈️ Telegram</a>` : ""}
        ${flat.owner_bio ? `<p class="owner-contact-card__bio">${escHtml(flat.owner_bio)}</p>` : ""}
      </div>`;

    // Image gallery
    const gallery = images.length
      ? `<div class="flat-gallery">
          ${images
            .map(
              (src, i) =>
                `<img class="flat-gallery__img${i === 0 ? " flat-gallery__img--main" : ""}"
                      src="${escHtml(src)}" alt="Flat image ${i + 1}" loading="lazy"
                      onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop'" />`,
            )
            .join("")}
         </div>`
      : `<div class="flat-gallery">
           <img class="flat-gallery__img flat-gallery__img--main" 
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop" 
                alt="Placeholder" />
         </div>`;

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
            ${flat.description ? `<p class="flat-detail__desc">${escHtml(flat.description)}</p>` : ""}
            <div class="grid-2 mt-md" style="gap:var(--space-md)">
              <div class="spec-item"><p class="text-muted small">Type</p><p><strong>${escHtml(flat.type)}</strong></p></div>
              <div class="spec-item"><p class="text-muted small">Rent</p><p><strong>₹${Number(flat.rent).toLocaleString("en-IN")}</strong></p></div>
              <div class="spec-item"><p class="text-muted small">Deposit</p><p><strong>₹${Number(flat.deposit || 0).toLocaleString("en-IN")}</strong></p></div>
              <div class="spec-item"><p class="text-muted small">Area</p><p><strong>${flat.area_sqft || "—"} sq.ft.</strong></p></div>
              <div class="spec-item"><p class="text-muted small">Bathrooms</p><p><strong>${flat.bathrooms || "—"}</strong></p></div>
              <div class="spec-item"><p class="text-muted small">Facing</p><p><strong>${flat.facing || "—"}</strong></p></div>
            </div>

            ${flat.landmarks ? `<div class="mt-md"><p class="form-label small">Nearby Landmarks</p><p>${escHtml(flat.landmarks)}</p></div>` : ""}

            <div class="house-rules mt-md">
              <p class="form-label small">House Rules</p>
              <div style="display:flex; gap:var(--space-md); flex-wrap:wrap">
                <span class="text-${flat.pets_allowed ? "success" : "muted"}">${flat.pets_allowed ? "🐾 Pets OK" : "🚫 No Pets"}</span>
                <span class="text-${flat.smoking_allowed ? "success" : "muted"}">${flat.smoking_allowed ? "🚬 Smoking OK" : "🚫 No Smoking"}</span>
                <span class="text-${flat.visitors_allowed ? "success" : "muted"}">${flat.visitors_allowed ? "👥 Visitors OK" : "🚫 No Visitors"}</span>
              </div>
            </div>

            ${
              amenities.length
                ? `
            <div class="mt-md">
              <p class="form-label small">Amenities</p>
              <div class="amenity-tags">
                ${amenities.map((a) => `<span class="badge badge--neutral">✓ ${escHtml(a)}</span>`).join("")}
              </div>
            </div>`
                : ""
            }
            ${
              flat.available
                ? `<a class="btn btn--primary" href="#/tenant/booking/${flat.id}" data-route="/tenant/booking/${flat.id}">📅 Book This Flat →</a>`
                : `<button class="btn btn--secondary" disabled>Not Available</button>`
            }
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
          <form id="booking-form" novalidate>
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
    const filterForm = root.querySelector("#flat-search-filter-form");
    if (filterForm) {
      filterForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(filterForm);
        const params = new URLSearchParams();
        for (const [k, v] of fd.entries()) if (v) params.set(k, v);
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

    const bookingForm = root.querySelector("#booking-form");
    if (bookingForm) {
      const calcRent = () => {
        const ci = bookingForm.querySelector('[name="check_in"]')?.value;
        const co = bookingForm.querySelector('[name="check_out"]')?.value;
        const pre = root.querySelector("#rent-preview");
        const val = root.querySelector("#rent-preview-value");
        if (ci && co && appState._selectedFlat) {
          const days = Math.ceil((new Date(co) - new Date(ci)) / 86400000);
          if (days > 0) {
            const est = ((parseFloat(appState._selectedFlat.rent) / 30) * days).toFixed(2);
            if (val) val.textContent = `₹${Number(est).toLocaleString("en-IN")} (${days} days)`;
            if (pre) pre.classList.remove("hidden");
            return;
          }
        }
        if (pre) pre.classList.add("hidden");
      };
      bookingForm.querySelector('[name="check_in"]')?.addEventListener("change", calcRent);
      bookingForm.querySelector('[name="check_out"]')?.addEventListener("change", calcRent);

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

    root.addEventListener("click", async (e) => {
      const btn = e.target.closest('[data-action="cancel-booking"]');
      if (!btn) return;
      const bId = btn.dataset.bookingId;
      if (!bId) return;

      showModal(`
        <div style="text-align:center; padding:var(--space-md)">
          <p style="font-size:3rem">📅</p>
          <h3>Cancel Booking?</h3>
          <p class="text-muted">Are you sure you want to cancel this booking? This will notify the property owner.</p>
          <div style="display:flex; gap:var(--space-md); margin-top:var(--space-lg)">
            <button class="btn btn--neutral btn--full" onclick="closeModal()">Keep Booking</button>
            <button class="btn btn--danger btn--full" id="confirm-cancel-booking-btn">Yes, Cancel</button>
          </div>
        </div>
      `);

      document.getElementById("confirm-cancel-booking-btn").addEventListener("click", async () => {
        const confirmBtn = document.getElementById("confirm-cancel-booking-btn");
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Cancelling...";
        
        const r = await apiFetch(`/api/bookings/${bId}`, { method: "PATCH", body: { status: "cancelled" } });
        closeModal();
        
        if (r.success) {
          showToast("Booking cancelled.", "info");
          const br = await apiFetch("/api/bookings");
          if (br.success) appState.bookings = br.data;
          render(Tenant.viewDashboard());
        } else {
          showToast(r.message, "error");
        }
      });
    });
  },
};
