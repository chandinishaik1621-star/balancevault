const crypto = require('crypto');

/**
 * Computes a SHA-256 hash for a given payload string
 */
function computeSha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates chained audit hash:
 * hash = SHA256(prevHash + ":" + actorId + ":" + action + ":" + resource + ":" + timestamp + ":" + metadata)
 */
function generateAuditHash({ prevHash, actorId, action, resource, timestamp, metadata }) {
  const metaString = typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '');
  const raw = `${prevHash || '0'}:${actorId}:${action}:${resource}:${new Date(timestamp).toISOString()}:${metaString}`;
  return computeSha256(raw);
}

module.exports = {
  computeSha256,
  generateAuditHash
};

