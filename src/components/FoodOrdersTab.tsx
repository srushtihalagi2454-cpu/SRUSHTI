import React, { useState, useEffect, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  ChefHat, 
  Users, 
  Armchair, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  Receipt,
  ShieldAlert,
  AlertTriangle,
  User,
  Check,
  Bus
} from 'lucide-react';
import { Restaurant, Reservation, FoodOrder, FoodOrderStatus } from '../types';
import { 
  getRestaurantFoodOrdersFromBackend, 
  updateFoodOrderStatusOnBackend 
} from '../services/foodService';
import { 
  formatINR, 
  normalizePrice, 
  calculateItemTotal, 
  calculateOrderTotal 
} from '../utils/priceUtils';
import { formatTimeIST } from '../utils/dateTime';
import { 
  computeOrderAllergenSummary, 
  isKitchenAllergenAcknowledged, 
  setKitchenAllergenAcknowledged 
} from '../services/allergenSafetyService';

interface FoodOrdersTabProps {
  restaurant: Restaurant;
  reservations: Reservation[];
  onToast?: (message: string) => void;
}

export const FoodOrdersTab: React.FC<FoodOrdersTabProps> = ({
  restaurant,
  reservations,
  onToast,
}) => {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | FoodOrderStatus>('all');
  const [allergenOnlyFilter, setAllergenOnlyFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [acknowledgedMap, setAcknowledgedMap] = useState<Record<string, boolean>>({});

  // Fast lookup for reservation metadata by reservationId
  const reservationsMap = useMemo(() => {
    const map = new Map<string, Reservation>();
    (reservations || []).forEach((r) => {
      if (r && r.id) {
        map.set(r.id.toLowerCase(), r);
      }
      if (r && r.bookingRef) {
        map.set(r.bookingRef.toLowerCase(), r);
      }
    });
    return map;
  }, [reservations]);

  // Fetch orders for this restaurant
  const loadOrders = async (showToast = false) => {
    setIsLoading(true);
    try {
      const res = await getRestaurantFoodOrdersFromBackend(restaurant.id);
      const backendOrders: FoodOrder[] = (res.success && Array.isArray(res.foodOrders)) ? res.foodOrders : [];

      // Also collect any food orders attached to current reservations for this restaurant
      const reservationOrders: FoodOrder[] = [];
      (reservations || []).forEach((r) => {
        if (r.foodOrder && Array.isArray(r.foodOrder.items) && r.foodOrder.items.length > 0) {
          const rawTotal = r.foodOrder.foodTotal !== undefined && r.foodOrder.foodTotal !== null
            ? normalizePrice(r.foodOrder.foodTotal)
            : calculateOrderTotal(r.foodOrder.items);

          reservationOrders.push({
            foodOrderId: r.foodOrder.foodOrderId || `fo-${r.id}`,
            reservationId: r.id,
            userId: r.userId || 'usr-guest',
            restaurantId: restaurant.id,
            tableId: r.tableId || 'tbl-auto',
            tableNumber: r.tableNumber,
            date: r.date,
            time: r.timeSlot,
            items: r.foodOrder.items,
            foodTotal: rawTotal,
            status: r.foodOrder.status || 'Pending',
            createdAt: r.foodOrder.createdAt || r.createdAt,
            updatedAt: r.foodOrder.updatedAt || r.createdAt,
            customerName: r.customerName,
            hasAllergenAlert: r.foodOrder.hasAllergenAlert,
            allergenSummary: r.foodOrder.allergenSummary,
          } as FoodOrder);
        }
      });

      // Merge backend orders with reservation pre-orders (preferring backend updates)
      const orderMap = new Map<string, FoodOrder>();
      reservationOrders.forEach((o) => {
        const key = (o.foodOrderId || o.id || o.reservationId || '').toString().toLowerCase();
        if (key) orderMap.set(key, o);
      });
      backendOrders.forEach((o) => {
        const key = (o.foodOrderId || o.id || o.reservationId || '').toString().toLowerCase();
        if (key) {
          const existing = orderMap.get(key);
          orderMap.set(key, {
            ...o,
            customerName: (o as any).customerName || existing?.customerName || reservationsMap.get(o.reservationId)?.customerName,
            tableNumber: o.tableNumber || existing?.tableNumber || reservationsMap.get(o.reservationId)?.tableNumber,
          });
        } else {
          orderMap.set(key || `order-${orderMap.size + 1}`, o);
        }
      });

      const uniqueOrders = Array.from(orderMap.values());
      setOrders(uniqueOrders);

      // Populate initial acknowledgment map
      const initialAcks: Record<string, boolean> = {};
      uniqueOrders.forEach((o) => {
        const id = o.foodOrderId || o.id || '';
        initialAcks[id] = o.kitchenAcknowledged || isKitchenAllergenAcknowledged(id);
      });
      setAcknowledgedMap(initialAcks);

      const timeStr = formatTimeIST(new Date());
      setLastSyncTime(timeStr);
      if (showToast && onToast) {
        onToast(`Synchronized ${uniqueOrders.length} food orders.`);
      }
    } catch (err: any) {
      console.warn('Failed to load food orders:', err);
      if (showToast && onToast) {
        onToast('Error loading food orders from backend.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [restaurant.id]);

  // Status update handler: passes valid foodOrderId and restaurantId to backend
  const handleStatusChange = async (targetOrderId: string, newStatus: FoodOrderStatus) => {
    const resolvedOrderId = (targetOrderId || '').toString().trim();
    if (!resolvedOrderId) {
      if (onToast) {
        onToast('Error: Unable to identify food order ID.');
      }
      return;
    }

    setUpdatingOrderId(resolvedOrderId);
    try {
      const res = await updateFoodOrderStatusOnBackend(resolvedOrderId, restaurant.id, newStatus);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            (o.foodOrderId === resolvedOrderId || o.id === resolvedOrderId)
              ? { ...o, status: newStatus, updatedAt: res.updatedAt || new Date().toISOString() }
              : o
          )
        );
        if (onToast) {
          onToast(`Order status updated to "${newStatus}".`);
        }
      } else {
        if (onToast) {
          onToast(res.message || 'Could not update status.');
        }
      }
    } catch (err: any) {
      if (onToast) {
        onToast('Failed to update status.');
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Kitchen allergen safety protocol acknowledgment toggle
  const handleToggleKitchenAck = (orderId: string) => {
    const current = Boolean(acknowledgedMap[orderId] ?? isKitchenAllergenAcknowledged(orderId));
    const next = !current;
    setKitchenAllergenAcknowledged(orderId, next);
    setAcknowledgedMap((prev) => ({ ...prev, [orderId]: next }));
    if (onToast) {
      onToast(
        next 
          ? 'Kitchen safety protocol & cross-contamination check confirmed for this order.'
          : 'Safety acknowledgment cleared.'
      );
    }
  };

  // Filtered orders with status, allergen toggle, and search query
  const filteredOrders = useMemo(() => {
    const seen = new Set<string>();
    return orders.filter((order) => {
      const orderIdStr = (order.foodOrderId || order.id || order.reservationId || '').toString();
      if (seen.has(orderIdStr)) return false;

      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Allergen filter
      if (allergenOnlyFilter) {
        const allergenMeta = computeOrderAllergenSummary(order.items || []);
        if (!allergenMeta.hasAllergenAlert && !order.hasAllergenAlert) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchedRes = reservationsMap.get(order.reservationId);
        const customerName = matchedRes?.customerName?.toLowerCase() || order.customerName?.toLowerCase() || '';
        const bookingRef = matchedRes?.bookingRef?.toLowerCase() || '';
        const tableNum = (matchedRes?.tableNumber || order.tableNumber || order.tableId || '').toLowerCase();
        const itemNames = (order.items || []).map((i) => i.name.toLowerCase()).join(' ');
        const idSearch = orderIdStr.toLowerCase();
        const dinerNames = (order.items || []).map((i) => (i.intendedFor || '').toLowerCase()).join(' ');
        const allergenNotes = (order.items || []).map((i) => `${(i.allergenTags || []).join(' ')} ${i.dietaryTag || ''} ${i.kitchenNotes || ''}`).join(' ').toLowerCase();

        const matches = (
          customerName.includes(query) ||
          bookingRef.includes(query) ||
          tableNum.includes(query) ||
          itemNames.includes(query) ||
          idSearch.includes(query) ||
          dinerNames.includes(query) ||
          allergenNotes.includes(query)
        );
        if (!matches) return false;
      }

      seen.add(orderIdStr);
      return true;
    });
  }, [orders, statusFilter, allergenOnlyFilter, searchQuery, reservationsMap]);

  // Aggregate stats
  const totalVolume = useMemo(() => {
    return orders.reduce((sum, o) => {
      const orderTotal = o.foodTotal !== undefined && o.foodTotal !== null && !isNaN(Number(o.foodTotal)) && Number(o.foodTotal) > 0
        ? normalizePrice(o.foodTotal)
        : calculateOrderTotal(o.items);
      return sum + orderTotal;
    }, 0);
  }, [orders]);

  const pendingCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Pending' || o.status === 'Accepted' || o.status === 'Preparing').length;
  }, [orders]);

  const readyCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Ready').length;
  }, [orders]);

  const allergenOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      const meta = computeOrderAllergenSummary(o.items || []);
      return meta.hasAllergenAlert || o.hasAllergenAlert;
    }).length;
  }, [orders]);

  const getStatusBadgeClass = (status: FoodOrderStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Accepted':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Preparing':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Ready':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Served':
        return 'bg-stone-100 text-stone-700 border-stone-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150" id="section-food-orders">
      
      {/* Header & Controls */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                Kitchen Queue & Allergen Safety Preparation
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Live Kitchen Sync
              </span>
            </div>
            <p className="text-xs text-[#2C3333]/60 mt-0.5">
              Customer food pre-orders for {restaurant.name} with per-dish dietary & allergen safety tagging
              {lastSyncTime && (
                <span className="ml-1 text-[11px] text-[#4F6F52] font-mono">
                  • Last synced: {lastSyncTime}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => loadOrders(true)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-full text-xs font-semibold text-[#4F6F52] hover:text-white bg-[#4F6F5214] hover:bg-[#4F6F52] border border-[#4F6F52]/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              id="sync-food-orders-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Orders'}</span>
            </button>
            <span className="text-xs text-[#2C3333]/70 font-semibold bg-[#FAF9F6] px-3.5 py-2 rounded-full border border-[#E8E6E1]">
              Total: {orders.length} Orders
            </span>
          </div>
        </div>

        {/* Metrics Row (4 cards including Dietary & Allergen Alerts) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50">
                In Kitchen / Pending
              </span>
              <p className="text-2xl font-bold font-serif text-[#2C3333] mt-0.5">
                {pendingCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50">
                Ready to Serve
              </span>
              <p className="text-2xl font-bold font-serif text-emerald-800 mt-0.5">
                {readyCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/70">
                Allergen & Dietary Alerts
              </span>
              <p className="text-2xl font-bold font-serif text-amber-900 mt-0.5">
                {allergenOrdersCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50">
                Pre-Order Food Total
              </span>
              <p className="text-2xl font-bold font-serif text-[#4F6F52] mt-0.5">
                ₹{totalVolume.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(['all', 'Pending', 'Accepted', 'Preparing', 'Ready', 'Served', 'Cancelled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                  statusFilter === st
                    ? 'bg-[#2C3333] text-white'
                    : 'bg-[#FAF9F6] hover:bg-[#FAF9F6]/80 text-[#2C3333]/70 border border-[#E8E6E1]'
                }`}
              >
                {st === 'all' ? 'All Orders' : st}
              </button>
            ))}

            {/* Special Allergen & Dietary Toggle */}
            <button
              type="button"
              id="allergen-only-filter-btn"
              onClick={() => setAllergenOnlyFilter(!allergenOnlyFilter)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                allergenOnlyFilter
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-300'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Allergens Only ({allergenOrdersCount})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-[#2C3333]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table, diner name, allergen, or dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
            />
          </div>
        </div>
      </div>

      {/* Orders Grid / Empty state */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E8E6E1] text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto border border-amber-200">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold font-serif text-[#2C3333]">
            {orders.length === 0 ? 'No Food Pre-Orders Yet' : 'No Matching Orders'}
          </h4>
          <p className="text-xs text-[#2C3333]/60 max-w-sm mx-auto">
            {orders.length === 0
              ? 'When diners pre-order dishes during or after booking their table, orders will appear here automatically with kitchen allergen instructions.'
              : 'Try changing your status filter, turning off the allergen filter, or refining your search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="food-orders-list">
          {filteredOrders.map((order) => {
            const res = reservationsMap.get(order.reservationId);
            const orderUniqueId = (order.foodOrderId || order.id || '').toString();
            const isUpdating = updatingOrderId === orderUniqueId || updatingOrderId === order.foodOrderId || updatingOrderId === order.id;
            const safeOrderTotal = order.foodTotal !== undefined && order.foodTotal !== null && !isNaN(Number(order.foodTotal)) && Number(order.foodTotal) > 0
              ? normalizePrice(order.foodTotal)
              : calculateOrderTotal(order.items);

            const allergenMeta = computeOrderAllergenSummary(order.items || []);
            const hasAllergens = allergenMeta.hasAllergenAlert || Boolean(order.hasAllergenAlert);
            const isAck = Boolean(acknowledgedMap[orderUniqueId] ?? isKitchenAllergenAcknowledged(orderUniqueId));

            return (
              <div
                key={orderUniqueId}
                className={`bg-white rounded-3xl border transition-all space-y-4 p-5 sm:p-6 shadow-xs hover:shadow-sm ${
                  hasAllergens 
                    ? 'border-amber-300 ring-1 ring-amber-200/60' 
                    : 'border-[#E8E6E1]'
                }`}
                id={`order-card-${orderUniqueId}`}
              >
                {/* Top Card Bar */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E8E6E1]">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold font-serif text-[#2C3333]">
                        {res ? `Table ${res.tableNumber}` : `Table ${order.tableNumber || order.tableId || 'N/A'}`}
                      </span>
                      <span className="text-xs text-[#2C3333]/80 font-semibold">
                        • {res?.customerName || order.customerName || (order.userId ? `Guest (${order.userId})` : 'Guest Diner')}
                      </span>
                      {hasAllergens && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          Special Prep Alert
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#2C3333]/50 flex items-center gap-2 mt-0.5">
                      <Calendar className="w-3 h-3 text-[#4F6F52]" />
                      <span>{order.date || res?.date || 'Today'}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3 text-[#4F6F52]" />
                      <span>{order.time || res?.timeSlot || 'Scheduled'}</span>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={order.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(orderUniqueId, e.target.value as FoodOrderStatus)}
                      className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer outline-none transition-all ${getStatusBadgeClass(
                        order.status
                      )} ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                      id={`status-select-${orderUniqueId}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Preparing">Preparing</option>
                      <option value="Ready">Ready</option>
                      <option value="Served">Served</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Travelling Customer / Travel Parcel Arrival & Kitchen Timing Banner */}
                {res?.travelDetails && (
                  <div className="p-3 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 shadow-2xs">
                        <Bus className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                          <span>
                            {res.travelDetails.fulfillmentType === 'parcel'
                              ? `Travel Parcel – Expected Collection ${res.travelDetails.expectedArrivalTime || res.timeIn}`
                              : `Travelling Customer – Expected Arrival ${res.travelDetails.expectedArrivalTime || res.timeIn}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-900/80">
                          {res.travelDetails.busOperator || 'Bus Transit'} {res.travelDetails.routeNumber ? `• ${res.travelDetails.routeNumber}` : ''} ({res.travelDetails.passengerCount || res.guests} Passengers) • Stop: {res.travelDetails.busStopName || 'En-route Stop'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] uppercase tracking-wider text-amber-900/70 block font-bold">Prep Timing:</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                        res.travelDetails.prepStatus === 'Ready'
                          ? 'bg-emerald-600 text-white'
                          : res.travelDetails.prepStatus === 'Preparing'
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-amber-100 text-amber-950 border border-amber-300'
                      }`}>
                        {res.travelDetails.prepStatus || 'Prepare Soon'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Prominent Kitchen Allergen Alert & Cross-Contamination Check Banner */}
                {hasAllergens && (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Special Dietary & Allergen Requirements (Before Cooking):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {allergenMeta.dinerDietaryBreakdown.map((b, bIdx) => (
                            <span 
                              key={bIdx} 
                              className="text-[11px] bg-white text-amber-950 px-2 py-0.5 rounded-lg border border-amber-300 font-semibold shadow-2xs"
                            >
                              👤 <strong>{b.diner}</strong>: {b.requirements.join(', ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Kitchen Safety Protocol Acknowledgment */}
                    <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] text-amber-800 font-mono">
                        Zero cross-contamination • Sanitized woks & cookware required
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleKitchenAck(orderUniqueId)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isAck
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'bg-white text-amber-950 border border-amber-400 hover:bg-amber-100/80'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAck ? '✓ Kitchen Protocol Confirmed' : 'Acknowledge Kitchen Safety'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Ordered Items List with Per-Dish Allergen/Dietary & Diner Assignment */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 block">
                    Dishes in Kitchen Queue ({(order.items || []).length})
                  </span>
                  <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1] space-y-2.5 max-h-56 overflow-y-auto">
                    {(order.items || []).map((item, idx) => {
                      const itemLineTotal = item.total !== undefined && item.total !== null && !isNaN(Number(item.total))
                        ? normalizePrice(item.total)
                        : calculateItemTotal(item.unitPrice ?? item.price, item.quantity);

                      const hasItemTags =
                        (item.allergenTags && item.allergenTags.length > 0) ||
                        (item.dietaryTag && item.dietaryTag !== 'Standard') ||
                        Boolean(item.kitchenNotes);

                      return (
                        <div 
                          key={idx} 
                          className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                            hasItemTags ? 'bg-white border-amber-200/80 shadow-2xs' : 'bg-white/60 border-stone-200/60'
                          }`}
                        >
                          {/* Dish header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#4F6F52] bg-stone-100 px-2 py-0.5 rounded-md border border-[#E8E6E1]">
                                {item.quantity}×
                              </span>
                              <span className="font-bold text-[#2C3333]">{item.name}</span>
                            </div>
                            <span className="font-semibold text-[#2C3333]">
                              {formatINR(itemLineTotal)}
                            </span>
                          </div>

                          {/* Diner & Dietary / Allergen badges */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            {item.intendedFor && (
                              <span className="bg-stone-100 text-stone-800 px-2 py-0.5 rounded-md font-bold border border-stone-200">
                                👤 {item.intendedFor}
                              </span>
                            )}

                            {item.dietaryTag && item.dietaryTag !== 'Standard' && (
                              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                                🌱 {item.dietaryTag}
                              </span>
                            )}

                            {Array.isArray(item.allergenTags) && item.allergenTags.map((alg) => (
                              <span 
                                key={alg} 
                                className={`px-2 py-0.5 rounded-md font-bold border ${
                                  item.severity === 'severe'
                                    ? 'bg-rose-50 text-rose-900 border-rose-300'
                                    : 'bg-amber-50 text-amber-900 border-amber-300'
                                }`}
                              >
                                🚨 {alg} {item.severity === 'severe' ? '[Severe]' : ''}
                              </span>
                            ))}
                          </div>

                          {/* Chef Note */}
                          {item.kitchenNotes && (
                            <div className="text-[10px] text-amber-900 bg-amber-50 p-1.5 rounded-md font-mono border border-amber-200/60">
                              👨‍🍳 Prep Note: {item.kitchenNotes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Order Details & Total */}
                <div className="pt-2 flex items-center justify-between text-xs border-t border-[#E8E6E1]/80">
                  <div>
                    <span className="text-[10px] text-[#2C3333]/50 block font-mono">
                      Ref: {res?.bookingRef || order.reservationId?.slice(0, 8) || orderUniqueId.slice(0, 8)}
                    </span>
                    <span className="text-[10px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Billed tableside
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#2C3333]/50 block uppercase font-bold tracking-wider">
                      Pre-Order Total
                    </span>
                    <span className="text-base font-bold font-serif text-[#4F6F52]">
                      {formatINR(safeOrderTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
