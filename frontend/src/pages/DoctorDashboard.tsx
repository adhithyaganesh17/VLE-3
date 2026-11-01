import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Appointment, Consultation } from '../types';
import { RecordConsultationModal } from '../components/RecordConsultationModal';
import { 
  Stethoscope, Clock, Calendar, CheckCircle2, AlertCircle, 
  User, Play, FileCheck, Pill, Activity, Shield
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDoctorData = async () => {
    setIsLoading(true);
    try {
      const [apts, cons] = await Promise.all([
        api.getAppointments(),
        api.getConsultations()
      ]);
      setAppointments(apts);
      setConsultations(cons);
    } catch (err: any) {
      console.error('Failed to load doctor clinical queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, []);

  const handleStatusChange = async (aptId: number, newStatus: string) => {
    try {
      await api.updateAppointment(aptId, { status: newStatus });
      setActionSuccess(`Appointment #${aptId} status updated to ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
      loadDoctorData();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleStartConsultation = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsConsultModalOpen(true);
  };

  const scheduledApts = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS');
  const completedApts = appointments.filter(a => a.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 text-xs font-mono mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>CLINICAL WORKSTATION • MD CONSOLE</span>
          </div>
          <h2 className="text-xl font-bold text-white">{user?.full_name}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Department: <span className="text-white">{user?.department || 'Cardiovascular Institute'}</span> | 
            Specialization: <span className="text-sky-300 font-semibold">{user?.specialization || 'Cardiology'}</span> | 
            License: <span className="font-mono text-slate-300">{user?.license_number || 'MD-CARD-88492'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-slate-300">Accepting Consultations</span>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Pending In Queue</div>
          <div className="text-2xl font-bold text-sky-400 font-mono">
            {scheduledApts.length}
          </div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Completed Consultations</div>
          <div className="text-2xl font-bold text-teal-400 font-mono">
            {completedApts.length}
          </div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Total Assigned Patients</div>
          <div className="text-2xl font-bold text-white font-mono">
            {new Set(appointments.map(a => a.patient_id)).size}
          </div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Active Prescriptions</div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">
            {consultations.reduce((acc, c) => acc + (c.prescriptions?.length || 0), 0)}
          </div>
        </div>
      </div>

      {/* Active Consultations Queue */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Today's Patient Queue</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{scheduledApts.length} Pending</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading queue...</div>
        ) : scheduledApts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No pending patients in queue. All consultations for today are completed.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {scheduledApts.map((apt) => (
              <div key={apt.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 transition">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-white">{apt.patient_name}</span>
                    <span className="text-xs text-slate-400 font-mono">Patient #{apt.patient_id}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      apt.status === 'IN_PROGRESS' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                        : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    }`}>
                      {apt.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    <span className="text-slate-400 font-medium">Chief Complaint: </span>{apt.reason}
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

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 self-start md:self-center">
                  {apt.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleStatusChange(apt.id, 'IN_PROGRESS')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                    >
                      Call In Patient
                    </button>
                  )}

                  <button
                    onClick={() => handleStartConsultation(apt)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Consultation</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Completed Consultations Log */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Recent Clinical Diagnoses & Consultations</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{consultations.length} Records</span>
        </div>

        <div className="p-4 space-y-3">
          {consultations.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">No completed consultations yet.</div>
          ) : (
            consultations.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-teal-300">{c.patient_name}</span>
                    <span className="text-xs text-slate-400 font-mono">| {c.diagnosis}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{c.created_at?.slice(0, 10)}</span>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="text-slate-400">Symptoms: </span>{c.symptoms}
                </div>

                {c.clinical_notes && (
                  <div className="text-xs text-slate-400 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                    {c.clinical_notes}
                  </div>
                )}

                {c.prescriptions && c.prescriptions.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 flex flex-wrap gap-2">
                    {c.prescriptions.map((p, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        💊 {p.medication_name} ({p.dosage})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Record Consultation Modal */}
      <RecordConsultationModal
        appointment={selectedAppointment}
        isOpen={isConsultModalOpen}
        onClose={() => {
          setIsConsultModalOpen(false);
          setSelectedAppointment(null);
        }}
        onSuccess={() => {
          setActionSuccess('Consultation and prescriptions successfully recorded!');
          setTimeout(() => setActionSuccess(null), 4000);
          loadDoctorData();
        }}
      />
    </div>
  );
};
