// ff-tenant.js — Hardened Tenant Engine (v17)
// Fixes: Bug #6 — Removed inline onclick and hardcoded dates

const Tenant = {
  async init(signal) {
    if (window.location.hash === '#/search') await this.viewSearch(signal);
    else await this.viewDashboard(signal);
  },

  async viewDashboard(signal) {
    const res = await apiFetch('/api/bookings');
    appState.bookings = res.success ? res.data : [];

    await render(`
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">My Bookings</h1>
          <a href="#/search" class="btn btn--primary">Find a Flat</a>
        </div>
        <div class="grid mt-lg">
          ${appState.bookings.map(b => `
            <div class="card">
              <h3 class="stat-card__label">${escHtml(b.flat_title || 'Flat')}</h3>
              <p class="text-muted mt-sm">Check-in: ${new Date(b.check_in).toLocaleDateString()}</p>
              <span class="badge badge--success mt-sm">${b.status}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `);
    this.bindEvents(signal);
  },

  async viewSearch(signal) {
    const res = await apiFetch('/api/flats');
    appState.flats = res.success ? res.data : [];

    await render(`
      <div class="container">
        <div class="page-header"><h1 class="page-title">Available Inventory</h1></div>
        <div class="flat-grid mt-lg">
          ${appState.flats.map(f => `
            <div class="card flat-card" data-id="${escHtml(f.id)}">
              <div class="flat-body">
                <h3 class="mt-sm">${escHtml(f.title)}</h3>
                <p class="text-muted">${escHtml(f.city)} — ₹${f.rent}</p>
                <div class="mt-lg">
                  <label class="label">Check-in</label>
                  <input type="date" class="input input-in" value="${new Date().toISOString().split('T')[0]}">
                  <label class="label mt-sm">Check-out</label>
                  <input type="date" class="input input-out" value="${new Date(Date.now()+6*86400000).toISOString().split('T')[0]}">
                  <button class="btn btn--primary btn--full mt-lg btn-book">Book Property</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `);
    this.bindEvents(signal);
  },

  bindEvents(signal) {
    // Fixes: Bug #6 — Event delegation for booking
    document.querySelectorAll('.btn-book').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const card = e.target.closest('.flat-card');
        const flatId = card.dataset.id;
        const checkIn = card.querySelector('.input-in').value;
        const checkOut = card.querySelector('.input-out').value;
        
        const res = await apiFetch('/api/bookings', {
          method: 'POST',
          body: { flat_id: flatId, check_in: checkIn, check_out: checkOut }
        });
        if (res.success) {
          showToast('Booking Successful!', 'success');
          window.location.hash = '#/dashboard';
        } else {
          showToast(res.message, 'danger');
        }
      }, { signal });
    });
  }
};
