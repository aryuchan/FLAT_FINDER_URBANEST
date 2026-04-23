// ff-tenant.js — FlatFinder Tenant Module
// Views: Dashboard · Search · Flat Details · Booking
// Depends on: ff-core.js
// ─────────────────────────────────────────────────────────────────

window.Tenant = {
    viewDashboard() {
    const template = document.getElementById("tenant-dashboard-template");
    if (!template) return "<p>Error: template missing</p>";
    const clone = template.content.cloneNode(true);
    const bookings = appState.bookings || [];
    
    const name = (appState.currentUser.name || "Guest").split(" ")[0] || "Guest";
    clone.querySelector("#tenant-welcome").textContent = "Welcome back, " + escHtml(name) + " 👋";
    
    const tbody = clone.querySelector("#tenant-bookings-tbody");
    if (bookings.length) {
      tbody.innerHTML = bookings.map(b => {
        const statusClass = b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "warning";
        const cancelAction = b.status === "pending" ? '<button class="btn btn--danger btn--sm" type="button" data-action="cancel-booking" data-booking-id="' + b.id + '">Cancel</button>' : "—";
        return "<tr>" +
          "<td><strong>" + escHtml(b.flat_title) + "</strong><br><small class=\"text-muted\">📍 " + escHtml(b.city) + "</small></td>" +
          "<td>" + b.check_in + " → " + b.check_out + "</td>" +
          "<td>₹" + Number(b.total_rent).toLocaleString("en-IN") + "</td>" +
          "<td><span class=\"badge badge--" + statusClass + "\">" + b.status + "</span></td>" +
          "<td>" + cancelAction + "</td>" +
        "</tr>";
      }).join("");
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No bookings yet. <a href="#/tenant/search" data-route="/tenant/search">Search flats →</a></td></tr>';
    }
    
    const div = document.createElement("div");
    div.appendChild(clone);
    return div.innerHTML;
  },

  viewSearch(flats = appState.flats) {
    const template = document.getElementById("flat-search-template");
    if (!template) return "<p>Error: template missing</p>";
    const clone = template.content.cloneNode(true);
    
    clone.querySelector(".flat-count").textContent = flats.length + " flat" + (flats.length !== 1 ? "s" : "") + " found";
    const grid = clone.querySelector(".flat-grid");
    
    if (flats.length) {
      grid.innerHTML = flats.map(f => {
        return "<div class=\"flat-card card\">" +
          "<div class=\"flat-card__header\">" +
            "<span class=\"badge badge--neutral\">" + escHtml(f.type) + "</span>" +
            (f.furnished ? "<span class=\"badge badge--success\">Furnished</span>" : "<span class=\"badge badge--neutral\">Unfurnished</span>") +
          "</div>" +
          (f.images && f.images.length ? "<div class=\"flat-card__img-wrap\"><img class=\"flat-card__img\" src=\"" + escHtml(f.images[0]) + "\" alt=\"" + escHtml(f.title || f.flat_title || '') + "\" loading=\"lazy\" onerror=\"this.style.display='none'\" /></div>" : "") +
          "<h3 class=\"flat-card__title\">" + escHtml(f.title || f.flat_title || '') + "</h3>" +
          "<p class=\"flat-card__city\">📍 " + escHtml(f.city) + "</p>" +
          "<p class=\"flat-card__rent\">₹" + Number(f.rent).toLocaleString("en-IN") + "<span>/mo</span></p>" +
          "<p class=\"text-muted\" style=\"font-size:0.8rem\">Owner: " + escHtml(f.owner_name || "N/A") + "</p>" +
          "<a class=\"btn btn--primary btn--sm mt-sm\" href=\"#/tenant/flat/" + f.id + "\" data-route=\"/tenant/flat/" + f.id + "\">View Details →</a>" +
        "</div>";
      }).join("");
    } else {
      grid.innerHTML = "<div class=\"empty-state\"><p style=\"font-size:2rem\">🏚️</p><p>No flats match your filters.</p><p class=\"text-muted\">Try adjusting your search criteria.</p></div>";
    }
    
    const div = document.createElement("div");
    div.appendChild(clone);
    return div.innerHTML;
  },

    viewFlatDetails(flat) {
    if (!flat) return "<div class=\"container page-content\"><div class=\"empty-state\"><p>Flat not found.</p><a class=\"btn btn--secondary\" href=\"#/tenant/search\" data-route=\"/tenant/search\">Back to Search</a></div></div>";

    const template = document.getElementById("flat-detail-template");
    const clone = template.content.cloneNode(true);
    
    const amenities = Array.isArray(flat.amenities) ? flat.amenities : [];
    const images = Array.isArray(flat.images) ? flat.images : [];

    if (images.length) {
      clone.querySelector(".gallery-container").innerHTML = "<div class=\"flat-gallery\">" + images.map((src, i) => "<img class=\"flat-gallery__img" + (i === 0 ? " flat-gallery__img--main" : "") + "\" src=\"" + escHtml(src) + "\" alt=\"Flat image " + (i + 1) + "\" loading=\"lazy\" onerror=\"this.style.display='none'\" />").join("") + "</div>";
    }

    clone.querySelector(".detail-type").textContent = flat.type;
    const furnishedBadge = clone.querySelector(".detail-furnished");
    furnishedBadge.textContent = flat.furnished ? 'Furnished' : 'Unfurnished';
    furnishedBadge.className = "badge " + (flat.furnished ? 'badge--success' : 'badge--neutral') + " detail-furnished";
    
    const availBadge = clone.querySelector(".detail-available");
    availBadge.textContent = flat.available ? 'Available' : 'Not Available';
    availBadge.className = "badge " + (flat.available ? 'badge--success' : 'badge--danger') + " detail-available";

    clone.querySelector(".detail-title").textContent = flat.title;
    clone.querySelector(".detail-city").textContent = "📍 " + flat.city + (flat.address ? " — " + flat.address : "");
    clone.querySelector(".detail-rent").innerHTML = "₹" + Number(flat.rent).toLocaleString("en-IN") + " <span>/ month</span>";
    
    if (flat.description) clone.querySelector(".detail-desc").textContent = flat.description;
    
    if (amenities.length) {
      clone.querySelector(".amenities-container").innerHTML = "<div><p class=\"form-label\" style=\"margin-bottom:var(--space-xs)\">Amenities</p><div class=\"amenity-tags\">" + amenities.map(a => "<span class=\"badge badge--neutral\">✓ " + escHtml(a) + "</span>").join("") + "</div></div>";
    }
    
    const actContainer = clone.querySelector(".action-container");
    if (flat.available) {
      actContainer.innerHTML = "<a class=\"btn btn--primary\" href=\"#/tenant/booking/" + flat.id + "\" data-route=\"/tenant/booking/" + flat.id + "\">📅 Book This Flat →</a>";
    } else {
      actContainer.innerHTML = "<button class=\"btn btn--secondary\" disabled>Not Available</button>";
    }
    
    clone.querySelector(".owner-contact-container").innerHTML = 
      "<div class=\"owner-contact-card\">" +
        "<h4 class=\"owner-contact-card__title\">🔑 About the Owner</h4>" +
        "<p class=\"owner-contact-card__name\">" + escHtml(flat.owner_name || "Property Owner") + "</p>" +
        (flat.owner_phone ? "<a class=\"owner-contact-card__item\" href=\"tel:" + escHtml(flat.owner_phone) + "\">📞 " + escHtml(flat.owner_phone) + "</a>" : "") +
        (flat.owner_email ? "<a class=\"owner-contact-card__item\" href=\"mailto:" + escHtml(flat.owner_email) + "\">✉️ " + escHtml(flat.owner_email) + "</a>" : "") +
        (flat.owner_whatsapp ? "<a class=\"owner-contact-card__item owner-contact-card__item--whatsapp\" href=\"https://wa.me/" + flat.owner_whatsapp.replace(/\\D/g, '') + "\" target=\"_blank\" rel=\"noopener\">💬 WhatsApp</a>" : "") +
        (flat.owner_telegram ? "<a class=\"owner-contact-card__item owner-contact-card__item--telegram\" href=\"https://t.me/" + flat.owner_telegram + "\" target=\"_blank\" rel=\"noopener\">✈️ Telegram</a>" : "") +
        (flat.owner_bio ? "<p class=\"owner-contact-card__bio\">" + escHtml(flat.owner_bio) + "</p>" : "") +
      "</div>";

    const div = document.createElement("div");
    div.appendChild(clone);
    return div.innerHTML;
  },

    viewBooking(flat) {
    if (!flat) return "<div class=\"container page-content\"><div class=\"empty-state\"><p>Flat not found.</p></div></div>";

    const template = document.getElementById("booking-form-template");
    const clone = template.content.cloneNode(true);
    
    const today = new Date().toISOString().split("T")[0];
    const link = clone.querySelector(".booking-back-link");
    link.href = "#/tenant/flat/" + flat.id;
    link.dataset.route = "/tenant/flat/" + flat.id;
    
    clone.querySelector(".booking-sub").textContent = flat.title + " — ₹" + Number(flat.rent).toLocaleString("en-IN") + "/month";
    clone.querySelector('[name="flat_id"]').value = flat.id;
    clone.querySelector("#check-in").min = today;
    clone.querySelector("#check-out").min = today;

    const div = document.createElement("div");
    div.appendChild(clone);
    return div.innerHTML;
  },

  bindEvents(root) {
    const filterForm = root.querySelector("#flat-search-filter-form");
    if (filterForm) {
      filterForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(filterForm);
        const params = new URLSearchParams();
        for (const [k, v] of fd.entries()) if (v) params.set(k, v);
        const r = await apiFetch(`/api/flats?${params}`);
        if (r.success) {
          appState.flats = r.data;
          render(Tenant.viewSearch(r.data));
        } else showToast(r.message, "error");
      });

      root
        .querySelector("#filter-reset-btn")
        ?.addEventListener("click", async () => {
          filterForm.reset();
          const r = await apiFetch("/api/flats");
          if (r.success) {
            appState.flats = r.data;
            render(Tenant.viewSearch(r.data));
          }
        });
    }

    const bookingForm = root.querySelector("#booking-form");
    if (bookingForm) {
      const calcRent = () => {
        const ci = bookingForm.querySelector('[name="check_in"]')?.value;
        const co = bookingForm.querySelector('[name="check_out"]')?.value;
        const pre = root.querySelector("#rent-preview");
        const val = root.querySelector("#rent-preview-value");
        if (ci && co && appState._selectedFlat) {
          const days = Math.ceil((new Date(co) - new Date(ci)) / 86400000);
          if (days > 0) {
            const est = (
              (parseFloat(appState._selectedFlat.rent) / 30) *
              days
            ).toFixed(2);
            if (val)
              val.textContent = `₹${Number(est).toLocaleString("en-IN")} (${days} days)`;
            if (pre) pre.classList.remove("hidden");
            return;
          }
        }
        if (pre) pre.classList.add("hidden");
      };
      bookingForm
        .querySelector('[name="check_in"]')
        ?.addEventListener("change", calcRent);
      bookingForm
        .querySelector('[name="check_out"]')
        ?.addEventListener("change", calcRent);

      bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(bookingForm);
        const payload = {
          flat_id: fd.get("flat_id"),
          check_in: fd.get("check_in"),
          check_out: fd.get("check_out"),
        };
        if (!payload.check_in || !payload.check_out) {
          showToast(
            "Please select both check-in and check-out dates.",
            "error",
          );
          return;
        }
        const btn = bookingForm.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.textContent = "Submitting…";
        const r = await apiFetch("/api/bookings", {
          method: "POST",
          body: payload,
        });
        btn.disabled = false;
        btn.textContent = "Confirm Booking";
        if (r.success) {
          showToast("Booking submitted successfully!", "success");
          window.location.hash = "#/tenant/dashboard";
        } else {
          showToast(r.message || "Booking failed.", "error");
        }
      });
    }

    root.addEventListener("click", async (e) => {
      const btn = e.target.closest('[data-action="cancel-booking"]');
      if (!btn) return;
      const bId = btn.dataset.bookingId;
      if (!bId) return;

      showModal(`
        <div class="modal-message">
          <p class="empty-state__icon">!</p>
          <h3>Cancel Booking?</h3>
          <p class="text-muted">Are you sure you want to cancel this booking? This will notify the property owner.</p>
          <div class="modal-btn-row">
            <button class="btn btn--neutral btn--full" type="button" onclick="closeModal()">Keep Booking</button>
            <button class="btn btn--danger btn--full" type="button" id="confirm-cancel-booking-btn">Yes, Cancel</button>
          </div>
        </div>
      `);

      const confirmCancelBtn = document.getElementById(
        "confirm-cancel-booking-btn",
      );
      if (!confirmCancelBtn) return;

      confirmCancelBtn.addEventListener("click", async () => {
        const confirmBtn = document.getElementById(
          "confirm-cancel-booking-btn",
        );
        if (!confirmBtn) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Cancelling...";

        const r = await apiFetch(`/api/bookings/${bId}`, {
          method: "PATCH",
          body: { status: "cancelled" },
        });
        closeModal();

        if (r.success) {
          showToast("Booking cancelled.", "info");
          const br = await apiFetch("/api/bookings");
          if (br.success) appState.bookings = br.data;
          render(Tenant.viewDashboard());
        } else {
          showToast(r.message, "error");
        }
      });
    });
  },
};
