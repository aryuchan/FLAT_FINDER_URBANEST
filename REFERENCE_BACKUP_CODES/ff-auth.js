// ff-auth.js — FlatFinder Auth Module
// Handles login / signup views and form events.
// Depends on: ff-core.js (API, Token, appState, apiFetch, escHtml, render,
//             renderNavBar, showToast)
// defaultRoute() is defined in app.js (loaded after this file).
// ─────────────────────────────────────────────────────────────────

const Auth = {
  viewLogin(mode = 'login') {
    const isLogin = mode === 'login';
    return `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-logo" aria-hidden="true">🏠</div>
          <h1 class="auth-title">FlatFinder</h1>
          <p class="auth-sub">${isLogin ? 'Sign in to your account' : 'Create a new account'}</p>

          <form id="auth-form" class="auth-form" novalidate autocomplete="on"
            aria-label="${isLogin ? 'Sign in form' : 'Sign up form'}">

            ${!isLogin ? `
            <div class="form-group">
              <label class="form-label" for="auth-name">Full Name</label>
              <input class="form-input" id="auth-name" name="name" type="text"
                placeholder="Aarav Mehta"
                autocomplete="name"
                required minlength="2" maxlength="120" />
            </div>` : ''}

            <div class="form-group">
              <label class="form-label" for="auth-email">Email</label>
              <input class="form-input" id="auth-email" name="email" type="email"
                placeholder="you@example.com"
                autocomplete="email"
                required maxlength="255" />
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password">Password</label>
              <div class="input-wrap">
                <input class="form-input" id="auth-password" name="password" type="password"
                  placeholder="${isLogin ? 'Your password' : 'At least 6 characters'}"
                  autocomplete="${isLogin ? 'current-password' : 'new-password'}"
                  required minlength="6" maxlength="128" />
                <button type="button" class="input-eye" id="toggle-password"
                  aria-label="Show password" aria-pressed="false"
                  aria-controls="auth-password">👁</button>
              </div>
            </div>

            ${!isLogin ? `
            <fieldset class="form-group" style="border:none;padding:0;margin:0">
              <legend class="form-label">Account Type</legend>
              <div class="role-pills" role="radiogroup" aria-label="Select account type">
                <label class="role-pill">
                  <input type="radio" name="role" value="tenant" required checked /> 🏠 Tenant
                </label>
                <label class="role-pill">
                  <input type="radio" name="role" value="owner" /> 🔑 Owner
                </label>
              </div>
            </fieldset>` : ''}

            <div id="auth-error" class="form-error hidden" role="alert" aria-live="polite"></div>

            <button class="btn btn--primary btn--full" type="submit" id="auth-submit">
              ${isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p class="auth-switch">
            ${isLogin
              ? `Don't have an account? <a href="#/signup" data-route="/signup">Sign up free</a>`
              : `Already have an account? <a href="#/login" data-route="/login">Sign in</a>`}
          </p>
        </div>
      </div>`;
  },

  bindEvents(root) {
    // ── Password visibility toggle ──────────────────────────────
    root.querySelector('#toggle-password')?.addEventListener('click', (e) => {
      const input = root.querySelector('#auth-password');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      e.currentTarget.setAttribute('aria-pressed', show ? 'true' : 'false');
    });

    // ── Auth form submit ────────────────────────────────────────
    const authForm = root.querySelector('#auth-form');
    if (!authForm) return;

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mode  = window.location.hash.includes('signup') ? 'signup' : 'login';
      const btn   = root.querySelector('#auth-submit');
      const errEl = root.querySelector('#auth-error');

      if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }

      // Delegate required / type / minlength checks to the HTML5 constraint API.
      // All inputs already carry the appropriate attributes so no manual checks needed.
      if (!authForm.checkValidity()) {
        authForm.reportValidity();
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Please wait…';

      const fd = new FormData(authForm);
      const payload = mode === 'signup'
        ? {
            name:     fd.get('name')?.trim(),
            email:    fd.get('email')?.trim(),
            password: fd.get('password'),
            role:     fd.get('role') || 'tenant',
          }
        : {
            email:    fd.get('email')?.trim(),
            password: fd.get('password'),
          };

      const r = await apiFetch(`/api/${mode}`, { method: 'POST', body: payload });

      btn.disabled    = false;
      btn.textContent = mode === 'login' ? 'Sign In' : 'Create Account';

      if (r.success) {
        appState.currentUser = r.data.user;
        renderNavBar();
        // defaultRoute() is defined in app.js — safe to call here as scripts load in order.
        window.location.hash = defaultRoute();
        showToast(r.message || 'Welcome!', 'success');
      } else {
        const msg = r.message || 'Something went wrong. Please try again.';
        if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
        showToast(msg, 'error');
      }
    });
  },
};
