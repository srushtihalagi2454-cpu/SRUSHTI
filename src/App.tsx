import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LandingFirstPage } from './components/LandingFirstPage';
import { LandingHero } from './components/LandingHero';
import { RestaurantDiscovery } from './components/RestaurantDiscovery';
import { HowItWorksView } from './components/HowItWorksView';
import { BookingModal } from './components/BookingModal';
import { NotifyMeModal } from './components/NotifyMeModal';
import { SmartArrivalModal } from './components/SmartArrivalModal';
import { MyReservationsModal } from './components/MyReservationsModal';
import { MyReservationsView } from './components/MyReservationsView';
import { RestaurantDashboard } from './components/RestaurantDashboard';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { CustomerHomePage } from './components/CustomerHomePage';
import { CompanyAdminDashboard } from './components/CompanyAdminDashboard';
import { SupportChatLandscape } from './components/SupportChatLandscape';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';
import { TravelDiningDiscovery } from './components/TravelDiningDiscovery';
import { TravelBookingModal } from './components/TravelBookingModal';
import { TravelRoute, BusStop } from './data/travelRoutesData';
import { RESTAURANTS_DATA, INITIAL_RESERVATIONS, isReservationForCustomer } from './data/mockData';
import { Restaurant, Reservation, Table, NotifyRequest, TableState, SmartArrivalState, SmartArrivalDistanceOption, UserRole, CancellationRecord, TravelFulfillmentType, RestaurantFloor } from './types';
import { 
  createInitialSmartArrivalState, 
  getRestaurantCoordinates,
  calculateHaversineDistance,
  evaluateGeofenceStatus,
  formatDistance,
  calculateEstimatedEta
} from './utils/smartArrival';
import { useCustomerGeolocation } from './hooks/useCustomerGeolocation';
import { getStoredSession, clearStoredSession } from './services/authService';
import { updateSmartArrivalOnBackend } from './services/smartArrivalService';
import { getCustomerReservationsFromBackend, cancelReservationOnBackend } from './services/reservationService';
import { cleanDateString, cleanTimeString } from './utils/dateTime';
import { parseStoredReservationTime } from './utils/timeRangeUtils';
import { CheckCircle2, Sparkles, X, Bus, ShieldAlert, ShieldCheck, KeyRound, AlertTriangle, ArrowRight, MessageSquare } from 'lucide-react';

export default function App() {
  // Check for existing authenticated session from Google Apps Script
  const initialSession = getStoredSession();

  // Navigation tabs: 'customer' (Landing & Discovery), 'customer-home' (Logged-in Customer Home), 'my-reservations' (Dedicated Customer Reservations), 'restaurant' (Partner Dashboard), 'how-it-works', 'travel-dining', 'login', 'signup', 'company-admin'
  const [activeTab, setActiveTab] = useState<'customer' | 'customer-home' | 'my-reservations' | 'restaurant' | 'how-it-works' | 'travel-dining' | 'login' | 'signup' | 'company-admin'>(() => {
    if (initialSession) {
      if (initialSession.role === 'company-admin') return 'company-admin';
      return initialSession.role === 'restaurant-owner' ? 'restaurant' : 'customer-home';
    }
    return 'customer';
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!initialSession);
  const [userRole, setUserRole] = useState<UserRole>(() => initialSession?.role || 'customer');

  const handleSetUserRole = (newRole: UserRole) => {
    setUserRole(newRole);
    try {
      localStorage.setItem('flashtable_user_role', newRole);
      sessionStorage.setItem('flashtable_user_role', newRole);
    } catch {
      // ignore
    }
  };

  const [currentUser, setCurrentUser] = useState<{
    userId?: string;
    fullName: string;
    email: string;
    phone: string;
  }>(() => {
    if (initialSession) {
      return {
        userId: initialSession.userId,
        fullName: initialSession.fullName,
        email: initialSession.email,
        phone: initialSession.phone,
      };
    }
    return {
      fullName: '',
      email: '',
      phone: '',
    };
  });

  // Dedicated Admin Console access state
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);

  // Landscape Concierge & Support Chat state
  const [isConciergeChatOpen, setIsConciergeChatOpen] = useState<boolean>(false);

  const handleOpenAdminConsole = () => {
    if (userRole === 'company-admin') {
      setActiveTab('company-admin');
    } else {
      setIsAdminLoginModalOpen(true);
    }
  };

  const handleAdminLoginSuccess = (adminSummary: any) => {
    setIsAdminLoginModalOpen(false);
    handleSetUserRole('company-admin');
    setIsLoggedIn(true);
    setCurrentUser({
      userId: adminSummary.userId || 'USR-ADMIN-1',
      fullName: adminSummary.fullName || 'FlashTable Administrator',
      email: adminSummary.email || 'admin@flashtable.com',
      phone: adminSummary.phone || '+91 98450 00001',
    });
    setActiveTab('company-admin');
    showToast('Authenticated as Administrator. Welcome to the Dedicated Admin Console.');
  };

  // Smart Arrival Geofence State (Indiranagar / The Ember Room demo)
  const [smartArrivalState, setSmartArrivalState] = useState<SmartArrivalState>(createInitialSmartArrivalState);

  // Customer Discovery / Booking Search State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('08:00 PM');
  const [selectedTimeIn, setSelectedTimeIn] = useState<string>('7:30 PM');
  const [selectedTimeOut, setSelectedTimeOut] = useState<string>('9:15 PM');
  const [bookingParams, setBookingParams] = useState<{ date?: string; timeIn?: string; timeOut?: string; guests?: number } | null>(null);
  const [guestCount, setGuestCount] = useState<number>(4);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('All Bengaluru');

  // Data State
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const saved = localStorage.getItem('flashtable_restaurants_overrides');
      if (saved) {
        const overrides: any[] = JSON.parse(saved);
        if (Array.isArray(overrides)) {
          return RESTAURANTS_DATA.map((r) => {
            const match = overrides.find((o) => o.id === r.id);
            if (match) {
              return {
                ...r,
                name: match.name || r.name,
                ownerName: match.ownerName || r.ownerName,
                address: match.address || r.address,
                customerCareNumber: match.customerCareNumber || r.customerCareNumber,
                contactNumber: match.customerCareNumber || r.contactNumber,
              };
            }
            return r;
          });
        }
      }
    } catch {}
    return RESTAURANTS_DATA;
  });
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [activeDashboardRestaurant, setActiveDashboardRestaurant] = useState<Restaurant>(() => {
    if (initialSession && initialSession.role === 'restaurant-owner' && initialSession.restaurantId) {
      const found = RESTAURANTS_DATA.find((r) => r.id.toLowerCase() === initialSession.restaurantId?.toLowerCase());
      if (found) return found;
    }
    return RESTAURANTS_DATA[0];
  });

  const handleUpdateRestaurantTables = (restaurantId: string, updatedTables: Table[]) => {
    setRestaurants((prev) =>
      prev.map((r) => (r.id === restaurantId ? { ...r, tables: updatedTables } : r))
    );
    setActiveDashboardRestaurant((prev) =>
      prev.id === restaurantId ? { ...prev, tables: updatedTables } : prev
    );
    setBookingRestaurant((prev) =>
      prev && prev.id === restaurantId ? { ...prev, tables: updatedTables } : prev
    );
  };

  const handleUpdateRestaurantFloors = (restaurantId: string, updatedFloors: RestaurantFloor[]) => {
    setRestaurants((prev) =>
      prev.map((r) => (r.id === restaurantId ? { ...r, floors: updatedFloors } : r))
    );
    setActiveDashboardRestaurant((prev) =>
      prev.id === restaurantId ? { ...prev, floors: updatedFloors } : prev
    );
    setBookingRestaurant((prev) =>
      prev && prev.id === restaurantId ? { ...prev, floors: updatedFloors } : prev
    );
  };

  const handleUpdateRestaurantDetails = (
    restaurantId: string,
    details: { name: string; ownerName: string; address: string; customerCareNumber: string }
  ) => {
    setRestaurants((prev) => {
      const updated = prev.map((r) =>
        r.id === restaurantId
          ? {
              ...r,
              name: details.name,
              ownerName: details.ownerName,
              address: details.address,
              customerCareNumber: details.customerCareNumber,
              contactNumber: details.customerCareNumber,
            }
          : r
      );
      try {
        localStorage.setItem(
          'flashtable_restaurants_overrides',
          JSON.stringify(
            updated.map((r) => ({
              id: r.id,
              name: r.name,
              ownerName: r.ownerName,
              address: r.address,
              customerCareNumber: r.customerCareNumber,
              contactNumber: r.contactNumber,
            }))
          )
        );
      } catch {}
      return updated;
    });

    setActiveDashboardRestaurant((prev) =>
      prev.id === restaurantId
        ? {
            ...prev,
            name: details.name,
            ownerName: details.ownerName,
            address: details.address,
            customerCareNumber: details.customerCareNumber,
            contactNumber: details.customerCareNumber,
          }
        : prev
    );
    setBookingRestaurant((prev) =>
      prev && prev.id === restaurantId
        ? {
            ...prev,
            name: details.name,
            ownerName: details.ownerName,
            address: details.address,
            customerCareNumber: details.customerCareNumber,
            contactNumber: details.customerCareNumber,
          }
        : prev
    );
  };

  // Reservations strictly belonging to currently authenticated customer's unique userId
  const customerReservations = useMemo(() => {
    if (!isLoggedIn || userRole !== 'customer' || !currentUser?.userId) {
      return [];
    }
    const filtered = reservations.filter((r) => isReservationForCustomer(r, currentUser.userId));
    const seen = new Set<string>();
    return filtered.filter((r) => {
      if (!r || !r.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [reservations, isLoggedIn, userRole, currentUser?.userId]);

  const [isReservationsLoading, setIsReservationsLoading] = useState<boolean>(false);
  const isLoadingReservationsRef = useRef<boolean>(false);

  // Synchronize authenticated customer's real reservations from Google Sheets backend
  const loadCustomerReservations = useCallback(async (overrideUserId?: string) => {
    const activeUserId = (overrideUserId || currentUser?.userId || getStoredSession()?.userId || '').trim();
    const effectiveRole = userRole || getStoredSession()?.role || 'customer';
    if (!activeUserId || effectiveRole !== 'customer') {
      return;
    }

    if (isLoadingReservationsRef.current) {
      return;
    }

    isLoadingReservationsRef.current = true;
    setIsReservationsLoading(true);

    try {
      const result = await getCustomerReservationsFromBackend(activeUserId);
      if (result.success && Array.isArray(result.reservations)) {
        const mapped: Reservation[] = result.reservations.map((item) => {
          const rest = RESTAURANTS_DATA.find((r) => r.id === item.restaurantId) || RESTAURANTS_DATA[0];
          const table = rest.tables.find(
            (t) => t.id === item.tableId || t.tableNumber.toLowerCase() === (item.tableId || '').toLowerCase() || (item.tableId || '').toLowerCase().includes(t.tableNumber.toLowerCase())
          );
          const tableNum = table ? table.tableNumber : (item.tableId ? item.tableId.toUpperCase().replace('TBL-REST-1-', 'T').replace('T-', 'T') : 'T01');
          const section = table ? table.section : 'Main Dining';
          const deposit = Number(item.depositAmount) || 0;
          const refSuffix = (item.reservationId || '').replace(/[^0-9]/g, '').slice(-4) || '1001';

          const timeInfo = parseStoredReservationTime(item.time || '');

          return {
            id: item.reservationId,
            userId: item.userId || activeUserId,
            bookingRef: `FT-BLR-${refSuffix}`,
            restaurantId: item.restaurantId,
            restaurantName: rest.name,
            restaurantAddress: rest.address,
            tableId: item.tableId,
            tableNumber: tableNum,
            section,
            date: cleanDateString(item.date),
            timeSlot: timeInfo.timeIn && timeInfo.timeOut ? `${timeInfo.timeIn} → ${timeInfo.timeOut}` : cleanTimeString(item.time),
            timeIn: timeInfo.timeIn,
            timeOut: timeInfo.timeOut,
            durationFormatted: timeInfo.durationFormatted,
            durationMinutes: timeInfo.durationMinutes,
            guests: Number(item.guests) || 2,
            customerName: item.customerName || currentUser.fullName || 'Customer',
            customerPhone: item.customerPhone || currentUser.phone || '',
            customerEmail: item.customerEmail || currentUser.email || '',
            specialRequests: item.preferences || '',
            status: (item.status as any) || 'confirmed',
            createdAt: item.createdAt || new Date().toISOString(),
            qrCodeData: `FT-${item.restaurantId.toUpperCase()}-${tableNum}-${item.reservationId}`,
            depositAmount: deposit || 200,
            paymentStatus: 'paid',
            paymentMethod: (item as any).paymentMethod || (deposit > 0 ? 'UPI (Confirmed)' : 'UPI (₹200 Deposit Paid)'),
            paymentTransactionId: deposit > 0 ? `FT-TXN-${item.reservationId}` : `FT-TXN-${item.reservationId.slice(-6)}`,
          };
        });

        setReservations((prev) => {
          const mappedIds = new Set(mapped.map((m) => m.id.toLowerCase()));
          const uncommittedCurrent = prev.filter((r) => isReservationForCustomer(r, activeUserId) && !mappedIds.has(r.id.toLowerCase()));
          const others = prev.filter((r) => !isReservationForCustomer(r, activeUserId));
          return [...mapped, ...uncommittedCurrent, ...others];
        });
      }
    } catch (err) {
      console.warn('Error loading customer reservations from backend:', err);
    } finally {
      isLoadingReservationsRef.current = false;
      setIsReservationsLoading(false);
    }
  }, [currentUser?.userId, currentUser.fullName, currentUser.phone, currentUser.email, userRole]);

  useEffect(() => {
    loadCustomerReservations();
  }, [loadCustomerReservations, activeTab]);

  // Modal Visibility States
  const [bookingRestaurant, setBookingRestaurant] = useState<Restaurant | null>(null);
  const [travelBookingRestaurant, setTravelBookingRestaurant] = useState<Restaurant | null>(null);
  const [travelBookingRoute, setTravelBookingRoute] = useState<TravelRoute | undefined>(undefined);
  const [travelBookingStop, setTravelBookingStop] = useState<BusStop | undefined>(undefined);
  const [travelBookingFulfillment, setTravelBookingFulfillment] = useState<TravelFulfillmentType | undefined>('dine_in');
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState<boolean>(false);
  const [isSmartArrivalOpen, setIsSmartArrivalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [selectedSmartArrivalReservation, setSelectedSmartArrivalReservation] = useState<Reservation | null>(null);

  // Automatically bind selected Smart Arrival reservation to the customer's actual reservation if available
  useEffect(() => {
    if (customerReservations.length > 0) {
      if (!selectedSmartArrivalReservation || !customerReservations.some((r) => r.id === selectedSmartArrivalReservation.id)) {
        const primary = customerReservations[0];
        setSelectedSmartArrivalReservation(primary);
        const restCoords = getRestaurantCoordinates(primary.restaurantId, primary.restaurantName);
        const activeUserId = currentUser?.userId || primary.userId || getStoredSession()?.userId || '';
        setSmartArrivalState((prev) => ({
          ...prev,
          reservationId: primary.id,
          restaurantId: primary.restaurantId,
          userId: activeUserId,
          customerName: primary.customerName || prev.customerName,
          customerPhone: primary.customerPhone || prev.customerPhone,
          restaurantName: primary.restaurantName || prev.restaurantName,
          restaurantLocation: primary.restaurantAddress || prev.restaurantLocation,
          restaurantLat: restCoords.lat,
          restaurantLng: restCoords.lng,
          tableNumber: primary.tableNumber || prev.tableNumber,
          timeSlot: primary.timeSlot || prev.timeSlot,
          guests: primary.guests || prev.guests,
        }));
      }
    }
  }, [customerReservations, currentUser?.userId]);

  // Notify Me request data
  const [notifyModalData, setNotifyModalData] = useState<{
    restaurant: Restaurant;
    date: string;
    timeSlot: string;
    guests: number;
    preference: string;
  } | null>(null);

  // Handle complete session sign out
  const handleSignOut = () => {
    clearStoredSession();
    setIsLoggedIn(false);
    setUserRole('customer');
    setCurrentUser({
      fullName: '',
      email: '',
      phone: '',
    });
    setReservations([]);
    setActiveTab('customer');
    showToast('Signed out from FlashTable.');
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Real Customer Geolocation Hook (Free native browser API - navigator.geolocation.watchPosition)
  const {
    isTracking: isGpsTracking,
    coordinates: customerGpsCoords,
    error: gpsError,
    status: gpsStatus,
    startTracking: startGpsTracking,
    stopTracking: stopGpsTracking,
    clearError: clearGpsError,
  } = useCustomerGeolocation();

  // Refs to manage backend sync rate limiting, deduplication, and lifecycle cleanup
  const lastSmartArrivalSyncRef = useRef<{
    latitude: number;
    longitude: number;
    distance: number;
    etaMinutes: number;
    geofenceStatus: string;
    timestamp: number;
  } | null>(null);
  const isSyncInProgressRef = useRef<boolean>(false);
  const pendingSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep SmartArrivalState synchronized with live customer GPS coordinates and destination restaurant,
  // and dispatch updates to the deployed updateSmartArrival Apps Script backend when active.
  React.useEffect(() => {
    if (customerGpsCoords) {
      // Look up target restaurant coordinates
      const restCoords = getRestaurantCoordinates(
        smartArrivalState.restaurantId,
        smartArrivalState.restaurantName
      );

      // Calculate real geodesic distance using Haversine formula
      const distMeters = calculateHaversineDistance(
        customerGpsCoords.latitude,
        customerGpsCoords.longitude,
        restCoords.lat,
        restCoords.lng
      );

      // Evaluate real 500m geofence status
      const geofence = evaluateGeofenceStatus(distMeters);
      const distText = formatDistance(distMeters);
      const eta = calculateEstimatedEta(distMeters);

      setSmartArrivalState((prev) => ({
        ...prev,
        isEnabled: true,
        isGpsActive: true,
        restaurantLat: restCoords.lat,
        restaurantLng: restCoords.lng,
        customerLat: customerGpsCoords.latitude,
        customerLng: customerGpsCoords.longitude,
        customerAccuracy: customerGpsCoords.accuracy,
        distanceMeters: distMeters,
        distanceText: distText,
        etaMinutes: eta?.etaMinutes ?? null,
        etaText: eta?.fullEtaText,
        isInsideGeofence: geofence.isInsideGeofence,
        customerStatus: geofence.customerStatus,
        restaurantStatus: geofence.restaurantStatus,
        gpsStatus: 'active',
        gpsError: null,
      }));

      // STEP 4B-2: Dispatch real customer GPS, distance, ETA, and geofence status to deployed updateSmartArrival backend
      const targetRes = selectedSmartArrivalReservation || customerReservations.find((r) => r.id === smartArrivalState.reservationId) || reservations.find((r) => r.id === smartArrivalState.reservationId) || customerReservations[0];
      const reservationId = (smartArrivalState.reservationId || targetRes?.id || '').trim();
      const restaurantId = (smartArrivalState.restaurantId || targetRes?.restaurantId || '').trim();
      const userId = (currentUser?.userId || smartArrivalState.userId || targetRes?.userId || getStoredSession()?.userId || '').trim();

      // Guard: Do NOT send stale demo IDs (RES-1788787060247 or res-ember-07) or empty reservationId
      if (!reservationId || reservationId === 'RES-1788787060247' || reservationId === 'res-ember-07') {
        return;
      }

      // Only send when Smart Arrival is active AND customer explicitly pressed START SMART ARRIVAL AND real GPS is available
      if (reservationId && restaurantId && userId && isGpsTracking && smartArrivalState.isEnabled) {
        const roundedDist = Math.round(distMeters);
        const etaMinutes = eta?.etaMinutes ?? 0;
        const geofenceStatus = geofence.isInsideGeofence ? 'Within 500 m' : 'Outside 500 m';
        const currentLat = customerGpsCoords.latitude;
        const currentLng = customerGpsCoords.longitude;

        const last = lastSmartArrivalSyncRef.current;
        const now = Date.now();

        // 1. Avoid excessive duplicate requests if watchPosition produces repeated identical coordinates
        let isDuplicate = false;
        if (last) {
          const isSameCoord = Math.abs(currentLat - last.latitude) < 0.00001 && Math.abs(currentLng - last.longitude) < 0.00001;
          const isSameDist = Math.abs(roundedDist - last.distance) < 2;
          const isSameEta = etaMinutes === last.etaMinutes;
          const isSameGeofence = geofenceStatus === last.geofenceStatus;

          // Skip duplicate coordinate update if sent in the last 20 seconds
          if (isSameCoord && isSameDist && isSameEta && isSameGeofence && (now - last.timestamp < 20000)) {
            isDuplicate = true;
          }
        }

        if (!isDuplicate) {
          // 2. Throttle to at most once every 3 seconds to protect Apps Script quotas
          const MIN_INTERVAL_MS = 3000;
          const timeSinceLast = last ? now - last.timestamp : Infinity;

          const executeBackendSync = async () => {
            if (isSyncInProgressRef.current) return;
            isSyncInProgressRef.current = true;

            setSmartArrivalState((prev) => ({
              ...prev,
              backendSyncStatus: 'syncing',
            }));

            try {
              const res = await updateSmartArrivalOnBackend({
                reservationId,
                userId,
                restaurantId,
                locationEnabled: true,
                latitude: currentLat,
                longitude: currentLng,
                distance: roundedDist,
                etaMinutes,
                geofenceStatus,
              });

              if (res.success) {
                lastSmartArrivalSyncRef.current = {
                  latitude: currentLat,
                  longitude: currentLng,
                  distance: roundedDist,
                  etaMinutes,
                  geofenceStatus,
                  timestamp: Date.now(),
                };
                setSmartArrivalState((prev) => ({
                  ...prev,
                  backendSyncStatus: 'synced',
                  backendSyncError: null,
                  lastSyncedAt: res.updatedAt || new Date().toISOString(),
                }));
              } else {
                // If a backend update fails, do not stop the user's GPS tracking or overwrite valid GPS data!
                setSmartArrivalState((prev) => ({
                  ...prev,
                  backendSyncStatus: 'error',
                  backendSyncError: res.message || 'Failed to sync location to restaurant',
                }));
              }
            } catch (syncErr: any) {
              setSmartArrivalState((prev) => ({
                ...prev,
                backendSyncStatus: 'error',
                backendSyncError: syncErr?.message || 'Network sync error',
              }));
            } finally {
              isSyncInProgressRef.current = false;
            }
          };

          if (timeSinceLast >= MIN_INTERVAL_MS) {
            if (pendingSyncTimeoutRef.current) {
              clearTimeout(pendingSyncTimeoutRef.current);
              pendingSyncTimeoutRef.current = null;
            }
            executeBackendSync();
          } else {
            if (pendingSyncTimeoutRef.current) {
              clearTimeout(pendingSyncTimeoutRef.current);
            }
            pendingSyncTimeoutRef.current = setTimeout(() => {
              executeBackendSync();
            }, MIN_INTERVAL_MS - timeSinceLast);
          }
        }
      }
    } else if (!isGpsTracking) {
      setSmartArrivalState((prev) => ({
        ...prev,
        isGpsActive: false,
        customerLat: null,
        customerLng: null,
        customerAccuracy: null,
        distanceMeters: null,
        distanceText: undefined,
        etaMinutes: null,
        etaText: undefined,
        isInsideGeofence: false,
        customerStatus: 'Idle',
        gpsStatus: gpsStatus,
        gpsError: gpsError,
        backendSyncStatus: 'idle',
        backendSyncError: null,
      }));
    } else if (gpsError) {
      setSmartArrivalState((prev) => ({
        ...prev,
        gpsError: gpsError,
        gpsStatus: 'error',
      }));
    }
  }, [
    customerGpsCoords, 
    isGpsTracking, 
    gpsStatus, 
    gpsError, 
    smartArrivalState.isEnabled,
    smartArrivalState.reservationId, 
    smartArrivalState.restaurantId, 
    smartArrivalState.restaurantName,
    smartArrivalState.userId,
    currentUser?.userId
  ]);

  const handleOpenSmartArrival = (res?: Reservation) => {
    const target = res || selectedSmartArrivalReservation || customerReservations[0] || reservations.find((r) => r.id === smartArrivalState.reservationId);
    if (target) {
      setSelectedSmartArrivalReservation(target);
      const restCoords = getRestaurantCoordinates(target.restaurantId, target.restaurantName);
      const activeUserId = currentUser?.userId || target.userId || getStoredSession()?.userId || '';

      setSmartArrivalState((prev) => ({
        ...prev,
        reservationId: target.id,
        restaurantId: target.restaurantId,
        userId: activeUserId,
        customerName: target.customerName || prev.customerName,
        customerPhone: target.customerPhone || prev.customerPhone,
        restaurantName: target.restaurantName || prev.restaurantName,
        restaurantLocation: target.restaurantAddress || prev.restaurantLocation,
        restaurantLat: restCoords.lat,
        restaurantLng: restCoords.lng,
        tableNumber: target.tableNumber || prev.tableNumber,
        timeSlot: target.timeSlot || prev.timeSlot,
        guests: target.guests || prev.guests,
      }));
    }
    setIsSmartArrivalOpen(true);
  };

  const handleStartSmartArrival = (res?: Reservation) => {
    // 1. Explicit user gesture starts real browser geolocation
    startGpsTracking();

    // Trace directly back to selected reservation object: explicitly passed res > selected reservation > customer's active reservation
    const targetRes = res || selectedSmartArrivalReservation || customerReservations.find((r) => r.id === smartArrivalState.reservationId) || customerReservations[0] || reservations.find((r) => r.id === smartArrivalState.reservationId) || reservations[0];

    if (targetRes) {
      setSelectedSmartArrivalReservation(targetRes);
    }

    const restCoords = targetRes
      ? getRestaurantCoordinates(targetRes.restaurantId, targetRes.restaurantName)
      : getRestaurantCoordinates(smartArrivalState.restaurantId, smartArrivalState.restaurantName);

    const activeUserId = currentUser?.userId || targetRes?.userId || getStoredSession()?.userId || smartArrivalState.userId || '';

    // Requirement 12: Temporary console logging ONLY for verification
    console.log('[Smart Arrival START] Active reservation bound:', {
      'selected reservationId': targetRes?.id,
      'userId': activeUserId,
      'restaurantId': targetRes?.restaurantId,
      'the reservation used when START SMART ARRIVAL is pressed': targetRes,
    });

    // 2. Update state for the reservation
    setSmartArrivalState((prev) => ({
      ...prev,
      isEnabled: true,
      reservationId: targetRes?.id || prev.reservationId,
      restaurantId: targetRes?.restaurantId || prev.restaurantId,
      userId: activeUserId || prev.userId,
      customerName: targetRes?.customerName || prev.customerName,
      customerPhone: targetRes?.customerPhone || prev.customerPhone,
      restaurantName: targetRes?.restaurantName || prev.restaurantName,
      restaurantLocation: targetRes?.restaurantAddress || prev.restaurantLocation,
      restaurantLat: restCoords.lat,
      restaurantLng: restCoords.lng,
      tableNumber: targetRes?.tableNumber || prev.tableNumber,
      timeSlot: targetRes?.timeSlot || prev.timeSlot,
      guests: targetRes?.guests || prev.guests,
      gpsStatus: 'requesting',
      gpsError: null,
      backendSyncStatus: 'idle',
      backendSyncError: null,
      lastSyncedAt: null,
    }));
    showToast(`Starting Smart Arrival for ${targetRes?.restaurantName || 'your restaurant'}. Requesting browser location...`);
  };

  const handleStopSmartArrival = () => {
    if (pendingSyncTimeoutRef.current) {
      clearTimeout(pendingSyncTimeoutRef.current);
      pendingSyncTimeoutRef.current = null;
    }
    lastSmartArrivalSyncRef.current = null;
    isSyncInProgressRef.current = false;
    stopGpsTracking();

    setSmartArrivalState((prev) => ({
      ...prev,
      isEnabled: false,
      isGpsActive: false,
      customerLat: null,
      customerLng: null,
      customerAccuracy: null,
      distanceMeters: null,
      distanceText: undefined,
      etaMinutes: null,
      etaText: undefined,
      isInsideGeofence: false,
      customerStatus: 'Idle',
      gpsStatus: 'idle',
      backendSyncStatus: 'idle',
      backendSyncError: null,
    }));
    showToast('Smart Arrival stopped. Location tracking disabled.');
  };

  // Smart Arrival Handlers (Toggle location sharing)
  const handleToggleSmartArrival = (enabled: boolean) => {
    if (enabled) {
      handleStartSmartArrival();
    } else {
      handleStopSmartArrival();
    }
  };

  // Add or update confirmed booking (prevents duplicate items with identical ID)
  const handleCompleteBooking = (newRes: Reservation) => {
    const activeUserId = currentUser?.userId || getStoredSession()?.userId || newRes.userId;
    const bookingWithUser: Reservation = {
      ...newRes,
      userId: activeUserId,
    };
    setReservations((prev) => {
      const existsIndex = prev.findIndex((r) => r.id === bookingWithUser.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = { ...updated[existsIndex], ...bookingWithUser };
        return updated;
      }
      return [bookingWithUser, ...prev];
    });
    window.dispatchEvent(new CustomEvent('flashtable:reservation-created', { detail: bookingWithUser }));
    if (newRes.travelDetails?.fulfillmentType === 'parcel') {
      showToast(`Travel parcel order confirmed for collection at ${newRes.travelDetails?.expectedArrivalTime || newRes.timeIn} (${newRes.restaurantName})!`);
    } else if (newRes.travelDetails) {
      showToast(`Travel booking confirmed for Table ${newRes.tableNumber} at ${newRes.restaurantName}! Expected arrival: ${newRes.travelDetails.expectedArrivalTime}`);
    } else {
      showToast(`Table ${newRes.tableNumber} confirmed at ${newRes.restaurantName}! ₹200 table booking deposit paid.`);
    }
    setTimeout(() => {
      loadCustomerReservations();
    }, 600);
  };

  // Cancel reservation persistently with cancellation count and ₹100 penalty tracking
  const handleCancelReservation = async (resId: string, penaltyRecord?: CancellationRecord) => {
    const isFirstTime = penaltyRecord ? penaltyRecord.cancellationCount === 1 : false;
    const penaltyFee = penaltyRecord?.penaltyAmount ?? penaltyRecord?.cancellationPenalty ?? (isFirstTime ? 0 : 100);

    // 1. Immediately update local state to 'cancelled' with full audit record
    setReservations((prev) =>
      prev.map((r) => {
        if (r.id === resId) {
          const updated: Reservation = {
            ...r,
            status: 'cancelled',
            cancellationStatus: 'cancelled',
            cancellationDate: penaltyRecord?.cancellationDate || new Date().toISOString(),
            cancellationCount: penaltyRecord?.cancellationCount || (isFirstTime ? 1 : 2),
            penaltyAmount: penaltyFee,
            cancellationPenalty: penaltyFee,
            penaltyApplicability: penaltyRecord?.penaltyApplicability || (isFirstTime ? 'none_first_cancellation' : 'applicable'),
            paymentStatus: penaltyRecord?.paymentStatus || (penaltyFee === 0 ? 'waived' : 'paid'),
            penaltyStatus: penaltyRecord?.penaltyStatus || (penaltyFee === 0 ? 'waived' : 'paid'),
            cancellationPaymentMethod: penaltyRecord?.paymentMethod,
            cancellationTransactionId: penaltyRecord?.transactionId,
            cancellationRecord: penaltyRecord,
          };
          return updated;
        }
        return r;
      })
    );

    if (isFirstTime || penaltyFee === 0) {
      showToast('Reservation cancelled. 1st cancellation fee waived (₹0). Notice: Future cancellations incur a ₹100 penalty.');
    } else {
      showToast(`Reservation cancelled. ₹${penaltyFee} cancellation penalty settled and table freed on live floor plan.`);
    }

    // 2. Persist cancellation to Google Sheets backend
    const activeUserId = currentUser?.userId || getStoredSession()?.userId;
    if (activeUserId) {
      try {
        await cancelReservationOnBackend(resId, activeUserId, {
          cancellationCount: penaltyRecord?.cancellationCount || (isFirstTime ? 1 : 2),
          cancellationPenalty: penaltyFee,
          penaltyAmount: penaltyFee,
          penaltyApplicability: penaltyRecord?.penaltyApplicability || (isFirstTime ? 'none_first_cancellation' : 'applicable'),
          paymentStatus: penaltyRecord?.paymentStatus || (penaltyFee === 0 ? 'waived' : 'paid'),
          penaltyStatus: penaltyRecord?.penaltyStatus || (penaltyFee === 0 ? 'waived' : 'paid'),
          paymentMethod: penaltyRecord?.paymentMethod,
          transactionId: penaltyRecord?.transactionId,
          cancellationDate: penaltyRecord?.cancellationDate,
        });
      } catch (err) {
        console.warn('Failed to persist cancellation to backend:', err);
      }
    }
  };

  // Simulate staff host check-in
  const handleSimulateCheckIn = (resId: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: 'seated' } : r))
    );
    showToast('Host check-in verified! Customer seated at exact reserved table.');
  };

  // Update reservation status from dashboard
  const handleUpdateReservationStatus = (resId: string, status: Reservation['status']) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status } : r))
    );
    showToast(`Reservation status updated to '${status}'.`);
  };

  // Staff sends digital bill to customer's registered mobile
  const handleSendBillToCustomer = (resId: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, billSent: true } : r))
    );
    const targetRes = reservations.find((r) => r.id === resId);
    const name = targetRes ? targetRes.customerName : 'customer';
    showToast(`Digital bill sent to ${name}'s registered mobile number.`);
  };

  // Update dining clock session for a reservation
  const handleUpdateDiningClockSession = useCallback((reservationId: string, session: any) => {
    setReservations((prev) =>
      prev.map((r) => {
        if (r.id === reservationId) {
          return {
            ...r,
            diningClockSession: session || undefined,
            clockInTime: session?.clockInDisplayTime,
            clockOutTime: session?.clockOutDisplayTime,
            diningDurationFormatted: session?.durationFormatted,
            diningDurationMinutes: session?.durationMinutes,
          };
        }
        return r;
      })
    );
  }, []);

  // Synchronize reservations fetched from Google Sheets backend into global state with guaranteed unique IDs
  const handleSyncReservations = (backendReservations: Reservation[]) => {
    setReservations((prev) => {
      const map = new Map<string, Reservation>();
      for (const item of prev) {
        if (item && item.id) {
          map.set(item.id, item);
        }
      }
      for (const item of backendReservations) {
        if (!item || !item.id) continue;
        let matchedKey: string | undefined = undefined;
        if (map.has(item.id)) {
          matchedKey = item.id;
        } else {
          const matchEntry = Array.from(map.entries()).find(
            ([_, r]) =>
              r.userId === item.userId &&
              r.restaurantId === item.restaurantId &&
              r.tableId === item.tableId &&
              r.date === item.date &&
              r.timeSlot === item.timeSlot
          );
          if (matchEntry) {
            matchedKey = matchEntry[0];
          }
        }

        if (matchedKey) {
          const existing = map.get(matchedKey)!;
          if (matchedKey !== item.id) {
            map.delete(matchedKey);
          }
          map.set(item.id, {
            ...existing,
            ...item,
            id: item.id,
            status: existing.status !== 'confirmed' ? existing.status : item.status,
            billSent: existing.billSent || item.billSent,
            foodOrder: item.foodOrder || existing.foodOrder,
          });
        } else {
          map.set(item.id, item);
        }
      }

      // Deduplicate final array by id to guarantee zero key collisions
      const seen = new Set<string>();
      const deduped: Reservation[] = [];
      for (const res of map.values()) {
        if (res && res.id && !seen.has(res.id)) {
          seen.add(res.id);
          deduped.push(res);
        }
      }
      return deduped;
    });
  };

  // Notify me submission
  const handleSubmitNotify = (req: NotifyRequest) => {
    showToast(`Alert set for ${req.guests} guests at ${req.restaurantName} on ${req.date}!`);
  };

  const scrollToExplore = () => {
    setActiveTab('customer');
    setTimeout(() => {
      const el = document.getElementById('explore-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#2C3333] selection:bg-[#4F6F52] selection:text-white">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#2C3333] text-white p-4 rounded-2xl shadow-2xl border border-[#4F6F52]/30 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="w-6 h-6 rounded-full bg-[#4F6F52] text-white flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-medium leading-snug flex-1">
            {toastMessage}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dedicated Authentication Page, Logged-in Customer Home, or Standard App Layout */}
      {!isLoggedIn && activeTab === 'customer' ? (
        <LandingFirstPage
          onSignUp={() => setActiveTab('signup')}
          onSignIn={() => setActiveTab('login')}
        />
      ) : activeTab === 'login' || activeTab === 'signup' ? (
        <AuthPage
          initialMode={activeTab}
          onNavigateHome={() => setActiveTab('customer')}
          onModeChange={(newMode) => setActiveTab(newMode)}
          onAuthSuccess={(userSummary, selectedRole) => {
            setIsLoggedIn(true);
            const role = selectedRole || 'customer';
            handleSetUserRole(role);

            if (userSummary?.fullName || userSummary?.email) {
              const formattedPhone = userSummary.phone || userSummary.mobileNumber || '';
              setCurrentUser({
                userId: userSummary.userId,
                fullName: userSummary.fullName || (role === 'restaurant-owner' ? 'Restaurant Partner' : 'Customer'),
                email: userSummary.email || '',
                phone: formattedPhone,
              });
            }

            if (role === 'company-admin') {
              setActiveTab('company-admin');
              showToast('Authenticated as Flash Table Company Administration (Super Admin)');
            } else if (role === 'restaurant-owner') {
              const targetRestId = userSummary?.restaurantId || 'rest-1';
              const targetRest = restaurants.find((r) => r.id.toLowerCase() === targetRestId.toLowerCase()) || restaurants[0];
              setActiveDashboardRestaurant(targetRest);
              setActiveTab('restaurant');
              showToast(`Signed in as Restaurant Owner. Opening ${targetRest.name} console.`);
            } else {
              setActiveTab('customer-home');
              if (userSummary?.userId) {
                loadCustomerReservations(userSummary.userId);
              }
              if (userSummary?.fullName) {
                showToast(`Welcome to FlashTable, ${userSummary.fullName}!`);
              } else if (userSummary?.email) {
                showToast(`Welcome back (${userSummary.email})!`);
              } else {
                showToast('Welcome to FlashTable!');
              }
            }
          }}
        />
      ) : activeTab === 'customer-home' ? (
        <CustomerHomePage
          restaurants={restaurants}
          reservations={customerReservations}
          onSelectRestaurant={(r, params) => {
            if (params) setBookingParams(params);
            setBookingRestaurant(r);
          }}
          onOpenReservations={() => setActiveTab('my-reservations')}
          onOpenSmartArrival={(res) => handleOpenSmartArrival(res)}
          onSignOut={handleSignOut}
          onSwitchToPartner={() => setActiveTab('restaurant')}
          onViewReservationDetail={() => setActiveTab('my-reservations')}
          currentUser={currentUser}
          userRole={userRole}
          initialTimeIn={selectedTimeIn}
          initialTimeOut={selectedTimeOut}
          initialDate={selectedDate}
          onUpdateBookingTimes={(tin, tout) => {
            setSelectedTimeIn(tin);
            setSelectedTimeOut(tout);
          }}
          onNavigateTravelDining={() => setActiveTab('travel-dining')}
          onBookForTravel={(r) => {
            setTravelBookingRestaurant(r);
            setTravelBookingFulfillment('dine_in');
          }}
          onOpenAdminSetup={handleOpenAdminConsole}
          onNavigateCompanyAdmin={handleOpenAdminConsole}
        />
      ) : activeTab === 'my-reservations' ? (
        <MyReservationsView
          restaurants={restaurants}
          reservations={customerReservations}
          currentUser={currentUser}
          userRole={userRole}
          onNavigateHome={() => setActiveTab(isLoggedIn ? 'customer-home' : 'customer')}
          onNavigateDiscover={() => {
            if (isLoggedIn) {
              setActiveTab('customer-home');
            } else {
              setActiveTab('customer');
            }
            setTimeout(() => {
              const el = document.getElementById('recommended-restaurants-section') || document.getElementById('explore-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          onNavigateSmartMatch={() => {
            setActiveTab('customer-home');
            setTimeout(() => {
              const el = document.getElementById('smart-match-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          onSelectRestaurant={(r) => setBookingRestaurant(r)}
          onCancelReservation={handleCancelReservation}
          onSimulateCheckIn={handleSimulateCheckIn}
          onSignOut={handleSignOut}
          onSwitchToPartner={() => setActiveTab('restaurant')}
          onOpenSmartArrival={(res) => handleOpenSmartArrival(res)}
          smartArrivalState={smartArrivalState}
          onToggleSmartArrival={handleToggleSmartArrival}
          isGpsTracking={isGpsTracking}
          customerGpsCoords={customerGpsCoords}
          gpsError={gpsError}
          gpsStatus={gpsStatus}
          onStartSmartArrival={(res) => handleStartSmartArrival(res)}
          onStopSmartArrival={handleStopSmartArrival}
          onClearGpsError={clearGpsError}
          onRefreshReservations={loadCustomerReservations}
          isLoading={isReservationsLoading}
          onUpdateDiningClockSession={handleUpdateDiningClockSession}
        />
      ) : (
        <>
          {/* Main Top Navigation */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenBookings={() => setActiveTab('my-reservations')}
            onOpenSmartArrival={() => handleOpenSmartArrival()}
            onOpenAuth={() => setActiveTab('login')}
            onNavigateAuth={(mode) => setActiveTab(mode)}
            onNavigateCustomerHome={() => setActiveTab('customer-home')}
            onOpenAdminSetup={handleOpenAdminConsole}
            onOpenAdminConsole={handleOpenAdminConsole}
            onOpenChat={() => setIsConciergeChatOpen(true)}
            isLoggedIn={isLoggedIn}
            userRole={userRole}
            activeRestaurant={activeDashboardRestaurant}
            onSignOut={handleSignOut}
            currentUser={currentUser}
            reservations={customerReservations}
            selectedLocation={selectedNeighborhood}
            setSelectedLocation={setSelectedNeighborhood}
          />

          {/* Main Content Area */}
          <main className="flex-1">
            {activeTab === 'customer' && (
              userRole === 'restaurant-owner' ? (
                <RestaurantDashboard
                  restaurants={restaurants}
                  activeRestaurant={activeDashboardRestaurant}
                  setActiveRestaurant={setActiveDashboardRestaurant}
                  reservations={reservations}
                  onUpdateReservationStatus={handleUpdateReservationStatus}
                  onSendBill={handleSendBillToCustomer}
                  onToast={showToast}
                  smartArrivalState={smartArrivalState}
                  onToggleSmartArrival={handleToggleSmartArrival}
                  onSwitchToCustomer={() => setActiveTab('customer-home')}
                  onSignOut={handleSignOut}
                  onSyncReservations={handleSyncReservations}
                  onUpdateRestaurantTables={handleUpdateRestaurantTables}
                  onUpdateRestaurantFloors={handleUpdateRestaurantFloors}
                  onUpdateRestaurantDetails={handleUpdateRestaurantDetails}
                />
              ) : (
                <CustomerHomePage
                  restaurants={restaurants}
                  reservations={customerReservations}
                  onSelectRestaurant={(r, params) => {
                    if (params) setBookingParams(params);
                    setBookingRestaurant(r);
                  }}
                  onOpenReservations={() => setActiveTab('my-reservations')}
                  onOpenSmartArrival={(res) => handleOpenSmartArrival(res)}
                  onSignOut={handleSignOut}
                  onSwitchToPartner={() => setActiveTab('restaurant')}
                  onViewReservationDetail={() => setActiveTab('my-reservations')}
                  currentUser={currentUser}
                  userRole={userRole}
                  initialTimeIn={selectedTimeIn}
                  initialTimeOut={selectedTimeOut}
                  initialDate={selectedDate}
                  onUpdateBookingTimes={(tin, tout) => {
                    setSelectedTimeIn(tin);
                    setSelectedTimeOut(tout);
                  }}
                  onNavigateTravelDining={() => setActiveTab('travel-dining')}
                  onBookForTravel={(r) => {
                    setTravelBookingRestaurant(r);
                    setTravelBookingFulfillment('dine_in');
                  }}
                  onOpenAdminSetup={handleOpenAdminConsole}
                  onNavigateCompanyAdmin={handleOpenAdminConsole}
                />
              ))}

            {activeTab === 'travel-dining' && (
              <TravelDiningDiscovery
                restaurants={restaurants}
                onSelectTravelRestaurant={(r, params) => {
                  setTravelBookingRestaurant(r);
                  setTravelBookingRoute(params?.route);
                  setTravelBookingStop(params?.busStop);
                  setTravelBookingFulfillment(params?.fulfillmentType || 'dine_in');
                }}
                onBackToNormalExplore={() => setActiveTab('customer')}
              />
            )}

            {activeTab === 'how-it-works' && (
              <HowItWorksView
                onClose={() => setActiveTab('customer')}
                onExploreClick={scrollToExplore}
              />
            )}

            {activeTab === 'restaurant' && (
              <RestaurantDashboard
                restaurants={restaurants}
                activeRestaurant={activeDashboardRestaurant}
                setActiveRestaurant={setActiveDashboardRestaurant}
                reservations={reservations}
                onUpdateReservationStatus={handleUpdateReservationStatus}
                onSendBill={handleSendBillToCustomer}
                onToast={showToast}
                smartArrivalState={smartArrivalState}
                onToggleSmartArrival={handleToggleSmartArrival}
                onSwitchToCustomer={() => setActiveTab(isLoggedIn ? 'customer-home' : 'customer')}
                onSignOut={handleSignOut}
                onSyncReservations={handleSyncReservations}
                onUpdateRestaurantTables={handleUpdateRestaurantTables}
                onUpdateRestaurantFloors={handleUpdateRestaurantFloors}
                onUpdateRestaurantDetails={handleUpdateRestaurantDetails}
              />
            )}

            {activeTab === 'company-admin' && (
              <CompanyAdminDashboard
                restaurants={restaurants}
                reservations={reservations}
                onSignOut={handleSignOut}
                onUpdateRestaurants={(updated) => setRestaurants(updated)}
                onUpdateReservations={(updated) => setReservations(updated)}
                onNavigateHome={() => setActiveTab(isLoggedIn ? 'customer-home' : 'customer')}
              />
            )}
          </main>

          {/* Footer */}
          <Footer
            onDiscoverClick={scrollToExplore}
            onHowItWorksClick={() => setActiveTab('how-it-works')}
            onRestaurantClick={() => setActiveTab('how-it-works')}
            onNavigateAuth={(mode) => setActiveTab(mode)}
            userRole={userRole}
            onAdminClick={handleOpenAdminConsole}
          />
        </>
      )}

      {/* Booking Modal with 2D Floor Plan & QR Pass */}
      {bookingRestaurant && (
        <BookingModal
          restaurant={bookingRestaurant}
          onClose={() => {
            setBookingRestaurant(null);
            setBookingParams(null);
          }}
          onCompleteBooking={handleCompleteBooking}
          reservations={reservations}
          currentUser={currentUser}
          initialDate={bookingParams?.date || selectedDate}
          initialTimeIn={bookingParams?.timeIn || selectedTimeIn}
          initialTimeOut={bookingParams?.timeOut || selectedTimeOut}
          onViewMyReservations={() => {
            setBookingRestaurant(null);
            setBookingParams(null);
            setActiveTab('my-reservations');
          }}
          onOpenNotifyMe={(rest, dt, tm, gst, pref) => {
            setNotifyModalData({
              restaurant: rest,
              date: dt,
              timeSlot: tm,
              guests: gst,
              preference: pref,
            });
          }}
          onSwitchToTravelBooking={(rest) => {
            setBookingRestaurant(null);
            setBookingParams(null);
            setTravelBookingRestaurant(rest);
            setTravelBookingFulfillment('dine_in');
          }}
        />
      )}

      {/* Travel Booking Modal (Bus Transit Passenger Flow) */}
      {travelBookingRestaurant && (
        <TravelBookingModal
          restaurant={travelBookingRestaurant}
          isOpen={Boolean(travelBookingRestaurant)}
          onClose={() => {
            setTravelBookingRestaurant(null);
            setTravelBookingRoute(undefined);
            setTravelBookingStop(undefined);
          }}
          onCompleteBooking={(newRes) => {
            handleCompleteBooking(newRes);
            setTravelBookingRestaurant(null);
            setActiveTab('my-reservations');
          }}
          onSwitchToNormalBooking={() => {
            const target = travelBookingRestaurant;
            setTravelBookingRestaurant(null);
            setBookingRestaurant(target);
          }}
          reservations={reservations}
          currentUser={currentUser}
          initialRoute={travelBookingRoute}
          initialBusStop={travelBookingStop}
          initialFulfillment={travelBookingFulfillment || 'dine_in'}
        />
      )}

      {/* Notify Me Modal */}
      {notifyModalData && (
        <NotifyMeModal
          restaurant={notifyModalData.restaurant}
          date={notifyModalData.date}
          timeSlot={notifyModalData.timeSlot}
          guests={notifyModalData.guests}
          preference={notifyModalData.preference}
          onClose={() => setNotifyModalData(null)}
          onSubmitNotify={handleSubmitNotify}
          userId={currentUser?.userId}
        />
      )}

      {/* Smart Arrival Modal */}
      <SmartArrivalModal
        reservations={customerReservations.length > 0 ? customerReservations : reservations}
        reservation={selectedSmartArrivalReservation}
        isOpen={isSmartArrivalOpen}
        onClose={() => setIsSmartArrivalOpen(false)}
        onOpenQrPass={(res) => {
          setIsBookingsModalOpen(true);
        }}
        smartArrivalState={smartArrivalState}
        onToggleSmartArrival={handleToggleSmartArrival}
        isGpsTracking={isGpsTracking}
        customerGpsCoords={customerGpsCoords}
        gpsError={gpsError}
        gpsStatus={gpsStatus}
        onStartSmartArrival={(res) => handleStartSmartArrival(res)}
        onStopSmartArrival={handleStopSmartArrival}
        onClearGpsError={clearGpsError}
      />

      {/* My Reservations Modal */}
      <MyReservationsModal
        reservations={customerReservations}
        isOpen={isBookingsModalOpen}
        onClose={() => setIsBookingsModalOpen(false)}
        onCancelReservation={handleCancelReservation}
        onSimulateCheckIn={handleSimulateCheckIn}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(name, phone) => {
          showToast(`Welcome back, ${name}! Signed in with ${phone}.`);
        }}
      />

      {/* Dedicated Admin Portal Authentication Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Landscape Dining Concierge & Host Chat Modal */}
      <SupportChatLandscape
        isOpen={isConciergeChatOpen}
        onClose={() => setIsConciergeChatOpen(false)}
        restaurants={restaurants}
        reservations={reservations}
        currentUser={currentUser}
        activeRestaurant={activeDashboardRestaurant}
        onSelectRestaurantForBooking={(r) => {
          setBookingRestaurant(r);
          setIsConciergeChatOpen(false);
        }}
      />

      {/* Floating Concierge Chat Pill (Landscape Layout Support) */}
      <button
        onClick={() => setIsConciergeChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#4F6F52] hover:bg-[#3D5A40] text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl flex items-center gap-2.5 transition-all cursor-pointer group hover:scale-105 border border-white/20"
        title="Open Dining Concierge & Host Chat (Landscape Layout)"
        id="btn-floating-concierge-chat"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#4F6F52] animate-pulse"></span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
          Concierge Chat
        </span>
      </button>

    </div>
  );
}
