const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 BalanceVault Server running on http://localhost:${PORT}`);
  console.log(`🛡️  Health Endpoint: http://localhost:${PORT}/health`);
  console.log(`🛡️  Readiness Probe: http://localhost:${PORT}/ready`);
  console.log(`====================================================`);
});

