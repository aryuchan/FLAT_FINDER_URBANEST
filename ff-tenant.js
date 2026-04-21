// ff-tenant.js — Hardened Tenant Engine (v16)
// Fixes: Bug #1 (render mismatch) and Architecture (apiFetch)

const Tenant = {
  async init(signal) {
    const route = window.location.hash;
    if (route === '#/tenant/search') await this.viewSearch(signal);
    else await this.viewDashboard(signal);
  },

  async viewDashboard(signal) {
    const res = await apiFetch('/api/bookings');
    appState.bookings = res.success ? res.data : [];

    const html = `
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">My Journeys</h1>
          <a href="#/tenant/search" class="btn btn--primary">Find a Flat</a>
        </div>
        <div class="grid mt-lg">
          ${appState.bookings.length ? appState.bookings.map(b => `
            <div class="card" role="article">
              <div class="flex-between">
                <h3 class="stat-card__label">${escHtml(b.flat_title || 'Premium Residence')}</h3>
                <span class="badge badge--success">${b.status}</span>
              </div>
              <p class="text-muted mt-sm">Check-in: ${new Date(b.check_in).toLocaleDateString()}</p>
            </div>
          `).join('') : '<div class="empty-state">No upcoming bookings.</div>'}
        </div>
      </div>
    `;
    render(html);
  },

  async viewSearch(signal) {
    const res = await apiFetch('/api/flats');
    appState.flats = res.success ? res.data : [];

    const html = `
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Discover Your Space</h1>
        </div>
        <div class="flat-grid mt-lg">
          ${appState.flats.map(f => `
            <div class="card flat-card">
              <div class="flat-gallery">
                <img src="${f.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'}" class="flat-gallery__img" alt="${escHtml(f.title)}">
              </div>
              <div class="flat-body">
                <h3 class="mt-sm">${escHtml(f.title)}</h3>
                <p class="text-muted">${escHtml(f.city)} — ${f.type}</p>
                <div class="flex-between mt-lg">
                  <span class="stat-card__value">₹${f.rent}</span>
                  <button class="btn btn--primary btn--sm" onclick="Tenant.book('${f.id}')">Instant Book</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    render(html);
  },

  async book(flatId) {
    const res = await apiFetch('/api/bookings', {
      method: 'POST',
      body: { flat_id: flatId, check_in: '2026-06-01', check_out: '2026-06-07' }
    });
    if (res.success) {
      showToast('Booking Confirmed!', 'success');
      window.location.hash = '#/tenant/dashboard';
    } else {
      showToast(res.message, 'danger');
    }
  }
};
