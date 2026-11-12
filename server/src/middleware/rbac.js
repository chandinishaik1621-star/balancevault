/**
 * Server-side Role-Based Access Control (RBAC) Middleware
 * Enforces permissions at the API route layer.
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required prior to authorization.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: [${roles.join(', ')}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireAdmin: requireRole('ADMIN'),
  requireAuditorOrAdmin: requireRole(['ADMIN', 'AUDITOR']),
  requireUser: requireRole(['USER', 'ADMIN'])
};

