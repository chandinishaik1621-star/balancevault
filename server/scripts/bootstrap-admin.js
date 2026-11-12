const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const BootstrapService = require('../src/services/bootstrapService');

async function run() {
  console.log('--- BalanceVault Admin CLI Bootstrap ---');
  try {
    const admin = await BootstrapService.bootstrapFirstAdmin({
      email: process.env.ADMIN_EMAIL || 'admin@balancevault.internal',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      fullName: 'Primary Administrator',
      phone: '+1-555-0199',
      bootstrapSecret: process.env.BOOTSTRAP_SECRET || 'BV_INITIAL_ADMIN_BOOTSTRAP_SECRET_2026',
      ipAddress: '127.0.0.1',
      userAgent: 'CLI Bootstrap'
    });

    console.log('✅ Admin bootstrapped successfully:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Account: ${admin.accountNumber}`);
    console.log(`   Role: ${admin.role}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Bootstrap failed:', err.message);
    process.exit(1);
  }
}

run();

