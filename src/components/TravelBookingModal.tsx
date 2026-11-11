import React, { useState, useMemo } from 'react';
import { 
  X, 
  Bus, 
  Clock, 
  Users, 
  UtensilsCrossed, 
  Package, 
  Calendar, 
  MapPin, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ChevronLeft, 
  QrCode, 
  Phone, 
  Plus, 
  Minus, 
  Leaf, 
  Flame, 
  ShieldCheck, 
  Info,
  Armchair,
  ShoppingBag,
  Sparkles,
  Ticket
} from 'lucide-react';
import { 
  Restaurant, 
  Reservation, 
  Table, 
  MenuItem, 
  FoodOrder, 
  FoodOrderItem, 
  TravelDetails, 
  TravelFulfillmentType,
  TravelBookingStatus,
  TravelFoodPrepStatus,
  DietaryType,
  AllergenSeverity
} from '../types';
import { 
  VERIFIED_TRAVEL_ROUTES, 
  VERIFIED_BUS_STOPS, 
  TravelRoute, 
  BusStop,
  getRecommendedTravelPrepStatus,
  calculateTravelArrivalEta 
} from '../data/travelRoutesData';
import { getCustomizedMenu } from '../services/menuService';
import { formatINR, normalizePrice, calculateItemTotal, calculateOrderTotal } from '../utils/priceUtils';
import { getTableState } from '../data/mockData';
import { AllergenDietaryTagModal, DietaryTagFormData } from './AllergenDietaryTagModal';

interface TravelBookingModalProps {
  restaurant: Restaurant;
  isOpen: boolean;
  onClose: () => void;
  onCompleteBooking: (newReservation: Reservation) => void;
  onSwitchToNormalBooking?: () => void;
  reservations: Reservation[];
  currentUser?: {
    userId?: string;
    fullName: string;
    email: string;
    phone: string;
  };
  initialRoute?: TravelRoute;
  initialBusStop?: BusStop;
  initialFulfillment?: TravelFulfillmentType;
}

export const TravelBookingModal: React.FC<TravelBookingModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  onCompleteBooking,
  onSwitchToNormalBooking,
  reservations,
  currentUser,
  initialRoute,
  initialBusStop,
  initialFulfillment = 'dine_in',
}) => {
  if (!isOpen) return null;

  // Step state: 
  // 'ask_travelling' -> 'travel_details' -> 'food_selection' -> 'table_selection' (if dine-in) -> 'review_payment' -> 'confirmed'
  const [step, setStep] = useState<
    'ask_travelling' | 'travel_details' | 'food_selection' | 'table_selection' | 'review_payment' | 'confirmed'
  >('travel_details');

  // Passenger & Travel inputs
  const [passengerCount, setPassengerCount] = useState<number>(4);
  const [expectedArrivalTime, setExpectedArrivalTime] = useState<string>('08:15 PM');
  const [fulfillmentType, setFulfillmentType] = useState<TravelFulfillmentType>(initialFulfillment);
  const [selectedRouteCode, setSelectedRouteCode] = useState<string>(
    initialRoute?.routeCode || VERIFIED_TRAVEL_ROUTES[0].routeCode
  );
  const [busOperator, setBusOperator] = useState<string>('BMTC Volvo');
  const [customBusOperator, setCustomBusOperator] = useState<string>('');
  const [busNumberOrPnr, setBusNumberOrPnr] = useState<string>('KA-01-FA-4210');
  const [selectedBusStopName, setSelectedBusStopName] = useState<string>(
    initialBusStop?.name || restaurant.nearbyBusStops?.[0]?.stopName || VERIFIED_BUS_STOPS[1].name
  );
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Contact details
  const [passengerName, setPassengerName] = useState<string>(currentUser?.fullName || 'Sanketh Sharma');
  const [passengerPhone, setPassengerPhone] = useState<string>(currentUser?.phone || '+91 98450 12260');
  const [passengerEmail, setPassengerEmail] = useState<string>(currentUser?.email || 'sanketh1226@gmail.com');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Dine-In Table Selection (supports single or multi-table group booking)
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('all');

  // Food Order Cart items
  const [cartItems, setCartItems] = useState<{
    item: MenuItem;
    quantity: number;
    intendedFor: string;
    dietaryTag: string;
    allergenTags: string[];
    severity?: AllergenSeverity;
    kitchenNotes: string;
  }[]>([]);

  // Menu data
  const menu = useMemo(() => {
    return getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines);
  }, [restaurant]);

  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg' | 'vegan'>('all');

  // Tagging modal state for dishes
  const [activeTagItem, setActiveTagItem] = useState<{
    item: MenuItem;
    index?: number;
  } | null>(null);

  // Confirmed reservation result
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  // Group booking calculation: Check required tables
  const tablesRequiredCount = useMemo(() => {
    if (fulfillmentType === 'parcel') return 0;
    if (passengerCount <= 4) return 1;
    if (passengerCount <= 8) return 2;
    if (passengerCount <= 12) return 3;
    return Math.ceil(passengerCount / 4);
  }, [passengerCount, fulfillmentType]);

  // Available tables for this restaurant & arrival time
  const availableTables = useMemo(() => {
    return restaurant.tables.filter((table) => {
      if (selectedFloor !== 'all' && table.section !== selectedFloor) return false;
      const status = getTableState(table, restaurant.id, bookingDate, expectedArrivalTime, reservations);
      return status === 'available';
    });
  }, [restaurant.tables, restaurant.id, bookingDate, expectedArrivalTime, reservations, selectedFloor]);

  // Total Seating Capacity of restaurant currently available
  const totalAvailableSeats = useMemo(() => {
    return availableTables.reduce((acc, t) => acc + t.capacity, 0);
  }, [availableTables]);

  const isOverbooked = useMemo(() => {
    if (fulfillmentType === 'parcel') return false;
    return passengerCount > totalAvailableSeats;
  }, [passengerCount, totalAvailableSeats, fulfillmentType]);

  // Food totals
  const foodTotal = useMemo(() => {
    return cartItems.reduce((acc, c) => acc + (c.item.price * c.quantity), 0);
  }, [cartItems]);

  // Configured prep time
  const prepTimeMinutes = restaurant.averageFoodPrepMinutes || 20;
  const prepRecommendation = useMemo(() => {
    return getRecommendedTravelPrepStatus(expectedArrivalTime, prepTimeMinutes);
  }, [expectedArrivalTime, prepTimeMinutes]);

  // Auto-allocate tables if Dine-In and user hasn't manually picked
  const handleAutoAllocateTables = () => {
    const allocated: string[] = [];
    let seatsCovered = 0;

    for (const table of availableTables) {
      if (seatsCovered >= passengerCount) break;
      allocated.push(table.id);
      seatsCovered += table.capacity;
    }
    setSelectedTableIds(allocated);
  };

  // Cart operations
  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [
        ...prev,
        {
          item,
          quantity: 1,
          intendedFor: `Passenger 1`,
          dietaryTag: item.isJain ? 'Jain' : (item.isGlutenFree ? 'Gluten-Free' : 'Standard'),
          allergenTags: item.containsNuts ? ['Nuts'] : [],
          kitchenNotes: '',
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as typeof cartItems;
    });
  };

  // Confirm and create travel booking
  const handleFinalizeBooking = () => {
    const bookingRefId = `FT-TRV-${Math.floor(1000 + Math.random() * 9000)}`;
    const resId = `res-trv-${Date.now()}`;
    const activeUserId = currentUser?.userId || 'usr-guest-travel';

    // Tables information
    const allocatedTables = selectedTableIds.map((tid) => {
      const t = restaurant.tables.find((tbl) => tbl.id === tid);
      return {
        tableId: tid,
        tableNumber: t ? t.tableNumber : 'T01',
        section: t ? t.section : 'Main Dining',
        capacity: t ? t.capacity : 4,
      };
    });

    const tableNumbersDisplay = fulfillmentType === 'dine_in'
      ? (allocatedTables.length > 0 ? allocatedTables.map((t) => t.tableNumber).join(', ') : 'T01')
      : 'Curbside Express Pickup';

    const primaryTableId = allocatedTables[0]?.tableId || (fulfillmentType === 'parcel' ? 'tbl-parcel' : 't-101');
    const primarySection = allocatedTables[0]?.section || (fulfillmentType === 'parcel' ? 'Travel Parcel Counter' : 'Main Dining');

    // Food Order items
    const foodOrderItems: FoodOrderItem[] = cartItems.map((c) => ({
      itemId: c.item.id,
      name: c.item.name,
      quantity: c.quantity,
      unitPrice: c.item.price,
      price: c.item.price,
      total: c.item.price * c.quantity,
      dietary: c.item.dietary,
      category: c.item.category,
      intendedFor: c.intendedFor,
      dietaryTag: c.dietaryTag,
      allergenTags: c.allergenTags,
      severity: c.severity,
      kitchenNotes: c.kitchenNotes,
    }));

    const foodOrder: FoodOrder | undefined = foodOrderItems.length > 0 ? {
      id: `fo-${resId}`,
      foodOrderId: `fo-${resId}`,
      reservationId: resId,
      userId: activeUserId,
      restaurantId: restaurant.id,
      tableId: primaryTableId,
      tableNumber: tableNumbersDisplay,
      customerName: passengerName,
      customerPhone: passengerPhone,
      date: bookingDate,
      time: expectedArrivalTime,
      items: foodOrderItems,
      foodTotal,
      status: 'Accepted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasAllergenAlert: foodOrderItems.some((it) => (it.allergenTags && it.allergenTags.length > 0) || it.severity),
      allergenSummary: Array.from(new Set(foodOrderItems.flatMap((it) => it.allergenTags || []))),
    } : undefined;

    // Collect dietary requirements summary
    const dietarySummary: string[] = Array.from(
      new Set<string>(
        cartItems
          .map((c) => c.dietaryTag !== 'Standard' ? `${c.dietaryTag} (${c.intendedFor})` : '')
          .filter((s): s is string => Boolean(s))
      )
    );

    const travelDetails: TravelDetails = {
      isTravellingByBus: true,
      busOperator: customBusOperator.trim() || busOperator,
      routeNumber: selectedRouteCode,
      busNumberOrPnr,
      busStopName: selectedBusStopName,
      expectedArrivalTime,
      fulfillmentType,
      passengerCount,
      isGroupBooking: passengerCount > 4,
      allocatedTableNumbers: allocatedTables.map((t) => t.tableNumber),
      allocatedTables,
      prepStatus: prepRecommendation.status,
      travelStatus: 'Restaurant Confirmed',
      estimatedPrepMinutes: prepTimeMinutes,
      pickupCounterOrCurbside: fulfillmentType === 'parcel' ? 'Curbside Express Valet' : undefined,
      dietaryRequirementsSummary: dietarySummary,
      notes: specialRequests,
    };

    const newRes: Reservation = {
      id: resId,
      userId: activeUserId,
      bookingRef: bookingRefId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      tableId: primaryTableId,
      tableNumber: tableNumbersDisplay,
      section: primarySection,
      date: bookingDate,
      timeSlot: `${expectedArrivalTime} (Travel Arrival)`,
      timeIn: expectedArrivalTime,
      timeOut: expectedArrivalTime,
      durationMinutes: fulfillmentType === 'dine_in' ? 75 : 10,
      durationFormatted: fulfillmentType === 'dine_in' ? '1 hr 15 min' : '10 min express',
      guests: passengerCount,
      customerName: passengerName,
      customerPhone: passengerPhone,
      customerEmail: passengerEmail,
      specialRequests: specialRequests || (fulfillmentType === 'parcel' ? 'Travel Bus Takeaway Parcel' : 'Travel Bus Dine-In'),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      qrCodeData: `FT-${restaurant.id.toUpperCase()}-${fulfillmentType.toUpperCase()}-${resId}`,
      depositAmount: fulfillmentType === 'dine_in' ? 200 : 0,
      paymentStatus: 'paid',
      paymentMethod: 'UPI (Confirmed)',
      paymentTransactionId: `FT-TXN-TRV-${Date.now().toString().slice(-6)}`,
      foodOrder,
      travelDetails,
      restaurantCustomerCareNumber: restaurant.customerCareNumber || restaurant.contactNumber,
    };

    setConfirmedReservation(newRes);
    onCompleteBooking(newRes);
    setStep('confirmed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#FAF9F6] w-full max-w-3xl rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="bg-[#2C3333] text-white px-6 py-4 flex items-center justify-between border-b border-stone-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-serif">
                  Travel Dining & Food Booking
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-bold">
                  On-the-Way
                </span>
              </div>
              <p className="text-xs text-stone-300">
                {restaurant.name} • {restaurant.neighborhood}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Progress Stepper */}
        {step !== 'confirmed' && (
          <div className="bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between text-xs font-semibold text-stone-500 overflow-x-auto">
            <div className={`flex items-center gap-1.5 ${step === 'travel_details' ? 'text-[#4F6F52] font-bold' : ''}`}>
              <span className="w-5 h-5 rounded-full bg-[#4F6F52]/15 text-[#4F6F52] flex items-center justify-center text-[10px]">1</span>
              <span>Travel & Time</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-300 shrink-0" />

            <div className={`flex items-center gap-1.5 ${step === 'food_selection' ? 'text-[#4F6F52] font-bold' : ''}`}>
              <span className="w-5 h-5 rounded-full bg-[#4F6F52]/15 text-[#4F6F52] flex items-center justify-center text-[10px]">2</span>
              <span>Food Pre-Order</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-300 shrink-0" />

            {fulfillmentType === 'dine_in' && (
              <>
                <div className={`flex items-center gap-1.5 ${step === 'table_selection' ? 'text-[#4F6F52] font-bold' : ''}`}>
                  <span className="w-5 h-5 rounded-full bg-[#4F6F52]/15 text-[#4F6F52] flex items-center justify-center text-[10px]">3</span>
                  <span>Table & Floor</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-300 shrink-0" />
              </>
            )}

            <div className={`flex items-center gap-1.5 ${step === 'review_payment' ? 'text-[#4F6F52] font-bold' : ''}`}>
              <span className="w-5 h-5 rounded-full bg-[#4F6F52]/15 text-[#4F6F52] flex items-center justify-center text-[10px]">
                {fulfillmentType === 'dine_in' ? '4' : '3'}
              </span>
              <span>Review & Confirm</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* STEP 1: Travel Details & Fulfillment Selection */}
          {step === 'travel_details' && (
            <div className="space-y-6">
              
              {/* Question 1: Are you travelling by bus? */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                    <Bus className="w-4 h-4 text-amber-600" />
                    <span>Are you travelling by bus?</span>
                  </div>
                  {onSwitchToNormalBooking && (
                    <button
                      onClick={onSwitchToNormalBooking}
                      className="text-xs text-stone-500 hover:text-stone-900 underline cursor-pointer"
                    >
                      No, standard city dining
                    </button>
                  )}
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  FlashTable enables travelling passengers to pre-book food and seating so meals are freshly ready right when you arrive at the restaurant or bus stop.
                </p>
              </div>

              {/* Question 2: How would you like to receive your food? */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                  How would you like to receive your food?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('dine_in')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      fulfillmentType === 'dine_in'
                        ? 'border-[#4F6F52] bg-[#4F6F52]/10 ring-2 ring-[#4F6F52]'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">🍽️</span>
                      {fulfillmentType === 'dine_in' && <CheckCircle2 className="w-5 h-5 text-[#4F6F52]" />}
                    </div>
                    <div className="mt-2">
                      <div className="font-bold text-stone-900 text-sm">Dine-In at Table</div>
                      <p className="text-xs text-stone-500 mt-1">
                        Reserve a table, select your floor, and dine comfortably inside. Food is ready on arrival.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('parcel')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      fulfillmentType === 'parcel'
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">🥡</span>
                      {fulfillmentType === 'parcel' && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div className="mt-2">
                      <div className="font-bold text-stone-900 text-sm">Food Parcel / Takeaway</div>
                      <p className="text-xs text-stone-500 mt-1">
                        No table reservation required. Hot sealed takeaway parcel handed over curbside when bus halts.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Group & Passenger Count */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#4F6F52]" />
                      <span>Number of Passengers Travelling:</span>
                    </label>
                    <p className="text-[11px] text-stone-500">
                      {passengerCount >= 5 ? '⭐ Group Booking: Multiple tables allocated automatically' : 'Single booking for travelling passengers'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                      className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-lg text-stone-900 w-6 text-center">
                      {passengerCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPassengerCount(Math.min(20, passengerCount + 1))}
                      className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Group Seating check alert */}
                {fulfillmentType === 'dine_in' && passengerCount > 4 && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                    <span>
                      <strong>Group Seating:</strong> {passengerCount} passengers requires {tablesRequiredCount} tables.
                    </span>
                    <span className="font-semibold text-emerald-800">
                      {totalAvailableSeats >= passengerCount ? `✓ ${totalAvailableSeats} seats open` : '⚠️ Limited Seating'}
                    </span>
                  </div>
                )}
                {isOverbooked && (
                  <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Restaurant cannot accommodate {passengerCount} seats at this time. Please reduce passengers or choose parcel takeaway.</span>
                  </div>
                )}
              </div>

              {/* Expected Arrival Time */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Expected Arrival Time at Restaurant / Stop:</span>
                  </label>
                  <span className="text-xs font-bold text-stone-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    {expectedArrivalTime}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {['07:30 PM', '07:45 PM', '08:15 PM', '08:45 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setExpectedArrivalTime(slot)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        expectedArrivalTime === slot
                          ? 'bg-[#2C3333] text-white border-[#2C3333]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                {/* Custom manual time input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-stone-500">Or type arrival:</span>
                  <input
                    type="text"
                    value={expectedArrivalTime}
                    onChange={(e) => setExpectedArrivalTime(e.target.value)}
                    placeholder="e.g. 08:15 PM"
                    className="px-3 py-1 bg-[#FAF9F6] border border-stone-300 rounded-lg text-xs font-medium w-28 focus:outline-none focus:border-[#4F6F52]"
                  />
                  <span className="text-[11px] text-stone-400">
                    Kitchen prep starts ~{prepTimeMinutes} mins before this time
                  </span>
                </div>
              </div>

              {/* Bus & Transit Route Info (Optional) */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#4F6F52]" />
                  <span>Bus & Transit Details (Optional for Real-time Coordination):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-stone-500 font-medium block mb-1">Bus Operator</label>
                    <select
                      value={busOperator}
                      onChange={(e) => setBusOperator(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-xl text-xs"
                    >
                      <option value="BMTC Volvo">BMTC Volvo / AC Electric</option>
                      <option value="KSRTC Airavat Club Class">KSRTC Airavat Club Class</option>
                      <option value="KSRTC Rajahamsa / Express">KSRTC Rajahamsa / Express</option>
                      <option value="VRL Travels Intercity">VRL Travels Intercity</option>
                      <option value="SRS Travels">SRS Travels</option>
                      <option value="Intercity Private Bus">Other Intercity Bus</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-500 font-medium block mb-1">Bus Number / PNR</label>
                    <input
                      type="text"
                      value={busNumberOrPnr}
                      onChange={(e) => setBusNumberOrPnr(e.target.value)}
                      placeholder="e.g. KA-01-FA-4210 or PNR 8912"
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-stone-500 font-medium block mb-1">Nearby Bus Stop / Drop point</label>
                  <input
                    type="text"
                    value={selectedBusStopName}
                    onChange={(e) => setSelectedBusStopName(e.target.value)}
                    placeholder="e.g. Indiranagar 100 Feet Road Bus Stop"
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Passenger Contact */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-stone-500 font-medium block mb-1">Lead Passenger Name</label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-500 font-medium block mb-1">Mobile (for SMS & QR)</label>
                  <input
                    type="tel"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-500 font-medium block mb-1">Email</label>
                  <input
                    type="email"
                    value={passengerEmail}
                    onChange={(e) => setPassengerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Next CTA */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isOverbooked || !passengerName.trim()}
                  onClick={() => setStep('food_selection')}
                  className="px-6 py-2.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <span>Continue to Food Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: Food Selection & Dietary / Allergen Tagging */}
          {step === 'food_selection' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#4F6F52]" />
                    <span>Select Food for {passengerCount} Passengers</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Kitchen prepares meals in advance for arrival at <strong>{expectedArrivalTime}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-800">
                    {cartItems.reduce((acc, c) => acc + c.quantity, 0)} Items Selected • ₹{foodTotal}
                  </span>
                </div>
              </div>

              {/* Menu Categories */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setSelectedMenuCategory('all')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-colors shrink-0 cursor-pointer ${
                    selectedMenuCategory === 'all'
                      ? 'bg-[#2C3333] text-white'
                      : 'bg-white border border-stone-200 text-stone-600'
                  }`}
                >
                  All Dishes
                </button>
                {menu.categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedMenuCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-colors shrink-0 cursor-pointer ${
                      selectedMenuCategory === cat.name
                        ? 'bg-[#2C3333] text-white'
                        : 'bg-white border border-stone-200 text-stone-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {menu.categories
                  .filter((cat) => selectedMenuCategory === 'all' || cat.name === selectedMenuCategory)
                  .flatMap((cat) => cat.items)
                  .map((item) => {
                    const cartEntry = cartItems.find((c) => c.item.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 hover:border-stone-300 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${item.dietary === 'veg' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <h4 className="text-xs font-bold text-stone-900 truncate">{item.name}</h4>
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{item.description}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-stone-800">
                            <span>₹{item.price}</span>
                            {item.isChefSpecial && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                                Chef Special
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {cartEntry ? (
                            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQuantity(item.id, -1)}
                                className="w-6 h-6 rounded-lg bg-white text-stone-800 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                              >
                                -
                              </button>
                              <span className="w-4 text-center font-bold text-xs">{cartEntry.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQuantity(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-[#4F6F52] text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item)}
                              className="px-3 py-1.5 rounded-xl bg-[#4F6F52]/10 hover:bg-[#4F6F52] text-[#4F6F52] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Cart Summary & Dietary Tagging */}
              {cartItems.length > 0 && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center justify-between">
                    <span>Pre-Ordered Meals ({cartItems.length} items):</span>
                    <span>Total: ₹{foodTotal}</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {cartItems.map((cart, idx) => (
                      <div key={cart.item.id} className="text-xs text-stone-700 flex items-center justify-between bg-white p-2 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{cart.quantity}x</span>
                          <span>{cart.item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                            {cart.dietaryTag}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">₹{cart.item.price * cart.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setActiveTagItem({ item: cart.item, index: idx })}
                            className="text-[10px] text-amber-800 hover:underline font-semibold cursor-pointer"
                          >
                            Allergen / Diet Tag
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation CTAs */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('travel_details')}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (fulfillmentType === 'dine_in') {
                      if (selectedTableIds.length === 0) {
                        handleAutoAllocateTables();
                      }
                      setStep('table_selection');
                    } else {
                      setStep('review_payment');
                    }
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>
                    {fulfillmentType === 'dine_in' ? 'Choose Table & Floor' : 'Review & Confirm'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: Dine-In Floor & Table Selection */}
          {step === 'table_selection' && fulfillmentType === 'dine_in' && (
            <div className="space-y-6">
              
              <div className="bg-white p-4 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <Armchair className="w-4 h-4 text-[#4F6F52]" />
                      <span>Select Seating for {passengerCount} Passengers</span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {passengerCount > 4
                        ? `Group Booking: Requires ${tablesRequiredCount} adjacent tables (${selectedTableIds.length}/${tablesRequiredCount} selected)`
                        : `Select 1 available table for your group.`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoAllocateTables}
                    className="px-3 py-1.5 rounded-xl bg-[#4F6F52]/10 hover:bg-[#4F6F52]/20 text-[#4F6F52] text-xs font-bold cursor-pointer"
                  >
                    Auto-Select Best Tables
                  </button>
                </div>
              </div>

              {/* Table Buttons Grid */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Available Tables at {expectedArrivalTime}:
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {restaurant.tables.map((table) => {
                    const status = getTableState(table, restaurant.id, bookingDate, expectedArrivalTime, reservations);
                    const isSelected = selectedTableIds.includes(table.id);
                    const isAvailable = status === 'available' || isSelected;

                    return (
                      <button
                        key={table.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTableIds((prev) => prev.filter((id) => id !== table.id));
                          } else {
                            if (passengerCount <= 4) {
                              setSelectedTableIds([table.id]);
                            } else {
                              setSelectedTableIds((prev) => [...prev, table.id]);
                            }
                          }
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#4F6F52] text-white border-[#4F6F52] shadow-md ring-2 ring-[#4F6F52]'
                            : isAvailable
                            ? 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800'
                            : 'bg-stone-100 border-stone-200 text-stone-400 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{table.tableNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {table.capacity} Seats
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] truncate opacity-80">
                          {table.section}
                        </div>
                        <div className="mt-1 text-[10px] font-semibold">
                          {isSelected ? '✓ Selected' : isAvailable ? 'Available' : 'Reserved'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Seating Summary */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                <span>
                  <strong>Selected Seating:</strong> {selectedTableIds.length} Table(s)
                </span>
                <span className="font-bold">
                  {selectedTableIds.map((tid) => restaurant.tables.find(t => t.id === tid)?.tableNumber).join(', ') || 'None selected'}
                </span>
              </div>

              {/* Navigation CTAs */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('food_selection')}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Menu</span>
                </button>

                <button
                  type="button"
                  disabled={selectedTableIds.length === 0}
                  onClick={() => setStep('review_payment')}
                  className="px-6 py-2.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <span>Review & Confirm</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: Review, Preparation Timeline & Final Confirmation */}
          {step === 'review_payment' && (
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-3xl border border-stone-200 space-y-4">
                <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52]">
                      Travel Reservation Summary
                    </span>
                    <h3 className="text-lg font-bold font-serif text-stone-900 mt-0.5">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-stone-500">{restaurant.address}</p>
                  </div>

                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      fulfillmentType === 'dine_in'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {fulfillmentType === 'dine_in' ? '🍽️ Dine-In Reserved' : '🥡 Takeaway Parcel'}
                    </span>
                  </div>
                </div>

                {/* Arrival & Preparation Banner matching Prompt requirement */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        {fulfillmentType === 'dine_in'
                          ? `Travelling Customer – Expected Arrival ${expectedArrivalTime}`
                          : `Travel Parcel – Expected Collection ${expectedArrivalTime}`}
                      </div>
                      <p className="text-xs text-amber-800 mt-0.5">
                        {passengerCount} Passengers • Bus: {busOperator} ({busNumberOrPnr})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500 text-stone-950 font-bold text-xs shadow-xs">
                        {prepRecommendation.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-900 mt-2 border-t border-amber-200/80 pt-2">
                    ⚡ {prepRecommendation.advice}
                  </p>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50">
                    <span className="text-stone-400 block text-[10px] font-semibold">PASSENGERS</span>
                    <span className="font-bold text-stone-800">{passengerCount} Guests</span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50">
                    <span className="text-stone-400 block text-[10px] font-semibold">TRANSIT STOP</span>
                    <span className="font-bold text-stone-800 truncate block">{selectedBusStopName}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50">
                    <span className="text-stone-400 block text-[10px] font-semibold">TABLE / COUNTER</span>
                    <span className="font-bold text-stone-800">
                      {fulfillmentType === 'dine_in' 
                        ? selectedTableIds.map(tid => restaurant.tables.find(t => t.id === tid)?.tableNumber).join(', ')
                        : 'Curbside Parcel Express'}
                    </span>
                  </div>
                </div>

                {/* Pre-ordered Food Summary */}
                <div className="border-t border-stone-100 pt-3">
                  <div className="text-xs font-bold text-stone-800 mb-2 flex items-center justify-between">
                    <span>Pre-ordered Food ({cartItems.reduce((acc, c) => acc + c.quantity, 0)} meals):</span>
                    <span>₹{foodTotal}</span>
                  </div>
                  {cartItems.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No food pre-ordered yet. You can order upon arrival.</p>
                  ) : (
                    <div className="space-y-1 text-xs text-stone-600 max-h-28 overflow-y-auto">
                      {cartItems.map((c) => (
                        <div key={c.item.id} className="flex justify-between">
                          <span>{c.quantity}x {c.item.name} ({c.dietaryTag})</span>
                          <span className="font-mono">₹{c.item.price * c.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Special Requests */}
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">
                    Kitchen or Travel Notes (e.g. quick 5-min bus halt, separate packing):
                  </label>
                  <input
                    type="text"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. Bus stops for only 10 minutes, keep takeaway packed and ready"
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-xl text-xs"
                  />
                </div>

              </div>

              {/* Confirm Button */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(fulfillmentType === 'dine_in' ? 'table_selection' : 'food_selection')}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeBooking}
                  className="px-8 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <span>Confirm Travel Booking</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 5: Booking Confirmation & Digital QR Pass */}
          {step === 'confirmed' && confirmedReservation && (
            <div className="space-y-6 text-center py-4">
              
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#4F6F52]">
                  Booking Confirmed & Dispatched to Kitchen
                </span>
                <h3 className="text-2xl font-bold font-serif text-stone-900 mt-1">
                  Ready for Arrival at {expectedArrivalTime}
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Reference: <strong className="font-mono text-stone-800">{confirmedReservation.bookingRef}</strong>
                </p>
              </div>

              {/* Status Stepper */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Live Travel Status:
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                  <span className="text-emerald-700 font-bold">✓ Booking Requested</span>
                  <span>→</span>
                  <span className="text-emerald-700 font-bold">✓ Restaurant Confirmed</span>
                  <span>→</span>
                  <span className="text-amber-600 font-bold">Food Preparation</span>
                  <span>→</span>
                  <span>Ready for Handover</span>
                </div>
              </div>

              {/* QR Code Pass for Curbside / Table Check-In */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 inline-block shadow-md max-w-sm mx-auto">
                <div className="w-44 h-44 bg-stone-900 text-white rounded-2xl mx-auto flex flex-col items-center justify-center p-3 shadow-inner">
                  <QrCode className="w-32 h-32 text-white" />
                  <span className="text-[9px] font-mono tracking-widest mt-1 text-stone-300">
                    {confirmedReservation.bookingRef}
                  </span>
                </div>
                <div className="mt-3 text-xs font-bold text-stone-800">
                  {fulfillmentType === 'dine_in'
                    ? `Show QR at Table ${confirmedReservation.tableNumber}`
                    : `Show QR for Curbside Express Parcel Handover`}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Kitchen Helpline: {restaurant.customerCareNumber || restaurant.contactNumber}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-md"
                >
                  Done & View in My Bookings
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Nested Allergen & Dietary Tag Modal */}
      {activeTagItem && (
        <AllergenDietaryTagModal
          isOpen={true}
          onClose={() => setActiveTagItem(null)}
          item={activeTagItem.item}
          initialData={{
            intendedFor: cartItems[activeTagItem.index ?? 0]?.intendedFor,
            dietaryTag: cartItems[activeTagItem.index ?? 0]?.dietaryTag,
            allergenTags: cartItems[activeTagItem.index ?? 0]?.allergenTags,
            severity: cartItems[activeTagItem.index ?? 0]?.severity,
            kitchenNotes: cartItems[activeTagItem.index ?? 0]?.kitchenNotes,
          }}
          onSave={(data) => {
            if (activeTagItem.index !== undefined) {
              setCartItems((prev) =>
                prev.map((c, i) =>
                  i === activeTagItem.index
                    ? {
                        ...c,
                        intendedFor: data.intendedFor || c.intendedFor,
                        dietaryTag: data.dietaryPreference || c.dietaryTag,
                        allergenTags: data.allergens || [],
                        severity: data.severity,
                        kitchenNotes: data.kitchenNotes || '',
                      }
                    : c
                )
              );
            }
            setActiveTagItem(null);
          }}
        />
      )}

    </div>
  );
};
