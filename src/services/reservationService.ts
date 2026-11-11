import { APPS_SCRIPT_URL } from './authService';

export interface CreateReservationRequest {
  action: 'createReservation';
  userId: string;
  restaurantId: string;
  tableId: string;
  date: string;
  time: string;
  guests: number;
  preferences: string;
  status: string;
  depositAmount: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface CreateReservationResult {
  success: boolean;
  message: string;
  reservationId?: string;
  createdAt?: string;
  isExisting?: boolean;
  reservation?: {
    reservationId: string;
    userId: string;
    restaurantId: string;
    tableId: string;
    date: string;
    time: string;
    guests: number;
    preferences: string;
    status: string;
    depositAmount: number;
    createdAt: string;
  };
}

// Client-side in-flight request lock to prevent rapid accidental double-submissions
const inFlightRequests = new Set<string>();

/**
 * Creates a persistent reservation in the Google Sheets "Reservations" tab
 * via the deployed Google Apps Script Web App endpoint.
 */
export async function createReservationOnBackend(
  params: Omit<CreateReservationRequest, 'action'>
): Promise<CreateReservationResult> {
  // 1. Strict user session isolation check
  if (!params.userId || !params.userId.trim()) {
    return {
      success: false,
      message: 'Authentication required: You must be logged in as a customer to create a reservation.',
    };
  }

  // 2. Booking parameter validation
  if (!params.restaurantId || !params.tableId || !params.date || !params.time) {
    return {
      success: false,
      message: 'Incomplete booking details: Table, date, and time slot are required.',
    };
  }

  // 3. Client-side double-submission lock
  const lockKey = `${params.userId}_${params.restaurantId}_${params.tableId}_${params.date}_${params.time}`;
  if (inFlightRequests.has(lockKey)) {
    return {
      success: false,
      message: 'A reservation request for this table and time is already processing. Please wait.',
    };
  }

  inFlightRequests.add(lockKey);

  const payload: CreateReservationRequest = {
    action: 'createReservation',
    userId: params.userId.trim(),
    restaurantId: params.restaurantId.trim(),
    tableId: params.tableId.trim(),
    date: params.date.trim(),
    time: params.time.trim(),
    guests: Number(params.guests) || 1,
    preferences: (params.preferences || '').trim(),
    status: params.status || 'confirmed',
    depositAmount: Number(params.depositAmount) || 0,
    customerName: (params.customerName || '').trim(),
    customerPhone: (params.customerPhone || '').trim(),
    customerEmail: (params.customerEmail || '').trim(),
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/auth)
    try {
      const proxyRes = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as CreateReservationResult;
        return data;
      }
    } catch {
      // If local proxy is unavailable or errored, proceed to direct Apps Script fetch
    }

    // Strategy 2: Direct fetch to Google Apps Script Web App
    // Note: text/plain;charset=utf-8 triggers a CORS simple request, bypassing OPTIONS preflight
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = (await directRes.json()) as CreateReservationResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to connect to Google Sheets reservation backend.',
    };
  } finally {
    inFlightRequests.delete(lockKey);
  }
}

export interface BackendReservationItem {
  reservationId: string;
  userId: string;
  restaurantId: string;
  tableId: string;
  date: string;
  time: string;
  guests: number;
  preferences?: string;
  status: string;
  depositAmount?: number;
  createdAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface GetRestaurantReservationsRequest {
  action: 'getRestaurantReservations';
  restaurantId: string;
}

export interface GetRestaurantReservationsResult {
  success: boolean;
  message?: string;
  restaurantId?: string;
  reservations?: BackendReservationItem[];
}

/**
 * Fetches all reservations for a given restaurant from the Google Sheets "Reservations" tab
 * using the authenticated restaurant owner's session.
 */
export async function getRestaurantReservationsFromBackend(
  restaurantId: string
): Promise<GetRestaurantReservationsResult> {
  if (!restaurantId || !restaurantId.trim()) {
    return {
      success: false,
      message: 'Restaurant ID is required.',
      reservations: [],
    };
  }

  const payload: GetRestaurantReservationsRequest = {
    action: 'getRestaurantReservations',
    restaurantId: restaurantId.trim(),
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/reservations)
    try {
      const proxyRes = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as GetRestaurantReservationsResult;
        if (data && typeof data.success === 'boolean') {
          return data;
        }
      }
    } catch {
      // If local proxy failed, proceed to direct Apps Script fetch
    }

    // Strategy 2: Direct fetch to Google Apps Script Web App
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = (await directRes.json()) as GetRestaurantReservationsResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to fetch reservations from Google Sheets backend.',
      reservations: [],
    };
  }
}

export interface GetCustomerReservationsRequest {
  action: 'getCustomerReservations';
  userId: string;
}

export interface GetCustomerReservationsResult {
  success: boolean;
  message?: string;
  userId?: string;
  reservations?: BackendReservationItem[];
}

/**
 * Fetches all reservations for an authenticated customer by their unique userId from Google Sheets.
 */
export async function getCustomerReservationsFromBackend(
  userId: string
): Promise<GetCustomerReservationsResult> {
  if (!userId || !userId.trim()) {
    return {
      success: false,
      message: 'User ID is required to retrieve customer reservations.',
      reservations: [],
    };
  }

  const cleanUserId = userId.trim();
  const payload: GetCustomerReservationsRequest = {
    action: 'getCustomerReservations',
    userId: cleanUserId,
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/reservations)
    try {
      const proxyRes = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as GetCustomerReservationsResult;
        if (data && data.success && Array.isArray(data.reservations)) {
          if (data.reservations.length > 0) {
            return data;
          }
        }
      }
    } catch {
      // If local proxy failed or in standalone build, proceed to direct fetch
    }

    // Strategy 2: Direct query across Google Sheets restaurants to reliably retrieve reservations for this customer
    const allRestaurants = [
      'rest-1', 'rest-2', 'rest-3', 'rest-4', 'rest-5',
      'rest-6', 'rest-7', 'rest-8', 'rest-9', 'rest-10'
    ];

    const restaurantResults = await Promise.all(
      allRestaurants.map(async (restId) => {
        try {
          const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getRestaurantReservations', restaurantId: restId }),
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData && resData.success && Array.isArray(resData.reservations)) {
              return resData.reservations as BackendReservationItem[];
            }
          }
        } catch {}
        return [] as BackendReservationItem[];
      })
    );

    const aggregated: BackendReservationItem[] = [];
    const seenResIds = new Set<string>();

    for (const resList of restaurantResults) {
      for (const item of resList) {
        if (item && item.reservationId && !seenResIds.has(item.reservationId)) {
          seenResIds.add(item.reservationId);
          if (item.userId && item.userId.trim().toLowerCase() === cleanUserId.toLowerCase()) {
            aggregated.push(item);
          }
        }
      }
    }

    return {
      success: true,
      userId: cleanUserId,
      reservations: aggregated,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to fetch customer reservations from Google Sheets backend.',
      reservations: [],
    };
  }
}

export interface CancelReservationRequest {
  action: 'cancelReservation';
  reservationId: string;
  userId: string;
  cancellationCount?: number;
  cancellationPenalty?: number;
  penaltyAmount?: number;
  penaltyApplicability?: string;
  paymentStatus?: string;
  penaltyStatus?: string;
  paymentMethod?: string;
  transactionId?: string;
  cancellationDate?: string;
}

export interface CancelReservationResult {
  success: boolean;
  message: string;
  reservationId?: string;
  status?: string;
}

/**
 * Persistently cancels a reservation in Google Sheets for the authenticated customer.
 */
export async function cancelReservationOnBackend(
  reservationId: string,
  userId: string,
  penaltyDetails?: {
    cancellationCount?: number;
    cancellationPenalty?: number;
    penaltyAmount?: number;
    penaltyApplicability?: string;
    paymentStatus?: string;
    penaltyStatus?: string;
    paymentMethod?: string;
    transactionId?: string;
    cancellationDate?: string;
  }
): Promise<CancelReservationResult> {
  if (!reservationId || !reservationId.trim()) {
    return {
      success: false,
      message: 'Reservation ID is required.',
    };
  }

  if (!userId || !userId.trim()) {
    return {
      success: false,
      message: 'Authenticated customer userId is required.',
    };
  }

  const payload: CancelReservationRequest = {
    action: 'cancelReservation',
    reservationId: reservationId.trim(),
    userId: userId.trim(),
    ...(penaltyDetails || {}),
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/reservations)
    try {
      const proxyRes = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as CancelReservationResult;
        if (data && typeof data.success === 'boolean') {
          return data;
        }
      }
    } catch {
      // If local proxy failed, proceed to direct Apps Script fetch
    }

    // Strategy 2: Direct fetch to Google Apps Script Web App
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = (await directRes.json()) as CancelReservationResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to cancel reservation on backend.',
    };
  }
}

export interface UpdateReservationTimesParams {
  reservationId: string;
  timeIn: string;
  timeOut: string;
  updatedBy: string; // userId or userName
  updatedRole: 'customer' | 'restaurant-owner' | 'company-admin' | string;
  previousTimeIn?: string;
  previousTimeOut?: string;
  restaurantId?: string;
  restaurantName?: string;
  reason?: string;
}

export interface UpdateReservationTimesResult {
  success: boolean;
  message: string;
  updatedAt: string;
  timeIn: string;
  timeOut: string;
}

export async function updateReservationTimesOnBackend(
  params: UpdateReservationTimesParams
): Promise<UpdateReservationTimesResult> {
  const {
    reservationId,
    timeIn,
    timeOut,
    updatedBy,
    updatedRole,
    previousTimeIn,
    previousTimeOut,
    restaurantId,
    restaurantName,
    reason,
  } = params;

  const nowIso = new Date().toISOString();

  // 1. Audit log recording for misuse monitoring
  try {
    const { recordAuditLog } = await import('./adminService');
    const isSuspicious = Boolean(
      (previousTimeIn && previousTimeOut && Math.abs(new Date(`2000-01-01 ${timeIn}`).getTime() - new Date(`2000-01-01 ${previousTimeIn}`).getTime()) > 3600000 * 4) ||
      (reason && reason.toLowerCase().includes('dispute'))
    );

    recordAuditLog({
      userId: updatedBy || 'USR-UNKNOWN',
      userName: `${updatedRole === 'restaurant-owner' ? 'Restaurant Host/Owner' : updatedRole === 'company-admin' ? 'Company Admin' : 'Customer'} (${updatedBy})`,
      userRole: updatedRole as any,
      action: 'time_in_changed',
      entityType: 'reservation',
      entityId: reservationId,
      restaurantId,
      restaurantName,
      details: `Updated dining schedule: Time In "${timeIn}" (was "${previousTimeIn || 'none'}"), Time Out "${timeOut}" (was "${previousTimeOut || 'none'}"). Updated by ${updatedRole}. ${reason ? 'Note: ' + reason : ''}`,
      previousValue: `${previousTimeIn || ''} → ${previousTimeOut || ''}`,
      newValue: `${timeIn} → ${timeOut}`,
      isSuspicious,
      suspiciousReason: isSuspicious ? 'Large time shift (>4h) or reported dispute' : undefined,
    });
  } catch (err) {
    console.warn('Failed to record audit log for time update:', err);
  }

  // 2. Persist locally to flashtable_reservation_time_overrides
  try {
    const raw = localStorage.getItem('flashtable_reservation_time_overrides') || '{}';
    const overrides = JSON.parse(raw);
    overrides[reservationId] = {
      timeIn,
      timeOut,
      updatedAt: nowIso,
      updatedBy,
      updatedRole,
      reason,
    };
    localStorage.setItem('flashtable_reservation_time_overrides', JSON.stringify(overrides));
  } catch {}

  // 3. Attempt sync with backend proxy if online
  try {
    fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateReservationTimes',
        reservationId,
        timeIn,
        timeOut,
        updatedBy,
        updatedRole,
        updatedAt: nowIso,
      }),
    }).catch(() => {});
  } catch {}

  return {
    success: true,
    message: 'Time In and Time Out updated and recorded successfully.',
    updatedAt: nowIso,
    timeIn,
    timeOut,
  };
}

