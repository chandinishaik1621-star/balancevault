const express = require('express');
const prisma = require('../config/db');
const redisStore = require('../config/redis');

const router = express.Router();
const startTime = Date.now();

/**
 * GET /health
 * Liveness probe: Reports process health and runtime status
 */
router.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  return res.status(200).json({
    status: 'ok',
    service: 'BalanceVault Core API',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    system: {
      nodeVersion: process.version,
      memoryHeapUsedMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100
    }
  });
});

/**
 * GET /ready
 * Readiness probe: Verifies critical dependencies (Database, Redis/Cache)
 */
router.get('/ready', async (req, res) => {
  const checks = {
    database: 'unknown',
    cache: 'unknown'
  };

  let isReady = true;

  // 1. Verify Database connectivity
  try {
    if (!prisma) {
      checks.database = 'uninitialized';
      isReady = false;
    } else {
      // Execute a lightweight query to verify active connection
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'healthy';
    }
  } catch (err) {
    checks.database = `unhealthy: ${err.message}`;
    isReady = false;
  }

  // 2. Verify Cache / Rate-Limiting store
  try {
    const mode = redisStore.getMode();
    checks.cache = mode === 'redis' ? 'healthy (redis)' : 'healthy (resilient in-memory fallback)';
  } catch (err) {
    checks.cache = `degraded: ${err.message}`;
  }

  const statusCode = isReady ? 200 : 503;

  return res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    service: 'BalanceVault',
    timestamp: new Date().toISOString(),
    checks
  });
});

module.exports = router;

