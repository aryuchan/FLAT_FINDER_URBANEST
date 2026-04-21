// ff-tenant.js — Hardened Tenant Module
// Fixes: Dead buttons in Search and Booking views

const Tenant = {
  async init(signal) {
    // Check if we are on search page
    if (window.location.hash === '#/search') {
      await this.renderSearch(signal);
    } else {
      await this.renderDashboard(signal);
    }
  },

  async renderDashboard(signal) {
    const root = document.getElementById('app-root');
    const res = await fetch('/api/bookings', { headers: { 'Authorization': `Bearer ${localStorage.getItem('ff_token')}` } });
    const bookings = await res.json();

    root.innerHTML = `
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">My Bookings</h1>
          <a href="#/search" class="btn btn--primary" data-route="#/search">Find a Flat</a>
        </div>
        <div class="grid mt-lg">
          ${bookings.data?.length ? bookings.data.map(b => `
            <div class="card">
              <div class="flex-between">
                <h3 class="stat-card__label">${b.flat_title || 'Premium Flat'}</h3>
                <span class="badge badge--success">${b.status}</span>
              </div>
              <p class="text-muted mt-sm">Check-in: ${new Date(b.check_in).toLocaleDateString()}</p>
            </div>
          `).join('') : '<div class="empty-state">No bookings found.</div>'}
        </div>
      </div>
    `;
  },

  async renderSearch(signal) {
    const root = document.getElementById('app-root');
    const res = await fetch('/api/flats');
    const flats = await res.json();

    root.innerHTML = `
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Explore Flats</h1>
        </div>
        <div class="flat-grid mt-lg">
          ${flats.data?.map(f => `
            <div class="card flat-card">
              <img src="${f.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'}" class="flat-gallery__img">
              <div class="flat-body">
                <h3 class="mt-sm">${f.title}</h3>
                <p class="text-muted">${f.city} — ${f.type}</p>
                <div class="flex-between mt-lg">
                  <span class="stat-card__value">₹${f.rent}</span>
                  <button class="btn btn--primary btn--sm" onclick="Tenant.book('${f.id}')">Book Now</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  async book(flatId) {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('ff_token')}` },
      body: JSON.stringify({ flat_id: flatId, check_in: '2026-05-01', check_out: '2026-05-08' })
    });
    const data = await res.json();
    if (data.success) {
      alert('Booking Confirmed!');
      window.location.hash = '#/dashboard';
    } else {
      alert(data.message);
    }
  }
};
