import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight, Shield } from 'lucide-react';

export const Onboarding = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    governmentIdType: 'PASSPORT',
    governmentIdNumber: '',
    address: '',
    employmentStatus: 'EMPLOYED',
    monthlyIncome: '',
    sourceOfFunds: 'SALARY',
    accountTypeDesired: 'SAVINGS'
  });

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getOnboardingStatus();
      if (res && res.application) {
        setApplication(res.application);
      }
    } catch (err) {
      console.warn('Failed to load onboarding status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await api.submitOnboarding(formData);
      setSuccess('KYC application submitted successfully! Our administrative team will review it shortly.');
      setApplication(res.application);
      await refreshUser();
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div class="max-w-xl mx-auto py-16 text-center text-slate-400 font-mono text-sm">
        Loading onboarding profile...
      </div>
    );
  }

  return (
    <div class="max-w-3xl mx-auto my-8 px-4 space-y-8">
      {/* Header Banner */}
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <FileText class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">Account Holder Verification (KYC)</h2>
            <p class="text-xs text-slate-400">Compliance & Regulatory Customer Due Diligence</p>
          </div>
        </div>
      </div>

      {/* Existing Application Status Card */}
      {application && application.status !== 'NOT_SUBMITTED' && (
        <div
          class={`border rounded-2xl p-6 ${
            application.status === 'APPROVED'
              ? 'bg-emerald-950/20 border-emerald-800/40'
              : application.status === 'REJECTED'
              ? 'bg-rose-950/20 border-rose-800/40'
              : 'bg-amber-950/20 border-amber-800/40'
          }`}
        >
          <div class="flex items-start gap-4">
            {application.status === 'APPROVED' && <CheckCircle2 class="w-6 h-6 text-emerald-400 shrink-0 mt-1" />}
            {application.status === 'REJECTED' && <AlertTriangle class="w-6 h-6 text-rose-400 shrink-0 mt-1" />}
            {application.status === 'PENDING' && <Clock class="w-6 h-6 text-amber-400 shrink-0 mt-1" />}

            <div class="space-y-1">
              <div class="flex items-center gap-3">
                <span class="font-bold text-white text-base">Application Status:</span>
                <span
                  class={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    application.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : application.status === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {application.status}
                </span>
              </div>
              <p class="text-xs text-slate-300">
                Submitted on: {new Date(application.submittedAt).toLocaleString()}
              </p>

              {application.status === 'APPROVED' && (
                <div class="pt-2">
                  <p class="text-xs text-emerald-300">
                    Your KYC has been approved! Your default account has been automatically provisioned with starting liquidity.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    class="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <span>Go to Accounts & Ledger</span>
                    <ArrowRight class="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {application.status === 'REJECTED' && (
                <p class="text-xs text-rose-300 pt-2">
                  Notes from compliance: {application.reviewNotes || 'Verification could not be completed.'}
                </p>
              )}

              {application.status === 'PENDING' && (
                <p class="text-xs text-amber-300/90 pt-2">
                  Your verification is under review. An administrator can approve this application from the Admin Dashboard.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KYC Form (Visible if not submitted or if rejected so user can resubmit) */}
      {(!application || application.status === 'NOT_SUBMITTED' || application.status === 'REJECTED') && (
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <h3 class="text-lg font-bold text-white">Submit Verification Details</h3>

          {error && (
            <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Government ID Type
                </label>
                <select
                  name="governmentIdType"
                  value={formData.governmentIdType}
                  onChange={handleChange}
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="PASSPORT">Passport</option>
                  <option value="NATIONAL_ID">National ID Card / Aadhaar</option>
                  <option value="DRIVING_LICENSE">Driver's License</option>
                  <option value="TAX_ID">Tax ID / PAN Card</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  ID Document Number
                </label>
                <input
                  type="text"
                  required
                  name="governmentIdNumber"
                  value={formData.governmentIdNumber}
                  onChange={handleChange}
                  placeholder="e.g. A9283719"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Residential Street Address
              </label>
              <textarea
                required
                name="address"
                rows="2"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full residential address including city and postal code"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Employment Status
                </label>
                <select
                  name="employmentStatus"
                  value={formData.employmentStatus}
                  onChange={handleChange}
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="EMPLOYED">Employed</option>
                  <option value="SELF_EMPLOYED">Self-Employed / Founder</option>
                  <option value="STUDENT">Student</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Monthly Income ($ USD)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  name="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleChange}
                  placeholder="e.g. 5000"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Account Type Desired
                </label>
                <select
                  name="accountTypeDesired"
                  value={formData.accountTypeDesired}
                  onChange={handleChange}
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="SAVINGS">Savings Account</option>
                  <option value="CHECKING">Checking Account</option>
                  <option value="BUSINESS">Business Account</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              class="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Submitting Verification...' : 'Submit Application for Review'}</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

