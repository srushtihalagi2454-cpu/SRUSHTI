import { CancellationRecord, Reservation } from '../types';
import { isReservationForCustomer } from '../data/mockData';

const STORAGE_KEY_PREFIX = 'flashtable_cancellation_records';

/**
 * Retrieves all stored cancellation records from localStorage.
 */
export function getAllCancellationRecords(): CancellationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read cancellation records from localStorage:', err);
    return [];
  }
}

/**
 * Saves a new cancellation record to persistent localStorage.
 */
export function recordCancellationToStorage(record: CancellationRecord): void {
  try {
    const existing = getAllCancellationRecords();
    const filtered = existing.filter((r) => r.reservationId !== record.reservationId);
    filtered.unshift(record);
    localStorage.setItem(STORAGE_KEY_PREFIX, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Failed to save cancellation record to localStorage:', err);
  }
}

/**
 * Computes how many cancellations a customer has completed in the past.
 * Considers both in-memory reservations marked as 'cancelled' and stored cancellation records.
 */
export function getCustomerCancellationCount(
  userId?: string,
  customerPhone?: string,
  reservations?: Reservation[]
): number {
  const normUserId = (userId || '').trim().toLowerCase();
  const normPhone = (customerPhone || '').replace(/\D/g, '');

  const seenReservationIds = new Set<string>();

  // 1. Check in-memory reservations
  if (Array.isArray(reservations)) {
    for (const r of reservations) {
      if (r.status === 'cancelled' || r.cancellationStatus === 'cancelled') {
        const matchesUser = normUserId && isReservationForCustomer(r, normUserId);
        const matchesPhone = normPhone && r.customerPhone && r.customerPhone.replace(/\D/g, '') === normPhone;

        if (matchesUser || matchesPhone) {
          seenReservationIds.add(r.id);
        }
      }
    }
  }

  // 2. Check localStorage records
  const stored = getAllCancellationRecords();
  for (const rec of stored) {
    const recUserId = (rec.userId || '').trim().toLowerCase();
    const recPhone = (rec.customerPhone || '').replace(/\D/g, '');

    const matchesUser = normUserId && recUserId && (recUserId === normUserId);
    const matchesPhone = normPhone && recPhone && (recPhone === normPhone);

    if (matchesUser || matchesPhone) {
      seenReservationIds.add(rec.reservationId);
    }
  }

  return seenReservationIds.size;
}

export interface CancellationPlan {
  priorCount: number;
  attemptNumber: number; // 1 for first cancellation, 2 for second, etc.
  isFirstCancellation: boolean;
  isWithin3Minutes: boolean; // Cancelled within 3 minutes of booking
  minutesElapsed: number;
  secondsRemainingInGrace: number;
  penaltyAmount: number; // 0 for 1st cancellation or within 3 mins; 100 from 2nd cancellation after 3 mins
  penaltyApplicability: 'none_within_3_mins' | 'none_first_cancellation' | 'applicable';
  reasonText: string;
}

/**
 * Prepares the policy rules for an upcoming cancellation:
 * - Free if within 3 minutes of booking (grace window).
 * - Or 1st cancellation is free (₹0 penalty).
 * - From 2nd cancellation after 3 minutes, ₹100 penalty fee is taken.
 */
export function prepareCancellationPlan(
  userId?: string,
  customerPhone?: string,
  reservations?: Reservation[],
  reservationCreatedAt?: string
): CancellationPlan {
  const priorCount = getCustomerCancellationCount(userId, customerPhone, reservations);
  const attemptNumber = priorCount + 1;
  const isFirstCancellation = priorCount === 0;

  // Calculate elapsed time since reservation was created
  let minutesElapsed = 999;
  let secondsRemainingInGrace = 0;
  if (reservationCreatedAt) {
    const createdTime = new Date(reservationCreatedAt).getTime();
    if (!isNaN(createdTime)) {
      const now = Date.now();
      const diffMs = Math.max(0, now - createdTime);
      minutesElapsed = diffMs / (60 * 1000);
      const remainingMs = (3 * 60 * 1000) - diffMs;
      secondsRemainingInGrace = Math.max(0, Math.floor(remainingMs / 1000));
    }
  }

  const isWithin3Minutes = minutesElapsed <= 3;

  // Penalty rules:
  // 1) Cancelled within 3 minutes => FREE (0 penalty)
  // 2) 1st cancellation => FREE (0 penalty)
  // 3) 2nd+ cancellation after 3 minutes => ₹100 penalty
  let penaltyAmount = 0;
  let penaltyApplicability: 'none_within_3_mins' | 'none_first_cancellation' | 'applicable' = 'none_first_cancellation';
  let reasonText = '';

  if (isWithin3Minutes) {
    penaltyAmount = 0;
    penaltyApplicability = 'none_within_3_mins';
    reasonText = `Cancelled within 3-minute grace window (${Math.round(minutesElapsed * 10) / 10} mins elapsed). No penalty charged.`;
  } else if (isFirstCancellation) {
    penaltyAmount = 0;
    penaltyApplicability = 'none_first_cancellation';
    reasonText = 'First cancellation exemption: 1st cancellation is free of charge. Warning issued for future cancellations.';
  } else {
    penaltyAmount = 100;
    penaltyApplicability = 'applicable';
    reasonText = `Cancellation #${attemptNumber} after 3-minute window: ₹100 cancellation penalty charged.`;
  }

  return {
    priorCount,
    attemptNumber,
    isFirstCancellation,
    isWithin3Minutes,
    minutesElapsed,
    secondsRemainingInGrace,
    penaltyAmount,
    penaltyApplicability,
    reasonText,
  };
}
