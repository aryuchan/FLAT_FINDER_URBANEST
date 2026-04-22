// ff-tenant.js — Hardened Tenant Engine (v18.0)
const Tenant = {
  async init() {
    await this.route();
  },

  async route() {
    const hash = window.location.hash || '#/dashboard';
    if (hash === '#/search') await this.viewSearch();
    else await this.viewDashboard();
    this.bindEvents();
  },

  async viewDashboard() {
    const res = await apiFetch('/api/bookings');
    const bookings = res.success ? res.data : [];

    await render(`
      <div class="container page-content">
        <div class="page-header">
          <h2>Tenant Dashboard</h2>
          <a class="btn btn--primary" href="#/search" data-route="/search">🔍 Find a Flat</a>
        </div>
        
        <h3 class="mt-xl">My Rental Requests</h3>
        <div class="grid mt-sm">
          ${bookings.length ? bookings.map(b => `
            <div class="card">
              <div class="flex-between">
                <h4 style="font-size:1.1rem">${escHtml(b.flat_title)}</h4>
                <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}">${escHtml(b.status)}</span>
              </div>
              <p class="text-muted mt-sm">📍 ${escHtml(b.city || 'Location unavailable')}</p>
              <p class="text-muted" style="font-size:0.85rem">📅 Stay: ${formatDate(b.check_in)} to ${formatDate(b.check_out)}</p>
            </div>
          `).join('') : `
            <div class="card" style="grid-column: 1/-1; text-align:center; padding: 4rem;">
              <p class="text-muted">You haven't requested any flats yet.</p>
              <a href="#/search" class="btn btn--secondary btn--sm mt-md">Start Searching</a>
            </div>
          `}
        </div>
      </div>
    `);
  },

  async viewSearch() {
    // Initial fetch
    const res = await apiFetch('/api/flats');
    const flats = res.success ? res.data : [];

    await render(`
      <div class="container page-content">
        <div class="page-header">
          <h2>Find Your Next Home</h2>
        </div>

        <!-- Search Bar -->
        <div class="card mb-xl" style="padding: 1.5rem">
          <form id="search-filter-form" class="grid-4" style="gap:1rem; align-items:end">
            <div class="form-group mb-0">
              <label class="form-label" style="font-size:0.75rem">City</label>
              <input class="form-input" name="city" placeholder="e.g. Pune" style="padding: 0.5rem" />
            </div>
            <div class="form-group mb-0">
              <label class="form-label" style="font-size:0.75rem">Type</label>
              <select class="form-select" name="type" style="padding: 0.5rem">
                <option value="">Any Type</option>
                <option>1BHK</option><option>2BHK</option><option>3BHK</option><option>Studio</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label" style="font-size:0.75rem">Max Rent (₹)</label>
              <input class="form-input" name="maxRent" type="number" placeholder="50000" style="padding: 0.5rem" />
            </div>
            <button type="submit" class="btn btn--primary" id="btn-apply-filters">Apply Filters</button>
          </form>
        </div>

        <div id="search-results" class="grid">
          ${this._renderFlatGrid(flats)}
        </div>
      </div>
    `);
  },

  _renderFlatGrid(flats) {
    if (!flats.length) return '<p class="text-muted" style="grid-column:1/-1; text-align:center; padding:3rem">No matching properties found.</p>';
    
    return flats.map(f => {
      const imgs = JSON.parse(f.images || '[]');
      const cover = imgs[0] || 'https://via.placeholder.com/400x300?text=No+Image';
      
      return `
        <div class="card flat-card" data-id="${escHtml(f.id)}">
          <img src="${cover}" class="flat-card__img" style="width:100%; height:200px; object-fit:cover; border-radius:0.5rem">
          <div class="mt-md">
            <div class="flex-between">
              <h4 style="font-size:1.1rem">${escHtml(f.title)}</h4>
              <span class="badge badge--success">${escHtml(f.type)}</span>
            </div>
            <p class="text-muted mt-sm">📍 ${escHtml(f.city)}</p>
            <p class="mt-sm" style="font-weight:700; color:var(--primary)">${formatCurrency(f.rent)}/mo</p>
            <button class="btn btn--secondary btn--sm btn--full mt-lg btn-book">Book Viewing</button>
          </div>
        </div>
      `;
    }).join('');
  },

  bindEvents() {
    const { signal } = appState.activeController;

    // Filter Logic
    document.getElementById('search-filter-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-apply-filters');
      showLoading(btn);
      
      const fd = new FormData(e.target);
      const params = new URLSearchParams(Object.fromEntries(fd));
      const res = await apiFetch(`/api/flats?${params.toString()}`);
      
      if (res.success) {
        document.getElementById('search-results').innerHTML = this._renderFlatGrid(res.data);
      }
      hideLoading(btn);
    }, { signal });

    // Booking Logic
    document.querySelectorAll('.btn-book').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.card').dataset.id;
        const check_in = new Date().toISOString().split('T')[0];
        const check_out = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        if (!confirm(`Request a viewing for this property?`)) return;
        
        showLoading(btn);
        const res = await apiFetch('/api/bookings', {
          method: 'POST',
          body: { flat_id: id, check_in, check_out }
        });
        
        if (res.success) {
          showToast('Inquiry sent to owner!', 'success');
          window.location.hash = '#/dashboard';
        } else {
          showToast(res.message, 'danger');
          hideLoading(btn);
        }
      }, { signal });
    });
  }
};
