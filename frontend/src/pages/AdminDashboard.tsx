import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AdminAnalytics, AuditLog, User } from '../types';
import { 
  Users, Stethoscope, Calendar, CheckCircle2, AlertOctagon, 
  BarChart3, Activity, ShieldCheck, RefreshCw, Filter, ToggleLeft, ToggleRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell 
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logFilter, setLogFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadAdminData = async () => {
    try {
      const [an, logs, u] = await Promise.all([
        api.getAdminAnalytics(),
        api.getAuditLogs(logFilter || undefined),
        api.getUsers()
      ]);
      setAnalytics(an);
      setAuditLogs(logs);
      setUsers(u);
    } catch (err) {
      console.error('Failed to load admin operations data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [logFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  const handleToggleUser = async (userId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status?is_active=${!currentStatus}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('medora_token')}` }
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      }
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const COLORS = ['#14B8A6', '#38BDF8', '#818CF8', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>HOSPITAL OPERATIONS EXECUTIVE CONSOLE</span>
          </div>
          <h2 className="text-xl font-bold text-white">Administration & Clinical Analytics</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of patient flows, doctor utilization, HIPAA audit trails, and platform telemetry.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>Total Patients</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {analytics?.total_patients ?? 0}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
            <Stethoscope className="w-3.5 h-3.5 text-sky-400" />
            <span>Clinical Doctors</span>
          </div>
          <div className="text-2xl font-bold text-sky-400 font-mono">
            {analytics?.total_doctors ?? 0}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>All Appointments</span>
          </div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">
            {analytics?.total_appointments ?? 0}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Consultations Done</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {analytics?.completed_consultations ?? 0}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Schedule</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {analytics?.pending_appointments ?? 0}
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Admission & Consultation Trends */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Patient Volume Trends</h3>
              <p className="text-xs text-slate-400">Monthly breakdown of appointments & completed visits</p>
            </div>
            <span className="text-xs font-mono text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
              Live Recharts
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.monthly_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1220', borderColor: '#1F293D', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="appointments" name="Appointments" stroke="#14B8A6" strokeWidth={2} fillOpacity={1} fill="url(#colorApt)" />
                <Area type="monotone" dataKey="consultations" name="Consultations" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Appointment Status Distribution */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Status Distribution</h3>
              <p className="text-xs text-slate-400">Total appointments categorized by operational state</p>
            </div>
            <span className="text-xs font-mono text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
              Distribution
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.status_distribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="status" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1220', borderColor: '#1F293D', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" name="Count" fill="#14B8A6" radius={[4, 4, 0, 0]}>
                  {analytics?.status_distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* User Governance & Account Management */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">User Accounts & Access Governance</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{users.length} Registered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition">
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-white">{u.full_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      u.role === 'admin' 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : u.role === 'doctor'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-300 font-mono">
                    {u.phone || '—'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span>{u.is_active ? 'ACTIVE' : 'SUSPENDED'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleToggleUser(u.id, u.is_active)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                          u.is_active 
                            ? 'text-rose-400 hover:bg-rose-950/30 border-rose-900/40' 
                            : 'text-emerald-400 hover:bg-emerald-950/30 border-emerald-900/40'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Viewer */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Security & Regulatory Audit Trail</h3>
              <p className="text-[11px] text-slate-400">Compliant with HIPAA §164.312(b) audit controls</p>
            </div>
          </div>

          {/* Action Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Audit Events</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="BOOK_APPOINTMENT">BOOK_APPOINTMENT</option>
              <option value="CREATE_CONSULTATION">CREATE_CONSULTATION</option>
              <option value="CANCEL_APPOINTMENT">CANCEL_APPOINTMENT</option>
              <option value="BLUE_GREEN_SWITCH">BLUE_GREEN_SWITCH</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
              <tr>
                <th className="px-6 py-3">Timestamp (UTC)</th>
                <th className="px-6 py-3">Event Action</th>
                <th className="px-6 py-3">Target Resource</th>
                <th className="px-6 py-3">Actor Email</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition">
                  <td className="px-6 py-3 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-6 py-3 font-mono font-semibold text-teal-400">
                    {log.action}
                  </td>
                  <td className="px-6 py-3 font-mono text-slate-300">
                    {log.resource}
                  </td>
                  <td className="px-6 py-3 text-slate-300">
                    {log.user_email || 'System'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-400 text-[11px] truncate max-w-xs">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
