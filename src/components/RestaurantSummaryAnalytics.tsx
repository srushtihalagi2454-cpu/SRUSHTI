import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  UtensilsCrossed, 
  Users, 
  Calendar, 
  Clock, 
  Sun, 
  Sunset, 
  Moon, 
  Coffee, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  TrendingUp, 
  Info, 
  Sparkles, 
  Flame, 
  Leaf,
  ChevronRight,
  Bus,
  Radio,
  Armchair
} from 'lucide-react';
import { 
  Restaurant, 
  Reservation, 
  FoodOrder, 
  MenuItem, 
  SmartArrivalRecord 
} from '../types';
import { getRestaurantMenu } from '../data/restaurantMenus';
import { formatINR } from '../utils/priceUtils';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type TimePeriodSlot = 'breakfast' | 'lunch' | 'evening' | 'dinner';
export type DateRangePreset = 'all' | 'today' | 'this_week' | 'last_week' | 'custom';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday', 
  'Tuesday', 
  'Wednesday', 
  'Thursday', 
  'Friday', 
  'Saturday', 
  'Sunday'
];

const TIME_PERIOD_CONFIG: Record<
  TimePeriodSlot, 
  { label: string; range: string; icon: typeof Coffee; color: string; bg: string; text: string; hoursDesc: string }
> = {
  breakfast: {
    label: 'Breakfast (Morning)',
    range: '6 AM – 11 AM',
    icon: Coffee,
    color: '#D97706',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    hoursDesc: '06:00 - 11:00',
  },
  lunch: {
    label: 'Lunch (Afternoon)',
    range: '11 AM – 3 PM',
    icon: Sun,
    color: '#059669',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    hoursDesc: '11:00 - 15:00',
  },
  evening: {
    label: 'Evening',
    range: '3 PM – 7 PM',
    icon: Sunset,
    color: '#D97706',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    hoursDesc: '15:00 - 19:00',
  },
  dinner: {
    label: 'Dinner (Night)',
    range: '7 PM – 11 PM',
    icon: Moon,
    color: '#4F46E5',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    hoursDesc: '19:00 - 23:00',
  },
};

const DAY_COLORS: Record<DayOfWeek, string> = {
  Monday: '#4F6F52',    // Forest Green
  Tuesday: '#2E7D32',   // Emerald
  Wednesday: '#0D9488', // Teal
  Thursday: '#2563EB',  // Royal Blue
  Friday: '#7C3AED',    // Violet
  Saturday: '#D97706',  // Amber
  Sunday: '#DC2626',    // Crimson
};

// Helper: Normalize date string to YYYY-MM-DD
function parseRecordDate(dateStr?: string, createdAt?: string): string | null {
  if (dateStr) {
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

// Helper: Extract Day of Week from record
function getDayOfWeek(dateStr?: string, createdAt?: string): DayOfWeek | null {
  const normalized = parseRecordDate(dateStr, createdAt);
  if (!normalized) return null;
  const [y, m, d] = normalized.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayIdx = dateObj.getDay(); // 0 is Sunday
  const map: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return map[dayIdx] || null;
}

// Helper: Extract 24-hour hour from timestamps/strings
function extractHourFromRecord(
  timeStr?: string,
  timeSlot?: string,
  timeIn?: string,
  createdAt?: string,
  clockInTime?: string
): number | null {
  const candidates = [timeStr, timeIn, timeSlot, clockInTime, createdAt];
  for (const c of candidates) {
    if (!c) continue;
    // 12-hour format: "08:15 PM" or "8:15 PM"
    const match12 = c.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const isPM = match12[3].toUpperCase() === 'PM';
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return h;
    }
    // ISO string
    if (c.includes('T') || c.includes('Z')) {
      const d = new Date(c);
      if (!isNaN(d.getTime())) return d.getHours();
    }
    // 24-hour format: "19:30"
    const match24 = c.match(/(\d{1,2}):(\d{2})/);
    if (match24) {
      const h = parseInt(match24[1], 10);
      if (h >= 0 && h <= 23) return h;
    }
  }
  return null;
}

// Map hour to time slot
function mapHourToTimePeriod(hour: number | null): TimePeriodSlot {
  if (hour === null) return 'dinner';
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 19) return 'evening';
  return 'dinner'; // 19 to 23, plus late night
}

interface RestaurantSummaryAnalyticsProps {
  restaurant: Restaurant;
  reservations: Reservation[];
  foodOrders: FoodOrder[];
  activeSmartArrivalGuests?: Array<{
    arrival: SmartArrivalRecord;
    reservation: Reservation;
  }>;
  liveArrivalRecords?: SmartArrivalRecord[];
}

interface ItemDemandStat {
  item: MenuItem;
  quantity: number;
  totalRevenue: number;
  ordersCount: number;
  percentageOfSlot?: number;
}

export const RestaurantSummaryAnalytics: React.FC<RestaurantSummaryAnalyticsProps> = ({
  restaurant,
  reservations,
  foodOrders,
  activeSmartArrivalGuests = [],
  liveArrivalRecords = [],
}) => {
  // Top Filter States
  const [selectedDayFilter, setSelectedDayFilter] = useState<'all' | DayOfWeek>('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'all' | TimePeriodSlot>('all');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Interactive UI Hover & Sub-view states
  const [activeDayBarDay, setActiveDayBarDay] = useState<DayOfWeek>('Monday');
  const [activeTimeBarSlot, setActiveTimeBarSlot] = useState<TimePeriodSlot>('lunch');
  const [hoveredPieDay, setHoveredPieDay] = useState<DayOfWeek | null>(null);
  const [hoveredPieTimeSlot, setHoveredPieTimeSlot] = useState<TimePeriodSlot | null>(null);

  // Sync sub-tabs with top filters when top filters are explicitly set
  const activeDayForDayChart = selectedDayFilter === 'all' ? activeDayBarDay : selectedDayFilter;
  const activeTimeForTimeChart = selectedTimeFilter === 'all' ? activeTimeBarSlot : selectedTimeFilter;

  // 1. Digital Menu Resolution (Strict Menu Validation)
  const restaurantMenu = useMemo(() => {
    if (restaurant.menu && restaurant.menu.categories && restaurant.menu.categories.length > 0) {
      return restaurant.menu;
    }
    return getRestaurantMenu(restaurant.id, restaurant.name, restaurant.cuisines);
  }, [restaurant]);

  // Flattened valid menu items for this restaurant
  const digitalMenuItems = useMemo(() => {
    const list: MenuItem[] = [];
    restaurantMenu.categories.forEach((cat) => {
      cat.items.forEach((item) => list.push(item));
    });
    return list;
  }, [restaurantMenu]);

  // Fast map matching canonical items in this restaurant's menu
  const validMenuMap = useMemo(() => {
    const map = new Map<string, MenuItem>();
    digitalMenuItems.forEach((item) => {
      map.set(item.name.toLowerCase().trim(), item);
      if (item.id) map.set(item.id.toLowerCase().trim(), item);
    });
    return map;
  }, [digitalMenuItems]);

  // Reference date for date range filtering (Current simulated date: 2026-11-04)
  const referenceDate = useMemo(() => {
    const now = new Date();
    // Default fallback to 2026-11-04 if system time differs
    return isNaN(now.getTime()) ? new Date('2026-11-04') : now;
  }, []);

  // Filter checker for date range
  const isDateWithinRange = (dateStr: string | null): boolean => {
    if (!dateStr) return dateRangePreset === 'all';
    if (dateRangePreset === 'all') return true;

    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    if (isNaN(targetDate.getTime())) return true;

    if (dateRangePreset === 'today') {
      const todayY = referenceDate.getFullYear();
      const todayM = referenceDate.getMonth();
      const todayD = referenceDate.getDate();
      return (
        targetDate.getFullYear() === todayY &&
        targetDate.getMonth() === todayM &&
        targetDate.getDate() === todayD
      );
    }

    if (dateRangePreset === 'this_week') {
      const dayOfWeek = referenceDate.getDay() || 7; // 1 = Mon, 7 = Sun
      const monday = new Date(referenceDate);
      monday.setDate(referenceDate.getDate() - dayOfWeek + 1);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      return targetDate >= monday && targetDate <= sunday;
    }

    if (dateRangePreset === 'last_week') {
      const dayOfWeek = referenceDate.getDay() || 7;
      const prevMonday = new Date(referenceDate);
      prevMonday.setDate(referenceDate.getDate() - dayOfWeek - 6);
      prevMonday.setHours(0, 0, 0, 0);

      const prevSunday = new Date(prevMonday);
      prevSunday.setDate(prevMonday.getDate() + 6);
      prevSunday.setHours(23, 59, 59, 999);

      return targetDate >= prevMonday && targetDate <= prevSunday;
    }

    if (dateRangePreset === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      if (customStartDate && customEndDate) {
        return dateStr >= customStartDate && dateStr <= customEndDate;
      }
      if (customStartDate) return dateStr >= customStartDate;
      if (customEndDate) return dateStr <= customEndDate;
    }

    return true;
  };

  // Filter restaurant-specific reservations
  const restaurantReservations = useMemo(() => {
    return reservations.filter((r) => {
      // Must belong strictly to this restaurant
      if (r.restaurantId !== restaurant.id) return false;
      // Exclude cancelled bookings from crowd & demand
      if (r.status === 'cancelled' || r.cancellationStatus === 'cancelled') return false;

      const dateStr = parseRecordDate(r.date, r.createdAt);
      if (!isDateWithinRange(dateStr)) return false;

      // Apply top day filter if active
      if (selectedDayFilter !== 'all') {
        const day = getDayOfWeek(r.date, r.createdAt);
        if (day !== selectedDayFilter) return false;
      }

      // Apply top time filter if active
      if (selectedTimeFilter !== 'all') {
        const hour = extractHourFromRecord(undefined, r.timeSlot, r.timeIn, r.createdAt, r.clockInTime);
        const slot = mapHourToTimePeriod(hour);
        if (slot !== selectedTimeFilter) return false;
      }

      return true;
    });
  }, [reservations, restaurant.id, dateRangePreset, customStartDate, customEndDate, selectedDayFilter, selectedTimeFilter]);

  // Collect and normalize all Food Order Line Items with Day and Time Slot
  interface NormalizedOrderItem {
    menuItem: MenuItem;
    quantity: number;
    unitPrice: number;
    dayOfWeek: DayOfWeek;
    timeSlot: TimePeriodSlot;
    orderDate: string | null;
    orderSource: 'reservation_preorder' | 'dining_bill' | 'standalone_order';
  }

  const allNormalizedOrderItems = useMemo(() => {
    const list: NormalizedOrderItem[] = [];
    const processedOrderIds = new Set<string>();

    // 1. Process food orders linked to reservations
    reservations.forEach((res) => {
      if (res.restaurantId !== restaurant.id) return;
      if (res.status === 'cancelled' || res.cancellationStatus === 'cancelled') return;

      const resDateStr = parseRecordDate(res.date, res.createdAt);
      const resDay = getDayOfWeek(res.date, res.createdAt) || 'Monday';
      const resHour = extractHourFromRecord(
        res.foodOrder?.time,
        res.timeSlot,
        res.timeIn,
        res.createdAt,
        res.clockInTime
      );
      const resSlot = mapHourToTimePeriod(resHour);

      if (res.foodOrder && res.foodOrder.items && Array.isArray(res.foodOrder.items)) {
        const orderId = res.foodOrder.id || res.foodOrder.foodOrderId || res.id;
        processedOrderIds.add(orderId);

        res.foodOrder.items.forEach((item) => {
          const key = (item.name || '').toLowerCase().trim();
          const idKey = (item.itemId || '').toLowerCase().trim();
          const menuItem = validMenuMap.get(key) || validMenuMap.get(idKey);

          // STRICT: Do not display food items that are not available in the restaurant's menu
          if (menuItem) {
            list.push({
              menuItem,
              quantity: Math.max(1, Number(item.quantity) || 1),
              unitPrice: menuItem.price || Number(item.unitPrice) || 0,
              dayOfWeek: resDay,
              timeSlot: resSlot,
              orderDate: resDateStr,
              orderSource: 'reservation_preorder',
            });
          }
        });
      }

      // Dining bill items (if foodOrder was itemized only in bill)
      if (res.diningBill && res.diningBill.items && Array.isArray(res.diningBill.items) && !res.foodOrder) {
        res.diningBill.items.forEach((billItem) => {
          const key = (billItem.name || '').toLowerCase().trim();
          const menuItem = validMenuMap.get(key);
          if (menuItem) {
            list.push({
              menuItem,
              quantity: Math.max(1, Number(billItem.quantity) || 1),
              unitPrice: menuItem.price || Number(billItem.unitPrice) || 0,
              dayOfWeek: resDay,
              timeSlot: resSlot,
              orderDate: resDateStr,
              orderSource: 'dining_bill',
            });
          }
        });
      }
    });

    // 2. Process standalone foodOrders
    foodOrders.forEach((fo) => {
      if (fo.restaurantId !== restaurant.id) return;
      const orderId = fo.id || fo.foodOrderId;
      if (orderId && processedOrderIds.has(orderId)) return;
      if (orderId) processedOrderIds.add(orderId);

      const foDateStr = parseRecordDate(fo.date, fo.createdAt);
      const foDay = getDayOfWeek(fo.date, fo.createdAt) || 'Monday';
      const foHour = extractHourFromRecord(fo.time, undefined, undefined, fo.createdAt, undefined);
      const foSlot = mapHourToTimePeriod(foHour);

      if (fo.items && Array.isArray(fo.items)) {
        fo.items.forEach((item) => {
          const key = (item.name || '').toLowerCase().trim();
          const idKey = (item.itemId || '').toLowerCase().trim();
          const menuItem = validMenuMap.get(key) || validMenuMap.get(idKey);
          if (menuItem) {
            list.push({
              menuItem,
              quantity: Math.max(1, Number(item.quantity) || 1),
              unitPrice: menuItem.price || Number(item.unitPrice) || 0,
              dayOfWeek: foDay,
              timeSlot: foSlot,
              orderDate: foDateStr,
              orderSource: 'standalone_order',
            });
          }
        });
      }
    });

    return list;
  }, [reservations, foodOrders, restaurant.id, validMenuMap]);

  // Filtered order items respecting Date Range and top filters
  const filteredOrderItems = useMemo(() => {
    return allNormalizedOrderItems.filter((item) => {
      if (!isDateWithinRange(item.orderDate)) return false;
      if (selectedDayFilter !== 'all' && item.dayOfWeek !== selectedDayFilter) return false;
      if (selectedTimeFilter !== 'all' && item.timeSlot !== selectedTimeFilter) return false;
      return true;
    });
  }, [allNormalizedOrderItems, dateRangePreset, customStartDate, customEndDate, selectedDayFilter, selectedTimeFilter]);

  // =========================================================================
  // REQUIREMENT 1: DAY-WISE MOST DEMANDED FOOD (BAR CHART)
  // =========================================================================
  // Aggregate demand by Day of Week: Monday -> Sunday
  const dayWiseItemDemand = useMemo(() => {
    const dayMap: Record<DayOfWeek, Record<string, ItemDemandStat>> = {
      Monday: {},
      Tuesday: {},
      Wednesday: {},
      Thursday: {},
      Friday: {},
      Saturday: {},
      Sunday: {},
    };

    allNormalizedOrderItems.forEach((orderItem) => {
      if (!isDateWithinRange(orderItem.orderDate)) return;
      if (selectedTimeFilter !== 'all' && orderItem.timeSlot !== selectedTimeFilter) return;

      const targetDay = orderItem.dayOfWeek;
      const itemName = orderItem.menuItem.name;

      if (!dayMap[targetDay][itemName]) {
        dayMap[targetDay][itemName] = {
          item: orderItem.menuItem,
          quantity: 0,
          totalRevenue: 0,
          ordersCount: 0,
        };
      }
      dayMap[targetDay][itemName].quantity += orderItem.quantity;
      dayMap[targetDay][itemName].totalRevenue += orderItem.quantity * orderItem.unitPrice;
      dayMap[targetDay][itemName].ordersCount += 1;
    });

    // Top 5 items per day
    const top5PerDay: Record<DayOfWeek, ItemDemandStat[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    DAYS_OF_WEEK.forEach((day) => {
      const items = Object.values(dayMap[day]) as ItemDemandStat[];
      top5PerDay[day] = items
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    });

    return { dayMap, top5PerDay };
  }, [allNormalizedOrderItems, dateRangePreset, customStartDate, customEndDate, selectedTimeFilter]);

  // Overall weekly comparison data for food demand
  const weeklyTotalDemandPerDay = useMemo(() => {
    return DAYS_OF_WEEK.map((day) => {
      const items = Object.values(dayWiseItemDemand.dayMap[day]) as ItemDemandStat[];
      const totalQty = items.reduce((acc, curr) => acc + curr.quantity, 0);
      const topItem = items.sort((a, b) => b.quantity - a.quantity)[0];
      return {
        day,
        totalQuantity: totalQty,
        topItemName: topItem ? topItem.item.name : 'None',
        topItemQty: topItem ? topItem.quantity : 0,
      };
    });
  }, [dayWiseItemDemand]);

  const maxWeeklyDayQuantity = useMemo(() => {
    const max = Math.max(...weeklyTotalDemandPerDay.map((d) => d.totalQuantity), 1);
    return max;
  }, [weeklyTotalDemandPerDay]);

  // Active items for Day-wise chart (top 5 for currently active day)
  const currentDayTop5 = useMemo(() => {
    return dayWiseItemDemand.top5PerDay[activeDayForDayChart] || [];
  }, [dayWiseItemDemand, activeDayForDayChart]);

  const maxCurrentDayItemQty = useMemo(() => {
    return currentDayTop5.length > 0 ? currentDayTop5[0].quantity : 1;
  }, [currentDayTop5]);

  // =========================================================================
  // REQUIREMENT 2: TIME-WISE MOST DEMANDED FOOD (BAR CHART)
  // =========================================================================
  // Divide into: Breakfast (6-11), Lunch (11-15), Evening (15-19), Dinner (19-23)
  const timeWiseItemDemand = useMemo(() => {
    const timeMap: Record<TimePeriodSlot, Record<string, ItemDemandStat>> = {
      breakfast: {},
      lunch: {},
      evening: {},
      dinner: {},
    };

    allNormalizedOrderItems.forEach((orderItem) => {
      if (!isDateWithinRange(orderItem.orderDate)) return;
      if (selectedDayFilter !== 'all' && orderItem.dayOfWeek !== selectedDayFilter) return;

      const targetSlot = orderItem.timeSlot;
      const itemName = orderItem.menuItem.name;

      if (!timeMap[targetSlot][itemName]) {
        timeMap[targetSlot][itemName] = {
          item: orderItem.menuItem,
          quantity: 0,
          totalRevenue: 0,
          ordersCount: 0,
        };
      }
      timeMap[targetSlot][itemName].quantity += orderItem.quantity;
      timeMap[targetSlot][itemName].totalRevenue += orderItem.quantity * orderItem.unitPrice;
      timeMap[targetSlot][itemName].ordersCount += 1;
    });

    const topPerSlot: Record<TimePeriodSlot, ItemDemandStat[]> = {
      breakfast: [],
      lunch: [],
      evening: [],
      dinner: [],
    };

    const slotTotals: Record<TimePeriodSlot, number> = {
      breakfast: 0,
      lunch: 0,
      evening: 0,
      dinner: 0,
    };

    (['breakfast', 'lunch', 'evening', 'dinner'] as TimePeriodSlot[]).forEach((slot) => {
      const items = Object.values(timeMap[slot]) as ItemDemandStat[];
      const totalSlotQty = items.reduce((acc, curr) => acc + curr.quantity, 0);
      slotTotals[slot] = totalSlotQty;

      topPerSlot[slot] = items
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map((it) => ({
          ...it,
          percentageOfSlot: totalSlotQty > 0 ? Math.round((it.quantity / totalSlotQty) * 100) : 0,
        }));
    });

    return { timeMap, topPerSlot, slotTotals };
  }, [allNormalizedOrderItems, dateRangePreset, customStartDate, customEndDate, selectedDayFilter]);

  const currentTimeSlotTopItems = useMemo(() => {
    return timeWiseItemDemand.topPerSlot[activeTimeForTimeChart] || [];
  }, [timeWiseItemDemand, activeTimeForTimeChart]);

  const maxTimeSlotItemQty = useMemo(() => {
    return currentTimeSlotTopItems.length > 0 ? currentTimeSlotTopItems[0].quantity : 1;
  }, [currentTimeSlotTopItems]);

  // =========================================================================
  // REQUIREMENT 3: RESTAURANT CROWD ANALYSIS – DAY-WISE PIE CHART
  // =========================================================================
  // Monday to Sunday crowd distribution using actual reservations, walk-ins, travel bookings, and arrivals
  const dayWiseCrowdData = useMemo(() => {
    const dayGuests: Record<DayOfWeek, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    const dayBookings: Record<DayOfWeek, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    const dayCategoryBreakdown: Record<DayOfWeek, { standard: number; travel: number; walkin: number; smartArrival: number }> = {
      Monday: { standard: 0, travel: 0, walkin: 0, smartArrival: 0 },
      Tuesday: { standard: 0, travel: 0, walkin: 0, smartArrival: 0 },
      Wednesday: { standard: 0, travel: 0, walkin: 0, smartArrival: 0 },
      Thursday: { standard: 0, travel: 0, walkin: 0, smartArrival: 0 },
      Friday: { standard: 0, travel: 0, walkin: 0, smartArrival: 0 },
      Saturday: { standard: 0, travel: 0, walkin: 0, smartArrival: 0 },
      Sunday: { standard: 0, travel: 0, walkin: 0, smartArrival: 0 },
    };

    reservations.forEach((r) => {
      if (r.restaurantId !== restaurant.id) return;
      if (r.status === 'cancelled' || r.cancellationStatus === 'cancelled') return;

      const dateStr = parseRecordDate(r.date, r.createdAt);
      if (!isDateWithinRange(dateStr)) return;

      if (selectedTimeFilter !== 'all') {
        const hour = extractHourFromRecord(undefined, r.timeSlot, r.timeIn, r.createdAt, r.clockInTime);
        const slot = mapHourToTimePeriod(hour);
        if (slot !== selectedTimeFilter) return;
      }

      const day = getDayOfWeek(r.date, r.createdAt) || 'Monday';
      const guestCount = Math.max(1, Number(r.guests) || 2);

      const isTravel = Boolean(
        r.travelDetails?.isTravellingByBus ||
        r.id.includes('travel') ||
        r.bookingRef?.includes('TRV') ||
        r.travelDetails
      );

      const isSmartArrival = Boolean(
        activeSmartArrivalGuests.some((g) => g.reservation.id === r.id) ||
        (liveArrivalRecords && liveArrivalRecords.some((a) => a.reservationId === r.id && a.locationEnabled !== false))
      );

      const isWalkIn = r.status === 'seated' || r.status === 'arrived' || r.status === 'checked-in';

      const actualGuests = isTravel && r.travelDetails?.passengerCount ? r.travelDetails.passengerCount : guestCount;

      dayGuests[day] += actualGuests;
      dayBookings[day] += 1;

      if (isTravel) {
        dayCategoryBreakdown[day].travel += actualGuests;
      } else if (isSmartArrival) {
        dayCategoryBreakdown[day].smartArrival += actualGuests;
      } else if (isWalkIn) {
        dayCategoryBreakdown[day].walkin += actualGuests;
      } else {
        dayCategoryBreakdown[day].standard += actualGuests;
      }
    });

    const totalWeeklyGuests = DAYS_OF_WEEK.reduce((sum, d) => sum + dayGuests[d], 0);

    const slices = DAYS_OF_WEEK.map((day) => {
      const guests = dayGuests[day];
      const percentage = totalWeeklyGuests > 0 ? Math.round((guests / totalWeeklyGuests) * 100) : 0;
      return {
        day,
        guests,
        bookings: dayBookings[day],
        percentage,
        color: DAY_COLORS[day],
        breakdown: dayCategoryBreakdown[day],
      };
    });

    return { slices, totalWeeklyGuests, dayCategoryBreakdown };
  }, [reservations, restaurant.id, dateRangePreset, customStartDate, customEndDate, selectedTimeFilter, activeSmartArrivalGuests, liveArrivalRecords]);

  // =========================================================================
  // REQUIREMENT 4: RESTAURANT CROWD ANALYSIS – TIME-WISE PIE CHART
  // =========================================================================
  // Divide into Morning (6-11), Afternoon (11-15), Evening (15-19), Night (19-23)
  const timeWiseCrowdData = useMemo(() => {
    const slotGuests: Record<TimePeriodSlot, number> = {
      breakfast: 0,
      lunch: 0,
      evening: 0,
      dinner: 0,
    };

    const slotBookings: Record<TimePeriodSlot, number> = {
      breakfast: 0,
      lunch: 0,
      evening: 0,
      dinner: 0,
    };

    reservations.forEach((r) => {
      if (r.restaurantId !== restaurant.id) return;
      if (r.status === 'cancelled' || r.cancellationStatus === 'cancelled') return;

      const dateStr = parseRecordDate(r.date, r.createdAt);
      if (!isDateWithinRange(dateStr)) return;

      // Allow selecting individual days
      if (selectedDayFilter !== 'all') {
        const day = getDayOfWeek(r.date, r.createdAt);
        if (day !== selectedDayFilter) return;
      }

      const hour = extractHourFromRecord(undefined, r.timeSlot, r.timeIn, r.createdAt, r.clockInTime);
      const slot = mapHourToTimePeriod(hour);
      const guestCount = Math.max(1, Number(r.guests) || 2);
      const actualGuests = r.travelDetails?.passengerCount ? r.travelDetails.passengerCount : guestCount;

      slotGuests[slot] += actualGuests;
      slotBookings[slot] += 1;
    });

    const totalSlotGuests = (['breakfast', 'lunch', 'evening', 'dinner'] as TimePeriodSlot[]).reduce(
      (sum, s) => sum + slotGuests[s],
      0
    );

    const slices = (['breakfast', 'lunch', 'evening', 'dinner'] as TimePeriodSlot[]).map((slot) => {
      const guests = slotGuests[slot];
      const percentage = totalSlotGuests > 0 ? Math.round((guests / totalSlotGuests) * 100) : 0;
      return {
        slot,
        label: TIME_PERIOD_CONFIG[slot].label,
        range: TIME_PERIOD_CONFIG[slot].range,
        guests,
        bookings: slotBookings[slot],
        percentage,
        color: TIME_PERIOD_CONFIG[slot].color,
        bg: TIME_PERIOD_CONFIG[slot].bg,
        textColor: TIME_PERIOD_CONFIG[slot].text,
        icon: TIME_PERIOD_CONFIG[slot].icon,
      };
    });

    // Identify Busiest and Least Busy Time Periods
    const sorted = [...slices].sort((a, b) => b.guests - a.guests);
    const busiest = totalSlotGuests > 0 ? sorted[0] : null;
    const leastBusy = totalSlotGuests > 0 ? sorted[sorted.length - 1] : null;

    return { slices, totalSlotGuests, busiest, leastBusy };
  }, [reservations, restaurant.id, dateRangePreset, customStartDate, customEndDate, selectedDayFilter]);

  // Overall Quick KPI Summary Stats
  const kpiStats = useMemo(() => {
    const totalOrdersCount = filteredOrderItems.length;
    const totalFoodQty = filteredOrderItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalGuestsInFilter = restaurantReservations.reduce(
      (acc, curr) => acc + (curr.travelDetails?.passengerCount || curr.guests || 2),
      0
    );

    // Top item overall in filter
    const map: Record<string, number> = {};
    filteredOrderItems.forEach((it) => {
      map[it.menuItem.name] = (map[it.menuItem.name] || 0) + it.quantity;
    });
    let topName = 'No orders';
    let topQty = 0;
    Object.entries(map).forEach(([name, qty]) => {
      if (qty > topQty) {
        topQty = qty;
        topName = name;
      }
    });

    return { totalOrdersCount, totalFoodQty, totalGuestsInFilter, topName, topQty };
  }, [filteredOrderItems, restaurantReservations]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedDayFilter('all');
    setSelectedTimeFilter('all');
    setDateRangePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Helper for rendering SVG Pie / Donut
  const renderSvgDonut = (
    slices: Array<{ key: string; label: string; value: number; percentage: number; color: string }>,
    total: number,
    hoveredKey: string | null,
    onHover: (key: string | null) => void,
    centerTitle: string,
    centerValue: string | number
  ) => {
    if (total === 0) {
      return (
        <div className="relative w-52 h-52 mx-auto flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#E8E6E1" strokeWidth="14" strokeDasharray="238.76" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="text-[11px] font-bold text-[#2C3333]/40 uppercase tracking-wider">No Data</span>
            <span className="text-xl font-extrabold text-[#2C3333]/30">0</span>
          </div>
        </div>
      );
    }

    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return (
      <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {slices.map((slice) => {
            const strokeDash = (slice.percentage / 100) * circumference;
            const strokeDashOffset = -accumulatedOffset;
            accumulatedOffset += strokeDash;

            const isHovered = hoveredKey === slice.key;

            return (
              <circle
                key={slice.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? '17' : '14'}
                strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                strokeDashoffset={strokeDashOffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => onHover(slice.key)}
                onMouseLeave={() => onHover(null)}
                style={{
                  filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/60 truncate max-w-[120px]">
            {centerTitle}
          </span>
          <span className="text-2xl font-extrabold text-[#2C3333] font-serif leading-none mt-1">
            {centerValue}
          </span>
          <span className="text-[10px] text-[#4F6F52] font-semibold mt-0.5">
            Verified Records
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200" id="section-summary-analytics">
      {/* ========================================================================= */}
      {/* 5. INTERACTIVE FILTERS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-[#E8E6E1] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#4F6F52]/10 text-[#4F6F52]">
                <Filter className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold font-serif text-[#2C3333]">
                Summary Analytics & Interactive Filters
              </h2>
            </div>
            <p className="text-xs text-[#2C3333]/60 mt-0.5">
              Filter customer crowd distribution and food demand across weekdays, service windows, and date ranges.
            </p>
          </div>

          {/* Quick Active Filter Indicator & Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            {(selectedDayFilter !== 'all' || selectedTimeFilter !== 'all' || dateRangePreset !== 'all') && (
              <span className="text-[11px] font-medium px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Active Filters Applied
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs font-semibold text-[#2C3333]/70 hover:text-[#2C3333] bg-[#FAF9F6] hover:bg-[#E8E6E1]/50 border border-[#E8E6E1] rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Filter Rows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* A. Day Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/70 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Day Selector</span>
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedDayFilter === 'all'
                    ? 'bg-[#2C3333] text-white shadow-2xs'
                    : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1]/60 border border-[#E8E6E1]'
                }`}
              >
                All Days
              </button>
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    selectedDayFilter === day
                      ? 'bg-[#4F6F52] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1]/60 border border-[#E8E6E1]'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* B. Time Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/70 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Time Selector</span>
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedTimeFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedTimeFilter === 'all'
                    ? 'bg-[#2C3333] text-white shadow-2xs'
                    : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1]/60 border border-[#E8E6E1]'
                }`}
              >
                All Day
              </button>
              {(['breakfast', 'lunch', 'evening', 'dinner'] as TimePeriodSlot[]).map((slot) => {
                const cfg = TIME_PERIOD_CONFIG[slot];
                const isSelected = selectedTimeFilter === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTimeFilter(slot)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#4F6F52] text-white shadow-2xs'
                        : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1]/60 border border-[#E8E6E1]'
                    }`}
                  >
                    <span>{slot.charAt(0).toUpperCase() + slot.slice(1)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. Date Range Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/70 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Date Range</span>
            </label>
            <div className="flex flex-wrap gap-1">
              {(['all', 'today', 'this_week', 'last_week', 'custom'] as DateRangePreset[]).map((preset) => {
                const labels: Record<DateRangePreset, string> = {
                  all: 'All Time',
                  today: 'Today',
                  this_week: 'This Week',
                  last_week: 'Last Week',
                  custom: 'Custom',
                };
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDateRangePreset(preset)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      dateRangePreset === preset
                        ? 'bg-[#2C3333] text-white shadow-2xs'
                        : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1]/60 border border-[#E8E6E1]'
                    }`}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Inputs if Custom is selected */}
            {dateRangePreset === 'custom' && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 text-[11px] bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#2C3333] outline-none focus:border-[#4F6F52]"
                />
                <span className="text-[11px] text-[#2C3333]/40">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 text-[11px] bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#2C3333] outline-none focus:border-[#4F6F52]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E8E6E1]/60">
          <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]/70">
            <div className="text-[10px] font-bold text-[#2C3333]/60 uppercase tracking-wider">Filtered Orders</div>
            <div className="text-lg font-black text-[#2C3333] mt-0.5">{kpiStats.totalOrdersCount}</div>
          </div>
          <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]/70">
            <div className="text-[10px] font-bold text-[#2C3333]/60 uppercase tracking-wider">Food Items Ordered</div>
            <div className="text-lg font-black text-[#4F6F52] mt-0.5">{kpiStats.totalFoodQty}</div>
          </div>
          <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]/70">
            <div className="text-[10px] font-bold text-[#2C3333]/60 uppercase tracking-wider">Total Dining Guests</div>
            <div className="text-lg font-black text-[#2C3333] mt-0.5">{kpiStats.totalGuestsInFilter}</div>
          </div>
          <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]/70">
            <div className="text-[10px] font-bold text-[#2C3333]/60 uppercase tracking-wider">Top Ordered Item</div>
            <div className="text-xs font-bold text-[#2C3333] truncate mt-1" title={kpiStats.topName}>
              {kpiStats.topName} {kpiStats.topQty > 0 ? `(${kpiStats.topQty})` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. NEATLY ARRANGED DASHBOARD: 1 TO 4 IN SPECIFIED ORDER */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* 1. DAY-WISE MOST DEMANDED FOOD – BAR CHART */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-sm space-y-6" id="chart-day-wise-demanded-food">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#4F6F52]/10 text-[#4F6F52]">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  1. Day-wise Most Demanded Food – Bar Chart
                </h3>
                <p className="text-xs text-[#2C3333]/60 mt-0.5">
                  Monday to Sunday menu demand analysis based on actual customer orders for {restaurant.name}.
                </p>
              </div>
            </div>
          </div>

          {/* Day selection tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = activeDayForDayChart === day;
              const dayTotal = dayWiseItemDemand.top5PerDay[day]?.reduce((s, it) => s + it.quantity, 0) || 0;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setActiveDayBarDay(day);
                    if (selectedDayFilter !== 'all' && selectedDayFilter !== day) {
                      setSelectedDayFilter(day);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#2C3333] text-white shadow-xs'
                      : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
                  }`}
                >
                  <span>{day}</span>
                  {dayTotal > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSelected ? 'bg-[#4F6F52] text-white' : 'bg-[#E8E6E1] text-[#2C3333]'
                    }`}>
                      {dayTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Content Area */}
        {currentDayTop5.length === 0 ? (
          <div className="py-14 text-center space-y-3 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E8E6E1]">
            <UtensilsCrossed className="w-10 h-10 text-[#2C3333]/25 mx-auto" />
            <h4 className="text-base font-bold text-[#2C3333]/70 font-serif">
              No data available yet
            </h4>
            <p className="text-xs text-[#2C3333]/50 max-w-sm mx-auto">
              No customer orders recorded for {activeDayForDayChart} yet. When diners reserve tables or pre-order meals from the digital menu for {activeDayForDayChart}, ranked demand will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#2C3333]/60 px-1">
              <span>Top 5 Food Items on {activeDayForDayChart}</span>
              <span>Total Quantity Ordered</span>
            </div>

            <div className="space-y-3">
              {currentDayTop5.map((entry, index) => {
                const widthPercent = Math.max(12, Math.round((entry.quantity / maxCurrentDayItemQty) * 100));
                const dietaryColor = entry.item.dietary === 'veg' 
                  ? 'border-emerald-600 text-emerald-700' 
                  : entry.item.dietary === 'vegan' 
                  ? 'border-teal-600 text-teal-700'
                  : 'border-rose-600 text-rose-700';

                return (
                  <div 
                    key={entry.item.id || entry.item.name}
                    className="group bg-[#FAF9F6] hover:bg-white p-3.5 rounded-2xl border border-[#E8E6E1] transition-all hover:shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#2C3333] text-white text-xs font-black flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <span 
                          className={`w-3.5 h-3.5 border-2 rounded-xs flex items-center justify-center shrink-0 ${dietaryColor}`}
                          title={entry.item.dietary}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            entry.item.dietary === 'veg' ? 'bg-emerald-600' : entry.item.dietary === 'vegan' ? 'bg-teal-600' : 'bg-rose-600'
                          }`} />
                        </span>
                        <div className="truncate">
                          <span className="text-sm font-bold text-[#2C3333] group-hover:text-[#4F6F52] transition-colors">
                            {entry.item.name}
                          </span>
                          <span className="text-[11px] text-[#2C3333]/50 ml-2">
                            {entry.item.category} • {formatINR(entry.item.price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-[#2C3333] bg-white px-2.5 py-1 rounded-xl border border-[#E8E6E1]">
                          {entry.quantity} {entry.quantity === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                    </div>

                    {/* Visual Demand Progress Bar */}
                    <div className="h-2.5 w-full bg-[#E8E6E1]/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#4F6F52] to-[#2C3333] rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Comparison Overview Strip */}
        <div className="pt-4 border-t border-[#E8E6E1]/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Weekly Comparison Across Monday – Sunday</span>
            </span>
            <span className="text-[11px] text-[#2C3333]/50">
              Click any day bar to inspect
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weeklyTotalDemandPerDay.map((d) => {
              const heightPercent = Math.max(15, Math.round((d.totalQuantity / maxWeeklyDayQuantity) * 100));
              const isSelected = activeDayForDayChart === d.day;

              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => {
                    setActiveDayBarDay(d.day);
                    if (selectedDayFilter !== 'all') setSelectedDayFilter(d.day);
                  }}
                  className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-2 h-28 ${
                    isSelected
                      ? 'bg-[#4F6F52]/10 border-[#4F6F52] shadow-2xs'
                      : 'bg-[#FAF9F6] border-[#E8E6E1] hover:bg-white'
                  }`}
                >
                  <span className={`text-[11px] font-bold ${isSelected ? 'text-[#4F6F52]' : 'text-[#2C3333]'}`}>
                    {d.day.slice(0, 3)}
                  </span>

                  <div className="w-full flex-1 flex items-end justify-center py-1">
                    <div
                      className={`w-4 rounded-t-lg transition-all duration-300 ${
                        isSelected ? 'bg-[#4F6F52]' : 'bg-[#2C3333]/40'
                      }`}
                      style={{ height: `${d.totalQuantity > 0 ? heightPercent : 10}%` }}
                    />
                  </div>

                  <span className="text-[10px] font-black text-[#2C3333]">
                    {d.totalQuantity}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. TIME-WISE MOST DEMANDED FOOD – BAR CHART */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-sm space-y-6" id="chart-time-wise-demanded-food">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#4F6F52]/10 text-[#4F6F52]">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  2. Time-wise Most Demanded Food – Bar Chart
                </h3>
                <p className="text-xs text-[#2C3333]/60 mt-0.5">
                  Food demand breakdown across Breakfast (6-11 AM), Lunch (11 AM-3 PM), Evening (3-7 PM), and Dinner (7-11 PM).
                </p>
              </div>
            </div>
          </div>

          {/* Time Slot Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['breakfast', 'lunch', 'evening', 'dinner'] as TimePeriodSlot[]).map((slot) => {
              const cfg = TIME_PERIOD_CONFIG[slot];
              const isSelected = activeTimeForTimeChart === slot;
              const Icon = cfg.icon;
              const slotTotal = timeWiseItemDemand.slotTotals[slot];

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    setActiveTimeBarSlot(slot);
                    if (selectedTimeFilter !== 'all' && selectedTimeFilter !== slot) {
                      setSelectedTimeFilter(slot);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#2C3333] text-white shadow-xs'
                      : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cfg.label.split(' ')[0]}</span>
                  <span className="text-[10px] text-[#2C3333]/50 group-hover:text-white">({cfg.hoursDesc})</span>
                  {slotTotal > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-[#4F6F52] text-white' : 'bg-[#E8E6E1] text-[#2C3333]'
                    }`}>
                      {slotTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Time Slot Content */}
        {currentTimeSlotTopItems.length === 0 ? (
          <div className="py-14 text-center space-y-3 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E8E6E1]">
            <Clock className="w-10 h-10 text-[#2C3333]/25 mx-auto" />
            <h4 className="text-base font-bold text-[#2C3333]/70 font-serif">
              No data available yet
            </h4>
            <p className="text-xs text-[#2C3333]/50 max-w-sm mx-auto">
              No orders recorded during {TIME_PERIOD_CONFIG[activeTimeForTimeChart].label} ({TIME_PERIOD_CONFIG[activeTimeForTimeChart].range}). Orders placed or timed during this service window will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#2C3333]/60 px-1">
              <span>{TIME_PERIOD_CONFIG[activeTimeForTimeChart].label} ({TIME_PERIOD_CONFIG[activeTimeForTimeChart].range})</span>
              <span>Quantity & Share of Window</span>
            </div>

            <div className="space-y-3">
              {currentTimeSlotTopItems.map((entry, index) => {
                const widthPercent = Math.max(12, Math.round((entry.quantity / maxTimeSlotItemQty) * 100));
                const dietaryColor = entry.item.dietary === 'veg' 
                  ? 'border-emerald-600 text-emerald-700' 
                  : entry.item.dietary === 'vegan' 
                  ? 'border-teal-600 text-teal-700'
                  : 'border-rose-600 text-rose-700';

                return (
                  <div 
                    key={entry.item.id || entry.item.name}
                    className="group bg-[#FAF9F6] hover:bg-white p-3.5 rounded-2xl border border-[#E8E6E1] transition-all hover:shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#4F6F52] text-white text-xs font-black flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <span 
                          className={`w-3.5 h-3.5 border-2 rounded-xs flex items-center justify-center shrink-0 ${dietaryColor}`}
                          title={entry.item.dietary}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            entry.item.dietary === 'veg' ? 'bg-emerald-600' : entry.item.dietary === 'vegan' ? 'bg-teal-600' : 'bg-rose-600'
                          }`} />
                        </span>
                        <div className="truncate">
                          <span className="text-sm font-bold text-[#2C3333] group-hover:text-[#4F6F52] transition-colors">
                            {entry.item.name}
                          </span>
                          <span className="text-[11px] text-[#2C3333]/50 ml-2">
                            {entry.item.category} • {formatINR(entry.item.price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-[#4F6F52] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {entry.percentageOfSlot}% of orders
                        </span>
                        <span className="text-xs font-black text-[#2C3333] bg-white px-2.5 py-1 rounded-xl border border-[#E8E6E1]">
                          {entry.quantity} {entry.quantity === 1 ? 'qty' : 'qty'}
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Bar with Percentage */}
                    <div className="h-2.5 w-full bg-[#E8E6E1]/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-[#4F6F52] rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. DAY-WISE RESTAURANT CROWD – PIE CHART */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-sm space-y-6" id="chart-day-wise-crowd">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#4F6F52]/10 text-[#4F6F52]">
                <PieChartIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  3. Day-wise Restaurant Crowd – Pie Chart
                </h3>
                <p className="text-xs text-[#2C3333]/60 mt-0.5">
                  Distribution of dining customers across Monday to Sunday from actual reservations, walk-ins, and arrivals.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#2C3333] bg-[#FAF9F6] px-3 py-1.5 rounded-xl border border-[#E8E6E1]">
              Total Guests: {dayWiseCrowdData.totalWeeklyGuests}
            </span>
          </div>
        </div>

        {dayWiseCrowdData.totalWeeklyGuests === 0 ? (
          <div className="py-14 text-center space-y-3 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E8E6E1]">
            <Users className="w-10 h-10 text-[#2C3333]/25 mx-auto" />
            <h4 className="text-base font-bold text-[#2C3333]/70 font-serif">
              No data available yet
            </h4>
            <p className="text-xs text-[#2C3333]/50 max-w-sm mx-auto">
              No customer bookings or guest arrivals match the current filter criteria. As diners confirm reservations or check in at the host stand, day-wise crowd metrics will populate.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* SVG Donut / Pie */}
            <div className="lg:col-span-5 flex justify-center">
              {renderSvgDonut(
                dayWiseCrowdData.slices.map((s) => ({
                  key: s.day,
                  label: s.day,
                  value: s.guests,
                  percentage: s.percentage,
                  color: s.color,
                })),
                dayWiseCrowdData.totalWeeklyGuests,
                hoveredPieDay,
                (k) => setHoveredPieDay(k as DayOfWeek | null),
                hoveredPieDay ? `${hoveredPieDay} Crowd` : 'Weekly Crowd',
                hoveredPieDay
                  ? `${dayWiseCrowdData.slices.find((s) => s.day === hoveredPieDay)?.guests || 0} guests`
                  : `${dayWiseCrowdData.totalWeeklyGuests} guests`
              )}
            </div>

            {/* Slices Legend and Day Breakdown */}
            <div className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {dayWiseCrowdData.slices.map((slice) => {
                  const isHovered = hoveredPieDay === slice.day;
                  const isFilterActive = selectedDayFilter === slice.day;

                  return (
                    <div
                      key={slice.day}
                      onMouseEnter={() => setHoveredPieDay(slice.day)}
                      onMouseLeave={() => setHoveredPieDay(null)}
                      onClick={() => {
                        setSelectedDayFilter(selectedDayFilter === slice.day ? 'all' : slice.day);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isHovered || isFilterActive
                          ? 'bg-white border-[#2C3333] shadow-xs'
                          : 'bg-[#FAF9F6] border-[#E8E6E1] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0" 
                          style={{ backgroundColor: slice.color }} 
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-[#2C3333]">
                            {slice.day}
                          </span>
                          <div className="text-[10px] text-[#2C3333]/50">
                            {slice.bookings} {slice.bookings === 1 ? 'booking' : 'bookings'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-[#2C3333]">
                          {slice.guests} <span className="text-[11px] font-normal text-[#2C3333]/60">guests</span>
                        </span>
                        <div className="text-[11px] font-extrabold text-[#4F6F52]">
                          {slice.percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Details Callout if a Day is Selected */}
              {selectedDayFilter !== 'all' && (
                <div className="p-4 rounded-2xl bg-[#4F6F52]/5 border border-[#4F6F52]/20 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C3333] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#4F6F52]" />
                      <span>{selectedDayFilter} Detailed Crowd Distribution</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDayFilter('all')}
                      className="text-[11px] text-[#4F6F52] font-bold hover:underline"
                    >
                      Clear Day Selection
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-xl border border-[#E8E6E1]">
                      <div className="text-[10px] text-[#2C3333]/60 font-semibold">Standard</div>
                      <div className="text-xs font-black text-[#2C3333]">
                        {dayWiseCrowdData.dayCategoryBreakdown[selectedDayFilter].standard}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#E8E6E1]">
                      <div className="text-[10px] text-amber-700 font-semibold">Travel</div>
                      <div className="text-xs font-black text-amber-800">
                        {dayWiseCrowdData.dayCategoryBreakdown[selectedDayFilter].travel}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#E8E6E1]">
                      <div className="text-[10px] text-[#4F6F52] font-semibold">Walk-in</div>
                      <div className="text-xs font-black text-[#4F6F52]">
                        {dayWiseCrowdData.dayCategoryBreakdown[selectedDayFilter].walkin}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#E8E6E1]">
                      <div className="text-[10px] text-indigo-700 font-semibold">En Route</div>
                      <div className="text-xs font-black text-indigo-800">
                        {dayWiseCrowdData.dayCategoryBreakdown[selectedDayFilter].smartArrival}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 4. TIME-WISE RESTAURANT CROWD – PIE CHART */}
      {/* ------------------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-sm space-y-6" id="chart-time-wise-crowd">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#4F6F52]/10 text-[#4F6F52]">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  4. Time-wise Restaurant Crowd – Pie Chart
                </h3>
                <p className="text-xs text-[#2C3333]/60 mt-0.5">
                  Guest crowd distribution across Morning, Afternoon, Evening, and Night service windows.
                </p>
              </div>
            </div>
          </div>

          {/* Quick peak callout badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {timeWiseCrowdData.busiest && timeWiseCrowdData.busiest.guests > 0 && (
              <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Busiest: {timeWiseCrowdData.busiest.label.split(' ')[0]} ({timeWiseCrowdData.busiest.percentage}%)</span>
              </span>
            )}
            {timeWiseCrowdData.leastBusy && timeWiseCrowdData.leastBusy.guests > 0 && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>Least Busy: {timeWiseCrowdData.leastBusy.label.split(' ')[0]} ({timeWiseCrowdData.leastBusy.percentage}%)</span>
              </span>
            )}
          </div>
        </div>

        {timeWiseCrowdData.totalSlotGuests === 0 ? (
          <div className="py-14 text-center space-y-3 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E8E6E1]">
            <Clock className="w-10 h-10 text-[#2C3333]/25 mx-auto" />
            <h4 className="text-base font-bold text-[#2C3333]/70 font-serif">
              No data available yet
            </h4>
            <p className="text-xs text-[#2C3333]/50 max-w-sm mx-auto">
              No guest crowd timestamps found for the selected day/date filter. As reservation seatings and guest arrivals are recorded, time-wise percentages will appear.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* SVG Donut / Pie */}
            <div className="lg:col-span-5 flex justify-center">
              {renderSvgDonut(
                timeWiseCrowdData.slices.map((s) => ({
                  key: s.slot,
                  label: s.label,
                  value: s.guests,
                  percentage: s.percentage,
                  color: s.color,
                })),
                timeWiseCrowdData.totalSlotGuests,
                hoveredPieTimeSlot,
                (k) => setHoveredPieTimeSlot(k as TimePeriodSlot | null),
                hoveredPieTimeSlot ? `${TIME_PERIOD_CONFIG[hoveredPieTimeSlot].label.split(' ')[0]}` : 'All Day Crowd',
                hoveredPieTimeSlot
                  ? `${timeWiseCrowdData.slices.find((s) => s.slot === hoveredPieTimeSlot)?.guests || 0} guests`
                  : `${timeWiseCrowdData.totalSlotGuests} guests`
              )}
            </div>

            {/* Time Slots Cards Grid */}
            <div className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {timeWiseCrowdData.slices.map((slice) => {
                  const isHovered = hoveredPieTimeSlot === slice.slot;
                  const isSelected = selectedTimeFilter === slice.slot;
                  const Icon = slice.icon;
                  const isBusiest = timeWiseCrowdData.busiest?.slot === slice.slot && slice.guests > 0;
                  const isLeastBusy = timeWiseCrowdData.leastBusy?.slot === slice.slot && slice.guests > 0;

                  return (
                    <div
                      key={slice.slot}
                      onMouseEnter={() => setHoveredPieTimeSlot(slice.slot)}
                      onMouseLeave={() => setHoveredPieTimeSlot(null)}
                      onClick={() => {
                        setSelectedTimeFilter(selectedTimeFilter === slice.slot ? 'all' : slice.slot);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isHovered || isSelected
                          ? 'bg-white border-[#2C3333] shadow-xs'
                          : 'bg-[#FAF9F6] border-[#E8E6E1] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3.5 h-3.5 rounded-full shrink-0" 
                            style={{ backgroundColor: slice.color }} 
                          />
                          <span className="text-xs font-bold text-[#2C3333]">
                            {slice.label}
                          </span>
                        </div>
                        {isBusiest && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Peak
                          </span>
                        )}
                        {isLeastBusy && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            Quietest
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-xs text-[#2C3333]/50">{slice.range}</span>
                          <div className="text-[11px] text-[#2C3333]/60">
                            {slice.bookings} {slice.bookings === 1 ? 'reservation' : 'reservations'}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-[#2C3333]">
                            {slice.guests} <span className="text-xs font-normal text-[#2C3333]/60">guests</span>
                          </span>
                          <div className="text-xs font-black text-[#4F6F52]">
                            {slice.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Busiest & Least Busy Analysis Callout */}
              {timeWiseCrowdData.busiest && timeWiseCrowdData.busiest.guests > 0 && (
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#4F6F52] shrink-0" />
                    <span className="text-[#2C3333]/80">
                      <strong>Operational Insight:</strong> Kitchen prep pacing should be prioritized for{' '}
                      <strong>{timeWiseCrowdData.busiest.label}</strong> ({timeWiseCrowdData.busiest.range}), generating{' '}
                      <strong>{timeWiseCrowdData.busiest.percentage}%</strong> of guest volume.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default RestaurantSummaryAnalytics;
