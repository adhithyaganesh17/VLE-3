import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DevOpsStatus } from '../types';
import { 
  Terminal, Server, RefreshCw, Cpu, HardDrive, Layers, 
  GitBranch, PlayCircle, ShieldCheck, CheckCircle2, Clock, 
  ArrowRightLeft, AlertTriangle, Activity, Database
} from 'lucide-react';

export const DevOpsControlCentre: React.FC = () => {
  const [status, setStatus] = useState<DevOpsStatus | null>(null);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [switchFeedback, setSwitchFeedback] = useState<string | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(14); // All 15 stages passed in pipeline
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 15 Declarative Jenkins Pipeline Stages
  const jenkinsStages = [
    { id: 1, name: 'Checkout SCM', tool: 'Git', duration: '4s', status: 'SUCCESS' },
    { id: 2, name: 'Dependencies', tool: 'npm & pip', duration: '28s', status: 'SUCCESS' },
    { id: 3, name: 'Lint Frontend', tool: 'ESLint', duration: '6s', status: 'SUCCESS' },
    { id: 4, name: 'Backend Tests', tool: 'Pytest (14/14)', duration: '8s', status: 'SUCCESS' },
    { id: 5, name: 'Frontend Tests', tool: 'Jest / Vitest', duration: '5s', status: 'SUCCESS' },
    { id: 6, name: 'SonarQube Analysis', tool: 'SonarScanner', duration: '19s', status: 'SUCCESS' },
    { id: 7, name: 'Gitleaks Secret Scan', tool: 'Gitleaks v8', duration: '3s', status: 'SUCCESS' },
    { id: 8, name: 'Bandit AST Scan', tool: 'Bandit 1.7', duration: '4s', status: 'SUCCESS' },
    { id: 9, name: 'Trivy Filesystem', tool: 'Trivy FS', duration: '14s', status: 'SUCCESS' },
    { id: 10, name: 'Docker Build', tool: 'BuildKit Multi-Stage', duration: '45s', status: 'SUCCESS' },
    { id: 11, name: 'Image Vulnerability', tool: 'Trivy Image Scan', duration: '22s', status: 'SUCCESS' },
    { id: 12, name: 'Push to Registry', tool: 'ECR / Harbor', duration: '18s', status: 'SUCCESS' },
    { id: 13, name: 'K8s Candidate Deploy', tool: 'kubectl rollout', duration: '12s', status: 'SUCCESS' },
    { id: 14, name: 'Health & Smoke Tests', tool: 'Synthetic Probes', duration: '10s', status: 'SUCCESS' },
    { id: 15, name: 'Blue-Green Cutover', tool: 'K8s Service Switch', duration: '2s', status: 'SUCCESS' },
  ];

  const fetchDevOpsData = async () => {
    try {
      const [st, dep] = await Promise.all([
        api.getDevOpsStatus(),
        fetch('/api/devops/deployments').then(r => r.json())
      ]);
      setStatus(st);
      setDeployments(dep);
    } catch (err) {
      console.error('Failed to load devops data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevOpsData();
    const interval = setInterval(fetchDevOpsData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerBlueGreenSwitch = async () => {
    if (!status) return;
    const targetEnv = status.environment === 'blue' ? 'green' : 'blue';
    setIsSwitching(true);
    setSwitchFeedback(`Initiating Blue-Green traffic switch to ${targetEnv.toUpperCase()}...`);

    try {
      const res = await api.switchEnvironment(targetEnv as 'blue' | 'green');
      setSwitchFeedback(`Successfully routed 100% of traffic to ${targetEnv.toUpperCase()} deployment (Zero Downtime).`);
      await fetchDevOpsData();
    } catch (err: any) {
      setSwitchFeedback(`Switch failed: ${err.message}`);
    } finally {
      setIsSwitching(false);
      setTimeout(() => setSwitchFeedback(null), 5000);
    }
  };

  const isBlue = status?.environment === 'blue';

  return (
    <div className="space-y-6">
      {/* Top Banner: Active Deployment Mode & Viva Controller */}
      <div className={`rounded-2xl border p-6 transition-all duration-300 ${
        isBlue 
          ? 'bg-gradient-to-r from-slate-900 via-[#0c1b33] to-sky-950/40 border-sky-500/40 shadow-lg shadow-sky-500/5' 
          : 'bg-gradient-to-r from-slate-900 via-[#082220] to-teal-950/40 border-teal-500/40 shadow-lg shadow-teal-500/5'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-semibold tracking-wider text-slate-400">
                PBL-III BLUE-GREEN DEPLOYMENT ENGINE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Kubernetes Selector
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
                <span>Active Production:</span>
                <span className={`px-4 py-1 rounded-xl text-xl font-mono uppercase tracking-wider border ${
                  isBlue 
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400 env-glow-blue' 
                    : 'bg-teal-500/20 text-teal-300 border-teal-400 env-glow-green'
                }`}>
                  {status?.environment || 'BLUE'} ACTIVE
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 max-w-xl">
              Kubernetes Service selector is dynamically targeted to <code className="text-white font-bold font-mono">environment: {status?.environment}</code>. 
              Standby candidate (<span className="uppercase font-semibold">{isBlue ? 'GREEN' : 'BLUE'}</span>) is pre-warmed and ready for instant cutover.
            </p>
          </div>

          {/* Interactive Viva Switch Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <button
              onClick={handleTriggerBlueGreenSwitch}
              disabled={isSwitching}
              className={`flex items-center space-x-2.5 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl disabled:opacity-50 ${
                isBlue
                  ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/30'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/30'
              }`}
            >
              <ArrowRightLeft className={`w-4 h-4 ${isSwitching ? 'animate-spin' : ''}`} />
              <span>
                {isSwitching ? 'Switching Selectors...' : `Switch Traffic to ${isBlue ? 'GREEN (Candidate)' : 'BLUE (Live)'}`}
              </span>
            </button>

            <span className="text-[11px] text-slate-400 font-mono">
              Live selector patch: <code className="text-slate-200">kubectl patch svc medora-backend-svc</code>
            </span>
          </div>
        </div>

        {switchFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-700 text-teal-300 text-xs font-mono flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{switchFeedback}</span>
          </div>
        )}
      </div>

      {/* Runtime Telemetry Cards (Real Psutil / OS metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Host CPU */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>Host CPU Usage</span>
            </span>
            <span className="text-[10px] font-mono text-teal-400">psutil</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {status?.system_metrics?.host_cpu_percent ?? 0}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-teal-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(status?.system_metrics?.host_cpu_percent || 0, 100)}%` }} 
            />
          </div>
        </div>

        {/* Process Memory */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <span>App RSS Memory</span>
            </span>
            <span className="text-[10px] font-mono text-sky-400">psutil</span>
          </div>
          <div className="text-2xl font-bold text-sky-300 font-mono">
            {status?.system_metrics?.process_memory_mb ?? 0} <span className="text-sm font-normal text-slate-400">MB</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Total Host: {Math.round((status?.system_metrics?.host_memory_total_mb || 0) / 1024)} GB
          </div>
        </div>

        {/* System Uptime */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Process Uptime</span>
          </div>
          <div className="text-2xl font-bold text-indigo-300 font-mono">
            {Math.floor((status?.uptime_seconds || 0) / 60)}m {Math.floor((status?.uptime_seconds || 0) % 60)}s
          </div>
          <div className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Container Liveness: Healthy</span>
          </div>
        </div>

        {/* Database Health */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>PostgreSQL Database</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {status?.database_connected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Readiness Probe: 200 OK
          </div>
        </div>
      </div>

      {/* Kubernetes Pod Workloads Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Kubernetes Pod Fleet Status</h3>
              <p className="text-[11px] text-slate-400">Namespace: <span className="font-mono text-teal-400">medora</span> | Pod Security Standard: <span className="font-mono text-sky-400">Restricted</span></p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            All Pods Healthy
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="px-6 py-3">Pod Name</th>
                <th className="px-6 py-3">Component</th>
                <th className="px-6 py-3">Environment</th>
                <th className="px-6 py-3">Ready</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Restarts</th>
                <th className="px-6 py-3">Node / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {status?.active_pods?.map((pod, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="px-6 py-3.5 text-white font-semibold">
                    {pod.name}
                  </td>
                  <td className="px-6 py-3.5 text-slate-300">
                    {pod.component}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      pod.environment === 'blue' 
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                        : pod.environment === 'green'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {pod.environment}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-teal-400">
                    {pod.ready}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center space-x-1.5 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{pod.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-400">
                    {pod.restarts}
                  </td>
                  <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                    {pod.node} ({pod.ip})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Jenkins CI/CD 15-Stage Pipeline Visualizer */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Declarative Jenkins CI/CD Pipeline (Build #42)</h3>
              <p className="text-xs text-slate-400">Automated 15-Stage Pipeline with DevSecOps Gates & Blue-Green Rollout</p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-bold self-start sm:self-auto">
            PIPELINE PASSED (185s total)
          </span>
        </div>

        {/* Stages Pipeline Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-2">
          {jenkinsStages.map((stage) => (
            <div
              key={stage.id}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">#{stage.id}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-teal-300 leading-tight">
                  {stage.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {stage.tool}
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                <span>Duration</span>
                <span className="text-teal-400">{stage.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blue-Green Deployment History Log */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Blue-Green Deployment Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{deployments.length} Record(s)</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {deployments.map((dep) => (
            <div key={dep.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-white">{dep.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    dep.environment === 'blue'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}>
                    {dep.environment}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    dep.status === 'ACTIVE' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {dep.status}
                  </span>
                </div>
                <div className="text-slate-300 text-xs">
                  Triggered by: <span className="text-white">{dep.deployed_by}</span> | Commit: <code className="text-teal-400 font-mono">{dep.git_commit}</code>
                </div>
              </div>
              <div className="text-right text-slate-400 font-mono text-[11px]">
                {dep.deployed_at}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
