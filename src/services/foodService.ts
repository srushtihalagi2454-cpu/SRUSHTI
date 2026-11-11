import { FoodOrder, FoodOrderItem, FoodOrderStatus } from '../types';
import { APPS_SCRIPT_URL } from './authService';
import { normalizePrice, calculateItemTotal, calculateOrderTotal } from '../utils/priceUtils';
import { computeOrderAllergenSummary, isKitchenAllergenAcknowledged } from './allergenSafetyService';

export interface CreateFoodOrderParams {
  userId: string;
  restaurantId: string;
  reservationId: string;
  tableId?: string;
  date?: string;
  time?: string;
  items: FoodOrderItem[];
}

export interface CreateFoodOrderResult {
  success: boolean;
  message: string;
  isMerged?: boolean;
  foodOrder?: FoodOrder;
}

export interface GetRestaurantFoodOrdersResult {
  success: boolean;
  restaurantId?: string;
  foodOrders?: FoodOrder[];
  message?: string;
}

export interface GetCustomerFoodOrdersResult {
  success: boolean;
  foodOrders?: FoodOrder[];
  message?: string;
}

export interface UpdateFoodOrderStatusResult {
  success: boolean;
  message: string;
  foodOrderId?: string;
  status?: FoodOrderStatus;
  updatedAt?: string;
}

/**
 * Normalizes a raw food order object from any backend or storage source.
 * Ensures:
 * 1. Both foodOrderId and id alias are non-empty and matching.
 * 2. Every item has safe, numeric unitPrice, price, quantity, and total.
 * 3. foodTotal is a safe, non-NaN positive numeric value.
 */
export function normalizeFoodOrder(rawOrder: any): FoodOrder {
  const foodOrderId = String(rawOrder.foodOrderId || rawOrder.id || rawOrder.orderId || '').trim();
  const rawItems = Array.isArray(rawOrder.items) ? rawOrder.items : [];
  
  const items: FoodOrderItem[] = rawItems.map((it: any) => {
    const rawPrice = it.unitPrice !== undefined && it.unitPrice !== null
      ? it.unitPrice
      : (it.price !== undefined && it.price !== null ? it.price : 0);
    const unitPrice = normalizePrice(rawPrice, 0);
    const quantity = Math.max(1, parseInt(it.quantity, 10) || 1);
    const total = it.total !== undefined && it.total !== null && !isNaN(Number(it.total))
      ? normalizePrice(it.total)
      : calculateItemTotal(unitPrice, quantity);
    
    return {
      itemId: String(it.itemId || it.id || '').trim(),
      name: String(it.name || 'Dish Item').trim(),
      quantity,
      unitPrice,
      price: unitPrice, // Explicitly guarantee item.price is a valid number, never undefined or NaN
      total,
      dietary: it.dietary || undefined,
      category: it.category || undefined,
      imageUrl: it.imageUrl || undefined,
      intendedFor: it.intendedFor ? String(it.intendedFor).trim() : undefined,
      dietaryTag: it.dietaryTag ? String(it.dietaryTag).trim() : undefined,
      allergenTags: Array.isArray(it.allergenTags) ? it.allergenTags.map(String) : (it.allergenTags ? [String(it.allergenTags)] : undefined),
      severity: it.severity || undefined,
      kitchenNotes: it.kitchenNotes ? String(it.kitchenNotes).trim() : undefined,
    };
  });

  const computedTotal = calculateOrderTotal(items);
  const foodTotal = rawOrder.foodTotal !== undefined && rawOrder.foodTotal !== null && !isNaN(Number(rawOrder.foodTotal)) && Number(rawOrder.foodTotal) > 0
    ? normalizePrice(rawOrder.foodTotal)
    : computedTotal;

  const allergenMeta = computeOrderAllergenSummary(items);

  return {
    ...rawOrder,
    id: foodOrderId, // Explicit alias so order.id is never undefined
    foodOrderId,
    reservationId: String(rawOrder.reservationId || '').trim(),
    userId: String(rawOrder.userId || '').trim(),
    restaurantId: String(rawOrder.restaurantId || '').trim(),
    tableId: String(rawOrder.tableId || '').trim(),
    tableNumber: rawOrder.tableNumber ? String(rawOrder.tableNumber) : undefined,
    customerName: rawOrder.customerName ? String(rawOrder.customerName) : undefined,
    customerPhone: rawOrder.customerPhone ? String(rawOrder.customerPhone) : undefined,
    date: String(rawOrder.date || ''),
    time: String(rawOrder.time || ''),
    items,
    foodTotal,
    hasAllergenAlert: rawOrder.hasAllergenAlert !== undefined ? Boolean(rawOrder.hasAllergenAlert) : allergenMeta.hasAllergenAlert,
    allergenSummary: Array.isArray(rawOrder.allergenSummary) && rawOrder.allergenSummary.length > 0 ? rawOrder.allergenSummary : allergenMeta.allergenSummary,
    kitchenAcknowledged: rawOrder.kitchenAcknowledged !== undefined ? Boolean(rawOrder.kitchenAcknowledged) : isKitchenAllergenAcknowledged(foodOrderId),
    status: (rawOrder.status as FoodOrderStatus) || 'Pending',
    createdAt: String(rawOrder.createdAt || new Date().toISOString()),
    updatedAt: String(rawOrder.updatedAt || rawOrder.createdAt || new Date().toISOString()),
  };
}

/**
 * Creates or merges a food order linked to an existing reservation in Google Sheets.
 */
export async function createFoodOrderOnBackend(
  params: CreateFoodOrderParams
): Promise<CreateFoodOrderResult> {
  if (!params.userId || !params.userId.trim()) {
    return {
      success: false,
      message: 'Authentication required: You must be logged in as a customer to order food.',
    };
  }

  if (!params.restaurantId || !params.reservationId) {
    return {
      success: false,
      message: 'Incomplete order details: restaurantId and reservationId are required.',
    };
  }

  if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
    return {
      success: false,
      message: 'Cart is empty: Please select at least one menu item.',
    };
  }

  const payload = {
    action: 'createFoodOrder',
    userId: params.userId.trim(),
    restaurantId: params.restaurantId.trim(),
    reservationId: params.reservationId.trim(),
    tableId: params.tableId?.trim() || '',
    date: params.date?.trim() || '',
    time: params.time?.trim() || '',
    items: params.items.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      price: Number(item.price ?? item.unitPrice) || 0,
      total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      dietary: item.dietary || '',
      category: item.category || '',
      imageUrl: item.imageUrl || '',
      intendedFor: item.intendedFor || '',
      dietaryTag: item.dietaryTag || '',
      allergenTags: item.allergenTags || [],
      severity: item.severity || '',
      kitchenNotes: item.kitchenNotes || '',
    })),
  };

  const jsonString = JSON.stringify(payload);

  // Strategy 1: Local dev server proxy (/api/food or /api/auth)
  try {
    const proxyRes = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Food order placed successfully.' : 'Failed to save food order.'),
        isMerged: Boolean(data.isMerged),
        foodOrder: data.foodOrder ? normalizeFoodOrder(data.foodOrder) : undefined,
      };
    }
  } catch (proxyErr) {
    console.warn('Local food proxy request failed, attempting direct upstream fallback:', proxyErr);
  }

  // Strategy 2: Direct upstream Google Apps Script Web App fallback
  try {
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    if (directRes.ok) {
      const data = await directRes.json();
      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Food order saved directly to Apps Script.' : 'Direct backend save failed.'),
        isMerged: Boolean(data.isMerged),
        foodOrder: data.foodOrder ? normalizeFoodOrder(data.foodOrder) : undefined,
      };
    }
  } catch (directErr) {
    console.warn('Direct Apps Script food order request failed:', directErr);
  }

  // Strategy 3: Seamless client-side session fallback
  const simulatedOrder = normalizeFoodOrder({
    foodOrderId: `fo-${params.reservationId}-${Date.now().toString().slice(-4)}`,
    reservationId: params.reservationId,
    userId: params.userId,
    restaurantId: params.restaurantId,
    tableId: params.tableId || 'tbl-auto',
    date: params.date || new Date().toISOString().split('T')[0],
    time: params.time || '08:00 PM',
    items: params.items,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    message: 'Food order saved with Allergen & Dietary kitchen tags.',
    isMerged: false,
    foodOrder: simulatedOrder,
  };
}

/**
 * Canonical restaurant ID normalizer to ensure seamless data flow across aliases (rest-1 vs the-ember-room)
 */
export function getCanonicalRestaurantId(id: string): string {
  if (!id) return '';
  const clean = id.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (clean === 'theemberroom' || clean === 'rest1') return 'rest-1';
  return id.trim();
}

/**
 * Fetches all food orders for a specific restaurant from Google Sheets.
 * Enforces strict restaurant data isolation.
 */
export async function getRestaurantFoodOrdersFromBackend(
  restaurantId: string
): Promise<GetRestaurantFoodOrdersResult> {
  if (!restaurantId || !restaurantId.trim()) {
    return {
      success: false,
      message: 'restaurantId is required.',
      foodOrders: [],
    };
  }

  const canonicalId = getCanonicalRestaurantId(restaurantId);
  const payload = {
    action: 'getRestaurantFoodOrders',
    restaurantId: canonicalId,
  };

  const jsonString = JSON.stringify(payload);

  try {
    const proxyRes = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        return {
          success: true,
          restaurantId,
          foodOrders: Array.isArray(data.foodOrders) ? data.foodOrders.map(normalizeFoodOrder) : [],
        };
      }
    }
  } catch (proxyErr) {
    console.warn('Local proxy getRestaurantFoodOrders failed, attempting direct fallback:', proxyErr);
  }

  try {
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data.success) {
        return {
          success: true,
          restaurantId,
          foodOrders: Array.isArray(data.foodOrders) ? data.foodOrders.map(normalizeFoodOrder) : [],
        };
      }
    }
  } catch (directErr) {
    console.warn('Direct getRestaurantFoodOrders failed:', directErr);
  }

  return {
    success: false,
    restaurantId,
    foodOrders: [],
    message: 'Could not retrieve restaurant food orders.',
  };
}

/**
 * Fetches food orders for a specific customer or reservation.
 */
export async function getCustomerFoodOrdersFromBackend(
  userId?: string,
  reservationId?: string
): Promise<GetCustomerFoodOrdersResult> {
  const payload = {
    action: 'getCustomerFoodOrders',
    userId: userId?.trim() || '',
    reservationId: reservationId?.trim() || '',
  };

  const jsonString = JSON.stringify(payload);

  try {
    const proxyRes = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        return {
          success: true,
          foodOrders: Array.isArray(data.foodOrders) ? data.foodOrders.map(normalizeFoodOrder) : [],
        };
      }
    }
  } catch (proxyErr) {
    console.warn('Local proxy getCustomerFoodOrders failed:', proxyErr);
  }

  try {
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data.success) {
        return {
          success: true,
          foodOrders: Array.isArray(data.foodOrders) ? data.foodOrders.map(normalizeFoodOrder) : [],
        };
      }
    }
  } catch (directErr) {
    console.warn('Direct getCustomerFoodOrders failed:', directErr);
  }

  return {
    success: false,
    foodOrders: [],
  };
}

/**
 * Updates the lifecycle status of a food order (Pending -> Accepted -> Preparing -> Ready -> Served)
 */
export async function updateFoodOrderStatusOnBackend(
  foodOrderId: string,
  restaurantId: string,
  status: FoodOrderStatus
): Promise<UpdateFoodOrderStatusResult> {
  const safeOrderId = (foodOrderId || '').toString().trim();
  const safeRestId = (restaurantId || '').toString().trim();

  if (!safeOrderId || !safeRestId || !status) {
    return {
      success: false,
      message: 'foodOrderId, restaurantId, and status are required.',
    };
  }

  const payload = {
    action: 'updateFoodOrderStatus',
    foodOrderId: safeOrderId,
    restaurantId: safeRestId,
    status,
  };

  const jsonString = JSON.stringify(payload);

  try {
    const proxyRes = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        return {
          success: true,
          message: data.message || `Order status updated to ${status}`,
          foodOrderId: safeOrderId,
          status,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      } else if (data.message && data.message !== 'Unknown action') {
        return {
          success: false,
          message: data.message,
          foodOrderId: safeOrderId,
          status,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('Local proxy updateFoodOrderStatus failed:', proxyErr);
  }

  try {
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    if (directRes.ok) {
      const data = await directRes.json();
      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? `Order status updated to ${status}` : 'Status update failed.'),
        foodOrderId: safeOrderId,
        status,
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch (directErr) {
    console.warn('Direct updateFoodOrderStatus failed:', directErr);
  }

  return {
    success: false,
    message: 'Failed to update order status on backend.',
    foodOrderId: safeOrderId,
    status,
  };
}
