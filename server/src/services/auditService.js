const prisma = require('../config/db');
const { generateAuditHash } = require('../utils/cryptoHash');

class AuditService {
  /**
   * Logs an immutable, cryptographically chained audit event
   */
  static async log({
    actorId = 'SYSTEM',
    actorEmail = null,
    actorRole = null,
    action,
    resource,
    resourceId = null,
    ipAddress = '127.0.0.1',
    userAgent = 'system',
    metadata = {}
  }) {
    try {
      // Find the last audit log to get prevHash
      const lastLog = await prisma.auditLog.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      const prevHash = lastLog ? lastLog.hash : '0000000000000000000000000000000000000000000000000000000000000000';
      const timestamp = new Date();
      const metaString = JSON.stringify(metadata);

      const hash = generateAuditHash({
        prevHash,
        actorId,
        action,
        resource,
        timestamp,
        metadata: metaString
      });

      return await prisma.auditLog.create({
        data: {
          actorId,
          actorEmail,
          actorRole,
          action,
          resource,
          resourceId,
          ipAddress,
          userAgent,
          metadata: metaString,
          prevHash,
          hash,
          timestamp
        }
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err.message);
      // Non-blocking in catastrophic error to avoid crashing user operation, but logged
      return null;
    }
  }

  /**
   * Mathematically verifies the entire cryptographic hash chain
   */
  static async verifyIntegrity() {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'asc' }
    });

    let currentExpectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const violations = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // 1. Verify prevHash link
      if (log.prevHash !== currentExpectedPrevHash) {
        violations.push({
          index: i,
          logId: log.id,
          error: 'Chain broken: prevHash does not match previous entry hash',
          found: log.prevHash,
          expected: currentExpectedPrevHash
        });
      }

      // 2. Re-compute hash from log content
      const recalculatedHash = generateAuditHash({
        prevHash: log.prevHash,
        actorId: log.actorId,
        action: log.action,
        resource: log.resource,
        timestamp: log.timestamp,
        metadata: log.metadata
      });

      if (log.hash !== recalculatedHash) {
        violations.push({
          index: i,
          logId: log.id,
          error: 'Hash mismatch: entry content has been altered or tampered',
          found: log.hash,
          recalculated: recalculatedHash
        });
      }

      currentExpectedPrevHash = log.hash;
    }

    return {
      totalEntries: logs.length,
      isValid: violations.length === 0,
      violations
    };
  }
}

module.exports = AuditService;

