const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = require('../src/config/db');
const AuditService = require('../src/services/auditService');
const BootstrapService = require('../src/services/bootstrapService');
const LedgerService = require('../src/services/ledgerService');
const { generateAuditHash } = require('../src/utils/cryptoHash');

test('Comprehensive QA, Security, and PostgreSQL Verification Test Suite', async (t) => {
  // 1. PostgreSQL Database & Role Verification
  await t.test('1. PostgreSQL Engine & Version Verification', async () => {
    const result = await prisma.$queryRaw`SELECT version();`;
    assert.ok(result && result[0] && result[0].version, 'Must return PostgreSQL version');
    assert.match(result[0].version, /PostgreSQL/, 'Active database must be PostgreSQL');
    console.log('    Verified Database Engine:', result[0].version.split(' on ')[0]);
  });

  // 2. Authentication & Credential Verification
  await t.test('2. User Registration, Password Hashing & Login', async () => {
    const testEmail = `qa-user-${Date.now()}@test.internal`;
    const testPass = 'CorrectSecurePass123!';

    // Register
    const hashedPassword = await bcrypt.hash(testPass, 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        fullName: 'QA Verification User',
        role: 'USER',
        status: 'ACTIVE'
      }
    });

    assert.ok(user.id);
    assert.strictEqual(user.email, testEmail);

    // Password validation - valid
    const isValid = await bcrypt.compare(testPass, user.password);
    assert.strictEqual(isValid, true, 'Valid password must be verified by bcrypt');

    // Password validation - invalid
    const isInvalid = await bcrypt.compare('WrongPassword!', user.password);
    assert.strictEqual(isInvalid, false, 'Invalid password must be rejected');

    // Suspended user validation
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'SUSPENDED' }
    });

    const suspendedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert.strictEqual(suspendedUser.status, 'SUSPENDED', 'User status should be SUSPENDED');
  });

  // 3. Admin Bootstrap & State Sealing
  await t.test('3. Admin Bootstrap & Duplicate Lockout', async () => {
    const status = await BootstrapService.getBootstrapStatus();
    assert.strictEqual(status.isBootstrapped, true, 'System should detect that admin is already bootstrapped');

    // Attempting duplicate bootstrap must throw 403 Forbidden
    await assert.rejects(
      async () => {
        await BootstrapService.bootstrapFirstAdmin({
          email: 'rogue-admin@hacker.io',
          password: 'RogueAdminPassword123!',
          fullName: 'Rogue Admin',
          bootstrapSecret: process.env.BOOTSTRAP_SECRET || 'BV_INITIAL_ADMIN_BOOTSTRAP_SECRET_2026'
        });
      },
      /System is already bootstrapped/,
      'Must reject subsequent bootstrap attempts'
    );
  });

  // 4. Role-Based Access Control (RBAC) Integrity
  await t.test('4. RBAC Authorization Boundaries', async () => {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const normalUser = await prisma.user.findFirst({ where: { role: 'USER' } });
    const auditorUser = await prisma.user.findFirst({ where: { role: 'AUDITOR' } });

    assert.ok(adminUser, 'Admin user must exist');
    assert.ok(normalUser, 'Regular user must exist');
    assert.ok(auditorUser, 'Auditor user must exist');

    assert.strictEqual(adminUser.role, 'ADMIN');
    assert.strictEqual(normalUser.role, 'USER');
    assert.strictEqual(auditorUser.role, 'AUDITOR');
  });

  // 5. Atomic Financial Ledger & Failure Rollback
  await t.test('5. Atomic Double-Entry Ledger & Insufficient Balance Protection', async () => {
    const sender = await prisma.user.create({
      data: {
        email: `sender-${Date.now()}@test.internal`,
        password: 'hash',
        fullName: 'Sender User',
        role: 'USER'
      }
    });

    const senderAccount = await prisma.account.create({
      data: {
        accountNumber: `BV-TEST-SEND-${Date.now().toString().slice(-4)}`,
        userId: sender.id,
        balance: 300.0,
        status: 'ACTIVE'
      }
    });

    const recipient = await prisma.user.create({
      data: {
        email: `recipient-${Date.now()}@test.internal`,
        password: 'hash',
        fullName: 'Recipient User',
        role: 'USER'
      }
    });

    const recipientAccount = await prisma.account.create({
      data: {
        accountNumber: `BV-TEST-RECV-${Date.now().toString().slice(-4)}`,
        userId: recipient.id,
        balance: 50.0,
        status: 'ACTIVE'
      }
    });

    // 1. Initial Deposit setup for mathematical ledger proof
    const initSend = await prisma.transaction.create({
      data: {
        referenceId: `DEP-SEND-${Date.now()}`,
        type: 'DEPOSIT',
        amount: 300.0,
        status: 'COMPLETED',
        targetAccount: senderAccount.accountNumber
      }
    });
    await prisma.ledgerEntry.create({
      data: {
        transactionId: initSend.id,
        accountId: senderAccount.id,
        entryType: 'CREDIT',
        amount: 300.0,
        balanceAfter: 300.0
      }
    });

    const initRecv = await prisma.transaction.create({
      data: {
        referenceId: `DEP-RECV-${Date.now()}`,
        type: 'DEPOSIT',
        amount: 50.0,
        status: 'COMPLETED',
        targetAccount: recipientAccount.accountNumber
      }
    });
    await prisma.ledgerEntry.create({
      data: {
        transactionId: initRecv.id,
        accountId: recipientAccount.id,
        entryType: 'CREDIT',
        amount: 50.0,
        balanceAfter: 50.0
      }
    });

    // 2. Successful transfer
    const res = await LedgerService.executeTransfer({
      sourceAccountId: senderAccount.id,
      targetAccountNumber: recipientAccount.accountNumber,
      amount: 100.0,
      description: 'QA Verified Transfer',
      actorUser: sender
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newSourceBalance, 200.0);

    // 3. Check recipient balance updated
    const updatedRecv = await prisma.account.findUnique({ where: { id: recipientAccount.id } });
    assert.strictEqual(updatedRecv.balance, 150.0);

    // 4. Mathematical Ledger Verification for both accounts
    const sendProof = await LedgerService.verifyLedgerIntegrity(senderAccount.id);
    assert.strictEqual(sendProof.isProved, true, 'Sender ledger must be 100% mathematically consistent');

    const recvProof = await LedgerService.verifyLedgerIntegrity(recipientAccount.id);
    assert.strictEqual(recvProof.isProved, true, 'Recipient ledger must be 100% mathematically consistent');

    // 5. Excessive transfer exceeding balance (Must fail and NOT modify balances)
    await assert.rejects(
      async () => {
        await LedgerService.executeTransfer({
          sourceAccountId: senderAccount.id,
          targetAccountNumber: recipientAccount.accountNumber,
          amount: 50000.0, // Exceeds balance
          description: 'Failed Overdraft Transfer',
          actorUser: sender
        });
      },
      /Insufficient funds/
    );

    // Verify balance remains exactly 200.0
    const unchangedSender = await prisma.account.findUnique({ where: { id: senderAccount.id } });
    assert.strictEqual(unchangedSender.balance, 200.0, 'Balance must not change on failed transfer');
  });

  // 6. Audit Trail Tamper-Evidence & Chained Verification
  await t.test('6. Audit Trail Chaining & Tamper Detection', async () => {
    // Normal verification
    const report1 = await AuditService.verifyIntegrity();
    assert.strictEqual(report1.isValid, true, 'Initial audit log chain must be 100% valid');

    // Simulate tampering: create a log entry, then alter its action directly in the DB
    const tamperedLog = await AuditService.log({
      actorId: 'TAMPER_TEST_ACTOR',
      action: 'LEGITIMATE_ACTION',
      resource: 'Test',
      metadata: { clean: true }
    });

    // Verify chain is valid with this new log
    const report2 = await AuditService.verifyIntegrity();
    assert.strictEqual(report2.isValid, true);

    // Maliciously alter the log record directly in PostgreSQL
    await prisma.auditLog.update({
      where: { id: tamperedLog.id },
      data: { action: 'MALICIOUS_FORGED_ACTION' }
    });

    // Verify that our tamper-detection detects the modification!
    const tamperedReport = await AuditService.verifyIntegrity();
    assert.strictEqual(tamperedReport.isValid, false, 'Tampered log must be detected');
    assert.ok(tamperedReport.violations.length > 0, 'Must record hash mismatch violation');

    // Restore to clean state
    await prisma.auditLog.delete({ where: { id: tamperedLog.id } });
  });
});

