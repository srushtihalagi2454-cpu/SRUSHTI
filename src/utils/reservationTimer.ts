import { useState, useEffect, useMemo } from 'react';
import { Reservation } from '../types';

/**
 * FlashTable Service Parameter for Average Dining Duration:
 * 75 minutes (consistent with RestaurantDashboard & InsightsTab rules)
 */
export const DEFAULT_DINING_DURATION_MINUTES = 75;

export type ReservationTimerStatus = 'upcoming' | 'active' | 'ended' | 'cancelled' | 'invalid';

export interface ReservationTimerInfo {
  status: ReservationTimerStatus;
  displayText: string;
  startTime: Date | null;
  endTime: Date | null;
  diffMinutes: number;
  isDuring: boolean;
  isValid: boolean;
}

/**
 * Parses date string into year, month (0-indexed), and day numbers.
 * Supports:
 * - "2026-09-14" / "2026/09/14" (ISO)
 * - "14 September 2026" / "14 Sep 2026"
 * - "September 14, 2026"
 */
export function parseDateParts(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10) - 1,
      day: parseInt(isoMatch[3], 10),
    };
  }

  // Month lookup dictionary (0-indexed)
  const monthNames: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // 2. Day Month Year: e.g. "14 September 2026" or "14 Sep 2026"
  const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const mStr = dmyMatch[2].toLowerCase();
    const month = monthNames[mStr] ?? monthNames[mStr.slice(0, 3)];
    const year = parseInt(dmyMatch[3], 10);
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return { year, month, day };
    }
  }

  // 3. Month Day, Year: e.g. "September 14, 2026"
  const mdyMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdyMatch) {
    const mStr = mdyMatch[1].toLowerCase();
    const month = monthNames[mStr] ?? monthNames[mStr.slice(0, 3)];
    const day = parseInt(mdyMatch[2], 10);
    const year = parseInt(mdyMatch[3], 10);
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return { year, month, day };
    }
  }

  // Fallback: Date.parse
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth(),
      day: fallback.getDate(),
    };
  }

  return null;
}

/**
 * Parses timeSlot string into hours (0-23) and minutes (0-59).
 * Supports "7:30 PM", "07:30 PM", "01:30 PM", "12:00 PM", "12:00 AM", "19:30"
 */
export function parseTimeSlotParts(timeStr?: string): { hours: number; minutes: number } | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.replace(/IST/i, '').trim();
  if (!clean) return null;

  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);

  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    const singleMatch = clean.match(/(\d{1,2})/);
    if (!singleMatch) return null;
    let hours = parseInt(singleMatch[1], 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return { hours, minutes: 0 };
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/**
 * Formats a duration in minutes into the exact required FlashTable display format:
 * - Before start: "Starts in 1h 24m", "Starts in 45m", "Starts in 2d 5h"
 * - During reservation: "1h 12m remaining", "45m remaining"
 */
export function formatReservationTimeDuration(totalMinutes: number, isDuring: boolean): string {
  const mins = Math.max(0, Math.round(totalMinutes));

  if (isDuring) {
    if (mins >= 1440) {
      const days = Math.floor(mins / 1440);
      const remainingMinutes = mins % 1440;
      const hours = Math.floor(remainingMinutes / 60);
      return hours > 0 ? `${days}d ${hours}h remaining` : `${days}d remaining`;
    }
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMinutes = mins % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m remaining` : `${hours}h remaining`;
    }
    return mins > 0 ? `${mins}m remaining` : '< 1m remaining';
  } else {
    if (mins >= 1440) {
      const days = Math.floor(mins / 1440);
      const remainingMinutes = mins % 1440;
      const hours = Math.floor(remainingMinutes / 60);
      return hours > 0 ? `Starts in ${days}d ${hours}h` : `Starts in ${days}d`;
    }
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMinutes = mins % 60;
      return remainingMinutes > 0 ? `Starts in ${hours}h ${remainingMinutes}m` : `Starts in ${hours}h`;
    }
    return mins > 0 ? `Starts in ${mins}m` : 'Starts in < 1m';
  }
}

/**
 * Calculates start and end Date objects for a reservation using existing data
 * or the application's default dining duration rule (75 mins).
 */
export function getReservationStartAndEndTime(reservation?: Partial<Reservation> | null): {
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number;
} {
  if (!reservation) {
    return { startTime: null, endTime: null, durationMinutes: DEFAULT_DINING_DURATION_MINUTES };
  }

  const dateParts = parseDateParts(reservation.date);
  const timeParts = parseTimeSlotParts(reservation.timeSlot);

  if (!dateParts || !timeParts) {
    return { startTime: null, endTime: null, durationMinutes: DEFAULT_DINING_DURATION_MINUTES };
  }

  // Construct local start time in user's browser timezone
  const startTime = new Date(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    timeParts.hours,
    timeParts.minutes,
    0,
    0
  );

  // Check if explicit duration or end time exists on reservation data
  const customDuration =
    (reservation as unknown as { durationMinutes?: number; duration?: number }).durationMinutes ??
    (reservation as unknown as { duration?: number }).duration;

  const durationMinutes =
    typeof customDuration === 'number' && !isNaN(customDuration) && customDuration > 0
      ? customDuration
      : DEFAULT_DINING_DURATION_MINUTES;

  let endTime: Date;
  const customEndTimeStr = (reservation as unknown as { endTime?: string }).endTime;
  if (customEndTimeStr && typeof customEndTimeStr === 'string') {
    const endParts = parseTimeSlotParts(customEndTimeStr);
    if (endParts) {
      endTime = new Date(
        dateParts.year,
        dateParts.month,
        dateParts.day,
        endParts.hours,
        endParts.minutes,
        0,
        0
      );
      // If end time is earlier than start time (e.g. past midnight), add 1 day
      if (endTime.getTime() < startTime.getTime()) {
        endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    }
  } else {
    endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  }

  return { startTime, endTime, durationMinutes };
}

/**
 * Calculates the dynamic reservation timer state and display text.
 */
export function getReservationTimerInfo(
  reservation?: Partial<Reservation> | null,
  now: Date = new Date()
): ReservationTimerInfo {
  if (!reservation) {
    return {
      status: 'invalid',
      displayText: '',
      startTime: null,
      endTime: null,
      diffMinutes: 0,
      isDuring: false,
      isValid: false,
    };
  }

  if (reservation.status === 'cancelled') {
    return {
      status: 'cancelled',
      displayText: 'Reservation cancelled',
      startTime: null,
      endTime: null,
      diffMinutes: 0,
      isDuring: false,
      isValid: true,
    };
  }

  const { startTime, endTime } = getReservationStartAndEndTime(reservation);

  if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return {
      status: 'invalid',
      displayText: '',
      startTime: null,
      endTime: null,
      diffMinutes: 0,
      isDuring: false,
      isValid: false,
    };
  }

  const nowMs = now.getTime();
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();

  // Completed status check
  if (reservation.status === 'completed') {
    return {
      status: 'ended',
      displayText: 'Reservation ended',
      startTime,
      endTime,
      diffMinutes: 0,
      isDuring: false,
      isValid: true,
    };
  }

  // 1. BEFORE THE RESERVATION STARTS
  if (nowMs < startMs) {
    const diffMs = startMs - nowMs;
    const diffMinutes = diffMs / (60 * 1000);
    return {
      status: 'upcoming',
      displayText: formatReservationTimeDuration(diffMinutes, false),
      startTime,
      endTime,
      diffMinutes,
      isDuring: false,
      isValid: true,
    };
  }

  // 2. DURING THE RESERVATION
  if (nowMs >= startMs && nowMs < endMs) {
    const diffMs = endMs - nowMs;
    const diffMinutes = diffMs / (60 * 1000);
    return {
      status: 'active',
      displayText: formatReservationTimeDuration(diffMinutes, true),
      startTime,
      endTime,
      diffMinutes,
      isDuring: true,
      isValid: true,
    };
  }

  // 3. AFTER THE RESERVATION ENDS
  return {
    status: 'ended',
    displayText: 'Reservation ended',
    startTime,
    endTime,
    diffMinutes: 0,
    isDuring: false,
    isValid: true,
  };
}

/**
 * Custom hook to subscribe to live automatic reservation timer updates.
 * Updates approximately once every minute (using 30s interval to prevent clock drift),
 * and syncs immediately on tab visibility focus.
 */
export function useReservationTimer(
  reservation?: Partial<Reservation> | null,
  refreshIntervalMs: number = 30000
): ReservationTimerInfo {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    // Immediate tick when user switches back to this tab
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setNow(new Date());
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const timer = setInterval(() => {
      setNow(new Date());
    }, refreshIntervalMs);

    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [refreshIntervalMs]);

  return useMemo(() => {
    return getReservationTimerInfo(reservation, now);
  }, [reservation, now]);
}
