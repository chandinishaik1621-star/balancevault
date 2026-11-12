const path = require('path');
const fs = require('fs');
const EmbeddedPostgres = require('embedded-postgres').default || require('embedded-postgres');

async function runDaemon() {
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

  try {
    await pg.initialise();
  } catch (e) {
    // Already initialised
  }

  console.log('[PostgreSQL Daemon] Starting server on port 5432...');
  await pg.start();

  try {
    await pg.createDatabase('balancevault');
  } catch (e) {
    // Database already exists
  }

  console.log('✅ PostgreSQL 18.6 daemon is active on 127.0.0.1:5432 (Database: balancevault)');

  // Keep process alive indefinitely
  setInterval(() => {}, 60000);

  const cleanup = async () => {
    console.log('[PostgreSQL Daemon] Shutting down cleanly...');
    try {
      await pg.stop();
    } catch (e) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

runDaemon().catch(err => {
  console.error('[PostgreSQL Daemon] Error:', err);
  process.exit(1);
});

