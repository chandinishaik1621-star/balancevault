const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function applyRoles() {
  const client = new Client({
    connectionString: 'postgresql://postgres:securepassword@localhost:5432/balancevault?schema=public'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL balancevault database.');

    const sqlFile = path.join(__dirname, 'setup-db-roles.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Applying database roles and least-privilege permissions...');
    await client.query(sql);
    console.log('✅ PostgreSQL roles (bv_app_user, bv_migrator, bv_auditor) applied successfully!');

    // Verify roles exist
    const res = await client.query("SELECT rolname FROM pg_roles WHERE rolname LIKE 'bv_%';");
    console.log('Verified roles created:', res.rows.map(r => r.rolname));

    await client.end();
  } catch (err) {
    console.error('Error applying roles:', err);
    process.exit(1);
  }
}

applyRoles();

