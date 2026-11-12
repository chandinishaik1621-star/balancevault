const path = require('path');
const fs = require('fs');
const EmbeddedPostgres = require('embedded-postgres').default || require('embedded-postgres');

async function start() {
  const dataDir = path.join(__dirname, '../.postgres-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'securepassword',
    port: 5432,
    persistent: true,
  });

  console.log('[PostgreSQL] Initializing cluster at:', dataDir);
  await pg.initialise();
  console.log('[PostgreSQL] Starting server on port 5432...');
  await pg.start();
  console.log('[PostgreSQL] PostgreSQL is running on port 5432!');

  try {
    console.log('[PostgreSQL] Creating balancevault database...');
    await pg.createDatabase('balancevault');
    console.log('[PostgreSQL] Database balancevault created successfully.');
  } catch (e) {
    console.log('[PostgreSQL] Database may already exist:', e.message);
  }

  const client = pg.getPgClient();
  await client.connect();
  const res = await client.query('SELECT version();');
  console.log('[PostgreSQL] Connected! Version:', res.rows[0].version);
  await client.end();

  console.log('[PostgreSQL] Ready to accept connections.');
}

start().catch(err => {
  console.error('[PostgreSQL] Failed to start:', err);
  process.exit(1);
});

