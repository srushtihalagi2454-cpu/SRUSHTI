import { Reservation, DiningClockSession } from '../types';

const STORAGE_PREFIX = 'flashtable_dining_timer_';

/**
 * Formats minutes into human-readable duration (e.g., "1 hr 45 min" or "35 min")
 */
export function formatDurationDisplay(minutes: number): string {
  if (isNaN(minutes) || minutes < 0) return '0 min';
  if (minutes < 1) return '< 1 min';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hrs > 0 && mins > 0) {
    return `${hrs} hr ${mins} min`;
  }
  if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  }
  return `${mins} min`;
}

/**
 * Formats a Date or ISO timestamp into 12-hour Indian Standard Time format (e.g. "07:30 PM")
 */
export function format12HourTime(input: Date | string | number): string {
  try {
    const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
    if (isNaN(d.getTime())) return '';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 is 12 AM
    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const hrStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hrStr}:${minStr} ${ampm}`;
  } catch {
    return '';
  }
}

/**
 * Converts a 24h or 12h time string (e.g. "19:30" or "07:30 PM") and optional base date (YYYY-MM-DD)
 * into a valid Date object.
 */
export function parseTimeToDate(timeString: string, baseDateStr?: string): Date {
  const targetDate = baseDateStr ? new Date(baseDateStr) : new Date();
  const dateObj = isNaN(targetDate.getTime()) ? new Date() : new Date(targetDate);

  if (!timeString) {
    return new Date();
  }

  // Check if it's already an ISO timestamp
  if (timeString.includes('T') && !isNaN(new Date(timeString).getTime())) {
    return new Date(timeString);
  }

  const clean = timeString.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');

  // Remove AM/PM
  const timeOnly = clean.replace(/AM|PM/g, '').trim();
  const parts = timeOnly.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;

  if (isNaN(hours)) hours = 12;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  dateObj.setHours(hours, isNaN(minutes) ? 0 : minutes, 0, 0);
  return dateObj;
}

/**
 * Calculates duration between two timestamps in minutes and formatted string.
 */
export function calculateSessionDuration(
  clockInIso: string,
  clockOutIso: string
): { minutes: number; formatted: string; hours: number; remainingMinutes: number } {
  try {
    const start = new Date(clockInIso).getTime();
    const end = new Date(clockOutIso).getTime();
    if (isNaN(start) || isNaN(end) || end < start) {
      return { minutes: 0, formatted: '0 min', hours: 0, remainingMinutes: 0 };
    }
    const diffMs = Math.max(0, end - start);
    const totalMinutes = Math.round(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return {
      minutes: totalMinutes,
      formatted: formatDurationDisplay(totalMinutes),
      hours,
      remainingMinutes,
    };
  } catch {
    return { minutes: 0, formatted: '0 min', hours: 0, remainingMinutes: 0 };
  }
}

/**
 * Calculates real-time live elapsed duration from a clock-in ISO timestamp.
 */
export function calculateLiveElapsed(
  clockInIso: string,
  nowMs: number = Date.now()
): {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  ticker: string;
  formattedDetailed: string;
} {
  try {
    const startMs = new Date(clockInIso).getTime();
    if (isNaN(startMs)) {
      return {
        totalSeconds: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        ticker: '00:00:00',
        formattedDetailed: '0 sec',
      };
    }

    const elapsedMs = Math.max(0, nowMs - startMs);
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const ticker = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    let formattedDetailed = '';
    if (hours > 0) {
      formattedDetailed = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      formattedDetailed = `${minutes}m ${seconds}s`;
    } else {
      formattedDetailed = `${seconds}s`;
    }

    return {
      totalSeconds,
      hours,
      minutes,
      seconds,
      ticker,
      formattedDetailed,
    };
  } catch {
    return {
      totalSeconds: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      ticker: '00:00:00',
      formattedDetailed: '0 sec',
    };
  }
}

/**
 * Retrieves persisted dining clock session for a reservation from localStorage.
 */
export function getDiningClockSession(reservationId: string): DiningClockSession | null {
  if (!reservationId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${reservationId}`);
    if (raw) {
      return JSON.parse(raw) as DiningClockSession;
    }
  } catch (err) {
    console.warn('Failed to read dining timer session from localStorage:', err);
  }
  return null;
}

/**
 * Saves dining clock session for a reservation to localStorage.
 */
export function saveDiningClockSession(reservationId: string, session: DiningClockSession): void {
  if (!reservationId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${reservationId}`, JSON.stringify(session));
  } catch (err) {
    console.warn('Failed to persist dining timer session to localStorage:', err);
  }
}

/**
 * Removes dining clock session for a reservation.
 */
export function clearDiningClockSession(reservationId: string): void {
  if (!reservationId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${reservationId}`);
  } catch (err) {
    console.warn('Failed to clear dining timer session from localStorage:', err);
  }
}

/**
 * Clocks in customer for a reservation with either current time or desired custom time.
 */
export function clockInReservation(params: {
  reservationId: string;
  customTime?: string;
  customDate?: string;
  notes?: string;
}): DiningClockSession {
  const { reservationId, customTime, customDate, notes } = params;
  const now = new Date();
  const clockInDate = customTime ? parseTimeToDate(customTime, customDate) : now;

  const clockInIso = clockInDate.toISOString();
  const clockInDisplay = format12HourTime(clockInDate);

  const session: DiningClockSession = {
    clockInTime: clockInIso,
    clockInDisplayTime: clockInDisplay,
    status: 'clocked_in',
    notes: notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  saveDiningClockSession(reservationId, session);
  return session;
}

/**
 * Clocks out customer for a reservation with either current time or desired custom time,
 * calculating the total dining duration.
 */
export function clockOutReservation(params: {
  reservationId: string;
  customTime?: string;
  customDate?: string;
  notes?: string;
}): DiningClockSession {
  const { reservationId, customTime, customDate, notes } = params;
  const existing = getDiningClockSession(reservationId);
  const now = new Date();

  let clockInDate: Date;
  if (existing && existing.clockInTime) {
    clockInDate = new Date(existing.clockInTime);
  } else {
    // Default clock-in to 1 hour prior if clocking out directly
    clockInDate = new Date(now.getTime() - 60 * 60 * 1000);
  }

  const clockOutDate = customTime ? parseTimeToDate(customTime, customDate) : now;

  // If clock-out is before clock-in due to custom time input, adjust date
  let adjustedClockOut = clockOutDate;
  if (adjustedClockOut.getTime() < clockInDate.getTime()) {
    adjustedClockOut = new Date(clockInDate.getTime() + 15 * 60 * 1000); // minimum 15 mins
  }

  const clockInIso = clockInDate.toISOString();
  const clockOutIso = adjustedClockOut.toISOString();
  const clockInDisplay = existing?.clockInDisplayTime || format12HourTime(clockInDate);
  const clockOutDisplay = format12HourTime(adjustedClockOut);

  const duration = calculateSessionDuration(clockInIso, clockOutIso);

  const session: DiningClockSession = {
    clockInTime: clockInIso,
    clockInDisplayTime: clockInDisplay,
    clockOutTime: clockOutIso,
    clockOutDisplayTime: clockOutDisplay,
    durationMinutes: duration.minutes,
    durationFormatted: duration.formatted,
    status: 'clocked_out',
    notes: notes?.trim() || existing?.notes,
    updatedAt: new Date().toISOString(),
  };

  saveDiningClockSession(reservationId, session);
  return session;
}

/**
 * Hydrates a Reservation object with stored dining timer session data.
 */
export function hydrateReservationWithDiningTimer(res: Reservation): Reservation {
  if (!res || !res.id) return res;
  const stored = getDiningClockSession(res.id);
  if (!stored) {
    return res;
  }

  return {
    ...res,
    diningClockSession: stored,
    clockInTime: stored.clockInDisplayTime || stored.clockInTime,
    clockOutTime: stored.clockOutDisplayTime || stored.clockOutTime,
    diningDurationFormatted: stored.durationFormatted,
    diningDurationMinutes: stored.durationMinutes,
  };
}
