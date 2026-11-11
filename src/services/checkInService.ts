import { APPS_SCRIPT_URL } from './authService';

export interface CreateCheckInParams {
  reservationId: string;
  restaurantId: string;
  tableId: string;
  method: 'Manual' | 'QR';
}

export interface CheckInRecord {
  checkInId: string;
  reservationId: string;
  restaurantId: string;
  tableId: string;
  method: 'Manual' | 'QR';
  checkInTime: string;
  status: string;
}

export interface CreateCheckInResult {
  success: boolean;
  message: string;
  checkInId?: string;
  checkInTime?: string;
  isExisting?: boolean;
  checkIn?: CheckInRecord;
}

// In-flight request lock to prevent duplicate rapid requests
const inFlightCheckIns = new Set<string>();

/**
 * Creates or retrieves a persistent check-in record in the Google Sheets "CheckIns" tab
 * via the backend Google Apps Script Web App and local development proxy.
 */
export async function createCheckInOnBackend(
  params: CreateCheckInParams
): Promise<CreateCheckInResult> {
  const reservationId = (params.reservationId || '').trim();
  const restaurantId = (params.restaurantId || '').trim();
  const tableId = (params.tableId || '').trim();
  const method = params.method === 'QR' ? 'QR' : 'Manual';

  if (!reservationId) {
    return {
      success: false,
      message: 'Reservation ID is required for check-in.',
    };
  }

  if (!restaurantId) {
    return {
      success: false,
      message: 'Restaurant ID is required for check-in.',
    };
  }

  if (!tableId) {
    return {
      success: false,
      message: 'Table ID is required for check-in.',
    };
  }

  const lockKey = `${restaurantId}_${reservationId}`;
  if (inFlightCheckIns.has(lockKey)) {
    return {
      success: false,
      message: 'Check-in is currently processing. Please wait.',
    };
  }

  inFlightCheckIns.add(lockKey);

  const payload = {
    action: 'createCheckIn',
    reservationId,
    restaurantId,
    tableId,
    method,
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/checkin or /api/reservations)
    try {
      const proxyRes = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as CreateCheckInResult;
        if (data && typeof data.success === 'boolean') {
          return data;
        }
      }
    } catch {
      // If local proxy is unavailable or failed, proceed to direct Apps Script fetch
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

    const data = (await directRes.json()) as CreateCheckInResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to connect to Google Sheets check-in backend.',
    };
  } finally {
    inFlightCheckIns.delete(lockKey);
  }
}
