import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Activity, Shield, Server, RefreshCw, LogOut, HeartPulse } from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, logout, quickLoginAs } = useAuth();
  const [env, setEnv] = useState<'blue' | 'green'>('blue');
  const [version, setVersion] = useState<string>('1.0.0');
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  // Poll health & environment
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const health = await api.getHealthProbe();
        setEnv(health.environment?.toLowerCase() || 'blue');
        setVersion(health.version || '1.0.0');
        setIsBackendHealthy(true);
      } catch {
        setIsBackendHealthy(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickRoleSwitch = async (role: UserRole) => {
    setIsSwitching(true);
    try {
      await quickLoginAs(role);
      setCurrentView(role);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B1220]/95 backdrop-blur sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('devops')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <HeartPulse className="w-6 h-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white">MEDORA</span>
            <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
              SaaS v{version}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">Smart Healthcare Operations & DevSecOps Platform</p>
        </div>
      </div>

      {/* Center: Live Blue/Green Environment Indicator */}
      <div className="hidden lg:flex items-center space-x-3 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1.5 shadow-inner">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 font-medium">Cluster Traffic:</span>
          {env === 'blue' ? (
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/50 env-glow-blue">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
              <span>ACTIVE: BLUE</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/50 env-glow-green">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping inline-block" />
              <span>ACTIVE: GREEN</span>
            </span>
          )}
        </div>

        <div className="h-3 w-px bg-slate-700" />

        {/* Backend Heartbeat */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${isBackendHealthy ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'}`} />
          <span className="text-slate-300 font-mono">{isBackendHealthy ? 'API Ready' : 'API Error'}</span>
        </div>
      </div>

      {/* Right: Quick Role Switcher + User Profile */}
      <div className="flex items-center space-x-3">
        {/* Viva Quick Role Switcher Buttons */}
        <div className="hidden sm:flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => handleQuickRoleSwitch('patient')}
            disabled={isSwitching}
            className={`px-2.5 py-1 rounded transition-all ${
              user?.role === 'patient' 
                ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Patient
          </button>
          <button
            onClick={() => handleQuickRoleSwitch('doctor')}
            disabled={isSwitching}
            className={`px-2.5 py-1 rounded transition-all ${
              user?.role === 'doctor' 
                ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Doctor
          </button>
          <button
            onClick={() => handleQuickRoleSwitch('admin')}
            disabled={isSwitching}
            className={`px-2.5 py-1 rounded transition-all ${
              user?.role === 'admin' 
                ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Admin
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
          <div className="text-right hidden md:block">
            <div className="text-xs font-semibold text-white truncate max-w-[140px]">{user?.full_name}</div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-teal-400">{user?.role}</div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
