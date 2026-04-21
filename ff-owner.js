// ff-owner.js — Hardened Owner Module
// Fixes: Missing property management logic for owners

const Owner = {
  async init(signal) {
    if (window.location.hash === '#/add-flat') {
      this.renderAddFlat(signal);
    } else {
      await this.renderDashboard(signal);
    }
  },

  async renderDashboard(signal) {
    const root = document.getElementById('app-root');
    // Owners only see their own flats (handled by backend auth)
    const res = await fetch('/api/flats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('ff_token')}` } });
    const flats = await res.json();

    root.innerHTML = `
      <div class="container">
        <div class="flex-between page-header">
          <h1 class="page-title">Owner Dashboard</h1>
          <a href="#/add-flat" class="btn btn--primary">List New Flat</a>
        </div>
        <div class="stat-grid mt-lg">
          <div class="stat-card">
            <p class="stat-card__label">Active Listings</p>
            <p class="stat-card__value">${flats.data?.length || 0}</p>
          </div>
        </div>
        <h2 class="mt-lg">Your Listings</h2>
        <div class="grid mt-sm">
          ${flats.data?.map(f => `
            <div class="card" style="padding: 1.5rem">
              <h3 class="stat-card__label">${f.title}</h3>
              <p class="text-muted">${f.city} — ₹${f.rent}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderAddFlat(signal) {
    const root = document.getElementById('app-root');
    root.innerHTML = `
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">List Your Property</h1>
        </div>
        <div class="card" style="max-width: 600px; margin: 2rem auto; padding: 3rem">
          <form id="add-flat-form">
            <div class="field mt-sm">
              <label class="label">Flat Title</label>
              <input class="input" name="title" placeholder="Spacious 2BHK in South Delhi" required style="width:100%; padding:0.8rem; border:1.5px solid var(--border); border-radius:8px">
            </div>
            <div class="field mt-sm">
              <label class="label">City</label>
              <input class="input" name="city" placeholder="New Delhi" required style="width:100%; padding:0.8rem; border:1.5px solid var(--border); border-radius:8px">
            </div>
            <div class="field mt-sm">
              <label class="label">Monthly Rent (₹)</label>
              <input class="input" type="number" name="rent" placeholder="25000" required style="width:100%; padding:0.8rem; border:1.5px solid var(--border); border-radius:8px">
            </div>
            <button type="submit" class="btn btn--primary btn--full mt-lg">Publish Listing</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('add-flat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.rent = parseFloat(data.rent);
      data.type = "Apartment"; // Default for v15

      const res = await fetch('/api/flats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('ff_token')}` },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        alert('Listing Published!');
        window.location.hash = '#/dashboard';
      } else {
        alert(result.message);
      }
    }, { signal });
  }
};
