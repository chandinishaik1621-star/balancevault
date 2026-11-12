const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');
const AuditService = require('./auditService');

class LedgerService {
  /**
   * Performs an atomic double-entry money transfer with full idempotency guarantee
   */
  static async executeTransfer({
    sourceAccountId,
    targetAccountNumber,
    amount,
    description = 'Funds Transfer',
    idempotencyKey = null,
    actorUser,
    ipAddress = '127.0.0.1',
    userAgent = 'system'
  }) {
    if (!amount || isNaN(amount) || amount <= 0) {
      const err = new Error('Transfer amount must be a positive number greater than zero.');
      err.statusCode = 400;
      throw err;
    }

    // Round amount to 2 decimal places to avoid floating point precision issues
    const transferAmount = Math.round(Number(amount) * 100) / 100;

    // Check idempotency key to prevent duplicate operations
    if (idempotencyKey) {
      const existingTxn = await prisma.transaction.findUnique({
        where: { idempotencyKey },
        include: { ledgerEntries: true }
      });

      if (existingTxn) {
        return {
          duplicate: true,
          message: 'Idempotent replay: Transaction was previously processed.',
          transaction: existingTxn
        };
      }
    }

    const referenceId = `TXN-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch and verify source account
      const sourceAccount = await tx.account.findUnique({
        where: { id: sourceAccountId }
      });

      if (!sourceAccount) {
        const err = new Error('Source account not found.');
        err.statusCode = 404;
        throw err;
      }

      // Check ownership unless admin/auditor
      if (actorUser.role !== 'ADMIN' && sourceAccount.userId !== actorUser.id) {
        const err = new Error('Unauthorized: You do not own this source account.');
        err.statusCode = 403;
        throw err;
      }

      if (sourceAccount.status !== 'ACTIVE') {
        const err = new Error(`Source account is ${sourceAccount.status}. Transfers not permitted.`);
        err.statusCode = 400;
        throw err;
      }

      if (sourceAccount.balance < transferAmount) {
        const err = new Error(`Insufficient funds. Available balance: $${sourceAccount.balance.toFixed(2)}, Requested: $${transferAmount.toFixed(2)}`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Fetch and verify target account
      const targetAccount = await tx.account.findUnique({
        where: { accountNumber: targetAccountNumber }
      });

      if (!targetAccount) {
        const err = new Error(`Destination account "${targetAccountNumber}" does not exist.`);
        err.statusCode = 404;
        throw err;
      }

      if (targetAccount.id === sourceAccount.id) {
        const err = new Error('Source and destination accounts cannot be identical.');
        err.statusCode = 400;
        throw err;
      }

      if (targetAccount.status !== 'ACTIVE') {
        const err = new Error(`Destination account is ${targetAccount.status}. Cannot receive funds.`);
        err.statusCode = 400;
        throw err;
      }

      // 3. Compute new balances
      const newSourceBalance = Math.round((sourceAccount.balance - transferAmount) * 100) / 100;
      const newTargetBalance = Math.round((targetAccount.balance + transferAmount) * 100) / 100;

      // 4. Update source and target accounts atomically
      const updatedSource = await tx.account.update({
        where: { id: sourceAccount.id },
        data: { balance: newSourceBalance }
      });

      const updatedTarget = await tx.account.update({
        where: { id: targetAccount.id },
        data: { balance: newTargetBalance }
      });

      // 5. Create immutable Transaction record
      const transaction = await tx.transaction.create({
        data: {
          referenceId,
          idempotencyKey,
          type: 'TRANSFER',
          amount: transferAmount,
          currency: sourceAccount.currency,
          status: 'COMPLETED',
          description,
          sourceAccount: sourceAccount.accountNumber,
          targetAccount: targetAccount.accountNumber,
          metadata: JSON.stringify({
            sourceUserId: sourceAccount.userId,
            targetUserId: targetAccount.userId,
            channel: 'WEB_API'
          })
        }
      });

      // 6. Double-entry ledger: DEBIT source account
      const debitEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: sourceAccount.id,
          entryType: 'DEBIT',
          amount: transferAmount,
          balanceAfter: newSourceBalance
        }
      });

      // 7. Double-entry ledger: CREDIT destination account
      const creditEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: targetAccount.id,
          entryType: 'CREDIT',
          amount: transferAmount,
          balanceAfter: newTargetBalance
        }
      });

      return {
        transaction,
        debitEntry,
        creditEntry,
        updatedSource,
        updatedTarget
      };
    });

    // Record audit log outside transaction
    await AuditService.log({
      actorId: actorUser.id,
      actorEmail: actorUser.email,
      actorRole: actorUser.role,
      action: 'TRANSFER_COMPLETED',
      resource: 'Transaction',
      resourceId: result.transaction.id,
      ipAddress,
      userAgent,
      metadata: {
        referenceId: result.transaction.referenceId,
        amount: transferAmount,
        source: result.transaction.sourceAccount,
        target: result.transaction.targetAccount
      }
    });

    return {
      success: true,
      referenceId: result.transaction.referenceId,
      amount: transferAmount,
      sourceAccount: result.transaction.sourceAccount,
      targetAccount: result.transaction.targetAccount,
      newSourceBalance: result.updatedSource.balance,
      createdAt: result.transaction.createdAt
    };
  }

  /**
   * Deposits synthetic demonstration funds into an account
   */
  static async executeDeposit({
    accountId,
    amount,
    description = 'Demonstration Deposit',
    actorUser,
    ipAddress = '127.0.0.1',
    userAgent = 'system'
  }) {
    if (!amount || isNaN(amount) || amount <= 0) {
      const err = new Error('Deposit amount must be a positive number.');
      err.statusCode = 400;
      throw err;
    }

    const depositAmount = Math.round(Number(amount) * 100) / 100;
    const referenceId = `DEP-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        const err = new Error('Account not found.');
        err.statusCode = 404;
        throw err;
      }

      if (actorUser.role !== 'ADMIN' && account.userId !== actorUser.id) {
        const err = new Error('Unauthorized to deposit to this account.');
        err.statusCode = 403;
        throw err;
      }

      const newBalance = Math.round((account.balance + depositAmount) * 100) / 100;

      const updated = await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance }
      });

      const transaction = await tx.transaction.create({
        data: {
          referenceId,
          type: 'DEPOSIT',
          amount: depositAmount,
          currency: account.currency,
          status: 'COMPLETED',
          description,
          targetAccount: account.accountNumber,
          metadata: JSON.stringify({ syntheticDemo: true })
        }
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: account.id,
          entryType: 'CREDIT',
          amount: depositAmount,
          balanceAfter: newBalance
        }
      });

      return { transaction, updated };
    });

    await AuditService.log({
      actorId: actorUser.id,
      actorEmail: actorUser.email,
      actorRole: actorUser.role,
      action: 'DEPOSIT_COMPLETED',
      resource: 'Account',
      resourceId: accountId,
      ipAddress,
      userAgent,
      metadata: {
        referenceId: result.transaction.referenceId,
        amount: depositAmount,
        newBalance: result.updated.balance
      }
    });

    return {
      success: true,
      referenceId: result.transaction.referenceId,
      amount: depositAmount,
      newBalance: result.updated.balance,
      createdAt: result.transaction.createdAt
    };
  }

  /**
   * Mathematical proof of ledger integrity for an account:
   * Proves that Recorded Balance == Initial Balance + Sum(CREDIT) - Sum(DEBIT)
   */
  static async verifyLedgerIntegrity(accountId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        ledgerEntries: {
          orderBy: { timestamp: 'asc' },
          include: { transaction: true }
        }
      }
    });

    if (!account) {
      const err = new Error('Account not found.');
      err.statusCode = 404;
      throw err;
    }

    let calculatedBalance = 0;
    let totalCredits = 0;
    let totalDebits = 0;
    let consistencyViolations = [];

    for (let i = 0; i < account.ledgerEntries.length; i++) {
      const entry = account.ledgerEntries[i];
      if (entry.entryType === 'CREDIT') {
        calculatedBalance += entry.amount;
        totalCredits += entry.amount;
      } else if (entry.entryType === 'DEBIT') {
        calculatedBalance -= entry.amount;
        totalDebits += entry.amount;
      }

      calculatedBalance = Math.round(calculatedBalance * 100) / 100;

      // Check running balance consistency
      if (Math.abs(calculatedBalance - entry.balanceAfter) > 0.01) {
        consistencyViolations.push({
          entryId: entry.id,
          timestamp: entry.timestamp,
          expectedRunningBalance: calculatedBalance,
          recordedBalanceAfter: entry.balanceAfter
        });
      }
    }

    const currentRecordedBalance = Math.round(account.balance * 100) / 100;
    const isProved = Math.abs(calculatedBalance - currentRecordedBalance) < 0.01 && consistencyViolations.length === 0;

    return {
      accountNumber: account.accountNumber,
      currency: account.currency,
      recordedBalance: currentRecordedBalance,
      calculatedBalance,
      totalCredits: Math.round(totalCredits * 100) / 100,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalEntries: account.ledgerEntries.length,
      isProved,
      consistencyViolations
    };
  }
}

module.exports = LedgerService;

