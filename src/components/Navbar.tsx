import React from 'react';
import { 
  MapPin, 
  CalendarDays, 
  Store, 
  User, 
  Sparkles, 
  Radio, 
  Menu, 
  X,
  Compass,
  ChevronDown,
  LogOut,
  Bus,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  MessageSquare
} from 'lucide-react';
import { Reservation, Restaurant, UserRole } from '../types';
import { isReservationForCustomer } from '../data/mockData';
import { getStoredSession } from '../services/authService';

interface NavbarProps {
  activeTab: 'customer' | 'customer-home' | 'my-reservations' | 'restaurant' | 'how-it-works' | 'travel-dining' | 'login' | 'signup' | 'company-admin';
  setActiveTab: (tab: 'customer' | 'customer-home' | 'my-reservations' | 'restaurant' | 'how-it-works' | 'travel-dining' | 'login' | 'signup' | 'company-admin') => void;
  onOpenBookings: () => void;
  onOpenSmartArrival: () => void;
  onOpenAuth: () => void;
  onNavigateAuth: (mode: 'login' | 'signup') => void;
  onNavigateCustomerHome?: () => void;
  onOpenAdminSetup?: () => void;
  onOpenAdminConsole?: () => void;
  onOpenChat?: () => void;
  isLoggedIn?: boolean;
  userRole?: UserRole;
  activeRestaurant?: Restaurant;
  onSignOut?: () => void;
  currentUser?: { userId?: string; fullName: string; email: string; phone?: string; restaurantId?: string } | null;
  reservations: Reservation[];
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenBookings,
  onOpenSmartArrival,
  onOpenAuth,
  onNavigateAuth,
  onNavigateCustomerHome,
  onOpenAdminSetup,
  onOpenAdminConsole,
  onOpenChat,
  isLoggedIn = false,
  userRole = 'customer',
  activeRestaurant,
  onSignOut,
  currentUser,
  reservations,
  selectedLocation,
  setSelectedLocation,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = React.useState(false);
  const ownerMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ownerMenuRef.current && !ownerMenuRef.current.contains(event.target as Node)) {
        setIsOwnerMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Existing authenticated-session role check
  const session = getStoredSession();
  const effectiveRole = userRole || (currentUser as any)?.role || session?.role || 'customer';
  const effectiveIsLoggedIn = isLoggedIn || !!session;
  const isRestaurantOwner = effectiveIsLoggedIn && effectiveRole === 'restaurant-owner';
  const isCompanyAdmin = effectiveIsLoggedIn && effectiveRole === 'company-admin';

  // Filter reservations count to strictly the authenticated customer's userId
  const userReservationsCount = React.useMemo(() => {
    if (!isLoggedIn || !currentUser?.userId || isRestaurantOwner) {
      return 0;
    }
    return reservations.filter((r) => isReservationForCustomer(r, currentUser.userId)).length;
  }, [isLoggedIn, currentUser?.userId, isRestaurantOwner, reservations]);

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E8E6E1] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <button 
              onClick={() => {
                if (isRestaurantOwner) {
                  setActiveTab('restaurant');
                } else {
                  setActiveTab(isLoggedIn ? 'customer-home' : 'customer');
                }
              }}
              className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
              id="brand-logo-btn"
            >
              <div className="w-9 h-9 rounded-xl bg-[#4F6F52] flex items-center justify-center text-white shadow-sm group-hover:bg-[#3D5A40] transition-colors">
                {/* Visual table seat icon */}
                <div className="relative flex items-center justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-white rounded-[3px] bg-white/10 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  <div className="absolute -top-1 w-2.5 h-0.5 bg-white/80 rounded-full"></div>
                  <div className="absolute -bottom-1 w-2.5 h-0.5 bg-white/80 rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-[#4F6F52] font-display flex items-center gap-1.5">
                  Flash<span className="text-[#2C3333]">Table</span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 bg-[#4F6F521A] text-[#4F6F52] rounded-sm">IN</span>
                </div>
              </div>
            </button>

            {/* Location selector / Active Venue indicator */}
            {isCompanyAdmin ? (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-950 bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-300 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span className="font-semibold text-emerald-950 uppercase tracking-wider text-[10px]">Governance:</span>
                <span className="text-xs font-bold text-emerald-900">
                  Super Admin Console
                </span>
              </div>
            ) : isRestaurantOwner ? (
              <div className="flex items-center gap-2 text-xs bg-white px-3.5 py-1.5 rounded-full border border-[#E8E6E1] shadow-2xs">
                <Store className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
                <span className="font-bold text-[#2C3333] text-xs sm:text-sm tracking-tight">
                  {activeRestaurant ? activeRestaurant.name : 'The Ember Room'}
                </span>
                <span className="text-stone-300">·</span>
                <MapPin className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
                <span className="text-[11px] sm:text-xs text-[#2C3333]/80 font-medium truncate max-w-[200px] sm:max-w-xs">
                  {activeRestaurant ? (activeRestaurant.address || `${activeRestaurant.neighborhood}, Bengaluru`) : 'Indiranagar, Bengaluru'}
                </span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#2C3333]/70 bg-white px-3.5 py-1.5 rounded-full border border-[#E8E6E1] shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span className="font-semibold text-[#2C3333] uppercase tracking-wider text-[10px]">BLR:</span>
                <select 
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#4F6F52] outline-none cursor-pointer pr-1"
                  id="location-quick-select"
                >
                  <option value="All Bengaluru">All Neighborhoods</option>
                  <option value="Indiranagar">Indiranagar</option>
                  <option value="Lavelle Road">Lavelle Road & UB City</option>
                  <option value="Koramangala">Koramangala</option>
                  <option value="Church Street">Church Street</option>
                  <option value="Whitefield">Whitefield</option>
                </select>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {!isRestaurantOwner && (
              <>
                <button
                  onClick={() => {
                    setActiveTab('customer');
                    const disc = document.getElementById('explore-section');
                    if (disc) disc.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-widest rounded-full transition-colors ${
                    activeTab === 'customer'
                      ? 'text-[#4F6F52] bg-[#4F6F521A]'
                      : 'text-[#2C3333]/80 hover:text-[#4F6F52] hover:bg-white'
                  }`}
                  id="nav-discover-btn"
                >
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    Discover
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('how-it-works')}
                  className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-widest rounded-full transition-colors ${
                    activeTab === 'how-it-works'
                      ? 'text-[#4F6F52] bg-[#4F6F521A]'
                      : 'text-[#2C3333]/80 hover:text-[#4F6F52] hover:bg-white'
                  }`}
                  id="nav-how-it-works-btn"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#4F6F52]" />
                    How It Works
                  </span>
                </button>

                {/* Travel Dining & Bus Stop Bookings */}
                <button
                  onClick={() => setActiveTab('travel-dining')}
                  className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-widest rounded-full transition-colors ${
                    activeTab === 'travel-dining'
                      ? 'text-amber-950 bg-amber-200/90 font-bold border border-amber-300'
                      : 'text-[#2C3333]/80 hover:text-amber-800 hover:bg-amber-50/80'
                  }`}
                  id="nav-travel-dining-btn"
                >
                  <span className="flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-amber-700" />
                    <span>Travel Dining</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-stone-950 uppercase">
                      New
                    </span>
                  </span>
                </button>

                {/* Smart Arrival Simulation Indicator */}
                <button
                  onClick={onOpenSmartArrival}
                  className="px-3.5 py-2 text-xs font-semibold uppercase tracking-widest text-[#2C3333]/80 hover:text-[#4F6F52] rounded-full transition-colors flex items-center gap-1.5 group"
                  title="Test Smart Arrival Geofencing Simulation"
                  id="nav-smart-arrival-btn"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4F6F52] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4F6F52]"></span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4F6F52] bg-[#4F6F521A] px-2.5 py-1 rounded-full group-hover:bg-[#4F6F52]/20 transition-colors">
                    Smart Arrival
                  </span>
                </button>

                {/* Concierge & Support Chat Button */}
                {onOpenChat && (
                  <button
                    onClick={onOpenChat}
                    className="px-3.5 py-2 text-xs font-semibold uppercase tracking-widest text-[#2C3333]/80 hover:text-[#4F6F52] hover:bg-white rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Open Dining Concierge & Host Chat (Landscape)"
                    id="nav-concierge-chat-btn"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#4F6F52]" />
                    <span>Concierge</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Right Action Icons & Auth */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Dedicated Admin Console Option (Accessible from every page) */}
            {!isCompanyAdmin && (
              <button
                onClick={() => {
                  if (onOpenAdminConsole) {
                    onOpenAdminConsole();
                  } else {
                    setActiveTab('company-admin');
                  }
                }}
                className="px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 border border-stone-200 hover:border-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Dedicated Administrator Console"
                id="nav-admin-console-top-btn"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Admin Console</span>
              </button>
            )}
            {isCompanyAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('company-admin')}
                  className="px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  id="nav-company-admin-btn"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </button>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                    title="Sign Out Super Admin"
                    id="nav-admin-signout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : isRestaurantOwner ? (
              /* Restaurant Owner Header: Owner Profile & Direct Logout Option */
              <div className="flex items-center gap-2.5">
                <div className="relative" ref={ownerMenuRef}>
                  <button
                    onClick={() => setIsOwnerMenuOpen(!isOwnerMenuOpen)}
                    className="flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full bg-white border border-[#E8E6E1] hover:border-[#4F6F52]/40 transition-all cursor-pointer shadow-2xs group"
                    id="nav-owner-profile-btn"
                    aria-label="Owner Account Menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#4F6F52] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      {currentUser?.fullName ? currentUser.fullName[0].toUpperCase() : 'O'}
                    </div>
                    <div className="hidden sm:block text-left">
                      <span className="text-xs font-semibold text-[#2C3333] block leading-none">
                        {currentUser?.fullName || 'Restaurant Owner'}
                      </span>
                      <span className="text-[10px] text-[#4F6F52] font-semibold block mt-0.5">
                        Restaurant Owner
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-[#2C3333]/40 group-hover:text-[#4F6F52] transition-colors" />
                  </button>

                  {isOwnerMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E8E6E1] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-3 border-b border-[#E8E6E1]/60">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-[#2C3333]">{currentUser?.fullName || 'Restaurant Owner'}</p>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20">
                            Owner
                          </span>
                        </div>
                        <p className="text-[11px] text-[#2C3333]/60 truncate">{currentUser?.email || 'owner@flashtable.in'}</p>
                        {activeRestaurant && (
                          <p className="text-[11px] text-[#4F6F52] font-medium mt-1">
                            Venue: {activeRestaurant.name}
                          </p>
                        )}
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setActiveTab('restaurant');
                            setIsOwnerMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-[#2C3333] hover:bg-[#FAF9F6] flex items-center gap-2.5 transition-colors cursor-pointer"
                          id="owner-menu-dashboard"
                        >
                          <Store className="w-4 h-4 text-[#4F6F52]" />
                          <span>Restaurant Dashboard</span>
                        </button>

                        {onSignOut && (
                          <button
                            onClick={() => {
                              setIsOwnerMenuOpen(false);
                              onSignOut();
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-[#E8E6E1]/40 mt-1"
                            id="owner-menu-signout"
                          >
                            <LogOut className="w-4 h-4 text-rose-500" />
                            <span>Logout</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Logout Option in Header */}
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Logout"
                    id="nav-owner-direct-logout-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* My Bookings Button */}
                <button
                  onClick={onOpenBookings}
                  className={`relative px-3.5 py-2 text-xs font-semibold uppercase tracking-widest rounded-full border transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                    activeTab === 'my-reservations'
                      ? 'text-white bg-[#4F6F52] border-[#4F6F52]'
                      : 'text-[#4F6F52] bg-[#4F6F521A] hover:bg-[#4F6F52]/20 border-[#4F6F52]/20'
                  }`}
                  id="my-bookings-nav-btn"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Reservations</span>
                  {userReservationsCount > 0 && (
                    <span className={`text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold ${
                      activeTab === 'my-reservations' ? 'bg-white text-[#4F6F52]' : 'bg-[#4F6F52] text-white'
                    }`}>
                      {userReservationsCount}
                    </span>
                  )}
                </button>

                {isLoggedIn && currentUser ? (
                  <button
                    onClick={() => {
                      if (onNavigateCustomerHome) onNavigateCustomerHome();
                      else setActiveTab('customer-home');
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-[#4F6F52] text-white text-xs font-semibold flex items-center gap-2 hover:bg-[#3D5A40] transition-colors cursor-pointer shadow-xs"
                    id="nav-customer-home-btn"
                    title="Go to Customer Home"
                  >
                    <div className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-[10px]">
                      {currentUser.fullName ? currentUser.fullName[0] : 'S'}
                    </div>
                    <span>{currentUser.fullName?.split(' ')[0] || 'Home'}</span>
                  </button>
                ) : (
                  <>
                    {/* Login Link / Button */}
                    <button
                      onClick={() => onNavigateAuth('login')}
                      className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-widest rounded-full transition-all cursor-pointer ${
                        activeTab === 'login'
                          ? 'text-[#4F6F52] bg-[#4F6F521A] font-bold'
                          : 'text-[#2C3333]/80 hover:text-[#4F6F52] hover:bg-white'
                      }`}
                      id="nav-login-btn"
                    >
                      Login
                    </button>

                    {/* Sign Up Primary Button */}
                    <button
                      onClick={() => onNavigateAuth('signup')}
                      className={`px-4.5 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'signup'
                          ? 'bg-[#3D5A40] text-white ring-2 ring-[#4F6F52]/40'
                          : 'bg-[#4F6F52] text-white hover:bg-[#3D5A40]'
                      }`}
                      id="nav-signup-btn"
                    >
                      <span>Sign Up</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {!isRestaurantOwner && (
              <button
                onClick={onOpenBookings}
                className="relative p-2 rounded-full bg-[#4F6F521A] text-[#4F6F52]"
                title="My Reservations"
              >
                <CalendarDays className="w-5 h-5" />
                {userReservationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#4F6F52] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {userReservationsCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#2C3333] hover:text-[#4F6F52] hover:bg-white rounded-lg"
              id="mobile-menu-toggle-btn"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#FAF9F6] border-b border-[#E8E6E1] px-4 pt-2 pb-6 space-y-3">
          {isRestaurantOwner ? (
            <div className="flex flex-col gap-2.5">
              <div className="p-3.5 bg-white rounded-2xl border border-[#E8E6E1] shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C3333]">{currentUser?.fullName || 'Restaurant Owner'}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#4F6F521A] text-[#4F6F52]">
                    Owner
                  </span>
                </div>
                <div className="text-[11px] text-[#4F6F52] font-semibold mt-0.5">Restaurant Owner</div>
                {activeRestaurant && (
                  <div className="text-[11px] text-[#2C3333]/70 mt-1">
                    Venue: {activeRestaurant.name} ({activeRestaurant.neighborhood})
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setActiveTab('restaurant');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-xl text-white bg-[#4F6F52] flex items-center gap-2"
                id="mobile-owner-dashboard-btn"
              >
                <Store className="w-4 h-4" />
                <span>Restaurant Dashboard</span>
              </button>
              {onSignOut && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-xl text-rose-600 bg-rose-50 border border-rose-200 flex items-center gap-2"
                  id="mobile-owner-signout-btn"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setActiveTab('customer');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-widest rounded-xl text-[#2C3333] bg-white border border-[#E8E6E1]"
              >
                Discover Restaurants
              </button>
              <button
                onClick={() => {
                  setActiveTab('travel-dining');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-widest rounded-xl text-amber-900 bg-amber-50 border border-amber-200 flex items-center justify-between"
                id="mobile-nav-travel-dining-btn"
              >
                <span className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-amber-700" />
                  <span>Travel Dining</span>
                </span>
                <span className="text-[9px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full font-bold">
                  NEW
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('how-it-works');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-widest rounded-xl text-[#2C3333]"
              >
                How FlashTable Works
              </button>
              <button
                onClick={() => {
                  onOpenBookings();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-widest rounded-xl text-[#2C3333] flex items-center justify-between"
              >
                <span>Reservations</span>
                {userReservationsCount > 0 && (
                  <span className="text-[10px] bg-[#4F6F52] text-white px-2 py-0.5 rounded-full font-bold">
                    {userReservationsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  onOpenSmartArrival();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-widest rounded-xl text-[#4F6F52] flex items-center justify-between"
              >
                <span>Smart Arrival Geofencing</span>
                <span className="text-[10px] bg-[#4F6F521A] px-2 py-0.5 rounded-full font-bold">Simulate</span>
              </button>
              
              {/* Concierge Chat (Landscape Support) */}
              {onOpenChat && (
                <button
                  onClick={() => {
                    onOpenChat();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-widest rounded-xl text-[#2C3333] hover:text-[#4F6F52] bg-white border border-[#E8E6E1] flex items-center justify-between"
                  id="mobile-nav-concierge-btn"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#4F6F52]" />
                    <span>Dining Concierge Chat</span>
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Live
                  </span>
                </button>
              )}

              {/* Dedicated Admin Console Option in Mobile */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onOpenAdminConsole) {
                    onOpenAdminConsole();
                  } else {
                    setActiveTab('company-admin');
                  }
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-widest rounded-xl text-emerald-950 bg-emerald-50 border border-emerald-200 flex items-center gap-2"
                id="mobile-nav-admin-console-btn"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Admin Console</span>
              </button>

              {/* Mobile Auth Actions */}
              <div className="pt-2 border-t border-[#E8E6E1] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onNavigateAuth('login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-xl text-[#2C3333] bg-white border border-[#E8E6E1]"
                    id="mobile-nav-login-btn"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      onNavigateAuth('signup');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-[#4F6F52]"
                    id="mobile-nav-signup-btn"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
