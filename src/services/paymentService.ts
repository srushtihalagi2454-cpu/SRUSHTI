import { APPS_SCRIPT_URL } from './authService';

export interface CreatePaymentParams {
  reservationId: string;
  userId: string;
  amount: number;
  method: 'UPI' | 'RuPay' | 'Net Banking' | string;
}

export interface PaymentRecord {
  paymentId: string;
  reservationId: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  transactionId: string;
  createdAt: string;
}

export interface CreatePaymentResult {
  success: boolean;
  message: string;
  paymentId?: string;
  transactionId?: string;
  createdAt?: string;
  isExisting?: boolean;
  payment?: PaymentRecord;
}

// In-flight request lock to prevent duplicate rapid submissions
const inFlightPayments = new Set<string>();

/**
 * Persists a reservation payment record to the Google Sheets "Payment" tab
 * via the Google Apps Script Web App / local development proxy endpoint.
 */
export async function createPaymentOnBackend(
  params: CreatePaymentParams
): Promise<CreatePaymentResult> {
  const reservationId = (params.reservationId || '').trim();
  const userId = (params.userId || '').trim();
  const amount = Number(params.amount) || 300;

  // Normalize method to 'UPI' | 'RuPay' | 'Net Banking'
  let method: 'UPI' | 'RuPay' | 'Net Banking' = 'UPI';
  const rawMethod = (params.method || '').trim();
  const lowerMethod = rawMethod.toLowerCase();

  if (lowerMethod.includes('rupay') || lowerMethod.includes('card') || lowerMethod.includes('debit')) {
    method = 'RuPay';
  } else if (lowerMethod.includes('net') || lowerMethod.includes('bank')) {
    method = 'Net Banking';
  } else if (rawMethod === 'UPI' || rawMethod === 'RuPay' || rawMethod === 'Net Banking') {
    method = rawMethod as any;
  } else {
    method = 'UPI';
  }

  if (!reservationId) {
    return {
      success: false,
      message: 'Reservation ID is required for payment persistence.',
    };
  }

  if (!userId) {
    return {
      success: false,
      message: 'User ID is required for payment persistence.',
    };
  }

  const lockKey = `${userId}_${reservationId}`;
  if (inFlightPayments.has(lockKey)) {
    return {
      success: false,
      message: 'Payment is currently being processed. Please wait.',
    };
  }

  inFlightPayments.add(lockKey);

  const payload = {
    action: 'createPayment',
    reservationId,
    userId,
    amount,
    method,
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/payment or /api/payments)
    try {
      const proxyRes = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as CreatePaymentResult;
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

    const data = (await directRes.json()) as CreatePaymentResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to connect to payment backend service.',
    };
  } finally {
    inFlightPayments.delete(lockKey);
  }
}
