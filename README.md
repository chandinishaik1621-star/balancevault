# BalanceVault — Money Movement With A Ledger You Can Prove

> **Snovasys Fresher Hiring Challenge 2026**  
> *A high-integrity account management and financial movement platform with mathematical ledger proof and cryptographic audit chains.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://prisma.io)

---

## 1. Project Overview
BalanceVault is designed to answer a fundamental financial systems challenge: **How do you mathematically prove that no money has been created out of thin air, no transaction has been silently altered, and no unauthorized actor has moved funds?**

BalanceVault delivers:
1. **Mathematical Double-Entry Ledger:** Every transfer produces simultaneous, atomic `DEBIT` and `CREDIT` entries. The invariant $\text{Balance} = \sum \text{Credits} - \sum \text{Debits}$ is provable in real-time via `/api/accounts/:id/verify-ledger`.
2. **Cryptographic SHA-256 Audit Trail:** Every sensitive operation (login, KYC onboarding, admin review, transfer, role change) is chained to the preceding log's hash, creating an immutable Merkle-like chain verified via `/api/audit/verify`.
3. **Strict Server-Side Role-Based Access Control (RBAC):** Roles (`USER`, `ADMIN`, `AUDITOR`) are enforced unconditionally at the API middleware layer.
4. **Idempotent Financial Operations:** Built-in `Idempotency-Key` headers guarantee that duplicate network requests or retries never result in duplicate debits or credits.
5. **Secure First-Time Admin Bootstrap:** Protected by environment secrets and atomic database locking, permanently sealing the endpoint after first initialization.
6. **Resilient Rate Limiting & Health Telemetry:** Multi-tiered sliding-window rate limiting with Redis support and automatic in-memory fallback, accompanied by `/health` and `/ready` probes.

---

## 2. Technology Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, React Router v6.
- **Backend API:** Node.js, Express 4, Helmet (Security Headers), CORS, JWT (JSON Web Tokens), `bcryptjs`.
- **Database & ORM:** PostgreSQL (production ready) / SQLite (zero-config local dev), Prisma ORM v5.
- **Caching & Rate Limiting:** Redis with resilient in-memory sliding window fallback.
- **Security:** Principle of Least Privilege (PoLP) database roles, SHA-256 hash chains, salt rounds $\ge 10$.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React 18 Single Page App                  │
│       Accounts • Transfers • Proof Modals • Audit UI        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (Bearer JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Gateway                      │
│   Rate Limiter (Redis/Memory) ➔ Helmet ➔ Auth ➔ RBAC       │
└──────┬───────────────────────┬───────────────────────┬──────┘
       │                       │                       │
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐        ┌──────────────┐
│ Auth & KYC   │       │ Double-Entry │        │ Cryptographic│
│  Onboarding  │       │Ledger Engine │        │ Audit Chain  │
└──────┬───────┘       └──────┬───────┘        └──────┬───────┘
       │                      │                       │
       └──────────────────────┼───────────────────────┘
                              ▼
               ┌─────────────────────────────┐
               │         Prisma ORM          │
               │   Atomic $transaction Block │
               └──────────────┬──────────────┘
                              ▼
               ┌─────────────────────────────┐
               │    PostgreSQL / SQLite      │
               │  Accounts • Ledger • Logs   │
               └─────────────────────────────┘
```

---

## 4. Quick Start & Local Execution

### Prerequisites
- Node.js $\ge$ 18.x
- npm $\ge$ 9.x

### Step 1: Clone Repository & Setup Environment
```bash
git clone <your-repo-url>
cd Chandini
cp .env.example .env
```

### Step 2: Install Dependencies
```bash
# Install root, backend, and frontend packages
npm run install:all
```

### Step 3: Initialize Database & Seed Demonstration Data
```bash
# Push Prisma schema and seed test accounts (Admin, Auditor, Alice, Bob)
npm run setup:db
npm run seed
```

### Step 4: Build Client & Start Production Server
```bash
npm run build:client
npm start
```
The unified platform will be accessible at **http://localhost:5000**!

---

## 5. Pre-configured Demonstration Credentials

All seeded demo accounts use the standard password: `SecurePass@2026`

| Persona | Email | Role | Features |
| :--- | :--- | :--- | :--- |
| **Primary Admin** | `admin@balancevault.internal` | `ADMIN` | User management, KYC reviews, full audit access |
| **Compliance Auditor** | `auditor@balancevault.internal` | `AUDITOR` | Read-only audit inspection, chain verification |
| **Alice (Account Holder)** | `alice@example.com` | `USER` | Account `BV-2026-4411`, transfers, ledger proof |
| **Bob (Account Holder)** | `bob@example.com` | `USER` | Account `BV-2026-8899`, transfers, ledger proof |

---

## 6. Key API Endpoints

### Diagnostic & Health Probes
- `GET /health`: Liveness probe (uptime, memory, process health).
- `GET /ready`: Readiness probe (validates database query and cache/rate limiter).

### Authentication & KYC
- `POST /api/auth/register`: User registration with password hashing.
- `POST /api/auth/login`: Authenticates credentials and returns JWT token.
- `GET /api/auth/me`: Retrieves current session and account details.
- `POST /api/onboarding/submit`: Submits KYC details (Gov ID, address, income).
- `GET /api/onboarding/my-status`: Checks review status.

### Accounts & Provable Ledger
- `GET /api/accounts`: Lists accounts for authenticated user.
- `GET /api/accounts/:id`: Retrieves account details with strict ownership verification.
- `GET /api/accounts/:id/ledger`: Returns historical `DEBIT` / `CREDIT` entries.
- `GET /api/accounts/:id/verify-ledger`: **Calculates mathematical summation of all credits and debits, proving consistency with recorded balance.**

### Financial Operations
- `POST /api/transactions/transfer`: Atomic double-entry transfer with `Idempotency-Key` duplicate prevention.
- `POST /api/transactions/deposit`: Demonstrative synthetic funds deposit.
- `GET /api/transactions/history`: Lists transaction history.

### Admin & Compliance
- `POST /api/admin/bootstrap`: One-time initial admin setup protected by secret.
- `GET /api/admin/stats`: High-level system metrics (liquidity, accounts, users).
- `GET /api/admin/users`: Lists users with status and accounts.
- `PATCH /api/admin/users/:id/role`: Modifies user role (`USER`, `ADMIN`, `AUDITOR`).
- `PATCH /api/admin/users/:id/status`: Suspends or reactivates a user.
- `GET /api/admin/onboarding`: Lists pending KYC applications.
- `PATCH /api/admin/onboarding/:id/review`: Approves or rejects KYC; auto-provisions account on approval.
- `GET /api/audit/logs`: Fetches immutable audit trail.
- `GET /api/audit/verify`: **Traverses and cryptographically validates the entire SHA-256 hash chain.**

---

## 7. Running Tests
BalanceVault includes comprehensive automated integration and security tests:
```bash
npm test
```
Verifies:
1. Database connectivity & schema integrity.
2. Cryptographic audit log chaining and tampering detection.
3. Atomic double-entry transfers and balance calculations.
4. Idempotency replay and duplicate transaction rejection.
5. Insufficient funds prevention.
6. Mathematical ledger proof invariant.

---

## 8. Deployment (Render / Vercel / Railway)
- **Render / Railway (Recommended for Full-Stack):**
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
  - Environment Variables: Copy from `.env.example`
- **PostgreSQL Production Configuration:**
  - Set `DATABASE_URL` to your PostgreSQL connection string.
  - Run database role setup: `psql $DATABASE_URL -f server/scripts/setup-db-roles.sql`

