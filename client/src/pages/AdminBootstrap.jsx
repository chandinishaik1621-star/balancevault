import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, CheckCircle2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export const AdminBootstrap = () => {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [email, setEmail] = useState('admin@balancevault.internal');
  const [password, setPassword] = useState('Admin@123456');
  const [fullName, setFullName] = useState('Primary Administrator');
  const [bootstrapSecret, setBootstrapSecret] = useState('BV_INITIAL_ADMIN_BOOTSTRAP_SECRET_2026');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const checkStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await api.getBootstrapStatus();
      setStatus(res);
    } catch (err) {
      console.warn('Bootstrap status check error:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleBootstrap = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await api.bootstrapAdmin({
        email,
        password,
        fullName,
        bootstrapSecret
      });

      setSuccess(`Admin account created successfully! Account: ${res.admin?.accountNumber}`);
      await login(email, password);
      setTimeout(() => navigate('/admin'), 1500);
    } catch (err) {
      setError(err.message || 'Bootstrap failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div class="max-w-xl mx-auto py-20 text-center text-slate-400 font-mono text-xs">
        Checking administrative state...
      </div>
    );
  }

  return (
    <div class="max-w-md mx-auto my-12 px-4 space-y-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div class="text-center space-y-2">
          <div class="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto border border-amber-500/20">
            <ShieldCheck class="w-6 h-6" />
          </div>
          <h2 class="text-2xl font-extrabold text-white">First-Admin Bootstrap Wizard</h2>
          <p class="text-xs text-slate-400">
            Securely initialize the root administrator account with least-privilege role boundaries
          </p>
        </div>

        {status?.isBootstrapped ? (
          <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs font-mono space-y-3">
            <div class="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 class="w-4 h-4 text-emerald-400" />
              <span>System Already Bootstrapped</span>
            </div>
            <p class="text-slate-300">
              The first administrator account has already been registered and sealed. Further bootstrap attempts are permanently locked.
            </p>
            <button
              onClick={() => navigate('/login')}
              class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors text-xs"
            >
              Sign In As Administrator
            </button>
          </div>
        ) : (
          <form onSubmit={handleBootstrap} class="space-y-4">
            {error && (
              <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            {success && (
              <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {success}
              </div>
            )}

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Admin Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Bootstrap Secret Key
              </label>
              <input
                type="text"
                required
                value={bootstrapSecret}
                onChange={(e) => setBootstrapSecret(e.target.value)}
                class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
              <span class="text-[10px] text-slate-500 mt-1 block">
                Default: <code>BV_INITIAL_ADMIN_BOOTSTRAP_SECRET_2026</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              class="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Bootstrapping Admin...' : 'Bootstrap & Seal First Administrator'}</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

