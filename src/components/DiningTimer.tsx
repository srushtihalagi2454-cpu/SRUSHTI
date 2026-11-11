import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  Square, 
  Timer as TimerIcon, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  Edit2
} from 'lucide-react';
import { Reservation, DiningClockSession } from '../types';
import { 
  getDiningClockSession, 
  clockInReservation, 
  clockOutReservation, 
  calculateLiveElapsed,
  clearDiningClockSession
} from '../services/diningTimerService';
import { DiningClockModal } from './DiningClockModal';
import { formatTimeIST } from '../utils/dateTime';

export interface DiningTimerProps {
  reservation: Reservation;
  onUpdateSession?: (session: DiningClockSession | null) => void;
  className?: string;
  variant?: 'card' | 'compact';
}

/**
 * Dining Timer UI component for MyReservationsView
 * Displays a live stopwatch once a customer clicks 'Clock In'.
 * Updates every second, stores start time in the local reservation object,
 * and allows customers to manually enter or adjust Time In and Time Out.
 */
export const DiningTimer: React.FC<DiningTimerProps> = ({
  reservation,
  onUpdateSession,
  className = '',
  variant = 'card',
}) => {
  const [session, setSession] = useState<DiningClockSession | null>(() => {
    return getDiningClockSession(reservation.id) || reservation.diningClockSession || null;
  });

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'clock_in' | 'clock_out'>('clock_in');

  // Direct manual inline inputs for customer convenience
  const [showManualInputs, setShowManualInputs] = useState<boolean>(false);
  const [manualTimeIn, setManualTimeIn] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [manualTimeOut, setManualTimeOut] = useState<string>('');

  // Live stopwatch counter state updating every 1000ms
  const [liveElapsed, setLiveElapsed] = useState<{
    ticker: string;
    formattedDetailed: string;
    hours: number;
    minutes: number;
    seconds: number;
  }>({
    ticker: '00:00:00',
    formattedDetailed: '0s',
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Keep internal session synced if reservation prop or local storage changes
  useEffect(() => {
    const current = getDiningClockSession(reservation.id) || reservation.diningClockSession || null;
    setSession(current);
  }, [reservation.id, reservation.diningClockSession]);

  // Live Stopwatch Effect: runs every second while clocked in
  useEffect(() => {
    if (!session || session.status !== 'clocked_in' || !session.clockInTime) {
      return;
    }

    const tick = () => {
      const elapsed = calculateLiveElapsed(session.clockInTime);
      setLiveElapsed({
        ticker: elapsed.ticker,
        formattedDetailed: elapsed.formattedDetailed,
        hours: elapsed.hours,
        minutes: elapsed.minutes,
        seconds: elapsed.seconds,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Store start time & update local reservation object
  const handleClockInNow = () => {
    const updated = clockInReservation({
      reservationId: reservation.id,
    });
    // Mutate the local reservation object directly for guaranteed local persistence
    reservation.diningClockSession = updated;
    reservation.clockInTime = updated.clockInDisplayTime;
    setSession(updated);
    if (onUpdateSession) onUpdateSession(updated);
  };

  // Clock Out and calculate total duration
  const handleClockOutNow = () => {
    const updated = clockOutReservation({
      reservationId: reservation.id,
    });
    // Mutate the local reservation object
    reservation.diningClockSession = updated;
    reservation.clockOutTime = updated.clockOutDisplayTime;
    reservation.diningDurationFormatted = updated.durationFormatted;
    reservation.diningDurationMinutes = updated.durationMinutes;
    setSession(updated);
    if (onUpdateSession) onUpdateSession(updated);
  };

  // Submit manual Time In / Time Out entered directly by the customer
  const handleSaveManualTimes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTimeIn) return;

    // First ensure clocked in with custom manual Time In
    const clockInUpdated = clockInReservation({
      reservationId: reservation.id,
      customTime: manualTimeIn,
    });

    let finalSession = clockInUpdated;

    // If customer also entered manual Time Out, clock out immediately
    if (manualTimeOut) {
      finalSession = clockOutReservation({
        reservationId: reservation.id,
        customTime: manualTimeOut,
      });
    }

    // Mutate local reservation object
    reservation.diningClockSession = finalSession;
    reservation.clockInTime = finalSession.clockInDisplayTime;
    reservation.clockOutTime = finalSession.clockOutDisplayTime;
    reservation.diningDurationFormatted = finalSession.durationFormatted;
    reservation.diningDurationMinutes = finalSession.durationMinutes;

    setSession(finalSession);
    setShowManualInputs(false);
    if (onUpdateSession) onUpdateSession(finalSession);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Reset dining timer for this reservation?')) {
      clearDiningClockSession(reservation.id);
      reservation.diningClockSession = undefined;
      reservation.clockInTime = undefined;
      reservation.clockOutTime = undefined;
      reservation.diningDurationFormatted = undefined;
      reservation.diningDurationMinutes = undefined;
      setSession(null);
      if (onUpdateSession) onUpdateSession(null);
    }
  };

  // ----------------------------------------------------
  // Render: COMPACT PILL VARIANT
  // ----------------------------------------------------
  if (variant === 'compact') {
    if (session?.status === 'clocked_in') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs ${className}`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="font-mono font-bold">{liveElapsed.ticker}</span>
          <button
            type="button"
            onClick={() => handleClockOutNow()}
            className="text-[10px] font-bold uppercase text-rose-700 hover:text-rose-900 underline cursor-pointer"
          >
            Clock Out
          </button>
        </div>
      );
    }

    if (session?.status === 'clocked_out') {
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-[#2C3333] text-xs ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-bold text-emerald-900">{session.durationFormatted}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleClockInNow}
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all cursor-pointer ${className}`}
      >
        <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
        <span>Clock In</span>
      </button>
    );
  }

  // ----------------------------------------------------
  // Render: FULL DINING TIMER CARD VARIANT
  // ----------------------------------------------------
  return (
    <>
      <div 
        id={`dining-timer-component-${reservation.id}`}
        className={`rounded-2xl border transition-all overflow-hidden ${
          session?.status === 'clocked_in'
            ? 'bg-gradient-to-br from-emerald-50/95 via-white to-emerald-50/40 border-emerald-300 shadow-sm'
            : session?.status === 'clocked_out'
            ? 'bg-white border-[#E8E6E1] shadow-2xs'
            : 'bg-[#FAF9F6] border-[#E8E6E1]'
        } ${className}`}
      >
        <div className="p-4 sm:p-4.5 space-y-3">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                session?.status === 'clocked_in'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : session?.status === 'clocked_out'
                  ? 'bg-[#4F6F521A] text-[#4F6F52]'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                <TimerIcon className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-serif text-[#2C3333]">
                  Dining Timer
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border bg-white border-[#E8E6E1] text-[#4F6F52]">
                  Table {reservation.tableNumber}
                </span>
              </div>
            </div>

            {/* Status Badge */}
            {session?.status === 'clocked_in' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span>Stopwatch Running</span>
              </span>
            ) : session?.status === 'clocked_out' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Dining Completed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
                <span>Ready to Clock In</span>
              </span>
            )}
          </div>

          {/* ---------------- STATE 1: CLOCKED IN (LIVE STOPWATCH) ---------------- */}
          {session?.status === 'clocked_in' && (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 block">
                    Live Dining Stopwatch
                  </span>
                  
                  {/* Digital Live Monospace Clock Ticking Every Second */}
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-900 tracking-wider">
                      {liveElapsed.ticker}
                    </span>
                    <span className="text-xs font-medium text-emerald-700">
                      ({liveElapsed.formattedDetailed})
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-600 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Time In (Start): <strong className="text-stone-900 font-semibold">{session.clockInDisplayTime}</strong></span>
                  </p>
                </div>

                {/* Clock Out Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClockOutNow}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title="Stop timer and clock out now"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Clock Out</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('clock_out');
                      setModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Enter custom time out"
                  >
                    <span>Enter Time Out...</span>
                  </button>
                </div>
              </div>

              {/* Adjust / Edit start time */}
              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                <span>Timer updating live every second.</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('clock_in');
                    setModalOpen(true);
                  }}
                  className="font-medium text-[#4F6F52] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Adjust Time In</span>
                </button>
              </div>
            </div>
          )}

          {/* ---------------- STATE 2: CLOCKED OUT (COMPLETED TOTAL DURATION) ---------------- */}
          {session?.status === 'clocked_out' && (
            <div className="space-y-2.5 pt-1">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 block">
                    Total Dining Duration
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold font-serif text-emerald-950">
                      {session.durationFormatted}
                    </span>
                    {session.durationMinutes && session.durationMinutes > 0 && (
                      <span className="text-xs text-stone-500">
                        ({session.durationMinutes} minutes total)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-stone-600 pt-0.5">
                    <span>Time In: <strong>{session.clockInDisplayTime}</strong></span>
                    <span>→</span>
                    <span>Time Out: <strong>{session.clockOutDisplayTime}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('clock_out');
                      setModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-[#2C3333] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3 h-3 text-[#4F6F52]" />
                    <span>Edit Times</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                    title="Reset timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- STATE 3: NOT CLOCKED IN YET ---------------- */}
          {!session && (
            <div className="space-y-3 pt-1">
              {!showManualInputs ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="text-[#2C3333] font-medium">
                      Ready to dine? Start your live dining timer upon table seating.
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Enter your own Time In & Time Out or click Clock In now.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 1-click Clock In Now */}
                    <button
                      type="button"
                      onClick={handleClockInNow}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Clock in right now"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-white" />
                      <span>Clock In Now</span>
                    </button>

                    {/* Manual Customer Time Entry Button */}
                    <button
                      type="button"
                      onClick={() => setShowManualInputs(true)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-[#E8E6E1] text-[#2C3333] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Enter Time In and Out manually"
                    >
                      <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
                      <span>Enter Time In / Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Customer Direct Manual Time In / Time Out Form */
                <form onSubmit={handleSaveManualTimes} className="p-3.5 bg-white border border-[#E8E6E1] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C3333] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
                      <span>Enter Time In & Time Out</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManualInputs(false)}
                      className="text-[11px] text-stone-500 hover:text-stone-800"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                        Time In (Arrival) *
                      </label>
                      <input
                        type="time"
                        required
                        value={manualTimeIn}
                        onChange={(e) => setManualTimeIn(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E8E6E1] bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F6F52] font-mono text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                        Time Out (Optional / Leave blank if dining)
                      </label>
                      <input
                        type="time"
                        value={manualTimeOut}
                        onChange={(e) => setManualTimeOut(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E8E6E1] bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F6F52] font-mono text-sm font-semibold"
                        placeholder="Leave blank to run stopwatch"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualInputs(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Save Timer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Modal for Extended Time In / Time Out Presets */}
      {modalOpen && (
        <DiningClockModal
          isOpen={modalOpen}
          reservation={reservation}
          initialMode={modalMode}
          onClose={() => setModalOpen(false)}
          onSessionUpdated={(updated) => {
            reservation.diningClockSession = updated;
            reservation.clockInTime = updated.clockInDisplayTime;
            reservation.clockOutTime = updated.clockOutDisplayTime;
            reservation.diningDurationFormatted = updated.durationFormatted;
            reservation.diningDurationMinutes = updated.durationMinutes;
            setSession(updated);
            if (onUpdateSession) onUpdateSession(updated);
          }}
        />
      )}
    </>
  );
};

// Also export as DiningTimerCard for full backwards compatibility
export const DiningTimerCard = DiningTimer;
export default DiningTimer;
