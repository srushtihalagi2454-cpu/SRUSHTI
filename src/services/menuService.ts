import { RestaurantMenu, MenuItem, MenuCategory } from '../types';
import { getRestaurantMenu as getBaseRestaurantMenu } from '../data/restaurantMenus';

const MENU_STORAGE_KEY_PREFIX = 'flashtable_custom_menu_';
const MENU_OUT_OF_STOCK_PREFIX = 'flashtable_out_of_stock_';
const MENU_DELETED_ITEMS_PREFIX = 'flashtable_deleted_items_';
const MENU_UPDATE_EVENT = 'flashtable_menu_updated';

interface CustomMenuStorage {
  addedItems: MenuItem[];
  deletedItemIds: string[];
  outOfStockItemIds: string[];
}

/**
 * Read custom storage for a restaurant
 */
function getStorage(restaurantId: string): CustomMenuStorage {
  try {
    const raw = localStorage.getItem(`${MENU_STORAGE_KEY_PREFIX}${restaurantId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        addedItems: Array.isArray(parsed.addedItems) ? parsed.addedItems : [],
        deletedItemIds: Array.isArray(parsed.deletedItemIds) ? parsed.deletedItemIds : [],
        outOfStockItemIds: Array.isArray(parsed.outOfStockItemIds) ? parsed.outOfStockItemIds : [],
      };
    }
  } catch (e) {
    console.warn('[menuService] Failed to read menu storage:', e);
  }
  return {
    addedItems: [],
    deletedItemIds: [],
    outOfStockItemIds: [],
  };
}

/**
 * Save custom storage for a restaurant
 */
function saveStorage(restaurantId: string, data: CustomMenuStorage): void {
  try {
    localStorage.setItem(`${MENU_STORAGE_KEY_PREFIX}${restaurantId}`, JSON.stringify(data));
    // Dispatch global event for reactive UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MENU_UPDATE_EVENT, { detail: { restaurantId } }));
    }
  } catch (e) {
    console.warn('[menuService] Failed to save menu storage:', e);
  }
}

/**
 * Subscribe to any menu updates
 */
export function subscribeToMenuChanges(listener: (detail?: { restaurantId?: string }) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const customEvt = event as CustomEvent<{ restaurantId?: string }>;
    listener(customEvt.detail);
  };
  window.addEventListener(MENU_UPDATE_EVENT, handler);
  return () => {
    window.removeEventListener(MENU_UPDATE_EVENT, handler);
  };
}

/**
 * Get customized restaurant menu with user-added dishes, deleted items filtered out,
 * and outOfStock flags applied.
 */
export function getCustomizedMenu(
  restaurantId: string,
  restaurantName?: string,
  cuisines?: string[]
): RestaurantMenu {
  const baseMenu = getBaseRestaurantMenu(restaurantId, restaurantName, cuisines);
  const storage = getStorage(restaurantId);

  const deletedSet = new Set(storage.deletedItemIds);
  const outOfStockSet = new Set(storage.outOfStockItemIds);

  // Clone and filter categories
  const categories: MenuCategory[] = baseMenu.categories.map((cat) => ({
    name: cat.name,
    description: cat.description,
    items: cat.items
      .filter((item) => !deletedSet.has(item.id))
      .map((item) => {
        const actual = item.actualPrice && item.actualPrice > item.price ? item.actualPrice : Math.round(item.price * 1.25);
        const discount = item.discountPrice ?? item.price;
        return {
          ...item,
          actualPrice: actual,
          discountPrice: discount,
          price: discount,
          isOutOfStock: outOfStockSet.has(item.id),
        };
      }),
  }));

  // Append user-added items into their respective category or a custom category
  storage.addedItems.forEach((addedItem) => {
    if (deletedSet.has(addedItem.id)) return;

    const actual = addedItem.actualPrice && addedItem.actualPrice > addedItem.price ? addedItem.actualPrice : Math.round(addedItem.price * 1.25);
    const discount = addedItem.discountPrice ?? addedItem.price;

    const itemWithStock: MenuItem = {
      ...addedItem,
      actualPrice: actual,
      discountPrice: discount,
      price: discount,
      isOutOfStock: outOfStockSet.has(addedItem.id),
    };

    let targetCat = categories.find(
      (c) => c.name.toLowerCase().trim() === addedItem.category.toLowerCase().trim()
    );

    if (!targetCat) {
      targetCat = {
        name: addedItem.category,
        description: 'Specials & Fresh Additions',
        items: [],
      };
      categories.push(targetCat);
    }

    targetCat.items.unshift(itemWithStock);
  });

  return {
    ...baseMenu,
    categories,
    lastUpdated: storage.addedItems.length > 0 || storage.outOfStockItemIds.length > 0
      ? 'Live Inventory Updated'
      : baseMenu.lastUpdated,
  };
}

/**
 * Add a new dish to the restaurant menu
 */
export function addRestaurantMenuItem(
  restaurantId: string,
  itemData: Omit<MenuItem, 'id'>
): MenuItem {
  const storage = getStorage(restaurantId);
  const newId = `custom-dish-${restaurantId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newItem: MenuItem = {
    ...itemData,
    id: newId,
  };

  storage.addedItems.unshift(newItem);

  // If item was added with isOutOfStock true, store that too
  if (newItem.isOutOfStock) {
    if (!storage.outOfStockItemIds.includes(newId)) {
      storage.outOfStockItemIds.push(newId);
    }
  }

  saveStorage(restaurantId, storage);
  return newItem;
}

/**
 * Delete a menu item from the restaurant menu
 */
export function deleteRestaurantMenuItem(
  restaurantId: string,
  itemId: string
): boolean {
  const storage = getStorage(restaurantId);

  // Remove from addedItems if it was an added item
  const priorAddedLength = storage.addedItems.length;
  storage.addedItems = storage.addedItems.filter((it) => it.id !== itemId);

  // Also add to deletedItemIds so base menu items are hidden
  if (!storage.deletedItemIds.includes(itemId)) {
    storage.deletedItemIds.push(itemId);
  }

  // Remove from outOfStock list if present
  storage.outOfStockItemIds = storage.outOfStockItemIds.filter((id) => id !== itemId);

  saveStorage(restaurantId, storage);
  return true;
}

/**
 * Toggle or explicitly set an item's Out of Stock status
 */
export function toggleRestaurantMenuItemStock(
  restaurantId: string,
  itemId: string,
  forcedState?: boolean
): boolean {
  const storage = getStorage(restaurantId);
  const isCurrentlyOutOfStock = storage.outOfStockItemIds.includes(itemId);

  const nextState = forcedState !== undefined ? forcedState : !isCurrentlyOutOfStock;

  if (nextState) {
    if (!storage.outOfStockItemIds.includes(itemId)) {
      storage.outOfStockItemIds.push(itemId);
    }
  } else {
    storage.outOfStockItemIds = storage.outOfStockItemIds.filter((id) => id !== itemId);
  }

  saveStorage(restaurantId, storage);
  return nextState;
}

/**
 * Check if a specific item is marked out of stock
 */
export function isMenuItemOutOfStock(restaurantId: string, itemId: string): boolean {
  const storage = getStorage(restaurantId);
  return storage.outOfStockItemIds.includes(itemId);
}

/**
 * Reset restaurant menu to standard defaults
 */
export function resetRestaurantMenuToDefaults(restaurantId: string): void {
  try {
    localStorage.removeItem(`${MENU_STORAGE_KEY_PREFIX}${restaurantId}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MENU_UPDATE_EVENT, { detail: { restaurantId } }));
    }
  } catch (e) {
    console.warn('[menuService] Failed to reset menu storage:', e);
  }
}
