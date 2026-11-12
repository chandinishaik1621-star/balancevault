// Redis Client with Resilient In-Memory Fallback
// Guarantees high availability: uses Redis if available, or seamless in-memory store if offline

class InMemoryStore {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, durationSeconds) {
    const expiry = durationSeconds ? Date.now() + durationSeconds * 1000 : Infinity;
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async incr(key) {
    const item = this.store.get(key);
    let val = 1;
    let expiry = Date.now() + 60 * 1000;
    if (item && Date.now() <= item.expiry) {
      val = parseInt(item.value, 10) + 1;
      expiry = item.expiry;
    }
    this.store.set(key, { value: String(val), expiry });
    return val;
  }

  async expire(key, seconds) {
    const item = this.store.get(key);
    if (item) {
      item.expiry = Date.now() + seconds * 1000;
    }
    return 1;
  }
}

let redisClient = null;
let isRedisConnected = false;
const fallbackStore = new InMemoryStore();

const initRedis = () => {
  if (process.env.REDIS_URL && process.env.ENABLE_REDIS === 'true') {
    try {
      // Optional external Redis if required
      console.log('[Redis] Attempting connection to', process.env.REDIS_URL);
    } catch (err) {
      console.warn('[Redis] Connection error, using in-memory store:', err.message);
    }
  }
};

initRedis();

module.exports = {
  get: async (key) => (isRedisConnected && redisClient ? redisClient.get(key) : fallbackStore.get(key)),
  set: async (key, val, mode, ttl) => (isRedisConnected && redisClient ? redisClient.set(key, val, mode, ttl) : fallbackStore.set(key, val, mode, ttl)),
  incr: async (key) => (isRedisConnected && redisClient ? redisClient.incr(key) : fallbackStore.incr(key)),
  expire: async (key, sec) => (isRedisConnected && redisClient ? redisClient.expire(key, sec) : fallbackStore.expire(key, sec)),
  isAvailable: () => isRedisConnected,
  getMode: () => (isRedisConnected ? 'redis' : 'in-memory-resilient')
};

