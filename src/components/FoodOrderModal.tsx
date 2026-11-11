import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  ShoppingBag, 
  UtensilsCrossed, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  AlertCircle, 
  Search, 
  Leaf, 
  Flame,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  User,
  Check,
  Edit3
} from 'lucide-react';
import { Restaurant, MenuItem, FoodOrder, FoodOrderItem, DietaryType, AllergenSeverity } from '../types';
import { getDishFallbackImage } from '../data/restaurantMenus';
import { getCustomizedMenu, subscribeToMenuChanges } from '../services/menuService';
import { createFoodOrderOnBackend } from '../services/foodService';
import { formatINR, normalizePrice, calculateItemTotal } from '../utils/priceUtils';
import { AllergenDietaryTagModal, DietaryTagFormData } from './AllergenDietaryTagModal';
import { computeOrderAllergenSummary } from '../services/allergenSafetyService';
import { FoodRateBadge } from './FoodRateBadge';

export interface CartItemEntry {
  entryId: string;
  item: MenuItem;
  quantity: number;
  intendedFor: string;
  dietaryTag: string; // 'Standard' | 'Jain' | 'Vegan' | 'Gluten-Free' | etc.
  allergenTags: string[];
  severity: AllergenSeverity;
  kitchenNotes: string;
}

interface FoodOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
  reservationId: string;
  userId: string;
  tableId?: string;
  tableNumber?: string;
  date?: string;
  time?: string;
  customerName?: string;
  existingOrder?: FoodOrder;
  onOrderSaved?: (order: FoodOrder) => void;
  isDuringBooking?: boolean;
  onSkip?: () => void;
}

export const FoodOrderModal: React.FC<FoodOrderModalProps> = ({
  isOpen,
  onClose,
  restaurant,
  reservationId,
  userId,
  tableId,
  tableNumber,
  date,
  time,
  customerName,
  existingOrder,
  onOrderSaved,
  isDuringBooking = false,
  onSkip,
}) => {
  const defaultGuest = customerName?.trim() || 'Guest 1';
  const suggestedGuests = useMemo(() => {
    return [defaultGuest, 'Guest 2', 'Guest 3', 'Guest 4'];
  }, [defaultGuest]);

  // Cart entries list: each dish can have individual diner name and dietary/allergen tags
  const [cartEntries, setCartEntries] = useState<CartItemEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg' | 'vegan'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ isMerged: boolean; order: FoodOrder } | null>(null);

  // Allergen Tagging Modal state
  const [tagModalItem, setTagModalItem] = useState<{
    item: MenuItem;
    entryId?: string;
    initialData?: Partial<DietaryTagFormData>;
  } | null>(null);

  // Load customized restaurant menu synced with live kitchen inventory
  const [menu, setMenu] = useState(() => 
    getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines)
  );

  useEffect(() => {
    setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
    const unsubscribe = subscribeToMenuChanges((detail) => {
      if (!detail?.restaurantId || detail.restaurantId === restaurant.id) {
        setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
      }
    });
    return unsubscribe;
  }, [restaurant.id, restaurant.name, restaurant.cuisines]);

  // Extract all categories
  const categories = useMemo(() => {
    if (!menu?.categories) return [];
    return menu.categories;
  }, [menu]);

  // Flatten all items for filtering
  const allItems = useMemo(() => {
    if (!categories.length) return [];
    const list: MenuItem[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push(item);
      });
    });
    return list;
  }, [categories]);

  // Filtered items based on category, dietary, search
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Category match
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Dietary filter
      if (dietaryFilter !== 'all') {
        if (dietaryFilter === 'veg' && item.dietary !== 'veg' && item.dietary !== 'vegan') return false;
        if (dietaryFilter === 'non-veg' && item.dietary !== 'non-veg') return false;
        if (dietaryFilter === 'vegan' && item.dietary !== 'vegan') return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCat = item.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [allItems, selectedCategory, dietaryFilter, searchQuery]);

  // Initialize from existing order if present
  useEffect(() => {
    if (existingOrder && Array.isArray(existingOrder.items) && existingOrder.items.length > 0 && cartEntries.length === 0) {
      const initialEntries: CartItemEntry[] = existingOrder.items.map((it, idx) => {
        const matchingMenuItem = allItems.find((m) => m.id === it.itemId) || {
          id: it.itemId,
          name: it.name,
          description: '',
          price: it.unitPrice || it.price || 0,
          category: it.category || 'Special',
          dietary: it.dietary || 'veg',
        };
        return {
          entryId: `entry-existing-${idx}-${Date.now()}`,
          item: matchingMenuItem,
          quantity: it.quantity || 1,
          intendedFor: it.intendedFor || defaultGuest,
          dietaryTag: it.dietaryTag || (matchingMenuItem.isJain ? 'Jain' : matchingMenuItem.isGlutenFree ? 'Gluten-Free' : 'Standard'),
          allergenTags: it.allergenTags || [],
          severity: it.severity || 'preference',
          kitchenNotes: it.kitchenNotes || '',
        };
      });
      setCartEntries(initialEntries);
    }
  }, [existingOrder, allItems, defaultGuest]);

  // Cart operations
  const handleAddItemDirect = (item: MenuItem) => {
    if (item.isOutOfStock) return;
    setCartEntries((prev) => {
      // Check if standard entry for this item already exists
      const existingIdx = prev.findIndex(
        (e) => e.item.id === item.id && e.intendedFor === defaultGuest && e.dietaryTag === 'Standard' && e.allergenTags.length === 0
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }
      // Add new entry
      const newEntry: CartItemEntry = {
        entryId: `entry-${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item,
        quantity: 1,
        intendedFor: defaultGuest,
        dietaryTag: item.isJain ? 'Jain' : item.isGlutenFree ? 'Gluten-Free' : item.dietary === 'vegan' ? 'Vegan' : 'Standard',
        allergenTags: [],
        severity: 'preference',
        kitchenNotes: '',
      };
      return [...prev, newEntry];
    });
  };

  const handleUpdateEntryQuantity = (entryId: string, delta: number) => {
    setCartEntries((prev) => {
      return prev
        .map((entry) => {
          if (entry.entryId === entryId) {
            const nextQty = entry.quantity + delta;
            return nextQty > 0 ? { ...entry, quantity: nextQty } : null;
          }
          return entry;
        })
        .filter(Boolean) as CartItemEntry[];
    });
  };

  const handleRemoveEntry = (entryId: string) => {
    setCartEntries((prev) => prev.filter((e) => e.entryId !== entryId));
  };

  // Open customization modal for new portion or existing entry
  const handleOpenTagModal = (item: MenuItem, entry?: CartItemEntry) => {
    if (!entry && item.isOutOfStock) return;
    if (entry) {
      setTagModalItem({
        item: entry.item,
        entryId: entry.entryId,
        initialData: {
          intendedFor: entry.intendedFor,
          dietaryTag: entry.dietaryTag,
          allergenTags: entry.allergenTags,
          severity: entry.severity,
          kitchenNotes: entry.kitchenNotes,
        },
      });
    } else {
      setTagModalItem({
        item,
        initialData: {
          intendedFor: defaultGuest,
          dietaryTag: item.isJain ? 'Jain' : item.isGlutenFree ? 'Gluten-Free' : item.dietary === 'vegan' ? 'Vegan' : 'Standard',
          allergenTags: [],
          severity: 'preference',
          kitchenNotes: '',
        },
      });
    }
  };

  // Handle saving dietary tag data from modal
  const handleSaveDietaryTag = (formData: DietaryTagFormData) => {
    if (!tagModalItem) return;

    if (tagModalItem.entryId) {
      // Updating existing entry
      setCartEntries((prev) =>
        prev.map((e) =>
          e.entryId === tagModalItem.entryId
            ? {
                ...e,
                intendedFor: formData.intendedFor,
                dietaryTag: formData.dietaryTag,
                allergenTags: formData.allergenTags,
                severity: formData.severity,
                kitchenNotes: formData.kitchenNotes,
              }
            : e
        )
      );
    } else {
      // Adding new custom portion
      const newEntry: CartItemEntry = {
        entryId: `entry-${tagModalItem.item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item: tagModalItem.item,
        quantity: 1,
        intendedFor: formData.intendedFor,
        dietaryTag: formData.dietaryTag,
        allergenTags: formData.allergenTags,
        severity: formData.severity,
        kitchenNotes: formData.kitchenNotes,
      };
      setCartEntries((prev) => [...prev, newEntry]);
    }
    setTagModalItem(null);
  };

  // Duplicate an entry for another diner
  const handleDuplicateForOtherDiner = (entry: CartItemEntry) => {
    const nextGuestIdx = (cartEntries.length % 4) + 1;
    const nextGuestName = `Guest ${nextGuestIdx}`;
    const newEntry: CartItemEntry = {
      ...entry,
      entryId: `entry-${entry.item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      intendedFor: nextGuestName,
      quantity: 1,
    };
    setCartEntries((prev) => [...prev, newEntry]);
  };

  const cartTotalItemsCount = useMemo(() => {
    return cartEntries.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cartEntries]);

  const cartSubtotal = useMemo(() => {
    return cartEntries.reduce((acc, curr) => {
      const itemPrice = normalizePrice(curr.item.price);
      return acc + calculateItemTotal(itemPrice, curr.quantity);
    }, 0);
  }, [cartEntries]);

  // Overall allergen summary calculation
  const allergenSummaryMeta = useMemo(() => {
    const simulatedItems: FoodOrderItem[] = cartEntries.map((e) => ({
      itemId: e.item.id,
      name: e.item.name,
      quantity: e.quantity,
      unitPrice: e.item.price,
      price: e.item.price,
      total: calculateItemTotal(e.item.price, e.quantity),
      intendedFor: e.intendedFor,
      dietaryTag: e.dietaryTag,
      allergenTags: e.allergenTags,
      severity: e.severity,
      kitchenNotes: e.kitchenNotes,
    }));
    return computeOrderAllergenSummary(simulatedItems);
  }, [cartEntries]);

  // Quantity count map for quick menu buttons
  const itemTotalCounts = useMemo(() => {
    const map: Record<string, number> = {};
    cartEntries.forEach((e) => {
      map[e.item.id] = (map[e.item.id] || 0) + e.quantity;
    });
    return map;
  }, [cartEntries]);

  // Submit order to persistent backend
  const handleSubmitOrder = async () => {
    if (cartEntries.length === 0) {
      setErrorMessage('Please add at least one dish to your order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const itemsPayload: FoodOrderItem[] = cartEntries.map((entry) => {
      const unitPrice = normalizePrice(entry.item.price);
      const total = calculateItemTotal(unitPrice, entry.quantity);
      return {
        itemId: entry.item.id,
        name: entry.item.name,
        quantity: entry.quantity,
        unitPrice,
        price: unitPrice,
        total,
        dietary: entry.item.dietary,
        category: entry.item.category,
        imageUrl: entry.item.imageUrl || getDishFallbackImage(entry.item.category, entry.item.name),
        intendedFor: entry.intendedFor,
        dietaryTag: entry.dietaryTag,
        allergenTags: entry.allergenTags,
        severity: entry.severity,
        kitchenNotes: entry.kitchenNotes,
      };
    });

    try {
      const res = await createFoodOrderOnBackend({
        userId,
        restaurantId: restaurant.id,
        reservationId,
        tableId,
        date,
        time,
        items: itemsPayload,
      });

      if (res.success && res.foodOrder) {
        setSuccessResult({
          isMerged: Boolean(res.isMerged),
          order: res.foodOrder,
        });
        if (onOrderSaved) {
          onOrderSaved(res.foodOrder);
        }
      } else {
        setErrorMessage(res.message || 'Failed to place food order. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while placing food order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div 
        id="food-order-modal-container"
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-lg font-serif">
                  {isDuringBooking ? 'Pre-Order Food with Dietary & Allergen Safety' : 'Add Food with Dietary Safety'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                  {restaurant.name}
                </span>
              </div>
              <p className="text-xs text-stone-600">
                {date ? `${date} at ${time || ''} • Table ${tableNumber || tableId || 'Assigned'}` : 'Tag specific dishes for specific diners & send allergen alerts directly to kitchen chefs before cooking'}
              </p>
            </div>
          </div>
          <button
            id="close-food-modal-btn"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Order Banner if already has items */}
        {existingOrder && existingOrder.items && existingOrder.items.length > 0 && !successResult && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Existing pre-order active ({existingOrder.status}): </span>
              {existingOrder.items.map(i => `${i.name} (×${i.quantity}${i.intendedFor ? ` for ${i.intendedFor}` : ''})`).join(', ')}.
              <span className="ml-1 text-emerald-700">Any updates will be synchronized with the kitchen queue.</span>
            </div>
          </div>
        )}

        {/* Success confirmation view */}
        {successResult ? (
          <div className="p-8 flex flex-col items-center text-center space-y-5 overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h4 className="text-2xl font-bold font-serif text-stone-900">
                {successResult.isMerged ? 'Kitchen Pre-Order Updated & Merged!' : 'Food Pre-Order & Allergen Protocol Confirmed!'}
              </h4>
              <p className="text-sm text-stone-600 max-w-lg">
                Your dishes with personalized dietary & allergen tags have been recorded directly in the kitchen queue for reservation{' '}
                <span className="font-bold text-stone-800 font-mono">{reservationId}</span>.
              </p>
            </div>

            {/* Kitchen Allergen Protocol Banner */}
            {allergenSummaryMeta.hasAllergenAlert && (
              <div className="w-full max-w-xl p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-left space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Kitchen Safety Alert Transmitted:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allergenSummaryMeta.allergenSummary.map((sum, i) => (
                    <span key={i} className="text-xs bg-white text-amber-950 px-2.5 py-1 rounded-lg border border-amber-300 font-medium">
                      ⚠️ {sum}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800">
                  Kitchen staff is instructed to prepare these plates using sanitized utensils and verify zero cross-contamination before cooking begins.
                </p>
              </div>
            )}

            <div className="w-full max-w-xl p-5 bg-stone-50 border border-stone-200 rounded-2xl text-left space-y-3">
              <div className="flex justify-between text-xs text-stone-500 pb-2 border-b border-stone-200">
                <span>Order ID: <strong className="text-stone-800 font-mono">{successResult.order.foodOrderId || successResult.order.id}</strong></span>
                <span>Status: <strong className="text-emerald-700 font-bold">{successResult.order.status}</strong></span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {successResult.order.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl border border-stone-200 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-stone-900">
                      <span>
                        {it.name} <span className="text-stone-400 font-normal">×{it.quantity}</span>
                      </span>
                      <span className="text-emerald-900 font-bold">
                        {formatINR(it.total || calculateItemTotal(it.unitPrice ?? it.price, it.quantity))}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      {it.intendedFor && (
                        <span className="bg-stone-100 text-stone-800 px-2 py-0.5 rounded-md font-medium border border-stone-200">
                          👤 {it.intendedFor}
                        </span>
                      )}
                      {it.dietaryTag && it.dietaryTag !== 'Standard' && (
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                          🌱 {it.dietaryTag}
                        </span>
                      )}
                      {Array.isArray(it.allergenTags) && it.allergenTags.length > 0 && (
                        <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md font-bold border border-rose-200">
                          🚨 {it.allergenTags.join(', ')} ({it.severity || 'severe'})
                        </span>
                      )}
                    </div>

                    {it.kitchenNotes && (
                      <p className="text-[10px] text-amber-800 bg-amber-50/70 p-1.5 rounded-md font-mono">
                        👨‍🍳 Note: {it.kitchenNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-900">
                <span>Total Pre-Order Value:</span>
                <span className="text-base text-[#4F6F52] font-serif">{formatINR(successResult.order.foodTotal)}</span>
              </div>
              <p className="text-[11px] text-stone-500 italic text-center pt-1">
                No advance charge required. Billed tableside during dining.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                id="done-food-order-btn"
                onClick={onClose}
                className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-sm cursor-pointer"
              >
                Return to Reservations
              </button>
            </div>
          </div>
        ) : (
          /* Normal Food Ordering View */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left / Main Section: Menu items browsing */}
            <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-stone-200">
              {/* Search & Dietary Filters bar */}
              <div className="p-4 border-b border-stone-200 bg-stone-50/70 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      id="food-search-input"
                      type="text"
                      placeholder="Search starters, mains, breads, desserts, Jain, gluten-free..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-900"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Dietary pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {(['all', 'veg', 'non-veg', 'vegan'] as const).map((diet) => (
                      <button
                        key={diet}
                        onClick={() => setDietaryFilter(diet)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          dietaryFilter === diet
                            ? 'bg-stone-900 text-white'
                            : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {diet === 'all' && 'All Food'}
                        {diet === 'veg' && '🌱 Veg'}
                        {diet === 'non-veg' && '🍗 Non-Veg'}
                        {diet === 'vegan' && '🌿 Vegan'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    All Categories ({allItems.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat.name
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat.name} ({cat.items.length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List Grid */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-xs">
                    No dishes found matching your selection.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredItems.map((item) => {
                      const totalQty = itemTotalCounts[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                            item.isOutOfStock
                              ? 'bg-stone-50/80 border-rose-200 opacity-80'
                              : totalQty > 0
                              ? 'bg-amber-50/30 border-amber-300 shadow-2xs'
                              : 'bg-white border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="relative w-20 h-20 shrink-0">
                              <img
                                src={item.imageUrl || getDishFallbackImage(item.category, item.name)}
                                alt={item.name}
                                className="w-full h-full rounded-xl object-cover border border-stone-200/80 bg-stone-100"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getDishFallbackImage(item.category, item.name);
                                }}
                              />
                              {item.isOutOfStock && (
                                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                                  <span className="text-[9px] font-bold uppercase text-white bg-rose-600 px-1 py-0.5 rounded">
                                    Sold Out
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                    item.dietary === 'veg' || item.dietary === 'vegan' ? 'bg-emerald-600' : 'bg-rose-600'
                                  }`} />
                                  <h4 className={`text-xs font-bold truncate ${
                                    item.isOutOfStock ? 'text-stone-500 line-through decoration-rose-400' : 'text-stone-900'
                                  }`}>
                                    {item.name}
                                  </h4>
                                </div>

                                {item.isOutOfStock && (
                                  <span className="text-[9px] font-bold uppercase text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-full">
                                    Out of Stock
                                  </span>
                                )}
                              </div>

                              {/* Dietary Badges if naturally Jain / Gluten-Free */}
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {item.isJain && (
                                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Jain Available
                                  </span>
                                )}
                                {item.isGlutenFree && (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    Gluten-Free
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                                {item.description}
                              </p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <FoodRateBadge item={item} size="sm" showLabel={true} />
                              </div>
                            </div>
                          </div>

                          {/* Action Bar: Quick Add + Dietary Allergen Tagging Button */}
                          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                            {item.isOutOfStock ? (
                              <div className="w-full flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                                  Kitchen Unavailable
                                </span>
                                <span className="px-3 py-1.5 bg-stone-100 text-stone-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-stone-200">
                                  Out of Stock
                                </span>
                              </div>
                            ) : (
                              <>
                                {/* Dietary & Allergen Tagging Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenTagModal(item)}
                                  className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Tag this dish with specific allergen restrictions or diner name"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Dietary / Allergen Tag</span>
                                								</button>

                                {/* Quick Add button */}
                                <button
                                  type="button"
                                  onClick={() => handleAddItemDirect(item)}
                                  className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add</span>
                                  {totalQty > 0 && <span className="ml-1 bg-white text-stone-900 text-[10px] px-1.5 py-0.2 rounded-full">({totalQty})</span>}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Order Cart & Dietary Summary Drawer */}
            <div className="w-full md:w-96 bg-stone-50 flex flex-col justify-between shrink-0 border-t md:border-t-0 md:border-l border-stone-200">
              <div className="p-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-800" />
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Pre-Order Cart
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#4F6F52] bg-[#4F6F5214] px-2.5 py-0.5 rounded-full border border-[#4F6F52]/20">
                    {cartTotalItemsCount} {cartTotalItemsCount === 1 ? 'dish' : 'dishes'}
                  </span>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3">
                  {cartEntries.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-stone-400 text-center text-xs space-y-2.5 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200">
                        <ChefHat className="w-6 h-6 stroke-1 text-stone-400" />
                      </div>
                      <p className="font-semibold text-stone-600">Your pre-order cart is empty</p>
                      <p className="text-[11px] text-stone-400">
                        Select dishes from the menu. You can tag individual items with dietary preferences (Jain, Vegan) or allergen restrictions (Nut-Free, Gluten-Free) for each diner.
                      </p>
                      {isDuringBooking && (
                        <p className="text-[11px] text-amber-700 italic bg-amber-50 p-2 rounded-xl border border-amber-200">
                          Food pre-ordering is optional. You can also skip and order at the table.
                        </p>
                      )}
                    </div>
                  ) : (
                    cartEntries.map((entry) => {
                      const itemLineTotal = calculateItemTotal(entry.item.price, entry.quantity);
                      const hasCustomTags =
                        entry.allergenTags.length > 0 ||
                        (entry.dietaryTag && entry.dietaryTag !== 'Standard') ||
                        entry.kitchenNotes.trim().length > 0;

                      return (
                        <div 
                          key={entry.entryId} 
                          className={`p-3 bg-white border rounded-2xl transition-all space-y-2 ${
                            hasCustomTags
                              ? 'border-amber-300 shadow-2xs ring-1 ring-amber-200/50'
                              : 'border-stone-200 shadow-2xs'
                          }`}
                        >
                          {/* Dish name & price */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-stone-900 text-xs">{entry.item.name}</p>
                              <p className="text-[11px] text-stone-500 font-serif">{formatINR(entry.item.price)} each</p>
                            </div>
                            <span className="font-bold text-stone-900 text-xs font-serif">
                              {formatINR(itemLineTotal)}
                            </span>
                          </div>

                          {/* Diner & Dietary / Allergen Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Diner Tag */}
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                              <User className="w-2.5 h-2.5 text-stone-500" />
                              {entry.intendedFor}
                            </span>

                            {/* Dietary Prep Tag */}
                            {entry.dietaryTag && entry.dietaryTag !== 'Standard' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                🌱 {entry.dietaryTag}
                              </span>
                            )}

                            {/* Allergen Tags */}
                            {entry.allergenTags.map((alg) => (
                              <span 
                                key={alg} 
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                  entry.severity === 'severe'
                                    ? 'bg-rose-50 text-rose-900 border-rose-300 ring-1 ring-rose-300'
                                    : 'bg-amber-50 text-amber-900 border-amber-300'
                                }`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                {alg} {entry.severity === 'severe' ? '[Severe]' : ''}
                              </span>
                            ))}
                          </div>

                          {/* Kitchen note snippet */}
                          {entry.kitchenNotes && (
                            <p className="text-[10px] text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg font-mono border border-amber-200/60">
                              👨‍🍳 Prep Note: {entry.kitchenNotes}
                            </p>
                          )}

                          {/* Controls Row: Edit Dietary Tag + Stepper + Duplicate */}
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenTagModal(entry.item, entry)}
                                className="text-[10px] font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                {hasCustomTags ? 'Edit Tags' : '+ Tag Allergen'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicateForOtherDiner(entry)}
                                className="text-[10px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 px-1.5 py-1 rounded-lg transition-colors cursor-pointer"
                                title="Add another portion of this dish for another guest with different dietary requirements"
                              >
                                + Another Guest
                              </button>
                            </div>

                            {/* Stepper */}
                            <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50">
                              <button
                                onClick={() => handleUpdateEntryQuantity(entry.entryId, -1)}
                                className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-200 rounded-l cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-bold text-stone-900 text-[11px]">
                                {entry.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateEntryQuantity(entry.entryId, 1)}
                                className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-200 rounded-r cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Table Allergen & Dietary Safety Protocol Preview Banner */}
                {cartEntries.length > 0 && allergenSummaryMeta.hasAllergenAlert && (
                  <div className="mb-3 p-3 bg-amber-50/90 border border-amber-300 rounded-2xl text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px]">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Table Kitchen Safety Protocol Active</span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-tight">
                      {allergenSummaryMeta.dinerDietaryBreakdown.map((b) => `${b.diner}: ${b.requirements.join(', ')}`).join(' • ')}
                    </p>
                    <span className="text-[10px] text-amber-800 font-mono block">
                      ✓ Transmitted to Kitchen Queue before cooking begins to avoid cross-contamination.
                    </span>
                  </div>
                )}

                {/* Pricing Breakdown */}
                {cartEntries.length > 0 && (
                  <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Food Subtotal</span>
                      <span className="font-bold text-stone-900 font-serif">{formatINR(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500 text-[11px]">
                      <span>Estimated Taxes & Service</span>
                      <span>Billed at table</span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
                      <span>Order Total</span>
                      <span className="text-[#4F6F52] font-serif text-base">{formatINR(cartSubtotal)}</span>
                    </div>
                    <div className="p-2 bg-stone-100 rounded-xl text-[11px] text-stone-600 space-y-0.5">
                      <p className="font-semibold text-stone-800">No advance payment required.</p>
                      <p className="text-stone-500">Added to your table bill upon seating.</p>
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="mx-4 mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 bg-white border-t border-stone-200 space-y-2">
                {cartEntries.length > 0 ? (
                  <button
                    id="submit-food-order-btn"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Transmitting to Kitchen...
                      </>
                    ) : (
                      <>
                        <span>{existingOrder ? 'Update Kitchen Order' : 'Send to Kitchen'} ({formatINR(cartSubtotal)})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : null}

                {isDuringBooking && (
                  <button
                    id="skip-food-order-btn"
                    onClick={onSkip || onClose}
                    className="w-full py-2 text-stone-600 hover:text-stone-900 text-xs font-semibold hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Skip & Continue Without Food
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dietary & Allergen Tagging Modal */}
        {tagModalItem && (
          <AllergenDietaryTagModal
            isOpen={Boolean(tagModalItem)}
            onClose={() => setTagModalItem(null)}
            item={tagModalItem.item}
            initialData={tagModalItem.initialData}
            onSave={handleSaveDietaryTag}
            suggestedGuests={suggestedGuests}
          />
        )}
      </div>
    </div>
  );
};
