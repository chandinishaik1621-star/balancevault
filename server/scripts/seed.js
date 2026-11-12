const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = require('../src/config/db');
const LedgerService = require('../src/services/ledgerService');
const AuditService = require('../src/services/auditService');

async function seed() {
  console.log('🌱 Seeding BalanceVault demonstration database...');

  // 1. Clean existing state
  try {
    await prisma.ledgerEntry.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
    await prisma.onboardingApplication.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.user.deleteMany();
  } catch (err) {
    console.log('Note on cleanup:', err.message);
  }

  const hashedPassword = await bcrypt.hash('SecurePass@2026', 10);

  // 2. Create Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@balancevault.internal',
      password: hashedPassword,
      fullName: 'Chief Administrative Officer',
      phone: '+1-555-0100',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });

  const adminAccount = await prisma.account.create({
    data: {
      accountNumber: 'BV-1000-0001',
      userId: admin.id,
      accountType: 'BUSINESS',
      balance: 500000.0,
      currency: 'USD',
      status: 'ACTIVE'
    }
  });

  await prisma.systemConfig.create({
    data: { key: 'ADMIN_BOOTSTRAPPED', value: 'true' }
  });

  await AuditService.log({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: 'ADMIN',
    action: 'ADMIN_BOOTSTRAP',
    resource: 'System',
    metadata: { initialReserve: 500000 }
  });

  // 3. Create Auditor User
  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@balancevault.internal',
      password: hashedPassword,
      fullName: 'Compliance & Audit Lead',
      phone: '+1-555-0200',
      role: 'AUDITOR',
      status: 'ACTIVE'
    }
  });

  await AuditService.log({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: 'ADMIN',
    action: 'USER_REGISTER',
    resource: 'User',
    resourceId: auditor.id,
    metadata: { assignedRole: 'AUDITOR' }
  });

  // 4. Create User Alice
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: hashedPassword,
      fullName: 'Alice Walker',
      phone: '+1-555-0301',
      role: 'USER',
      status: 'ACTIVE'
    }
  });

  await prisma.onboardingApplication.create({
    data: {
      userId: alice.id,
      governmentIdType: 'PASSPORT',
      governmentIdNumber: 'P89218274',
      address: '742 Evergreen Terrace, Springfield',
      employmentStatus: 'EMPLOYED',
      monthlyIncome: 7500.0,
      sourceOfFunds: 'SALARY',
      accountTypeDesired: 'SAVINGS',
      status: 'APPROVED',
      reviewedBy: admin.email,
      reviewedAt: new Date()
    }
  });

  const aliceAccount = await prisma.account.create({
    data: {
      accountNumber: 'BV-2026-4411',
      userId: alice.id,
      accountType: 'SAVINGS',
      balance: 3500.0,
      currency: 'USD',
      status: 'ACTIVE'
    }
  });

  // Initial deposit entry for Alice
  const initTxnAlice = await prisma.transaction.create({
    data: {
      referenceId: 'DEP-ALICE-INIT-001',
      type: 'DEPOSIT',
      amount: 3500.0,
      status: 'COMPLETED',
      description: 'Account Opening Deposit',
      targetAccount: aliceAccount.accountNumber
    }
  });

  await prisma.ledgerEntry.create({
    data: {
      transactionId: initTxnAlice.id,
      accountId: aliceAccount.id,
      entryType: 'CREDIT',
      amount: 3500.0,
      balanceAfter: 3500.0
    }
  });

  // 5. Create User Bob
  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: hashedPassword,
      fullName: 'Bob Martinez',
      phone: '+1-555-0302',
      role: 'USER',
      status: 'ACTIVE'
    }
  });

  await prisma.onboardingApplication.create({
    data: {
      userId: bob.id,
      governmentIdType: 'NATIONAL_ID',
      governmentIdNumber: 'ID-9921471',
      address: '100 Main Street, Suite 4B, Metropolis',
      employmentStatus: 'SELF_EMPLOYED',
      monthlyIncome: 9200.0,
      sourceOfFunds: 'BUSINESS_INCOME',
      accountTypeDesired: 'CHECKING',
      status: 'APPROVED',
      reviewedBy: admin.email,
      reviewedAt: new Date()
    }
  });

  const bobAccount = await prisma.account.create({
    data: {
      accountNumber: 'BV-2026-8899',
      userId: bob.id,
      accountType: 'CHECKING',
      balance: 1200.0,
      currency: 'USD',
      status: 'ACTIVE'
    }
  });

  const initTxnBob = await prisma.transaction.create({
    data: {
      referenceId: 'DEP-BOB-INIT-001',
      type: 'DEPOSIT',
      amount: 1200.0,
      status: 'COMPLETED',
      description: 'Account Opening Deposit',
      targetAccount: bobAccount.accountNumber
    }
  });

  await prisma.ledgerEntry.create({
    data: {
      transactionId: initTxnBob.id,
      accountId: bobAccount.id,
      entryType: 'CREDIT',
      amount: 1200.0,
      balanceAfter: 1200.0
    }
  });

  // 6. Execute an initial demonstration transfer from Alice to Bob
  console.log('💸 Executing initial transfer from Alice to Bob...');
  await LedgerService.executeTransfer({
    sourceAccountId: aliceAccount.id,
    targetAccountNumber: bobAccount.accountNumber,
    amount: 500.0,
    description: 'Contract Payment for Design Services',
    idempotencyKey: 'DEMO-TXN-KEY-001',
    actorUser: alice
  });

  console.log('✅ Seed completed successfully!');
  console.log('-------------------------------------------');
  console.log('Demo Credentials (Password: SecurePass@2026)');
  console.log('  Admin:   admin@balancevault.internal');
  console.log('  Auditor: auditor@balancevault.internal');
  console.log('  User 1:  alice@example.com (Account: BV-2026-4411)');
  console.log('  User 2:  bob@example.com   (Account: BV-2026-8899)');
  console.log('-------------------------------------------');

  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});

