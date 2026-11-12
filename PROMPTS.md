# BalanceVault — AI Prompt Engineering & Oversight Journal (PROMPTS.md)

*Candidate Name: Shaik Chandini / BalanceVault Team*  
*Hiring Challenge: Snovasys Fresher Hiring Challenge 2026*  
*Date Range: October 19 – November 11, 2026*

This document honestly and critically records the prompts given to AI coding tools during the architectural design, security engineering, and implementation of BalanceVault. In accordance with the challenge evaluation criteria, entries detail what was requested, what the AI proposed, why the AI suggestion was flawed or insecure, and the exact architectural corrections enforced.

---

### Entry 1: Atomic Double-Entry Ledger & Race Condition Prevention
- **Date:** 2026-10-20
- **What was asked for:**
  > "Implement the money transfer endpoint between two accounts in Node.js with Prisma. Ensure the sender has enough money, deduct the amount, add it to the recipient, and save the transaction."
- **What the tool produced:**
  The AI wrote two separate `prisma.account.update` queries:
  ```javascript
  // Flawed AI proposal
  const sender = await prisma.account.findUnique({ where: { id: senderId } });
  if (sender.balance >= amount) {
    await prisma.account.update({ where: { id: senderId }, data: { balance: sender.balance - amount } });
    await prisma.account.update({ where: { id: recipientId }, data: { balance: recipient.balance + amount } });
    await prisma.transaction.create({ data: { amount, ... } });
  }
  ```
- **What was wrong with it:**
  1. **Time-of-Check to Time-of-Use (TOCTOU) Race Condition:** Two concurrent requests could both observe `sender.balance >= amount` before either deduction completed, allowing a user to spend their balance twice and drive the account negative.
  2. **Non-Atomic Partial Failures:** If the second `update` failed or the server crashed mid-way, money would disappear from the sender without reaching the recipient.
  3. **No Double-Entry Ledger Entries:** It directly mutated balances without creating immutable `DEBIT` and `CREDIT` ledger records.
- **What was done instead:**
  Enforced a strict `prisma.$transaction` block that wraps:
  - Account locking & balance verification.
  - Idempotency key verification (`idempotencyKey`) to reject duplicate incoming requests.
  - Creation of a `Transaction` record with status `COMPLETED`.
  - Balanced `DEBIT` ledger entry (sender) and `CREDIT` ledger entry (recipient) recording `balanceAfter`.
  - Mathematical ledger verification endpoint (`/api/accounts/:id/verify-ledger`) to prove `Balance == Sum(Credits) - Sum(Debits)`.
- **Reference:** `server/src/services/ledgerService.js`

---

### Entry 2: Role-Based Access Control (RBAC) & Authorization Bypass
- **Date:** 2026-10-21
- **What was asked for:**
  > "Add an admin endpoint to approve onboarding KYC applications and update user roles in the system."
- **What the tool produced:**
  The AI implemented the route directly on `/api/admin/onboarding/:id/review` and checked the role using a client-supplied query parameter or JWT payload without verifying it against the current database user record:
  ```javascript
  // Flawed AI proposal
  if (req.user.role !== 'ADMIN') {
    // Hidden UI check, but relied solely on client-supplied JWT claims without checking revocation or database status
  }
  ```
  Furthermore, the AI suggested hiding the "Approve" button on the frontend for non-admins as the primary access control mechanism.
- **What was wrong with it:**
  1. **Client-Side Security Fallacy:** Hiding buttons in React provides zero security. An attacker can directly issue `PATCH /api/admin/onboarding/:id/review` via `curl` or Postman.
  2. **Stale JWT Permissions:** If an administrator demoted or suspended a user, the user's existing JWT token would continue granting administrative access until token expiration.
- **What was done instead:**
  Created server-side middleware `server/src/middleware/rbac.js` (`requireRole(['ADMIN'])`) that runs after `authenticate`.
  - The authentication middleware (`server/src/middleware/auth.js`) checks the database on every sensitive request to verify the user exists, is not `SUSPENDED`, and retrieves the fresh, authoritative role.
  - Forbidden attempts return strict HTTP `403 Access Denied` and log an unauthorized access attempt to the tamper-evident audit trail.
- **Reference:** `server/src/middleware/rbac.js` and `server/src/middleware/auth.js`

---

### Entry 3: First-Time Administrator Bootstrap & Takeover Vulnerability
- **Date:** 2026-10-23
- **What was asked for:**
  > "Create an endpoint or script to bootstrap the first admin user for BalanceVault so the challenge judges can log in and test."
- **What the tool produced:**
  The AI proposed an open endpoint `POST /api/admin/bootstrap`:
  ```javascript
  // Flawed AI proposal
  router.post('/bootstrap', async (req, res) => {
    const admin = await prisma.user.create({ data: { role: 'ADMIN', ...req.body } });
    res.json(admin);
  });
  ```
- **What was wrong with it:**
  1. **Administrative Takeover Threat:** Anyone on the internet or an automated bot could call `/api/admin/bootstrap` at any time, granting themselves `ADMIN` privileges and seizing full control of the platform.
  2. **No Secret Guard:** No environment secret or mutual handshake was required.
  3. **No State Sealing:** The endpoint remained callable indefinitely, allowing multiple rogue admins to be minted.
- **What was done instead:**
  1. Implemented `BootstrapService.js` with three defense layers:
     - Checks `adminCount === 0` and verifies `SystemConfig.ADMIN_BOOTSTRAPPED !== 'true'`. Once bootstrapped, the endpoint is permanently sealed (`403 Forbidden`).
     - Requires a server-side secret (`BOOTSTRAP_SECRET`) configured via environment variables.
     - Operates inside an atomic database transaction that generates the initial admin master account and writes a cryptographic audit log of the bootstrap event.
- **Reference:** `server/src/services/bootstrapService.js`

---

### Entry 4: Audit Trail Tamper-Resistance & Hash Chaining
- **Date:** 2026-10-24
- **What was asked for:**
  > "Add an audit log system to log whenever someone transfers money or an admin approves KYC."
- **What the tool produced:**
  The AI generated a standard logging table `AuditLog` with `id`, `action`, `actorId`, `timestamp`, and inserted plain rows.
- **What was wrong with it:**
  1. **Trivial Tampering:** Any database user with `UPDATE` or `DELETE` permissions (or an SQL injection exploit) could alter historical logs, delete incriminating actions, or modify amounts.
  2. **No Provable Integrity:** There was no mathematical or cryptographic way to prove to a judge or regulatory auditor that the logs had not been tampered with.
- **What was done instead:**
  Architected a cryptographic SHA-256 hash-chaining audit engine inspired by Merkle logs:
  - Each audit log entry calculates:
    $$\text{Hash} = \text{SHA256}(\text{prevHash} \parallel \text{actorId} \parallel \text{action} \parallel \text{resource} \parallel \text{timestamp} \parallel \text{metadata})$$
  - Any alteration of a historical log entry breaks the hash chain for all subsequent entries.
  - Implemented `AuditService.verifyIntegrity()` and endpoint `GET /api/audit/verify` that mathematically recomputes the entire chain and proves 0 tampering.
  - In PostgreSQL role scripts (`setup-db-roles.sql`), granted strictly `INSERT, SELECT` (append-only) on `AuditLog` to application roles.
- **Reference:** `server/src/services/auditService.js` and `server/scripts/setup-db-roles.sql`

---

### Entry 5: Redis Rate Limiting & High-Availability Fallback
- **Date:** 2026-10-25
- **What was asked for:**
  > "Add Redis rate limiting to prevent brute-force login attempts and DDoS on financial endpoints."
- **What the tool produced:**
  The AI imported `ioredis` and connected directly to `redis://localhost:6379`. If Redis was not running or connection failed, the entire server crashed on startup (`UnhandledPromiseRejection: ECONNREFUSED`).
- **What was wrong with it:**
  1. **Single Point of Failure (SPOF):** If a local tester or CI environment doesn't have a Redis daemon active on port 6379, the entire BalanceVault application failed to boot.
  2. **Fragile Deployment:** Cloud deployments without dedicated Redis instances would fail readiness checks (`GET /ready`).
- **What was done instead:**
  Engineered a resilient dual-mode cache layer in `server/src/config/redis.js`:
  - Attempts Redis connection if `ENABLE_REDIS=true` and `REDIS_URL` is reachable.
  - If Redis is unavailable or unconfigured, it seamlessly falls back to a high-performance in-memory sliding-window token store.
  - The `/ready` diagnostic endpoint accurately reports whether the rate limiter is operating on `healthy (redis)` or `healthy (resilient in-memory fallback)`.
- **Reference:** `server/src/config/redis.js` and `server/src/middleware/rateLimiter.js`
