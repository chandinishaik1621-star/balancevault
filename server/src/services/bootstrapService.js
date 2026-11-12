const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const AuditService = require('./auditService');

class BootstrapService {
  /**
   * Checks whether the system has already been bootstrapped
   */
  static async getBootstrapStatus() {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });

    const config = await prisma.systemConfig.findUnique({
      where: { key: 'ADMIN_BOOTSTRAPPED' }
    });

    const isBootstrapped = adminCount > 0 || (config && config.value === 'true');

    return {
      isBootstrapped,
      adminCount
    };
  }

  /**
   * Executes atomic first-admin bootstrap
   */
  static async bootstrapFirstAdmin({
    email,
    password,
    fullName,
    phone,
    bootstrapSecret,
    ipAddress = '127.0.0.1',
    userAgent = 'system'
  }) {
    const { isBootstrapped } = await this.getBootstrapStatus();

    if (isBootstrapped) {
      const error = new Error('System is already bootstrapped. First-admin bootstrap is locked.');
      error.statusCode = 403;
      throw error;
    }

    // Validate bootstrap secret from environment
    const requiredSecret = process.env.BOOTSTRAP_SECRET || 'BV_INITIAL_ADMIN_BOOTSTRAP_SECRET_2026';
    if (!bootstrapSecret || bootstrapSecret !== requiredSecret) {
      const error = new Error('Invalid or missing administrator bootstrap authorization secret.');
      error.statusCode = 401;
      throw error;
    }

    if (!email || !password || !fullName) {
      const error = new Error('Email, password, and full name are required to bootstrap admin.');
      error.statusCode = 400;
      throw error;
    }

    if (password.length < 8) {
      const error = new Error('Admin password must be at least 8 characters long.');
      error.statusCode = 400;
      throw error;
    }

    // Hash admin password securely
    const hashedPassword = await bcrypt.hash(password, 12);

    // Atomic transaction for admin creation and bootstrap sealing
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Admin User
      const admin = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          fullName,
          phone: phone || null,
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      });

      // 2. Create Master Administrative Account
      const adminAccount = await tx.account.create({
        data: {
          accountNumber: 'BV-ADMIN-0001',
          userId: admin.id,
          accountType: 'BUSINESS',
          balance: 1000000.0, // Initial liquidity reserve for testing
          currency: 'USD',
          status: 'ACTIVE'
        }
      });

      // 3. Mark system config as bootstrapped
      await tx.systemConfig.upsert({
        where: { key: 'ADMIN_BOOTSTRAPPED' },
        update: { value: 'true' },
        create: { key: 'ADMIN_BOOTSTRAPPED', value: 'true' }
      });

      return { admin, adminAccount };
    });

    // Record Immutable Audit Log
    await AuditService.log({
      actorId: result.admin.id,
      actorEmail: result.admin.email,
      actorRole: 'ADMIN',
      action: 'ADMIN_BOOTSTRAP',
      resource: 'System',
      resourceId: result.admin.id,
      ipAddress,
      userAgent,
      metadata: {
        event: 'First-time administrative bootstrap completed',
        adminEmail: result.admin.email,
        adminAccountId: result.adminAccount.id
      }
    });

    return {
      id: result.admin.id,
      email: result.admin.email,
      fullName: result.admin.fullName,
      role: result.admin.role,
      accountNumber: result.adminAccount.accountNumber
    };
  }
}

module.exports = BootstrapService;

