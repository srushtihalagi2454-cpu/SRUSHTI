import { Restaurant, Table, Reservation, MockCustomer, TableState } from '../types';
import { 
  EXPANDED_RESTAURANTS_DATA, 
  BENGALURU_LOCATIONS, 
  EXPLORE_CUISINES 
} from './restaurantsData';
import { SAMPLE_TABLES_DAAWAT } from './tableLayouts';

// Re-export floor plan tables from dedicated layout module
export { SAMPLE_TABLES_DAAWAT };

// Curated realistic Bengaluru restaurants (exactly 10 restaurants)
export const RESTAURANTS_DATA: Restaurant[] = EXPANDED_RESTAURANTS_DATA;

// Demo customer unique authenticated user ID from Apps Script backend
export const DEMO_USER_ID = 'USR-1788787060247';
export const PREV_DEMO_USER_ID = 'USR-1788786198634';
export const LEGACY_DEMO_USER_ID = 'cust-demo-1';

export function isDemoUserId(userId?: string): boolean {
  if (!userId) return false;
  return userId === DEMO_USER_ID || userId === PREV_DEMO_USER_ID || userId === LEGACY_DEMO_USER_ID;
}

export function isReservationForCustomer(res: Reservation, customerUserId?: string): boolean {
  if (!customerUserId || !res || !res.userId) return false;
  return res.userId.trim().toLowerCase() === customerUserId.trim().toLowerCase();
}

import { INITIAL_TRAVEL_RESERVATIONS } from './seedTravelReservations';

// Reservations loaded persistently with seed travel reservations
export const INITIAL_RESERVATIONS: Reservation[] = INITIAL_TRAVEL_RESERVATIONS;

export const TIME_SLOTS: string[] = [
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
  '09:00 PM',
  '09:30 PM',
  '10:00 PM',
];

export { BENGALURU_LOCATIONS, EXPLORE_CUISINES };

export const NEIGHBORHOODS = BENGALURU_LOCATIONS;

export const CUISINES = EXPLORE_CUISINES;

// Date & Time normalization helpers to ensure reliable cross-format matching
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

export function normalizeTime(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    const ampm = match[3].toUpperCase();
    return `${hours}:${minutes} ${ampm}`;
  }
  return trimmed.toUpperCase();
}

/**
 * Converts a time string (e.g. "07:30 PM", "7:30 PM", "19:30", "2 PM") into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
  if (!match) {
    const singleMatch = clean.match(/(\d{1,2})\s*(AM|PM)/);
    if (singleMatch) {
      let h = parseInt(singleMatch[1], 10);
      if (singleMatch[2] === 'PM' && h < 12) h += 12;
      if (singleMatch[2] === 'AM' && h === 12) h = 0;
      return h * 60;
    }
    return 0;
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3];

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

// Helper to determine accurate table state for a given table, date, and time slot or range.
// Tables default to 'available' unless they are genuinely reserved, occupied, or unavailable.
export function getTableState(
  table: Table,
  restaurantId: string,
  date: string,
  timeSlot: string,
  reservations: Reservation[] = [],
  timeOut?: string
): TableState {
  const normDate = normalizeDate(date);

  // 1. Check table explicit slot status if configured on the table model
  if (table.slotStatus) {
    const directSlot = table.slotStatus[`${normDate}_${timeSlot}`] || table.slotStatus[`${date}_${timeSlot}`];
    if (directSlot && directSlot !== 'available') {
      return directSlot === 'selected' ? 'available' : directSlot;
    }
  }

  // 2. Check if table has an explicit inherent status (e.g. maintenance or physically unavailable)
  if ((table as unknown as { status?: string }).status === 'unavailable') {
    return 'unavailable';
  }

  // Determine requested time range in minutes
  let reqStart = 0;
  let reqEnd = 0;
  const isExplicitRange = Boolean(timeOut) || timeSlot.includes(' - ') || timeSlot.includes(' → ');

  if (timeOut) {
    reqStart = parseTimeToMinutes(timeSlot);
    reqEnd = parseTimeToMinutes(timeOut);
  } else if (timeSlot.includes(' - ') || timeSlot.includes(' → ')) {
    const parts = timeSlot.split(/[-→]/).map((s) => s.trim());
    reqStart = parseTimeToMinutes(parts[0]);
    reqEnd = parseTimeToMinutes(parts[1]);
  } else {
    reqStart = parseTimeToMinutes(timeSlot);
    reqEnd = reqStart + 90; // Default nominal window
  }

  // 3. Check existing confirmed or active reservations for this restaurant, table, date, and time window
  const matchingRes = reservations.find((res) => {
    if (res.restaurantId !== restaurantId) return false;

    // Check table match by ID or table number
    const isTableMatch =
      res.tableId === table.id ||
      (Boolean(res.tableNumber) && res.tableNumber.trim().toLowerCase() === table.tableNumber.trim().toLowerCase());
    if (!isTableMatch) return false;

    // Check date match (supports normalized YYYY-MM-DD and human date strings like "14 September 2026")
    const resNormDate = normalizeDate(res.date);
    if (resNormDate !== normDate && res.date !== date) return false;

    // Active reservation states that hold or occupy the table
    if (!['confirmed', 'seated', 'arrived', 'checked-in'].includes(res.status)) return false;

    // Determine existing reservation's time window
    let resStart = 0;
    let resEnd = 0;

    if (res.timeIn && res.timeOut) {
      resStart = parseTimeToMinutes(res.timeIn);
      resEnd = parseTimeToMinutes(res.timeOut);
    } else {
      const resTimeStr = res.timeSlot || (res as unknown as { time?: string }).time || '';
      if (resTimeStr.includes(' - ') || resTimeStr.includes(' → ')) {
        const parts = resTimeStr.split(/[-→]/).map((s) => s.trim());
        resStart = parseTimeToMinutes(parts[0]);
        resEnd = parseTimeToMinutes(parts[1]);
      } else {
        resStart = parseTimeToMinutes(resTimeStr);
        const hasFoodOrder = Boolean(res.foodOrder && res.foodOrder.items && res.foodOrder.items.length > 0);
        const durationMinutes = res.durationMinutes || (hasFoodOrder ? 90 : 120);
        resEnd = resStart + durationMinutes;
      }
    }

    if (isExplicitRange && reqEnd > reqStart) {
      // Full time-range overlap check
      return reqStart < resEnd && resStart < reqEnd;
    } else {
      // Single slot check
      return reqStart >= resStart && reqStart < resEnd;
    }
  });

  if (matchingRes) {
    if (matchingRes.status === 'seated' || matchingRes.status === 'checked-in') {
      return 'occupied';
    }
    return 'reserved';
  }

  // 4. Default: table is available
  return 'available';
}

// Mock Customer Accounts Data Store
export const MOCK_CUSTOMERS: MockCustomer[] = [
  {
    id: 'cust-demo-1',
    fullName: 'Sanketh Sharma',
    email: 'sanketh1226@gmail.com',
    phone: '+91 98450 12260',
    createdAt: '2026-09-01T10:00:00.000Z',
    loyaltyTier: 'Gold Member',
    status: 'active',
  },
];

export function createDemoCustomer(data: {
  fullName: string;
  email: string;
  phone: string;
}): MockCustomer {
  const digitsOnly = data.phone.replace(/\D/g, '');
  const phone10 = digitsOnly.length === 12 && digitsOnly.startsWith('91')
    ? digitsOnly.slice(2)
    : digitsOnly;
  const formattedPhone = phone10.length === 10
    ? `+91 ${phone10.slice(0, 5)} ${phone10.slice(5)}`
    : data.phone.trim();

  const newCustomer: MockCustomer = {
    id: `cust-${Date.now()}`,
    fullName: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: formattedPhone,
    createdAt: new Date().toISOString(),
    loyaltyTier: 'Silver Member',
    status: 'active',
  };

  MOCK_CUSTOMERS.unshift(newCustomer);
  return newCustomer;
}
