// ff-tenant.js — Hardened Tenant Engine (v17)
// Fixes: Bug #6 — Removed inline onclick and hardcoded dates

const Tenant = {
  // FIX [7]: Renamed init to route
  async route() {
    if (window.location.hash === '#/search') await this.viewSearch();
    else await this.viewDashboard();
  },

  async viewDashboard() {
    const res = await apiFetch('/api/bookings');
    appState.bookings = res.success ? res.data : [];

    await render(`
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">My Bookings</h1>
          <a href="#/search" class="btn btn--primary">Find a Flat</a>
        </div>
        ${appState.bookings.length === 0 ? `
          <div class="empty-state mt-lg">
            <h3>No Bookings Yet</h3>
            <p class="text-muted mt-sm">You haven't booked any properties.</p>
            <a href="#/search" class="btn btn--primary mt-lg">Browse Inventory</a>
          </div>
        ` : `
          <div class="grid mt-lg">
            ${appState.bookings.map(b => `
              <div class="card" data-id="${escHtml(String(b.id))}">
                <h3 class="stat-card__label">${escHtml(b.flat_title || 'Flat')}</h3>
                <!-- FIX [13]: Added check-out date display -->
                <p class="text-muted mt-sm">Check-in: ${formatDate(b.check_in)}</p>
                <p class="text-muted mt-sm">Check-out: ${formatDate(b.check_out)}</p>
                <div class="flex-between mt-sm">
                  <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}">${escHtml(String(b.status))}</span>
                  ${['pending', 'confirmed'].includes(b.status) ? `<button class="btn btn--danger btn--sm btn-cancel">Cancel</button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `);
    this.bindEvents();
  },

  async viewSearch() {
    const res = await apiFetch('/api/flats');
    appState.flats = res.success ? res.data : [];

    const cities = [...new Set(appState.flats.map(f => f.city))];

    await render(`
      <div class="container">
        <div class="page-header"><h1 class="page-title">Available Inventory</h1></div>
        
        <div class="filter-bar mt-lg" style="display:flex; gap:1rem; flex-wrap:wrap; background:var(--surface); padding:1rem; border-radius:8px; border:1px solid var(--border)">
          <select id="filter-city" class="input form-select" style="flex:1; min-width:150px">
            <option value="">All Cities</option>
            ${cities.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('')}
          </select>
          <select id="filter-type" class="input form-select" style="flex:1; min-width:150px">
            <option value="">All Types</option>
            <option value="Studio">Studio</option>
            <option value="1BHK">1BHK</option>
            <option value="2BHK">2BHK</option>
            <option value="Penthouse">Penthouse</option>
            <option value="Premium Residence">Premium Residence</option>
          </select>
          <input type="number" id="filter-rent" class="input" placeholder="Max Rent (₹)" style="flex:1; min-width:150px">
        </div>

        <div id="flat-grid-container" class="mt-lg">
          ${this.renderFlatGrid(appState.flats)}
        </div>
      </div>
    `);
    this.bindEvents();
  },

  renderFlatGrid(flats) {
    if (flats.length === 0) {
      return `
        <div class="empty-state">
          <h3>No Properties Match Your Filters</h3>
          <p class="text-muted mt-sm">Try adjusting your filters to see more results.</p>
          <button class="btn btn--secondary mt-sm btn-clear-filters">Clear Filters</button>
        </div>
      `;
    }
    return `
      <div class="flat-grid">
        ${flats.map(f => `
          <div class="card flat-card" data-id="${escHtml(String(f.id))}">
            ${f.images ? `<img src="${escHtml(f.images)}" class="flat-gallery__img" alt="${escHtml(f.title)}" loading="lazy" onerror="this.style.display='none'">` : `<div class="flat-gallery__img" style="display:flex;align-items:center;justify-content:center;background:var(--border);color:var(--text-muted);font-size:2rem">🏢</div>`}
            <div class="flat-body">
              <div class="flex-between">
                <h3 class="mt-sm">${escHtml(f.title)}</h3>
                <span class="badge badge--neutral">${escHtml(f.type)}</span>
              </div>
              <p class="text-muted mt-sm">${escHtml(f.city)} — <strong style="color:var(--text)">${formatCurrency(f.rent)}</strong>/mo</p>
              <div class="mt-lg">
                <label class="label">Check-in</label>
                <input type="date" class="input input-in mt-sm" value="${new Date().toISOString().split('T')[0]}">
                <label class="label mt-sm">Check-out</label>
                <input type="date" class="input input-out mt-sm" value="${new Date(Date.now()+7*86400000).toISOString().split('T')[0]}">
                <button class="btn btn--primary btn--full mt-lg btn-book">Book Property</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  bindEvents() {
    const { signal } = appState.activeController;

    // Filters
    let filterTimeout;
    const applyFilters = () => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        const city = document.getElementById('filter-city')?.value.toLowerCase() || '';
        const type = document.getElementById('filter-type')?.value.toLowerCase() || '';
        const rent = parseFloat(document.getElementById('filter-rent')?.value) || Infinity;
        
        const filtered = appState.flats.filter(f => 
          (city === '' || f.city.toLowerCase().includes(city)) &&
          (type === '' || f.type.toLowerCase().includes(type)) &&
          f.rent <= rent
        );
        
        const container = document.getElementById('flat-grid-container');
        if (container) {
          container.innerHTML = this.renderFlatGrid(filtered);
          this.bindDynamicEvents(signal); // rebind buttons in the new HTML
        }
      }, 300);
    };

    document.getElementById('filter-city')?.addEventListener('change', applyFilters, { signal });
    document.getElementById('filter-type')?.addEventListener('change', applyFilters, { signal });
    document.getElementById('filter-rent')?.addEventListener('input', applyFilters, { signal });

    // Cancel Bookings
    document.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Cancel this booking?')) return;
        const id = e.target.closest('.card').dataset.id;
        showLoading(btn);
        try {
          const res = await apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: { status: 'cancelled' } });
          if (res.success) {
            showToast('Booking cancelled');
            await this.viewDashboard();
          } else {
            showToast(res.message, 'danger');
          }
        } finally {
          hideLoading(btn);
        }
      }, { signal });
    });

    this.bindDynamicEvents(signal);
  },

  bindDynamicEvents(signal) {
    document.querySelectorAll('.btn-book').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const card = e.target.closest('.flat-card');
        const flatId = card.dataset.id;
        const checkIn = card.querySelector('.input-in').value;
        const checkOut = card.querySelector('.input-out').value;
        
        const dateIn = new Date(checkIn);
        const dateOut = new Date(checkOut);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (dateIn < today) {
          showToast('Check-in cannot be in the past', 'warning');
          return;
        }
        
        if (dateOut <= dateIn) {
          showToast('Check-out must be after check-in', 'warning');
          return;
        }

        showLoading(btn);
        try {
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
        } finally {
          hideLoading(btn);
        }
      }, { signal });
    });

    document.querySelectorAll('.btn-clear-filters').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = document.getElementById('filter-city'); if (c) c.value = '';
        const t = document.getElementById('filter-type'); if (t) t.value = '';
        const r = document.getElementById('filter-rent'); if (r) r.value = '';
        const container = document.getElementById('flat-grid-container');
        if (container) {
          container.innerHTML = this.renderFlatGrid(appState.flats);
          this.bindDynamicEvents(signal);
        }
      }, { signal });
    });
  }
};
