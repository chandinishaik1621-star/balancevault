const express = require('express');
const prisma = require('../config/db');
const LedgerService = require('../services/ledgerService');
const { authenticate } = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * POST /api/transactions/transfer
 * Executes an atomic double-entry funds transfer
 */
router.post('/transfer', authenticate, transferLimiter, async (req, res) => {
  try {
    const { sourceAccountId, targetAccountNumber, amount, description } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

    if (!sourceAccountId || !targetAccountNumber || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'sourceAccountId, targetAccountNumber, and amount are required.'
      });
    }

    const result = await LedgerService.executeTransfer({
      sourceAccountId,
      targetAccountNumber: targetAccountNumber.trim(),
      amount,
      description: description ? description.trim() : 'Transfer',
      idempotencyKey,
      actorUser: req.user,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'browser'
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[Transactions] Transfer error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/transactions/deposit
 * Demonstrative synthetic deposit to fund accounts for testing
 */
router.post('/deposit', authenticate, async (req, res) => {
  try {
    const { accountId, amount, description } = req.body;

    if (!accountId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'accountId and amount are required.'
      });
    }

    const result = await LedgerService.executeDeposit({
      accountId,
      amount,
      description: description || 'Demonstration Deposit',
      actorUser: req.user,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'browser'
    });

    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/transactions/history
 * Retrieves user or system transaction history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    let transactions;

    if (req.user.role === 'ADMIN' && req.query.all === 'true') {
      transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    } else {
      // Find all accounts owned by user
      const userAccounts = await prisma.account.findMany({
        where: { userId: req.user.id },
        select: { accountNumber: true }
      });

      const accountNumbers = userAccounts.map((a) => a.accountNumber);

      transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { sourceAccount: { in: accountNumbers } },
            { targetAccount: { in: accountNumbers } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    }

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

