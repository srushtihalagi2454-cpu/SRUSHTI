import { APPS_SCRIPT_URL } from './authService';

export interface CreateNotifyMeParams {
  userId: string;
  restaurantId: string;
  date: string;
  time: string;
  guests: number | string;
  preferences?: string;
}

export interface NotifyMeRecord {
  notifyId: string;
  userId: string;
  restaurantId: string;
  date: string;
  time: string;
  guests: number;
  preferences: string;
  status: string;
  createdAt: string;
}

export interface CreateNotifyMeResult {
  success: boolean;
  message: string;
  notifyId?: string;
  isExisting?: boolean;
  notifyRequest?: NotifyMeRecord;
}

// In-flight request lock to prevent duplicate rapid submissions for the same user, restaurant, date, and time
const inFlightNotifyRequests = new Set<string>();

/**
 * Persists an active Table Vacancy Alert (Notify Me) request to the Google Sheets "NotifyMe" tab
 * via the Google Apps Script Web App or local development proxy endpoint.
 */
export async function createNotifyMeOnBackend(
  params: CreateNotifyMeParams
): Promise<CreateNotifyMeResult> {
  const userId = (params.userId || '').trim();
  const restaurantId = (params.restaurantId || '').trim();
  const date = (params.date || '').trim();
  const time = (params.time || '').trim();
  const guests = Number(params.guests);
  const preferences = (params.preferences || '').trim();

  if (!userId) {
    return {
      success: false,
      message: 'User ID is required to register table vacancy notification.',
    };
  }

  if (!restaurantId) {
    return {
      success: false,
      message: 'Restaurant ID is required to register table vacancy notification.',
    };
  }

  if (!date) {
    return {
      success: false,
      message: 'Date is required to register table vacancy notification.',
    };
  }

  if (!time) {
    return {
      success: false,
      message: 'Time slot is required to register table vacancy notification.',
    };
  }

  if (isNaN(guests) || guests <= 0) {
    return {
      success: false,
      message: 'Valid guest count is required to register table vacancy notification.',
    };
  }

  // Prevent duplicate concurrent in-flight calls
  const lockKey = `${userId.toLowerCase()}_${restaurantId.toLowerCase()}_${date.toLowerCase()}_${time.toLowerCase()}`;
  if (inFlightNotifyRequests.has(lockKey)) {
    return {
      success: true,
      message: 'Notification request already processing for this time slot.',
      isExisting: true,
    };
  }

  inFlightNotifyRequests.add(lockKey);

  const payload = {
    action: 'createNotifyMe',
    userId,
    restaurantId,
    date,
    time,
    guests,
    preferences,
  };

  try {
    // Attempt 1: Call proxy endpoint (development server proxy)
    const proxyResponse = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Notify Me alert registered successfully.' : 'Failed to register alert.'),
        notifyId: data.notifyId,
        isExisting: data.isExisting,
        notifyRequest: data.notifyRequest,
      };
    }
  } catch {
    // Proxy failed or not available, proceed to direct Apps Script call
  }

  try {
    // Attempt 2: Direct Google Apps Script Web App call
    const directResponse = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (directResponse.ok) {
      const data = await directResponse.json();
      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Notify Me alert registered successfully.' : 'Failed to register alert.'),
        notifyId: data.notifyId,
        isExisting: data.isExisting,
        notifyRequest: data.notifyRequest,
      };
    }

    return {
      success: false,
      message: `Google Apps Script returned HTTP status ${directResponse.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to Google Sheets backend: ${err?.message || 'Network error'}`,
    };
  } finally {
    inFlightNotifyRequests.delete(lockKey);
  }
}
