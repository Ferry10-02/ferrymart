// Lightweight in-memory TTL cache with prefix invalidation for fast responses over remote DBs
const store = new Map();

const getCache = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = (key, value, ttlMs = 30000) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const invalidateCachePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
};

const clearAllCache = () => {
  store.clear();
};

module.exports = {
  getCache,
  setCache,
  invalidateCachePrefix,
  clearAllCache,
};
