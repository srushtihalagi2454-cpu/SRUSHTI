import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  Square, 
  Timer, 
  CheckCircle2, 
  Edit3, 
  RotateCcw,
  Sparkles
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

interface DiningTimerCardProps {
  reservation: Reservation;
  onUpdateSession?: (session: DiningClockSession | null) => void;
  className?: string;
  variant?: 'card' | 'compact';
}

export const DiningTimerCard: React.FC<DiningTimerCardProps> = ({
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

  // Live ticker elapsed state
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

  // Sync session if reservation prop changes
  useEffect(() => {
    const stored = getDiningClockSession(reservation.id) || reservation.diningClockSession || null;
    setSession(stored);
  }, [reservation.id, reservation.diningClockSession]);

  // Live ticking counter when clocked in
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

  const handleQuickClockInNow = () => {
    const newSession = clockInReservation({
      reservationId: reservation.id,
    });
    setSession(newSession);
    if (onUpdateSession) onUpdateSession(newSession);
  };

  const handleQuickClockOutNow = () => {
    const newSession = clockOutReservation({
      reservationId: reservation.id,
    });
    setSession(newSession);
    if (onUpdateSession) onUpdateSession(newSession);
  };

  const handleSessionUpdatedFromModal = (updated: DiningClockSession) => {
    setSession(updated);
    if (onUpdateSession) onUpdateSession(updated);
  };

  const handleResetSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Reset dining timer for this reservation?')) {
      clearDiningClockSession(reservation.id);
      setSession(null);
      if (onUpdateSession) onUpdateSession(null);
    }
  };

  // ----------------------------------------------------
  // Render: COMPACT VARIANT (for list pills or tight cards)
  // ----------------------------------------------------
  if (variant === 'compact') {
    if (session?.status === 'clocked_in') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs ${className}`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="font-mono font-bold">{liveElapsed.ticker}</span>
          <span className="text-[10px] text-emerald-700 font-sans">(Clocked in {session.clockInDisplayTime})</span>
          <button
            type="button"
            onClick={() => {
              setModalMode('clock_out');
              setModalOpen(true);
            }}
            className="ml-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 hover:text-rose-900 underline cursor-pointer"
          >
            Clock Out
          </button>
        </div>
      );
    }

    if (session?.status === 'clocked_out') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-100 border border-stone-200 text-[#2C3333] text-xs ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-bold text-emerald-900">{session.durationFormatted}</span>
          <span className="text-[10px] text-stone-500">({session.clockInDisplayTime} - {session.clockOutDisplayTime})</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          setModalMode('clock_in');
          setModalOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-2xs ${className}`}
      >
        <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
        <span>Start Dining Timer</span>
      </button>
    );
  }

  // ----------------------------------------------------
  // Render: FULL CARD VARIANT (Default)
  // ----------------------------------------------------
  return (
    <>
      <div 
        className={`rounded-2xl border transition-all overflow-hidden ${
          session?.status === 'clocked_in'
            ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 border-emerald-300 shadow-sm'
            : session?.status === 'clocked_out'
            ? 'bg-white border-[#E8E6E1] shadow-2xs'
            : 'bg-[#FAF9F6] border-[#E8E6E1]'
        } ${className}`}
        id={`dining-timer-card-${reservation.id}`}
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
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-serif text-[#2C3333]">
                    Dining Session Timer
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border bg-white border-[#E8E6E1] text-[#4F6F52]">
                    Table {reservation.tableNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Pill Badge */}
            {session?.status === 'clocked_in' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span>Active Dining</span>
              </span>
            ) : session?.status === 'clocked_out' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Completed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
                <span>Not Clocked In</span>
              </span>
            )}
          </div>

          {/* ---------------- STATE 1: CLOCKED IN (LIVE TIMER RUNNING) ---------------- */}
          {session?.status === 'clocked_in' && (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 block">
                    Live Dining Duration
                  </span>
                  {/* Digital Clock Face Ticker */}
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-900 tracking-wider">
                      {liveElapsed.ticker}
                    </span>
                    <span className="text-xs font-medium text-emerald-700">
                      ({liveElapsed.formattedDetailed})
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>Clocked in at <strong className="text-stone-800">{session.clockInDisplayTime}</strong></span>
                  </p>
                </div>

                {/* Clock Out Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickClockOutNow}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title="Finish dining right now"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Clock Out Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('clock_out');
                      setModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Choose a specific past or future clock-out time"
                  >
                    <span>Custom Time...</span>
                  </button>
                </div>
              </div>

              {/* Edit clock in time link */}
              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                <span>Dine comfortably — timer runs live until clock out.</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('clock_in');
                    setModalOpen(true);
                  }}
                  className="font-medium text-[#4F6F52] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Clock-In Time</span>
                </button>
              </div>
            </div>
          )}

          {/* ---------------- STATE 2: CLOCKED OUT (COMPLETED SUMMARY) ---------------- */}
          {session?.status === 'clocked_out' && (
            <div className="space-y-2.5 pt-1">
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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
                        ({session.durationMinutes} mins total)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-600 pt-0.5">
                    <span>In: <strong>{session.clockInDisplayTime}</strong></span>
                    <span>•</span>
                    <span>Out: <strong>{session.clockOutDisplayTime}</strong></span>
                    {session.notes && (
                      <>
                        <span>•</span>
                        <span className="italic text-stone-500">"{session.notes}"</span>
                      </>
                    )}
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
                    <Edit3 className="w-3 h-3 text-[#4F6F52]" />
                    <span>Adjust Times</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSession}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
              <div>
                <p className="text-[#2C3333] font-medium">
                  Track your dining experience at Table {reservation.tableNumber}.
                </p>
                <p className="text-[11px] text-stone-500">
                  Clock in upon seating or select any desired arrival time.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 1-click Clock In Now */}
                <button
                  type="button"
                  onClick={handleQuickClockInNow}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Clock in with current time"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-white" />
                  <span>Clock In Now</span>
                </button>

                {/* Custom Time Selector */}
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('clock_in');
                    setModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-[#E8E6E1] text-[#2C3333] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Pick any specific desired time to clock in"
                >
                  <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
                  <span>Select Time...</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Time Selector Modal */}
      {modalOpen && (
        <DiningClockModal
          isOpen={modalOpen}
          reservation={reservation}
          initialMode={modalMode}
          onClose={() => setModalOpen(false)}
          onSessionUpdated={handleSessionUpdatedFromModal}
        />
      )}
    </>
  );
};

export const DiningTimer = DiningTimerCard;
export default DiningTimerCard;
