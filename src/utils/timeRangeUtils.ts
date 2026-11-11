/**
 * Time In & Time Out Reservation Utilities
 * Handles customer-defined reservation time ranges, duration calculation,
 * operating hours validation, and table conflict detection.
 */

import { Reservation, Table, TableState } from '../types';
import { parseOperatingWindows } from './operatingHours';

/**
 * Converts a 12-hour or 24-hour time string into total minutes from midnight (0 - 1439).
 * Handles formats like "7:30 PM", "07:30 PM", "19:30", "12:00 AM", "12:15 PM".
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.replace(/IST/i, '').trim();

  // Check 12-hour with AM/PM
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }

  // Check 24-hour "HH:MM"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  // Fallback splitting
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    const [rawTime, modifier] = parts;
    const [rawH, rawM] = rawTime.split(':').map(Number);
    let h = isNaN(rawH) ? 0 : rawH;
    const m = isNaN(rawM) ? 0 : rawM;
    const mod = modifier.toUpperCase();
    if (mod === 'PM' && h < 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  return 0;
}

/**
 * Converts minutes from midnight (0 - 1439) into formatted 12-hour string (e.g. "7:30 PM").
 */
export function minutesTo12Hour(totalMinutes: number, padHour: boolean = false): string {
  // Normalize within 24 hours
  let mins = Math.floor(totalMinutes) % 1440;
  if (mins < 0) mins += 1440;

  const hours24 = Math.floor(mins / 60);
  const minutes = mins % 60;
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  const hourStr = padHour ? String(hours12).padStart(2, '0') : String(hours12);
  const minStr = String(minutes).padStart(2, '0');

  return `${hourStr}:${minStr} ${meridiem}`;
}

/**
 * Formats a duration in minutes into clean human-readable text.
 * e.g., 105 -> "1 hr 45 min", 120 -> "2 hrs", 45 -> "45 min", 60 -> "1 hr".
 */
export function formatDuration(durationMinutes: number): string {
  if (durationMinutes <= 0) return '0 min';
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }
  if (mins === 0) {
    return hours === 1 ? '1 hr' : `${hours} hrs`;
  }
  return `${hours} hr ${mins} min`;
}

/**
 * Calculates reservation duration between Time In and Time Out.
 */
export function calculateReservationDuration(
  timeIn: string,
  timeOut: string
): {
  durationMinutes: number;
  durationFormatted: string;
  isValid: boolean;
  error?: string;
} {
  if (!timeIn || !timeOut) {
    return {
      durationMinutes: 0,
      durationFormatted: '',
      isValid: false,
      error: 'Please specify both Time In and Time Out.',
    };
  }

  const startMinutes = parseTimeToMinutes(timeIn);
  const endMinutes = parseTimeToMinutes(timeOut);

  if (endMinutes <= startMinutes) {
    return {
      durationMinutes: 0,
      durationFormatted: '',
      isValid: false,
      error: 'Time Out must be later than Time In.',
    };
  }

  const durationMinutes = endMinutes - startMinutes;
  const durationFormatted = formatDuration(durationMinutes);

  return {
    durationMinutes,
    durationFormatted,
    isValid: true,
  };
}

/**
 * Normalizes date string to YYYY-MM-DD.
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

/**
 * Validates Time In and Time Out against a restaurant's opening hours.
 * Ensures:
 * 1. Time In is not earlier than the restaurant's opening time.
 * 2. Time Out is later than Time In.
 * 3. The requested time range is within operating hours (does not extend past closing).
 */
export function validateReservationTimeRange(
  timeIn: string,
  timeOut: string,
  openingHoursStr: string
): {
  isValid: boolean;
  error?: string;
  openingTimeStr?: string;
  closingTimeStr?: string;
} {
  const durationCheck = calculateReservationDuration(timeIn, timeOut);
  if (!durationCheck.isValid) {
    return {
      isValid: false,
      error: durationCheck.error || 'Time Out must be later than Time In.',
    };
  }

  if (!openingHoursStr) {
    return { isValid: true };
  }

  const windows = parseOperatingWindows(openingHoursStr);
  if (windows.length === 0) {
    return { isValid: true };
  }

  const startMinutes = parseTimeToMinutes(timeIn);
  const endMinutes = parseTimeToMinutes(timeOut);

  // Determine earliest opening and latest closing
  let earliestOpen = windows[0].startMinutes;
  let latestClose = windows[windows.length - 1].endMinutes;

  windows.forEach((w) => {
    if (w.startMinutes < earliestOpen) earliestOpen = w.startMinutes;
    if (w.endMinutes > latestClose) latestClose = w.endMinutes;
  });

  const openingTimeStr = minutesTo12Hour(earliestOpen);
  const closingTimeStr = minutesTo12Hour(latestClose);

  // Check 1: Time In cannot be earlier than the restaurant's opening time
  if (startMinutes < earliestOpen) {
    return {
      isValid: false,
      error: `Time In (${timeIn}) cannot be earlier than the restaurant's opening time (${openingTimeStr}).`,
      openingTimeStr,
      closingTimeStr,
    };
  }

  // Check 2: Check if requested range falls cleanly inside at least one operating window
  // (accounting for split shifts like Lunch 12:30-3:30 and Dinner 7:00-11:30)
  const isInsideAWindow = windows.some((win) => {
    if (win.startMinutes <= win.endMinutes) {
      return startMinutes >= win.startMinutes && endMinutes <= win.endMinutes;
    }
    // Overnight window spanning midnight
    return (
      (startMinutes >= win.startMinutes || startMinutes <= win.endMinutes) &&
      (endMinutes >= win.startMinutes || endMinutes <= win.endMinutes)
    );
  });

  if (!isInsideAWindow) {
    // If it exceeds the latest closing time
    if (endMinutes > latestClose) {
      return {
        isValid: false,
        error: `Time Out (${timeOut}) exceeds the restaurant's closing time (${closingTimeStr}).`,
        openingTimeStr,
        closingTimeStr,
      };
    }

    // Between shifts in split-shift restaurants
    return {
      isValid: false,
      error: `Requested reservation (${timeIn} → ${timeOut}) falls outside restaurant operational hours (${openingHoursStr.replace(/IST/g, '').trim()}).`,
      openingTimeStr,
      closingTimeStr,
    };
  }

  return {
    isValid: true,
    openingTimeStr,
    closingTimeStr,
  };
}

/**
 * Extracts start and end minutes for any existing reservation.
 */
export function getReservationTimeWindow(reservation: Reservation): {
  startMinutes: number;
  endMinutes: number;
  timeIn: string;
  timeOut: string;
  durationFormatted: string;
} {
  // If reservation explicitly has timeIn and timeOut
  if (reservation.timeIn && reservation.timeOut) {
    const start = parseTimeToMinutes(reservation.timeIn);
    const end = parseTimeToMinutes(reservation.timeOut);
    const dur = end > start ? end - start : 120;
    return {
      startMinutes: start,
      endMinutes: end,
      timeIn: reservation.timeIn,
      timeOut: reservation.timeOut,
      durationFormatted: reservation.durationFormatted || formatDuration(dur),
    };
  }

  // If reservation timeSlot is a range e.g. "7:30 PM - 9:15 PM" or "07:30 PM → 09:15 PM"
  const rawTime = reservation.timeSlot || '';
  const rangeMatch = rawTime.split(/[-→–—]/).map((s) => s.trim());
  if (rangeMatch.length === 2 && rangeMatch[0] && rangeMatch[1]) {
    const start = parseTimeToMinutes(rangeMatch[0]);
    const end = parseTimeToMinutes(rangeMatch[1]);
    if (end > start) {
      return {
        startMinutes: start,
        endMinutes: end,
        timeIn: rangeMatch[0],
        timeOut: rangeMatch[1],
        durationFormatted: formatDuration(end - start),
      };
    }
  }

  // Fallback: single slot e.g. "08:00 PM"
  const start = parseTimeToMinutes(rawTime || '08:00 PM');
  const durMinutes = reservation.durationMinutes || (reservation.foodOrder?.items?.length ? 90 : 120);
  const end = start + durMinutes;
  const timeIn = minutesTo12Hour(start);
  const timeOut = minutesTo12Hour(end);

  return {
    startMinutes: start,
    endMinutes: end,
    timeIn,
    timeOut,
    durationFormatted: reservation.durationFormatted || formatDuration(durMinutes),
  };
}

/**
 * Checks whether a specific table is available for the entire Time In -> Time Out period.
 * Prevents overlapping reservations for the same table.
 */
export function isTableAvailableForTimeRange(
  tableId: string,
  tableNumber: string,
  date: string,
  timeIn: string,
  timeOut: string,
  reservations: Reservation[] = [],
  excludeReservationId?: string
): {
  isAvailable: boolean;
  conflictingReservation?: Reservation;
  conflictReason?: string;
} {
  const reqStart = parseTimeToMinutes(timeIn);
  const reqEnd = parseTimeToMinutes(timeOut);

  if (reqEnd <= reqStart) {
    return {
      isAvailable: false,
      conflictReason: 'Time Out must be later than Time In.',
    };
  }

  const normTargetDate = normalizeDate(date);

  for (const res of reservations) {
    if (excludeReservationId && res.id === excludeReservationId) {
      continue;
    }

    // Match table by ID or tableNumber
    const tableMatches =
      res.tableId === tableId ||
      (Boolean(res.tableNumber) &&
        res.tableNumber.trim().toLowerCase() === tableNumber.trim().toLowerCase());

    if (!tableMatches) continue;

    // Match date
    const resNormDate = normalizeDate(res.date);
    if (resNormDate !== normTargetDate && res.date !== date) continue;

    // Only active reservations block the table
    if (!['confirmed', 'seated', 'arrived', 'checked-in'].includes(res.status)) {
      continue;
    }

    // Check time overlap: reqStart < resEnd AND resStart < reqEnd
    const existingWindow = getReservationTimeWindow(res);
    const hasOverlap = reqStart < existingWindow.endMinutes && existingWindow.startMinutes < reqEnd;

    if (hasOverlap) {
      return {
        isAvailable: false,
        conflictingReservation: res,
        conflictReason: `Table ${tableNumber} is already reserved from ${existingWindow.timeIn} to ${existingWindow.timeOut} on this date.`,
      };
    }
  }

  return { isAvailable: true };
}

/**
 * Computes table status ('available' | 'reserved' | 'unavailable') for the requested
 * Time In → Time Out range.
 */
export function getTableStateForRange(
  table: Table,
  restaurantId: string,
  date: string,
  timeIn: string,
  timeOut: string,
  reservations: Reservation[] = []
): TableState {
  // Check inherent table status
  if ((table as unknown as { status?: string }).status === 'unavailable') {
    return 'unavailable';
  }

  const check = isTableAvailableForTimeRange(
    table.id,
    table.tableNumber,
    date,
    timeIn,
    timeOut,
    reservations.filter((r) => r.restaurantId === restaurantId)
  );

  return check.isAvailable ? 'available' : 'reserved';
}

/**
 * Formats a reservation time range label for customer and restaurant displays.
 * e.g. "Table 5 — 7:30 PM → 9:15 PM — Reserved"
 */
export function formatReservationTimeRange(
  tableNumber: string,
  timeIn: string,
  timeOut: string,
  status: string = 'Reserved'
): string {
  const statusLabel =
    status.toLowerCase() === 'confirmed'
      ? 'Reserved'
      : status.charAt(0).toUpperCase() + status.slice(1);

  return `Table ${tableNumber} — ${timeIn} → ${timeOut} — ${statusLabel}`;
}

/**
 * Parses raw stored reservation time string (single slot or range) into Time In, Time Out, and duration.
 */
export function parseStoredReservationTime(rawTime: string): {
  timeIn: string;
  timeOut: string;
  durationFormatted: string;
  durationMinutes: number;
} {
  const clean = (rawTime || '').replace(/IST/i, '').trim();
  const rangeMatch = clean.split(/[-→–—]/).map((s) => s.trim());

  if (rangeMatch.length >= 2 && rangeMatch[0] && rangeMatch[1]) {
    const start = parseTimeToMinutes(rangeMatch[0]);
    const end = parseTimeToMinutes(rangeMatch[1]);
    const diff = end > start ? end - start : 105;
    return {
      timeIn: rangeMatch[0],
      timeOut: rangeMatch[1],
      durationFormatted: formatDuration(diff),
      durationMinutes: diff,
    };
  }

  // Single time slot fallback
  const start = parseTimeToMinutes(clean || '07:30 PM');
  const dur = 105; // 1 hr 45 min nominal
  return {
    timeIn: clean || '07:30 PM',
    timeOut: minutesTo12Hour(start + dur),
    durationFormatted: formatDuration(dur),
    durationMinutes: dur,
  };
}
