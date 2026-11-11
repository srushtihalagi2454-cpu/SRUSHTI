import { APPS_SCRIPT_URL } from './authService';

export interface CreateBillParams {
  reservationId: string;
  userId: string;
  restaurantId: string;
  foodAmount: number;
  depositAmount: number;
  depositAdjustment: number;
  finalAmount: number;
  sentToMobile?: boolean | string;
}

export interface BillRecord {
  billId: string;
  reservationId: string;
  userId: string;
  restaurantId: string;
  foodAmount: number;
  depositAmount: number;
  depositAdjustment: number;
  finalAmount: number;
  status: string;
  sentToMobile: string;
  createdAt: string;
}

export interface CreateBillResult {
  success: boolean;
  message: string;
  billId?: string;
  isExisting?: boolean;
  bill?: BillRecord;
}

// In-flight request lock to prevent duplicate rapid submissions
const inFlightBills = new Set<string>();

/**
 * Persists a final dining bill record to the Google Sheets "Bills" tab
 * via the Google Apps Script Web App or local development proxy endpoint.
 */
export async function createBillOnBackend(
  params: CreateBillParams
): Promise<CreateBillResult> {
  const reservationId = (params.reservationId || '').trim();
  const userId = (params.userId || '').trim();
  const restaurantId = (params.restaurantId || '').trim();
  const foodAmount = Number(params.foodAmount) || 0;
  const depositAmount = Number(params.depositAmount) || 0;
  const depositAdjustment = Number(params.depositAdjustment) || 0;
  const finalAmount = Number(params.finalAmount) || 0;
  const sentToMobile = params.sentToMobile === true || params.sentToMobile === 'true' || params.sentToMobile === 'Yes';

  if (!reservationId) {
    return {
      success: false,
      message: 'Reservation ID is required to record final dining bill.',
    };
  }

  if (!userId) {
    return {
      success: false,
      message: 'User ID is required to record final dining bill.',
    };
  }

  if (!restaurantId) {
    return {
      success: false,
      message: 'Restaurant ID is required to record final dining bill.',
    };
  }

  const lockKey = `${restaurantId}_${reservationId}`;
  if (inFlightBills.has(lockKey)) {
    return {
      success: false,
      message: 'Bill persistence is currently in progress. Please wait.',
    };
  }

  inFlightBills.add(lockKey);

  const payload = {
    action: 'createBill',
    reservationId,
    userId,
    restaurantId,
    foodAmount,
    depositAmount,
    depositAdjustment,
    finalAmount,
    sentToMobile: sentToMobile ? 'Yes' : 'No',
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/bill or /api/bills)
    try {
      const proxyRes = await fetch('/api/bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as CreateBillResult;
        if (data && typeof data.success === 'boolean') {
          return data;
        }
      }
    } catch {
      // If local proxy failed or unavailable, proceed to upstream Apps Script fetch
    }

    // Strategy 2: Direct fetch to Google Apps Script Web App
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = (await directRes.json()) as CreateBillResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to connect to billing backend service.',
    };
  } finally {
    inFlightBills.delete(lockKey);
  }
}
