import React from 'react';
import { Clock } from 'lucide-react';
import { Reservation } from '../types';
import { useReservationTimer } from '../utils/reservationTimer';

export interface ReservationTimerBadgeProps {
  reservation?: Partial<Reservation> | null;
  variant?: 'pill' | 'inline' | 'card';
  className?: string;
  hideIfEnded?: boolean;
}

export const ReservationTimerBadge: React.FC<ReservationTimerBadgeProps> = ({
  reservation,
  variant = 'pill',
  className = '',
  hideIfEnded = false,
}) => {
  const timer = useReservationTimer(reservation);

  if (!timer.isValid || !timer.displayText) {
    return null;
  }

  if (hideIfEnded && timer.status === 'ended') {
    return null;
  }

  if (timer.status === 'cancelled') {
    return null;
  }

  // Inline styling for compact integration inside metadata blocks
  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
          timer.status === 'active'
            ? 'text-emerald-700 font-semibold'
            : timer.status === 'upcoming'
            ? 'text-[#4F6F52] font-semibold'
            : 'text-[#2C3333]/60'
        } ${className}`}
        title={`Live reservation timer: ${timer.displayText}`}
      >
        <Clock
          className={`w-3 h-3 shrink-0 ${
            timer.status === 'active'
              ? 'text-emerald-600'
              : timer.status === 'upcoming'
              ? 'text-[#4F6F52]'
              : 'text-[#2C3333]/40'
          }`}
        />
        <span>{timer.displayText}</span>
      </span>
    );
  }

  // Card callout for prominent section
  if (variant === 'card') {
    return (
      <div
        className={`p-3 rounded-2xl flex items-center justify-between gap-3 text-xs border ${
          timer.status === 'active'
            ? 'bg-emerald-50/90 border-emerald-200/90 text-emerald-900'
            : timer.status === 'upcoming'
            ? 'bg-[#4F6F5214] border-[#4F6F52]/20 text-[#2C3333]'
            : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2C3333]/70'
        } ${className}`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              timer.status === 'active'
                ? 'bg-emerald-200/80 text-emerald-800'
                : timer.status === 'upcoming'
                ? 'bg-[#4F6F521A] text-[#4F6F52]'
                : 'bg-stone-200/60 text-stone-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 block">
              Reservation Timer
            </span>
            <p className="font-semibold">{timer.displayText}</p>
          </div>
        </div>
      </div>
    );
  }

  // Default 'pill' variant: matches FlashTable status pill badges
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all shadow-2xs ${
        timer.status === 'active'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
          : timer.status === 'upcoming'
          ? 'bg-[#4F6F5214] text-[#4F6F52] border border-[#4F6F52]/20'
          : 'bg-[#FAF9F6] text-[#2C3333]/60 border border-[#E8E6E1]'
      } ${className}`}
      title={`Live reservation timer: ${timer.displayText}`}
    >
      <Clock
        className={`w-3 h-3 shrink-0 ${
          timer.status === 'active'
            ? 'text-emerald-700 animate-pulse'
            : timer.status === 'upcoming'
            ? 'text-[#4F6F52]'
            : 'text-[#2C3333]/50'
        }`}
      />
      <span>{timer.displayText}</span>
    </span>
  );
};
