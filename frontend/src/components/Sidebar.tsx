import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Stethoscope, UserCog, Terminal, 
  ShieldCheck, FileText, CalendarCheck, Activity, Cpu
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    {
      id: 'patient',
      label: 'Patient Portal',
      icon: CalendarCheck,
      badge: role === 'patient' ? 'Active Role' : undefined,
      description: 'Appointments & Health Records'
    },
    {
      id: 'doctor',
      label: 'Doctor Workstation',
      icon: Stethoscope,
      badge: role === 'doctor' ? 'Active Role' : undefined,
      description: 'Consultations & Prescriptions'
    },
    {
      id: 'admin',
      label: 'Admin Operations',
      icon: UserCog,
      badge: role === 'admin' ? 'Active Role' : undefined,
      description: 'Analytics, Users & Hospital Ops'
    },
    {
      id: 'devops',
      label: 'DevOps Control Centre',
      icon: Terminal,
      badge: 'Blue-Green',
      badgeColor: 'sky',
      description: 'K8s Pods, Latency & Cutover'
    },
    {
      id: 'security',
      label: 'DevSecOps & Audit',
      icon: ShieldCheck,
      badge: 'Zero Secrets',
      badgeColor: 'teal',
      description: 'Gitleaks, Bandit, Trivy Scans'
    }
  ];

  return (
    <aside className="w-64 bg-[#080E1A] border-r border-slate-800/80 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-3 mb-2 font-semibold">
            System Modules
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500/20 to-sky-500/10 text-white border border-teal-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-teal-500/30 text-teal-300' : 'bg-slate-800/60 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-medium leading-none mb-1">{item.label}</div>
                      <div className="text-[10px] text-slate-400 leading-none">{item.description}</div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      item.badgeColor === 'sky' 
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : item.badgeColor === 'teal'
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Kubernetes Cluster Context Card */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
            <span>K8S NAMESPACE</span>
            <span className="text-teal-400 font-bold">medora</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
            <span>ROUTING SERVICE</span>
            <span className="text-sky-300 truncate max-w-[100px]">medora-svc</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
            <span>PROMETHEUS</span>
            <span className="text-emerald-400">Scraping (15s)</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Deployment Spec</span>
          <span className="font-mono text-teal-400">Zero-Downtime</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Security Baseline</span>
          <span className="font-mono text-sky-400">HIPAA Compliant</span>
        </div>
      </div>
    </aside>
  );
};
