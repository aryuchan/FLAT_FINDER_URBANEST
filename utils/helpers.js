// utils/helpers.js — Enhanced utility functions and helpers

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Format currency values
 */
export function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * Format date to readable string
 */
export function formatDate(date, locale = "en-IN") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

/**
 * Format date and time
 */
export function formatDateTime(date, locale = "en-IN") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Check if email is valid
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Check if string is valid UUID
 */
export function isValidUUID(uuid) {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html) {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Slugify text for URLs
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a random ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Check if value is empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return !value;
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects
 */
export function mergeObjects(...objects) {
  return Object.assign({}, ...objects);
}

/**
 * Get object value by path
 */
export function getValueByPath(obj, path, defaultValue = undefined) {
  const keys = path.split(".");
  let value = obj;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return defaultValue;
  }
  return value;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff(fn, maxAttempts = 3, delay = 1000) {
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
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle(fn, delay = 300) {
  let lastCall = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10;
}

/**
 * Convert array to map by key
 */
export function arrayToMap(array, keyField) {
  const map = new Map();
  array.forEach((item) => {
    map.set(item[keyField], item);
  });
  return map;
}

/**
 * Group array by key
 */
export function groupBy(array, keyField) {
  return array.reduce((acc, item) => {
    const key = item[keyField];
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Compute time difference in human readable format
 */
export function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(date);
}

/**
 * Check if date is today
 */
export function isToday(date) {
  const today = new Date();
  const d = new Date(date);
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Get array of unique values
 */
export function getUnique(array, key) {
  if (key) {
    return array.filter(
      (item, idx, self) => self.findIndex((t) => t[key] === item[key]) === idx,
    );
  }
  return [...new Set(array)];
}

/**
 * Flatten nested array
 */
export function flattenArray(array, depth = Infinity) {
  return array.flat(depth);
}

/**
 * Split array into chunks
 */
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default {
  safeJsonParse,
  formatCurrency,
  formatDate,
  formatDateTime,
  isValidEmail,
  isValidUUID,
  truncateText,
  sanitizeHtml,
  slugify,
  generateId,
  isEmpty,
  deepClone,
  mergeObjects,
  getValueByPath,
  retryWithBackoff,
  debounce,
  throttle,
  formatPhoneNumber,
  isValidPhoneNumber,
  arrayToMap,
  groupBy,
  capitalize,
  snakeToCamel,
  camelToSnake,
  getTimeAgo,
  isToday,
  getUnique,
  flattenArray,
  chunkArray,
};
