// ff-auth.js — Secure Authentication Module
// Fixes: Template mismatch and error display bugs

const Auth = {
  async login(credentials) {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('ff_token', data.data.token);
        this.redirectToPortal(data.data.user.role);
      } else {
        showToast(data.message, 'danger');
      }
    } catch (err) {
      console.error('Auth crash', err);
      showToast('Connection failed', 'danger');
    }
  },

  redirectToPortal(role) {
    const portals = { tenant: '/tenant', owner: '/owner', admin: '/admin' };
    window.location.href = portals[role] || '/';
  },

  bindAuthEvents() {
    const form = document.getElementById('auth-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      this.login(data);
    });
  }
};

function showToast(msg, type = 'neutral') {
  // Fixes: spa uses #app-toast bug
  const container = document.getElementById('app-toast');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
