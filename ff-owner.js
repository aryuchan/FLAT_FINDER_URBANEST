// ff-owner.js — Hardened Owner Engine (v17)
// Fixes: Bug #6 — Removed inline onclick

const Owner = {
  // FIX [7]: Renamed init to route
  async route() {
    if (window.location.hash === '#/add-flat') await this.viewAddFlat();
    else await this.viewDashboard();
  },

  async viewDashboard() {
    const [fRes, bRes] = await Promise.all([apiFetch('/api/flats'), apiFetch('/api/bookings')]);
    const flats = fRes.success ? fRes.data : [];
    const bookings = bRes.success ? bRes.data : [];

    await render(`
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">Management Dashboard</h1>
          <a href="#/add-flat" class="btn btn--primary">List Flat</a>
        </div>
        <div class="stat-grid mt-lg">
          <div class="stat-card"><p class="stat-card__label">Listings</p><p class="stat-card__value">${flats.length}</p></div>
          <div class="stat-card"><p class="stat-card__label">Bookings</p><p class="stat-card__value">${bookings.length}</p></div>
        </div>
        <h2 class="mt-lg">Manage Listings</h2>
        ${flats.length === 0 ? `<p class="text-muted mt-sm">No listings yet.</p>` : `
          <div class="grid mt-sm mb-lg">
            ${flats.map(f => `
              <div class="card" data-id="${escHtml(String(f.id))}">
                <div class="flex-between">
                  <h3 class="stat-card__label">${escHtml(f.title)}</h3>
                  <button class="badge badge--${f.available ? 'success' : 'neutral'} btn-toggle" style="cursor:pointer; border:none">${f.available ? 'Available' : 'Hidden'}</button>
                </div>
                <p class="text-muted mt-sm">${formatCurrency(f.rent)}/mo</p>
              </div>
            `).join('')}
          </div>
        `}
        <h2 class="mt-lg">Manage Bookings</h2>
        ${bookings.length === 0 ? `
          <div class="empty-state mt-sm">
            <h3>No Active Bookings</h3>
            <p class="text-muted mt-sm">You have no bookings to manage at this time.</p>
          </div>
        ` : `
          <div class="grid mt-sm">
            ${bookings.map(b => `
              <div class="card" data-id="${escHtml(String(b.id))}">
                <div class="flex-between">
                  <h3 class="stat-card__label">${escHtml(b.flat_title)}</h3>
                  <!-- FIX [24]: Sanitized enum field -->
                  <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}">${escHtml(String(b.status))}</span>
                </div>
                <!-- FIX [12]: Added check-in, check-out, and tenant id to owner bookings -->
                <p class="text-muted mt-sm">Tenant: ${escHtml(b.tenant_name || String(b.tenant_id))}</p>
                <p class="text-muted mt-sm">Check-in: ${formatDate(b.check_in)}</p>
                <p class="text-muted mt-sm">Check-out: ${formatDate(b.check_out)}</p>
                ${b.status === 'pending' ? `
                  <div class="mt-lg flex-between">
                    <button class="btn btn--primary btn--sm btn-confirm">Confirm</button>
                    <button class="btn btn--danger btn--sm btn-cancel">Cancel</button>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `);
    this.bindEvents();
  },

  async viewAddFlat() {
    await render(`
      <div class="container">
        <div class="page-header"><h1 class="page-title">New Listing</h1></div>
        <div class="card" style="max-width: 550px; margin: 2rem auto; padding: 2.5rem">
          <form id="add-flat-form">
            <div class="field"><label class="label">TITLE</label><input class="input" name="title" required minlength="5"></div>
            <div class="field mt-sm"><label class="label">CITY</label><input class="input" name="city" required></div>
            <div class="field mt-sm">
              <label class="label">TYPE</label>
              <!-- FIX [13]: Added missing type field -->
              <select class="input" name="type" required>
                <option value="Premium Residence">Premium Residence</option>
                <option value="Studio">Studio</option>
                <option value="Penthouse">Penthouse</option>
              </select>
            </div>
            <div class="field mt-sm"><label class="label">RENT (₹)</label><input class="input" type="number" name="rent" required></div>
            <div class="field mt-sm">
              <label class="label">PROPERTY IMAGE</label>
              <input class="input" type="file" name="image" accept="image/*" id="flat-image-input">
              <div id="img-preview" style="display:none;margin-top:0.5rem"><img id="img-preview-src" style="max-height:150px;border-radius:8px;border:1px solid var(--border)"></div>
            </div>
            <button type="submit" class="btn btn--primary btn--full mt-lg">Publish Listing</button>
          </form>
        </div>
      </div>
    `);
    this.bindEvents();
  },

  bindEvents() {
    // FIX [5], [20]: Extract signal AFTER await render completes
    const { signal } = appState.activeController;

    const imgInput = document.getElementById('flat-image-input');
    if (imgInput) {
      imgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            document.getElementById('img-preview').style.display = 'block';
            document.getElementById('img-preview-src').src = ev.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Property Creation
    document.getElementById('add-flat-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      showLoading(btn);
      try {
        const formData = new FormData(e.target);
        const imageFile = formData.get('image');
        formData.delete('image');
        
        const data = Object.fromEntries(formData);
        data.rent = parseFloat(data.rent);
        
        const res = await apiFetch('/api/flats', { method: 'POST', body: data });
        
        if (res.success && imageFile && imageFile.size > 0) {
          const imgData = new FormData();
          imgData.append('image', imageFile);
          const token = localStorage.getItem('ff_token');
          await fetch(`/api/flats/${res.data.id}/image`, {
            method: 'POST',
            body: imgData,
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
        
        if (res.success) { showToast('Listed!', 'success'); window.location.hash = '#/dashboard'; }
        else showToast(res.message, 'danger');
      } finally {
        hideLoading(btn);
      }
    }, { signal });

    document.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.card').dataset.id;
        const currentAvail = e.target.textContent === 'Available';
        showLoading(btn);
        try {
          const res = await apiFetch(`/api/flats/${id}`, { method: 'PATCH', body: { available: !currentAvail } });
          if (res.success) { showToast('Status updated', 'success'); await this.viewDashboard(); }
          else showToast(res.message, 'danger');
        } finally {
          hideLoading(btn);
        }
      }, { signal });
    });

    // Booking Confirmation/Cancellation
    if (!document.getElementById('add-flat-form')) {
      document.querySelectorAll('.btn-confirm, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.closest('.card').dataset.id;
          const status = e.target.classList.contains('btn-confirm') ? 'confirmed' : 'cancelled';
          showLoading(btn);
          try {
            const res = await apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: { status } });
            if (res.success) { showToast(`Booking ${status}`, 'success'); await this.viewDashboard(); }
            else showToast(res.message, 'danger');
          } finally {
            hideLoading(btn);
          }
        }, { signal });
      });
    }
  }
};
