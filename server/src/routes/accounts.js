const express = require('express');
const prisma = require('../config/db');
const LedgerService = require('../services/ledgerService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/accounts
 * Lists user's accounts
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' && req.query.all === 'true'
      ? {}
      : { userId: req.user.id };

    const accounts = await prisma.account.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      count: accounts.length,
      accounts
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/accounts/:id
 * Retrieves specific account with strict ownership verification
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, fullName: true } }
      }
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    // Strict Authorization check
    if (req.user.role !== 'ADMIN' && account.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not authorized to view this account.'
      });
    }

    return res.status(200).json({
      success: true,
      account
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/accounts/:id/ledger
 * Retrieves double-entry ledger records for an account
 */
router.get('/:id/ledger', authenticate, async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id }
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'AUDITOR' && account.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { accountId: req.params.id },
      include: {
        transaction: {
          select: {
            referenceId: true,
            type: true,
            description: true,
            sourceAccount: true,
            targetAccount: true,
            status: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    return res.status(200).json({
      success: true,
      count: ledgerEntries.length,
      ledgerEntries
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/accounts/:id/verify-ledger
 * Proves mathematically that the ledger is balanced and uncorrupted!
 */
router.get('/:id/verify-ledger', authenticate, async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id }
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'AUDITOR' && account.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const proof = await LedgerService.verifyLedgerIntegrity(req.params.id);

    return res.status(200).json({
      success: true,
      proof
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

