import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Play, 
  Square, 
  Timer, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Reservation, DiningClockSession } from '../types';
import { 
  format12HourTime, 
  parseTimeToDate, 
  calculateSessionDuration,
  clockInReservation,
  clockOutReservation,
  getDiningClockSession
} from '../services/diningTimerService';

interface DiningClockModalProps {
  isOpen: boolean;
  reservation: Reservation;
  initialMode?: 'clock_in' | 'clock_out' | 'adjust';
  onClose: () => void;
  onSessionUpdated: (session: DiningClockSession) => void;
}

export const DiningClockModal: React.FC<DiningClockModalProps> = ({
  isOpen,
  reservation,
  initialMode = 'clock_in',
  onClose,
  onSessionUpdated,
}) => {
  const existingSession = useMemo(() => {
    return getDiningClockSession(reservation.id) || reservation.diningClockSession || null;
  }, [reservation.id, reservation.diningClockSession]);

  const [mode, setMode] = useState<'clock_in' | 'clock_out'>(
    initialMode === 'clock_out' || (existingSession?.status === 'clocked_in')
      ? 'clock_out'
      : 'clock_in'
  );

  // Default time helpers
  const formatTimeForInput = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [customTime, setCustomTime] = useState<string>(() => {
    if (initialMode === 'clock_out' && existingSession?.clockOutTime) {
      return formatTimeForInput(new Date(existingSession.clockOutTime));
    }
    if (initialMode === 'clock_in' && existingSession?.clockInTime) {
      return formatTimeForInput(new Date(existingSession.clockInTime));
    }
    return formatTimeForInput(new Date());
  });

  const [customDate, setCustomDate] = useState<string>(() => {
    return reservation.date || new Date().toISOString().split('T')[0];
  });

  const [notes, setNotes] = useState<string>(existingSession?.notes || '');
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>(format12HourTime(new Date()));

  // Live ticking IST clock header
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeDisplay(format12HourTime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update form values if initialMode changes
  useEffect(() => {
    if (initialMode === 'clock_out' || existingSession?.status === 'clocked_in') {
      setMode('clock_out');
    } else {
      setMode('clock_in');
    }
  }, [initialMode, existingSession?.status]);

  if (!isOpen) return null;

  // Selected Date/Time parsed into a real Date
  const selectedDateObj = parseTimeToDate(customTime, customDate);
  const selectedDisplayTime = format12HourTime(selectedDateObj);

  // Calculate live preview duration if clocking out
  let previewDurationText = '';
  let previewMinutes = 0;
  if (mode === 'clock_out') {
    const clockInIso = existingSession?.clockInTime || parseTimeToDate(reservation.timeSlot || '07:00 PM', reservation.date).toISOString();
    const clockOutIso = selectedDateObj.toISOString();
    const dur = calculateSessionDuration(clockInIso, clockOutIso);
    previewDurationText = dur.formatted;
    previewMinutes = dur.minutes;
  }

  // Quick preset actions
  const applyNow = () => {
    setCustomTime(formatTimeForInput(new Date()));
    setCustomDate(new Date().toISOString().split('T')[0]);
  };

  const applySlotTime = () => {
    if (reservation.timeSlot) {
      const parsed = parseTimeToDate(reservation.timeSlot, reservation.date);
      setCustomTime(formatTimeForInput(parsed));
      if (reservation.date) setCustomDate(reservation.date);
    }
  };

  const applyMinutesOffset = (minutesDiff: number) => {
    const base = new Date();
    const adjusted = new Date(base.getTime() + minutesDiff * 60 * 1000);
    setCustomTime(formatTimeForInput(adjusted));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'clock_in') {
      const session = clockInReservation({
        reservationId: reservation.id,
        customTime,
        customDate,
        notes,
      });
      onSessionUpdated(session);
      onClose();
    } else {
      const session = clockOutReservation({
        reservationId: reservation.id,
        customTime,
        customDate,
        notes,
      });
      onSessionUpdated(session);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF9F6] w-full max-w-lg rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        id="dining-clock-modal"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-white border-b border-[#E8E6E1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              mode === 'clock_in' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#4F6F521A] text-[#4F6F52]'
            }`}>
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-serif text-[#2C3333]">
                  Dining Session Timer
                </h3>
                <span className="text-[11px] font-mono font-bold bg-[#FAF9F6] px-2 py-0.5 rounded-full border border-[#E8E6E1] text-[#4F6F52]">
                  Table {reservation.tableNumber}
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60">
                {reservation.restaurantName} • {reservation.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Real-time Clock Banner */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E6E1] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#2C3333]/70">
              <Clock className="w-4 h-4 text-[#4F6F52]" />
              <span>Current Time (IST):</span>
            </div>
            <span className="font-mono font-bold text-sm text-[#2C3333] bg-[#FAF9F6] px-2.5 py-1 rounded-lg border border-[#E8E6E1]">
              {currentTimeDisplay}
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-[#E8E6E1]/60 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('clock_in')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'clock_in'
                  ? 'bg-white text-[#2C3333] shadow-xs'
                  : 'text-[#2C3333]/60 hover:text-[#2C3333]'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              <span>Clock In (Start Dining)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('clock_out')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'clock_out'
                  ? 'bg-white text-[#2C3333] shadow-xs'
                  : 'text-[#2C3333]/60 hover:text-[#2C3333]'
              }`}
            >
              <Square className="w-3.5 h-3.5 text-rose-600" />
              <span>Clock Out (Finish Dining)</span>
            </button>
          </div>

          {/* Existing Session Summary if available */}
          {existingSession && (
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-600">Recorded Dining Log:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  existingSession.status === 'clocked_in' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-stone-200 text-stone-800'
                }`}>
                  {existingSession.status === 'clocked_in' ? '🟢 Clocked In Active' : '🏁 Clocked Out Completed'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-stone-700 pt-1">
                <div>
                  <span className="text-stone-400 block text-[9px] uppercase font-bold">Clocked In</span>
                  <span className="font-bold">{existingSession.clockInDisplayTime}</span>
                </div>
                {existingSession.clockOutDisplayTime && (
                  <div>
                    <span className="text-stone-400 block text-[9px] uppercase font-bold">Clocked Out</span>
                    <span className="font-bold">{existingSession.clockOutDisplayTime}</span>
                  </div>
                )}
                {existingSession.durationFormatted && (
                  <div>
                    <span className="text-stone-400 block text-[9px] uppercase font-bold">Total Duration</span>
                    <span className="font-bold text-emerald-700">{existingSession.durationFormatted}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desired Time Selection Section */}
          <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E6E1]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#2C3333] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#4F6F52]" />
                <span>
                  {mode === 'clock_in' ? 'Select Desired Clock-In Time' : 'Select Desired Clock-Out Time'}
                </span>
              </label>
              <span className="text-xs font-mono font-bold text-[#4F6F52] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {selectedDisplayTime || customTime}
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="text-[11px] text-[#2C3333]/50 block mb-1.5 font-medium">Quick Selection Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={applyNow}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] hover:bg-[#E8E6E1] border border-[#E8E6E1] text-[11px] font-semibold text-[#2C3333] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#4F6F52]" />
                  <span>Right Now</span>
                </button>
                {reservation.timeSlot && (
                  <button
                    type="button"
                    onClick={applySlotTime}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] hover:bg-[#E8E6E1] border border-[#E8E6E1] text-[11px] font-semibold text-[#2C3333] transition-colors cursor-pointer"
                  >
                    Reserved Slot ({reservation.timeSlot})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => applyMinutesOffset(-15)}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] hover:bg-[#E8E6E1] border border-[#E8E6E1] text-[11px] font-semibold text-[#2C3333] transition-colors cursor-pointer"
                >
                  15m ago
                </button>
                <button
                  type="button"
                  onClick={() => applyMinutesOffset(-30)}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] hover:bg-[#E8E6E1] border border-[#E8E6E1] text-[11px] font-semibold text-[#2C3333] transition-colors cursor-pointer"
                >
                  30m ago
                </button>
                {mode === 'clock_out' && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyMinutesOffset(45)}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] hover:bg-[#E8E6E1] border border-[#E8E6E1] text-[11px] font-semibold text-[#2C3333] transition-colors cursor-pointer"
                    >
                      +45m
                    </button>
                    <button
                      type="button"
                      onClick={() => applyMinutesOffset(60)}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] hover:bg-[#E8E6E1] border border-[#E8E6E1] text-[11px] font-semibold text-[#2C3333] transition-colors cursor-pointer"
                    >
                      +1 hour
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Custom Time & Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-[#2C3333]/70 block mb-1">
                  Custom Time (HH:MM)
                </label>
                <input
                  type="time"
                  required
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] font-mono font-bold text-sm text-[#2C3333] focus:outline-none focus:ring-2 focus:ring-[#4F6F52]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#2C3333]/70 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] font-medium text-xs text-[#2C3333] focus:outline-none focus:ring-2 focus:ring-[#4F6F52]"
                />
              </div>
            </div>

            {/* Clock-out preview duration card */}
            {mode === 'clock_out' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Calculated Total Dining Duration:</span>
                </div>
                <span className="font-bold font-mono text-sm text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                  {previewDurationText || 'Calculating...'}
                </span>
              </div>
            )}
          </div>

          {/* Optional Table Notes */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8E6E1] space-y-1.5">
            <label className="text-xs font-bold text-[#2C3333] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Dining Notes (Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Arrived early, dinner with family, dessert served"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8E6E1] text-xs text-[#2C3333] focus:outline-none focus:ring-2 focus:ring-[#4F6F52]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full border border-[#E8E6E1] hover:bg-stone-100 text-xs font-bold text-[#2C3333] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                mode === 'clock_in'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-[#2C3333] hover:bg-[#4F6F52]'
              }`}
              id="submit-dining-clock-btn"
            >
              {mode === 'clock_in' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Clock In ({selectedDisplayTime})</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Clock Out & Save ({selectedDisplayTime})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
