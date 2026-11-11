/**
 * FlashTable India Standard Time (IST) Date & Time Formatting Utilities
 * Standardized on Asia/Kolkata (UTC+05:30) with 'en-IN' locale formatting.
 * Strictly prevents accidental Japanese locale text (e.g. 日本標準時)
 * or historical Google Sheets epoch artifacts (e.g. Sat Dec 30 1899 GMT+0521).
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Normalizes any time slot value into a clean 12-hour format string (e.g. "07:30 PM" or "8:00 PM").
 * Strips out historical epoch dates (1899), GMT offsets, or locale suffixes.
 */
export function cleanTimeString(timeStr?: string | null): string {
  if (!timeStr) return '07:30 PM';
  const str = String(timeStr).trim();

  // If already clean standard 12-hour format (e.g. "07:30 PM", "7:30 PM", "8:00 AM")
  const standard12Hr = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (standard12Hr) {
    const hours = parseInt(standard12Hr[1], 10);
    const mins = standard12Hr[2];
    const ampm = standard12Hr[3].toUpperCase();
    return `${hours}:${mins} ${ampm}`;
  }

  // If standard 24-hour format (e.g. "19:30", "20:00")
  const standard24Hr = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (standard24Hr) {
    let hours = parseInt(standard24Hr[1], 10);
    const mins = standard24Hr[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mins} ${ampm}`;
  }

  // Handle Google Sheets Date object string representation, e.g.:
  // "Sat Dec 30 1899 20:00:00 GMT+0521 (日本標準時)"
  // Extract the time portion directly: (\d{1,2}):(\d{2}):(\d{2})
  const timePortionMatch = str.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (timePortionMatch) {
    let hours = parseInt(timePortionMatch[1], 10);
    const mins = timePortionMatch[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mins} ${ampm}`;
  }

  // Fallback: Attempt Date parsing
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return formatTimeIST(d, { includeIST: false });
    }
  } catch {
    // ignore
  }

  return str;
}

/**
 * Normalizes any date value into clean display format (e.g. "Thu, Sep 10, 2026" or "14 Sep 2026").
 * Safeguards against 1899 Google Sheets epoch dates.
 */
export function cleanDateString(dateStr?: string | null): string {
  if (!dateStr) return 'Today';
  const str = String(dateStr).trim();

  // Guard against 1899 epoch artifacts
  if (str.includes('1899')) {
    // Current date in IST
    return formatDateIST(new Date());
  }

  // If already clean date like "14 September 2026" or "10 Sep 2026"
  if (/^\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?$/.test(str)) {
    return str;
  }

  // If ISO date like "2026-09-14"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    try {
      const parts = str.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
      return formatDateIST(dt);
    } catch {
      return str;
    }
  }

  // Attempt parsing as Date
  try {
    const cleaned = str.replace(/\s*\([^)]*\)/g, '').trim();
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1950) {
      return formatDateIST(parsed);
    }
  } catch {
    // ignore
  }

  return str;
}

/**
 * Formats a Date, ISO string, or timestamp into an IST time string (e.g. "7:00 PM IST" or "4:04 PM IST").
 */
export function formatTimeIST(
  dateOrTimestamp?: string | Date | number | null,
  options?: { includeSeconds?: boolean; includeIST?: boolean }
): string {
  if (!dateOrTimestamp) return '7:00 PM IST';
  const includeSeconds = options?.includeSeconds ?? false;
  const includeIST = options?.includeIST ?? true;

  try {
    let dateObj: Date;
    if (dateOrTimestamp instanceof Date) {
      dateObj = dateOrTimestamp;
    } else if (typeof dateOrTimestamp === 'number') {
      dateObj = new Date(dateOrTimestamp);
    } else {
      const str = String(dateOrTimestamp).trim();
      // If it is already a time-only string like "07:30 PM", clean and return
      if (/^\d{1,2}:\d{2}(?:\s*(?:AM|PM))?$/i.test(str)) {
        const cleaned = cleanTimeString(str);
        return includeIST ? `${cleaned} IST` : cleaned;
      }
      dateObj = new Date(str);
    }

    if (isNaN(dateObj.getTime())) {
      const cleaned = cleanTimeString(String(dateOrTimestamp));
      return includeIST ? `${cleaned} IST` : cleaned;
    }

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    });

    const formatted = formatter.format(dateObj);
    return includeIST ? `${formatted} IST` : formatted;
  } catch {
    return '7:00 PM IST';
  }
}

/**
 * Formats a Date or ISO string into an IST date string (e.g. "Thu, Sep 10, 2026").
 */
export function formatDateIST(dateOrTimestamp?: string | Date | number | null): string {
  if (!dateOrTimestamp) return 'Today';

  try {
    const dateObj = dateOrTimestamp instanceof Date 
      ? dateOrTimestamp 
      : new Date(dateOrTimestamp);

    if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1950) {
      return String(dateOrTimestamp);
    }

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return formatter.format(dateObj);
  } catch {
    return String(dateOrTimestamp);
  }
}

/**
 * Formats user-facing reservation date and time together:
 * Example: "Thu, Sep 10 • 7:00 PM IST" or "14 Sep 2026 • 7:30 PM IST"
 */
export function formatReservationDateTime(
  dateStr?: string | null,
  timeStr?: string | null
): string {
  const cleanDate = cleanDateString(dateStr);
  const cleanTime = cleanTimeString(timeStr);
  return `${cleanDate} • ${cleanTime} IST`;
}

/**
 * Formats a last-updated or synced timestamp into:
 * Example: "Updated 4:04 PM IST"
 */
export function formatUpdatedTimeIST(dateOrTimestamp?: string | Date | number | null): string {
  const timeStr = formatTimeIST(dateOrTimestamp || new Date(), { includeSeconds: false, includeIST: true });
  return `Updated ${timeStr}`;
}

/**
 * Formats synced indicator:
 * Example: "Synced 4:04 PM IST"
 */
export function formatSyncedTimeIST(dateOrTimestamp?: string | Date | number | null): string {
  const timeStr = formatTimeIST(dateOrTimestamp || new Date(), { includeSeconds: false, includeIST: true });
  return `Synced ${timeStr}`;
}

/**
 * Safely extracts 24-hour time ("HH:mm") from any time representation, Google Sheets cell string, or Date.
 * Strips Google Sheets epoch artifacts (1899), GMT offsets, and locale strings (e.g. 日本標準時).
 * Never introduces a fake 1899 date or wrong timezone.
 */
export function extract24HourTime(raw?: string | Date | number | null): string {
  if (!raw) return '20:00';

  if (raw instanceof Date) {
    if (isNaN(raw.getTime()) || raw.getFullYear() < 1950) return '20:00';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(raw);
  }

  let str = String(raw).trim();

  // Strip parenthetical text like (日本標準時), GMT offsets, and timezone labels
  str = str
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*GMT[+-]?[\d:]*/gi, '')
    .replace(/\s*IST/gi, '')
    .replace(/Japan Standard Time/gi, '')
    .trim();

  // 1. If 12-hour format with AM/PM (e.g., "8:00 PM", "08:00 PM", "8:00:00 PM")
  const match12 = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = match12[2];
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${mins}`;
  }

  // 2. If 24-hour format (e.g., "20:00", "20:00:00", or embedded in "Sat Dec 30 1899 20:00:00")
  const match24 = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = match24[2];
    if (hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, '0')}:${mins}`;
    }
  }

  // 3. If valid full ISO Date string (not 1899)
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1950) {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: IST_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
    }
  } catch {
    // ignore
  }

  return '20:00';
}

/**
 * Formats table number for the Reservations Pacing card:
 * Preserves or standards table prefix: e.g. "T03" -> "TT03", "03" -> "TT03", "TT03" -> "TT03"
 */
export function formatPacingTableNumber(tableNum?: string | null): string {
  if (!tableNum) return 'TT03';
  const clean = String(tableNum).trim();
  if (clean.includes('-')) return clean;
  if (clean.startsWith('TT')) return clean;
  if (clean.startsWith('T')) return `T${clean}`;
  return `TT${clean.padStart(2, '0')}`;
}

/**
 * Formats a reservation date specifically for the Restaurant Dashboard Reservations Pacing card:
 * Displays: "Sat, 27 Sep" (or whatever the actual reservation date is).
 * Strictly prevents the fake Google Sheets epoch date ("Sat Dec 30 1899").
 * Formatted with explicit 'en-IN' locale and 'Asia/Kolkata' timezone.
 */
export function formatPacingReservationDate(res: { date?: string | null; createdAt?: string | null }): string {
  let rawDate = (res.date || '').trim();

  // Guard against 1899 epoch artifacts or empty dates
  if (!rawDate || rawDate.includes('1899')) {
    if (res.createdAt && !res.createdAt.includes('1899')) {
      rawDate = res.createdAt.trim();
    } else {
      rawDate = new Date().toISOString();
    }
  }

  // If already in clean display format like "Sat, 27 Sep"
  if (/^[A-Za-z]{3},\s+\d{1,2}\s+[A-Za-z]{3}$/i.test(rawDate)) {
    return rawDate.replace(/Sept\b/gi, 'Sep');
  }

  let dateObj: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [y, m, d] = rawDate.split('-').map(Number);
    // Use midday UTC so Asia/Kolkata (+05:30) is unequivocally on the exact same calendar day
    dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  } else {
    // Strip parenthetical text like (日本標準時)
    const cleaned = rawDate.replace(/\s*\([^)]*\)/g, '').trim();
    dateObj = new Date(cleaned);
    if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1950) {
      if (res.createdAt && !res.createdAt.includes('1899')) {
        dateObj = new Date(res.createdAt);
      }
      if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1950) {
        dateObj = new Date();
      }
    }
  }

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return formatter.format(dateObj).replace(/Sept\b/g, 'Sep');
}

/**
 * Formats a reservation time range specifically for the Restaurant Dashboard Reservations Pacing card:
 * Displays in 24-hour format: "20:00 → 21:45" (or single time "20:00" if no range).
 * Never displays GMT offsets, timezone names, or Japanese locale strings.
 */
export function formatPacingReservationTime(res: {
  timeSlot?: string | null;
  timeIn?: string | null;
  timeOut?: string | null;
  durationMinutes?: number | null;
}): string {
  // If timeIn and timeOut are explicitly present
  if (res.timeIn && res.timeOut) {
    const start24 = extract24HourTime(res.timeIn);
    const rawEnd = extract24HourTime(res.timeOut);
    
    // Check if rawEnd is bogus (e.g. 01:45 when start is 20:00 due to 1899 epoch calculation bug)
    const [startH, startM] = start24.split(':').map(Number);
    const [endH, endM] = rawEnd.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (endMins <= startMins) {
      const dur = res.durationMinutes && res.durationMinutes > 0 ? res.durationMinutes : 105;
      const nominalEndMins = (startMins + dur) % 1440;
      const calcH = String(Math.floor(nominalEndMins / 60)).padStart(2, '0');
      const calcM = String(nominalEndMins % 60).padStart(2, '0');
      return `${start24} → ${calcH}:${calcM}`;
    }

    return `${start24} → ${rawEnd}`;
  }

  const rawSlot = (res.timeSlot || '').trim();
  const parts = rawSlot.split(/[-→–—]/).map((s) => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const start24 = extract24HourTime(parts[0]);
    const end24 = extract24HourTime(parts[1]);
    return `${start24} → ${end24}`;
  }

  // Single time slot fallback: compute nominal duration (+105 min)
  const single24 = extract24HourTime(rawSlot || res.timeIn || '20:00');
  const [h, m] = single24.split(':').map(Number);
  const dur = res.durationMinutes && res.durationMinutes > 0 ? res.durationMinutes : 105;
  const nominalEndMins = (h * 60 + m + dur) % 1440;
  const endH = String(Math.floor(nominalEndMins / 60)).padStart(2, '0');
  const endM = String(nominalEndMins % 60).padStart(2, '0');

  return `${single24} → ${endH}:${endM}`;
}
