import { Table, TableState } from '../types';
import { APPS_SCRIPT_URL } from './authService';

export interface BackendTableItem {
  id: string;
  tableId: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  minCapacity: number;
  shape: 'circle' | 'rect' | 'booth' | string;
  section: string;
  features: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  status: TableState;
}

export interface AddTableRequest {
  action: 'addTable';
  tableId?: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  minCapacity?: number;
  shape?: string;
  section: string;
  features: string[];
  preferences?: string;
  status?: TableState;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface AddTableResult {
  success: boolean;
  message?: string;
  table?: BackendTableItem;
}

export interface RemoveTableRequest {
  action: 'removeTable';
  restaurantId: string;
  tableId: string;
}

export interface RemoveTableResult {
  success: boolean;
  message?: string;
  hasActiveReservations?: boolean;
  restaurantId?: string;
  tableId?: string;
  tableNumber?: string;
}

export interface GetRestaurantTablesRequest {
  action: 'getRestaurantTables';
  restaurantId: string;
}

export interface GetRestaurantTablesResult {
  success: boolean;
  message?: string;
  restaurantId?: string;
  tables?: BackendTableItem[];
}

export interface UpdateTableStatusRequest {
  action: 'updateTableStatus';
  restaurantId: string;
  tableId: string;
  status: TableState;
}

export interface UpdateTableStatusResult {
  success: boolean;
  message?: string;
  restaurantId?: string;
  tableId?: string;
  status?: string;
}

/**
 * Fetches all tables for a given restaurant from the Google Sheets "Tables" tab
 * using the authenticated restaurant owner's restaurant ID.
 */
export async function getRestaurantTablesFromBackend(
  restaurantId: string
): Promise<GetRestaurantTablesResult> {
  if (!restaurantId || !restaurantId.trim()) {
    return {
      success: false,
      message: 'Restaurant ID is required.',
      tables: [],
    };
  }

  const payload: GetRestaurantTablesRequest = {
    action: 'getRestaurantTables',
    restaurantId: restaurantId.trim(),
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/tables or /api/reservations)
    try {
      const proxyRes = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as GetRestaurantTablesResult;
        if (data && typeof data.success === 'boolean') {
          return data;
        }
      }
    } catch {
      // If local /api/tables proxy failed, try direct Apps Script Web App
    }

    // Strategy 2: Direct fetch to Google Apps Script Web App
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = (await directRes.json()) as GetRestaurantTablesResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to fetch tables from Google Sheets backend.',
      tables: [],
    };
  }
}

/**
 * Updates table status in the Google Sheets "Tables" tab.
 */
export async function updateTableStatusOnBackend(
  restaurantId: string,
  tableId: string,
  status: TableState
): Promise<UpdateTableStatusResult> {
  if (!restaurantId || !tableId) {
    return {
      success: false,
      message: 'Missing restaurantId or tableId.',
    };
  }

  const payload: UpdateTableStatusRequest = {
    action: 'updateTableStatus',
    restaurantId: restaurantId.trim(),
    tableId: tableId.trim(),
    status,
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy
    try {
      const proxyRes = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as UpdateTableStatusResult;
        if (data && typeof data.success === 'boolean') {
          return data;
        }
      }
    } catch {
      // Fallback
    }

    // Strategy 2: Direct fetch to Google Apps Script
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = (await directRes.json()) as UpdateTableStatusResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to update table status on backend.',
    };
  }
}

/**
 * Adds a new table row to the Google Sheets "Tables" tab for the specific restaurantId.
 */
export async function addTableToBackend(
  request: Omit<AddTableRequest, 'action'>
): Promise<AddTableResult> {
  if (!request.restaurantId || !request.tableNumber) {
    return {
      success: false,
      message: 'Restaurant ID and Table Number are required.',
    };
  }

  const payload: AddTableRequest = {
    action: 'addTable',
    ...request,
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/tables)
    try {
      const proxyRes = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as AddTableResult;
        if (data && typeof data.success === 'boolean') {
          return data;
        }
      }
    } catch {
      // Fallback to direct Apps Script
    }

    // Strategy 2: Direct fetch to Google Apps Script Web App
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = (await directRes.json()) as AddTableResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to add table on backend.',
    };
  }
}

/**
 * Removes a table from the Google Sheets "Tables" tab after checking active reservations.
 */
export async function removeTableFromBackend(
  restaurantId: string,
  tableId: string
): Promise<RemoveTableResult> {
  if (!restaurantId || !tableId) {
    return {
      success: false,
      message: 'Restaurant ID and Table ID are required.',
    };
  }

  const payload: RemoveTableRequest = {
    action: 'removeTable',
    restaurantId: restaurantId.trim(),
    tableId: tableId.trim(),
  };

  const jsonString = JSON.stringify(payload);

  try {
    // Strategy 1: Local server proxy (/api/tables)
    try {
      const proxyRes = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (proxyRes.ok) {
        const data = (await proxyRes.json()) as RemoveTableResult;
        if (data && typeof data.success === 'boolean') {
          return data;
        }
      }
    } catch {
      // Fallback
    }

    // Strategy 2: Direct fetch to Google Apps Script
    const directRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonString,
    });

    const data = (await directRes.json()) as RemoveTableResult;
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error: Unable to remove table on backend.',
    };
  }
}
