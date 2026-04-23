// ff-auth.js — FlatFinder Auth Module
// Handles login / signup views and form events.
// Depends on: ff-core.js (API, Token, appState, apiFetch, escHtml, render,
//             renderNavBar, showToast, defaultRoute)
// ─────────────────────────────────────────────────────────────────

window.Auth = {
    viewLogin(mode = "login") {
    const isLogin = mode === "login";
    const template = document.getElementById("auth-template");
    if (!template) return "<p>Error: auth template missing</p>";
    const clone = template.content.cloneNode(true);
    
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    clone.querySelector("#auth-theme-toggle").textContent = theme === "dark" ? "Light mode" : "Dark mode";
    clone.querySelector(".auth-sub").textContent = isLogin ? "Sign in to your account" : "Create a new account";
    
    if (!isLogin) {
      clone.querySelectorAll(".signup-only").forEach(el => el.classList.remove("hidden"));
      clone.querySelector("#auth-name").required = true;
      clone.querySelector("#auth-password").placeholder = "At least 6 characters";
      clone.querySelector("#auth-password").autocomplete = "new-password";
    } else {
      clone.querySelectorAll(".login-only").forEach(el => el.classList.remove("hidden"));
      clone.querySelector("#auth-password").placeholder = "Your password";
      clone.querySelector("#auth-password").autocomplete = "current-password";
    }
    
    clone.querySelector("#auth-submit").textContent = isLogin ? "Sign In" : "Create Account";
    clone.querySelector(".auth-switch").innerHTML = isLogin 
      ? "Don't have an account? <a href=\"#/signup\" data-route=\"/signup\">Sign up free</a>"
      : "Already have an account? <a href=\"#/login\" data-route=\"/login\">Sign in</a>";
      
    const div = document.createElement("div");
    div.appendChild(clone);
    return div.innerHTML;
  },

  bindEvents(root) {
    root.querySelector("#auth-theme-toggle")?.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("ff_theme", next);
      const btn = root.querySelector("#auth-theme-toggle");
      if (btn) {
        btn.textContent = next === "dark" ? "Light mode" : "Dark mode";
      }
    });

    root.querySelector("#toggle-password")?.addEventListener("click", () => {
      const input = root.querySelector("#auth-password");
      if (input) input.type = input.type === "password" ? "text" : "password";
    });

    // Bind forgot-password here — not inside submit — so it works immediately
    root.querySelector("#forgot-password")?.addEventListener("click", (e) => {
      e.preventDefault();
      showToast(
        "Please contact support at support@urbanest.com to reset your password.",
        "info",
      );
    });

    const authForm = root.querySelector("#auth-form");
    if (!authForm) return;

    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(authForm);
      const mode = window.location.hash.includes("signup") ? "signup" : "login";
      const btn = root.querySelector("#auth-submit");
      const errEl = root.querySelector("#auth-error");

      if (errEl) {
        errEl.textContent = "";
        errEl.classList.add("hidden");
      }

      const payload =
        mode === "signup"
          ? {
              name: fd.get("name")?.trim(),
              email: fd.get("email")?.trim(),
              password: fd.get("password"),
              role: fd.get("role") || "tenant",
            }
          : { email: fd.get("email")?.trim(), password: fd.get("password") };

      btn.disabled = true;
      btn.textContent = "Please wait…";

      const r = await apiFetch(`/api/${mode}`, {
        method: "POST",
        body: payload,
      });

      btn.disabled = false;
      btn.textContent = mode === "login" ? "Sign In" : "Create Account";

      if (r.success) {
        appState.currentUser = r.data.user;
        renderNavBar();
        window.location.hash = defaultRoute();
        showToast(`Welcome back, ${r.data.user.name}!`, "success");
      } else {
        const msg = r.message || "Something went wrong.";
        if (errEl) {
          errEl.textContent = msg;
          errEl.classList.remove("hidden");
        }
        showToast(msg, "error");
      }
    });
  },
};
