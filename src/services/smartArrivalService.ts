import { APPS_SCRIPT_URL } from './authService';
import { SmartArrivalRecord } from '../types';

export interface UpdateSmartArrivalParams {
  reservationId: string;
  userId: string;
  restaurantId: string;
  locationEnabled: boolean;
  latitude: number;
  longitude: number;
  distance: number;
  etaMinutes: number;
  geofenceStatus: string;
  customerName?: string;
  customerPhone?: string;
  tableNumber?: string;
}

export interface UpdateSmartArrivalResult {
  success: boolean;
  message: string;
  updatedAt?: string;
  data?: any;
}

// In-flight guard to prevent stacking concurrent updates
let isSyncInProgress = false;

/**
 * Sends real customer GPS position, calculated distance, and ETA to the
 * deployed Google Apps Script Web App action: updateSmartArrival.
 *
 * Uses dual-strategy dispatch:
 * 1. Vite dev-server proxy (/api/smart-arrival or /api/auth)
 * 2. Direct simple CORS POST to APPS_SCRIPT_URL (text/plain)
 */
export async function updateSmartArrivalOnBackend(
  params: UpdateSmartArrivalParams
): Promise<UpdateSmartArrivalResult> {
  const reservationId = (params.reservationId || '').trim();
  const userId = (params.userId || '').trim();
  const restaurantId = (params.restaurantId || '').trim();

  if (!reservationId) {
    return {
      success: false,
      message: 'Reservation ID is required for Smart Arrival sync.',
    };
  }

  if (!userId) {
    return {
      success: false,
      message: 'User ID is required for Smart Arrival sync.',
    };
  }

  if (!restaurantId) {
    return {
      success: false,
      message: 'Restaurant ID is required for Smart Arrival sync.',
    };
  }

  if (isSyncInProgress) {
    return {
      success: false,
      message: 'A Smart Arrival backend update is already in-flight.',
    };
  }

  isSyncInProgress = true;

  const payload = {
    action: 'updateSmartArrival',
    reservationId,
    userId,
    restaurantId,
    locationEnabled: Boolean(params.locationEnabled),
    latitude: Number(params.latitude),
    longitude: Number(params.longitude),
    distance: Math.round(Number(params.distance) || 0),
    etaMinutes: Math.max(0, Math.round(Number(params.etaMinutes) || 0)),
    geofenceStatus: String(params.geofenceStatus || 'Outside 500 m').trim(),
    data: {
      reservationId,
      userId,
      restaurantId,
      locationEnabled: Boolean(params.locationEnabled),
      latitude: Number(params.latitude),
      longitude: Number(params.longitude),
      distance: Math.round(Number(params.distance) || 0),
      etaMinutes: Math.max(0, Math.round(Number(params.etaMinutes) || 0)),
      geofenceStatus: String(params.geofenceStatus || 'Outside 500 m').trim(),
    },
  };

  console.log('[Smart Arrival Service] Dispatching updateSmartArrival request:', {
    reservationId,
    userId,
    restaurantId,
    distance: Math.round(Number(params.distance) || 0),
    etaMinutes: Math.max(0, Math.round(Number(params.etaMinutes) || 0)),
    geofenceStatus: String(params.geofenceStatus || 'Outside 500 m').trim(),
  });

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/smart-arrival)
    try {
      const proxyRes = await fetch('/api/smart-arrival', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data && typeof data === 'object') {
          return {
            success: Boolean(data.success),
            message: data.error || data.message || (data.success ? 'Smart arrival updated successfully' : 'Backend update failed'),
            updatedAt: data.updatedAt || new Date().toISOString(),
            data: data.data || data,
          };
        }
      }
    } catch {
      // Proceed to upstream Apps Script endpoint
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

    const data = await directRes.json();
    const resObj = {
      success: Boolean(data.success),
      message: data.error || data.message || (data.success ? 'Smart arrival updated successfully' : 'Backend update failed'),
      updatedAt: data.updatedAt || new Date().toISOString(),
      data: data.data || data,
    };

    if (typeof window !== 'undefined' && resObj.success) {
      try {
        window.dispatchEvent(
          new CustomEvent('flashtable:smart-arrival-update', {
            detail: {
              reservationId,
              userId,
              restaurantId,
              locationEnabled: Boolean(params.locationEnabled),
              latitude: Number(params.latitude),
              longitude: Number(params.longitude),
              distance: Math.round(Number(params.distance) || 0),
              etaMinutes: Math.max(0, Math.round(Number(params.etaMinutes) || 0)),
              geofenceStatus: String(params.geofenceStatus || 'Outside 500 m').trim(),
              updatedAt: resObj.updatedAt,
            },
          })
        );
      } catch {
        // Safe failover
      }
    }

    return resObj;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to connect to Smart Arrival backend.',
    };
  } finally {
    isSyncInProgress = false;
  }
}

export interface GetRestaurantSmartArrivalResult {
  success: boolean;
  restaurantId?: string;
  arrivals?: SmartArrivalRecord[];
  message?: string;
}

/**
 * Reads live Smart Arrival data for a given restaurant using the project's
 * existing Apps Script/API proxy architecture.
 */
export async function getRestaurantSmartArrivalFromBackend(
  restaurantId: string
): Promise<GetRestaurantSmartArrivalResult> {
  const canonicalId = (restaurantId || '').trim();
  if (!canonicalId) {
    return {
      success: false,
      message: 'Restaurant ID is required.',
      arrivals: [],
    };
  }

  const payload = {
    action: 'getRestaurantSmartArrival',
    restaurantId: canonicalId,
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/smart-arrival)
    try {
      const proxyRes = await fetch('/api/smart-arrival', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data && typeof data === 'object' && Array.isArray(data.arrivals)) {
          return {
            success: true,
            restaurantId: canonicalId,
            arrivals: data.arrivals,
            message: data.message,
          };
        }
      }
    } catch {
      // Proceed to direct fetch
    }

    // Strategy 2: Direct fetch to Google Apps Script Web App
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = await directRes.json();
    if (data && typeof data === 'object' && Array.isArray(data.arrivals)) {
      return {
        success: true,
        restaurantId: canonicalId,
        arrivals: data.arrivals,
        message: data.message,
      };
    }

    return {
      success: Boolean(data?.success),
      restaurantId: canonicalId,
      arrivals: Array.isArray(data?.arrivals) ? data.arrivals : [],
      message: data?.message || 'No arrival records found.',
    };
  } catch (err: any) {
    return {
      success: false,
      restaurantId: canonicalId,
      arrivals: [],
      message: err?.message || 'Network error fetching Smart Arrival data.',
    };
  }
}

