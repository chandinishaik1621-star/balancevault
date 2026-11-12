-- ========================================================
-- BalanceVault - PostgreSQL Role-Based Security Script
-- Implements Principle of Least Privilege (PoLP)
-- ========================================================

-- 1. Create dedicated application roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'bv_app_user') THEN
        CREATE ROLE bv_app_user WITH LOGIN PASSWORD 'bv_app_secure_password';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'bv_migrator') THEN
        CREATE ROLE bv_migrator WITH LOGIN PASSWORD 'bv_migrator_secure_password';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'bv_auditor') THEN
        CREATE ROLE bv_auditor WITH LOGIN PASSWORD 'bv_auditor_secure_password';
    END IF;
END
$$;

-- 2. Schema Permissions
GRANT USAGE ON SCHEMA public TO bv_app_user, bv_migrator, bv_auditor;

-- 3. Application Runtime User Permissions (Least Privilege)
-- Can read/write transactional data, but CANNOT alter schema, drop tables, or delete audit logs
GRANT SELECT, INSERT, UPDATE ON "User", "OnboardingApplication", "Account", "Transaction", "LedgerEntry", "SystemConfig" TO bv_app_user;
-- Strictly APPEND-ONLY for AuditLog (NO UPDATE, NO DELETE for app user!)
GRANT SELECT, INSERT ON "AuditLog" TO bv_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bv_app_user;

-- 4. Auditor Role (Read-Only)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bv_auditor;

-- 5. Migration / Admin Role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bv_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bv_migrator;

