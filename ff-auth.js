// ff-auth.js — FlatFinder Auth Module
// Handles login / signup views and form events.
// Depends on: ff-core.js (API, Token, appState, apiFetch, escHtml, render,
//             renderNavBar, showToast, defaultRoute)
// ─────────────────────────────────────────────────────────────────

const Auth = {
  viewLogin(mode = "login") {
    const isLogin = mode === "login";
    return `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-logo">🏠</div>
          <h1 class="auth-title">FlatFinder</h1>
          <p class="auth-sub">${isLogin ? "Sign in to your account" : "Create a new account"}</p>

          <form id="auth-form" class="auth-form" novalidate autocomplete="on">
            ${
              !isLogin
                ? `
            <div class="form-group">
              <label class="form-label" for="auth-name">Full Name</label>
              <input class="form-input" id="auth-name" name="name" type="text"
                placeholder="Aarav Mehta" autocomplete="name" required minlength="2" />
            </div>`
                : ""
            }

            <div class="form-group">
              <label class="form-label" for="auth-email">Email</label>
              <input class="form-input" id="auth-email" name="email" type="email"
                placeholder="you@example.com" autocomplete="email" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password">Password</label>
              <div class="input-wrap">
                <input class="form-input" id="auth-password" name="password" type="password"
                  placeholder="${isLogin ? "Your password" : "At least 6 characters"}"
                  autocomplete="${isLogin ? "current-password" : "new-password"}" required minlength="6" />
                <button type="button" class="input-eye" id="toggle-password" aria-label="Toggle password visibility">👁</button>
              </div>
            </div>

            ${
              !isLogin
                ? `
            <div class="form-group">
              <label class="form-label">Account Type</label>
              <div class="role-pills">
                <label class="role-pill"><input type="radio" name="role" value="tenant" checked /> 🏠 Tenant</label>
                <label class="role-pill"><input type="radio" name="role" value="owner" /> 🔑 Owner</label>
                <label class="role-pill"><input type="radio" name="role" value="admin" /> 👑 Admin</label>
              </div>
            </div>`
                : ""
            }

            <div id="auth-error" class="form-error hidden"></div>

            <button class="btn btn--primary btn--full" type="submit" id="auth-submit">
              ${isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p class="auth-switch">
            ${
              isLogin
                ? `Don't have an account? <a href="#/signup" data-route="/signup">Sign up free</a>`
                : `Already have an account? <a href="#/login" data-route="/login">Sign in</a>`
            }
          </p>
        </div>
      </div>`;
  },

  bindEvents(root) {
    root.querySelector("#toggle-password")?.addEventListener("click", () => {
      const input = root.querySelector("#auth-password");
      if (input) input.type = input.type === "password" ? "text" : "password";
    });

    const authForm = root.querySelector("#auth-form");
    if (!authForm) return;

    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(authForm);
      const mode = window.location.hash.includes("signup") ? "signup" : "login";
      const btn = root.querySelector("#auth-submit");
      const errEl = root.querySelector("#auth-error");

      if (errEl) { errEl.textContent = ""; errEl.classList.add("hidden"); }

      const email = fd.get("email")?.trim();
      const password = fd.get("password");
      if (!email || !password) {
        if (errEl) { errEl.textContent = "Please fill in all required fields."; errEl.classList.remove("hidden"); }
        return;
      }

      btn.disabled = true;
      btn.textContent = "Verifying...";

      const payload =
        mode === "signup"
          ? { name: fd.get("name")?.trim(), email, password, role: fd.get("role") || "tenant" }
          : { email, password };

      const r = await apiFetch(`/api/${mode}`, { method: "POST", body: payload });

      btn.disabled = false;
      btn.textContent = mode === "login" ? "Sign In" : "Create Account";

      if (r.success) {
        appState.currentUser = r.data.user;
        renderNavBar();
        window.location.hash = defaultRoute();
        
        const roleName = r.data.user.role.charAt(0).toUpperCase() + r.data.user.role.slice(1);
        showToast(`Welcome back, ${r.data.user.name}! Logged in as ${roleName}.`, "success");
      } else {
        const msg = r.message || "Something went wrong.";
        if (errEl) { errEl.textContent = msg; errEl.classList.remove("hidden"); }
        showToast(msg, "error");
      }
    });
  },
};
