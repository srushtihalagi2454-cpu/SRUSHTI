import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Star, 
  Clock, 
  Calendar, 
  Users, 
  Armchair, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Phone, 
  QrCode, 
  Share2, 
  Heart,
  ChevronLeft,
  BellRing,
  UtensilsCrossed,
  Receipt,
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  Lock,
  MessageSquare,
  Eye,
  Check,
  Bus
} from 'lucide-react';
import { Restaurant, Table, Reservation, SeatingPreference, SmartMatchResult, PaymentDetails, FoodOrder, SoloDinerSafetyContact, SoloSafetyNotifyMethod, RestaurantFloor } from '../types';
import { InteractiveFloorPlan } from './InteractiveFloorPlan';
import { Restaurant3DFloorPlan } from './Restaurant3DFloorPlan';
import { ensureRestaurantFloors, ensureTablesHaveFloors } from '../utils/floorUtils';
import { TimeRangePicker } from './TimeRangePicker';
import { TIME_SLOTS, getTableState } from '../data/mockData';
import { isTimeSlotWithinHours, getFormattedOperatingHours } from '../utils/operatingHours';
import { 
  calculateReservationDuration, 
  validateReservationTimeRange, 
  isTableAvailableForTimeRange 
} from '../utils/timeRangeUtils';
import { createReservationOnBackend } from '../services/reservationService';
import { getRestaurantTablesFromBackend } from '../services/tableService';
import { FoodOrderModal } from './FoodOrderModal';
import { DepositPaymentStep } from './DepositPaymentStep';
import { 
  formatIndianPhone, 
  formatSafetyMessage, 
  saveSoloSafety, 
  serializeSafetyToSpecialRequests 
} from '../services/soloSafetyService';

interface BookingModalProps {
  restaurant: Restaurant;
  onClose: () => void;
  onCompleteBooking: (newReservation: Reservation) => void;
  reservations: Reservation[];
  onOpenNotifyMe: (restaurant: Restaurant, date: string, timeSlot: string, guests: number, preference: string) => void;
  currentUser?: {
    userId?: string;
    fullName: string;
    email: string;
    phone: string;
  };
  onViewMyReservations?: () => void;
  onViewMenu?: (restaurant: Restaurant) => void;
  onOpenMenuQr?: (restaurant: Restaurant) => void;
  initialTimeIn?: string;
  initialTimeOut?: string;
  initialDate?: string;
  onSwitchToTravelBooking?: (restaurant: Restaurant) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  restaurant,
  onClose,
  onCompleteBooking,
  reservations,
  onOpenNotifyMe,
  currentUser,
  onViewMyReservations,
  onViewMenu,
  onOpenMenuQr,
  initialTimeIn,
  initialTimeOut,
  initialDate,
  onSwitchToTravelBooking,
}) => {
  // Step 1: 'select_table' -> Step 2: 'review' -> Step 3: 'payment' (₹200 Booking Fee) -> Step 4: 'confirmed'
  const [step, setStep] = useState<'select_table' | 'review' | 'payment' | 'confirmed'>('select_table');
  const [showBusTravelPrompt, setShowBusTravelPrompt] = useState<boolean>(true);

  // Booking parameters - Manual Time In and Time Out (Customer-defined range)
  const [date, setDate] = useState<string>(() => initialDate || new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState<string>(() => initialTimeIn || '7:30 PM');
  const [timeOut, setTimeOut] = useState<string>(() => initialTimeOut || '9:15 PM');
  const [guests, setGuests] = useState<number>(2);
  const [seatingPreference, setSeatingPreference] = useState<SeatingPreference>('all');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Time Range duration and operating hours validation
  const durationResult = useMemo(() => {
    return calculateReservationDuration(timeIn, timeOut);
  }, [timeIn, timeOut]);

  const hoursValidation = useMemo(() => {
    return validateReservationTimeRange(timeIn, timeOut, restaurant.openingHours);
  }, [timeIn, timeOut, restaurant.openingHours]);

  const timeSlot = useMemo(() => {
    return `${timeIn} → ${timeOut}`;
  }, [timeIn, timeOut]);

  // Customer details (pre-filled with logged-in customer info)
  const [customerName, setCustomerName] = useState(currentUser?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [specialRequests, setSpecialRequests] = useState('Window seating preferred, celebrating family get-together.');

  // Solo Diner Safety Check-In State
  const [soloSafetyEnabled, setSoloSafetyEnabled] = useState<boolean>(guests === 1);
  const [safetyContactName, setSafetyContactName] = useState<string>('');
  const [safetyContactPhone, setSafetyContactPhone] = useState<string>('');
  const [safetyRelationship, setSafetyRelationship] = useState<string>('Parent / Family');
  const [safetyNotifyMethod, setSafetyNotifyMethod] = useState<SoloSafetyNotifyMethod>('Both');
  const [safetyCustomNote, setSafetyCustomNote] = useState<string>('');

  // Auto-suggest enabling solo safety when user selects 1 guest
  useEffect(() => {
    if (guests === 1) {
      setSoloSafetyEnabled(true);
    }
  }, [guests]);

  useEffect(() => {
    if (currentUser?.fullName) setCustomerName(currentUser.fullName);
    if (currentUser?.phone) setCustomerPhone(currentUser.phone);
    if (currentUser?.email) setCustomerEmail(currentUser.email);
  }, [currentUser]);
  
  // Confirmed booking state
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  const [showCancellationPolicyPopup, setShowCancellationPolicyPopup] = useState(false);
  const [cancellationGraceSeconds, setCancellationGraceSeconds] = useState(180); // 3 mins (180s)
  const [showFoodOrderModal, setShowFoodOrderModal] = useState(false);
  const [bookedFoodOrder, setBookedFoodOrder] = useState<FoodOrder | null>(null);

  // Countdown timer for 3-minute cancellation grace window
  useEffect(() => {
    if (!showCancellationPolicyPopup) return;
    const interval = setInterval(() => {
      setCancellationGraceSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [showCancellationPolicyPopup]);

  const handleFoodOrderSaved = (order: FoodOrder) => {
    setBookedFoodOrder(order);
    if (createdReservation) {
      const updated: Reservation = {
        ...createdReservation,
        foodOrder: order,
      };
      setCreatedReservation(updated);
      onCompleteBooking(updated);
    }
  };

  const operatingHoursInfo = useMemo(() => {
    return getFormattedOperatingHours(restaurant.openingHours);
  }, [restaurant.openingHours]);

  // Dynamic Floor Management
  const [floors, setFloors] = useState<RestaurantFloor[]>(() => ensureRestaurantFloors(restaurant));
  const [activeFloorId, setActiveFloorId] = useState<string>(() => floors[0]?.id || 'floor-0');
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('2D');

  useEffect(() => {
    const updatedFloors = ensureRestaurantFloors(restaurant);
    setFloors(updatedFloors);
    if (!updatedFloors.some((f) => f.id === activeFloorId)) {
      setActiveFloorId(updatedFloors[0]?.id || 'floor-0');
    }
  }, [restaurant]);

  // Dynamic table inventory for selected restaurant
  const [activeTables, setActiveTables] = useState<Table[]>(() => {
    const initialRaw = (restaurant.tables || []).filter(
      (t) => (t as any).status !== 'inactive' && (t as any).status !== 'removed'
    );
    return ensureTablesHaveFloors(initialRaw, floors);
  });

  // Sync with restaurant prop updates
  useEffect(() => {
    const valid = (restaurant.tables || []).filter(
      (t) => (t as any).status !== 'inactive' && (t as any).status !== 'removed'
    );
    setActiveTables(ensureTablesHaveFloors(valid, floors));
  }, [restaurant.tables, floors]);

  // Fetch live tables from Google Sheet backend for this specific restaurant
  useEffect(() => {
    let isMounted = true;
    async function loadRestaurantLiveTables() {
      if (!restaurant.id) return;
      try {
        const res = await getRestaurantTablesFromBackend(restaurant.id);
        if (isMounted && res.success && res.tables && res.tables.length > 0) {
          const liveActive = res.tables
            .filter((t) => t.status !== 'inactive' && t.status !== 'removed')
            .map((item) => ({
              id: item.tableId || item.id,
              tableId: item.tableId || item.id,
              restaurantId: restaurant.id,
              tableNumber: item.tableNumber,
              capacity: Number(item.capacity) || 2,
              minCapacity: Number(item.minCapacity) || 1,
              shape: (item.shape === 'circle' || item.shape === 'booth' ? item.shape : 'rect') as Table['shape'],
              section: item.section || 'Main Dining',
              features: Array.isArray(item.features) ? item.features : [],
              x: typeof item.x === 'number' ? item.x : 10,
              y: typeof item.y === 'number' ? item.y : 10,
              width: typeof item.width === 'number' ? item.width : 16,
              height: typeof item.height === 'number' ? item.height : 16,
              status: item.status || 'available',
            }));
          if (liveActive.length > 0) {
            setActiveTables(liveActive);
          }
        }
      } catch (err) {
        console.warn('Could not fetch live tables for booking modal:', err);
      }
    }
    loadRestaurantLiveTables();
    return () => {
      isMounted = false;
    };
  }, [restaurant.id]);

  // Reset selectedTable if it is no longer part of activeTables
  useEffect(() => {
    if (selectedTable && !activeTables.some((t) => t.id === selectedTable.id)) {
      setSelectedTable(null);
    }
  }, [activeTables, selectedTable]);

  // Dynamic table state calculation for the requested customer time range [timeIn -> timeOut]
  const getTableCurrentState = (table: Table) => {
    return getTableState(table, restaurant.id, date, timeIn, reservations, timeOut);
  };

  // Specific table availability verification for the currently selected table
  const selectedTableAvailability = useMemo(() => {
    if (!selectedTable) return { isAvailable: true };
    return isTableAvailableForTimeRange(
      selectedTable.id,
      selectedTable.tableNumber,
      date,
      timeIn,
      timeOut,
      reservations.filter((r) => r.restaurantId === restaurant.id)
    );
  }, [selectedTable, date, timeIn, timeOut, reservations, restaurant.id]);

  // Rule-based Smart Match Algorithm (strictly transparent, no false AI claims)
  const smartMatchResult: SmartMatchResult | null = useMemo(() => {
    const availableTables = activeTables.filter(
      (t) => getTableCurrentState(t) === 'available' && t.capacity >= guests
    );

    if (availableTables.length === 0) return null;

    let bestTable: Table | null = null;
    let highestScore = -1;
    let reasons: string[] = [];

    for (const table of availableTables) {
      let score = 50;
      const currentReasons: string[] = [];

      // 1. Capacity fit (penalize excessive spare seats, reward perfect fit)
      const excessSeats = table.capacity - guests;
      if (excessSeats === 0) {
        score += 30;
        currentReasons.push(`Optimal capacity for ${guests} guests (zero wasted seats)`);
      } else if (excessSeats <= 2) {
        score += 20;
        currentReasons.push(`Comfortable fit for ${guests} guests`);
      } else {
        score += 5;
      }

      // 2. Seating preference matching
      if (seatingPreference === 'window' && table.features.some((f) => f.toLowerCase().includes('view') || f.toLowerCase().includes('garden'))) {
        score += 20;
        currentReasons.push('Direct garden/window sightline');
      } else if (seatingPreference === 'booth' && (table.shape === 'booth' || table.features.some((f) => f.toLowerCase().includes('booth')))) {
        score += 20;
        currentReasons.push('Private plush booth acoustics');
      } else if (seatingPreference === 'terrace' && table.section === 'Courtyard Terrace') {
        score += 20;
        currentReasons.push('Courtyard outdoor breeze');
      } else if (seatingPreference === 'quiet' && table.features.some((f) => f.toLowerCase().includes('quiet') || f.toLowerCase().includes('intimate'))) {
        score += 20;
        currentReasons.push('Away from kitchen & high foot-traffic');
      } else if (seatingPreference === 'bar' && table.section === 'Bar Lounge') {
        score += 20;
        currentReasons.push('Close to craft cocktail mixology');
      } else if (seatingPreference === 'all') {
        // default perks
        if (table.features.length > 0) {
          currentReasons.push(table.features[0]);
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestTable = table;
        reasons = currentReasons;
      }
    }

    if (!bestTable) return null;

    return {
      table: bestTable,
      matchScore: Math.min(highestScore, 98),
      matchReasons: reasons,
    };
  }, [activeTables, restaurant.id, date, timeIn, timeOut, guests, seatingPreference, reservations]);

  // Handle Smart Match auto-selection
  const handleApplySmartMatch = () => {
    if (smartMatchResult) {
      setSelectedTable(smartMatchResult.table);
    }
  };

  // Backend saving state
  const [isSavingToBackend, setIsSavingToBackend] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Proceed from Review step to Payment step (₹200 deposit required)
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setBackendError('Please provide your full name and phone number to proceed.');
      return;
    }
    setBackendError(null);
    setStep('payment');
  };

  // Submit payment & confirm reservation with ₹200 Table Booking Deposit
  const handlePaymentSuccess = async (paymentDetails: PaymentDetails) => {
    await submitReservationToBackend(paymentDetails);
  };

  const submitReservationToBackend = async (paymentDetails: PaymentDetails) => {
    if (!selectedTable) return;

    if (!currentUser?.userId) {
      setBackendError('Authentication required: Please log in to your customer account before completing your table booking.');
      return;
    }

    setIsSavingToBackend(true);
    setBackendError(null);

    try {
      const soloSafetyContact: SoloDinerSafetyContact | undefined = (soloSafetyEnabled && safetyContactName.trim() && safetyContactPhone.trim()) ? {
        enabled: true,
        contactName: safetyContactName.trim(),
        contactPhone: formatIndianPhone(safetyContactPhone.trim()),
        relationship: safetyRelationship,
        notifyMethod: safetyNotifyMethod,
        customNote: safetyCustomNote.trim(),
        status: 'pending',
      } : undefined;

      const preferencesPayload = serializeSafetyToSpecialRequests(specialRequests, soloSafetyContact);

      // Book table with mandatory ₹200 deposit
      const result = await createReservationOnBackend({
        userId: currentUser.userId,
        restaurantId: restaurant.id,
        tableId: selectedTable.id,
        date,
        time: `${timeIn} - ${timeOut}`,
        guests,
        preferences: preferencesPayload,
        status: 'confirmed',
        depositAmount: 200,
        customerName,
        customerPhone,
        customerEmail,
      });

      if (!result.success || !result.reservationId) {
        setBackendError(result.message || 'Unable to confirm your reservation. Please try again.');
        setIsSavingToBackend(false);
        return;
      }

      // Successful backend persistence with server-generated reservationId and createdAt
      const backendResId = result.reservationId;
      const backendCreatedAt = result.createdAt || new Date().toISOString();
      const refSuffix = backendResId.replace(/[^0-9]/g, '').slice(-4) || `${Math.floor(1000 + Math.random() * 9000)}`;
      const refNumber = `FT-BLR-${refSuffix}`;

      if (soloSafetyContact) {
        saveSoloSafety(backendResId, soloSafetyContact);
      }

      // Paid Table Booking: ₹200 Deposit successfully transacted
      const newRes: Reservation = {
        id: backendResId,
        userId: currentUser.userId,
        bookingRef: refNumber,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address,
        restaurantCustomerCareNumber: restaurant.customerCareNumber || restaurant.contactNumber,
        tableId: selectedTable.id,
        tableNumber: selectedTable.tableNumber,
        section: selectedTable.section,
        date,
        timeSlot: `${timeIn} → ${timeOut}`,
        timeIn,
        timeOut,
        durationFormatted: durationResult.durationFormatted,
        durationMinutes: durationResult.durationMinutes,
        guests,
        customerName,
        customerPhone,
        customerEmail,
        specialRequests,
        status: 'confirmed',
        createdAt: backendCreatedAt,
        qrCodeData: `${refNumber}-${restaurant.id}-${selectedTable.tableNumber}-${guests}G-${date}-${timeIn.replace(/\s+/g, '')}-${timeOut.replace(/\s+/g, '')}`,
        noShowRiskScore: 'Low',
        depositAmount: 200,
        paymentStatus: 'paid',
        paymentMethod: paymentDetails.paymentMethod,
        paymentTransactionId: paymentDetails.transactionId,
        paymentDetails: paymentDetails,
        cancellationStatus: 'not_cancelled',
        penaltyStatus: 'none',
        soloDinerSafety: soloSafetyContact,
      };

      setCreatedReservation(newRes);
      onCompleteBooking(newRes);
      setIsSavingToBackend(false);
      setStep('confirmed');
      setShowCancellationPolicyPopup(true);
      setCancellationGraceSeconds(180);
    } catch (err: any) {
      setBackendError(err?.message || 'Network error: Failed to connect to reservation backend.');
      setIsSavingToBackend(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div 
        className="bg-[#FAF9F6] w-full max-w-5xl rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Bar */}
        <div className="bg-white px-6 py-5 border-b border-[#E8E6E1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'review' && (
              <button
                onClick={() => setStep('select_table')}
                className="p-2 rounded-full text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                title="Back to Floor Plan"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {step === 'payment' && (
              <button
                onClick={() => setStep('review')}
                className="p-2 rounded-full text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                title="Back to Guest Details"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold font-serif text-[#2C3333]">
                  {restaurant.name}
                </h2>
                <span className="text-[10px] bg-[#4F6F521A] text-[#4F6F52] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#4F6F52]/20">
                  {restaurant.neighborhood}
                </span>
                <div className="flex items-center gap-1 bg-[#FAF9F6] border border-[#E8E6E1] px-2.5 py-0.5 rounded-full text-xs font-bold text-[#2C3333]">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>{restaurant.rating}</span>
                  <span className="text-[10px] text-[#2C3333]/50 font-normal">({restaurant.reviewCount})</span>
                </div>
              </div>

              {/* Venue Address, Owner & Customer Care Contact */}
              <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-[#2C3333]/70">
                <span>{restaurant.address}</span>
                {restaurant.ownerName && (
                  <span className="text-[#2C3333]/60">
                    • Owner: <strong className="text-[#2C3333] font-semibold">{restaurant.ownerName}</strong>
                  </span>
                )}
                {(restaurant.customerCareNumber || restaurant.contactNumber) && (
                  <a
                    href={`tel:${restaurant.customerCareNumber || restaurant.contactNumber}`}
                    className="inline-flex items-center gap-1 font-bold text-[#4F6F52] bg-[#4F6F5214] px-2.5 py-0.5 rounded-full border border-[#4F6F52]/30 hover:bg-[#4F6F52] hover:text-white transition-colors"
                    title="Helpline for Table Inquiries & Reservation Support"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Customer Care: {restaurant.customerCareNumber || restaurant.contactNumber}</span>
                  </a>
                )}
              </div>

              <p className="text-xs text-[#2C3333]/60 mt-1">
                {step === 'select_table' && 'Step 1: Choose your exact table on the 2D floor blueprint'}
                {step === 'review' && 'Step 2: Enter guest details & dining preferences'}
                {step === 'payment' && 'Step 3: Pay ₹200 Table Booking Fee to guarantee reservation'}
                {step === 'confirmed' && 'Reservation Guaranteed • ₹200 Deposit Settled'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewMenu && (
              <button
                type="button"
                onClick={() => onViewMenu(restaurant)}
                className="px-3.5 py-1.5 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6E1] text-[#2C3333] border border-[#E8E6E1] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                id="modal-header-view-menu-btn"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span>View Menu</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              id="close-booking-modal-btn"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* STEP 1: Select Table & Interactive 2D Blueprint */}
        {step === 'select_table' && (
          <div className="p-4 sm:p-6 space-y-6 max-h-[85vh] overflow-y-auto">
            
            {/* Travel Dining Prompt: "Are you travelling by bus?" */}
            {showBusTravelPrompt && onSwitchToTravelBooking && (
              <div 
                className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-in fade-in"
                id="bus-travel-question-banner"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 shadow-xs border border-amber-300">
                    <Bus className="w-6 h-6 text-stone-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                        Transit Dining
                      </span>
                      {restaurant.isPopularTravelStop && (
                        <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                          ⭐ Popular Travel Stop
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm sm:text-base font-bold font-serif text-stone-900 mt-0.5">
                      Are you travelling by bus?
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                      Book food or reserve a table while you are still travelling. Restaurant prepares meals to match your bus arrival time or express parcel collection.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToTravelBooking(restaurant);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    id="btn-travel-bus-yes"
                  >
                    <Bus className="w-3.5 h-3.5" />
                    <span>Yes, I'm travelling by bus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBusTravelPrompt(false)}
                    className="px-3.5 py-2.5 rounded-full bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider border border-stone-200 transition-colors cursor-pointer"
                    id="btn-travel-bus-no"
                  >
                    <span>No</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter & Preferences Ribbon */}
            <div className="bg-white p-5 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Date */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3 h-3 text-[#4F6F52]" /> Reservation Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setSelectedTable(null);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
                  />
                </div>

                {/* Guests */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 flex items-center gap-1.5 mb-1.5">
                    <Users className="w-3 h-3 text-[#4F6F52]" /> Guests
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => {
                      setGuests(Number(e.target.value));
                      setSelectedTable(null);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333] cursor-pointer"
                  >
                    <option value={1}>1 Guest (Solo)</option>
                    <option value={2}>2 Guests (Couple)</option>
                    <option value={3}>3 Guests</option>
                    <option value={4}>4 Guests (Family / Friends)</option>
                    <option value={5}>5 Guests</option>
                    <option value={6}>6 Guests (Large Table)</option>
                    <option value={8}>8 Guests (Grand Banquet)</option>
                  </select>
                  {guests === 1 && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 animate-in fade-in">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Solo Diner Safety alert available on next step</span>
                    </div>
                  )}
                </div>

                {/* Seating Preference */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 flex items-center gap-1.5 mb-1.5">
                    <Armchair className="w-3 h-3 text-[#4F6F52]" /> Seating Preference
                  </label>
                  <select
                    value={seatingPreference}
                    onChange={(e) => {
                      setSeatingPreference(e.target.value as SeatingPreference);
                      setSelectedTable(null);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333] cursor-pointer"
                  >
                    <option value="all">Any Available Table</option>
                    <option value="window">Garden / Window View</option>
                    <option value="booth">Cozy Velvet Booth</option>
                    <option value="terrace">Courtyard Terrace</option>
                    <option value="quiet">Quiet / Intimate Corner</option>
                    <option value="bar">Mixology Bar Lounge</option>
                  </select>
                </div>

              </div>

              {/* Time In & Time Out Component */}
              <div className="pt-2 border-t border-[#E8E6E1]/80">
                <TimeRangePicker
                  timeIn={timeIn}
                  timeOut={timeOut}
                  onChangeTimeIn={(newIn) => {
                    setTimeIn(newIn);
                    setSelectedTable(null);
                  }}
                  onChangeTimeOut={(newOut) => {
                    setTimeOut(newOut);
                    setSelectedTable(null);
                  }}
                  restaurantOpeningHours={restaurant.openingHours}
                />
              </div>
            </div>

            {/* Conflict Alert if selected table is unavailable for the requested Time In -> Time Out */}
            {selectedTable && !selectedTableAvailability.isAvailable && (
              <div
                className="p-4 bg-amber-50 border border-amber-300 rounded-3xl flex items-start gap-3 text-xs text-amber-900 shadow-sm"
                id="selected-table-conflict-banner"
              >
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-amber-950">
                    Table {selectedTable.tableNumber} is unavailable for this period
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    {selectedTableAvailability.conflictReason ||
                      `Table ${selectedTable.tableNumber} has a conflicting reservation during ${timeIn} → ${timeOut}. Please select another time range or choose a highlighted available table on the floor plan below.`}
                  </p>
                </div>
              </div>
            )}

            {/* View Mode Toggle: 3D Floor View vs 2D Blueprint */}
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-[#E8E6E1] shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#2C3333]">Floor Presentation:</span>
                <span className="text-[11px] text-[#2C3333]/60 hidden sm:inline">
                  Interactive multi-floor restaurant visualization
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-xl border border-[#E8E6E1]">
                <button
                  type="button"
                  onClick={() => setViewMode('3D')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === '3D'
                      ? 'bg-[#4F6F52] text-white shadow-2xs'
                      : 'text-[#2C3333]/70 hover:text-[#2C3333]'
                  }`}
                  id="btn-viewmode-3d"
                >
                  <span>3D Interactive View</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full uppercase">3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('2D')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === '2D'
                      ? 'bg-[#4F6F52] text-white shadow-2xs'
                      : 'text-[#2C3333]/70 hover:text-[#2C3333]'
                  }`}
                  id="btn-viewmode-2d"
                >
                  <span>2D Blueprint</span>
                </button>
              </div>
            </div>

            {/* Render 3D Floor Plan or 2D Blueprint Component */}
            {viewMode === '3D' ? (
              <Restaurant3DFloorPlan
                floors={floors}
                activeFloorId={activeFloorId}
                onSelectFloor={(fId) => setActiveFloorId(fId)}
                tables={activeTables}
                selectedTableId={selectedTable?.id || null}
                onSelectTable={(table) => setSelectedTable(table)}
                getTableStatus={getTableCurrentState}
                date={date}
                timeSlot={timeSlot}
                guests={guests}
                seatingPreference={seatingPreference}
                smartMatch={smartMatchResult}
                onApplySmartMatch={handleApplySmartMatch}
                isAdminView={false}
              />
            ) : (
              <InteractiveFloorPlan
                tables={activeTables}
                selectedTableId={selectedTable?.id || null}
                onSelectTable={(table) => setSelectedTable(table)}
                date={date}
                timeSlot={timeSlot}
                guests={guests}
                seatingPreference={seatingPreference}
                getTableStatus={getTableCurrentState}
                smartMatch={smartMatchResult}
                onApplySmartMatch={handleApplySmartMatch}
                onOpenNotifyMe={() => onOpenNotifyMe(restaurant, date, timeSlot, guests, seatingPreference)}
                floors={floors}
                activeFloorId={activeFloorId}
                onSelectFloor={(fId) => setActiveFloorId(fId)}
              />
            )}

            {/* Bottom Action Strip */}
            <div className="bg-white p-5 rounded-3xl border border-[#E8E6E1] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-[#2C3333]/70">
                <ShieldCheck className="w-4 h-4 text-[#4F6F52]" />
                <span>Zero reservation fee • Time In ({timeIn}) → Time Out ({timeOut}) locked for your table</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  disabled={!selectedTable || !durationResult.isValid || !hoursValidation.isValid || !selectedTableAvailability.isAvailable}
                  onClick={() => setStep('review')}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-full font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    selectedTable && durationResult.isValid && hoursValidation.isValid && selectedTableAvailability.isAvailable
                      ? 'bg-[#2C3333] hover:bg-[#4F6F52] text-white'
                      : 'bg-[#E8E6E1] text-[#2C3333]/40 cursor-not-allowed'
                  }`}
                  id="proceed-to-review-btn"
                >
                  <span>
                    {!selectedTable
                      ? 'Select a Table to Continue'
                      : !selectedTableAvailability.isAvailable
                      ? `Table ${selectedTable.tableNumber} Unavailable`
                      : !durationResult.isValid
                      ? 'Invalid Time Range'
                      : !hoursValidation.isValid
                      ? 'Outside Operating Hours'
                      : `Proceed with Table ${selectedTable.tableNumber}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* What Diners Say / Reviews Section */}
            {restaurant.reviews && restaurant.reviews.length > 0 && (
              <section className="bg-white p-6 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-4" id="restaurant-reviews-section">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#E8E6E1]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-serif font-bold text-[#2C3333]">
                        What Diners Say
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6F52] bg-[#4F6F52]/10 px-2.5 py-0.5 rounded-full border border-[#4F6F52]/20">
                        Verified Reviews
                      </span>
                    </div>
                    <p className="text-xs text-[#2C3333]/60 mt-0.5">
                      Recent dining feedback from verified reservations
                    </p>
                  </div>

                  {/* Prominent Star Rating Display */}
                  <div className="flex items-center gap-3 bg-[#FAF9F6] px-4 py-2 rounded-2xl border border-[#E8E6E1] self-start sm:self-auto">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                      <span className="text-lg font-bold text-[#2C3333]">{restaurant.rating}</span>
                      <span className="text-xs text-[#2C3333]/50">/ 5.0</span>
                    </div>
                    <div className="h-4 w-px bg-[#E8E6E1]" />
                    <span className="text-xs font-medium text-[#2C3333]/70">
                      {restaurant.reviewCount.toLocaleString()} ratings
                    </span>
                  </div>
                </div>

                {/* 2-3 Review Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {restaurant.reviews.map((rev, idx) => (
                    <div
                      key={idx}
                      className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E8E6E1] flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          {[...Array(rev.rating || 5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-xs text-[#2C3333]/85 italic leading-relaxed">
                          "{rev.comment || rev.quote}"
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#E8E6E1]/60 flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#2C3333]">
                          — {rev.author}
                        </span>
                        <span className="text-[10px] text-[#4F6F52] font-medium">
                          Verified Diner
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {/* STEP 2: Review Booking & Enter Customer Info */}
        {step === 'review' && selectedTable && (
          <form onSubmit={handleProceedToPayment} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
            
            {/* Restaurant Venue & Contact Helpline */}
            <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50">
                  Venue & Host Stand
                </span>
                <p className="font-bold text-[#2C3333] text-sm">{restaurant.name}</p>
                <p className="text-[#2C3333]/70 text-[11px]">{restaurant.address}</p>
                {restaurant.ownerName && (
                  <p className="text-[#2C3333]/60 text-[11px]">
                    Proprietor / Host: <span className="font-semibold text-[#2C3333]">{restaurant.ownerName}</span>
                  </p>
                )}
              </div>
              {(restaurant.customerCareNumber || restaurant.contactNumber) && (
                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 block">Reservation Care</span>
                  <a
                    href={`tel:${restaurant.customerCareNumber || restaurant.contactNumber}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F6F52] hover:underline mt-0.5"
                    title="Direct Helpline for Reservation Inquiries"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Customer Care: {restaurant.customerCareNumber || restaurant.contactNumber}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Booking Summary Box */}
            <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">Selected Table</span>
                <p className="text-xl font-bold font-serif text-[#4F6F52] mt-0.5">
                  Table {selectedTable.tableNumber}
                </p>
                <p className="text-xs text-[#2C3333]/70">{selectedTable.section}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">Reserved Time Window</span>
                <p className="text-sm font-bold text-[#2C3333] mt-0.5">{date}</p>
                <p className="text-xs font-bold text-[#4F6F52]">{timeIn} → {timeOut} IST</p>
                <p className="text-[11px] text-[#2C3333]/60 font-medium mt-0.5">
                  Expected Duration: {durationResult.durationFormatted}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">Party Size</span>
                <p className="text-sm font-bold text-[#2C3333] mt-0.5">{guests} Guests</p>
                <p className="text-xs text-[#2C3333]/70">Table holds up to {selectedTable.capacity}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">Table Features</span>
                <p className="text-xs font-semibold text-[#2C3333] mt-1">{selectedTable.features.join(', ')}</p>
              </div>
            </div>

            {/* Table Booking Fee Notice Card */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center justify-center shrink-0 text-sm">
                  ₹200
                </div>
                <div>
                  <span className="font-bold text-amber-950 block">Table Booking Deposit Required</span>
                  <p className="text-[11px] text-amber-800">
                    A ₹200 deposit is required to reserve Table {selectedTable.tableNumber}. This deposit is 100% credited against your final restaurant bill.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-white px-3 py-1 rounded-full border border-amber-300 shrink-0 hidden sm:inline-block">
                ₹200 Deposit
              </span>
            </div>

            {/* Customer Contact Details */}
            <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] space-y-4 shadow-sm">
              <h3 className="text-lg font-bold font-serif text-[#2C3333]">
                Diner Contact Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#2C3333] block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#2C3333] block mb-1">
                    Indian Mobile Number * (for WhatsApp Pass & Smart Arrival)
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98450 12260"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#2C3333] block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#2C3333] block mb-1">
                    Special Requests / Dietary Notes
                  </label>
                  <input
                    type="text"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. Birthday, anniversary, Jain food preferences"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#4F6F521A] border border-[#4F6F52]/20 text-xs text-[#4F6F52] flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Smart Arrival will prompt your QR pass automatically as you approach {restaurant.neighborhood}.</span>
              </div>
            </div>

            {/* Solo Diner Safety Check-In Card */}
            <div className={`p-6 rounded-3xl bg-white border transition-all shadow-sm ${
              soloSafetyEnabled ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-[#E8E6E1]'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold font-serif text-[#2C3333]">
                        Solo Diner Safety Check-In
                      </h3>
                      {guests === 1 && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Recommended for Solo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#2C3333]/60 mt-0.5">
                      Notify a trusted contact the moment your table QR code is scanned at host check-in.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={soloSafetyEnabled}
                    onChange={(e) => setSoloSafetyEnabled(e.target.checked)}
                    className="sr-only peer"
                    id="solo-safety-toggle"
                  />
                  <div className="w-11 h-6 bg-[#E8E6E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700"></div>
                </label>
              </div>

              {soloSafetyEnabled && (
                <div className="mt-5 pt-5 border-t border-[#E8E6E1] space-y-4 animate-in fade-in">
                  
                  {/* Privacy-Preserving Notice */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3 text-xs">
                    <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-emerald-950 space-y-0.5">
                      <p className="font-bold">Privacy-conscious: Zero continuous location tracking</p>
                      <p className="text-[11px] text-emerald-800">
                        No background GPS drain or route tracing. An alert is sent <span className="font-semibold">only once</span> when the restaurant host physically scans your table QR check-in pass.
                      </p>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#2C3333] block mb-1">
                        Trusted Contact Full Name *
                      </label>
                      <input
                        type="text"
                        required={soloSafetyEnabled}
                        value={safetyContactName}
                        onChange={(e) => setSafetyContactName(e.target.value)}
                        placeholder="e.g. Mom, Rahul Verma, Priya"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-emerald-600 text-[#2C3333]"
                        id="safety-contact-name-input"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#2C3333] block mb-1">
                        Contact Mobile Number (+91) *
                      </label>
                      <input
                        type="tel"
                        required={soloSafetyEnabled}
                        value={safetyContactPhone}
                        onChange={(e) => setSafetyContactPhone(e.target.value)}
                        placeholder="+91 98450 12260"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-emerald-600 text-[#2C3333]"
                        id="safety-contact-phone-input"
                      />
                    </div>
                  </div>

                  {/* Relationship selector */}
                  <div>
                    <label className="text-xs font-bold text-[#2C3333] block mb-1.5">
                      Relationship to You
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Parent / Family', 'Partner', 'Friend', 'Sibling', 'Colleague', 'Roommate'].map((rel) => (
                        <button
                          key={rel}
                          type="button"
                          onClick={() => setSafetyRelationship(rel)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            safetyRelationship === rel
                              ? 'bg-emerald-700 text-white shadow-2xs font-semibold'
                              : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1] border border-[#E8E6E1]'
                          }`}
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dispatch Channel Selector */}
                  <div>
                    <label className="text-xs font-bold text-[#2C3333] block mb-1.5">
                      Notification Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Both', 'WhatsApp', 'SMS'] as SoloSafetyNotifyMethod[]).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSafetyNotifyMethod(method)}
                          className={`py-2 px-3 rounded-2xl text-xs font-medium border text-center transition-colors cursor-pointer ${
                            safetyNotifyMethod === method
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                              : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2C3333]/70 hover:bg-[#E8E6E1]'
                          }`}
                        >
                          {method === 'Both' ? 'WhatsApp & SMS' : method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Note */}
                  <div>
                    <label className="text-xs font-bold text-[#2C3333] block mb-1">
                      Custom Note to Contact (Optional)
                    </label>
                    <input
                      type="text"
                      value={safetyCustomNote}
                      onChange={(e) => setSafetyCustomNote(e.target.value)}
                      placeholder="e.g. Grabbing dinner here, will text once on the way back home around 10 PM"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-emerald-600 text-[#2C3333]"
                    />
                  </div>

                  {/* Live Simulated Alert Preview */}
                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#2C3333]">
                      <span className="font-bold flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        Live Notification Preview for {safetyContactName || 'Trusted Contact'}
                      </span>
                      <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/60 px-2 py-0.5 rounded-md">
                        Auto Dispatched on QR Scan
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#E8E6E1] font-mono text-[11px] text-[#2C3333] whitespace-pre-line leading-relaxed">
                      {formatSafetyMessage({
                        customerName: customerName || 'Your contact',
                        restaurantName: restaurant.name,
                        tableNumber: selectedTable.tableNumber,
                        neighborhood: restaurant.neighborhood,
                        checkInTime: `${timeSlot} IST`,
                        customNote: safetyCustomNote,
                        notifyMethod: safetyNotifyMethod,
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {backendError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-900">Reservation Failed</p>
                  <p>{backendError}</p>
                </div>
              </div>
            )}

            {/* Proceed to Payment Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setStep('select_table')}
                disabled={isSavingToBackend}
                className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 hover:text-[#2C3333] rounded-full border border-[#E8E6E1] bg-white cursor-pointer transition-colors disabled:opacity-50"
              >
                ← Back to Floor Plan
              </button>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-[#2C3333] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 block">
                    Table Booking Deposit • ₹200
                  </span>
                  <span className="text-[10px] text-[#2C3333]/60">100% credited against your final bill</span>
                </div>

                <button
                  type="submit"
                  disabled={isSavingToBackend}
                  className="px-8 py-3.5 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white font-bold uppercase tracking-widest text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  id="submit-review-to-payment-btn"
                >
                  <span>Proceed to Pay ₹200</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </form>
        )}

        {/* STEP 3: Pay ₹200 Table Booking Deposit */}
        {step === 'payment' && selectedTable && (
          <DepositPaymentStep
            restaurant={restaurant}
            table={selectedTable}
            tableNumber={selectedTable.tableNumber}
            guests={guests}
            date={date}
            timeSlot={timeSlot}
            customerName={customerName}
            customerPhone={customerPhone}
            depositAmount={200}
            isSubmitting={isSavingToBackend}
            errorMessage={backendError}
            onBack={() => setStep('review')}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {/* STEP 4: Booking Confirmed & Digital QR Pass */}
        {step === 'confirmed' && createdReservation && (
          <div className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
            
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold font-serif text-[#2C3333]">
                Table Reserved Successfully
              </h3>
              <p className="text-xs sm:text-sm text-[#2C3333]/60 max-w-md mx-auto">
                Your exact table is locked. Present this digital pass or mention your booking reference at the host stand.
              </p>
            </div>

            {/* Digital Reservation Card & QR Code */}
            <div className="max-w-md mx-auto bg-white rounded-3xl border border-[#E8E6E1] p-7 shadow-sm relative overflow-hidden">
              
              {/* Decorative ticket notch */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#4F6F52]" />

              <div className="flex items-start justify-between pb-4 border-b border-[#E8E6E1]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40">Booking Pass</span>
                  <h4 className="text-xl font-bold font-serif text-[#2C3333]">
                    {createdReservation.restaurantName}
                  </h4>
                  <p className="text-xs text-[#2C3333]/60">{createdReservation.restaurantAddress}</p>
                  {(restaurant.customerCareNumber || restaurant.contactNumber) && (
                    <p className="text-[11px] font-semibold text-[#4F6F52] mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>Customer Care: {restaurant.customerCareNumber || restaurant.contactNumber}</span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#2C3333]/40">Reference</span>
                  <p className="text-xs font-mono font-bold text-[#4F6F52]">{createdReservation.bookingRef}</p>
                </div>
              </div>

              {/* Table & Schedule Details */}
              <div className="py-4 grid grid-cols-2 gap-3 text-xs border-b border-[#E8E6E1]">
                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] text-[#2C3333]/50 block">Your Table</span>
                  <span className="text-base font-bold font-serif text-[#4F6F52]">
                    Table {createdReservation.tableNumber}
                  </span>
                  <span className="text-[10px] text-[#2C3333]/60 block">{createdReservation.section}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] text-[#2C3333]/50 block">Reservation Window</span>
                  <span className="text-sm font-bold text-[#2C3333]">
                    {createdReservation.date}
                  </span>
                  <span className="text-[10px] text-[#4F6F52] font-bold block">
                    {createdReservation.timeIn && createdReservation.timeOut
                      ? `${createdReservation.timeIn} → ${createdReservation.timeOut} IST`
                      : `${createdReservation.timeSlot} IST`}
                  </span>
                  {createdReservation.durationFormatted && (
                    <span className="text-[9px] text-[#2C3333]/60 block font-medium mt-0.5">
                      Expected: {createdReservation.durationFormatted}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] text-[#2C3333]/50 block">Party Size</span>
                  <span className="font-bold text-[#2C3333]">{createdReservation.guests} Guests</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] text-[#2C3333]/50 block">Guest Name</span>
                  <span className="font-bold text-[#2C3333] truncate block">{createdReservation.customerName}</span>
                </div>
              </div>

              {/* ₹200 Table Booking Deposit Confirmation Badge */}
              <div className="my-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950">₹200 Table Booking Deposit Paid</span>
                    <p className="text-[10px] text-emerald-700">
                      Paid via {createdReservation.paymentMethod || 'UPI'} {createdReservation.paymentTransactionId ? `(${createdReservation.paymentTransactionId})` : ''} • 100% credited against your dining bill
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-full border border-emerald-200">
                  ₹200 Settled
                </span>
              </div>

              {/* Solo Diner Safety Status on Pass */}
              {createdReservation.soloDinerSafety?.enabled && (
                <div className="mb-4 p-3.5 rounded-2xl bg-[#4F6F521A] border border-[#4F6F52]/20 flex items-start gap-3 text-xs">
                  <ShieldCheck className="w-5 h-5 text-[#4F6F52] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2C3333]">Solo Diner Safety Armed</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-[#4F6F52] px-2 py-0.5 rounded-full border border-[#4F6F52]/20">
                        Auto QR Alert
                      </span>
                    </div>
                    <p className="text-[11px] text-[#2C3333]/80 mt-0.5 leading-relaxed">
                      Arrival alert will be automatically dispatched to <span className="font-semibold text-[#2C3333]">{createdReservation.soloDinerSafety.contactName}</span> ({createdReservation.soloDinerSafety.contactPhone}) the moment the restaurant host scans this QR pass.
                    </p>
                  </div>
                </div>
              )}

              {/* Standard Black-on-White QR Code Container */}
              <div className="pt-2 text-center flex flex-col items-center">
                <div className="p-4 bg-white border border-[#E8E6E1] rounded-2xl shadow-sm inline-block">
                  {/* High contrast standard black modules on pure white background */}
                  <div className="w-44 h-44 bg-white border border-black/10 rounded-xl flex flex-col items-center justify-center p-3 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                      {/* Outer Background */}
                      <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" />

                      {/* Top-Left Corner Finder Pattern (Standard Black) */}
                      <rect x="5" y="5" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                      <rect x="11" y="11" width="14" height="14" rx="1" fill="#000000" />
                      
                      {/* Top-Right Corner Finder Pattern (Standard Black) */}
                      <rect x="69" y="5" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                      <rect x="75" y="11" width="14" height="14" rx="1" fill="#000000" />
                      
                      {/* Bottom-Left Corner Finder Pattern (Standard Black) */}
                      <rect x="5" y="69" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                      <rect x="11" y="75" width="14" height="14" rx="1" fill="#000000" />

                      {/* Standard Scannable Black Data Modules */}
                      <rect x="38" y="8" width="8" height="8" fill="#000000" />
                      <rect x="52" y="12" width="8" height="8" fill="#000000" />
                      <rect x="42" y="24" width="12" height="6" fill="#000000" />
                      <rect x="8" y="40" width="16" height="8" fill="#000000" />
                      <rect x="36" y="36" width="10" height="10" fill="#000000" />
                      <rect x="56" y="36" width="12" height="6" fill="#000000" />
                      <rect x="76" y="42" width="14" height="8" fill="#000000" />
                      <rect x="40" y="56" width="14" height="10" fill="#000000" />
                      <rect x="64" y="60" width="10" height="14" fill="#000000" />
                      <rect x="80" y="76" width="12" height="12" fill="#000000" />
                      <rect x="40" y="78" width="14" height="8" fill="#000000" />
                      <rect x="58" y="82" width="8" height="8" fill="#000000" />
                      <rect x="24" y="52" width="8" height="8" fill="#000000" />
                      <rect x="48" y="68" width="8" height="6" fill="#000000" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-[#2C3333]/60 mt-2 font-medium">
                  Scan at {createdReservation.restaurantName} podium
                </p>
              </div>

              {/* Optional Food Pre-order Card */}
              <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-900">Pre-Order Food (Optional)</h5>
                      <p className="text-[11px] text-stone-600">Dishes ready fresh at your table upon arrival</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-200/70 text-amber-900 rounded-full">
                    Pay at table
                  </span>
                </div>

                {bookedFoodOrder ? (
                  <div className="p-3 bg-white border border-amber-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-emerald-800">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Food order attached ({bookedFoodOrder.items.length} items)
                      </span>
                      <span>₹{bookedFoodOrder.foodTotal}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-1">
                      {bookedFoodOrder.items.map((i) => `${i.name} (×${i.quantity})`).join(', ')}
                    </p>
                    <button
                      type="button"
                      id="view-food-order-modal-btn"
                      onClick={() => setShowFoodOrderModal(true)}
                      className="w-full py-1 text-center text-xs font-semibold text-amber-800 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200/60"
                    >
                      View / Add More Dishes
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-stone-500">
                      Food is optional. No advance payment needed.
                    </p>
                    <button
                      type="button"
                      id="btn-preorder-food-booking"
                      onClick={() => setShowFoodOrderModal(true)}
                      className="px-3.5 py-1.5 bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold rounded-xl whitespace-nowrap transition-colors shadow-xs"
                    >
                      Pre-Order Food
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Actions */}
            <div className="text-center pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  if (onViewMyReservations) {
                    onViewMyReservations();
                  }
                }}
                className="px-8 py-3.5 rounded-full bg-[#2C3333] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#4F6F52] transition-colors cursor-pointer shadow-sm"
                id="btn-done-view-my-reservations"
              >
                Done • View in My Reservations
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Render FoodOrderModal if open */}
      {showFoodOrderModal && createdReservation && (
        <FoodOrderModal
          isOpen={showFoodOrderModal}
          onClose={() => setShowFoodOrderModal(false)}
          restaurant={restaurant}
          reservationId={createdReservation.id}
          userId={currentUser?.userId || createdReservation.userId}
          tableId={createdReservation.tableId}
          tableNumber={createdReservation.tableNumber}
          date={createdReservation.date}
          time={createdReservation.timeSlot}
          customerName={createdReservation.customerName}
          existingOrder={bookedFoodOrder || createdReservation.foodOrder}
          onOrderSaved={handleFoodOrderSaved}
          isDuringBooking={true}
          onSkip={() => setShowFoodOrderModal(false)}
        />
      )}
      {/* POPUP MESSAGE: Cancel booked table within 3 mins or penalty applies (1st free, 2nd ₹100) */}
      {showCancellationPolicyPopup && createdReservation && (
        <div 
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          id="cancellation-policy-popup-modal"
        >
          <div 
            className="bg-white w-full max-w-md rounded-3xl border-2 border-emerald-300 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <Clock className="w-6 h-6 text-emerald-600 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block">
                    Table Booking Policy
                  </span>
                  <h4 className="text-lg font-bold font-serif text-[#2C3333] mt-0.5">
                    Cancellation Policy Notice
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCancellationPolicyPopup(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Close Notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core User Request Message */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Free 3-Minute Cancellation Window</span>
                </span>
                <span className="font-mono font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                  {Math.floor(cancellationGraceSeconds / 60)}:{String(cancellationGraceSeconds % 60).padStart(2, '0')}
                </span>
              </div>

              <p className="text-xs text-[#2C3333] leading-relaxed font-medium">
                You can <strong className="text-emerald-950 font-bold underline">cancel the booked table within 3 mins</strong> without any charge! If you cancel after that window, penalties apply:
              </p>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">1st Cancellation: Free (₹0 Penalty)</span>
                    <p className="text-[11px] text-[#2C3333]/70">Your first cancellation on FlashTable is completely free of charge.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-rose-200 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-800">From 2nd Cancellation: ₹100 Penalty</span>
                    <p className="text-[11px] text-[#2C3333]/70">A ₹100 penalty fee will be taken for your second and any subsequent table cancellations.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill deduction reminder: ₹200 credited against bill */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-700 flex items-start gap-2.5">
              <Receipt className="w-4 h-4 text-[#4F6F52] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong className="text-[#2C3333]">Bill Deduction Guarantee:</strong> When generating your final bill, <strong className="text-[#4F6F52]">₹200 will be minused from your bill amount</strong> before generating the total payable amount!
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCancellationPolicyPopup(false)}
                className="flex-1 py-3 px-4 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center shadow-sm"
                id="btn-understand-cancellation-policy"
              >
                I Understand • Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
