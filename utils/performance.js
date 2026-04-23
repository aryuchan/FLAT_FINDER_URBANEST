// utils/performance.js — Performance monitoring and caching utilities

/**
 * Simple in-memory cache
 */
export class Cache {
  constructor(ttl = 3600000) {
    // 1 hour default
    this.store = new Map();
    this.ttl = ttl;
  }

  set(key, value, ttl = this.ttl) {
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt });
    return value;
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }

  entries() {
    return Array.from(this.store.entries()).filter(
      ([, { expiresAt }]) => expiresAt > Date.now(),
    );
  }

  cleanup() {
    const now = Date.now();
    for (const [key, { expiresAt }] of this.store.entries()) {
      if (expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Performance metrics tracker
 */
export class PerformanceMetrics {
  constructor() {
    this.metrics = new Map();
  }

  startTimer(label) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric(label, duration);
        return duration;
      },
    };
  }

  recordMetric(label, value) {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label).push(value);
  }

  getMetrics(label) {
    const values = this.metrics.get(label) || [];
    if (values.length === 0) return null;

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      total: values.reduce((a, b) => a + b, 0),
    };
  }

  getAllMetrics() {
    const result = {};
    for (const [label, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[label] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
        };
      }
    }
    return result;
  }

  clear() {
    this.metrics.clear();
  }

  reset(label) {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.clear();
    }
  }
}

/**
 * Rate limiter
 */
export class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (time) => now - time < this.windowMs,
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  getRemainingRequests(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter(
      (time) => now - time < this.windowMs,
    );
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  reset(key) {
    this.requests.delete(key);
  }

  resetAll() {
    this.requests.clear();
  }
}

/**
 * Memoization decorator
 */
export function memoize(fn, options = {}) {
  const cache = new Cache(options.ttl || 3600000);
  const maxSize = options.maxSize || 100;

  return function memoized(...args) {
    const key = JSON.stringify(args);

    // Check cache
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Compute result
    const result = fn.apply(this, args);

    // Store in cache with size limit
    if (cache.size() < maxSize) {
      cache.set(key, result);
    }

    return result;
  };
}

/**
 * Create a debounced async function
 */
export function debounceAsync(fn, delay = 300) {
  let timeoutId;
  let lastPromise;

  return function debounced(...args) {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          lastPromise = Promise.resolve(result);
          resolve(result);
        } catch (error) {
          lastPromise = Promise.reject(error);
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * Batch operations
 */
export class Batcher {
  constructor(batchFn, batchSize = 10, delayMs = 100) {
    this.batchFn = batchFn;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
    this.queue = [];
    this.timer = null;
  }

  add(item) {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });

      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.delayMs);
      }
    });
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    const items = batch.map((b) => b.item);

    try {
      const results = await this.batchFn(items);
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (error) {
      batch.forEach((b) => b.reject(error));
    }
  }

  async drain() {
    while (this.queue.length > 0 || this.timer) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

export default {
  Cache,
  PerformanceMetrics,
  RateLimiter,
  memoize,
  debounceAsync,
  Batcher,
};
