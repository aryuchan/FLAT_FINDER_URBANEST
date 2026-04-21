// ff-admin.js — Hardened Admin Module
// Fixes: Missing platform-wide control logic for administrators

const Admin = {
  async init(signal) {
    await this.renderDashboard(signal);
  },

  async renderDashboard(signal) {
    const root = document.getElementById('app-root');
    // Admin fetch sees all flats regardless of availability
    const res = await fetch('/api/flats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('ff_token')}` } });
    const flats = await res.json();

    root.innerHTML = `
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Admin Terminal</h1>
        </div>
        <div class="stat-grid mt-lg">
          <div class="stat-card" style="border-left: 5px solid var(--primary)">
            <p class="stat-card__label">Total Properties</p>
            <p class="stat-card__value">${flats.data?.length || 0}</p>
          </div>
          <div class="stat-card" style="border-left: 5px solid var(--success)">
            <p class="stat-card__label">Platform Status</p>
            <p class="stat-card__value" style="color: var(--success)">Active</p>
          </div>
        </div>
        
        <h2 class="mt-lg">Global Inventory Audit</h2>
        <div class="table-wrap mt-sm">
          <table class="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>City</th>
                <th>Owner ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${flats.data?.map(f => `
                <tr>
                  <td><b>${f.title}</b></td>
                  <td>${f.city}</td>
                  <td class="text-muted" style="font-size:0.8rem">${f.owner_id}</td>
                  <td><span class="badge ${f.available ? 'badge--success' : 'badge--danger'}">${f.available ? 'Live' : 'Hidden'}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="4" style="text-align:center; padding: 2rem">No properties found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
