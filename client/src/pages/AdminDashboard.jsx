import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Users,
  CreditCard,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  RefreshCw,
  Search,
  Hash,
  Activity
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('onboarding'); // 'onboarding' | 'users' | 'audit'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Onboarding tab state
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Users tab state
  const [usersList, setUsersList] = useState([]);

  // Audit tab state
  const [auditLogs, setAuditLogs] = useState([]);
  const [integrityReport, setIntegrityReport] = useState(null);
  const [verifyingAudit, setVerifyingAudit] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [statsRes, onbRes, usersRes, auditRes] = await Promise.all([
        api.getAdminStats().catch(() => ({ stats: null })),
        api.getAdminOnboarding().catch(() => ({ applications: [] })),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getAuditLogs('?limit=50').catch(() => ({ logs: [] }))
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (onbRes?.applications) setApplications(onbRes.applications);
      if (usersRes?.users) setUsersList(usersRes.users);
      if (auditRes?.logs) setAuditLogs(auditRes.logs);
    } catch (err) {
      console.warn('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Handle Review Submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    setReviewLoading(true);

    try {
      await api.reviewOnboarding(selectedApp.id, reviewDecision, reviewNotes);
      setSelectedApp(null);
      setReviewNotes('');
      await loadAll();
    } catch (err) {
      alert(`Review error: ${err.message}`);
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle User Role Change
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      await loadAll();
    } catch (err) {
      alert(`Role change error: ${err.message}`);
    }
  };

  // Handle User Status Toggle
  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateUserStatus(userId, newStatus);
      await loadAll();
    } catch (err) {
      alert(`Status update error: ${err.message}`);
    }
  };

  // Verify Audit Log Cryptographic Integrity
  const handleVerifyAuditChain = async () => {
    setVerifyingAudit(true);
    try {
      const res = await api.verifyAuditIntegrity();
      setIntegrityReport(res.report);
    } catch (err) {
      alert(`Audit verification error: ${err.message}`);
    } finally {
      setVerifyingAudit(false);
    }
  };

  if (loading) {
    return (
      <div class="max-w-7xl mx-auto py-20 text-center text-slate-400 font-mono text-sm">
        Loading administrative console and audit records...
      </div>
    );
  }

  return (
    <div class="max-w-7xl mx-auto my-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Title & Sync */}
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <Shield class="w-6 h-6 text-sky-400" />
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white">Administrative & Compliance Suite</h1>
          </div>
          <p class="text-sm text-slate-400">Strict Least-Privilege Role Authorization: {user?.role}</p>
        </div>

        <button
          onClick={loadAll}
          class="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-xl transition-colors flex items-center gap-1.5"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>Sync All</span>
        </button>
      </div>

      {/* Metrics Banner */}
      {stats && (
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Total Users</span>
            <span class="text-2xl font-bold text-white">{stats.totalUsers}</span>
          </div>

          <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Active Accounts</span>
            <span class="text-2xl font-bold text-sky-400">{stats.totalAccounts}</span>
          </div>

          <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Pending KYC</span>
            <span class="text-2xl font-bold text-amber-400">{stats.pendingOnboarding}</span>
          </div>

          <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">System Liquidity</span>
            <span class="text-2xl font-bold text-emerald-400">${stats.totalLiquidity?.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div class="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('onboarding')}
          class={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'onboarding'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck class="w-4 h-4" />
          <span>Onboarding Applications ({applications.filter((a) => a.status === 'PENDING').length} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          class={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'users'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users class="w-4 h-4" />
          <span>User Management ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          class={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'audit'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Hash class="w-4 h-4" />
          <span>SHA-256 Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: ONBOARDING REVIEW */}
      {activeTab === 'onboarding' && (
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div class="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-white">KYC Onboarding Queue</h3>
              <p class="text-xs text-slate-400">Review government credentials and approve account opening</p>
            </div>
          </div>

          {applications.length === 0 ? (
            <div class="p-12 text-center text-slate-500 font-mono text-xs">
              No onboarding applications found.
            </div>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-mono">
                <thead class="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th class="py-3 px-4">Submitted</th>
                    <th class="py-3 px-4">Applicant</th>
                    <th class="py-3 px-4">ID Type & Number</th>
                    <th class="py-3 px-4">Monthly Income</th>
                    <th class="py-3 px-4">Requested Type</th>
                    <th class="py-3 px-4">Status</th>
                    <th class="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 text-slate-300">
                  {applications.map((app) => (
                    <tr key={app.id} class="hover:bg-slate-800/30 transition-colors">
                      <td class="py-3.5 px-4 text-slate-400">{new Date(app.submittedAt).toLocaleDateString()}</td>
                      <td class="py-3.5 px-4">
                        <span class="font-bold text-white block">{app.user?.fullName}</span>
                        <span class="text-[11px] text-slate-500">{app.user?.email}</span>
                      </td>
                      <td class="py-3.5 px-4 text-slate-300">
                        {app.governmentIdType}: {app.governmentIdNumber}
                      </td>
                      <td class="py-3.5 px-4 text-slate-200 font-bold">${app.monthlyIncome.toLocaleString()}</td>
                      <td class="py-3.5 px-4 text-sky-400">{app.accountTypeDesired}</td>
                      <td class="py-3.5 px-4">
                        <span
                          class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setReviewDecision(app.status === 'REJECTED' ? 'APPROVED' : 'APPROVED');
                          }}
                          class="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div class="p-6 border-b border-slate-800">
            <h3 class="text-base font-bold text-white">Platform Users & Roles</h3>
            <p class="text-xs text-slate-400">Server-enforced access controls (USER, ADMIN, AUDITOR)</p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead class="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-4">User</th>
                  <th class="py-3 px-4">Current Role</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Associated Accounts</th>
                  <th class="py-3 px-4 text-right">Security Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                {usersList.map((u) => (
                  <tr key={u.id} class="hover:bg-slate-800/30 transition-colors">
                    <td class="py-3.5 px-4">
                      <span class="font-bold text-white block">{u.fullName}</span>
                      <span class="text-[11px] text-slate-500">{u.email}</span>
                    </td>
                    <td class="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        class="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="AUDITOR">AUDITOR</option>
                      </select>
                    </td>
                    <td class="py-3.5 px-4">
                      <span
                        class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-slate-400">
                      {u.accounts?.length > 0 ? (
                        u.accounts.map((a) => (
                          <span key={a.id} class="block text-sky-400">
                            {a.accountNumber} (${a.balance.toFixed(2)})
                          </span>
                        ))
                      ) : (
                        <span class="text-slate-600">None provisioned</span>
                      )}
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleStatusToggle(u.id, u.status)}
                        class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div class="space-y-6">
          <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <Hash class="w-5 h-5 text-indigo-400" />
                <span>Cryptographic SHA-256 Hash Chain Verification</span>
              </h3>
              <p class="text-xs text-slate-400">
                Each audit record embeds the SHA-256 hash of its predecessor, creating a tamper-evident sequence.
              </p>
            </div>

            <button
              onClick={handleVerifyAuditChain}
              disabled={verifyingAudit}
              class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Shield class="w-4 h-4" />
              <span>{verifyingAudit ? 'Verifying Hashes...' : 'Verify Chain Integrity'}</span>
            </button>
          </div>

          {integrityReport && (
            <div
              class={`p-4 rounded-xl border flex items-center gap-3 ${
                integrityReport.isValid
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
              }`}
            >
              <CheckCircle2 class="w-6 h-6 shrink-0" />
              <div class="text-xs font-mono">
                <span class="font-bold text-sm block">
                  {integrityReport.isValid ? 'Chain Integrity: 100% INTACT' : 'Tamper Detected!'}
                </span>
                <span>
                  Verified {integrityReport.totalEntries} chained records. Zero broken links or hash alterations.
                </span>
              </div>
            </div>
          )}

          <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-mono">
                <thead class="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th class="py-3 px-4">Timestamp</th>
                    <th class="py-3 px-4">Actor</th>
                    <th class="py-3 px-4">Action</th>
                    <th class="py-3 px-4">Resource</th>
                    <th class="py-3 px-4">IP Address</th>
                    <th class="py-3 px-4">SHA-256 Chain Hash</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 text-slate-300">
                  {auditLogs.map((log) => (
                    <tr key={log.id} class="hover:bg-slate-800/30 transition-colors">
                      <td class="py-3.5 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td class="py-3.5 px-4">
                        <span class="text-white font-bold block">{log.actorRole || 'SYSTEM'}</span>
                        <span class="text-[11px] text-slate-500">{log.actorEmail || log.actorId}</span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-950 border border-slate-800 text-sky-300">
                          {log.action}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-slate-400">{log.resource}</td>
                      <td class="py-3.5 px-4 text-slate-400">{log.ipAddress}</td>
                      <td class="py-3.5 px-4 text-[10px] text-slate-500 font-mono" title={log.hash}>
                        {log.hash.slice(0, 16)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedApp && (
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-white">Review KYC Application</h3>
              <button onClick={() => setSelectedApp(null)} class="text-slate-400 hover:text-white text-lg font-mono">
                ✕
              </button>
            </div>

            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <div>Applicant: <span class="text-white font-bold">{selectedApp.user?.fullName}</span></div>
              <div>Email: <span class="text-slate-300">{selectedApp.user?.email}</span></div>
              <div>Government ID: <span class="text-sky-400">{selectedApp.governmentIdType} - {selectedApp.governmentIdNumber}</span></div>
              <div>Residential Address: <span class="text-slate-300">{selectedApp.address}</span></div>
              <div>Employment & Income: <span class="text-slate-300">{selectedApp.employmentStatus} (${selectedApp.monthlyIncome}/mo)</span></div>
              <div>Account Desired: <span class="text-emerald-400 font-bold">{selectedApp.accountTypeDesired}</span></div>
            </div>

            <form onSubmit={handleReviewSubmit} class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Compliance Decision
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('APPROVED')}
                    class={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      reviewDecision === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    ✓ APPROVE (Grant Account)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('REJECTED')}
                    class={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      reviewDecision === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    ✕ REJECT
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Review Notes
                </label>
                <textarea
                  rows="2"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Compliance review comments"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={reviewLoading}
                class="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-sky-600/30 disabled:opacity-50"
              >
                <span>{reviewLoading ? 'Submitting Decision...' : 'Commit Regulatory Decision'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

