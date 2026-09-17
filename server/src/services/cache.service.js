/**
 * High-Performance In-Memory Cache with TTL and Max-Size Eviction
 */

class MemoryCache {
  constructor(defaultTtlMs = 5 * 60 * 1000, maxSize = 1000) {
    this.defaultTtl = defaultTtlMs;
    this.maxSize = maxSize;
    this.store = new Map();

    // Auto-cleanup interval every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtl) {
    if (this.store.size >= this.maxSize) {
      // Remove oldest 20% entries
      const keysToDelete = Array.from(this.store.keys()).slice(0, Math.floor(this.maxSize * 0.2));
      for (const k of keysToDelete) {
        this.store.delete(k);
      }
    }

    this.store.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }
}

export const feedCache = new MemoryCache(4 * 60 * 1000, 500);
export const searchCache = new MemoryCache(3 * 60 * 1000, 500);
export const infoCache = new MemoryCache(15 * 60 * 1000, 500);
export const relatedCache = new MemoryCache(10 * 60 * 1000, 500);
