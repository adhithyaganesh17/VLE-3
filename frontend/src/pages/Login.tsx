import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { HeartPulse, Shield, User, Stethoscope, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const { login, refreshProfile, quickLoginAs } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          email,
          password,
          full_name: fullName,
          role,
          phone: phone || undefined
        });
        login(res.access_token, {
          id: res.user_id,
          email: res.email,
          full_name: res.full_name,
          role: res.role as UserRole,
          is_active: true,
          created_at: new Date().toISOString()
        });
      } else {
        const res = await api.login({ email, password });
        login(res.access_token, {
          id: res.user_id,
          email: res.email,
          full_name: res.full_name,
          role: res.role as UserRole,
          is_active: true,
          created_at: new Date().toISOString()
        });
      }
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (targetRole: UserRole) => {
    setError(null);
    setIsLoading(true);
    try {
      await quickLoginAs(targetRole);
    } catch (err: any) {
      setError('Demo login failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-[#101726] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10">
        {/* Left Side: Product Branding & Demo Role Selector */}
        <div className="p-8 md:p-10 bg-gradient-to-br from-[#0c1322] to-[#121c2e] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <HeartPulse className="w-7 h-7 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="font-bold text-2xl tracking-tight text-white">MEDORA</h1>
                <p className="text-xs text-teal-400 font-mono tracking-wide">SMART HEALTHCARE PLATFORM</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              An enterprise-grade healthcare operations system built with FastAPI, React, Kubernetes Blue-Green zero-downtime deployment, and automated DevSecOps security pipelines.
            </p>

            {/* Quick Demo Credentials Panel for Viva Evaluators */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center space-x-1.5">
                <span>Instant Demo Access (Viva Evaluation)</span>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('patient')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-teal-950/30 border border-slate-800 hover:border-teal-500/40 transition group text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-teal-300">Patient Portal</div>
                      <div className="text-[11px] text-slate-400 font-mono">patient.john@medora.health</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transform group-hover:translate-x-1 transition" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('doctor')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-sky-950/30 border border-slate-800 hover:border-sky-500/40 transition group text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-sky-300">Doctor Workstation</div>
                      <div className="text-[11px] text-slate-400 font-mono">doctor.sarah@medora.health</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transform group-hover:translate-x-1 transition" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('admin')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/40 transition group text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-indigo-300">Hospital Administrator</div>
                      <div className="text-[11px] text-slate-400 font-mono">admin@medora.health</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Password for all: <code className="text-teal-400 font-bold">Role@12345</code></span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Kubernetes Ready</span>
            </span>
          </div>
        </div>

        {/* Right Side: Manual Credentials Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">
              {isRegister ? 'Create Patient Account' : 'Sign In to Portal'}
            </h2>
            <p className="text-xs text-slate-400">
              {isRegister 
                ? 'Register your profile to access electronic health records' 
                : 'Enter your credentials to access your clinical dashboard'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.org"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-slate-950 transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : (isRegister ? 'Register Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-teal-400 hover:underline font-semibold"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                New patient?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-teal-400 hover:underline font-semibold"
                >
                  Create account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
