import React, { useState, useMemo } from 'react';
import { 
  Bus, 
  Clock, 
  Users, 
  UtensilsCrossed, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowRight, 
  QrCode, 
  Phone, 
  MapPin, 
  Calendar, 
  ChefHat, 
  Sparkles, 
  ShieldAlert, 
  Check, 
  RefreshCw,
  TrendingUp,
  Flame,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { 
  Restaurant, 
  Reservation, 
  TravelBookingStatus, 
  TravelFoodPrepStatus, 
  TravelFulfillmentType 
} from '../types';
import { getRecommendedTravelPrepStatus, calculateTravelArrivalEta } from '../data/travelRoutesData';
import { formatINR } from '../utils/priceUtils';

interface TravelBookingsTabProps {
  restaurant: Restaurant;
  reservations: Reservation[];
  onUpdateReservation: (resId: string, updated: Partial<Reservation>) => void;
  onToast?: (message: string) => void;
  onOpenQrScanner?: () => void;
}

const BOOKING_STATUS_STEPS: TravelBookingStatus[] = [
  'Booking Requested',
  'Restaurant Confirmed',
  'Food Preparation',
  'Ready',
  'Passenger Arrived',
  'QR Check-in / Parcel Collected',
  'Completed',
];

export const TravelBookingsTab: React.FC<TravelBookingsTabProps> = ({
  restaurant,
  reservations,
  onUpdateReservation,
  onToast,
  onOpenQrScanner,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'parcel'>('all');
  const [filterPrepStatus, setFilterPrepStatus] = useState<'all' | TravelFoodPrepStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResId, setSelectedResId] = useState<string | null>(null);

  // Filter reservations that are travel bookings for this restaurant
  const travelBookings = useMemo(() => {
    return reservations.filter((r) => {
      // Must be for this restaurant (or flexible matching if ID format differs)
      const isRestMatch = 
        r.restaurantId === restaurant.id || 
        r.restaurantName.toLowerCase().includes(restaurant.name.toLowerCase());
      if (!isRestMatch) return false;

      // Must be a travel booking
      const isTravel = Boolean(r.travelDetails?.isTravellingByBus || r.id.includes('travel') || r.bookingRef.includes('TRV'));
      if (!isTravel) return false;

      // Filter by type
      if (filterType !== 'all') {
        const type = r.travelDetails?.fulfillmentType || (r.tableId.includes('parcel') ? 'parcel' : 'dine_in');
        if (type !== filterType) return false;
      }

      // Filter by prep status
      if (filterPrepStatus !== 'all') {
        const prep = r.travelDetails?.prepStatus || 'Prepare Soon';
        if (prep !== filterPrepStatus) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (r.customerName || '').toLowerCase().includes(q);
        const matchesRef = (r.bookingRef || '').toLowerCase().includes(q);
        const matchesBus = (r.travelDetails?.busOperator || '').toLowerCase().includes(q) || (r.travelDetails?.busNumberOrPnr || '').toLowerCase().includes(q);
        const matchesTable = (r.tableNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRef && !matchesBus && !matchesTable) return false;
      }

      return true;
    });
  }, [reservations, restaurant, filterType, filterPrepStatus, searchQuery]);

  // Active inspected reservation
  const activeReservation = useMemo(() => {
    if (selectedResId) {
      const found = travelBookings.find((r) => r.id === selectedResId);
      if (found) return found;
    }
    return travelBookings[0] || null;
  }, [travelBookings, selectedResId]);

  // Update prep status handler
  const handleUpdatePrepStatus = (res: Reservation, newStatus: TravelFoodPrepStatus) => {
    const updatedDetails = {
      ...(res.travelDetails || {
        isTravellingByBus: true,
        fulfillmentType: 'dine_in' as TravelFulfillmentType,
        passengerCount: res.guests,
        expectedArrivalTime: res.timeIn || '08:15 PM',
        travelStatus: 'Food Preparation' as TravelBookingStatus,
      }),
      prepStatus: newStatus,
    };

    // Auto-advance booking status if prep status is Ready
    if (newStatus === 'Ready' && updatedDetails.travelStatus !== 'Passenger Arrived' && updatedDetails.travelStatus !== 'Completed') {
      updatedDetails.travelStatus = 'Ready';
    }

    onUpdateReservation(res.id, {
      travelDetails: updatedDetails,
    });

    if (onToast) {
      onToast(`Kitchen status updated to "${newStatus}" for ${res.customerName}.`);
    }
  };

  // Update booking status lifecycle handler
  const handleUpdateBookingStatus = (res: Reservation, newStatus: TravelBookingStatus) => {
    const updatedDetails = {
      ...(res.travelDetails || {
        isTravellingByBus: true,
        fulfillmentType: 'dine_in' as TravelFulfillmentType,
        passengerCount: res.guests,
        expectedArrivalTime: res.timeIn || '08:15 PM',
        prepStatus: 'Prepare Soon' as TravelFoodPrepStatus,
      }),
      travelStatus: newStatus,
    };

    // Auto-sync base reservation status if seated or completed
    let baseStatus = res.status;
    if (newStatus === 'Passenger Arrived' || newStatus === 'QR Check-in / Parcel Collected') {
      baseStatus = 'seated';
    } else if (newStatus === 'Completed') {
      baseStatus = 'completed';
    }

    onUpdateReservation(res.id, {
      travelDetails: updatedDetails,
      status: baseStatus,
    });

    if (onToast) {
      onToast(`Travel Booking status updated to "${newStatus}".`);
    }
  };

  // Quick Action: Simulate Passenger QR Scan Verification
  const handleVerifyPassengerQr = (res: Reservation) => {
    const isParcel = res.travelDetails?.fulfillmentType === 'parcel';
    const nextStatus: TravelBookingStatus = isParcel ? 'QR Check-in / Parcel Collected' : 'Passenger Arrived';
    handleUpdateBookingStatus(res, nextStatus);

    if (onToast) {
      onToast(
        isParcel
          ? `QR Verified! Parcel handed over to travelling passenger (${res.customerName}).`
          : `QR Verified! Host seated passenger party (${res.customerName}) at Table ${res.tableNumber}.`
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-stone-950 p-6 sm:p-8 rounded-3xl shadow-md border border-amber-400 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-950/15 text-stone-950 text-xs font-extrabold uppercase tracking-widest rounded-full mb-2">
            <Bus className="w-3.5 h-3.5" />
            <span>Transit Kitchen Pacing & Curbside Pickup Console</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-950">
            Travel Bookings
          </h2>
          <p className="text-xs sm:text-sm text-stone-900 mt-1 max-w-2xl font-medium">
            Manage advance food orders and seating reserved by passengers travelling on bus routes. Align dish preparation timing so meals are piping hot at arrival.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenQrScanner && (
            <button
              onClick={onOpenQrScanner}
              className="px-4 py-2.5 rounded-full bg-stone-950 hover:bg-stone-900 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shrink-0"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Scan Travel QR Pass</span>
            </button>
          )}

          <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-300 text-center">
            <span className="block text-[10px] font-bold text-stone-700 uppercase">ACTIVE TRAVEL ORDERS</span>
            <span className="font-mono text-xl font-black text-stone-950">{travelBookings.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E6E1] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Fulfillment Filter */}
          <div className="flex items-center bg-[#FAF9F6] p-1 rounded-xl border border-[#E8E6E1] text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-[#2C3333] text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Types ({travelBookings.length})
            </button>
            <button
              onClick={() => setFilterType('dine_in')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'dine_in' ? 'bg-[#4F6F52] text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Dine-In</span>
            </button>
            <button
              onClick={() => setFilterType('parcel')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'parcel' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Takeaway Parcel</span>
            </button>
          </div>

          {/* Prep Status Filter */}
          <select
            value={filterPrepStatus}
            onChange={(e) => setFilterPrepStatus(e.target.value as any)}
            className="px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs font-semibold text-stone-700 focus:outline-none"
          >
            <option value="all">All Prep Statuses</option>
            <option value="Prepare Soon">Prepare Soon</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready">Ready</option>
            <option value="Served / Handed Over">Served / Handed Over</option>
          </select>

        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search passenger, bus, PNR, table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs focus:outline-none focus:border-[#4F6F52]"
          />
        </div>
      </div>

      {/* Main Content Split: List & Detailed Inspection Panel */}
      {travelBookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8E6E1] p-12 text-center">
          <Bus className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No travel bookings found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            Passengers travelling by bus will appear here as soon as they make an advance table reservation or parcel food pre-order.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Bookings Cards List */}
          <div className="lg:col-span-5 space-y-3">
            {travelBookings.map((res) => {
              const details = res.travelDetails;
              const isSelected = activeReservation?.id === res.id;
              const isParcel = details?.fulfillmentType === 'parcel' || res.tableId.includes('parcel');
              const prepStatus = details?.prepStatus || 'Prepare Soon';
              const arrivalTime = details?.expectedArrivalTime || res.timeIn || res.timeSlot;

              return (
                <div
                  key={res.id}
                  onClick={() => setSelectedResId(res.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400'
                      : 'bg-white hover:bg-stone-50 border-[#E8E6E1]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-stone-500">
                          {res.bookingRef}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isParcel ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {isParcel ? '🥡 Parcel' : '🍽️ Dine-In'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 mt-1">
                        {res.customerName}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {res.guests} Passengers • {details?.busOperator || 'Bus Transit'} ({details?.busNumberOrPnr || 'PNR'})
                      </p>
                    </div>

                    <div className="text-right">
                      {/* Prep Status Badge */}
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        prepStatus === 'Ready'
                          ? 'bg-emerald-500 text-white'
                          : prepStatus === 'Preparing'
                          ? 'bg-amber-500 text-stone-950 animate-pulse'
                          : 'bg-stone-200 text-stone-800'
                      }`}>
                        {prepStatus}
                      </span>
                    </div>
                  </div>

                  {/* Expected Arrival Banner */}
                  <div className="mt-3 p-2 rounded-xl bg-white border border-[#E8E6E1] flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isParcel ? 'Collection:' : 'Arrival:'} <strong>{arrivalTime}</strong></span>
                    </span>
                    <span className="font-mono font-bold text-[#4F6F52]">
                      {isParcel ? 'Curbside' : `Table ${res.tableNumber}`}
                    </span>
                  </div>

                  {/* Pre-ordered Food Pill */}
                  {res.foodOrder && res.foodOrder.items && res.foodOrder.items.length > 0 && (
                    <div className="mt-2 text-[11px] text-stone-600 flex items-center justify-between">
                      <span className="truncate">
                        🍱 {res.foodOrder.items.length} dishes pre-ordered (₹{res.foodOrder.foodTotal})
                      </span>
                      {res.foodOrder.hasAllergenAlert && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          Allergen Alert
                        </span>
                      )}
                    </div>
                  )}

                  {/* Group Seating Pill */}
                  {res.guests >= 5 && (
                    <div className="mt-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                      ⭐ Group Tour Seating ({res.guests} passengers)
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Detailed Active Travel Booking Management */}
          {activeReservation && (
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 shadow-sm space-y-5">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8E6E1]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-500">
                        {activeReservation.bookingRef}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        activeReservation.travelDetails?.fulfillmentType === 'parcel'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {activeReservation.travelDetails?.fulfillmentType === 'parcel'
                          ? '🥡 Takeaway Parcel'
                          : '🍽️ Dine-In Table'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-serif text-stone-900 mt-1">
                      {activeReservation.customerName}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Phone: <a href={`tel:${activeReservation.customerPhone}`} className="text-[#4F6F52] font-semibold underline">{activeReservation.customerPhone}</a>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerifyPassengerQr(activeReservation)}
                      className="px-4 py-2 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Verify Arrival / Handover</span>
                    </button>
                  </div>
                </div>

                {/* Arrival & Preparation Banner (Exact requirement 5) */}
                <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-amber-950">
                        {activeReservation.travelDetails?.fulfillmentType === 'parcel'
                          ? `Travel Parcel – Expected Collection ${activeReservation.travelDetails?.expectedArrivalTime || activeReservation.timeIn}`
                          : `Travelling Customer – Expected Arrival ${activeReservation.travelDetails?.expectedArrivalTime || activeReservation.timeIn}`}
                      </div>
                      <p className="text-xs text-amber-900">
                        Passengers: <strong>{activeReservation.guests}</strong> • Bus: <strong>{activeReservation.travelDetails?.busOperator || 'Bus Route'}</strong> ({activeReservation.travelDetails?.busNumberOrPnr || 'PNR'})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">KITCHEN PREP STATUS</span>
                      <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500 text-stone-950 inline-block mt-0.5 shadow-2xs">
                        {activeReservation.travelDetails?.prepStatus || 'Prepare Soon'}
                      </span>
                    </div>
                  </div>

                  {/* Food Prep Status Switcher Buttons */}
                  <div className="pt-2 border-t border-amber-300/80 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-amber-950">Update Kitchen:</span>
                    {(['Prepare Soon', 'Preparing', 'Ready', 'Served / Handed Over'] as TravelFoodPrepStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdatePrepStatus(activeReservation, st)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeReservation.travelDetails?.prepStatus === st
                            ? 'bg-[#2C3333] text-white shadow-xs'
                            : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seating / Table & Transit Information */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">FLOOR & TABLE</span>
                    <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                      {activeReservation.travelDetails?.fulfillmentType === 'parcel'
                        ? 'Curbside Express'
                        : `Table ${activeReservation.tableNumber}`}
                    </span>
                    <span className="text-[10px] text-stone-500">{activeReservation.section}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">PASSENGERS</span>
                    <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                      {activeReservation.guests} People
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {activeReservation.guests >= 5 ? 'Group Tour' : 'Standard'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">BUS STOP HALT</span>
                    <span className="font-bold text-stone-900 truncate mt-0.5 block">
                      {activeReservation.travelDetails?.busStopName || '100ft Rd Bus Stop'}
                    </span>
                    <span className="text-[10px] text-stone-500">{activeReservation.travelDetails?.routeNumber || 'NH 75'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">CONFIG PREP TIME</span>
                    <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                      {restaurant.averageFoodPrepMinutes || 20} Minutes
                    </span>
                    <span className="text-[10px] text-stone-500">Fresh cooking</span>
                  </div>
                </div>

                {/* Booking Status Lifecycle Stepper (Exact requirement 8) */}
                <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                    <span>Booking Status Lifecycle:</span>
                    <span className="text-[#4F6F52] font-mono">
                      {activeReservation.travelDetails?.travelStatus || 'Restaurant Confirmed'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    {BOOKING_STATUS_STEPS.map((step, idx) => {
                      const currentStatus = activeReservation.travelDetails?.travelStatus || 'Restaurant Confirmed';
                      const isPastOrCurrent = BOOKING_STATUS_STEPS.indexOf(currentStatus) >= idx;
                      const isCurrent = currentStatus === step;

                      return (
                        <button
                          key={step}
                          onClick={() => handleUpdateBookingStatus(activeReservation, step)}
                          className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#4F6F52] text-white font-bold ring-2 ring-[#4F6F52]'
                              : isPastOrCurrent
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                          }`}
                        >
                          {step}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pre-ordered Food with Allergen & Dietary Requirements (Requirement 7) */}
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <ChefHat className="w-4 h-4 text-[#4F6F52]" />
                      <span>Pre-Ordered Food & Meals:</span>
                    </span>
                    <span className="text-xs font-bold text-stone-900 font-mono">
                      ₹{activeReservation.foodOrder?.foodTotal || 0}
                    </span>
                  </div>

                  {/* Dietary / Allergen Alert Notice */}
                  {activeReservation.travelDetails?.dietaryRequirementsSummary && 
                   activeReservation.travelDetails.dietaryRequirementsSummary.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Dietary & Allergen Requirements:</strong>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                          {activeReservation.travelDetails.dietaryRequirementsSummary.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Food Items List */}
                  {activeReservation.foodOrder && activeReservation.foodOrder.items ? (
                    <div className="space-y-2">
                      {activeReservation.foodOrder.items.map((dish, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white border border-[#E8E6E1] flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-2">
                              <span>{dish.quantity}x {dish.name}</span>
                              {dish.dietaryTag && dish.dietaryTag !== 'Standard' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                  {dish.dietaryTag}
                                </span>
                              )}
                              {dish.allergenTags && dish.allergenTags.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 font-bold">
                                  ⚠️ {dish.allergenTags.join(', ')}
                                </span>
                              )}
                            </div>
                            {dish.kitchenNotes && (
                              <p className="text-[11px] text-amber-900 mt-0.5 font-medium">
                                Note: {dish.kitchenNotes}
                              </p>
                            )}
                          </div>
                          <span className="font-mono font-bold text-stone-800">
                            ₹{dish.price * dish.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic">No food pre-ordered. Guest will order on arrival.</p>
                  )}
                </div>

                {/* Special Requests or Bus Notes */}
                {activeReservation.specialRequests && (
                  <div className="p-3 rounded-xl bg-stone-100 text-xs text-stone-700">
                    <strong className="block text-stone-900">Passenger Travel Notes:</strong>
                    <span>{activeReservation.specialRequests}</span>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
