import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Doctor } from '../types';
import { X, Calendar, Clock, Stethoscope, AlertCircle } from 'lucide-react';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00 AM');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getDoctors()
        .then((data) => {
          setDoctors(data);
          if (data.length > 0) setSelectedDoctorId(data[0].id);
        })
        .catch((err) => setError('Failed to load doctors: ' + err.message));
      
      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !appointmentDate || !reason) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.createAppointment({
        doctor_id: Number(selectedDoctorId),
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason,
        notes: notes || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:15 AM', '01:30 PM', '02:30 PM', '03:45 PM', '04:30 PM'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Schedule New Consultation</h3>
              <p className="text-xs text-slate-400">Select physician and available clinic slot</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Attending Physician *</label>
            <div className="relative">
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 transition"
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.user?.full_name || `Doctor #${doc.id}`} — {doc.specialization} ({doc.department}) — ${doc.consultation_fee}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Date *</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Time Slot *</label>
              <select
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Chief Complaint / Reason *</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Periodic headaches, blood pressure screening, follow-up..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition resize-none"
              required
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Optional Clinical Notes / Allergies</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any past medical considerations..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
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
              {isLoading ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
