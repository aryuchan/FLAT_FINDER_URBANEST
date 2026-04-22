// ff-owner.js — Hardened Owner Engine (v18.0)

const Owner = {
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
          <h1 class="page-title">Management Hub</h1>
          <a href="#/add-flat" class="btn btn--primary">Add Property</a>
        </div>
        <div class="stat-grid mt-lg">
          <div class="stat-card"><p class="stat-card__label">Active Listings</p><p class="stat-card__value">${flats.length}</p></div>
          <div class="stat-card"><p class="stat-card__label">Total Bookings</p><p class="stat-card__value">${bookings.length}</p></div>
        </div>
        <h2 class="mt-lg">My Properties</h2>
        <div class="grid mt-sm mb-lg">
          ${flats.map(f => `
            <div class="card" data-id="${escHtml(f.id)}">
              <div class="flex-between">
                <h3>${escHtml(f.title)}</h3>
                <button class="badge badge--${f.available ? 'success' : 'neutral'} btn-toggle" style="cursor:pointer; border:none" data-avail="${f.available ? '1' : '0'}">${f.available ? 'Available' : 'Hidden'}</button>
              </div>
              <p class="text-muted mt-sm">${formatCurrency(f.rent)}/mo — ${escHtml(f.city)}</p>
            </div>
          `).join('')}
        </div>
        <h2 class="mt-lg">Incoming Requests</h2>
        <div class="grid mt-sm">
          ${bookings.map(b => `
            <div class="card" data-id="${escHtml(b.id)}">
              <div class="flex-between">
                <h3 class="stat-card__label">${escHtml(b.flat_title)}</h3>
                <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}">${escHtml(b.status)}</span>
              </div>
              <p class="text-muted mt-sm">Tenant: <b>${escHtml(b.tenant_name)}</b></p>
              <p class="text-muted mt-sm">${formatDate(b.check_in)} — ${formatDate(b.check_out)}</p>
              ${b.status === 'pending' ? `
                <div class="mt-lg flex-between">
                  <button class="btn btn--primary btn--sm btn-confirm">Accept</button>
                  <button class="btn btn--danger btn--sm btn-cancel">Decline</button>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `);
    this.bindEvents();
  },

  async viewAddFlat() {
    await render(`
      <div class="container">
        <div class="page-header"><h1 class="page-title">List New Property</h1></div>
        <div class="card" style="max-width: 600px; margin: 2rem auto; padding: 2.5rem">
          <form id="add-flat-form">
            <div class="field"><label class="label">Property Title</label><input class="input" name="title" required minlength="5"></div>
            <div class="field mt-sm"><label class="label">City</label><input class="input" name="city" required></div>
            <div class="field mt-sm">
              <label class="label">Property Type</label>
              <select class="input" name="type" required>
                <option value="Studio">Studio</option>
                <option value="1BHK">1BHK</option>
                <option value="2BHK">2BHK</option>
                <option value="Penthouse">Penthouse</option>
              </select>
            </div>
            <div class="field mt-sm"><label class="label">Monthly Rent (₹)</label><input class="input" type="number" name="rent" required></div>
            <div class="field mt-sm">
              <label class="label">Hero Image</label>
              <input class="input" type="file" name="image" accept="image/*" id="flat-image-input">
              <div id="img-preview" style="display:none;margin-top:1rem"><img id="img-preview-src" style="max-height:200px;border-radius:12px;border:1px solid var(--border)"></div>
            </div>
            <button type="submit" class="btn btn--primary btn--full mt-lg">Publish Listing</button>
          </form>
        </div>
      </div>
    `);
    this.bindEvents();
  },

  bindEvents() {
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

    document.getElementById('add-flat-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const formData = new FormData(e.target);
      const imageFile = formData.get('image');
      formData.delete('image');
      
      const data = Object.fromEntries(formData);
      data.rent = parseFloat(data.rent) || 0;
      
      showLoading(btn);
      try {
        const res = await apiFetch('/api/flats', { method: 'POST', body: data });
        if (res.success && imageFile?.size > 0) {
          const imgData = new FormData();
          imgData.append('image', imageFile);
          await apiFetch(`/api/flats/${res.data.id}/image`, { method: 'POST', body: imgData });
        }
        if (res.success) { showToast('Property listed successfully!', 'success'); window.location.hash = '#/dashboard'; }
        else showToast(res.message, 'danger');
      } finally { hideLoading(btn); }
    }, { signal });

    document.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Change visibility?')) return;
        const id = e.target.closest('.card').dataset.id;
        const isAvail = e.target.dataset.avail === '1';
        showLoading(btn);
        try {
          const res = await apiFetch(`/api/flats/${id}`, { method: 'PATCH', body: { available: !isAvail } });
          if (res.success) { showToast('Visibility updated'); await this.viewDashboard(); }
          else showToast(res.message, 'danger');
        } finally { hideLoading(btn); }
      }, { signal });
    });

    document.querySelectorAll('.btn-confirm, .btn-cancel').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.card').dataset.id;
        const status = e.target.classList.contains('btn-confirm') ? 'confirmed' : 'cancelled';
        if (!confirm(`Mark as ${status}?`)) return;
        showLoading(btn);
        try {
          const res = await apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: { status } });
          if (res.success) { showToast(`Request ${status}`); await this.viewDashboard(); }
          else showToast(res.message, 'danger');
        } finally { hideLoading(btn); }
      }, { signal });
    });
  }
};
