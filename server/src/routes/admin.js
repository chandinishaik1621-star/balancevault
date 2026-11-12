const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');
const BootstrapService = require('../services/bootstrapService');
const AuditService = require('../services/auditService');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

const router = express.Router();

/**
 * GET /api/admin/bootstrap-status
 * Public endpoint to check if system needs first-time admin bootstrap
 */
router.get('/bootstrap-status', async (req, res) => {
  try {
    const status = await BootstrapService.getBootstrapStatus();
    return res.status(200).json({ success: true, ...status });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/bootstrap
 * Executes first-time administrator bootstrap
 */
router.post('/bootstrap', async (req, res) => {
  try {
    const { email, password, fullName, phone, bootstrapSecret } = req.body;

    const admin = await BootstrapService.bootstrapFirstAdmin({
      email,
      password,
      fullName,
      phone,
      bootstrapSecret,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'browser'
    });

    return res.status(201).json({
      success: true,
      message: 'First-time administrative bootstrap completed successfully.',
      admin
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/stats
 * Admin dashboard high-level metrics
 */
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalAccounts, pendingOnboarding, totalTxnCount, accounts] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.onboardingApplication.count({ where: { status: 'PENDING' } }),
      prisma.transaction.count(),
      prisma.account.findMany({ select: { balance: true } })
    ]);

    const totalLiquidity = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalAccounts,
        pendingOnboarding,
        totalTransactions: totalTxnCount,
        totalLiquidity: Math.round(totalLiquidity * 100) / 100
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/users
 * Lists all registered users with their status and accounts
 */
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            accountNumber: true,
            accountType: true,
            balance: true,
            status: true
          }
        },
        onboardingApplication: {
          select: {
            id: true,
            status: true,
            accountTypeDesired: true,
            submittedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, count: users.length, users });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Admin updates a user's role (USER, ADMIN, AUDITOR)
 */
router.patch('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['USER', 'ADMIN', 'AUDITOR'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role specified.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, fullName: true, role: true }
    });

    await AuditService.log({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'USER_ROLE_CHANGED',
      resource: 'User',
      resourceId: updated.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { newRole: role, targetEmail: updated.email }
    });

    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Admin suspends or reactivates a user
 */
router.patch('/users/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be ACTIVE or SUSPENDED.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, email: true, fullName: true, status: true }
    });

    await AuditService.log({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: updated.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { newStatus: status, targetEmail: updated.email }
    });

    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/onboarding
 * Lists all onboarding submissions
 */
router.get('/onboarding', authenticate, requireAdmin, async (req, res) => {
  try {
    const applications = await prisma.onboardingApplication.findMany({
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return res.status(200).json({ success: true, count: applications.length, applications });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/onboarding/:id/review
 * Approves or Rejects an onboarding application
 * When approved, automatically provisions a dedicated account with starter demo funds!
 */
router.patch('/onboarding/:id/review', authenticate, requireAdmin, async (req, res) => {
  try {
    const { decision, notes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Decision must be either APPROVED or REJECTED.'
      });
    }

    const application = await prisma.onboardingApplication.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Onboarding application not found.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update application status
      const updatedApp = await tx.onboardingApplication.update({
        where: { id: application.id },
        data: {
          status: decision,
          reviewNotes: notes || null,
          reviewedBy: req.user.email,
          reviewedAt: new Date()
        }
      });

      let newAccount = null;

      // 2. If APPROVED, create default active account if user doesn't already have one
      if (decision === 'APPROVED') {
        const existingAccount = await tx.account.findFirst({
          where: { userId: application.userId }
        });

        if (!existingAccount) {
          const rawNum = Math.floor(10000000 + Math.random() * 90000000);
          const accountNumber = `BV-${rawNum.toString().slice(0, 4)}-${rawNum.toString().slice(4)}`;
          const initialStarterBalance = 1500.0; // Complimentary demo balance for evaluation

          newAccount = await tx.account.create({
            data: {
              accountNumber,
              userId: application.userId,
              accountType: application.accountTypeDesired || 'SAVINGS',
              balance: initialStarterBalance,
              currency: 'USD',
              status: 'ACTIVE'
            }
          });

          // Create ledger entry for initial grant
          const starterTxn = await tx.transaction.create({
            data: {
              referenceId: `INIT-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`,
              type: 'DEPOSIT',
              amount: initialStarterBalance,
              currency: 'USD',
              status: 'COMPLETED',
              description: 'Initial Onboarding Verification Credit',
              targetAccount: accountNumber,
              metadata: JSON.stringify({ onboardingApproved: true })
            }
          });

          await tx.ledgerEntry.create({
            data: {
              transactionId: starterTxn.id,
              accountId: newAccount.id,
              entryType: 'CREDIT',
              amount: initialStarterBalance,
              balanceAfter: initialStarterBalance
            }
          });
        }
      }

      return { updatedApp, newAccount };
    });

    await AuditService.log({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: `ONBOARDING_${decision}`,
      resource: 'OnboardingApplication',
      resourceId: application.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        decision,
        notes,
        userId: application.userId,
        accountProvisioned: result.newAccount ? result.newAccount.accountNumber : null
      }
    });

    return res.status(200).json({
      success: true,
      message: `Application ${decision.toLowerCase()} successfully.`,
      application: result.updatedApp,
      account: result.newAccount
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

