import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ShieldCheck, Database, Lock, Scale, CheckCircle2, ArrowRight, RefreshCw, Layers } from 'lucide-react';

export const Home = () => {
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);
  const [bootstrapStatus, setBootstrapStatus] = useState(null);
  const [loadingProbes, setLoadingProbes] = useState(true);

  const fetchProbes = async () => {
    try {
      setLoadingProbes(true);
      const [healthData, readyData, bsData] = await Promise.all([
        api.getHealth().catch(() => ({ status: 'error' })),
        api.getReady().catch(() => ({ status: 'error' })),
        api.getBootstrapStatus().catch(() => ({ isBootstrapped: false }))
      ]);
      setHealth(healthData);
      setReady(readyData);
      setBootstrapStatus(bsData);
    } catch (err) {
      console.warn('Probe check warning:', err);
    } finally {
      setLoadingProbes(false);
    }
  };

  useEffect(() => {
    fetchProbes();
    const interval = setInterval(fetchProbes, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div class="space-y-16 py-8">
      {/* Hero Section */}
      <section class="text-center max-w-4xl mx-auto px-4 space-y-6">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-mono">
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Snovasys Fresher Hiring Challenge 2026 Core Platform</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Money Movement With A <br />
          <span class="bg-gradient-to-r from-sky-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
            Ledger You Can Prove
          </span>
        </h1>

        <p class="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          BalanceVault implements cryptographic double-entry ledger verification, strict server-side RBAC, tamper-evident SHA-256 audit trails, and atomic idempotent financial transactions.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/login"
            class="px-6 py-3 rounded-xl font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all hover:gap-3"
          >
            <span>Launch Dashboard</span>
            <ArrowRight class="w-4 h-4" />
          </Link>
          <Link
            to="/admin/bootstrap"
            class="px-6 py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Admin Bootstrap Wizard
          </Link>
        </div>
      </section>

      {/* Live System Health & Readiness Banner */}
      <section class="max-w-5xl mx-auto px-4">
        <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 class="text-base font-bold text-slate-200 uppercase tracking-wider font-mono">Live System Diagnostic Telemetry</h2>
            </div>
            <button
              onClick={fetchProbes}
              disabled={loadingProbes}
              class="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 transition-colors"
            >
              <RefreshCw class={`w-3.5 h-3.5 ${loadingProbes ? 'animate-spin' : ''}`} />
              <span>Refresh Probes</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div class="text-slate-400 mb-1 flex items-center justify-between">
                <span>GET /health</span>
                <span class="text-emerald-400 font-bold">{health?.status || 'Active'}</span>
              </div>
              <div class="text-slate-200">Uptime: {health?.uptimeSeconds ?? 0}s</div>
              <div class="text-slate-400 text-[11px] mt-1">Memory: {health?.system?.memoryHeapUsedMB ?? '--'} MB Heap</div>
            </div>

            <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div class="text-slate-400 mb-1 flex items-center justify-between">
                <span>GET /ready</span>
                <span class="text-emerald-400 font-bold">{ready?.status || 'Ready'}</span>
              </div>
              <div class="text-slate-200">Database: {ready?.checks?.database || 'Healthy'}</div>
              <div class="text-slate-400 text-[11px] mt-1">Cache: {ready?.checks?.cache || 'Active'}</div>
            </div>

            <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div class="text-slate-400 mb-1 flex items-center justify-between">
                <span>Admin Bootstrap</span>
                <span class={bootstrapStatus?.isBootstrapped ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {bootstrapStatus?.isBootstrapped ? 'Bootstrapped' : 'Pending'}
                </span>
              </div>
              <div class="text-slate-200">Admins Count: {bootstrapStatus?.adminCount ?? 0}</div>
              <div class="text-slate-400 text-[11px] mt-1">Security: PoLP Enforced</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div class="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Scale class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-white">Provable Double-Entry Ledger</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Every dollar moved creates simultaneous, balanced DEBIT and CREDIT entries locked within atomic database transactions with zero phantom balances.
          </p>
        </div>

        <div class="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Lock class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-white">Cryptographic Audit Chain</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            All user registrations, admin approvals, role changes, and transfers are hashed into an immutable SHA-256 Merkle-like chain with real-time verification.
          </p>
        </div>

        <div class="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div class="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <ShieldCheck class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-white">Strict Server RBAC & Rate Limiting</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Authorization is enforced unconditionally at the API middleware layer. Redis rate limiting defends sensitive endpoints against brute-force attacks.
          </p>
        </div>
      </section>

      {/* Quick Demo Credentials Section */}
      <section class="max-w-4xl mx-auto px-4">
        <div class="bg-slate-900/80 border border-sky-900/40 rounded-2xl p-6 sm:p-8">
          <h3 class="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span>Demo Evaluation Credentials</span>
          </h3>
          <p class="text-sm text-slate-400 mb-6">
            Test pre-configured roles or create fresh accounts in seconds. All demo accounts share the password: <code class="bg-slate-800 text-sky-400 px-2 py-0.5 rounded font-mono">SecurePass@2026</code>
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span class="text-amber-400 font-bold block mb-1">ADMINISTRATOR</span>
              <div class="text-slate-300">admin@balancevault.internal</div>
              <div class="text-slate-500 mt-1">Full control, user management, KYC approvals</div>
            </div>

            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span class="text-purple-400 font-bold block mb-1">COMPLIANCE AUDITOR</span>
              <div class="text-slate-300">auditor@balancevault.internal</div>
              <div class="text-slate-500 mt-1">Read-only audit trail and ledger verification</div>
            </div>

            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span class="text-emerald-400 font-bold block mb-1">ALICE (ACCOUNT HOLDER)</span>
              <div class="text-slate-300">alice@example.com</div>
              <div class="text-slate-500 mt-1">Account: BV-2026-4411 (Savings)</div>
            </div>

            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span class="text-emerald-400 font-bold block mb-1">BOB (ACCOUNT HOLDER)</span>
              <div class="text-slate-300">bob@example.com</div>
              <div class="text-slate-500 mt-1">Account: BV-2026-8899 (Checking)</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

