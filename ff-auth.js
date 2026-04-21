// ff-auth.js — FlatFinder Auth Module
// Handles login / signup views and form events.
// Depends on: ff-core.js (API, Token, appState, apiFetch, escHtml, render,
//             renderNavBar, showToast, defaultRoute)
// ─────────────────────────────────────────────────────────────────

const Auth = {
  viewLogin(mode = "login") {
    const isLogin = mode === "login";
    const submitLabel = isLogin ? "Sign In" : "Create Account";
    
    const signupFields = !isLogin ? `
            <div class="form-group">
              <label class="form-label" for="auth-name">Full Name</label>
              <input class="form-input" id="auth-name" name="name" type="text"
                placeholder="Aarav Mehta"
                autocomplete="name"
                spellcheck="false"
                required minlength="2" maxlength="120" />
            </div>` : "";

    const roleFields = !isLogin ? `
            <div class="form-group">
              <label class="form-label" id="role-group-label">Account Type</label>
              <div class="role-pills" role="radiogroup" aria-labelledby="role-group-label">
                <label class="role-pill"><input type="radio" name="role" value="tenant" required checked /> 🏠 Tenant</label>
                <label class="role-pill"><input type="radio" name="role" value="owner" /> 🔑 Owner</label>
              </div>
            </div>` : "";

    return populateTemplate('tmpl-auth', {
      SUBTEXT: isLogin ? "Sign in to your account" : "Create a new account",
      MODE: isLogin ? "login" : "signup",
      SIGNUP_FIELDS: signupFields,
      PASSWORD_PLACEHOLDER: isLogin ? "Your password" : "At least 6 characters",
      PASSWORD_AUTOCOMPLETE: isLogin ? "current-password" : "new-password",
      ROLE_FIELDS: roleFields,
      SUBMIT_LABEL: submitLabel,
      SWITCH_TEXT: isLogin ? "Don't have an account?" : "Already have an account?",
      SWITCH_LINK: isLogin ? "#/signup" : "#/login",
      SWITCH_ACTION: isLogin ? "Sign up free" : "Sign in"
    });
  },

  bindEvents(root) {
    // 1. Password Toggle (Delegated)
    root.querySelector("#toggle-password")?.addEventListener("click", (e) => {
      const input = root.querySelector("#auth-password");
      if (input) {
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        e.target.textContent = isHidden ? "🙈" : "👁";
      }
    });

    // 2. Form Submission (Bulletproof)
    const authForm = root.querySelector("#auth-form");
    if (!authForm) return;

    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const mode  = authForm.dataset.mode || "login";
      const btn   = root.querySelector("#auth-submit");
      const errEl = root.querySelector("#auth-error");

      if (!btn || btn.disabled) return; 

      // Reset UI
      if (errEl) { errEl.textContent = ""; errEl.classList.add("hidden"); }
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Please wait...";

      try {
        const fd = new FormData(authForm);
        const payload = mode === "signup" 
          ? { 
              name: fd.get("name")?.trim(), 
              email: (fd.get("email") || "").trim().toLowerCase(), 
              password: fd.get("password") || "", 
              role: fd.get("role") || "tenant" 
            }
          : { 
              email: (fd.get("email") || "").trim().toLowerCase(), 
              password: fd.get("password") || "" 
            };

        const r = await apiFetch(`/api/${mode}`, { method: "POST", body: payload });

        if (r.success) {
          appState.currentUser = r.data.user;
          renderNavBar();
          window.location.hash = defaultRoute();
          showToast(r.message || "Success!", "success");
        } else {
          const msg = r.message || "Authentication failed.";
          if (errEl) { errEl.textContent = msg; errEl.classList.remove("hidden"); }
          showToast(msg, "error");
          btn.disabled = false;
          btn.textContent = originalText;
        }
      } catch (err) {
        console.error("[Auth Error]", err);
        showToast("Connection error. Is the server running?", "error");
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  },
};
