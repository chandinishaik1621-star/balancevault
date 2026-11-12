const redisStore = require('../config/redis');

/**
 * Creates a rate limiter middleware backed by Redis or In-Memory store
 */
const rateLimit = ({ windowSeconds = 60, maxRequests = 100, message = 'Too many requests. Please try again later.' }) => {
  return async (req, res, next) => {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const key = `ratelimit:${req.baseUrl || req.path}:${clientIp}`;

      const count = await redisStore.incr(key);

      if (count === 1) {
        await redisStore.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));

      if (count > maxRequests) {
        return res.status(429).json({
          success: false,
          error: message,
          retryAfterSeconds: windowSeconds
        });
      }

      next();
    } catch (err) {
      // In case of any rate limit check error, allow request to proceed (fail open)
      next();
    }
  };
};

module.exports = {
  generalLimiter: rateLimit({ windowSeconds: 60, maxRequests: 120 }),
  authLimiter: rateLimit({
    windowSeconds: 60,
    maxRequests: 10,
    message: 'Too many authentication attempts. Please wait 60 seconds before trying again.'
  }),
  transferLimiter: rateLimit({
    windowSeconds: 60,
    maxRequests: 20,
    message: 'Transaction rate limit exceeded. Please wait a moment.'
  })
};

