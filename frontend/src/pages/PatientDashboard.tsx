import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Appointment, Prescription, LabReport } from '../types';
import { BookAppointmentModal } from '../components/BookAppointmentModal';
import { 
  Calendar, Clock, Plus, XCircle, Pill, FileText, 
  Activity, ShieldAlert, CheckCircle, AlertTriangle, UserCheck
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [apts, prescs, labs] = await Promise.all([
        api.getAppointments(),
        api.getPrescriptions(),
        api.getLabReports()
      ]);
      setAppointments(apts);
      setPrescriptions(prescs);
      setLabReports(labs);
    } catch (err: any) {
      console.error('Failed to load patient data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelAppointment = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this scheduled consultation?')) return;
    try {
      await api.cancelAppointment(id);
      setActionMessage('Appointment cancelled successfully.');
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert('Failed to cancel appointment: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-mono mb-1">
            <UserCheck className="w-4 h-4" />
            <span>PATIENT PORTAL • EHR ACCESS</span>
          </div>
          <h2 className="text-xl font-bold text-white">Welcome, {user?.full_name}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Blood Type: <span className="text-white font-mono">{user?.blood_group || 'O+'}</span> | 
            Known Allergies: <span className="text-rose-400">{user?.allergies || 'Penicillin, Sulfa'}</span>
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Book New Consultation</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Upcoming Visits</div>
          <div className="text-2xl font-bold text-white font-mono">
            {appointments.filter(a => a.status === 'SCHEDULED').length}
          </div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Completed Consultations</div>
          <div className="text-2xl font-bold text-teal-400 font-mono">
            {appointments.filter(a => a.status === 'COMPLETED').length}
          </div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Active Prescriptions</div>
          <div className="text-2xl font-bold text-sky-400 font-mono">
            {prescriptions.length}
          </div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Lab Reports</div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">
            {labReports.length}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Your Scheduled & Past Appointments</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{appointments.length} Total</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No appointments booked yet. Click "Book New Consultation" to schedule one.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/40 transition">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-semibold text-white">{apt.doctor_name}</span>
                    <span className="text-xs text-slate-400">({apt.doctor_specialization || 'Specialist'})</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      apt.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : apt.status === 'CANCELLED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    }`}>
                      {apt.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    <span className="text-slate-400 font-medium">Reason: </span>{apt.reason}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-slate-400 font-mono">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{apt.appointment_date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{apt.appointment_time}</span>
                    </span>
                  </div>
                </div>

                {apt.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleCancelAppointment(apt.id)}
                    className="self-start md:self-center px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 transition flex items-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Prescriptions & Lab Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prescriptions */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Pill className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Active Medications & Prescriptions</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{prescriptions.length} Records</span>
          </div>

          <div className="p-4 space-y-3">
            {prescriptions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No active medications prescribed.</div>
            ) : (
              prescriptions.map((p) => (
                <div key={p.id} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{p.medication_name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {p.dosage} • {p.duration_days} days
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Schedule: </span>{p.frequency}
                  </div>
                  {p.instructions && (
                    <div className="text-[11px] text-slate-400 italic">
                      Note: {p.instructions}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 font-mono pt-1">
                    Prescribed by: {p.doctor_name || 'Cardiovascular Specialist'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lab Reports */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Clinical Diagnostics & Lab Reports</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{labReports.length} Reports</span>
          </div>

          <div className="p-4 space-y-3">
            {labReports.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No lab reports found.</div>
            ) : (
              labReports.map((l) => (
                <div key={l.id} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{l.test_name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {l.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {l.results_summary}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                    <span>Category: {l.test_category}</span>
                    <span>Date: {l.test_date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={() => {
          setActionMessage('Consultation booked successfully!');
          setTimeout(() => setActionMessage(null), 4000);
          loadData();
        }}
      />
    </div>
  );
};
