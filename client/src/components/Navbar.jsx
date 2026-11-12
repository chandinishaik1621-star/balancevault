import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Vault, LogOut, User, Activity, FileCheck } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAdmin, isAuditor, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav class="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" class="flex items-center space-x-3 group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Vault class="w-5 h-5 text-white" />
            </div>
            <div>
              <span class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
                BalanceVault
              </span>
              <span class="hidden sm:inline-block ml-2 text-xs font-mono text-sky-400/80 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-full">
                Provable Ledger v1.0
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div class="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'text-sky-400 bg-slate-800/60' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Overview
            </Link>

            {isAuthenticated && (
              <Link
                to="/dashboard"
                class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dashboard') ? 'text-sky-400 bg-slate-800/60' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                Accounts & Ledger
              </Link>
            )}

            {isAuthenticated && (
              <Link
                to="/onboarding"
                class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/onboarding') ? 'text-sky-400 bg-slate-800/60' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                KYC Onboarding
              </Link>
            )}

            {(isAdmin || isAuditor) && (
              <Link
                to="/admin"
                class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/admin') ? 'text-sky-400 bg-slate-800/60' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Shield class="w-4 h-4 text-sky-400" />
                <span>Admin & Audit</span>
              </Link>
            )}
          </div>

          {/* User actions */}
          <div class="flex items-center space-x-3">
            {isAuthenticated ? (
              <div class="flex items-center space-x-3">
                <div class="hidden sm:flex flex-col text-right">
                  <span class="text-sm font-semibold text-slate-200">{user?.fullName}</span>
                  <div class="flex items-center justify-end gap-1.5">
                    <span
                      class={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        user?.role === 'ADMIN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : user?.role === 'AUDITOR'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {user?.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                  title="Sign out"
                >
                  <LogOut class="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div class="flex items-center space-x-2">
                <Link
                  to="/login"
                  class="px-4 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  class="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25 transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

