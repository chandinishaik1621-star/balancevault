const express = require('express');
const prisma = require('../config/db');
const AuditService = require('../services/auditService');
const { authenticate } = require('../middleware/auth');
const { requireAuditorOrAdmin } = require('../middleware/rbac');

const router = express.Router();

/**
 * GET /api/audit/logs
 * Retrieves immutable audit records (ADMIN or AUDITOR role required)
 */
router.get('/logs', authenticate, requireAuditorOrAdmin, async (req, res) => {
  try {
    const { action, actorId, limit = 100 } = req.query;

    const where = {};
    if (action) where.action = action;
    if (actorId) where.actorId = actorId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit, 10)
    });

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/audit/verify
 * Proves mathematically that no audit logs were modified, deleted, or inserted out of order
 */
router.get('/verify', authenticate, requireAuditorOrAdmin, async (req, res) => {
  try {
    const integrityReport = await AuditService.verifyIntegrity();

    return res.status(200).json({
      success: true,
      report: integrityReport
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

