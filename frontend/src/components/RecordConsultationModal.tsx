import React, { useState } from 'react';
import { api } from '../services/api';
import { Appointment } from '../types';
import { X, ClipboardCheck, Plus, Trash2, Pill, AlertCircle } from 'lucide-react';

interface RecordConsultationModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PrescriptionItem {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions: string;
}

export const RecordConsultationModal: React.FC<RecordConsultationModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    { medication_name: '', dosage: '', frequency: 'Once daily', duration_days: 7, instructions: '' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !appointment) return null;

  const handleAddPrescription = () => {
    setPrescriptions([
      ...prescriptions,
      { medication_name: '', dosage: '', frequency: 'Once daily', duration_days: 7, instructions: '' }
    ]);
  };

  const handleRemovePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handlePrescriptionChange = (index: number, field: keyof PrescriptionItem, val: any) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: val };
    setPrescriptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis || !symptoms) {
      setError('Diagnosis and Symptoms are required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Filter valid prescriptions
    const validPrescriptions = prescriptions.filter(p => p.medication_name.trim() !== '');

    try {
      await api.createConsultation({
        appointment_id: appointment.id,
        diagnosis,
        symptoms,
        clinical_notes: clinicalNotes || undefined,
        follow_up_date: followUpDate || undefined,
        prescriptions: validPrescriptions
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record consultation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Record Clinical Consultation</h3>
              <p className="text-xs text-slate-400">
                Patient: <span className="text-teal-300 font-medium">{appointment.patient_name}</span> | Date: {appointment.appointment_date}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Chief Complaint Reference */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
            <span className="text-slate-400 font-medium">Reported Reason: </span>
            <span className="text-slate-200">{appointment.reason}</span>
          </div>

          {/* Diagnosis & Symptoms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Clinical Diagnosis *</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Bronchitis, Essential Hypertension..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Symptoms Evaluated *</label>
              <input
                type="text"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. Persistent cough, dyspnea, fatigue..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Clinical Assessment & Physician Notes</label>
            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Detailed physical exam findings, vital sign observations, lab orders..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition resize-none"
            />
          </div>

          {/* Follow-up */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Recommended Follow-up Date</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition max-w-xs"
            />
          </div>

          {/* Prescriptions Section */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Pill className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Prescriptions to Dispense</h4>
              </div>
              <button
                type="button"
                onClick={handleAddPrescription}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medication</span>
              </button>
            </div>

            <div className="space-y-3">
              {prescriptions.map((p, idx) => (
                <div key={idx} className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Drug Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin"
                        value={p.medication_name}
                        onChange={(e) => handlePrescriptionChange(idx, 'medication_name', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Dosage</label>
                      <input
                        type="text"
                        placeholder="e.g. 500 mg"
                        value={p.dosage}
                        onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Frequency</label>
                      <input
                        type="text"
                        placeholder="e.g. Twice daily after meals"
                        value={p.frequency}
                        onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="w-28">
                      <label className="block text-[10px] text-slate-400 mb-0.5">Duration (days)</label>
                      <input
                        type="number"
                        min={1}
                        value={p.duration_days}
                        onChange={(e) => handlePrescriptionChange(idx, 'duration_days', Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 mb-0.5">Special Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. Take with full glass of water, finish complete course"
                        value={p.instructions}
                        onChange={(e) => handlePrescriptionChange(idx, 'instructions', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sky-500"
                      />
                    </div>
                    {prescriptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePrescription(idx)}
                        className="self-end p-2 text-slate-400 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {isLoading ? 'Saving Record...' : 'Complete Consultation & Issue Rx'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
