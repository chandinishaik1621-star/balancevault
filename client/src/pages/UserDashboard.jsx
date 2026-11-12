import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  Send,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Scale
} from 'lucide-react';

export const UserDashboard = () => {
  const { user, refreshUser } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofData, setProofData] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);

  // Transfer Form State
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState('500');
  const [depositDesc, setDepositDesc] = useState('Demonstration Liquidity Top-up');
  const [depositLoading, setDepositLoading] = useState(false);

  // Notification Banner
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      const [accRes, txnRes] = await Promise.all([
        api.getAccounts(),
        api.getTransactions()
      ]);

      if (accRes && accRes.accounts) {
        setAccounts(accRes.accounts);
        if (accRes.accounts.length > 0) {
          const current = selectedAccount
            ? accRes.accounts.find((a) => a.id === selectedAccount.id) || accRes.accounts[0]
            : accRes.accounts[0];
          setSelectedAccount(current);
          loadLedger(current.id);
        }
      }

      if (txnRes && txnRes.transactions) {
        setTransactions(txnRes.transactions);
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadLedger = async (accountId) => {
    try {
      const res = await api.getLedger(accountId);
      if (res && res.ledgerEntries) {
        setLedgerEntries(res.ledgerEntries);
      }
    } catch (err) {
      console.warn('Ledger load error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Execute Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');
    setTransferLoading(true);

    try {
      const idempotencyKey = `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const res = await api.transfer(
        {
          sourceAccountId: selectedAccount.id,
          targetAccountNumber: transferTarget.trim(),
          amount: parseFloat(transferAmount),
          description: transferDesc || 'Transfer via Web API'
        },
        idempotencyKey
      );

      setTransferSuccess(`Transfer of $${res.amount.toFixed(2)} completed! Reference: ${res.referenceId}`);
      setTransferTarget('');
      setTransferAmount('');
      setTransferDesc('');
      await loadData();
      setTimeout(() => setShowTransferModal(false), 2500);
    } catch (err) {
      setTransferError(err.message || 'Transfer failed.');
    } finally {
      setTransferLoading(false);
    }
  };

  // Execute Deposit
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setDepositLoading(true);

    try {
      await api.deposit({
        accountId: selectedAccount.id,
        amount: parseFloat(depositAmount),
        description: depositDesc
      });
      await loadData();
      setShowDepositModal(false);
    } catch (err) {
      alert(`Deposit error: ${err.message}`);
    } finally {
      setDepositLoading(false);
    }
  };

  // Prove Ledger Integrity
  const handleProveLedger = async () => {
    if (!selectedAccount) return;
    setProofLoading(true);
    setShowProofModal(true);

    try {
      const res = await api.verifyLedger(selectedAccount.id);
      setProofData(res.proof);
    } catch (err) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setProofLoading(false);
    }
  };

  if (loading) {
    return (
      <div class="max-w-7xl mx-auto py-20 text-center text-slate-400 font-mono text-sm">
        Loading financial ledger and account records...
      </div>
    );
  }

  return (
    <div class="max-w-7xl mx-auto my-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner / Actions */}
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white">Accounts & Double-Entry Ledger</h1>
          <p class="text-sm text-slate-400">Owner: {user?.fullName} ({user?.email})</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            class="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-xl transition-colors flex items-center gap-1.5"
          >
            <RefreshCw class={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          {selectedAccount && (
            <button
              onClick={handleProveLedger}
              class="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/25 transition-all flex items-center gap-1.5"
            >
              <Scale class="w-4 h-4" />
              <span>Prove Ledger Integrity</span>
            </button>
          )}
        </div>
      </div>

      {/* KYC / Onboarding Prompt if no accounts */}
      {accounts.length === 0 && (
        <div class="bg-slate-900 border border-amber-900/50 rounded-2xl p-6 sm:p-8 space-y-4">
          <div class="flex items-start gap-4">
            <AlertCircle class="w-6 h-6 text-amber-400 shrink-0 mt-1" />
            <div class="space-y-2">
              <h3 class="text-lg font-bold text-white">Verification or Provisioning Pending</h3>
              <p class="text-sm text-slate-300">
                You do not have an active account yet. Complete your KYC onboarding application or have an administrator approve your profile.
              </p>
              <div class="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/onboarding"
                  class="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Complete KYC Application
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    Open Admin Review Panel
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Cards Grid */}
      {accounts.length > 0 && (
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const isSelected = selectedAccount?.id === acc.id;
            return (
              <div
                key={acc.id}
                onClick={() => {
                  setSelectedAccount(acc);
                  loadLedger(acc.id);
                }}
                class={`cursor-pointer rounded-2xl p-6 border transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-sky-500 shadow-xl shadow-sky-950/40 ring-1 ring-sky-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                      <CreditCard class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-xs font-mono text-slate-400 block">{acc.accountType} ACCOUNT</span>
                      <span class="text-xs font-mono font-bold text-slate-200">{acc.accountNumber}</span>
                    </div>
                  </div>
                  <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {acc.status}
                  </span>
                </div>

                <div class="space-y-1 mb-6">
                  <span class="text-xs text-slate-400 font-mono">Available Balance</span>
                  <div class="text-3xl font-extrabold text-white tracking-tight">
                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span class="text-sm font-normal text-slate-400">{acc.currency}</span>
                  </div>
                </div>

                {isSelected && (
                  <div class="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTransferModal(true);
                      }}
                      class="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Send class="w-3.5 h-3.5" />
                      <span>Send Funds</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDepositModal(true);
                      }}
                      class="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <PlusCircle class="w-3.5 h-3.5" />
                      <span>Demo Fund</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Account Detail Banner */}
      {selectedAccount && (
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
          <div class="flex flex-wrap items-center gap-4">
            <span class="text-slate-400">Active Account:</span>
            <span class="text-white font-bold text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              {selectedAccount.accountNumber}
            </span>
            <button
              onClick={() => copyToClipboard(selectedAccount.accountNumber)}
              class="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <Copy class="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div class="flex items-center gap-4 text-slate-400">
            <span>Ledger Entries: {ledgerEntries.length}</span>
            <span class="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 class="w-3.5 h-3.5" />
              <span>Ledger Balanced</span>
            </span>
          </div>
        </div>
      )}

      {/* Double-Entry Ledger History Table */}
      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div class="p-6 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Scale class="w-5 h-5 text-sky-400" />
            <h3 class="text-base font-bold text-white">Provable Double-Entry Audit Trail</h3>
          </div>
          <span class="text-xs font-mono text-slate-400">Latest 100 Atomic Postings</span>
        </div>

        {ledgerEntries.length === 0 ? (
          <div class="p-12 text-center text-slate-500 font-mono text-xs">
            No ledger postings recorded yet for this account.
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead class="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-4">Posting Timestamp</th>
                  <th class="py-3 px-4">Transaction Ref</th>
                  <th class="py-3 px-4">Type</th>
                  <th class="py-3 px-4">Description</th>
                  <th class="py-3 px-4 text-right">Debit / Credit Amount</th>
                  <th class="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                {ledgerEntries.map((entry) => {
                  const isCredit = entry.entryType === 'CREDIT';
                  return (
                    <tr key={entry.id} class="hover:bg-slate-800/30 transition-colors">
                      <td class="py-3.5 px-4 text-slate-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td class="py-3.5 px-4 font-bold text-sky-400">
                        {entry.transaction?.referenceId || 'N/A'}
                      </td>
                      <td class="py-3.5 px-4">
                        <span
                          class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {entry.entryType}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-slate-300">
                        {entry.transaction?.description || 'Money movement'}
                        {entry.transaction?.targetAccount && (
                          <span class="text-[10px] text-slate-500 block">
                            Target: {entry.transaction.targetAccount}
                          </span>
                        )}
                      </td>
                      <td
                        class={`py-3.5 px-4 text-right font-bold text-sm ${
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : '-'}${entry.amount.toFixed(2)}
                      </td>
                      <td class="py-3.5 px-4 text-right text-slate-200 font-bold">
                        ${entry.balanceAfter.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= TRANSFER MODAL ================= */}
      {showTransferModal && (
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Send class="w-4 h-4" />
                </div>
                <h3 class="text-lg font-bold text-white">Transfer Funds</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                class="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            {transferError && (
              <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {transferError}
              </div>
            )}

            {transferSuccess && (
              <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {transferSuccess}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Source Account
                </label>
                <div class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 flex justify-between">
                  <span>{selectedAccount?.accountNumber}</span>
                  <span class="text-sky-400 font-bold">${selectedAccount?.balance.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Recipient Account Number
                </label>
                <input
                  type="text"
                  required
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  placeholder="e.g. BV-2026-8899"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm font-mono focus:outline-none focus:border-sky-500"
                />
                <span class="text-[11px] text-slate-500 mt-1 block">
                  Quick test: <button type="button" onClick={() => setTransferTarget('BV-2026-8899')} class="text-sky-400 underline">BV-2026-8899 (Bob)</button> or <button type="button" onClick={() => setTransferTarget('BV-2026-4411')} class="text-sky-400 underline">BV-2026-4411 (Alice)</button>
                </span>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Amount ($ USD)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  max={selectedAccount?.balance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="e.g. Services payment"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={transferLoading}
                class="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                <span>{transferLoading ? 'Executing Atomic Transfer...' : 'Confirm & Execute Transfer'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= DEMO DEPOSIT MODAL ================= */}
      {showDepositModal && (
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <PlusCircle class="w-5 h-5 text-emerald-400" />
                <h3 class="text-lg font-bold text-white">Demonstration Deposit</h3>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                class="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <p class="text-xs text-slate-400">
              Synthetic demonstration funding top-up to test double-entry ledger transfers.
            </p>

            <form onSubmit={handleDepositSubmit} class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Deposit Amount ($ USD)
                </label>
                <input
                  type="number"
                  required
                  step="10"
                  min="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={depositLoading}
                class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/30 text-sm disabled:opacity-50"
              >
                <span>{depositLoading ? 'Processing Deposit...' : 'Deposit Test Liquidity'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= PROVE LEDGER INTEGRITY MODAL ================= */}
      {showProofModal && (
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Scale class="w-4 h-4" />
                </div>
                <h3 class="text-lg font-bold text-white">Mathematical Ledger Verification</h3>
              </div>
              <button
                onClick={() => setShowProofModal(false)}
                class="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            {proofLoading ? (
              <div class="py-12 text-center text-slate-400 font-mono text-sm animate-pulse">
                Auditing historical double-entry postings...
              </div>
            ) : proofData ? (
              <div class="space-y-6">
                <div
                  class={`p-4 rounded-xl border flex items-center gap-3 ${
                    proofData.isProved
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                  }`}
                >
                  <CheckCircle2 class="w-6 h-6 shrink-0" />
                  <div>
                    <h4 class="font-bold text-sm">
                      {proofData.isProved ? 'PROVED: 100% Mathematical Consistency' : 'Discrepancy Detected'}
                    </h4>
                    <p class="text-xs text-slate-300 mt-0.5">
                      Sum of all debits and credits strictly equals current account balance.
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span class="text-slate-500 block mb-1">Account Number</span>
                    <span class="text-white font-bold">{proofData.accountNumber}</span>
                  </div>
                  <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span class="text-slate-500 block mb-1">Total Postings</span>
                    <span class="text-white font-bold">{proofData.totalEntries} entries</span>
                  </div>
                  <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span class="text-slate-500 block mb-1">Total Credits (Inflow)</span>
                    <span class="text-emerald-400 font-bold">+${proofData.totalCredits.toFixed(2)}</span>
                  </div>
                  <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span class="text-slate-500 block mb-1">Total Debits (Outflow)</span>
                    <span class="text-rose-400 font-bold">-${proofData.totalDebits.toFixed(2)}</span>
                  </div>
                  <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span class="text-slate-500 block mb-1">Calculated Net Balance</span>
                    <span class="text-sky-400 font-bold text-sm">${proofData.calculatedBalance.toFixed(2)}</span>
                  </div>
                  <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span class="text-slate-500 block mb-1">Recorded Balance</span>
                    <span class="text-white font-bold text-sm">${proofData.recordedBalance.toFixed(2)}</span>
                  </div>
                </div>

                <div class="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
                  <div>Verification formula: Balance = Sum(Credits) - Sum(Debits)</div>
                  <div>Variance: ${Math.abs(proofData.calculatedBalance - proofData.recordedBalance).toFixed(4)} USD</div>
                </div>

                <button
                  onClick={() => setShowProofModal(false)}
                  class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  Close Proof
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

