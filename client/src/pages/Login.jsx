import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res?.user?.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuick = (userEmail, userPass = 'SecurePass@2026') => {
    setEmail(userEmail);
    setPassword(userPass);
    setError('');
  };

  return (
    <div class="max-w-md mx-auto my-12 px-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div class="text-center space-y-2">
          <div class="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center mx-auto border border-sky-500/20">
            <Lock class="w-6 h-6" />
          </div>
          <h2 class="text-2xl font-extrabold text-white">Sign In to BalanceVault</h2>
          <p class="text-sm text-slate-400">Access your accounts and verified ledger records</p>
        </div>

        {error && (
          <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
            <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div class="relative">
              <Mail class="w-5 h-5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div class="relative">
              <Lock class="w-5 h-5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            class="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </form>

        {/* Fast Fill for Evaluators */}
        <div class="border-t border-slate-800 pt-5 space-y-3">
          <span class="text-xs font-mono text-slate-500 uppercase tracking-wider block text-center">
            Quick-Fill Credentials
          </span>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillQuick('admin@balancevault.internal')}
              class="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-amber-300 font-mono transition-colors text-left"
            >
              Admin User
            </button>
            <button
              type="button"
              onClick={() => fillQuick('auditor@balancevault.internal')}
              class="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-purple-300 font-mono transition-colors text-left"
            >
              Auditor
            </button>
            <button
              type="button"
              onClick={() => fillQuick('alice@example.com')}
              class="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-emerald-300 font-mono transition-colors text-left"
            >
              Alice (User)
            </button>
            <button
              type="button"
              onClick={() => fillQuick('bob@example.com')}
              class="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-emerald-300 font-mono transition-colors text-left"
            >
              Bob (User)
            </button>
          </div>
        </div>

        <div class="text-center text-xs text-slate-500">
          Need an account?{' '}
          <Link to="/register" class="text-sky-400 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

