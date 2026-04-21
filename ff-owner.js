// ff-owner.js — Hardened Owner Engine (v16)
// Fixes: Bug #1 (render mismatch) and Architecture (apiFetch)

const Owner = {
  async init(signal) {
    const route = window.location.hash;
    if (route === '#/owner/add-flat') this.viewAddFlat(signal);
    else await this.viewDashboard(signal);
  },

  async viewDashboard(signal) {
    const res = await apiFetch('/api/flats'); // Server filters by owner_id automatically
    appState.listings = res.success ? res.data : [];

    const html = `
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">Management Suite</h1>
          <a href="#/owner/add-flat" class="btn btn--primary">List Property</a>
        </div>
        <div class="stat-grid mt-lg">
          <div class="stat-card">
            <p class="stat-card__label">Active Listings</p>
            <p class="stat-card__value">${appState.listings.length}</p>
          </div>
        </div>
        <h2 class="mt-lg">Your Properties</h2>
        <div class="grid mt-sm">
          ${appState.listings.map(l => `
            <div class="card" style="padding: 1.5rem">
              <div class="flex-between">
                <h3 class="stat-card__label">${escHtml(l.title)}</h3>
                <span class="badge ${l.available ? 'badge--success' : 'badge--neutral'}">${l.available ? 'Live' : 'Private'}</span>
              </div>
              <p class="text-muted mt-sm">${escHtml(l.city)} — ₹${l.rent}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    render(html);
  },

  viewAddFlat(signal) {
    const html = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">Add Property</h1></div>
        <div class="card" style="max-width: 600px; margin: 2rem auto; padding: 3rem">
          <form id="add-flat-form">
            <div class="field mt-sm">
              <label class="label">TITLE</label>
              <input class="input" name="title" required minlength="5">
            </div>
            <div class="field mt-sm">
              <label class="label">CITY</label>
              <input class="input" name="city" required>
            </div>
            <div class="field mt-sm">
              <label class="label">RENT (₹)</label>
              <input class="input" type="number" name="rent" required>
            </div>
            <button type="submit" class="btn btn--primary btn--full mt-lg">Publish Listing</button>
          </form>
        </div>
      </div>
    `;
    render(html);
    this.bindEvents(signal);
  },

  bindEvents(signal) {
    const form = document.getElementById('add-flat-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      data.rent = parseFloat(data.rent);
      data.type = "Premium Suite";
      
      const res = await apiFetch('/api/flats', { method: 'POST', body: data });
      if (res.success) {
        showToast('Property listed!', 'success');
        window.location.hash = '#/owner/dashboard';
      } else {
        showToast(res.message, 'danger');
      }
    }, { signal });
  }
};
