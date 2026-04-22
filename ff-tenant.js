// ff-tenant.js — Hardened Tenant Engine (v18.0)

const Tenant = {
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
          <h1 class="page-title">My Journey</h1>
          <a href="#/search" class="btn btn--primary">Find a Flat</a>
        </div>
        ${appState.bookings.length === 0 ? `
          <div class="empty-state mt-lg">
            <h3>Start Your Search</h3>
            <p class="text-muted mt-sm">You haven't booked any premium residences yet.</p>
            <a href="#/search" class="btn btn--primary mt-lg">Explore Properties</a>
          </div>
        ` : `
          <div class="grid mt-lg">
            ${appState.bookings.map(b => `
              <div class="card" data-id="${escHtml(b.id)}">
                <h3 class="stat-card__label">${escHtml(b.flat_title)}</h3>
                <p class="text-muted mt-sm">Check-in: ${formatDate(b.check_in)}</p>
                <p class="text-muted mt-sm">Check-out: ${formatDate(b.check_out)}</p>
                <div class="flex-between mt-lg">
                  <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}">${escHtml(b.status)}</span>
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
        <div class="page-header"><h1 class="page-title">Explore Urbanest</h1></div>
        
        <div class="filter-bar mt-lg">
          <select id="filter-city" class="input form-select">
            <option value="">All Cities</option>
            ${cities.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('')}
          </select>
          <select id="filter-type" class="input form-select">
            <option value="">All Types</option>
            <option value="Studio">Studio</option>
            <option value="1BHK">1BHK</option>
            <option value="2BHK">2BHK</option>
            <option value="Penthouse">Penthouse</option>
          </select>
          <input type="number" id="filter-rent" class="input" placeholder="Max Budget (₹)">
        </div>

        <div id="flat-grid-container" class="mt-lg">
          ${this.renderFlatGrid(appState.flats)}
        </div>
      </div>
    `);
    this.bindEvents();
  },

  renderFlatGrid(flats) {
    if (flats.length === 0) return `<div class="empty-state"><h3>No results match your criteria</h3><button class="btn btn--secondary mt-sm btn-clear-filters">Clear All</button></div>`;
    return `
      <div class="flat-grid">
        ${flats.map(f => `
          <div class="card flat-card" data-id="${escHtml(f.id)}">
            ${f.images ? `<img src="${escHtml(f.images)}" class="flat-gallery__img" loading="lazy">` : `<div class="flat-gallery__img" style="display:flex;align-items:center;justify-content:center;background:var(--border)">🏢</div>`}
            <div class="flat-body">
              <div class="flex-between">
                <h3>${escHtml(f.title)}</h3>
                <span class="badge badge--neutral">${escHtml(f.type)}</span>
              </div>
              <p class="text-muted mt-sm">${escHtml(f.city)} — <strong>${formatCurrency(f.rent)}</strong>/mo</p>
              <div class="mt-lg">
                <div class="field"><label class="label">Check-in</label><input type="date" class="input input-in" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="field mt-sm"><label class="label">Check-out</label><input type="date" class="input input-out" value="${new Date(Date.now()+86400000).toISOString().split('T')[0]}"></div>
                <button class="btn btn--primary btn--full mt-lg btn-book">Reserve Now</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  bindEvents() {
    const { signal } = appState.activeController;

    const applyFilters = () => {
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
        this.bindDynamicEvents(signal);
      }
    };

    document.getElementById('filter-city')?.addEventListener('change', applyFilters, { signal });
    document.getElementById('filter-type')?.addEventListener('change', applyFilters, { signal });
    document.getElementById('filter-rent')?.addEventListener('input', applyFilters, { signal });

    document.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Cancel this booking?')) return;
        const id = e.target.closest('.card').dataset.id;
        showLoading(btn);
        try {
          const res = await apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: { status: 'cancelled' } });
          if (res.success) { showToast('Cancelled successfully'); await this.viewDashboard(); }
          else showToast(res.message, 'danger');
        } finally { hideLoading(btn); }
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
        
        if (new Date(checkOut) <= new Date(checkIn)) return showToast('Invalid dates', 'warning');

        showLoading(btn);
        try {
          const res = await apiFetch('/api/bookings', { method: 'POST', body: { flat_id: flatId, check_in: checkIn, check_out: checkOut } });
          if (res.success) { showToast('Reserved!', 'success'); window.location.hash = '#/dashboard'; }
          else showToast(res.message, 'danger');
        } finally { hideLoading(btn); }
      }, { signal });
    });

    document.querySelector('.btn-clear-filters')?.addEventListener('click', () => {
      document.getElementById('filter-city').value = '';
      document.getElementById('filter-type').value = '';
      document.getElementById('filter-rent').value = '';
      const container = document.getElementById('flat-grid-container');
      if (container) {
        container.innerHTML = this.renderFlatGrid(appState.flats);
        this.bindDynamicEvents(signal);
      }
    }, { signal });
  }
};
