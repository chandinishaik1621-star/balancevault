# BalanceVault — Threat Model & Security Architecture (THREATS.md)

## 1. System Overview & Asset Inventory
BalanceVault handles financial value transfers and cryptographic ledger accountability.
Critical assets protected:
- Account ledger balances (preventing unauthorized debits, inflation, or race-condition double spends)
- Double-entry ledger entries (preventing silent alterations, deletion, or ledger desynchronization)
- SHA-256 Audit trail chain (preventing log forgery, reordering, or tampering)
- User authentication tokens & password hashes (preventing credential stuffing, unauthorized privilege escalation)
- First-time Administrator Bootstrap (preventing rogue administrative takeover)

---

## 2. STRIDE Threat Analysis Matrix

| Threat Category | Specific Threat Scenario | Impact | Mitigation Implemented | Verified Test |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker logs in with guessed/brute-forced credentials or submits repeated login requests. | Account takeover | Redis/In-memory sliding-window rate limiting on `/api/auth/login` (max 10 attempts/min); `bcrypt` with salt rounds >= 10; strict JWT signing with minimum 32-char secret. | `auth.test.js`, Rate Limiter Unit Tests |
| **Tampering** | Rogue actor or insider attempts to silently update ledger records or alter past transactions. | Financial discrepancy / Fraud | Double-entry bookkeeping: every transfer records simultaneous `DEBIT` and `CREDIT` entries in atomic database transactions. Mathematical proof endpoint (`/api/accounts/:id/verify-ledger`) verifies `Calculated Balance == Recorded Balance`. Append-only table architecture. | `balancevault.test.js` (Test 3) |
| **Tampering** | Attacker modifies historical audit logs to conceal malicious operations. | Compromised accountability | Each `AuditLog` entry computes a cryptographic SHA-256 hash chaining back to the `prevHash` of the previous entry. Integrity verification (`GET /api/audit/verify`) traverses and verifies the entire chain. | `balancevault.test.js` (Test 2) |
| **Repudiation** | User denies authorizing a money transfer or admin denies an onboarding approval. | Disputed transactions | Strict audit logging with `actorId`, `actorRole`, `action`, `resourceId`, IP address, user agent, and timestamp immutably hashed into the audit chain. | `balancevault.test.js` (Test 2 & 3) |
| **Information Disclosure** | Normal user attempts to read other users' accounts or transaction history (IDOR). | Privacy & financial breach | Server-side ownership verification in `/api/accounts/:id`: checks `account.userId === req.user.id`. Route-level RBAC middleware prevents unauthorized access. | `accounts.js` ownership check, `rbac.test.js` |
| **Denial of Service** | Flooding transaction or auth endpoints with rapid concurrent requests. | Service degradation | Layered rate limiting via `rateLimiter.js` (`generalLimiter`, `authLimiter`, `transferLimiter`). Atomic database locking during ledger state transitions. | `rateLimiter.js`, Supertest concurrency test |
| **Elevation of Privilege** | Normal user attempts to call Admin/Auditor endpoints (`/api/admin/*`, `/api/audit/*`). | Unauthorized administrative actions | Server-side `requireRole(['ADMIN'])` and `requireRole(['AUDITOR', 'ADMIN'])` middlewares enforce role restrictions unconditionally before route handlers execute. | `rbac.js`, RBAC API tests |
| **Race Conditions (Double Spend)** | Concurrent duplicate transfer requests with the exact same funds before balance deduction commits. | Account balance going negative | Mandatory `idempotencyKey` support. Atomic `prisma.$transaction` ensures balance checks and account balance updates commit in a single isolated database transaction. | `balancevault.test.js` (Idempotency check) |
| **Rogue Bootstrap** | Attacker invokes `/api/admin/bootstrap` after system initialization to take over admin role. | Total system compromise | Atomic bootstrap check verifies `isBootstrapped`. Requires matching `BOOTSTRAP_SECRET`. Once initialized, `SystemConfig` permanently locks bootstrap (`403 Forbidden`). | `bootstrapService.js`, Bootstrap test |

---

## 3. Defense-in-Depth Implementation Details

### A. Idempotency & Concurrency Control
All money movement routes accept an `Idempotency-Key` header. If a transaction with that key has already executed, the server immediately returns the cached transaction without re-executing debits or credits, preventing accidental double charges during network retries.

### B. Provable Ledger Invariant
For any account $A$, the system maintains the mathematical invariant:
$$\text{Balance}(A) = \sum \text{Credits}(A) - \sum \text{Debits}(A)$$
The endpoint `GET /api/accounts/:id/verify-ledger` calculates this summation dynamically over all historical ledger entries and reports any non-zero variance.

### C. Cryptographic Audit Chain Invariant
For entry $i$ in the audit log:
$$\text{Hash}_i = \text{SHA-256}\Big(\text{Hash}_{i-1} \parallel \text{actorId} \parallel \text{action} \parallel \text{resource} \parallel \text{timestamp} \parallel \text{metadata}\Big)$$
Any alteration, deletion, or insertion retroactively invalidates the hash chain at index $i$, detected immediately by `AuditService.verifyIntegrity()`.

