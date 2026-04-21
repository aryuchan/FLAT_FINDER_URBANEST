// ff-core.js — Professional SPA Engine
// Fixes: Memory leak by using AbortController for event cleanup

const state = {
  activeController: new AbortController()
};

/**
 * Global Router & Renderer
 */
async function render(viewId, data = {}) {
  // 1. Cleanup previous listeners to prevent memory leaks
  state.activeController.abort();
  state.activeController = new AbortController();

  const appRoot = document.getElementById('app-root');
  const template = document.getElementById(viewId);
  
  if (!template) {
    console.error(`Template ${viewId} not found`);
    return;
  }

  // Render logic...
  appRoot.innerHTML = template.innerHTML;
  
  // 2. Bind fresh listeners using the active controller signal
  // This ensures listeners are automatically removed on next render
  bindCoreEvents(state.activeController.signal);
}

function bindCoreEvents(signal) {
  // Fixes: Dead navigation links in landing page
  document.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const route = e.target.getAttribute('data-route');
      window.location.hash = route;
    }, { signal });
  });
}

// Global initialization
window.addEventListener('hashchange', () => {
  const hash = window.location.hash || '#/home';
  // Route mapping logic...
});
