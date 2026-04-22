// landing.js — Production Landing Experience (v18.0)

document.addEventListener("DOMContentLoaded", () => {
  console.log("Landing Engine Online");

  // 1. Theme Sync
  const savedTheme = localStorage.getItem("ff_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const themeBtn = document.getElementById("btn-theme-landing");
  if (themeBtn) {
    themeBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("ff_theme", next);
      themeBtn.textContent = next === "dark" ? "☀️" : "🌙";
    });
  }

  // 2. Smooth Scroll CTAs
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href.startsWith("#/")) return; // SPA route — don't intercept
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    });
  });

  // 3. Nav scroll-shadow (adds .nav--scrolled when user scrolls past 12px)
  const landingNav = document.getElementById("landing-nav");
  if (landingNav) {
    const onScroll = () => {
      landingNav.classList.toggle("nav--scrolled", window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once in case page is already scrolled
  }

  // 4. Hero Entrance Animation
  const hero = document.querySelector(".hero");
  if (hero) {
    hero.style.opacity = "0";
    hero.style.transform = "translateY(20px)";
    requestAnimationFrame(() => {
      hero.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
      hero.style.opacity = "1";
      hero.style.transform = "translateY(0)";
    });
  }

  // 5. Staggered feature card entrance
  const cards = document.querySelectorAll(".feature-card");
  cards.forEach((card, i) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(28px)";
    setTimeout(
      () => {
        card.style.transition = "all 0.55s cubic-bezier(0.22, 0.68, 0, 1.18)";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      },
      400 + i * 120,
    );
  });

  // 6. IntersectionObserver — reveal .reveal elements and stat-cards on scroll
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    document
      .querySelectorAll(".reveal, .stats-row .stat-card, .trust-strip")
      .forEach((el) => {
        revealObserver.observe(el);
      });
  }
});
