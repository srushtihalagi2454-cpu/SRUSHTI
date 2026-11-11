import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Search,
  ChevronRight,
  Star,
  Sparkles,
  SlidersHorizontal,
  X,
  Check,
  Compass,
  CalendarCheck,
  User,
  LogOut,
  Store,
  Navigation,
  ArrowRight,
  Armchair,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  ChevronDown,
  UtensilsCrossed,
  QrCode,
  Phone,
  AlertCircle,
  Bus,
} from 'lucide-react';
import { Restaurant, Reservation, Table, UserRole } from '../types';
import { TIME_SLOTS } from '../data/mockData';
import { DigitalMenuView } from './DigitalMenuView';
import { MenuQrModal } from './MenuQrModal';
import { getFormattedOperatingHours } from '../utils/operatingHours';
import { ReservationTimerBadge } from './ReservationTimerBadge';
import { DiningTimerCard } from './DiningTimerCard';
import { CustomerProfileSettingsModal } from './CustomerProfileSettingsModal';
import { getStoredSession } from '../services/authService';
import { calculateReservationDuration } from '../utils/timeRangeUtils';
import { getLanguagePreference, t } from '../utils/languageUtils';
import { SupportedLanguage } from '../types';

interface CustomerHomePageProps {
  restaurants: Restaurant[];
  reservations: Reservation[];
  onSelectRestaurant: (restaurant: Restaurant, bookingParams?: { date?: string; timeIn?: string; timeOut?: string; guests?: number }) => void;
  onOpenReservations: () => void;
  onOpenSmartArrival: (res?: Reservation) => void;
  onSignOut: () => void;
  onSwitchToPartner: () => void;
  onViewReservationDetail?: (reservation: Reservation) => void;
  userRole?: UserRole;
  isOwnerPreview?: boolean;
  currentUser?: {
    userId?: string;
    fullName: string;
    email: string;
    phone: string;
  };
  initialTimeIn?: string;
  initialTimeOut?: string;
  initialDate?: string;
  onUpdateBookingTimes?: (timeIn: string, timeOut: string) => void;
  onNavigateTravelDining?: () => void;
  onBookForTravel?: (restaurant: Restaurant) => void;
  onOpenAdminSetup?: () => void;
  onNavigateCompanyAdmin?: () => void;
}

const CATEGORIES = [
  'All',
  'North Indian',
  'South Indian',
  'Chinese',
  'Italian',
];

const BENGALURU_NEIGHBORHOODS = [
  'Indiranagar',
  'Yelahanka New Town',
  'Soladevanahalli',
];

export const CustomerHomePage: React.FC<CustomerHomePageProps> = ({
  restaurants,
  reservations,
  onSelectRestaurant,
  onOpenReservations,
  onOpenSmartArrival,
  onSignOut,
  onSwitchToPartner,
  onViewReservationDetail,
  userRole = 'customer',
  isOwnerPreview = false,
  currentUser = {
    fullName: '',
    email: '',
    phone: '',
  },
  initialTimeIn = '7:30 PM',
  initialTimeOut = '9:15 PM',
  initialDate,
  onUpdateBookingTimes,
  onNavigateTravelDining,
  onBookForTravel,
  onOpenAdminSetup,
  onNavigateCompanyAdmin,
}) => {
  // State for default OTP dispatched notification
  const [defaultOtpDispatchedNotice, setDefaultOtpDispatchedNotice] = useState<boolean>(false);

  // Search state
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('All Bengaluru');
  const [selectedDate, setSelectedDate] = useState<string>(() => initialDate || new Date().toISOString().split('T')[0]);
  const [selectedTimeIn, setSelectedTimeIn] = useState<string>(() => initialTimeIn || '7:30 PM');
  const [selectedTimeOut, setSelectedTimeOut] = useState<string>(() => initialTimeOut || '9:15 PM');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Time Range duration and validation
  const timeRangeDuration = useMemo(() => {
    return calculateReservationDuration(selectedTimeIn, selectedTimeOut);
  }, [selectedTimeIn, selectedTimeOut]);

  const handleTimeInChange = (newIn: string) => {
    setSelectedTimeIn(newIn);
    if (onUpdateBookingTimes) onUpdateBookingTimes(newIn, selectedTimeOut);
  };

  const handleTimeOutChange = (newOut: string) => {
    setSelectedTimeOut(newOut);
    if (onUpdateBookingTimes) onUpdateBookingTimes(selectedTimeIn, newOut);
  };
  
  // Nearby active neighborhood tab
  const [nearbyNeighborhood, setNearbyNeighborhood] = useState<string>('Indiranagar');

  // Location selector dropdown / modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(getLanguagePreference);
  const [selectedMenuRestaurant, setSelectedMenuRestaurant] = useState<Restaurant | null>(null);
  const [selectedMenuQrRestaurant, setSelectedMenuQrRestaurant] = useState<Restaurant | null>(null);

  // Authenticated user session and role validation
  const session = getStoredSession();
  const effectiveRole = (currentUser as any)?.role || userRole || session?.role || 'customer';
  const isRestaurantOwner = effectiveRole === 'restaurant-owner';

  // Smart Match state
  const [isSmartMatchOpen, setIsSmartMatchOpen] = useState<boolean>(false);
  const [smartPartySize, setSmartPartySize] = useState<number>(2);
  const [smartVibe, setSmartVibe] = useState<'quiet' | 'garden' | 'central' | 'rooftop'>('quiet');
  const [smartArea, setSmartArea] = useState<string>('All Bengaluru');
  const [smartDate, setSmartDate] = useState<string>('Today');
  const [smartTime, setSmartTime] = useState<string>('7:30 PM');
  const [smartMatchCalculated, setSmartMatchCalculated] = useState<boolean>(false);
  const [smartMatchResults, setSmartMatchResults] = useState<Array<{
    restaurant: Restaurant;
    table: Table;
    matchScore: number;
    reason: string;
  }>>([]);

  // Preserve body scroll restoration when Smart Match modal opens/closes
  useEffect(() => {
    if (isSmartMatchOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsSmartMatchOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow || '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isSmartMatchOpen]);

  // Filtered upcoming reservation for the user
  const activeReservation = useMemo(() => {
    return reservations.find((r) => r.status === 'confirmed' || r.status === 'arrived') || null;
  }, [reservations]);

  // Filter recommended restaurants based on Category and Search Query
  const recommendedRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const matchesCategory =
          r.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          r.cuisines.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()));
        if (!matchesCategory) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesNeighborhood = r.neighborhood.toLowerCase().includes(q);
        const matchesCuisine = r.cuisines.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesNeighborhood && !matchesCuisine) return false;
      }

      // Location filter (if not "All Bengaluru")
      if (selectedNeighborhood !== 'All Bengaluru') {
        if (!r.neighborhood.toLowerCase().includes(selectedNeighborhood.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [restaurants, selectedCategory, searchQuery, selectedNeighborhood]);

  // Nearby restaurants for the selected neighborhood
  const nearbyRestaurants = useMemo(() => {
    const list = restaurants.filter(
      (r) => r.neighborhood.toLowerCase() === nearbyNeighborhood.toLowerCase()
    );
    return list.length > 0 ? list : restaurants.slice(0, 3);
  }, [restaurants, nearbyNeighborhood]);

  // Handler for Smart Match calculation
  const handleRunSmartMatch = () => {
    // Find candidate restaurants in the selected area
    const pool = smartArea === 'All Bengaluru'
      ? restaurants
      : restaurants.filter((r) => 
          r.neighborhood.toLowerCase().includes(smartArea.toLowerCase()) ||
          smartArea.toLowerCase().includes(r.neighborhood.toLowerCase())
        );
    
    const candidateRestaurants = pool.length > 0 ? pool : restaurants;

    // For EACH candidate restaurant, find the best matching table and reason
    const results = candidateRestaurants.map((targetRest) => {
      const table = targetRest.tables.find((t) => {
        if (t.capacity < smartPartySize) return false;
        if (smartVibe === 'quiet' && (t.section === 'Private Alcove' || t.features.includes('Quiet'))) return true;
        if (smartVibe === 'garden' && (t.section === 'Courtyard Terrace' || t.features.includes('Garden View'))) return true;
        if (smartVibe === 'central' && t.section === 'Main Dining') return true;
        if (smartVibe === 'rooftop' && (t.features.includes('Breeze') || t.features.includes('Outdoor Canopy'))) return true;
        return true;
      }) || targetRest.tables.find(t => t.capacity >= smartPartySize) || targetRest.tables[0];

      let matchScore = 95;
      let reason = '';
      if (smartVibe === 'quiet') {
        const isIdeal = table.section === 'Private Alcove' || table.features.includes('Quiet');
        reason = `Acoustic buffer in ${table.section} with private sightlines, ideal for intimate conversation.`;
        matchScore = isIdeal ? 98 : 91;
      } else if (smartVibe === 'garden') {
        const isIdeal = table.section === 'Courtyard Terrace' || table.features.includes('Garden View');
        reason = `Fresh courtyard breeze and lush botanical perimeter view in ${table.section}.`;
        matchScore = isIdeal ? 97 : 90;
      } else if (smartVibe === 'central') {
        const isIdeal = table.section === 'Main Dining';
        reason = `Prime vantage point overlooking the central dining room in ${table.section}.`;
        matchScore = isIdeal ? 96 : 89;
      } else {
        const isIdeal = table.features.includes('Breeze') || table.features.includes('Outdoor Canopy');
        reason = `Elevated breezy position with optimal table-to-table spacing in ${table.section}.`;
        matchScore = isIdeal ? 97 : 92;
      }

      return {
        restaurant: targetRest,
        table,
        matchScore,
        reason,
      };
    });

    // Sort by match score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    setSmartMatchResults(results);
    setSmartMatchCalculated(true);
  };

  // Handler for selecting a filtered restaurant
  const handleSelectSmartMatchRestaurant = (restaurant: Restaurant) => {
    setIsSmartMatchOpen(false);
    onSelectRestaurant(restaurant);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2C3333] flex flex-col font-sans" id="customer-home-page">
      {/* 1. Logged-in Customer Header */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E8E6E1] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Location Pill */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 rounded-lg bg-[#4F6F52] flex items-center justify-center text-white font-serif font-bold text-lg shadow-2xs">
                F
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-xl tracking-tight font-bold text-[#2C3333]">FlashTable</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F6F52]"></span>
                </div>
              </div>
            </div>

            {/* Location Selector Pill: "Bengaluru, Karnataka" */}
            <div className="relative">
              <button
                onClick={() => setIsLocationModalOpen(!isLocationModalOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8E6E1] text-[#2C3333] hover:border-[#4F6F52]/50 hover:bg-[#FAF9F6] transition-all text-xs font-medium cursor-pointer shadow-2xs group"
                id="location-selector-btn"
                title="Change dining location"
              >
                <MapPin className="w-3.5 h-3.5 text-[#4F6F52] group-hover:scale-110 transition-transform" />
                <span className="font-semibold">{selectedNeighborhood === 'All Bengaluru' ? 'Bengaluru, Karnataka' : `${selectedNeighborhood}, BLR`}</span>
                <ChevronDown className="w-3 h-3 text-[#2C3333]/50" />
              </button>

              {/* Quick Location Dropdown */}
              {isLocationModalOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E8E6E1] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-[#E8E6E1]/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/60">Select Area</span>
                    <span className="text-[10px] text-[#4F6F52] font-semibold">Bengaluru Metro</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedNeighborhood('All Bengaluru');
                      setIsLocationModalOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#FAF9F6] transition-colors ${
                      selectedNeighborhood === 'All Bengaluru' ? 'font-bold text-[#4F6F52] bg-[#4F6F52]/5' : 'text-[#2C3333]'
                    }`}
                  >
                    <span>All Bengaluru, Karnataka</span>
                    {selectedNeighborhood === 'All Bengaluru' && <Check className="w-3.5 h-3.5 text-[#4F6F52]" />}
                  </button>
                  {BENGALURU_NEIGHBORHOODS.map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setSelectedNeighborhood(n);
                        setIsLocationModalOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#FAF9F6] transition-colors ${
                        selectedNeighborhood === n ? 'font-bold text-[#4F6F52] bg-[#4F6F52]/5' : 'text-[#2C3333]'
                      }`}
                    >
                      <span>{n}</span>
                      {selectedNeighborhood === n && <Check className="w-3.5 h-3.5 text-[#4F6F52]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            {userRole !== 'restaurant-owner' && (
              <button
                onClick={() => {
                  const el = document.getElementById('recommended-restaurants-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-semibold uppercase tracking-widest text-[#4F6F52] transition-colors flex items-center gap-1.5 cursor-pointer"
                id="cust-nav-discover"
              >
                <Compass className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span>Discover</span>
              </button>
            )}
            <button
              onClick={onOpenReservations}
              className="text-xs font-semibold uppercase tracking-widest text-[#2C3333]/80 hover:text-[#4F6F52] transition-colors flex items-center gap-1.5 cursor-pointer relative"
              id="cust-nav-reservations"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Reservations</span>
              {reservations.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#4F6F52] text-white text-[9px] font-bold flex items-center justify-center">
                  {reservations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsSmartMatchOpen(true)}
              className="text-xs font-semibold uppercase tracking-widest text-[#2C3333]/80 hover:text-[#4F6F52] transition-colors flex items-center gap-1.5 cursor-pointer"
              id="cust-nav-smartmatch"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Smart Match</span>
            </button>
          </nav>

          {/* Profile / Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-white border border-[#E8E6E1] hover:border-[#4F6F52]/40 transition-all cursor-pointer shadow-2xs group"
              id="cust-profile-btn"
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
                <span className="text-xs font-semibold text-[#2C3333] block leading-none">
                  {currentUser.fullName || (userRole === 'restaurant-owner' ? 'Restaurant Owner' : 'Guest')}
                </span>
                <span className="text-[10px] text-[#4F6F52] font-medium block mt-0.5">
                  {userRole === 'restaurant-owner' ? 'Restaurant Owner' : 'Diner'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#2C3333]/40 group-hover:text-[#4F6F52] transition-colors" />
            </button>

            {/* Profile Menu Dropdown */}
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
                      onOpenReservations();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#2C3333] hover:bg-[#FAF9F6] flex items-center gap-2.5 transition-colors cursor-pointer"
                    id="profile-menu-reservations"
                  >
                    <CalendarCheck className="w-4 h-4 text-[#4F6F52]" />
                    <span>My Reservations ({reservations.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenSmartArrival();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#2C3333] hover:bg-[#FAF9F6] flex items-center gap-2.5 transition-colors cursor-pointer"
                    id="profile-menu-smart-arrival"
                  >
                    <Navigation className="w-4 h-4 text-[#4F6F52]" />
                    <span>Smart Arrival Simulator</span>
                  </button>

                  {isRestaurantOwner && (
                    <button
                      onClick={() => {
                        onSwitchToPartner();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#2C3333] hover:bg-[#FAF9F6] flex items-center gap-2.5 transition-colors cursor-pointer"
                      id="profile-menu-partner"
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
                    id="profile-menu-settings"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[#4F6F52]" />
                    <span>Language & Account Settings</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-[#E8E6E1]/60">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    id="profile-menu-signout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Default OTP Notification Card for Logged Customer */}
        <section aria-label="Customer OTP Verification Status" id="cust-default-otp-card">
          <div className="bg-emerald-50/90 rounded-2xl p-4 sm:p-5 border border-emerald-200 text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold">
                    Logged Customer Security Code
                  </span>
                  <span className="text-xs text-emerald-800 font-medium">
                    Verified Contact: {currentUser.email || currentUser.phone || 'srushtihalagi2454@gmail.com'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-emerald-950 mt-1">
                  Default Verification OTP Sent: <span className="font-mono text-base px-2 py-0.5 bg-white rounded-lg border border-emerald-300 text-emerald-900 font-black tracking-widest ml-1">123456</span>
                </h4>
                <p className="text-xs text-emerald-800/90 mt-0.5">
                  The standard default OTP has been dispatched to your account. You can use code <strong className="font-mono">123456</strong> for instant verification across reservations and account actions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <button
                type="button"
                onClick={() => {
                  setDefaultOtpDispatchedNotice(true);
                  setTimeout(() => setDefaultOtpDispatchedNotice(false), 4000);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                id="resend-default-otp-home-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Send Default OTP Again</span>
              </button>
            </div>
          </div>
          {defaultOtpDispatchedNotice && (
            <div className="mt-2.5 p-3 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Default OTP <strong>123456</strong> sent to your logged customer account ({currentUser.email || currentUser.phone || 'registered contact'})!</span>
            </div>
          )}
        </section>

        {/* 2. Compact Upcoming Reservation Card (Near top) */}
        {activeReservation && (
          <section aria-label="Upcoming Reservation" id="upcoming-reservation-banner">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#4F6F52]/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#4F6F52]/5">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#4F6F52]/10 flex items-center justify-center shrink-0 text-[#4F6F52]">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#4F6F52] text-white">
                      Upcoming Reservation
                    </span>
                    <ReservationTimerBadge reservation={activeReservation} />
                    <DiningTimerCard reservation={activeReservation} variant="compact" />
                    <span className="text-xs text-[#2C3333]/50 font-mono">Ref: {activeReservation.bookingRef}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#2C3333] mt-0.5">
                    {activeReservation.restaurantName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#2C3333]/70">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#4F6F52]" />
                      {activeReservation.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
                      {activeReservation.timeSlot}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#4F6F52]" />
                      {activeReservation.guests} Guests
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-[#4F6F52]">
                      <Armchair className="w-3.5 h-3.5" />
                      Table {activeReservation.tableNumber} ({activeReservation.section})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E8E6E1] flex-wrap">
                {onOpenSmartArrival && (
                  <button
                    onClick={() => onOpenSmartArrival(activeReservation)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#FAF9F6] border border-[#E8E6E1] hover:border-[#4F6F52] text-[#2C3333] text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    id="home-smart-arrival-btn"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#4F6F52]" />
                    <span>Smart Arrival</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (onViewReservationDetail) {
                      onViewReservationDetail(activeReservation);
                    } else {
                      onOpenReservations();
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#4F6F52] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#3D5A40] transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  id="view-upcoming-reservation-btn"
                >
                  <span>View reservation</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 3. Hero & Unified Reservation Search Area */}
        <section className="pt-2 pb-4" id="home-hero-search-section">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#2C3333] tracking-tight">
              Find your perfect table.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#2C3333]/70 font-light">
              Discover restaurants and reserve the exact table you want.
            </p>
          </div>

          {/* Unified Reservation Search Panel */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-full p-2.5 sm:p-2 border border-[#E8E6E1] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-[#E8E6E1]">
              
              {/* Location Selector */}
              <div className="flex-1 px-4 py-2 sm:py-1.5 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#4F6F52] shrink-0" />
                <div className="w-full text-left">
                  <label htmlFor="search-loc" className="block text-[10px] uppercase font-bold tracking-wider text-[#2C3333]/50">
                    Location
                  </label>
                  <select
                    id="search-loc"
                    value={selectedNeighborhood}
                    onChange={(e) => setSelectedNeighborhood(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-[#2C3333] outline-none cursor-pointer"
                  >
                    <option value="All Bengaluru">Bengaluru (All Areas)</option>
                    {BENGALURU_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>
                        {n}, Bengaluru
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Selector */}
              <div className="flex-1 px-4 py-2 sm:py-1.5 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#4F6F52] shrink-0" />
                <div className="w-full text-left">
                  <label htmlFor="search-date" className="block text-[10px] uppercase font-bold tracking-wider text-[#2C3333]/50">
                    Date
                  </label>
                  <input
                    type="date"
                    id="search-date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-[#2C3333] outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Time In (Arrival) Manual Selector */}
              <div className="flex-1 px-4 py-2 sm:py-1.5 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="w-full text-left">
                  <label htmlFor="search-time-in" className="block text-[10px] uppercase font-bold tracking-wider text-[#2C3333]/50">
                    Time In (Arrival)
                  </label>
                  <input
                    type="text"
                    id="search-time-in"
                    value={selectedTimeIn}
                    onChange={(e) => handleTimeInChange(e.target.value)}
                    placeholder="e.g. 7:30 PM"
                    className="w-full bg-transparent text-xs font-semibold text-[#2C3333] outline-none"
                  />
                </div>
              </div>

              {/* Time Out (Departure) Manual Selector */}
              <div className="flex-1 px-4 py-2 sm:py-1.5 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <label htmlFor="search-time-out" className="block text-[10px] uppercase font-bold tracking-wider text-[#2C3333]/50">
                      Time Out (Departure)
                    </label>
                    {timeRangeDuration.isValid && (
                      <span className="text-[10px] font-bold text-[#4F6F52] bg-[#4F6F5214] px-1.5 py-0.5 rounded font-mono">
                        {timeRangeDuration.durationFormatted}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    id="search-time-out"
                    value={selectedTimeOut}
                    onChange={(e) => handleTimeOutChange(e.target.value)}
                    placeholder="e.g. 9:15 PM"
                    className="w-full bg-transparent text-xs font-semibold text-[#2C3333] outline-none"
                  />
                </div>
              </div>

              {/* Guests Selector */}
              <div className="w-full sm:w-36 px-4 py-2 sm:py-1.5 flex items-center gap-3">
                <Users className="w-4 h-4 text-[#4F6F52] shrink-0" />
                <div className="w-full text-left">
                  <label htmlFor="search-guests" className="block text-[10px] uppercase font-bold tracking-wider text-[#2C3333]/50">
                    Guests
                  </label>
                  <select
                    id="search-guests"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-semibold text-[#2C3333] outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* "Find tables" Button */}
              <div className="p-1 sm:p-1.5 flex justify-end">
                <button
                  onClick={() => {
                    const el = document.getElementById('recommended-restaurants-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl sm:rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  id="unified-find-tables-btn"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find tables</span>
                </button>
              </div>

            </div>
          </div>

          {/* Time Validation Status Message */}
          {!timeRangeDuration.isValid && timeRangeDuration.error && (
            <div className="max-w-md mx-auto mt-2.5 text-center text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 py-1.5 px-3.5 rounded-full flex items-center justify-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{timeRangeDuration.error} (Please adjust departure time)</span>
            </div>
          )}
        </section>

        {/* 4. Horizontal Category Section */}
        <section aria-label="Restaurant Categories" id="categories-section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase font-bold tracking-widest text-[#2C3333]/60">
              Browse by Dining Style
            </h2>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#4F6F52] text-white shadow-2xs'
                      : 'bg-white text-[#2C3333]/80 border border-[#E8E6E1] hover:border-[#4F6F52]/40 hover:bg-[#FAF9F6]'
                  }`}
                  id={`cat-pill-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Travel Dining Journey Banner */}
        <section 
          className="bg-linear-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 border border-amber-300 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden"
          id="travel-journey-banner"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 shadow-sm border border-amber-300">
                <Bus className="w-6 h-6 text-stone-950" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                    Travel Dining & Food Booking
                  </span>
                  <span className="text-[10px] font-semibold text-amber-800">
                    ⭐ Popular Travel Stops • Transit corridors
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-[#2C3333]">
                  Travelling by bus? Order food or book a table while on the move
                </h3>
                <p className="text-xs text-[#2C3333]/70 max-w-2xl leading-relaxed">
                  Discover verified restaurants along Karnataka & Bengaluru bus routes (NH 75, NH 44, Outer Ring Road). Choose between timed Dine-In reservations or curbside Food Parcel takeaways.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              {onNavigateTravelDining && (
                <button
                  type="button"
                  onClick={onNavigateTravelDining}
                  className="px-5 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
                  id="btn-journey-explore"
                >
                  <Bus className="w-4 h-4 text-stone-950" />
                  <span>Restaurants Along My Journey</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 5. Recommended For You Restaurant Section */}
        <section id="recommended-restaurants-section" className="scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-[#4F6F52]">Curated Dining</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C3333] mt-0.5">
                Recommended for you
              </h2>
            </div>
            <span className="text-xs text-[#2C3333]/60 font-light">
              Showing {recommendedRestaurants.length} tables in Bengaluru
            </span>
          </div>

          {/* Realistic Bengaluru Restaurant Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedRestaurants.map((restaurant) => {
              // Calculate available tables for current party size
              const suitableTables = restaurant.tables.filter((t) => t.capacity >= guestCount);

              return (
                <article
                  key={restaurant.id}
                  className="bg-white rounded-2xl border border-[#E8E6E1] overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group"
                  id={`restaurant-card-${restaurant.id}`}
                >
                  {/* Card Image & Overlay */}
                  <div className="relative aspect-16/10 overflow-hidden bg-stone-100">
                    <img
                      src={restaurant.heroImage}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Rating Badge */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold text-[#2C3333] flex items-center gap-1 shadow-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{restaurant.rating}</span>
                      <span className="text-[10px] text-[#2C3333]/60">({restaurant.reviewCount})</span>
                    </div>

                    {/* ⭐ Popular Travel Stop Badge */}
                    {restaurant.isPopularTravelStop && (
                      <div 
                        className="absolute top-10 left-3 bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded-full text-[10px] tracking-wide flex items-center gap-1 shadow-md border border-amber-300 z-10"
                        title="Frequently selected by travelling passengers"
                      >
                        <span>⭐</span>
                        <span>Popular Travel Stop</span>
                      </div>
                    )}

                    {/* Seating / Experience Tag Badge */}
                    {restaurant.experienceTag && (
                      <div className="absolute top-3 right-3 bg-[#4F6F52]/90 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[11px] font-medium shadow-xs">
                        {restaurant.experienceTag}
                      </div>
                    )}

                    {/* Live Available Tables Chip & 3D Floor Indicator */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <div className="bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>{suitableTables.length} tables open</span>
                      </div>
                      <div className="bg-[#4F6F52]/90 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs border border-white/20">
                        <span>3D Multi-Floor</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase font-semibold tracking-wider text-[#4F6F52]">
                          {restaurant.neighborhood} • Bengaluru
                        </span>
                        <div className="flex items-center gap-1 font-serif text-xs">
                          <span className="line-through text-stone-600 font-semibold">₹{Math.round(restaurant.costForTwo * 1.25)}</span>
                          <span className="text-stone-400 font-bold">/</span>
                          <span className="text-emerald-700 font-bold">₹{restaurant.costForTwo}</span>
                          <span className="text-[10px] text-stone-500 font-sans font-medium">for two</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-serif font-bold text-[#2C3333] mt-1 group-hover:text-[#4F6F52] transition-colors">
                        {restaurant.name}
                      </h3>

                      <p className="text-xs text-[#2C3333]/70 line-clamp-1 mt-1 font-light">
                        {restaurant.cuisines.join(' • ')}
                      </p>

                      {/* Address */}
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-[#2C3333]/70">
                        <MapPin className="w-3.5 h-3.5 text-[#4F6F52] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{restaurant.address}</span>
                      </div>

                      <p className="text-xs text-[#2C3333]/60 line-clamp-2 mt-2 font-light">
                        {restaurant.description}
                      </p>

                      {/* Hours */}
                      <div className="mt-2.5 flex items-center gap-1 text-[11px] text-[#2C3333]/70 font-medium">
                        <Clock className="w-3 h-3 text-[#4F6F52] shrink-0" />
                        <span>Hours: {getFormattedOperatingHours(restaurant.openingHours)}</span>
                      </div>

                      {/* Customer Care Contact */}
                      {(restaurant.customerCareNumber || restaurant.contactNumber) && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#4F6F52] font-semibold">
                          <Phone className="w-3 h-3 text-[#4F6F52] shrink-0" />
                          <a
                            href={`tel:${restaurant.customerCareNumber || restaurant.contactNumber}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline flex items-center gap-1"
                            title="Call Restaurant Customer Care"
                          >
                            <span>Customer Care:</span>
                            <span className="font-mono">{restaurant.customerCareNumber || restaurant.contactNumber}</span>
                          </a>
                        </div>
                      )}
                      {/* Nearby Bus Stop & Transit Info */}
                      {restaurant.nearbyBusStops && restaurant.nearbyBusStops.length > 0 && (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-[#2C3333]">
                          <div className="flex items-center justify-between font-semibold text-amber-900">
                            <span className="flex items-center gap-1.5 truncate">
                              <Bus className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span className="truncate">{restaurant.nearbyBusStops[0].stopName}</span>
                            </span>
                            <span className="text-[11px] font-bold text-amber-800 shrink-0 ml-1">
                              {restaurant.nearbyBusStops[0].distanceKm} km
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-stone-600">
                            <span className="truncate">{restaurant.nearbyBusStops[0].highwayRoute}</span>
                            <span className="font-semibold text-emerald-800 shrink-0">
                              🍽️ Dine-In & 🥡 Parcel
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Action */}
                    <div className="mt-4 pt-3.5 border-t border-[#E8E6E1]/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMenuRestaurant(restaurant);
                          }}
                          className="px-2.5 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6E1] text-[#2C3333] border border-[#E8E6E1] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="View Digital Menu"
                          id={`home-btn-menu-${restaurant.id}`}
                        >
                          <UtensilsCrossed className="w-3 h-3 text-[#4F6F52]" />
                          <span>Menu</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMenuQrRestaurant(restaurant);
                          }}
                          className="p-1 rounded-full bg-white hover:bg-[#FAF9F6] text-[#2C3333] border border-[#E8E6E1] transition-colors cursor-pointer shadow-2xs"
                          title="Scan Menu QR"
                          id={`home-btn-menu-qr-${restaurant.id}`}
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#4F6F52]" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {restaurant.isTravelStopPartner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onBookForTravel) {
                                onBookForTravel(restaurant);
                              } else {
                                onSelectRestaurant(restaurant);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Book food or table while travelling on bus"
                            id={`home-btn-travel-${restaurant.id}`}
                          >
                            <Bus className="w-3 h-3 text-amber-700" />
                            <span>Travel</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectRestaurant(restaurant, {
                            date: selectedDate,
                            timeIn: selectedTimeIn,
                            timeOut: selectedTimeOut,
                            guests: guestCount
                          })}
                          className="px-3.5 py-1.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                          id={`view-restaurant-${restaurant.id}`}
                        >
                          <span>Choose Table</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 6. Smart Match Section (Visually distinct but subtle intelligent recommendation) */}
        <section
          aria-label="Smart Table Match"
          id="smart-match-section"
          className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-[#4F6F52]/20 shadow-xs relative overflow-hidden"
        >
          {/* Subtle architectural background accent */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-[#4F6F52]/5 pointer-events-none"></div>
          <div className="absolute right-24 top-6 w-32 h-32 rounded-full bg-[#4F6F52]/5 pointer-events-none"></div>

          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4F6F52]/10 text-[#4F6F52] text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Intelligent Seating Recommendation</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C3333] tracking-tight">
              Not sure which table is right?
            </h2>

            <p className="mt-2.5 text-sm sm:text-base text-[#2C3333]/70 font-light leading-relaxed">
              Let Smart Match find a table based on your party size, preferred seating and availability.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setIsSmartMatchOpen(true)}
                className="px-6 py-3 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                id="try-smart-match-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Try Smart Match</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-[#2C3333]/60 font-light">
                <ShieldCheck className="w-4 h-4 text-[#4F6F52]" />
                <span>Matches acoustic privacy, party geometry, & views</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Nearby Section: "Restaurants near you" (Neighborhood tabs) */}
        <section aria-label="Nearby Restaurants" id="restaurants-near-you-section">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-[#4F6F52]">Hyper-Local</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C3333] mt-0.5">
                Restaurants near you
              </h2>
            </div>

            {/* Bengaluru Neighborhood Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {BENGALURU_NEIGHBORHOODS.map((nh) => {
                const isActive = nearbyNeighborhood === nh;
                return (
                  <button
                    key={nh}
                    onClick={() => setNearbyNeighborhood(nh)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#2C3333] text-white shadow-2xs'
                        : 'bg-white text-[#2C3333]/70 border border-[#E8E6E1] hover:border-[#2C3333]/40'
                    }`}
                    id={`nearby-tab-${nh.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {nh}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nearby Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyRestaurants.map((restaurant) => (
              <div
                key={`nearby-${restaurant.id}`}
                className="bg-white rounded-2xl border border-[#E8E6E1] p-4 flex gap-4 items-center hover:border-[#4F6F52]/50 hover:shadow-xs transition-all group"
                id={`nearby-card-${restaurant.id}`}
              >
                <img
                  src={restaurant.heroImage}
                  alt={restaurant.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-[11px] text-[#4F6F52] font-semibold">
                    <MapPin className="w-3 h-3" />
                    <span>{restaurant.neighborhood}</span>
                  </div>
                  <h4 className="text-sm font-serif font-bold text-[#2C3333] truncate group-hover:text-[#4F6F52] transition-colors">
                    {restaurant.name}
                  </h4>
                  <p className="text-[11px] text-[#2C3333]/60 truncate font-light mt-0.5">
                    {restaurant.cuisines.slice(0, 2).join(', ')} • ₹{restaurant.costForTwo} for two
                  </p>
                  <button
                    onClick={() => onSelectRestaurant(restaurant)}
                    className="mt-2 text-xs font-semibold text-[#4F6F52] hover:text-[#3D5A40] flex items-center gap-1 cursor-pointer"
                    id={`nearby-view-${restaurant.id}`}
                  >
                    <span>View restaurant</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* 8. Smart Match Intelligence Modal (Intelligent recommendation, not a chatbot) */}
      {isSmartMatchOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-4 sm:p-6 md:p-8 flex items-start justify-center"
          id="smart-match-modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSmartMatchOpen(false);
            }
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl sm:max-w-3xl w-full p-6 sm:p-8 border border-[#E8E6E1] shadow-2xl relative my-4 sm:my-8 z-10 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsSmartMatchOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#2C3333]/40 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              aria-label="Close Smart Match"
              id="close-smart-match-btn"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[#4F6F52] mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Intelligent Match Engine</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#2C3333]">
              Find your tailored table
            </h3>
            <p className="text-xs text-[#2C3333]/70 font-light mt-1 mb-6">
              Our algorithm analyzes party acoustics, sightlines, and seating orientation across Bengaluru.
            </p>

            {/* Smart Match Questionnaire Controls */}
            <div className="space-y-4">
              {/* 1. Location / City / Neighborhood */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 mb-2">
                  1. Location / Neighborhood
                </label>
                <div className="relative">
                  <select
                    value={smartArea}
                    onChange={(e) => setSmartArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs font-medium text-[#2C3333] outline-none hover:border-[#4F6F52]/40 transition-colors cursor-pointer"
                    id="smart-match-location-select"
                  >
                    <option value="All Bengaluru">All Bengaluru (All 10 Restaurants)</option>
                    {BENGALURU_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 mb-2">
                    2. Date
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Today', 'Tomorrow', 'This Weekend'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSmartDate(d)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                          smartDate === d
                            ? 'bg-[#4F6F52] text-white border-[#4F6F52]'
                            : 'bg-[#FAF9F6] text-[#2C3333] border-[#E8E6E1] hover:border-[#4F6F52]/40'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 mb-2">
                    3. Time Slot
                  </label>
                  <select
                    value={smartTime}
                    onChange={(e) => setSmartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs font-medium text-[#2C3333] outline-none hover:border-[#4F6F52]/40 transition-colors cursor-pointer"
                    id="smart-match-time-select"
                  >
                    {['01:00 PM', '01:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM'].map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Party Size */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 mb-2">
                  4. Guests / Party Size
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSmartPartySize(size)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        smartPartySize === size
                          ? 'bg-[#4F6F52] text-white border-[#4F6F52]'
                          : 'bg-[#FAF9F6] text-[#2C3333] border-[#E8E6E1] hover:border-[#4F6F52]/40'
                      }`}
                    >
                      {size} Guests
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Seating Ambience / Table preferences */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 mb-2">
                  5. Seating Ambience & Table Preference
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'quiet', label: 'Quiet Corner', desc: 'Acoustic privacy & conversation' },
                    { id: 'garden', label: 'Verandah / Garden', desc: 'Breezy botanical courtyard' },
                    { id: 'central', label: 'Center Stage', desc: 'Lively dining room & chandeliers' },
                    { id: 'rooftop', label: 'Rooftop Edge', desc: 'Skyline view & evening breezes' },
                  ].map((vibe) => (
                    <button
                      key={vibe.id}
                      type="button"
                      onClick={() => setSmartVibe(vibe.id as any)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        smartVibe === vibe.id
                          ? 'bg-[#4F6F52]/10 border-[#4F6F52] text-[#2C3333]'
                          : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2C3333] hover:border-[#4F6F52]/40'
                      }`}
                    >
                      <span className="text-xs font-bold block">{vibe.label}</span>
                      <span className="text-[10px] text-[#2C3333]/60 block mt-0.5">{vibe.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate / Apply Filters Button */}
              <button
                type="button"
                onClick={handleRunSmartMatch}
                className="w-full mt-2 py-3 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                id="calculate-smart-match-btn"
              >
                <Sparkles className="w-4 h-4" />
                <span>Calculate Best Table Matches</span>
              </button>
            </div>

            {/* Filtered Restaurant Results Presentation */}
            {smartMatchCalculated && (
              <div className="mt-8 pt-6 border-t border-[#E8E6E1] space-y-4" id="smart-match-results-container">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#2C3333]">
                      Filtered Restaurant Results ({smartMatchResults.length})
                    </h4>
                    <p className="text-xs text-[#2C3333]/60 font-light mt-0.5">
                      Showing restaurants matching your criteria, ranked by table compatibility
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#4F6F52] bg-[#4F6F52]/10 px-3 py-1 rounded-full">
                    {smartArea} • {smartDate} • {smartTime}
                  </span>
                </div>

                {smartMatchResults.length === 0 ? (
                  <div className="bg-[#FAF9F6] rounded-2xl p-8 text-center border border-[#E8E6E1]">
                    <p className="text-sm text-[#2C3333]/70 font-medium">No restaurants found in {smartArea}.</p>
                    <p className="text-xs text-[#2C3333]/50 mt-1">Try searching across all Bengaluru neighborhoods.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSmartArea('All Bengaluru');
                        setTimeout(handleRunSmartMatch, 20);
                      }}
                      className="mt-3 px-4 py-2 rounded-full bg-[#4F6F52] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#3D5A40] transition-colors cursor-pointer"
                    >
                      Show All Bengaluru Matches
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {smartMatchResults.map((item) => (
                      <div
                        key={item.restaurant.id}
                        id={`smart-match-card-${item.restaurant.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectSmartMatchRestaurant(item.restaurant)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectSmartMatchRestaurant(item.restaurant);
                          }
                        }}
                        className="w-full bg-[#FAF9F6] hover:bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E6E1] hover:border-[#4F6F52] shadow-2xs hover:shadow-md transition-all cursor-pointer relative z-10 pointer-events-auto text-left group"
                      >
                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                          <img
                            src={item.restaurant.heroImage}
                            alt={item.restaurant.name}
                            className="w-full sm:w-32 h-36 sm:h-32 rounded-xl object-cover shrink-0 pointer-events-none"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6F52] bg-[#4F6F52]/15 px-2.5 py-0.5 rounded-full">
                                {item.matchScore}% Match
                              </span>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C3333]">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                <span>{item.restaurant.rating}</span>
                                <span className="text-[#2C3333]/50 font-normal">({item.restaurant.reviewCount})</span>
                              </div>
                            </div>

                            <h4 className="text-base sm:text-lg font-serif font-bold text-[#2C3333] group-hover:text-[#4F6F52] transition-colors">
                              {item.restaurant.name}
                            </h4>
                            
                            <div className="flex items-center gap-2 text-xs text-[#2C3333]/70 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 font-medium text-[#4F6F52]">
                                <MapPin className="w-3.5 h-3.5" />
                                {item.restaurant.neighborhood}
                              </span>
                              <span>•</span>
                              <span>{item.restaurant.cuisines.join(', ')}</span>
                              <span>•</span>
                              <span>₹{item.restaurant.costForTwo} for two</span>
                            </div>

                            {/* Recommended Table Details */}
                            <div className="mt-2.5 p-2.5 rounded-xl bg-[#4F6F52]/10 border border-[#4F6F52]/15">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-[#2C3333] flex items-center gap-1.5">
                                  <Armchair className="w-3.5 h-3.5 text-[#4F6F52]" />
                                  Recommended Table: {item.table.tableNumber || 'T01'} ({item.table.section})
                                </span>
                                <span className="text-[10px] text-[#2C3333]/60 font-medium">
                                  Seats {item.table.capacity} guests
                                </span>
                              </div>
                              <p className="text-xs text-[#4F6F52] font-medium mt-1 leading-relaxed">
                                {item.reason}
                              </p>
                            </div>

                            {/* Action Row */}
                            <div className="mt-3.5 flex items-center justify-between gap-3 pt-2.5 border-t border-[#E8E6E1]/60 flex-wrap">
                              <span className="text-xs text-[#2C3333]/60 font-light">
                                Click card or button to view table & floor plan
                              </span>
                              <button
                                type="button"
                                id={`book-smart-match-${item.restaurant.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSmartMatchRestaurant(item.restaurant);
                                }}
                                className="px-4 py-2 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-[#3D5A40]"
                              >
                                <span>Select Restaurant</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Page Footer */}
      <footer className="mt-16 border-t border-[#E8E6E1] bg-white/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#2C3333]/60">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#2C3333]">FlashTable</span>
            <span>•</span>
            <span>Bengaluru, Karnataka</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-[#4F6F52] transition-colors cursor-pointer"
            >
              Back to top
            </button>
            <button
              onClick={onOpenReservations}
              className="hover:text-[#4F6F52] transition-colors cursor-pointer"
            >
              My Bookings
            </button>
            {isRestaurantOwner && (
              <button
                onClick={onSwitchToPartner}
                className="hover:text-[#4F6F52] transition-colors cursor-pointer"
              >
                Staff Console
              </button>
            )}
            <button
              onClick={onSignOut}
              className="hover:text-rose-700 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </footer>

      {/* Digital Menu Modal */}
      {selectedMenuRestaurant && (
        <DigitalMenuView
          restaurant={selectedMenuRestaurant}
          onClose={() => setSelectedMenuRestaurant(null)}
          onOpenBooking={() => {
            const r = selectedMenuRestaurant;
            setSelectedMenuRestaurant(null);
            onSelectRestaurant(r);
          }}
          onOpenMenuQr={() => {
            setSelectedMenuQrRestaurant(selectedMenuRestaurant);
          }}
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
