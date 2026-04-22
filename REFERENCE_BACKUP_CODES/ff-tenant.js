// ff-tenant.js — FlatFinder Tenant Module
// Views: Dashboard · Search · Flat Details · Booking
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

const Tenant = {
  viewDashboard() {
    const rows = appState.bookings.length
      ? appState.bookings
          .map(b => `
        <tr>
          <td>
            <strong>${escHtml(b.flat_title)}</strong>
            <br><small class="text-muted">📍 ${escHtml(b.city)}</small>
          </td>
          <td>${escHtml(b.check_in)} → ${escHtml(b.check_out)}</td>
          <td>₹${Number(b.total_rent).toLocaleString('en-IN')}</td>
          <td>
            <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}">
              ${escHtml(b.status)}
            </span>
          </td>
          <td>
            ${b.status === 'pending'
              ? `<button class="btn btn--danger btn--sm" type="button"
                   data-action="cancel-booking" data-booking-id="${escHtml(b.id)}"
                   aria-label="Cancel booking for ${escHtml(b.flat_title)}">Cancel</button>`
              : '—'}
          </td>
        </tr>`)
          .join('')
      : `<tr><td colspan="5" class="empty-cell">
          No bookings yet. <a href="#/tenant/search" data-route="/tenant/search">Search flats →</a>
         </td></tr>`;

    return `
      <div class="container page-content">
        <div class="page-header">
          <h2>Welcome back, ${escHtml(appState.currentUser.name.split(' ')[0])} 👋</h2>
          <a class="btn btn--primary" href="#/tenant/search" data-route="/tenant/search">🔍 Search Flats</a>
        </div>
        <div class="card">
          <h3 class="card-title">My Bookings</h3>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Flat</th>
                  <th scope="col">Dates</th>
                  <th scope="col">Total Rent</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  viewSearch(flats = appState.flats) {
    const cards = flats.length
      ? flats.map(f => `
        <article class="flat-card card">
          <div class="flat-card__header">
            <span class="badge badge--neutral">${escHtml(f.type)}</span>
            ${f.furnished
              ? '<span class="badge badge--success">Furnished</span>'
              : '<span class="badge badge--neutral">Unfurnished</span>'}
          </div>
          ${f.images && f.images.length
            ? `<div class="flat-card__img-wrap">
                 <img class="flat-card__img"
                      src="${escHtml(f.images[0])}"
                      alt="${escHtml(f.title || f.flat_title || 'Flat photo')}"
                      loading="lazy"
                      onerror="this.closest('.flat-card__img-wrap').style.display='none'" />
               </div>`
            : ''}
          <h3 class="flat-card__title">${escHtml(f.title || f.flat_title || '')}</h3>
          <p class="flat-card__city">📍 ${escHtml(f.city)}</p>
          <p class="flat-card__rent">₹${Number(f.rent).toLocaleString('en-IN')}<span>/mo</span></p>
          <p class="text-muted" style="font-size:0.8rem">Owner: ${escHtml(f.owner_name || 'N/A')}</p>
          <a class="btn btn--primary btn--sm mt-sm" href="#/tenant/flat/${escHtml(f.id)}"
             data-route="/tenant/flat/${escHtml(f.id)}">
            View Details →
          </a>
        </article>`)
          .join('')
      : `<div class="empty-state">
          <p style="font-size:2rem" aria-hidden="true">🏚️</p>
          <p>No flats match your filters.</p>
          <p class="text-muted">Try adjusting your search criteria.</p>
         </div>`;

    return `
      <div class="container page-content">
        <div class="page-header"><h2>Search Flats</h2></div>
        <form id="flat-search-filter-form" class="filter-bar card" novalidate>
          <input class="form-input" name="city" type="text"
            aria-label="Filter by city" placeholder="City…" maxlength="100" />
          <select class="form-select" name="type" aria-label="Filter by flat type">
            <option value="">All Types</option>
            <option>1BHK</option>
            <option>2BHK</option>
            <option>3BHK</option>
            <option>Studio</option>
            <option>4BHK+</option>
          </select>
          <select class="form-select" name="furnished" aria-label="Filter by furnished status">
            <option value="">Furnished?</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
          <input class="form-input" name="min_rent" type="number"
            min="0" step="100" aria-label="Minimum rent" placeholder="Min ₹"
            inputmode="numeric" />
          <input class="form-input" name="max_rent" type="number"
            min="0" step="100" aria-label="Maximum rent" placeholder="Max ₹"
            inputmode="numeric" />
          <button class="btn btn--primary" type="submit">Filter</button>
          <button class="btn btn--secondary" type="reset" id="filter-reset-btn">Clear</button>
        </form>
        <p class="text-muted" style="margin-bottom:var(--space-md)" aria-live="polite">
          ${flats.length} flat${flats.length !== 1 ? 's' : ''} found
        </p>
        <div class="flat-grid" role="list">${cards}</div>
      </div>`;
  },

  viewFlatDetails(flat) {
    if (!flat) return `
      <div class="container page-content">
        <div class="empty-state">
          <p style="font-size:2rem" aria-hidden="true">😕</p>
          <p>Flat not found.</p>
          <a class="btn btn--secondary" href="#/tenant/search" data-route="/tenant/search">Back to Search</a>
        </div>
      </div>`;

    const amenities = Array.isArray(flat.amenities) ? flat.amenities : [];
    const images    = Array.isArray(flat.images)    ? flat.images    : [];

    // Prefer flat-specific contact fields; fall back to owner profile fields
    const contactPhone    = flat.contact_phone    || flat.owner_phone    || '';
    const contactEmail    = flat.contact_email    || flat.owner_email    || '';
    const contactWhatsapp = flat.contact_whatsapp || flat.owner_whatsapp || '';
    const contactTelegram = flat.contact_telegram || flat.owner_telegram || '';

    const ownerContact = `
      <aside class="owner-contact-card" aria-label="Owner contact information">
        <h4 class="owner-contact-card__title">🔑 About the Owner</h4>
        <p class="owner-contact-card__name">${escHtml(flat.owner_name || 'Property Owner')}</p>
        ${contactPhone
          ? `<a class="owner-contact-card__item" href="tel:${escHtml(contactPhone)}">📞 ${escHtml(contactPhone)}</a>`
          : ''}
        ${contactEmail
          ? `<a class="owner-contact-card__item" href="mailto:${escHtml(contactEmail)}">✉️ ${escHtml(contactEmail)}</a>`
          : ''}
        ${contactWhatsapp
          ? `<a class="owner-contact-card__item owner-contact-card__item--whatsapp"
               href="https://wa.me/${escHtml(contactWhatsapp.replace(/\D/g, ''))}"
               target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>`
          : ''}
        ${contactTelegram
          ? `<a class="owner-contact-card__item owner-contact-card__item--telegram"
               href="https://t.me/${escHtml(contactTelegram)}"
               target="_blank" rel="noopener noreferrer">✈️ Telegram</a>`
          : ''}
        ${flat.preferred_contact
          ? `<p class="text-muted" style="font-size:0.8rem;margin-top:4px">Prefers: <strong>${escHtml(flat.preferred_contact)}</strong></p>`
          : ''}
        ${flat.best_time_to_call
          ? `<p class="text-muted" style="font-size:0.8rem">Best time: ${escHtml(flat.best_time_to_call)}</p>`
          : ''}
        ${flat.owner_note
          ? `<p class="owner-contact-card__bio">${escHtml(flat.owner_note)}</p>`
          : flat.owner_bio
            ? `<p class="owner-contact-card__bio">${escHtml(flat.owner_bio)}</p>`
            : ''}
      </aside>`;

    const gallery = images.length
      ? `<div class="flat-gallery" role="group" aria-label="Property photos">
          ${images.map((src, i) =>
            `<img class="flat-gallery__img${i === 0 ? ' flat-gallery__img--main' : ''}"
                  src="${escHtml(src)}"
                  alt="Property photo ${i + 1}"
                  loading="${i === 0 ? 'eager' : 'lazy'}"
                  onerror="this.style.display='none'" />`
          ).join('')}
         </div>`
      : '';

    return `
      <div class="container page-content">
        <a class="back-link" href="#/tenant/search" data-route="/tenant/search">← Back to Search</a>
        ${gallery}
        <div class="flat-detail-layout">
          <div class="flat-detail card">
            <div class="flat-detail__meta">
              <span class="badge badge--neutral">${escHtml(flat.type)}</span>
              ${flat.furnished
                ? '<span class="badge badge--success">Furnished</span>'
                : '<span class="badge badge--neutral">Unfurnished</span>'}
              ${flat.available
                ? '<span class="badge badge--success">Available</span>'
                : '<span class="badge badge--danger">Not Available</span>'}
            </div>
            <h2>${escHtml(flat.title)}</h2>
            <p class="flat-detail__city">
              📍 ${escHtml(flat.city)}${flat.address ? ' — ' + escHtml(flat.address) : ''}
            </p>
            <p class="flat-detail__rent">
              ₹${Number(flat.rent).toLocaleString('en-IN')} <span>/ month</span>
              ${flat.deposit ? `<small class="text-muted" style="font-size:0.8rem;margin-left:var(--space-sm)">Deposit: ₹${Number(flat.deposit).toLocaleString('en-IN')}</small>` : ''}
            </p>
            ${flat.description
              ? `<p class="flat-detail__desc">${escHtml(flat.description)}</p>`
              : ''}
            ${amenities.length
              ? `<div>
                   <p class="form-label" style="margin-bottom:var(--space-xs)">Amenities</p>
                   <div class="amenity-tags">
                     ${amenities.map(a => `<span class="badge badge--neutral">✓ ${escHtml(a)}</span>`).join('')}
                   </div>
                 </div>`
              : ''}
            ${flat.available
              ? `<a class="btn btn--primary" href="#/tenant/booking/${escHtml(flat.id)}"
                   data-route="/tenant/booking/${escHtml(flat.id)}">📅 Book This Flat →</a>`
              : `<button class="btn btn--secondary" type="button" disabled>Not Available</button>`}
          </div>
          ${ownerContact}
        </div>
      </div>`;
  },

  viewBooking(flat) {
    if (!flat) return `
      <div class="container page-content">
        <div class="empty-state">
          <p>Flat not found.</p>
          <a class="btn btn--secondary" href="#/tenant/search" data-route="/tenant/search">Back to Search</a>
        </div>
      </div>`;

    const today = new Date().toISOString().split('T')[0];
    return `
      <div class="container page-content">
        <a class="back-link" href="#/tenant/flat/${escHtml(flat.id)}"
           data-route="/tenant/flat/${escHtml(flat.id)}">← Back to Details</a>
        <div class="card form-card" style="max-width:680px">
          <h2>Book Flat</h2>
          <p class="form-card__sub">
            ${escHtml(flat.title)} — ₹${Number(flat.rent).toLocaleString('en-IN')}/month
          </p>
          <form id="booking-form" novalidate>
            <input type="hidden" name="flat_id" value="${escHtml(flat.id)}" />
            <div class="form-group">
              <label class="form-label" for="check-in">Check-in Date</label>
              <input class="form-input" id="check-in" name="check_in" type="date"
                min="${today}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="check-out">Check-out Date</label>
              <input class="form-input" id="check-out" name="check_out" type="date"
                min="${today}" required />
            </div>
            <div id="rent-preview" class="rent-preview hidden" aria-live="polite">
              <p>Estimated Rent: <strong id="rent-preview-value"></strong></p>
            </div>
            <button class="btn btn--primary btn--full" type="submit">Confirm Booking</button>
          </form>
        </div>
      </div>`;
  },

  bindEvents(root) {
    // ── Search filter form ────────────────────────────────────
    const filterForm = root.querySelector('#flat-search-filter-form');
    if (filterForm) {
      filterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd     = new FormData(filterForm);
        const params = new URLSearchParams();
        for (const [k, v] of fd.entries()) if (v) params.set(k, v);
        const r = await apiFetch(`/api/flats?${params}`);
        if (r.success) { appState.flats = r.data; render(Tenant.viewSearch(r.data)); }
        else showToast(r.message, 'error');
      });

      root.querySelector('#filter-reset-btn')?.addEventListener('click', async () => {
        filterForm.reset();
        const r = await apiFetch('/api/flats');
        if (r.success) { appState.flats = r.data; render(Tenant.viewSearch(r.data)); }
        else showToast(r.message, 'error');
      });
    }

    // ── Booking form ─────────────────────────────────────────
    const bookingForm = root.querySelector('#booking-form');
    if (bookingForm) {
      const checkInInput  = bookingForm.querySelector('[name="check_in"]');
      const checkOutInput = bookingForm.querySelector('[name="check_out"]');
      const preview       = root.querySelector('#rent-preview');
      const previewVal    = root.querySelector('#rent-preview-value');

      const calcRent = () => {
        const ci = checkInInput?.value;
        const co = checkOutInput?.value;
        if (ci && co && appState._selectedFlat) {
          const days = Math.ceil((new Date(co) - new Date(ci)) / 86400000);
          if (days > 0) {
            const est = ((parseFloat(appState._selectedFlat.rent) / 30) * days).toFixed(2);
            if (previewVal) previewVal.textContent = `₹${Number(est).toLocaleString('en-IN')} (${days} days)`;
            if (preview)    preview.classList.remove('hidden');
            return;
          }
        }
        if (preview) preview.classList.add('hidden');
      };

      checkInInput?.addEventListener('change', () => {
        if (checkInInput.value && checkOutInput) {
          checkOutInput.min = checkInInput.value;
          if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
            checkOutInput.value = '';
          }
        }
        calcRent();
      });
      checkOutInput?.addEventListener('change', calcRent);

      bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!bookingForm.checkValidity()) {
          bookingForm.reportValidity();
          return;
        }
        const fd = new FormData(bookingForm);
        const payload = {
          flat_id:   fd.get('flat_id'),
          check_in:  fd.get('check_in'),
          check_out: fd.get('check_out'),
        };
        if (!payload.check_in || !payload.check_out) {
          showToast('Please select both check-in and check-out dates.', 'error');
          return;
        }
        const btn = bookingForm.querySelector('[type="submit"]');
        btn.disabled    = true;
        btn.textContent = 'Submitting…';
        const r = await apiFetch('/api/bookings', { method: 'POST', body: payload });
        btn.disabled    = false;
        btn.textContent = 'Confirm Booking';
        if (r.success) {
          showToast('Booking submitted successfully!', 'success');
          window.location.hash = '#/tenant/dashboard';
        } else {
          showToast(r.message || 'Booking failed.', 'error');
        }
      });
    }

    // ── Cancel booking (dashboard) ────────────────────────────
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action="cancel-booking"]');
      if (!btn) return;
      const bId = btn.dataset.bookingId;
      if (!bId || !confirm('Cancel this booking?')) return;
      btn.disabled = true;
      const r = await apiFetch(`/api/bookings/${bId}`, { method: 'PATCH', body: { status: 'cancelled' } });
      btn.disabled = false;
      if (r.success) {
        showToast('Booking cancelled.', 'info');
        const br = await apiFetch('/api/bookings');
        if (br.success) appState.bookings = br.data;
        render(Tenant.viewDashboard());
      } else {
        showToast(r.message, 'error');
      }
    });
  },
};
