import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, 
  MapPin, 
  Clock, 
  Users, 
  Armchair, 
  QrCode, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  ChevronDown, 
  Compass, 
  CalendarCheck, 
  ArrowRight, 
  X, 
  Phone, 
  Mail, 
  AlertTriangle,
  Info,
  Check,
  RotateCcw,
  ExternalLink,
  Store,
  LogOut,
  Navigation,
  UtensilsCrossed,
  Receipt,
  Lock,
  AlertCircle,
  Loader2,
  Radio,
  RefreshCw,
  ShieldCheck,
  Bus,
  Package
} from 'lucide-react';
import { Restaurant, Reservation, Table, SmartArrivalState, SmartArrivalDistanceOption, FoodOrder, UserRole, DiningClockSession, CancellationRecord } from '../types';
import { isReservationForCustomer } from '../data/mockData';
import { CancellationPenaltyModal } from './CancellationPenaltyModal';
import { DigitalMenuView } from './DigitalMenuView';
import { MenuQrModal } from './MenuQrModal';
import { DiningBillModal } from './DiningBillModal';
import { FoodOrderModal } from './FoodOrderModal';
import { getCustomerFoodOrdersFromBackend } from '../services/foodService';
import { formatINR, normalizePrice, calculateOrderTotal } from '../utils/priceUtils';
import { ReservationTimerBadge } from './ReservationTimerBadge';
import { DiningTimer } from './DiningTimer';
import { hydrateReservationWithDiningTimer } from '../services/diningTimerService';
import { formatDistanceWithAway, calculateEstimatedEta } from '../utils/smartArrival';
import { cleanDateString, cleanTimeString, formatSyncedTimeIST } from '../utils/dateTime';
import { getStoredSession } from '../services/authService';
import { hydrateReservationWithSoloSafety, dispatchSoloSafetyNotification } from '../services/soloSafetyService';
import { updateReservationTimesOnBackend } from '../services/reservationService';
import { CustomerProfileSettingsModal } from './CustomerProfileSettingsModal';
import { getLanguagePreference } from '../utils/languageUtils';
import { SupportedLanguage } from '../types';

interface MyReservationsViewProps {
  restaurants: Restaurant[];
  reservations: Reservation[];
  userRole?: UserRole;
  currentUser: {
    userId?: string;
    fullName: string;
    email: string;
    phone: string;
  };
  onNavigateHome: () => void;
  onNavigateDiscover: () => void;
  onNavigateSmartMatch: () => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onCancelReservation: (id: string, penaltyRecord?: CancellationRecord) => void;
  onSimulateCheckIn: (id: string) => void;
  onSignOut: () => void;
  onSwitchToPartner: () => void;
  onOpenSmartArrival: (res?: Reservation) => void;
  smartArrivalState: SmartArrivalState;
  onToggleSmartArrival?: (enabled: boolean) => void;
  onSimulateDistance?: (dist: SmartArrivalDistanceOption) => void;
  // Real Customer GPS Props
  isGpsTracking?: boolean;
  customerGpsCoords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  gpsError?: string | null;
  gpsStatus?: 'idle' | 'requesting' | 'active' | 'error' | 'unsupported';
  onStartSmartArrival?: (res: Reservation) => void;
  onStopSmartArrival?: () => void;
  onClearGpsError?: () => void;
  onRefreshReservations?: () => void;
  isLoading?: boolean;
  onUpdateDiningClockSession?: (reservationId: string, session: DiningClockSession | null) => void;
  onUpdateReservationTimes?: (reservationId: string, timeIn: string, timeOut: string) => void;
}

type TabFilter = 'upcoming' | 'past' | 'cancelled';

export const MyReservationsView: React.FC<MyReservationsViewProps> = ({
  restaurants,
  reservations,
  currentUser,
  userRole = 'customer',
  onNavigateHome,
  onNavigateDiscover,
  onNavigateSmartMatch,
  onSelectRestaurant,
  onCancelReservation,
  onSimulateCheckIn,
  onSignOut,
  onSwitchToPartner,
  onOpenSmartArrival,
  smartArrivalState,
  onToggleSmartArrival,
  onSimulateDistance,
  isGpsTracking = false,
  customerGpsCoords = null,
  gpsError = null,
  gpsStatus = 'idle',
  onStartSmartArrival,
  onStopSmartArrival,
  onClearGpsError,
  onRefreshReservations,
  isLoading = false,
  onUpdateDiningClockSession,
  onUpdateReservationTimes,
}) => {
  const [activeFilter, setActiveFilter] = useState<TabFilter>('upcoming');
  const [selectedQrRes, setSelectedQrRes] = useState<Reservation | null>(null);
  const [selectedDetailsRes, setSelectedDetailsRes] = useState<Reservation | null>(null);
  const [cancelModalRes, setCancelModalRes] = useState<Reservation | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [selectedMenuRestaurant, setSelectedMenuRestaurant] = useState<Restaurant | null>(null);
  const [selectedMenuQrRestaurant, setSelectedMenuQrRestaurant] = useState<Restaurant | null>(null);
  const [selectedBillReservation, setSelectedBillReservation] = useState<Reservation | null>(null);
  const [foodOrderRes, setFoodOrderRes] = useState<Reservation | null>(null);
  const [foodOrdersMap, setFoodOrdersMap] = useState<Record<string, FoodOrder>>({});
  const [clockSessionsMap, setClockSessionsMap] = useState<Record<string, DiningClockSession>>({});
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(getLanguagePreference);

  // Manual Time In & Time Out State (Customer Side)
  const [editingTimesResId, setEditingTimesResId] = useState<string | null>(null);
  const [manualTimeIn, setManualTimeIn] = useState<string>('');
  const [manualTimeOut, setManualTimeOut] = useState<string>('');
  const [isSavingTimes, setIsSavingTimes] = useState<boolean>(false);
  const [timesFeedbackMsg, setTimesFeedbackMsg] = useState<{ id: string; msg: string } | null>(null);

  const handleStartEditTimes = (res: Reservation) => {
    setEditingTimesResId(res.id);
    setManualTimeIn(res.timeIn || '07:30 PM');
    setManualTimeOut(res.timeOut || '09:15 PM');
    setTimesFeedbackMsg(null);
  };

  const handleSaveCustomerTimes = async (res: Reservation) => {
    if (!manualTimeIn.trim() || !manualTimeOut.trim()) return;
    setIsSavingTimes(true);
    try {
      await updateReservationTimesOnBackend({
        reservationId: res.id,
        timeIn: manualTimeIn.trim(),
        timeOut: manualTimeOut.trim(),
        updatedBy: currentUser.userId || currentUser.fullName || 'Customer',
        updatedRole: 'customer',
        previousTimeIn: res.timeIn,
        previousTimeOut: res.timeOut,
        restaurantId: res.restaurantId,
        restaurantName: res.restaurantName,
        reason: 'Customer manual dining schedule update',
      });

      if (onUpdateReservationTimes) {
        onUpdateReservationTimes(res.id, manualTimeIn.trim(), manualTimeOut.trim());
      }

      setTimesFeedbackMsg({ id: res.id, msg: 'Time In and Time Out updated successfully!' });
      setTimeout(() => {
        setEditingTimesResId(null);
        setTimesFeedbackMsg(null);
      }, 2000);
    } catch {
      setTimesFeedbackMsg({ id: res.id, msg: 'Failed to save times. Please retry.' });
    } finally {
      setIsSavingTimes(false);
    }
  };

  const session = getStoredSession();
  const effectiveRole = userRole || (currentUser as any)?.role || session?.role || 'customer';
  const isRestaurantOwner = effectiveRole === 'restaurant-owner';

  // Sync food orders from backend for current user
  React.useEffect(() => {
    let isMounted = true;
    async function loadCustomerOrders() {
      if (!currentUser?.userId) return;
      try {
        const res = await getCustomerFoodOrdersFromBackend(currentUser.userId);
        if (isMounted && res.success && res.foodOrders) {
          const map: Record<string, FoodOrder> = {};
          for (const ord of res.foodOrders) {
            if (ord.reservationId) {
              map[ord.reservationId] = ord;
            }
          }
          setFoodOrdersMap((prev) => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.warn('Could not fetch customer food orders:', err);
      }
    }
    loadCustomerOrders();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.userId]);

  // Helper to find restaurant details
  const getRestaurantForReservation = (res: Reservation): Restaurant | undefined => {
    return restaurants.find((r) => r.id === res.restaurantId || r.name.toLowerCase() === res.restaurantName.toLowerCase());
  };

  // Helper to extract seating preferences
  const getSeatingPreferences = (res: Reservation): string => {
    const rest = getRestaurantForReservation(res);
    if (rest) {
      const table = rest.tables.find((t) => t.id === res.tableId || t.tableNumber === res.tableNumber);
      if (table && table.features.length > 0) {
        return table.features.slice(0, 2).join(' • ');
      }
    }
    if (res.section) {
      return `${res.section} • Quiet`;
    }
    return 'Window • Quiet';
  };

  // Helper to extract restaurant Bengaluru neighborhood
  const getRestaurantLocation = (res: Reservation): string => {
    const rest = getRestaurantForReservation(res);
    if (rest && rest.neighborhood) {
      return `${rest.neighborhood}, Bengaluru`;
    }
    if (res.restaurantAddress) {
      const parts = res.restaurantAddress.split(',');
      if (parts.length >= 2) {
        return `${parts[parts.length - 2].trim()}, Bengaluru`;
      }
      return res.restaurantAddress;
    }
    return 'Bengaluru, Karnataka';
  };

  // Filter reservations into Upcoming, Past, and Cancelled
  const { upcomingList, pastList, cancelledList } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const upcoming: Reservation[] = [];
    const past: Reservation[] = [];
    const cancelled: Reservation[] = [];

    // Filter to current user's reservations strictly by authenticated user's unique userId, deduplicating by unique reservation ID
    const seenUserIds = new Set<string>();
    const userReservations = reservations.filter((r) => {
      if (currentUser?.userId && isReservationForCustomer(r, currentUser.userId)) {
        if (!r || !r.id || seenUserIds.has(r.id)) return false;
        seenUserIds.add(r.id);
        return true;
      }
      return false;
    });

    const listToCategorize = userReservations;

    listToCategorize.forEach((r) => {
      if (r.status === 'cancelled') {
        cancelled.push(r);
      } else if (r.status === 'completed') {
        past.push(r);
        // Also keep visible in main active reservations tab so customer immediately sees their completed dining bill
        upcoming.push(r);
      } else if (r.status === 'confirmed' || r.status === 'arrived' || r.status === 'checked-in' || r.status === 'seated') {
        upcoming.push(r);
      } else {
        past.push(r);
      }
    });

    return {
      upcomingList: upcoming,
      pastList: past,
      cancelledList: cancelled,
    };
  }, [reservations, currentUser]);

  // Current display list based on active tab with strict id uniqueness and dining clock hydration
  const displayList = useMemo(() => {
    let list: Reservation[] = [];
    if (activeFilter === 'upcoming') list = upcomingList;
    else if (activeFilter === 'past') list = pastList;
    else list = cancelledList;

    const seen = new Set<string>();
    return list
      .filter((r) => {
        if (!r || !r.id || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .map((r) => {
        const hydrated = hydrateReservationWithDiningTimer(r);
        if (clockSessionsMap[r.id]) {
          hydrated.diningClockSession = clockSessionsMap[r.id];
          hydrated.clockInTime = clockSessionsMap[r.id].clockInDisplayTime;
          hydrated.clockOutTime = clockSessionsMap[r.id].clockOutDisplayTime;
          hydrated.diningDurationFormatted = clockSessionsMap[r.id].durationFormatted;
          hydrated.diningDurationMinutes = clockSessionsMap[r.id].durationMinutes;
        }
        return hydrated;
      });
  }, [activeFilter, upcomingList, pastList, cancelledList, clockSessionsMap]);

  // Handle copy reference
  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2C3333] flex flex-col font-sans" id="my-reservations-view">
      
      {/* 1. Header with exact requested items */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E8E6E1] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-2 cursor-pointer text-left group"
              id="cust-res-header-logo"
            >
              <div className="w-8 h-8 rounded-lg bg-[#4F6F52] flex items-center justify-center text-white font-serif font-bold text-lg shadow-2xs group-hover:scale-105 transition-transform">
                F
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-xl tracking-tight font-bold text-[#2C3333]">FlashTable</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F6F52]"></span>
                </div>
              </div>
            </button>

            {/* Bengaluru Location indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8E6E1] text-[11px] font-semibold text-[#2C3333]/80 shadow-2xs">
              <MapPin className="w-3 h-3 text-[#4F6F52]" />
              <span>Bengaluru, Karnataka</span>
            </div>
          </div>

          {/* Customer Navigation */}
          <nav className="flex items-center gap-2 sm:gap-6">
            {userRole !== 'restaurant-owner' && (
              <button
                onClick={onNavigateDiscover}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#2C3333]/70 hover:text-[#4F6F52] transition-colors flex items-center gap-1.5 cursor-pointer"
                id="cust-nav-discover"
              >
                <Compass className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span>Discover</span>
              </button>
            )}

            <button
              onClick={() => {}}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#4F6F52] bg-[#4F6F521A] rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
              id="cust-nav-reservations"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Reservations</span>
              {upcomingList.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#4F6F52] text-white text-[9px] font-bold flex items-center justify-center">
                  {upcomingList.length}
                </span>
              )}
            </button>

            <button
              onClick={onNavigateSmartMatch}
              className="hidden sm:flex px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#2C3333]/70 hover:text-[#4F6F52] transition-colors items-center gap-1.5 cursor-pointer"
              id="cust-nav-smartmatch"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Smart Match</span>
            </button>
          </nav>

          {/* Profile / Avatar */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-white border border-[#E8E6E1] hover:border-[#4F6F52]/40 transition-all cursor-pointer shadow-2xs group"
              id="cust-res-profile-btn"
              aria-label="User Account Menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#4F6F52] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {currentUser.fullName
                  ? currentUser.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'FT'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold text-[#2C3333] block leading-none truncate max-w-[110px]">
                  {currentUser.fullName || (userRole === 'restaurant-owner' ? 'Restaurant Owner' : 'Guest')}
                </span>
                <span className="text-[10px] text-[#4F6F52] font-medium block mt-0.5">
                  {userRole === 'restaurant-owner' ? 'Restaurant Owner' : 'Diner'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#2C3333]/40 group-hover:text-[#4F6F52] transition-colors" />
            </button>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E8E6E1] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-[#E8E6E1]/60">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-[#2C3333]">
                      {currentUser.fullName || (userRole === 'restaurant-owner' ? 'Restaurant Owner' : 'Guest')}
                    </p>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20">
                      {userRole === 'restaurant-owner' ? 'Owner' : 'Diner'}
                    </span>
                  </div>
                  {currentUser.email && <p className="text-[11px] text-[#2C3333]/60 truncate">{currentUser.email}</p>}
                  {currentUser.phone && <p className="text-[11px] text-[#2C3333]/60">{currentUser.phone}</p>}
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      onNavigateHome();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#2C3333] hover:bg-[#FAF9F6] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Compass className="w-4 h-4 text-[#4F6F52]" />
                    <span>Customer Home</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenSmartArrival();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#2C3333] hover:bg-[#FAF9F6] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-[#4F6F52]" />
                    <span>Smart Arrival Radar</span>
                  </button>

                  {isRestaurantOwner && (
                    <button
                      onClick={() => {
                        onSwitchToPartner();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#2C3333] hover:bg-[#FAF9F6] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Store className="w-4 h-4 text-[#2C3333]/60" />
                      <span>Restaurant Host Console</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsProfileSettingsOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#2C3333] hover:bg-[#FAF9F6] flex items-center gap-2.5 transition-colors cursor-pointer border-t border-[#E8E6E1]/50"
                    id="res-profile-menu-settings"
                  >
                    <Users className="w-4 h-4 text-[#4F6F52]" />
                    <span>Language & Account Settings</span>
                  </button>
                </div>

                <div className="border-t border-[#E8E6E1]/60 pt-1 mt-1">
                  <button
                    onClick={() => {
                      onSignOut();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* 2. Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E8E6E1] pb-6">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#4F6F52]">
              Customer Dining Management
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2C3333] tracking-tight" id="my-reservations-title">
              My Reservations
            </h1>
            <p className="text-xs sm:text-sm text-[#2C3333]/65 max-w-xl">
              View your exact table reservations, digital QR check-in passes, and live dining schedules in Bengaluru.
            </p>
          </div>

          {/* Quick Book New Table CTA & Refresh */}
          <div className="flex items-center gap-2.5">
            {onRefreshReservations && (
              <button
                onClick={onRefreshReservations}
                className="p-2.5 rounded-full bg-white hover:bg-[#FAF9F6] text-[#2C3333] border border-[#E8E6E1] hover:border-[#4F6F52]/50 text-xs transition-all shadow-2xs cursor-pointer flex items-center justify-center group"
                title="Sync latest reservations from Google Sheets"
                id="btn-refresh-reservations"
                aria-label="Refresh Reservations"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#4F6F52] group-hover:rotate-180 transition-transform duration-500" />
              </button>
            )}
            <button
              onClick={onNavigateDiscover}
              className="px-5 py-2.5 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-sm flex items-center gap-2 cursor-pointer"
              id="btn-book-new-table"
            >
              <span>Reserve Another Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Tabs / Filters: Upcoming, Past, Cancelled */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1" id="reservations-tab-filters">
          <button
            onClick={() => setActiveFilter('upcoming')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
              activeFilter === 'upcoming'
                ? 'bg-[#2C3333] text-white shadow-sm'
                : 'bg-white text-[#2C3333]/70 hover:text-[#2C3333] hover:bg-[#FAF9F6] border border-[#E8E6E1]'
            }`}
            id="tab-upcoming"
          >
            <span>Upcoming</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-[#FAF9F6] text-[#2C3333]/70'
            }`}>
              {upcomingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('past')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
              activeFilter === 'past'
                ? 'bg-[#2C3333] text-white shadow-sm'
                : 'bg-white text-[#2C3333]/70 hover:text-[#2C3333] hover:bg-[#FAF9F6] border border-[#E8E6E1]'
            }`}
            id="tab-past"
          >
            <span>Past</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeFilter === 'past' ? 'bg-white/20 text-white' : 'bg-[#FAF9F6] text-[#2C3333]/70'
            }`}>
              {pastList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('cancelled')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
              activeFilter === 'cancelled'
                ? 'bg-[#2C3333] text-white shadow-sm'
                : 'bg-white text-[#2C3333]/70 hover:text-[#2C3333] hover:bg-[#FAF9F6] border border-[#E8E6E1]'
            }`}
            id="tab-cancelled"
          >
            <span>Cancelled</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeFilter === 'cancelled' ? 'bg-white/20 text-white' : 'bg-[#FAF9F6] text-[#2C3333]/70'
            }`}>
              {cancelledList.length}
            </span>
          </button>
        </div>

        {/* 4. Reservations Cards Stack / Empty State */}
        {isLoading && displayList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E8E6E1] p-10 sm:p-16 text-center shadow-xs flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto my-6" id="reservations-loading-state">
            <div className="w-16 h-16 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                Loading your reservations...
              </h3>
              <p className="text-xs sm:text-sm text-[#2C3333]/60 max-w-sm mx-auto">
                Retrieving your bookings from the Google Sheets backend.
              </p>
            </div>
          </div>
        ) : displayList.length === 0 ? (
          /* Polished Empty State requested by user */
          <div className="bg-white rounded-3xl border border-[#E8E6E1] p-10 sm:p-16 text-center shadow-xs flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto my-6" id="reservations-empty-state">
            <div className="w-16 h-16 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center shadow-xs">
              <CalendarDays className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-2xl font-bold font-serif text-[#2C3333]">
                {activeFilter === 'upcoming' 
                  ? 'No reservations yet'
                  : activeFilter === 'past' 
                  ? 'No past reservations'
                  : 'No cancelled reservations'}
              </h3>
              <p className="text-xs sm:text-sm text-[#2C3333]/60 max-w-sm mx-auto">
                {activeFilter === 'upcoming'
                  ? 'Find a restaurant and reserve your perfect table.'
                  : activeFilter === 'past'
                  ? 'Your completed dining experiences in Bengaluru will appear here.'
                  : 'You have no cancelled table bookings.'}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onNavigateDiscover}
                className="px-6 py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-sm flex items-center gap-2 cursor-pointer"
                id="empty-state-discover-btn"
              >
                <span>Find tables in Bengaluru</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {onRefreshReservations && (
                <button
                  onClick={onRefreshReservations}
                  disabled={isLoading}
                  className="px-5 py-3 rounded-full bg-white hover:bg-[#FAF9F6] text-[#2C3333] border border-[#E8E6E1] text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  id="empty-state-refresh-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="reservations-grid">
            {displayList.map((res) => {
              const rest = getRestaurantForReservation(res);
              const locationStr = getRestaurantLocation(res);
              const seatingPref = getSeatingPreferences(res);
              const isUpcoming = activeFilter === 'upcoming';
              const isCancelled = res.status === 'cancelled';
              const attachedFoodOrder = foodOrdersMap[res.id] || res.foodOrder;

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5 relative overflow-hidden"
                  id={`res-card-${res.id}`}
                >
                  {/* Decorative status top border */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isCancelled 
                      ? 'bg-rose-400' 
                      : res.status === 'seated'
                      ? 'bg-emerald-600'
                      : 'bg-[#4F6F52]'
                  }`} />

                  {/* Top section: Restaurant Name, Location, Status */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-serif font-bold text-[#2C3333]">
                            {res.restaurantName}
                          </h3>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                            res.status === 'confirmed'
                              ? 'bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20'
                              : res.status === 'arrived'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : res.status === 'seated'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : res.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : res.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-[#FAF9F6] text-[#2C3333]/60 border border-[#E8E6E1]'
                          }`}>
                            {res.status === 'confirmed' ? 'Confirmed' : res.status === 'completed' ? 'Completed' : res.status.toUpperCase()}
                          </span>
                          {res.billSent && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Digital bill sent</span>
                            </span>
                          )}
                          {/* Live Reservation Timer */}
                          {res.status !== 'cancelled' && (
                            <ReservationTimerBadge reservation={res} />
                          )}
                        </div>

                        {/* Address & Location in Bengaluru */}
                        <div className="flex items-start gap-1.5 text-xs text-[#2C3333]/70 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-[#4F6F52] shrink-0 mt-0.5" />
                          <span>{rest?.address || res.restaurantAddress || locationStr}</span>
                        </div>

                        {/* Customer Care Helpline */}
                        {(rest?.customerCareNumber || rest?.contactNumber || res.restaurantCustomerCareNumber) && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4F6F52] mt-1">
                            <Phone className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
                            <a
                              href={`tel:${rest?.customerCareNumber || rest?.contactNumber || res.restaurantCustomerCareNumber}`}
                              className="hover:underline flex items-center gap-1"
                              title="Direct Customer Care Helpline"
                            >
                              <span>Customer Care:</span>
                              <span className="font-mono">{rest?.customerCareNumber || rest?.contactNumber || res.restaurantCustomerCareNumber}</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Booking Reference */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40 block">Booking Ref</span>
                        <span className="text-xs font-mono font-bold text-[#4F6F52]">{res.bookingRef}</span>
                      </div>
                    </div>

                    {/* Travel Dining Transit Details Card */}
                    {res.travelDetails && (
                      <div className="p-3.5 rounded-2xl bg-linear-to-r from-amber-500/10 via-amber-500/5 to-orange-500/5 border border-amber-300/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                              <Bus className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-bold text-amber-950 uppercase tracking-wide text-[11px]">
                              {res.travelDetails.fulfillmentType === 'parcel' ? '🥡 Travel Food Parcel / Takeaway' : '🍽️ Bus Travel Dine-In'}
                            </span>
                            {res.travelDetails.isGroupBooking && (
                              <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                                Group ({res.travelDetails.passengerCount} Passengers)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-amber-900">Kitchen Prep:</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              res.travelDetails.prepStatus === 'Ready'
                                ? 'bg-emerald-600 text-white'
                                : res.travelDetails.prepStatus === 'Preparing'
                                ? 'bg-amber-600 text-white animate-pulse'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              {res.travelDetails.prepStatus || 'Prepare Soon'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5 border-t border-amber-200/60 text-stone-700">
                          <div>
                            <span className="text-[10px] text-stone-500 block">Expected Arrival:</span>
                            <span className="font-bold text-stone-900 font-mono">
                              {res.travelDetails.expectedArrivalTime || res.timeIn}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500 block">Bus / Operator:</span>
                            <span className="font-medium text-stone-900 truncate block">
                              {res.travelDetails.busOperator || 'Express Bus'} {res.travelDetails.busNumberOrPnr ? `(${res.travelDetails.busNumberOrPnr})` : ''}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-stone-500 block">En-Route Bus Stop:</span>
                            <span className="font-medium text-stone-900 truncate block">
                              {res.travelDetails.busStopName || 'Transit Route Stop'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reservation Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                      {/* Date & Time */}
                      <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]/80 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-[#4F6F52]" />
                            Date & Time Range
                          </span>
                          <p className="text-xs font-bold text-[#2C3333] mt-1 truncate">{cleanDateString(res.date)}</p>
                          <p className="text-[11px] font-semibold text-[#4F6F52]">
                            {res.timeIn && res.timeOut ? `${res.timeIn} → ${res.timeOut}` : cleanTimeString(res.timeSlot)} IST
                          </p>
                          {res.durationFormatted && (
                            <p className="text-[10px] text-[#2C3333]/60 font-medium mt-0.5">
                              Duration: {res.durationFormatted}
                            </p>
                          )}
                        </div>
                        {res.status !== 'cancelled' && (
                          <div className="mt-2 pt-1.5 border-t border-[#E8E6E1]/70">
                            <ReservationTimerBadge reservation={res} variant="inline" />
                          </div>
                        )}
                      </div>

                      {/* Guests & Exact Table Number */}
                      <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 flex items-center gap-1">
                          <Armchair className="w-3 h-3 text-[#4F6F52]" />
                          Exact Table
                        </span>
                        <p className="text-xs font-bold text-[#2C3333] mt-1 truncate">
                          Table {res.tableNumber}
                        </p>
                        <p className="text-[11px] font-semibold text-[#2C3333]/70">
                          {res.guests} Guests
                        </p>
                      </div>

                      {/* Seating Preferences */}
                      <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#4F6F52]" />
                          Seating Vibes
                        </span>
                        <p className="text-xs font-bold text-[#2C3333] mt-1 truncate" title={seatingPref}>
                          {seatingPref}
                        </p>
                        <p className="text-[11px] text-[#2C3333]/60 truncate">
                          {res.section || 'Main Area'}
                        </p>
                      </div>
                    </div>

                    {/* Deposit & Guarantee Info */}
                    <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold text-[#2C3333]">
                            ₹{res.depositAmount || 200} Reservation Deposit Paid
                          </span>
                          <span className="text-[11px] text-[#2C3333]/60 ml-2">
                            • Credited / adjusted against final dining bill
                          </span>
                        </div>
                      </div>
                      {res.status === 'completed' ? (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Adjusted against final dining bill</span>
                        </span>
                      ) : isCancelled ? (
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full self-start sm:self-auto ${
                          res.cancellationCount === 1 || res.penaltyAmount === 0 || (res.cancellationPenalty === 0 && res.cancellationPenalty !== undefined)
                            ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                            : 'text-rose-800 bg-rose-50 border border-rose-200'
                        }`}>
                          {res.cancellationCount === 1 || res.penaltyAmount === 0 || (res.cancellationPenalty === 0 && res.cancellationPenalty !== undefined)
                            ? '1st Cancellation • No Penalty (₹0 Fee)'
                            : `Cancelled • ₹${res.penaltyAmount || res.cancellationPenalty || 100} Penalty Paid`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                          ₹{res.depositAmount || 200} Deposit Adjusted on Bill
                        </span>
                      )}
                    </div>

                    {/* Cancellation & Penalty Tracking Audit Info */}
                    {isCancelled && (() => {
                      const isFirst = res.cancellationCount === 1 || res.penaltyAmount === 0 || (res.cancellationPenalty === 0 && res.cancellationPenalty !== undefined);
                      const penaltyFee = res.penaltyAmount ?? res.cancellationPenalty ?? (isFirst ? 0 : 100);

                      return (
                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 text-xs text-[#2C3333]" id={`cancellation-penalty-info-${res.id}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isFirst
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-100 text-rose-700 border border-rose-200'
                              }`}>
                                {isFirst ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                              </div>
                              <div>
                                <span className="font-bold text-[#2C3333] text-sm block">
                                  {isFirst ? '1st Cancellation (First-Time Grace)' : `Cancellation #${res.cancellationCount || 2}`}
                                </span>
                                <span className="text-[11px] text-[#2C3333]/60">
                                  Released on: {res.cancellationDate || 'Recently cancelled'}
                                </span>
                              </div>
                            </div>

                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              isFirst
                                ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                                : 'text-rose-800 bg-rose-50 border border-rose-200'
                            }`}>
                              {isFirst ? 'Fee Waived: ₹0' : `Penalty: ₹${penaltyFee}`}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/80 text-[11px]">
                            <div>
                              <span className="text-[#2C3333]/60 block text-[10px]">Penalty Applicability:</span>
                              <span className="font-semibold text-[#2C3333]">
                                {isFirst ? 'Waived (First Cancellation Exemption)' : 'Applicable (Standard ₹100 Fee)'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#2C3333]/60 block text-[10px]">Payment Status:</span>
                              <span className="font-semibold text-emerald-800 uppercase text-[10px]">
                                {isFirst ? 'Free / Waived' : `Paid (${res.cancellationPaymentMethod || 'Payment Gateway'})`}
                              </span>
                            </div>
                          </div>

                          {/* Mandatory warning message after 1st cancellation */}
                          {isFirst && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span><strong>Important Notice:</strong> Any future cancellation will have a ₹100 penalty.</span>
                            </div>
                          )}

                          {res.cancellationTransactionId && (
                            <div className="text-[10px] font-mono text-[#2C3333]/60 pt-0.5">
                              Txn Ref: {res.cancellationTransactionId}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 1. Manual Time In and Time Out — Customer Side */}
                    <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] space-y-3" id={`manual-times-card-${res.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#4F6F52]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333]">
                            Dining Schedule (Time In & Time Out)
                          </span>
                        </div>
                        {!isCancelled && res.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (editingTimesResId === res.id) {
                                setEditingTimesResId(null);
                              } else {
                                handleStartEditTimes(res);
                              }
                            }}
                            className="text-xs font-bold text-[#4F6F52] hover:underline flex items-center gap-1 cursor-pointer"
                            id={`edit-dining-times-btn-${res.id}`}
                          >
                            {editingTimesResId === res.id ? 'Close' : 'Edit Time In / Out'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Time In
                          </span>
                          <span className="font-bold text-[#2C3333] text-sm mt-0.5 block font-mono">
                            {res.timeIn || '07:30 PM'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Time Out
                          </span>
                          <span className="font-bold text-[#2C3333] text-sm mt-0.5 block font-mono">
                            {res.timeOut || '09:15 PM'}
                          </span>
                        </div>
                      </div>

                      {/* Manual Time Input & Adjustment Form */}
                      {editingTimesResId === res.id && (
                        <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#4F6F52]/30 space-y-3 animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label htmlFor={`input-timein-${res.id}`} className="block text-[11px] font-bold text-stone-600 mb-1">
                                Time In (Manual Input or Preset):
                              </label>
                              <input
                                id={`input-timein-${res.id}`}
                                type="text"
                                value={manualTimeIn}
                                onChange={(e) => setManualTimeIn(e.target.value)}
                                placeholder="e.g. 07:30 PM"
                                className="w-full px-3 py-1.5 bg-white border border-[#E8E6E1] rounded-lg text-xs font-bold font-mono text-[#2C3333] focus:border-[#4F6F52] outline-none"
                              />
                            </div>
                            <div>
                              <label htmlFor={`input-timeout-${res.id}`} className="block text-[11px] font-bold text-stone-600 mb-1">
                                Time Out (Manual Input or Preset):
                              </label>
                              <input
                                id={`input-timeout-${res.id}`}
                                type="text"
                                value={manualTimeOut}
                                onChange={(e) => setManualTimeOut(e.target.value)}
                                placeholder="e.g. 09:15 PM"
                                className="w-full px-3 py-1.5 bg-white border border-[#E8E6E1] rounded-lg text-xs font-bold font-mono text-[#2C3333] focus:border-[#4F6F52] outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#E8E6E1]/70">
                            <span className="text-[10px] text-stone-500">
                              Times are saved manually without creating an automatic timer.
                            </span>
                            <button
                              type="button"
                              disabled={isSavingTimes || !manualTimeIn.trim() || !manualTimeOut.trim()}
                              onClick={() => handleSaveCustomerTimes(res)}
                              className="px-4 py-1.5 rounded-lg bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs whitespace-nowrap"
                              id={`save-times-btn-${res.id}`}
                            >
                              {isSavingTimes ? 'Saving...' : 'Save Time In & Out'}
                            </button>
                          </div>

                          {timesFeedbackMsg && timesFeedbackMsg.id === res.id && (
                            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                              {timesFeedbackMsg.msg}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Clock In / Clock Out Dining Timer Feature */}
                    {!isCancelled && (
                      <DiningTimer
                        reservation={res}
                        onUpdateSession={(updatedSession) => {
                          if (updatedSession) {
                            setClockSessionsMap((prev) => ({ ...prev, [res.id]: updatedSession }));
                          } else {
                            setClockSessionsMap((prev) => {
                              const next = { ...prev };
                              delete next[res.id];
                              return next;
                            });
                          }
                          if (onUpdateDiningClockSession) {
                            onUpdateDiningClockSession(res.id, updatedSession);
                          }
                        }}
                      />
                    )}

                    {/* Food Pre-Order Card */}
                    {attachedFoodOrder && attachedFoodOrder.items && attachedFoodOrder.items.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                            <UtensilsCrossed className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-950">
                                Pre-Ordered Food: {formatINR(
                                  attachedFoodOrder.foodTotal !== undefined && attachedFoodOrder.foodTotal !== null && !isNaN(Number(attachedFoodOrder.foodTotal)) && Number(attachedFoodOrder.foodTotal) > 0
                                    ? normalizePrice(attachedFoodOrder.foodTotal)
                                    : calculateOrderTotal(attachedFoodOrder.items)
                                )}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                attachedFoodOrder.status === 'Ready' || attachedFoodOrder.status === 'Served'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-200/80 text-amber-900 border border-amber-300'
                              }`}>
                                {attachedFoodOrder.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-900/80 mt-0.5 line-clamp-1">
                              {attachedFoodOrder.items.map((i) => `${i.name} (×${i.quantity})`).join(', ')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFoodOrderRes({ ...res, foodOrder: attachedFoodOrder })}
                          className="px-3 py-1 rounded-full bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-[11px] font-bold transition-colors shrink-0 self-start sm:self-auto cursor-pointer shadow-2xs"
                        >
                          View / Add Items →
                        </button>
                      </div>
                    )}

                    {/* Smart Arrival Status (Clean Hospitality Visual Language with Real Browser Geolocation) */}
                    {isUpcoming && res.status !== 'seated' && (
                      <div className="space-y-2.5">
                        <div className={`p-4 rounded-2xl border transition-all ${
                          isGpsTracking
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                            : 'bg-[#FAF9F6] border-[#E8E6E1]'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                isGpsTracking
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-[#4F6F521A] text-[#4F6F52]'
                              }`}>
                                <Navigation className={`w-4 h-4 ${isGpsTracking ? 'animate-pulse' : ''}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-[#2C3333] text-sm">Smart Arrival</span>
                                  {isGpsTracking ? (
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                                      SMART ARRIVAL ACTIVE
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-600">
                                      Ready to Depart
                                    </span>
                                  )}
                                </div>

                                {isGpsTracking ? (
                                  <div className="mt-1.5 space-y-1">
                                    {customerGpsCoords ? (
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                        <p className="text-[#2C3333] font-medium flex items-center gap-1 font-mono">
                                          <span className="text-emerald-800 font-bold">GPS:</span>
                                          <span>{customerGpsCoords.latitude.toFixed(5)}, {customerGpsCoords.longitude.toFixed(5)}</span>
                                          <span className="text-stone-500 font-sans text-[10px]">(±{Math.round(customerGpsCoords.accuracy)}m)</span>
                                        </p>
                                        {smartArrivalState.distanceMeters !== null && smartArrivalState.distanceMeters !== undefined && (
                                          <div className="flex flex-wrap items-center gap-2 pt-0.5 font-sans">
                                            {/* Current Distance */}
                                            <span className="text-[#2C3333] font-bold">
                                              {formatDistanceWithAway(smartArrivalState.distanceMeters)}
                                            </span>
                                            <span className="text-stone-300">•</span>
                                            {/* Estimated ETA */}
                                            <span 
                                              className="text-[#4F6F52] font-bold flex items-center gap-1"
                                              title="Transparent local estimate based on ~25 km/h urban speed"
                                            >
                                              <Clock className="w-3 h-3 text-emerald-700" />
                                              <span>{smartArrivalState.etaText || calculateEstimatedEta(smartArrivalState.distanceMeters)?.fullEtaText || 'Estimated ETA · calculating...'}</span>
                                            </span>
                                            <span className="text-stone-300">•</span>
                                            {/* Geofence Status */}
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                              smartArrivalState.isInsideGeofence
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                : 'bg-stone-200/80 text-stone-700'
                                            }`}>
                                              {smartArrivalState.isInsideGeofence ? 'Within 500 m' : 'Outside 500 m'}
                                            </span>

                                            {/* Backend Sync Indicator */}
                                            {smartArrivalState.backendSyncStatus === 'syncing' && (
                                              <>
                                                <span className="text-stone-300">•</span>
                                                <span className="text-[10px] text-[#4F6F52] flex items-center gap-1 font-medium">
                                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                  <span>Syncing backend</span>
                                                </span>
                                              </>
                                            )}
                                            {smartArrivalState.backendSyncStatus === 'synced' && (
                                              <>
                                                <span className="text-stone-300">•</span>
                                                <span className="text-[10px] text-emerald-800 flex items-center gap-1 font-medium" title={smartArrivalState.lastSyncedAt ? formatSyncedTimeIST(smartArrivalState.lastSyncedAt) : 'Live connected'}>
                                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                                  <span>Backend synced</span>
                                                </span>
                                              </>
                                            )}
                                            {smartArrivalState.backendSyncStatus === 'error' && (
                                              <>
                                                <span className="text-stone-300">•</span>
                                                <span className="text-[10px] text-amber-800 flex items-center gap-1 font-medium" title={smartArrivalState.backendSyncError || 'Backend update pending'}>
                                                  <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                                  <span>Backend pending (GPS active)</span>
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-[#4F6F52] flex items-center gap-1.5">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Acquiring browser GPS signal...</span>
                                      </p>
                                    )}
                                    <p className="text-[10px] text-stone-500">
                                      Sharing live GPS with {res.restaurantName} for Table {res.tableNumber}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#2C3333]/70 mt-0.5 leading-relaxed">
                                    Share real-time GPS while en route so staff can prepare your table upon arrival.
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Controls */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {isGpsTracking ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onStopSmartArrival?.()}
                                    className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                                    id={`btn-stop-smart-arrival-${res.id}`}
                                  >
                                    <span>STOP SMART ARRIVAL</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenSmartArrival(res)}
                                    className="px-3.5 py-2 rounded-full bg-white hover:bg-stone-50 border border-[#E8E6E1] hover:border-[#4F6F52] text-xs font-semibold text-[#4F6F52] transition-colors cursor-pointer shadow-2xs"
                                    id={`btn-view-live-map-${res.id}`}
                                  >
                                    View Map →
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onStartSmartArrival ? onStartSmartArrival(res) : onOpenSmartArrival(res)}
                                    className="px-4 py-2 rounded-full bg-[#4F6F52] hover:bg-[#3D563F] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1.5 hover:shadow-md"
                                    id={`btn-start-smart-arrival-${res.id}`}
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>START SMART ARRIVAL</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenSmartArrival(res)}
                                    className="px-3 py-2 rounded-full bg-white hover:bg-stone-50 border border-[#E8E6E1] text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    Map
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Geolocation Error Feedback if any */}
                          {gpsError && (
                            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-2.5 text-xs text-amber-900 animate-in fade-in duration-200">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-amber-800 block">Location Access Notice</span>
                                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">{gpsError}</p>
                                </div>
                              </div>
                              {onClearGpsError && (
                                <button
                                  type="button"
                                  onClick={onClearGpsError}
                                  className="text-amber-800/60 hover:text-amber-900 p-1 cursor-pointer"
                                  aria-label="Dismiss error"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* If guest is inside 500m geofence, show immediate check-in notification */}
                        {smartArrivalState.isEnabled && smartArrivalState.isInsideGeofence && (smartArrivalState.reservationId === res.id || !smartArrivalState.reservationId) && (
                          <div className="p-3 rounded-2xl bg-[#4F6F5214] border-2 border-[#4F6F52] flex items-center justify-between gap-3 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin className="w-4 h-4 text-[#4F6F52] shrink-0" />
                              <span className="text-[#2C3333] font-semibold text-[11px]">
                                You're near {res.restaurantName} (within 500m). Your table is ready.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedQrRes(res)}
                              className="px-3 py-1 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <QrCode className="w-3 h-3" />
                              <span>Open QR</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Solo Diner Safety Badge / Details on Card */}
                    {(() => {
                      const hydrated = hydrateReservationWithSoloSafety(res);
                      const safety = hydrated.soloDinerSafety;
                      if (!safety || !safety.enabled) return null;

                      const isDispatched = res.status === 'seated' || res.status === 'checked-in' || res.status === 'completed' || safety.status === 'dispatched';

                      return (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-950">Solo Diner Safety Check-In</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  isDispatched
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-white text-emerald-800 border-emerald-200'
                                }`}>
                                  {isDispatched ? '✓ Alert Sent to Contact' : 'Armed for QR Check-In'}
                                </span>
                              </div>
                              <p className="text-[11px] text-emerald-800 mt-0.5">
                                Trusted Contact: <span className="font-semibold text-emerald-950">{safety.contactName}</span> ({safety.contactPhone}) • {safety.relationship} via {safety.notifyMethod}
                              </p>
                              {safety.customNote && (
                                <p className="text-[10px] text-emerald-700 italic mt-0.5">
                                  "{safety.customNote}"
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] text-emerald-800/80 font-medium sm:text-right shrink-0">
                            <span>Zero GPS Tracking</span>
                            <span className="block text-[9px] text-emerald-700">One-time QR event</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bottom Action Buttons: View QR, View details, Cancel reservation */}
                  <div className="pt-4 border-t border-[#E8E6E1] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View QR action */}
                      {!isCancelled && (
                        <button
                          onClick={() => setSelectedQrRes(res)}
                          className="px-4 py-2 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          id={`btn-view-qr-${res.id}`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View QR</span>
                        </button>
                      )}

                      {/* View Details action */}
                      <button
                        onClick={() => setSelectedDetailsRes(res)}
                        className="px-4 py-2 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E8E6E1] text-[#2C3333] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                        id={`btn-view-details-${res.id}`}
                      >
                        <Info className="w-3.5 h-3.5 text-[#4F6F52]" />
                        <span>View details</span>
                      </button>

                      {/* Dining Bill Action / Locked State */}
                      {(() => {
                        const isCompleted = res.status === 'completed';
                        const isCancelled = res.status === 'cancelled';
                        const isNoShow = res.status === 'no-show';

                        if (isCancelled || isNoShow) {
                          return null;
                        }

                        if (!isCompleted) {
                          // LOCKED / DISABLED for upcoming / seated reservations
                          return (
                            <div className="inline-flex flex-col items-start" title="Available after your dining">
                              <button
                                type="button"
                                disabled
                                className="px-4 py-2 rounded-full bg-stone-100 border border-stone-200 text-stone-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-not-allowed opacity-80"
                                id={`btn-view-bill-${res.id}`}
                              >
                                <Lock className="w-3.5 h-3.5 text-stone-400" />
                                <span>Dining Bill</span>
                              </button>
                              <span className="text-[10px] text-stone-500 font-medium mt-0.5 pl-1">
                                Available after your dining
                              </span>
                            </div>
                          );
                        }

                        // COMPLETED: ACTIVE BUTTON
                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedBillReservation(res)}
                            className="px-4 py-2 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            id={`btn-view-bill-${res.id}`}
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Dining Bill</span>
                          </button>
                        );
                      })()}

                      {/* View Restaurant Menu */}
                      {getRestaurantForReservation(res) && (
                        <button
                          onClick={() => setSelectedMenuRestaurant(getRestaurantForReservation(res)!)}
                          className="px-4 py-2 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E8E6E1] text-[#2C3333] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          id={`btn-view-menu-${res.id}`}
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5 text-[#4F6F52]" />
                          <span>Menu</span>
                        </button>
                      )}

                      {/* Add Food / Pre-order Food Action */}
                      {!isCancelled && res.status !== 'no-show' && (
                        <button
                          type="button"
                          onClick={() => setFoodOrderRes({ ...res, foodOrder: attachedFoodOrder })}
                          className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            attachedFoodOrder && attachedFoodOrder.items?.length
                              ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950 font-bold'
                              : 'bg-white hover:bg-amber-50 border-amber-300 text-amber-900'
                          }`}
                          id={`btn-add-food-${res.id}`}
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5 text-amber-700" />
                          <span>
                            {attachedFoodOrder && attachedFoodOrder.items?.length
                              ? `Food Order (${attachedFoodOrder.items.length})`
                              : 'Add Food'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Cancel reservation action or Rebook */}
                    <div>
                      {isUpcoming && !isCancelled && (
                        <button
                          onClick={() => setCancelModalRes(res)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer py-1.5"
                          id={`btn-cancel-${res.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel reservation</span>
                        </button>
                      )}

                      {isCancelled && rest && (
                        <button
                          onClick={() => onSelectRestaurant(rest)}
                          className="px-4 py-2 rounded-full bg-[#4F6F521A] text-[#4F6F52] hover:bg-[#4F6F52] hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Book Again</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* MODAL 1: QR Check-In Experience */}
      {selectedQrRes && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedQrRes(null)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#FAF9F6] p-5 border-b border-[#E8E6E1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2C3333]">Digital Check-In Pass</h4>
                  <p className="text-[10px] text-[#2C3333]/60">Present at restaurant podium</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQrRes(null)}
                className="p-1.5 rounded-full text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Card Body */}
            <div className="p-6 space-y-6">
              
              {/* Restaurant info & booking ref */}
              <div className="flex items-start justify-between border-b border-[#E8E6E1] pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40">Restaurant</span>
                  <h3 className="text-lg font-bold font-serif text-[#2C3333]">
                    {selectedQrRes.restaurantName}
                  </h3>
                  <p className="text-xs text-[#2C3333]/60">{getRestaurantLocation(selectedQrRes)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40 block">Booking Ref</span>
                  <span className="text-xs font-mono font-bold text-[#4F6F52]">{selectedQrRes.bookingRef}</span>
                </div>
              </div>

              {/* Exact Table details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] text-[#2C3333]/50 block">Locked Table</span>
                  <span className="text-base font-serif font-bold text-[#4F6F52]">
                    Table {selectedQrRes.tableNumber}
                  </span>
                  <span className="text-[10px] text-[#2C3333]/60 block">{selectedQrRes.section}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] text-[#2C3333]/50 block">Date & Time</span>
                  <span className="text-sm font-bold text-[#2C3333]">
                    {cleanDateString(selectedQrRes.date)}
                  </span>
                  <span className="text-[10px] text-[#4F6F52] font-semibold block">{cleanTimeString(selectedQrRes.timeSlot)} IST</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] text-[#2C3333]/50 block">Party Size</span>
                  <span className="font-bold text-[#2C3333]">{selectedQrRes.guests} Guests</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] text-[#2C3333]/50 block">Guest Name</span>
                  <span className="font-bold text-[#2C3333] truncate block">{selectedQrRes.customerName}</span>
                </div>
              </div>

              {/* Crisp SVG QR Code (Standard Black on White) */}
              <div className="text-center flex flex-col items-center">
                <div className="p-4 bg-white border border-[#E8E6E1] rounded-2xl shadow-sm inline-block">
                  <div className="w-48 h-48 bg-white border border-black/10 rounded-xl flex flex-col items-center justify-center p-3 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                      <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" />
                      {/* Corner markers (Standard Black) */}
                      <rect x="5" y="5" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                      <rect x="11" y="11" width="14" height="14" rx="1" fill="#000000" />
                      
                      <rect x="69" y="5" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                      <rect x="75" y="11" width="14" height="14" rx="1" fill="#000000" />
                      
                      <rect x="5" y="69" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                      <rect x="11" y="75" width="14" height="14" rx="1" fill="#000000" />

                      {/* Barcode details (Standard Black) */}
                      <rect x="40" y="10" width="8" height="8" fill="#000000" />
                      <rect x="52" y="14" width="8" height="8" fill="#000000" />
                      <rect x="44" y="24" width="12" height="6" fill="#000000" />
                      <rect x="10" y="42" width="16" height="8" fill="#000000" />
                      <rect x="36" y="38" width="10" height="10" fill="#000000" />
                      <rect x="56" y="38" width="12" height="6" fill="#000000" />
                      <rect x="76" y="44" width="14" height="8" fill="#000000" />
                      <rect x="42" y="58" width="14" height="10" fill="#000000" />
                      <rect x="64" y="62" width="10" height="14" fill="#000000" />
                      <rect x="80" y="76" width="12" height="12" fill="#000000" />
                      <rect x="40" y="78" width="14" height="8" fill="#000000" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-[#2C3333]/60 mt-2.5 font-medium">
                  Scan at {selectedQrRes.restaurantName} host stand
                </p>
              </div>

              {/* Solo Diner Safety Status in Pass Modal */}
              {(() => {
                const hydrated = hydrateReservationWithSoloSafety(selectedQrRes);
                const safety = hydrated.soloDinerSafety;
                if (!safety || !safety.enabled) return null;

                const isDispatched = selectedQrRes.status === 'seated' || selectedQrRes.status === 'checked-in' || selectedQrRes.status === 'completed' || safety.status === 'dispatched';

                return (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5 text-left">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Solo Diner Safety Check-In</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isDispatched 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                            : 'bg-white text-emerald-800 border-emerald-200'
                        }`}>
                          {isDispatched ? 'Alert Sent' : 'Armed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        {isDispatched
                          ? `Arrival alert was successfully dispatched to ${safety.contactName} (${safety.contactPhone}) via ${safety.notifyMethod}.`
                          : `Arrival alert will automatically notify ${safety.contactName} (${safety.contactPhone}) when this QR code is scanned.`}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Actions: Copy Ref & Staff Check-in simulation */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleCopyRef(selectedQrRes.bookingRef)}
                  className="w-full py-2.5 rounded-full border border-[#E8E6E1] hover:bg-[#FAF9F6] text-[#2C3333] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedRef === selectedQrRes.bookingRef ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4F6F52]" />
                      <span>Copied Reference {selectedQrRes.bookingRef}</span>
                    </>
                  ) : (
                    <>
                      <span>Copy Booking Reference</span>
                    </>
                  )}
                </button>

                {/* Host scan simulation button */}
                {selectedQrRes.status !== 'seated' && (
                  <button
                    onClick={() => {
                      const hydrated = hydrateReservationWithSoloSafety(selectedQrRes);
                      if (hydrated.soloDinerSafety?.enabled) {
                        dispatchSoloSafetyNotification(hydrated, 'QR');
                      }
                      onSimulateCheckIn(selectedQrRes.id);
                      setSelectedQrRes({ ...selectedQrRes, status: 'seated' });
                    }}
                    className="w-full py-2.5 rounded-full bg-[#4F6F521A] hover:bg-[#4F6F52] text-[#4F6F52] hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    title="Simulate staff scanning this pass at host podium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simulate Host Check-In & Seating</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reservation Details */}
      {selectedDetailsRes && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDetailsRes(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#FAF9F6] p-5 border-b border-[#E8E6E1] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#2C3333]">Reservation Specifications</h4>
                <p className="text-[10px] text-[#2C3333]/60">Ref: {selectedDetailsRes.bookingRef}</p>
              </div>
              <button
                onClick={() => setSelectedDetailsRes(null)}
                className="p-1.5 rounded-full text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs">
              
              {/* Restaurant summary */}
              {(() => {
                const detailsRest = restaurants.find((r) => r.id === selectedDetailsRes.restaurantId);
                const careNumber = detailsRest?.customerCareNumber || detailsRest?.contactNumber || selectedDetailsRes.restaurantCustomerCareNumber;

                return (
                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52]">Hospitality Venue</span>
                        <h3 className="text-base font-serif font-bold text-[#2C3333]">{selectedDetailsRes.restaurantName}</h3>
                      </div>
                      {detailsRest?.rating && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ★ {detailsRest.rating}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-[#2C3333]/70">
                      <MapPin className="w-3.5 h-3.5 text-[#4F6F52] shrink-0 mt-0.5" />
                      <span>{selectedDetailsRes.restaurantAddress || detailsRest?.address}</span>
                    </div>

                    {careNumber && (
                      <div className="pt-2 border-t border-[#E8E6E1] flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="text-[11px] text-[#2C3333]/60">Have questions about your booking?</span>
                        <a 
                          href={`tel:${careNumber}`}
                          className="inline-flex items-center gap-1 font-bold text-[#4F6F52] bg-[#4F6F5214] px-2.5 py-1 rounded-full border border-[#4F6F52]/30 hover:bg-[#4F6F52] hover:text-white transition-colors"
                          title="Direct Customer Care Helpline"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Customer Care: {careNumber}</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Cancellation Record in Details Modal if Cancelled */}
              {selectedDetailsRes.status === 'cancelled' && (() => {
                const isFirst = selectedDetailsRes.cancellationCount === 1 || selectedDetailsRes.penaltyAmount === 0 || (selectedDetailsRes.cancellationPenalty === 0 && selectedDetailsRes.cancellationPenalty !== undefined);
                const penaltyFee = selectedDetailsRes.penaltyAmount ?? selectedDetailsRes.cancellationPenalty ?? (isFirst ? 0 : 100);

                return (
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Cancellation Audit Details
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-rose-200 text-rose-800">
                        {isFirst ? '1st Cancellation (Free)' : `Cancellation #${selectedDetailsRes.cancellationCount || 2}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#2C3333]/60 block text-[10px]">Cancellation Date:</span>
                        <span className="font-semibold text-[#2C3333]">{selectedDetailsRes.cancellationDate || 'Recorded'}</span>
                      </div>
                      <div>
                        <span className="text-[#2C3333]/60 block text-[10px]">Penalty Amount:</span>
                        <span className="font-bold font-mono text-rose-700">₹{penaltyFee}.00 {isFirst ? '(Waived)' : ''}</span>
                      </div>
                      <div>
                        <span className="text-[#2C3333]/60 block text-[10px]">Penalty Applicability:</span>
                        <span className="font-semibold text-[#2C3333]">{isFirst ? 'Waived (First-Time Grace)' : 'Applicable (₹100)'}</span>
                      </div>
                      <div>
                        <span className="text-[#2C3333]/60 block text-[10px]">Payment Status:</span>
                        <span className="font-semibold text-emerald-800 uppercase text-[10px]">{isFirst ? 'Free / Waived' : `Paid (${selectedDetailsRes.cancellationPaymentMethod || 'Gateway'})`}</span>
                      </div>
                    </div>

                    {isFirst && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Warning: Any future cancellation will have a ₹100 penalty.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Table assignment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl border border-[#E8E6E1]">
                  <span className="text-[10px] uppercase font-bold text-[#2C3333]/50 block">Table Allocation</span>
                  <p className="text-base font-serif font-bold text-[#4F6F52] mt-0.5">Table {selectedDetailsRes.tableNumber}</p>
                  <p className="text-[11px] text-[#2C3333]/60">{selectedDetailsRes.section || 'Main Dining'}</p>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#E8E6E1] flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#2C3333]/50 block">Reservation Date & Slot</span>
                    <p className="text-xs font-bold text-[#2C3333] mt-0.5">{cleanDateString(selectedDetailsRes.date)}</p>
                    <p className="text-[11px] text-[#4F6F52] font-semibold">{cleanTimeString(selectedDetailsRes.timeSlot)} IST • {selectedDetailsRes.guests} Guests</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#E8E6E1]/70">
                    <ReservationTimerBadge reservation={selectedDetailsRes} />
                  </div>
                </div>
              </div>

              {/* Clock In / Clock Out Dining Timer Feature in Details Modal */}
              {selectedDetailsRes.status !== 'cancelled' && (
                <DiningTimer
                  reservation={selectedDetailsRes}
                  onUpdateSession={(updatedSession) => {
                    if (updatedSession) {
                      setClockSessionsMap((prev) => ({ ...prev, [selectedDetailsRes.id]: updatedSession }));
                      setSelectedDetailsRes({
                        ...selectedDetailsRes,
                        diningClockSession: updatedSession,
                        clockInTime: updatedSession.clockInDisplayTime,
                        clockOutTime: updatedSession.clockOutDisplayTime,
                        diningDurationFormatted: updatedSession.durationFormatted,
                        diningDurationMinutes: updatedSession.durationMinutes,
                      });
                    } else {
                      setClockSessionsMap((prev) => {
                        const next = { ...prev };
                        delete next[selectedDetailsRes.id];
                        return next;
                      });
                      setSelectedDetailsRes({
                        ...selectedDetailsRes,
                        diningClockSession: undefined,
                        clockInTime: undefined,
                        clockOutTime: undefined,
                        diningDurationFormatted: undefined,
                        diningDurationMinutes: undefined,
                      });
                    }
                    if (onUpdateDiningClockSession) {
                      onUpdateDiningClockSession(selectedDetailsRes.id, updatedSession);
                    }
                  }}
                />
              )}

              {/* Guest Contact Details */}
              <div className="p-4 rounded-2xl border border-[#E8E6E1] space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50 block">Guest Contact Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-[#2C3333]/50 block">Full Name</span>
                    <span className="font-semibold text-[#2C3333]">{selectedDetailsRes.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#2C3333]/50 block">Indian Phone</span>
                    <span className="font-semibold text-[#2C3333]">{selectedDetailsRes.customerPhone}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-[10px] text-[#2C3333]/50 block">Email Address</span>
                    <span className="font-semibold text-[#2C3333]">{selectedDetailsRes.customerEmail}</span>
                  </div>
                </div>
              </div>

              {/* Solo Diner Safety Check-In Details */}
              {(() => {
                const hydrated = hydrateReservationWithSoloSafety(selectedDetailsRes);
                const safety = hydrated.soloDinerSafety;
                if (!safety || !safety.enabled) return null;

                const isDispatched = selectedDetailsRes.status === 'seated' || selectedDetailsRes.status === 'checked-in' || selectedDetailsRes.status === 'completed' || safety.status === 'dispatched';

                return (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        Solo Diner Safety Check-In
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isDispatched ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-white text-emerald-800 border-emerald-200'
                      }`}>
                        {isDispatched ? '✓ Alert Sent' : 'Armed for QR Check-In'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-emerald-800/70 block">Trusted Contact</span>
                        <span className="font-semibold text-emerald-950">{safety.contactName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-800/70 block">Contact Phone</span>
                        <span className="font-semibold text-emerald-950">{safety.contactPhone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-800/70 block">Relationship</span>
                        <span className="font-semibold text-emerald-950">{safety.relationship}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-800/70 block">Alert Channel</span>
                        <span className="font-semibold text-emerald-950">{safety.notifyMethod}</span>
                      </div>
                    </div>

                    {safety.customNote && (
                      <p className="text-[11px] text-emerald-800 italic bg-white/60 p-2 rounded-xl border border-emerald-200/60">
                        "{safety.customNote}"
                      </p>
                    )}

                    <div className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-200/60">
                      Privacy guarantee: No background GPS sharing. Single alert sent on host QR verification.
                    </div>
                  </div>
                );
              })()}

              {/* Special Requests */}
              {selectedDetailsRes.specialRequests && (
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  <span className="text-[10px] uppercase font-bold text-[#2C3333]/50 block">Guest Notes / Requests</span>
                  <p className="text-xs text-[#2C3333]/80 mt-1 italic">"{selectedDetailsRes.specialRequests}"</p>
                </div>
              )}

              {/* Close button */}
              <div className="pt-2">
                <button
                  onClick={() => setSelectedDetailsRes(null)}
                  className="w-full py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Cancellation & ₹100 Penalty Payment Modal */}
      {cancelModalRes && (
        <CancellationPenaltyModal
          reservation={cancelModalRes}
          onClose={() => setCancelModalRes(null)}
          onConfirmCancellation={(penaltyRecord) => {
            onCancelReservation(cancelModalRes.id, penaltyRecord);
            setCancelModalRes(null);
          }}
          customerCareNumber={
            restaurants.find((r) => r.id === cancelModalRes.restaurantId)?.customerCareNumber ||
            restaurants.find((r) => r.id === cancelModalRes.restaurantId)?.contactNumber ||
            cancelModalRes.restaurantCustomerCareNumber
          }
          userId={currentUser?.userId}
          allReservations={reservations}
        />
      )}

      {/* Digital Menu Modal */}
      {selectedMenuRestaurant && (
        <DigitalMenuView
          restaurant={selectedMenuRestaurant}
          onClose={() => setSelectedMenuRestaurant(null)}
        />
      )}

      {/* Menu QR Modal */}
      {selectedMenuQrRestaurant && (
        <MenuQrModal
          restaurant={selectedMenuQrRestaurant}
          onClose={() => setSelectedMenuQrRestaurant(null)}
          onViewFullMenu={(rest) => {
            setSelectedMenuQrRestaurant(null);
            setSelectedMenuRestaurant(rest);
          }}
        />
      )}

      {/* Dining Bill & Deposit Credit Modal */}
      {selectedBillReservation && (
        <DiningBillModal
          reservation={reservations.find((r) => r.id === selectedBillReservation.id) || selectedBillReservation}
          isStaffView={false}
          onClose={() => setSelectedBillReservation(null)}
        />
      )}

      {/* Food Pre-Order Modal */}
      {foodOrderRes && (
        <FoodOrderModal
          isOpen={Boolean(foodOrderRes)}
          onClose={() => setFoodOrderRes(null)}
          restaurant={getRestaurantForReservation(foodOrderRes) || {
            id: foodOrderRes.restaurantId,
            name: foodOrderRes.restaurantName,
            cuisine: 'Fine Dining',
            rating: 4.8,
            reviewCount: 150,
            priceRange: '₹₹₹',
            neighborhood: 'Bengaluru',
            address: foodOrderRes.restaurantAddress,
            features: ['Valet Parking'],
            images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'],
            tables: [],
            openingHours: {
              monday: '12:00 PM - 11:30 PM',
              tuesday: '12:00 PM - 11:30 PM',
              wednesday: '12:00 PM - 11:30 PM',
              thursday: '12:00 PM - 11:30 PM',
              friday: '12:00 PM - 11:30 PM',
              saturday: '12:00 PM - 11:30 PM',
              sunday: '12:00 PM - 11:30 PM',
            },
          }}
          reservationId={foodOrderRes.id}
          userId={currentUser.userId || foodOrderRes.userId}
          tableId={foodOrderRes.tableId}
          tableNumber={foodOrderRes.tableNumber}
          date={foodOrderRes.date}
          time={foodOrderRes.timeSlot}
          customerName={foodOrderRes.customerName}
          existingOrder={foodOrdersMap[foodOrderRes.id] || foodOrderRes.foodOrder}
          onOrderSaved={(savedOrder) => {
            setFoodOrdersMap((prev) => ({
              ...prev,
              [foodOrderRes.id]: savedOrder,
              [savedOrder.reservationId]: savedOrder,
            }));
            foodOrderRes.foodOrder = savedOrder;
          }}
        />
      )}

      {/* Customer Profile & Preferences Modal (Language Selection & Account Deletion) */}
      {isProfileSettingsOpen && (
        <CustomerProfileSettingsModal
          currentUser={currentUser}
          currentLanguage={currentLanguage}
          onLanguageChange={(newLang) => {
            setCurrentLanguage(newLang);
          }}
          reservations={reservations}
          onClose={() => setIsProfileSettingsOpen(false)}
          onSignOut={onSignOut}
          onAccountDeleted={() => {
            setIsProfileSettingsOpen(false);
            onSignOut();
          }}
        />
      )}

    </div>
  );
};
