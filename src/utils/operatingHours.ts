/**
 * Operating Hours Validation Utility for FlashTable
 * Validates whether reservation time slots fall within a restaurant's operating windows.
 */

// Convert 12-hour string (e.g. "08:00 PM", "12:30 PM", "07:00 AM") to minutes from midnight
export function parseTimeToMinutes(timeStr: string): number {
  const clean = timeStr.replace(/IST/i, '').trim();
  const parts = clean.split(' ');
  if (parts.length < 2) return 0;

  const [rawTime, modifier] = parts;
  const [rawHours, rawMinutes] = rawTime.split(':').map(Number);
  let hours = rawHours;
  const minutes = isNaN(rawMinutes) ? 0 : rawMinutes;

  if (modifier.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export interface OperationalWindow {
  startMinutes: number;
  endMinutes: number;
  label: string;
}

/**
 * Parses restaurant opening hours string into distinct time windows.
 * E.g. "12:30 PM - 03:30 PM IST, 07:00 PM - 11:30 PM IST"
 */
export function parseOperatingWindows(openingHoursStr: string): OperationalWindow[] {
  if (!openingHoursStr) return [];
  const segments = openingHoursStr.split(',');
  const windows: OperationalWindow[] = [];

  for (const seg of segments) {
    const parts = seg.split('-').map((s) => s.replace(/IST/i, '').trim());
    if (parts.length === 2) {
      const startMinutes = parseTimeToMinutes(parts[0]);
      const endMinutes = parseTimeToMinutes(parts[1]);
      if (startMinutes > 0 || endMinutes > 0) {
        windows.push({
          startMinutes,
          endMinutes,
          label: `${parts[0]} - ${parts[1]}`,
        });
      }
    }
  }

  return windows;
}

/**
 * Checks if a specific time slot is within the restaurant's operational hours.
 */
export function isTimeSlotWithinHours(
  timeSlot: string,
  openingHoursStr: string
): { isValid: boolean; reason?: string } {
  if (!openingHoursStr) return { isValid: true };

  const slotMinutes = parseTimeToMinutes(timeSlot);
  const windows = parseOperatingWindows(openingHoursStr);

  if (windows.length === 0) return { isValid: true };

  // Check if slot falls in any window with a buffer (allows reservation up to 45 mins before closing)
  const isInside = windows.some((win) => {
    // Standard window
    if (win.startMinutes <= win.endMinutes) {
      return slotMinutes >= win.startMinutes && slotMinutes <= win.endMinutes - 30;
    }
    // Overnight window spanning midnight
    return slotMinutes >= win.startMinutes || slotMinutes <= win.endMinutes - 30;
  });

  if (!isInside) {
    return {
      isValid: false,
      reason: `Closed during ${timeSlot}. Operating hours: ${openingHoursStr}`,
    };
  }

  return { isValid: true };
}

export interface OperatingHoursDetails {
  isSplitShift: boolean;
  lunchShift?: string;
  dinnerShift?: string;
  displayHours: string;
}

/**
 * Returns structured operational shifts details
 */
export function getOperatingHoursDetails(openingHoursStr: string): OperatingHoursDetails {
  const clean = (openingHoursStr || '12:00 PM - 11:00 PM IST').replace(/IST/g, '').trim();
  const windows = parseOperatingWindows(clean);

  if (windows.length >= 2) {
    return {
      isSplitShift: true,
      lunchShift: `Lunch: ${windows[0].label}`,
      dinnerShift: `Dinner: ${windows[1].label}`,
      displayHours: `${windows[0].label} & ${windows[1].label} IST`,
    };
  }

  return {
    isSplitShift: false,
    displayHours: `${clean} IST`,
  };
}

/**
 * Returns formatted operational hours display string directly usable in React JSX
 */
export function getFormattedOperatingHours(openingHoursStr: string): string {
  const details = getOperatingHoursDetails(openingHoursStr);
  return details.displayHours;
}
