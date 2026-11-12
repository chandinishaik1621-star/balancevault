const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = require('../src/config/db');
const AuditService = require('../src/services/auditService');
const BootstrapService = require('../src/services/bootstrapService');
const LedgerService = require('../src/services/ledgerService');

test('BalanceVault Comprehensive Test Suite', async (t) => {
  // Test 1: Health & Database Connectivity
  await t.test('1. Database connectivity check', async () => {
    const check = await prisma.$queryRaw`SELECT 1 as result`;
    assert.ok(check, 'Database should be accessible');
  });

  // Test 2: Audit Logging & Cryptographic Chaining
  await t.test('2. Audit log creation and hash chain integrity', async () => {
    const log1 = await AuditService.log({
      actorId: 'TEST-USER-1',
      actorRole: 'USER',
      action: 'TEST_ACTION_ALPHA',
      resource: 'TestResource',
      metadata: { testKey: 'alpha' }
    });

    assert.ok(log1.hash, 'Log entry should have a cryptographic hash');
    assert.ok(log1.prevHash, 'Log entry should contain prevHash link');

    const log2 = await AuditService.log({
      actorId: 'TEST-USER-2',
      actorRole: 'ADMIN',
      action: 'TEST_ACTION_BETA',
      resource: 'TestResource',
      metadata: { testKey: 'beta' }
    });

    assert.strictEqual(log2.prevHash, log1.hash, 'Second log prevHash must equal first log hash');

    const integrity = await AuditService.verifyIntegrity();
    assert.strictEqual(integrity.isValid, true, 'Cryptographic audit chain must be valid');
    assert.strictEqual(integrity.violations.length, 0, 'No hash violations should exist');
  });

  // Test 3: Ledger Double-Entry, Idempotency & Mathematical Proof
  await t.test('3. Ledger transfer, idempotency and balance proof', async () => {
    // Create test accounts
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.internal`,
        password: 'hashedpassword',
        fullName: 'Test Ledger User',
        role: 'USER'
      }
    });

    const accountA = await prisma.account.create({
      data: {
        accountNumber: `BV-TEST-A-${Date.now().toString().slice(-4)}`,
        userId: testUser.id,
        balance: 1000.0
      }
    });

    const accountB = await prisma.account.create({
      data: {
        accountNumber: `BV-TEST-B-${Date.now().toString().slice(-4)}`,
        userId: testUser.id,
        balance: 200.0
      }
    });

    // Initial deposit entries so running balance matches
    const initA = await prisma.transaction.create({
      data: {
        referenceId: `INIT-A-${Date.now()}`,
        type: 'DEPOSIT',
        amount: 1000.0,
        status: 'COMPLETED',
        targetAccount: accountA.accountNumber
      }
    });
    await prisma.ledgerEntry.create({
      data: {
        transactionId: initA.id,
        accountId: accountA.id,
        entryType: 'CREDIT',
        amount: 1000.0,
        balanceAfter: 1000.0
      }
    });

    const initB = await prisma.transaction.create({
      data: {
        referenceId: `INIT-B-${Date.now()}`,
        type: 'DEPOSIT',
        amount: 200.0,
        status: 'COMPLETED',
        targetAccount: accountB.accountNumber
      }
    });
    await prisma.ledgerEntry.create({
      data: {
        transactionId: initB.id,
        accountId: accountB.id,
        entryType: 'CREDIT',
        amount: 200.0,
        balanceAfter: 200.0
      }
    });

    // Execute transfer with idempotency key
    const idemKey = `IDEM-KEY-${Date.now()}`;
    const transferResult = await LedgerService.executeTransfer({
      sourceAccountId: accountA.id,
      targetAccountNumber: accountB.accountNumber,
      amount: 350.0,
      description: 'Test Unit Transfer',
      idempotencyKey: idemKey,
      actorUser: testUser
    });

    assert.strictEqual(transferResult.success, true);
    assert.strictEqual(transferResult.newSourceBalance, 650.0);

    // Replay with duplicate idempotency key
    const duplicateAttempt = await LedgerService.executeTransfer({
      sourceAccountId: accountA.id,
      targetAccountNumber: accountB.accountNumber,
      amount: 350.0,
      description: 'Duplicate attempt',
      idempotencyKey: idemKey,
      actorUser: testUser
    });

    assert.strictEqual(duplicateAttempt.duplicate, true, 'Duplicate transfer must be rejected via idempotency');

    // Insufficient funds rejection
    await assert.rejects(
      async () => {
        await LedgerService.executeTransfer({
          sourceAccountId: accountA.id,
          targetAccountNumber: accountB.accountNumber,
          amount: 999999.0, // Exceeds balance
          description: 'Excessive Transfer',
          actorUser: testUser
        });
      },
      /Insufficient funds/,
      'Must reject transfer exceeding balance'
    );

    // Verify mathematical ledger proof
    const proofA = await LedgerService.verifyLedgerIntegrity(accountA.id);
    assert.strictEqual(proofA.isProved, true, 'Account A ledger must be mathematically proved');
    assert.strictEqual(proofA.calculatedBalance, 650.0);

    const proofB = await LedgerService.verifyLedgerIntegrity(accountB.id);
    assert.strictEqual(proofB.isProved, true, 'Account B ledger must be mathematically proved');
    assert.strictEqual(proofB.calculatedBalance, 550.0);
  });
});

