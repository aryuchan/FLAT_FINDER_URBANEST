// ff-utils.js — Frontend Utilities for FlatFinder JavaScript modules
// Provides common utilities, helpers, and extensions for frontend code

/**
 * Safely parse JSON
 */
window.safeJsonParse = function (json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

/**
 * Format currency (INR)
 */
window.formatCurrency = function (amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date
 */
window.formatDate = function (date, format = "short") {
  const options = {
    short: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    full: {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  };
  return new Intl.DateTimeFormat("en-IN", options[format]).format(
    new Date(date),
  );
};

/**
 * Time ago display (e.g., "2 hours ago")
 */
window.getTimeAgo = function (date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

  return formatDate(date);
};

/**
 * Debounce function for performance
 */
window.debounce = function (fn, delay = 300) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle function for performance
 */
window.throttle = function (fn, delay = 300) {
  let lastCall = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

/**
 * Truncate text with ellipsis
 */
window.truncateText = function (text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

/**
 * Capitalize first letter
 */
window.capitalize = function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Deep clone object
 */
window.deepClone = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
window.isEmpty = function (value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return !value;
};

/**
 * Get value from nested object by path
 */
window.getValueByPath = function (obj, path, defaultValue = undefined) {
  const keys = path.split(".");
  let value = obj;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return defaultValue;
  }
  return value;
};

/**
 * Merge objects
 */
window.mergeObjects = function (...objects) {
  return Object.assign({}, ...objects);
};

/**
 * Validate email
 */
window.isValidEmail = function (email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone number (Indian format)
 */
window.isValidPhoneNumber = function (phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10;
};

/**
 * Format phone number (Indian format)
 */
window.formatPhoneNumber = function (phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
};

/**
 * Group array by key
 */
window.groupBy = function (array, keyField) {
  return array.reduce((acc, item) => {
    const key = item[keyField];
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

/**
 * Get unique items from array
 */
window.getUnique = function (array, key) {
  if (key) {
    return array.filter(
      (item, idx, self) => self.findIndex((t) => t[key] === item[key]) === idx,
    );
  }
  return [...new Set(array)];
};

/**
 * Flatten nested array
 */
window.flattenArray = function (array, depth = Infinity) {
  return array.flat(depth);
};

/**
 * Split array into chunks
 */
window.chunkArray = function (array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Add/remove class with fallback
 */
window.toggleClass = function (element, className, force) {
  if (!element) return;
  if (force === undefined) {
    element.classList.toggle(className);
  } else {
    element.classList.toggle(className, force);
  }
};

/**
 * Check if element has class
 */
window.hasClass = function (element, className) {
  return element?.classList.contains(className) || false;
};

/**
 * Add event listener with cleanup
 */
window.on = function (element, event, handler) {
  if (!element) return;
  element.addEventListener(event, handler);
  return () => element.removeEventListener(event, handler);
};

/**
 * Query selector with error handling
 */
window.query = function (selector) {
  try {
    return document.querySelector(selector);
  } catch {
    console.warn(`[query] Invalid selector: ${selector}`);
    return null;
  }
};

/**
 * Query selector all
 */
window.queryAll = function (selector) {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    console.warn(`[queryAll] Invalid selector: ${selector}`);
    return [];
  }
};

/**
 * Set element HTML safely
 */
window.setHtml = function (element, html) {
  if (element) {
    element.innerHTML = html;
  }
};

/**
 * Set element text
 */
window.setText = function (element, text) {
  if (element) {
    element.textContent = text;
  }
};

/**
 * Show element
 */
window.show = function (element) {
  if (element) {
    element.classList.remove("hidden");
  }
};

/**
 * Hide element
 */
window.hide = function (element) {
  if (element) {
    element.classList.add("hidden");
  }
};

/**
 * Check if element is visible
 */
window.isVisible = function (element) {
  return element && !element.classList.contains("hidden");
};

/**
 * Disable element
 */
window.disable = function (element) {
  if (element) {
    element.disabled = true;
    element.classList.add("opacity-50", "cursor-not-allowed");
  }
};

/**
 * Enable element
 */
window.enable = function (element) {
  if (element) {
    element.disabled = false;
    element.classList.remove("opacity-50", "cursor-not-allowed");
  }
};

/**
 * Get form data as object
 */
window.getFormData = function (form) {
  const formData = new FormData(form);
  const obj = {};
  for (const [key, value] of formData.entries()) {
    if (obj[key]) {
      if (Array.isArray(obj[key])) {
        obj[key].push(value);
      } else {
        obj[key] = [obj[key], value];
      }
    } else {
      obj[key] = value;
    }
  }
  return obj;
};

/**
 * Retry function with exponential backoff
 */
window.retryWithBackoff = async function (fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt - 1)),
      );
    }
  }
};

/**
 * Make API call with error handling
 */
window.makeRequest = async function (path, options = {}) {
  try {
    const response = await window.apiFetch(path, options);
    if (!response.success) {
      throw new Error(response.message || "Request failed");
    }
    return response.data;
  } catch (error) {
    console.error("[makeRequest]", error.message);
    throw error;
  }
};

/**
 * Show toast notification
 */
window.showToast = function (message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type} slide-up`;
  toast.innerHTML = `
    <span>${window.escHtml(message)}</span>
    <button class="toast__close">✕</button>
  `;

  const container = document.getElementById("app-toast");
  if (container) {
    container.appendChild(toast);
    toast.querySelector(".toast__close").addEventListener("click", () => {
      toast.remove();
    });
    setTimeout(() => toast.remove(), duration);
  }
};

/**
 * Show success toast
 */
window.showSuccess = function (message, duration = 3000) {
  window.showToast(message, "success", duration);
};

/**
 * Show error toast
 */
window.showError = function (message, duration = 3000) {
  window.showToast(message, "error", duration);
};

/**
 * Show warning toast
 */
window.showWarning = function (message, duration = 3000) {
  window.showToast(message, "warning", duration);
};

/**
 * Generate unique ID
 */
window.generateId = function () {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Local storage wrapper with JSON support
 */
window.storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("[storage.set]", e);
    }
  },
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error("[storage.get]", e);
      return defaultValue;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("[storage.remove]", e);
    }
  },
  clear: () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error("[storage.clear]", e);
    }
  },
};

console.log("[ff-utils] Frontend utilities loaded successfully");
