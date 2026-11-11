import { RestaurantSubscriptionPlan, RestaurantSubscriptionStatus, RestaurantSubscriptionHistoryItem, SubscriptionPlanId } from '../types';

export const RESTAURANT_SUBSCRIPTION_PLANS: RestaurantSubscriptionPlan[] = [
  {
    id: 'free-month',
    name: '1st Month Free Trial',
    durationMonths: 1,
    durationDays: 30,
    durationLabel: '1st Month FREE (30 Days)',
    price: 0,
    regularPrice: 299,
    badge: '100% FREE TRIAL',
    discountBadge: '100% OFF',
    tagline: 'Zero risk, full partner features to experience FlashTable live dining',
    isFree: true,
    features: [
      'Full live table and seating inventory management.',
      'Real-time dining timer and seat pacing tracker.',
      'Digital QR tableside menu.',
      'Smart Arrival customer ETA notifications.',
      'Instant booking confirmations and SMS notifications.',
      'Standard email and phone support.'
    ]
  },
  {
    id: '3-months',
    name: 'Quarterly Partner Plan',
    durationMonths: 3,
    durationDays: 90,
    durationLabel: '3 Months (Quarterly)',
    price: 299,
    regularPrice: 499,
    badge: '40% OFF • QUARTERLY',
    discountBadge: '40% OFF',
    tagline: 'Ideal for neighborhood cafes, bistros, and boutique dining spots (~₹100/mo)',
    features: [
      'Priority seat allocation and live table hold.',
      'Automated SMS and WhatsApp confirmations.',
      'Live menu inventory and dietary allergen tagging.',
      'Daily occupancy insights and table turnover reports.',
      'Priority partner phone support.'
    ]
  },
  {
    id: '6-months',
    name: 'Half-Yearly Growth Plan',
    durationMonths: 6,
    durationDays: 180,
    durationLabel: '6 Months (~₹100/mo)',
    price: 599,
    regularPrice: 999,
    badge: 'MOST POPULAR • RECOMMENDED',
    discountBadge: '40% OFF',
    isPopular: true,
    tagline: 'Best for high-traffic restaurants looking to maximize seat utilization',
    features: [
      'Everything included in the Quarterly Plan.',
      'Bus passenger and travel dining pre-order routing.',
      'Solo diner safety verification.',
      'Peak-hour predictive occupancy optimization.',
      'Promoted partner badge on customer discovery.',
      'Dedicated partner relationship manager.'
    ]
  },
  {
    id: '12-months',
    name: 'Annual Pro Plan',
    durationMonths: 12,
    durationDays: 365,
    durationLabel: '12 Months (<₹92/mo)',
    price: 1099,
    regularPrice: 1999,
    badge: 'BEST VALUE • SAVE 45%',
    discountBadge: '45% OFF',
    isBestValue: true,
    tagline: 'Complete annual partnership for premier dining institutions',
    features: [
      'Everything included in the Half-Yearly Plan.',
      'Top search placement across FlashTable.',
      'Custom interactive 3D floor layout.',
      'Zero transaction commission on bill settlements.',
      'Instant SMS guest recall and waitlist broadcasts.',
      'VIP 24/7 priority concierge support.'
    ]
  }
];

const STORAGE_PREFIX = 'flashtable_sub_';
const HISTORY_PREFIX = 'flashtable_sub_history_';
const DISMISS_PREFIX = 'flashtable_sub_dismiss_';

export function calculateDaysRemaining(expiryDateStr: string): {
  days: number;
  status: 'active' | 'expiring_soon' | 'expired';
} {
  const expiry = new Date(expiryDateStr);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return { days: 0, status: 'expired' };
  }
  if (days <= 7) {
    return { days, status: 'expiring_soon' };
  }
  return { days, status: 'active' };
}

export function getRestaurantSubscriptionHistory(restaurantId: string): RestaurantSubscriptionHistoryItem[] {
  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${restaurantId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveRestaurantSubscriptionHistory(restaurantId: string, history: RestaurantSubscriptionHistoryItem[]): void {
  try {
    localStorage.setItem(`${HISTORY_PREFIX}${restaurantId}`, JSON.stringify(history));
  } catch {}
}

export function getRestaurantSubscription(restaurantId: string): RestaurantSubscriptionStatus {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${restaurantId}`);
    if (raw) {
      const parsed: RestaurantSubscriptionStatus = JSON.parse(raw);
      const { days, status } = calculateDaysRemaining(parsed.expiryDate);
      const history = getRestaurantSubscriptionHistory(restaurantId);

      const updated: RestaurantSubscriptionStatus = {
        ...parsed,
        daysRemaining: days,
        status,
        paymentStatus: days <= 0 ? 'expired' : parsed.amountPaid === 0 ? 'free_trial' : 'paid',
        history: history.length > 0 ? history : parsed.history || []
      };

      // Keep cache updated if days shifted
      if (updated.daysRemaining !== parsed.daysRemaining || updated.status !== parsed.status) {
        localStorage.setItem(`${STORAGE_PREFIX}${restaurantId}`, JSON.stringify(updated));
      }

      return updated;
    }
  } catch {}

  // Initial default: 1st Month Free Trial activated from today
  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(startDate.getDate() + 30);

  const txId = `SUB-FREE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const initialHistoryItem: RestaurantSubscriptionHistoryItem = {
    id: `HIST-${Date.now()}-INIT`,
    restaurantId,
    planId: 'free-month',
    planName: '1st Month Free Trial',
    startDate: startDate.toISOString(),
    expiryDate: expiryDate.toISOString(),
    durationLabel: '1st Month FREE (30 Days)',
    amountPaid: 0,
    paymentMethod: 'Free Partner Launch Promotion',
    paymentStatus: 'free_trial',
    transactionId: txId,
    activatedAt: startDate.toISOString()
  };

  const defaultSub: RestaurantSubscriptionStatus = {
    restaurantId,
    planId: 'free-month',
    planName: '1st Month Free Trial',
    startDate: startDate.toISOString(),
    expiryDate: expiryDate.toISOString(),
    daysRemaining: 30,
    amountPaid: 0,
    paymentStatus: 'free_trial',
    status: 'active',
    paymentMethod: 'Free Partner Launch Promotion',
    transactionId: txId,
    history: [initialHistoryItem]
  };

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${restaurantId}`, JSON.stringify(defaultSub));
    saveRestaurantSubscriptionHistory(restaurantId, [initialHistoryItem]);
  } catch {}

  return defaultSub;
}

export function activateRestaurantSubscription(
  restaurantId: string,
  planId: SubscriptionPlanId,
  paymentMethod: string = 'UPI / NetBanking'
): RestaurantSubscriptionStatus {
  const plan = RESTAURANT_SUBSCRIPTION_PLANS.find((p) => p.id === planId) || RESTAURANT_SUBSCRIPTION_PLANS[0];
  const startDate = new Date();
  
  // Expiry calculation: calculated from actual activation date
  const expiryDate = new Date();
  expiryDate.setDate(startDate.getDate() + plan.durationDays);

  const txId = `SUB-${plan.id.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  const historyItem: RestaurantSubscriptionHistoryItem = {
    id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    restaurantId,
    planId: plan.id,
    planName: plan.name,
    startDate: startDate.toISOString(),
    expiryDate: expiryDate.toISOString(),
    durationLabel: plan.durationLabel,
    amountPaid: plan.price,
    paymentMethod,
    paymentStatus: plan.isFree ? 'free_trial' : 'paid',
    transactionId: txId,
    activatedAt: startDate.toISOString()
  };

  const existingHistory = getRestaurantSubscriptionHistory(restaurantId);
  const updatedHistory = [historyItem, ...existingHistory];

  const newSub: RestaurantSubscriptionStatus = {
    restaurantId,
    planId: plan.id,
    planName: plan.name,
    startDate: startDate.toISOString(),
    expiryDate: expiryDate.toISOString(),
    daysRemaining: plan.durationDays,
    amountPaid: plan.price,
    paymentStatus: plan.isFree ? 'free_trial' : 'paid',
    status: 'active',
    paymentMethod,
    transactionId: txId,
    history: updatedHistory
  };

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${restaurantId}`, JSON.stringify(newSub));
    saveRestaurantSubscriptionHistory(restaurantId, updatedHistory);
    // Clear any previous dismissal state so fresh reminders work on natural schedule
    localStorage.removeItem(`${DISMISS_PREFIX}${restaurantId}`);
    
    // Notify application components
    window.dispatchEvent(new CustomEvent('flashtable_subscription_updated', { detail: newSub }));
  } catch {}

  // Sync to backend asynchronously
  fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'activateRestaurantSubscription',
      restaurantId,
      planId: plan.id,
      paymentMethod,
      amountPaid: plan.price,
      startDate: startDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      transactionId: txId
    })
  }).catch(() => {});

  return newSub;
}

/**
 * Simulator function for testing 7-day, 3-day, 1-day, and Expired states easily.
 */
export function simulateSubscriptionExpiry(
  restaurantId: string,
  daysRemaining: number
): RestaurantSubscriptionStatus {
  const current = getRestaurantSubscription(restaurantId);
  const now = new Date();
  const simulatedExpiry = new Date();
  
  if (daysRemaining <= 0) {
    // Expired 1 hour ago
    simulatedExpiry.setTime(now.getTime() - 1000 * 60 * 60);
  } else {
    // Exactly N days and 2 hours in the future
    simulatedExpiry.setTime(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000 - 1000 * 60 * 30);
  }

  const { days, status } = calculateDaysRemaining(simulatedExpiry.toISOString());

  const updated: RestaurantSubscriptionStatus = {
    ...current,
    expiryDate: simulatedExpiry.toISOString(),
    daysRemaining: days,
    status,
    paymentStatus: status === 'expired' ? 'expired' : current.paymentStatus
  };

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${restaurantId}`, JSON.stringify(updated));
    // Clear dismissals so the simulated state triggers the popup immediately!
    localStorage.removeItem(`${DISMISS_PREFIX}${restaurantId}`);
    window.dispatchEvent(new CustomEvent('flashtable_subscription_updated', { detail: updated }));
  } catch {}

  // Sync simulation to backend
  fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'simulateRestaurantSubscriptionExpiry',
      restaurantId,
      daysRemaining,
      simulatedExpiry: simulatedExpiry.toISOString()
    })
  }).catch(() => {});

  return updated;
}

export type ExpiryTier = '7d' | '3d' | '1d' | 'expired';

export function getSubscriptionExpiryTier(daysRemaining: number): ExpiryTier | null {
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining === 1) return '1d';
  if (daysRemaining <= 3) return '3d';
  if (daysRemaining <= 7) return '7d';
  return null;
}

export function shouldShowExpiryNotification(restaurantId: string, subscription: RestaurantSubscriptionStatus): {
  shouldShow: boolean;
  tier: ExpiryTier | null;
} {
  const tier = getSubscriptionExpiryTier(subscription.daysRemaining);
  if (!tier) {
    return { shouldShow: false, tier: null };
  }

  try {
    const rawDismissed = localStorage.getItem(`${DISMISS_PREFIX}${restaurantId}`);
    if (rawDismissed) {
      const parsed = JSON.parse(rawDismissed);
      // If already dismissed for this exact tier recently, avoid harassing
      if (parsed.tier === tier) {
        // Expired tier can show again after 6 hours if user returns
        const hoursPassed = (Date.now() - (parsed.timestamp || 0)) / (1000 * 60 * 60);
        if (tier === 'expired' && hoursPassed > 6) {
          return { shouldShow: true, tier };
        }
        return { shouldShow: false, tier };
      }
    }
  } catch {}

  return { shouldShow: true, tier };
}

export function dismissSubscriptionNotification(restaurantId: string, tier: ExpiryTier): void {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${restaurantId}`, JSON.stringify({
      tier,
      timestamp: Date.now()
    }));
  } catch {}
}
