import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserDashboard } from './pages/UserDashboard';
import { Onboarding } from './pages/Onboarding';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminBootstrap } from './pages/AdminBootstrap';

const ProtectedRoute = ({ children, requireAdmin = false, requireAuditor = false }) => {
  const { user, loading, isAuthenticated, isAdmin, isAuditor } = useAuth();

  if (loading) {
    return (
      <div class="py-24 text-center text-slate-500 font-mono text-xs">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin && !isAuditor) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
          <Navbar />
          <main class="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin/bootstrap" element={<AdminBootstrap />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer class="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs font-mono text-slate-500">
            <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <span>BalanceVault &copy; 2026 &mdash; Money Movement With A Ledger You Can Prove</span>
              <div class="flex items-center gap-4">
                <a href="/health" class="hover:text-sky-400">/health</a>
                <a href="/ready" class="hover:text-sky-400">/ready</a>
                <a href="/admin/bootstrap" class="hover:text-sky-400">/bootstrap</a>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;

