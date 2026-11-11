import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Store, 
  Users, 
  Calendar, 
  Clock, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  Armchair, 
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  Camera,
  Keyboard,
  MapPin,
  Phone,
  Radio,
  Compass,
  LayoutDashboard,
  BarChart3,
  Settings,
  Info,
  Sliders,
  LogOut,
  Receipt,
  UtensilsCrossed,
  ShoppingBag,
  Utensils,
  AlertCircle,
  User,
  Bus,
  Package,
  Layers,
  Crown,
  X
} from 'lucide-react';
import { 
  Restaurant, 
  Reservation, 
  Table, 
  TableState, 
  SmartArrivalState, 
  SmartArrivalDistanceOption,
  SmartArrivalRecord,
  FoodOrder,
  RestaurantFloor
} from '../types';
import { TIME_SLOTS, parseTimeToMinutes } from '../data/mockData';
import { QrScannerModal } from './QrScannerModal';
import { SmartArrivalMap } from './SmartArrivalMap';
import { LiveTablesTab } from './LiveTablesTab';
import { InsightsTab } from './InsightsTab';
import { DigitalMenuView } from './DigitalMenuView';
import { MenuQrModal } from './MenuQrModal';
import { DiningBillModal } from './DiningBillModal';
import { FoodOrdersTab } from './FoodOrdersTab';
import { MenuManagementTab } from './MenuManagementTab';
import { TravelBookingsTab } from './TravelBookingsTab';
import { RestaurantSubscriptionPlansTab } from './RestaurantSubscriptionPlansTab';
import { SubscriptionExpiryModal } from './SubscriptionExpiryModal';
import { 
  getRestaurantSubscription, 
  shouldShowExpiryNotification, 
  dismissSubscriptionNotification,
  ExpiryTier
} from '../services/subscriptionService';
import { RestaurantSubscriptionStatus } from '../types';
import { AddTableModal } from './AddTableModal';
import { RemoveTableModal } from './RemoveTableModal';
import { ManageFloorsModal } from './ManageFloorsModal';
import { RestaurantSummaryAnalytics } from './RestaurantSummaryAnalytics';
import { getStoredSession, saveStoredSession } from '../services/authService';
import { getDiningClockSession } from '../services/diningTimerService';
import { getRestaurantReservationsFromBackend, updateReservationTimesOnBackend } from '../services/reservationService';
import { getRestaurantSmartArrivalFromBackend } from '../services/smartArrivalService';
import { getRestaurantFoodOrdersFromBackend } from '../services/foodService';
import { getDefaultFloors, ensureRestaurantFloors } from '../utils/floorUtils';
import { formatINR } from '../utils/priceUtils';
import { 
  formatDistance, 
  getKitchenPrepRecommendation, 
  KitchenPrepRecommendation 
} from '../utils/smartArrival';
import { createCheckInOnBackend } from '../services/checkInService';
import { createBillOnBackend } from '../services/billService';
import { generateDiningBill } from '../data/restaurantMenus';
import { 
  hydrateReservationWithSoloSafety, 
  dispatchSoloSafetyNotification 
} from '../services/soloSafetyService';
import { 
  getRestaurantTablesFromBackend, 
  updateTableStatusOnBackend,
  addTableToBackend,
  removeTableFromBackend
} from '../services/tableService';
import { 
  cleanDateString, 
  cleanTimeString, 
  formatTimeIST, 
  formatUpdatedTimeIST,
  formatPacingTableNumber,
  formatPacingReservationDate,
  formatPacingReservationTime
} from '../utils/dateTime';
import { parseStoredReservationTime } from '../utils/timeRangeUtils';

export type DashboardViewOption = 
  | 'summary'
  | 'reservations' 
  | 'travel-bookings'
  | 'food-orders'
  | 'menu-management'
  | 'live-tables' 
  | 'guest-arrival' 
  | 'insights' 
  | 'digital-menu'
  | 'table-management'
  | 'floor-management'
  | 'cancellations'
  | 'owner-console'
  | 'overview' 
  | 'owner-details'
  | 'settings' 
  | 'floor-plan'
  | 'subscription-plans';

interface RestaurantDashboardProps {
  restaurants: Restaurant[];
  activeRestaurant: Restaurant;
  setActiveRestaurant: (r: Restaurant) => void;
  reservations: Reservation[];
  onUpdateReservationStatus: (resId: string, status: Reservation['status']) => void;
  onSendBill?: (resId: string) => void;
  onManualTableStateChange?: (tableId: string, newState: TableState) => void;
  onToast?: (message: string) => void;
  smartArrivalState: SmartArrivalState;
  onSimulateDistance?: (dist: SmartArrivalDistanceOption) => void;
  onToggleSmartArrival?: (enabled: boolean) => void;
  onSwitchToCustomer?: () => void;
  onSignOut?: () => void;
  onSyncReservations?: (backendReservations: Reservation[]) => void;
  onUpdateRestaurantTables?: (restaurantId: string, updatedTables: Table[]) => void;
  onUpdateRestaurantFloors?: (restaurantId: string, updatedFloors: RestaurantFloor[]) => void;
  onUpdateRestaurantDetails?: (restaurantId: string, details: { name: string; ownerName: string; address: string; customerCareNumber: string }) => void;
}

export const RestaurantDashboard: React.FC<RestaurantDashboardProps> = ({
  restaurants,
  activeRestaurant,
  setActiveRestaurant,
  reservations,
  onUpdateReservationStatus,
  onSendBill,
  onToast,
  smartArrivalState,
  onSimulateDistance,
  onToggleSmartArrival,
  onSwitchToCustomer,
  onSignOut,
  onSyncReservations,
  onUpdateRestaurantTables,
  onUpdateRestaurantFloors,
  onUpdateRestaurantDetails,
}) => {
  const [dashboardView, setDashboardView] = useState<DashboardViewOption>('summary');
  const [resFilter, setResFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  
  // Table & Floor Management Modals state
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState<boolean>(false);
  const [isRemoveTableModalOpen, setIsRemoveTableModalOpen] = useState<boolean>(false);
  const [tableToRemove, setTableToRemove] = useState<Table | null>(null);
  const [isManageFloorsModalOpen, setIsManageFloorsModalOpen] = useState<boolean>(false);
  
  // Restaurant Profile & Owner Management state
  const [profileName, setProfileName] = useState(activeRestaurant.name || '');
  const [profileOwnerName, setProfileOwnerName] = useState(activeRestaurant.ownerName || 'Vikramaditya Rathore');
  const [profileAddress, setProfileAddress] = useState(activeRestaurant.address || '');
  const [profileCustomerCare, setProfileCustomerCare] = useState(activeRestaurant.customerCareNumber || activeRestaurant.contactNumber || '+91 98450 12260');
  const [profileNumberOfFloors, setProfileNumberOfFloors] = useState<number>(activeRestaurant.numberOfFloors || activeRestaurant.floors?.length || 2);
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  // Manual Time In & Time Out Editing State (Restaurant Side)
  const [editingTimesReservation, setEditingTimesReservation] = useState<Reservation | null>(null);
  const [restaurantTimeIn, setRestaurantTimeIn] = useState<string>('');
  const [restaurantTimeOut, setRestaurantTimeOut] = useState<string>('');
  const [restaurantTimeReason, setRestaurantTimeReason] = useState<string>('');
  const [isSavingRestaurantTimes, setIsSavingRestaurantTimes] = useState<boolean>(false);

  useEffect(() => {
    setProfileName(activeRestaurant.name || '');
    setProfileOwnerName(activeRestaurant.ownerName || 'Vikramaditya Rathore');
    setProfileAddress(activeRestaurant.address || '');
    setProfileCustomerCare(activeRestaurant.customerCareNumber || activeRestaurant.contactNumber || '+91 98450 12260');
    setProfileNumberOfFloors(activeRestaurant.numberOfFloors || activeRestaurant.floors?.length || 2);
  }, [activeRestaurant]);

  // Authenticated restaurant owner session
  const ownerSession = getStoredSession();
  const effectiveRole = ownerSession?.role || 'restaurant-owner';
  const isAuthorizedOwner = effectiveRole === 'restaurant-owner';

  // Restaurant Subscription & Expiry Notification State
  const [currentSubscription, setCurrentSubscription] = useState<RestaurantSubscriptionStatus>(() =>
    getRestaurantSubscription(activeRestaurant.id)
  );
  const [expiryModalTier, setExpiryModalTier] = useState<ExpiryTier | null>(null);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState<boolean>(false);
  const [featureLockedModalMessage, setFeatureLockedModalMessage] = useState<string | null>(null);

  useEffect(() => {
    const sub = getRestaurantSubscription(activeRestaurant.id);
    setCurrentSubscription(sub);

    // Only display subscription expiry notifications to restaurant owners (not customers)
    if (isAuthorizedOwner) {
      const check = shouldShowExpiryNotification(activeRestaurant.id, sub);
      if (check.shouldShow && check.tier) {
        setExpiryModalTier(check.tier);
        setIsExpiryModalOpen(true);
      }
    }

    const handleSubUpdate = (e: any) => {
      if (!e.detail || e.detail.restaurantId === activeRestaurant.id) {
        const updated = getRestaurantSubscription(activeRestaurant.id);
        setCurrentSubscription(updated);
        if (isAuthorizedOwner) {
          const check = shouldShowExpiryNotification(activeRestaurant.id, updated);
          if (check.shouldShow && check.tier) {
            setExpiryModalTier(check.tier);
            setIsExpiryModalOpen(true);
          }
        }
      }
    };

    window.addEventListener('flashtable_subscription_updated', handleSubUpdate);
    return () => window.removeEventListener('flashtable_subscription_updated', handleSubUpdate);
  }, [activeRestaurant.id, isAuthorizedOwner]);

  const handleCloseExpiryModal = () => {
    if (expiryModalTier) {
      dismissSubscriptionNotification(activeRestaurant.id, expiryModalTier);
    }
    setIsExpiryModalOpen(false);
  };

  const handleRenewFromExpiryModal = () => {
    if (expiryModalTier) {
      dismissSubscriptionNotification(activeRestaurant.id, expiryModalTier);
    }
    setIsExpiryModalOpen(false);
    setDashboardView('subscription-plans');
  };

  const handleViewPlansFromExpiryModal = () => {
    if (expiryModalTier) {
      dismissSubscriptionNotification(activeRestaurant.id, expiryModalTier);
    }
    setIsExpiryModalOpen(false);
    setDashboardView('subscription-plans');
  };

  const handleSaveRestaurantProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorizedOwner) {
      if (onToast) onToast('Access Denied: Only authorized restaurant owners/admins can edit restaurant profile details.');
      return;
    }

    const floorCount = Math.max(1, Math.min(15, Number(profileNumberOfFloors) || 2));
    const generatedFloors = getDefaultFloors(floorCount);

    const updated = {
      ...activeRestaurant,
      name: profileName.trim(),
      ownerName: profileOwnerName.trim(),
      address: profileAddress.trim(),
      customerCareNumber: profileCustomerCare.trim(),
      contactNumber: profileCustomerCare.trim(),
      numberOfFloors: floorCount,
      floors: generatedFloors,
    };
    setActiveRestaurant(updated);
    if (onUpdateRestaurantDetails) {
      onUpdateRestaurantDetails(activeRestaurant.id, {
        name: profileName.trim(),
        ownerName: profileOwnerName.trim(),
        address: profileAddress.trim(),
        customerCareNumber: profileCustomerCare.trim(),
      });
    }
    if (onUpdateRestaurantFloors) {
      onUpdateRestaurantFloors(activeRestaurant.id, generatedFloors);
    }

    try {
      localStorage.setItem(`flashtable_restaurant_${activeRestaurant.id}`, JSON.stringify(updated));
    } catch {}

    setIsProfileSaved(true);
    if (onToast) {
      onToast(`Restaurant profile updated! Configured ${floorCount} floor(s) (${generatedFloors.map(f => f.name).join(', ')}).`);
    }
    setTimeout(() => setIsProfileSaved(false), 4000);
  };

  const handleSaveStaffTimeInOut = async () => {
    if (!editingTimesReservation || !restaurantTimeIn.trim() || !restaurantTimeOut.trim()) return;
    setIsSavingRestaurantTimes(true);

    try {
      const prevIn = editingTimesReservation.timeIn;
      const prevOut = editingTimesReservation.timeOut;

      await updateReservationTimesOnBackend({
        reservationId: editingTimesReservation.id,
        timeIn: restaurantTimeIn.trim(),
        timeOut: restaurantTimeOut.trim(),
        updatedBy: ownerSession?.fullName || 'Host Staff',
        updatedRole: 'restaurant-owner',
        previousTimeIn: prevIn,
        previousTimeOut: prevOut,
        restaurantId: activeRestaurant.id,
        restaurantName: activeRestaurant.name,
        reason: restaurantTimeReason.trim() || 'Restaurant staff manual adjustment',
      });

      const nextReservations = reservations.map((r) =>
        r.id === editingTimesReservation.id
          ? {
              ...r,
              timeIn: restaurantTimeIn.trim(),
              timeOut: restaurantTimeOut.trim(),
              timeSlot: `${restaurantTimeIn.trim()} → ${restaurantTimeOut.trim()}`,
              lastUpdated: {
                updatedAt: new Date().toISOString(),
                updatedBy: ownerSession?.fullName || 'Host Staff',
                updatedRole: 'restaurant-staff',
                fieldModified: 'Time In & Out',
                previousValue: `${prevIn || ''} → ${prevOut || ''}`,
                newValue: `${restaurantTimeIn.trim()} → ${restaurantTimeOut.trim()}`,
                reason: restaurantTimeReason.trim() || 'Restaurant staff manual adjustment',
              },
            }
          : r
      );

      if (onSyncReservations) {
        onSyncReservations(nextReservations);
      }

      if (onToast) {
        onToast(`Dining schedule updated for ${editingTimesReservation.customerName}: In at ${restaurantTimeIn.trim()}, Out at ${restaurantTimeOut.trim()}.`);
      }
      setEditingTimesReservation(null);
    } catch (err: any) {
      if (onToast) onToast(`Error updating times: ${err?.message || 'Failed to save'}`);
    } finally {
      setIsSavingRestaurantTimes(false);
    }
  };
  const [selectedSlot, setSelectedSlot] = useState<string>('07:30 PM');
  const [qrScanInput, setQrScanInput] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [activeCheckInMethod, setActiveCheckInMethod] = useState<'scan' | 'manual'>('scan');
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isMenuQrOpen, setIsMenuQrOpen] = useState<boolean>(false);
  const [selectedBillReservation, setSelectedBillReservation] = useState<Reservation | null>(null);

  // Google Sheets backend synchronization state
  const [isSyncingBackend, setIsSyncingBackend] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => formatTimeIST(new Date()));
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Google Sheets backend table synchronization state
  const [backendTables, setBackendTables] = useState<Table[] | null>(null);
  const [isSyncingTables, setIsSyncingTables] = useState<boolean>(false);
  const [lastTablesSyncTime, setLastTablesSyncTime] = useState<string | null>(null);

  // Google Sheets backend live Smart Arrival state
  const [liveArrivalRecords, setLiveArrivalRecords] = useState<SmartArrivalRecord[]>([]);
  const [isLoadingArrivals, setIsLoadingArrivals] = useState<boolean>(false);
  const [lastArrivalSyncTime, setLastArrivalSyncTime] = useState<string>(() => formatTimeIST(new Date()));
  const [arrivalSyncError, setArrivalSyncError] = useState<string | null>(null);
  const [selectedArrivalResId, setSelectedArrivalResId] = useState<string | null>(null);
  const [dashboardFoodOrders, setDashboardFoodOrders] = useState<FoodOrder[]>([]);
  const [backendReservations, setBackendReservations] = useState<Reservation[]>([]);

  // Strict session lock: keep stored session restaurantId synchronized with activeRestaurant.id
  useEffect(() => {
    if (ownerSession && ownerSession.role === 'restaurant-owner') {
      if (ownerSession.restaurantId?.toLowerCase() !== activeRestaurant.id.toLowerCase()) {
        ownerSession.restaurantId = activeRestaurant.id;
        saveStoredSession(ownerSession);
      }
    }
  }, [activeRestaurant.id, ownerSession]);

  // Fetch reservations from Google Sheets backend for active restaurant
  const syncReservationsFromGoogleSheet = useCallback(async (notify: boolean = false) => {
    if (notify) setIsSyncingBackend(true);
    setSyncFeedback(null);
    try {
      const result = await getRestaurantReservationsFromBackend(activeRestaurant.id);
      if (result.success && result.reservations) {
        const timeStr = formatTimeIST(new Date());
        setLastSyncTime(timeStr);
        setSyncFeedback(`Synced ${result.reservations.length} reservations from Google Sheet (${timeStr})`);

        // Map backend reservation records to frontend Reservation models
        const mappedReservations: Reservation[] = result.reservations.map((item) => {
          const matchingTable = activeRestaurant.tables.find(
            (t) => t.id === item.tableId || t.tableNumber === item.tableId || t.tableNumber === item.tableId.replace('t-', 'T')
          );
          const tableNum = matchingTable 
            ? matchingTable.tableNumber 
            : (item.tableId.startsWith('t-') ? item.tableId.replace('t-', 'T') : item.tableId);

          const timeInfo = parseStoredReservationTime(item.time || '');

          return {
            id: item.reservationId,
            userId: item.userId,
            bookingRef: item.reservationId.startsWith('RES-') 
              ? `FT-${item.reservationId.slice(-6)}` 
              : (item.reservationId || 'FT-BLR-0730'),
            restaurantId: item.restaurantId,
            restaurantName: activeRestaurant.name,
            restaurantAddress: activeRestaurant.address,
            tableId: item.tableId,
            tableNumber: tableNum,
            section: (matchingTable?.section as any) || 'Main Dining',
            date: cleanDateString(item.date),
            timeSlot: timeInfo.timeIn && timeInfo.timeOut ? `${timeInfo.timeIn} → ${timeInfo.timeOut}` : cleanTimeString(item.time),
            timeIn: timeInfo.timeIn,
            timeOut: timeInfo.timeOut,
            durationFormatted: timeInfo.durationFormatted,
            durationMinutes: timeInfo.durationMinutes,
            guests: Number(item.guests) || 2,
            customerName: item.customerName || 'Guest',
            customerPhone: item.customerPhone || '',
            customerEmail: item.customerEmail || '',
            specialRequests: item.preferences || 'Window · Quiet table preferred',
            status: (item.status as any) || 'confirmed',
            createdAt: item.createdAt || new Date().toISOString(),
            qrCodeData: `FT-${item.restaurantId.toUpperCase()}-${tableNum}-${(item.customerName || 'GUEST').toUpperCase()}-${item.reservationId}`,
            noShowRiskScore: 'Low',
            depositAmount: Number(item.depositAmount) || 200,
            paymentStatus: 'paid',
            paymentMethod: Number(item.depositAmount) > 0 ? 'UPI' : 'UPI',
            paymentTransactionId: 'FT-TXN-' + (item.reservationId.length > 6 ? item.reservationId.slice(-6) : '883921'),
            paymentDetails: {
              depositAmount: Number(item.depositAmount) || 200,
              paymentStatus: 'paid',
              paymentMethod: 'UPI',
              paymentMethodDetail: 'UPI Table Booking Deposit (₹200)',
              transactionId: 'FT-TXN-' + (item.reservationId.length > 6 ? item.reservationId.slice(-6) : '883921'),
              paidAt: item.createdAt || new Date().toISOString(),
              isRefundable: true,
            },
          };
        });

        setBackendReservations(mappedReservations);
        if (onSyncReservations) {
          onSyncReservations(mappedReservations);
        }

        if (notify && onToast) {
          onToast(`Google Sheet: Refreshed ${mappedReservations.length} reservations for ${activeRestaurant.name}.`);
        }
      } else {
        setSyncFeedback(result.message || 'Unable to sync with Google Sheet.');
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || 'Error connecting to Google Sheets backend.');
    } finally {
      setIsSyncingBackend(false);
    }
  }, [activeRestaurant, onSyncReservations, onToast]);

  // Fetch tables from Google Sheets backend for the authenticated restaurant owner
  const syncTablesFromGoogleSheet = useCallback(async (notify: boolean = false) => {
    if (notify) setIsSyncingTables(true);
    try {
      // Use active restaurant's ID
      const targetRestId = activeRestaurant.id;
      const result = await getRestaurantTablesFromBackend(targetRestId);

      if (result.success && result.tables && result.tables.length > 0) {
        const timeStr = formatTimeIST(new Date());
        setLastTablesSyncTime(timeStr);

        // Map backend table items to frontend Table model, filtering out inactive/removed tables
        const mappedTables: Table[] = result.tables
          .filter((item) => item.status !== 'inactive' && item.status !== 'removed')
          .map((item) => ({
            id: item.tableId || item.id,
            tableNumber: item.tableNumber,
            capacity: Number(item.capacity) || 2,
            minCapacity: Number(item.minCapacity) || 1,
            shape: (item.shape === 'circle' || item.shape === 'booth' ? item.shape : 'rect') as Table['shape'],
            section: item.section || 'Main Dining',
            features: Array.isArray(item.features) ? item.features : [],
            x: Number(item.x) || 10,
            y: Number(item.y) || 10,
            width: Number(item.width) || 16,
            height: Number(item.height) || 16,
            status: item.status || 'available',
          }));

        setBackendTables(mappedTables);

        // Populate tableOverrides accurately reflecting backend table statuses
        const newOverrides: Record<string, TableState> = {};
        result.tables.forEach((t) => {
          if (t.status) {
            newOverrides[t.tableId || t.id] = t.status as TableState;
          }
        });
        setTableOverrides((prev) => ({ ...prev, ...newOverrides }));

        if (notify && onToast) {
          onToast(`Google Sheet: Synced ${mappedTables.length} tables for ${activeRestaurant.name} (${timeStr}).`);
        }
      }
    } catch (err: any) {
      console.warn('Unable to sync tables with Google Sheet backend:', err);
    } finally {
      setIsSyncingTables(false);
    }
  }, [activeRestaurant.id, activeRestaurant.name, onToast]);

  // Helper to match restaurant IDs handling canonical aliases and restaurant data lookups
  const isMatchingRestaurant = useCallback((rId1?: string, rId2?: string) => {
    if (!rId1 || !rId2) return false;
    const a = rId1.toLowerCase().trim();
    const b = rId2.toLowerCase().trim();
    if (a === b) return true;
    if ((a === 'rest-1' && b === 'the-ember-room') || (a === 'the-ember-room' && b === 'rest-1')) return true;

    // Check if either matches restaurant ID or name slug in RESTAURANTS_DATA
    const restA = restaurants.find(r => r.id.toLowerCase() === a || r.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === a);
    const restB = restaurants.find(r => r.id.toLowerCase() === b || r.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === b);
    if (restA && restB && restA.id === restB.id) return true;
    if (restA && restA.id.toLowerCase() === b) return true;
    if (restB && restB.id.toLowerCase() === a) return true;

    // Alphanumeric stripped check for flexible matching (e.g., 'the-ember-room' vs 'the ember room' vs 'rest-1')
    const cleanA = a.replace(/[^a-z0-9]/g, '');
    const cleanB = b.replace(/[^a-z0-9]/g, '');
    if (cleanA && cleanB && cleanA === cleanB) return true;
    if ((cleanA === 'rest1' || cleanA === 'theemberroom') && (cleanB === 'rest1' || cleanB === 'theemberroom')) return true;

    return false;
  }, [restaurants]);

  // Fetch live Smart Arrival data strictly for the currently viewed restaurant
  const syncSmartArrivalFromGoogleSheet = useCallback(async (notify: boolean = false) => {
    if (notify) setIsLoadingArrivals(true);
    try {
      const targetRestId = activeRestaurant.id;
      const result = await getRestaurantSmartArrivalFromBackend(targetRestId);
      if (result.success && Array.isArray(result.arrivals)) {
        setLiveArrivalRecords(result.arrivals);
        setArrivalSyncError(null);
        const timeStr = formatTimeIST(new Date());
        setLastArrivalSyncTime(timeStr);
        if (notify && onToast) {
          onToast(`Smart Arrival: Refreshed live arrival updates (${timeStr}).`);
        }
      } else {
        setArrivalSyncError(result.message || 'Unable to load live Smart Arrival updates.');
      }
    } catch (err: any) {
      setArrivalSyncError(err?.message || 'Error connecting to Smart Arrival backend.');
    } finally {
      setIsLoadingArrivals(false);
    }
  }, [activeRestaurant.id, onToast]);

  // Fetch food orders for pre-order detection
  const syncFoodOrdersFromGoogleSheet = useCallback(async () => {
    try {
      const targetRestId = activeRestaurant.id;
      const res = await getRestaurantFoodOrdersFromBackend(targetRestId);
      if (res.success && Array.isArray(res.foodOrders)) {
        setDashboardFoodOrders(res.foodOrders);
      }
    } catch {
      // Non-blocking
    }
  }, [activeRestaurant.id]);

  // Periodic polling for Smart Arrival, Food Orders, and Reservations (12 seconds) with unmount cleanup
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      await syncSmartArrivalFromGoogleSheet(false);
      await syncFoodOrdersFromGoogleSheet();
      await syncReservationsFromGoogleSheet(false);
    };

    poll();
    const intervalId = setInterval(poll, 12000);

    const handleLocalArrivalEvent = () => {
      if (isMounted) {
        poll();
      }
    };
    window.addEventListener('flashtable:smart-arrival-update', handleLocalArrivalEvent);
    window.addEventListener('flashtable:reservation-created', handleLocalArrivalEvent);
    window.addEventListener('storage', handleLocalArrivalEvent);
    window.addEventListener('focus', handleLocalArrivalEvent);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('flashtable:smart-arrival-update', handleLocalArrivalEvent);
      window.removeEventListener('flashtable:reservation-created', handleLocalArrivalEvent);
      window.removeEventListener('storage', handleLocalArrivalEvent);
      window.removeEventListener('focus', handleLocalArrivalEvent);
    };
  }, [syncSmartArrivalFromGoogleSheet, syncFoodOrdersFromGoogleSheet, syncReservationsFromGoogleSheet]);

  // Active / upcoming guests for this restaurant with Smart Arrival enabled
  const activeSmartArrivalGuests = useMemo<Array<{
    arrival: SmartArrivalRecord;
    reservation: Reservation;
    foodOrder?: FoodOrder | null;
    prepRecommendation: KitchenPrepRecommendation;
  }>>(() => {
    const currentRestId = activeRestaurant.id;

    // Filter strictly by the restaurant currently being viewed / authenticated
    const arrivalsForThisRestaurant = liveArrivalRecords.filter(a =>
      isMatchingRestaurant(a.restaurantId, currentRestId) &&
      a.locationEnabled !== false
    );

    // If customer has an enabled smartArrivalState for this restaurant in session, incorporate it
    const allArrivals: SmartArrivalRecord[] = [...arrivalsForThisRestaurant];
    if (
      smartArrivalState.isEnabled &&
      smartArrivalState.reservationId &&
      isMatchingRestaurant(smartArrivalState.restaurantId, currentRestId)
    ) {
      const alreadyHas = allArrivals.some(
        a => a.reservationId.toLowerCase() === smartArrivalState.reservationId.toLowerCase()
      );
      if (!alreadyHas) {
        allArrivals.push({
          reservationId: smartArrivalState.reservationId,
          userId: smartArrivalState.userId,
          restaurantId: smartArrivalState.restaurantId || currentRestId,
          locationEnabled: true,
          latitude: smartArrivalState.customerLat || 0,
          longitude: smartArrivalState.customerLng || 0,
          distance: smartArrivalState.distanceMeters || (smartArrivalState.isInsideGeofence ? 450 : 800),
          etaMinutes: smartArrivalState.etaMinutes || (smartArrivalState.isInsideGeofence ? 2 : 5),
          geofenceStatus: smartArrivalState.isInsideGeofence ? 'Within 500 m' : 'Outside 500 m',
          updatedAt: smartArrivalState.lastSyncedAt || new Date().toISOString(),
        });
      }
    }

    const combinedReservations = [...reservations, ...backendReservations];
    const uniqueReservationsMap = new Map<string, Reservation>();
    combinedReservations.forEach(r => {
      if (r && r.id) uniqueReservationsMap.set(r.id.toLowerCase().trim(), r);
      if (r && r.bookingRef) uniqueReservationsMap.set(r.bookingRef.toLowerCase().trim(), r);
    });

    const matched: Array<{
      arrival: SmartArrivalRecord;
      reservation: Reservation;
      foodOrder?: FoodOrder | null;
      prepRecommendation: KitchenPrepRecommendation;
    }> = [];

    for (const arrival of allArrivals) {
      const arrivalKey = (arrival.reservationId || '').toLowerCase().trim();
      let matchingRes = uniqueReservationsMap.get(arrivalKey);
      if (!matchingRes) {
        matchingRes = combinedReservations.find(
          r =>
            isMatchingRestaurant(r.restaurantId, currentRestId) &&
            (r.id.toLowerCase() === arrivalKey ||
             (r.bookingRef && r.bookingRef.toLowerCase() === arrivalKey))
        );
      }

      // If matching in current session
      if (!matchingRes && smartArrivalState.reservationId && smartArrivalState.reservationId.toLowerCase() === arrivalKey) {
        matchingRes = {
          id: arrival.reservationId,
          bookingRef: arrival.reservationId,
          restaurantId: currentRestId,
          restaurantName: activeRestaurant.name,
          restaurantAddress: activeRestaurant.address,
          tableId: 'tbl-auto',
          section: 'Main Dining',
          customerName: smartArrivalState.customerName || 'Arriving Guest',
          customerEmail: 'guest@flashtable.in',
          customerPhone: smartArrivalState.customerPhone || '+91 98450 12260',
          guests: smartArrivalState.guests || 2,
          date: new Date().toISOString().split('T')[0],
          timeSlot: smartArrivalState.timeSlot || '07:30 PM',
          tableNumber: smartArrivalState.tableNumber || 'T07',
          status: 'confirmed',
          createdAt: arrival.updatedAt || new Date().toISOString(),
          depositAmount: 200,
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          qrCodeData: `FT-${currentRestId.toUpperCase()}-${arrival.reservationId}`,
          noShowRiskScore: 'Low',
        };
      }

      if (matchingRes) {
        if (arrival.customerName && (matchingRes.customerName.includes('Guest') || matchingRes.customerName === 'Customer')) {
          matchingRes = { ...matchingRes, customerName: arrival.customerName };
        }
        if (arrival.tableNumber && (matchingRes.tableNumber === 'Table Assigned on Arrival' || !matchingRes.tableNumber)) {
          matchingRes = { ...matchingRes, tableNumber: arrival.tableNumber };
        }
      }

      // If still not matched, construct real reservation context from arrival record
      if (!matchingRes) {
        const guestName = arrival.customerName || (arrival.userId ? `Guest (${arrival.userId})` : `Guest #${arrival.reservationId.slice(-4)}`);
        const tableNum = arrival.tableNumber || 'T03';
        matchingRes = {
          id: arrival.reservationId,
          bookingRef: arrival.reservationId,
          restaurantId: currentRestId,
          restaurantName: activeRestaurant.name,
          restaurantAddress: activeRestaurant.address,
          tableId: `tbl-${tableNum.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          section: 'Main Dining',
          customerName: guestName,
          customerEmail: 'guest@flashtable.in',
          customerPhone: arrival.customerPhone || '+91 98450 12260',
          guests: 2,
          date: arrival.updatedAt ? arrival.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0],
          timeSlot: 'Upcoming Reservation',
          tableNumber: tableNum,
          status: 'confirmed',
          createdAt: arrival.updatedAt || new Date().toISOString(),
          depositAmount: 200,
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          qrCodeData: `FT-${currentRestId.toUpperCase()}-${arrival.reservationId}`,
          noShowRiskScore: 'Low',
        };
      }

      // Only display if reservation is active/upcoming (not cancelled)
      if (matchingRes.status !== 'cancelled') {
        const matchingFoodOrder = dashboardFoodOrders.find(
          fo =>
            fo.reservationId.toLowerCase() === matchingRes.id.toLowerCase() ||
            (matchingRes.bookingRef && fo.reservationId.toLowerCase() === matchingRes.bookingRef.toLowerCase()) ||
            fo.reservationId.toLowerCase() === arrival.reservationId.toLowerCase()
        ) || (matchingRes.foodOrder ? {
          foodOrderId: matchingRes.foodOrder.foodOrderId || 'FO-AUTO',
          reservationId: matchingRes.id,
          userId: matchingRes.userId || 'usr-guest',
          restaurantId: currentRestId,
          tableId: matchingRes.tableId || 'tbl-auto',
          tableNumber: matchingRes.tableNumber,
          date: matchingRes.date,
          time: matchingRes.timeSlot,
          items: matchingRes.foodOrder.items || [],
          foodTotal: matchingRes.foodOrder.foodTotal || 0,
          status: matchingRes.foodOrder.status || 'Accepted',
          createdAt: matchingRes.createdAt,
          updatedAt: matchingRes.createdAt,
        } as FoodOrder : null);

        const prepRec = getKitchenPrepRecommendation(
          arrival.etaMinutes,
          arrival.distance,
          arrival.geofenceStatus
        );

        matched.push({
          arrival,
          reservation: matchingRes,
          foodOrder: matchingFoodOrder,
          prepRecommendation: prepRec,
        });
      }
    }

    return matched;
  }, [liveArrivalRecords, smartArrivalState, reservations, backendReservations, dashboardFoodOrders, activeRestaurant.id, isMatchingRestaurant]);

  // Currently focused / selected live guest
  const currentActiveGuest = useMemo(() => {
    if (activeSmartArrivalGuests.length === 0) return null;
    if (selectedArrivalResId) {
      const found = activeSmartArrivalGuests.find(g => g.reservation.id === selectedArrivalResId);
      if (found) return found;
    }
    return activeSmartArrivalGuests[0];
  }, [activeSmartArrivalGuests, selectedArrivalResId]);

  // Initial fetch on component mount or active restaurant change
  useEffect(() => {
    syncReservationsFromGoogleSheet(false);
    syncTablesFromGoogleSheet(false);
  }, [activeRestaurant.id, syncReservationsFromGoogleSheet, syncTablesFromGoogleSheet]);

  // Add Table to Restaurant Floor Plan & Backend
  const handleAddTable = async (newTable: Table): Promise<boolean> => {
    const targetRestId = activeRestaurant.id;
    try {
      const res = await addTableToBackend({
        tableId: newTable.id,
        restaurantId: targetRestId,
        tableNumber: newTable.tableNumber,
        capacity: newTable.capacity,
        minCapacity: newTable.minCapacity || 1,
        shape: 'rect',
        section: newTable.section || 'Main Dining',
        features: newTable.features,
        preferences: Array.isArray(newTable.features) ? newTable.features.join(', ') : '',
        status: newTable.status || 'available',
        x: newTable.x,
        y: newTable.y,
        width: newTable.width,
        height: newTable.height,
      });

      const currentList = backendTables.length > 0 ? backendTables : activeRestaurant.tables;
      const addedTable: Table = {
        id: (res?.success && (res.table?.tableId || res.table?.id)) || newTable.id,
        tableId: (res?.success && (res.table?.tableId || res.table?.id)) || newTable.id,
        restaurantId: targetRestId,
        tableNumber: res?.table?.tableNumber || newTable.tableNumber,
        capacity: Number(res?.table?.capacity) || newTable.capacity,
        minCapacity: 1,
        shape: 'rect', // Fixed as RECTANGLE
        section: res?.table?.section || newTable.section || 'Main Dining',
        floorId: newTable.floorId || 'floor-0',
        floorNumber: newTable.floorNumber || 0,
        floorName: newTable.floorName || 'Ground Floor',
        features: Array.isArray(res?.table?.features) ? res.table.features : (newTable.features || ['Indoor Seating']),
        x: typeof res?.table?.x === 'number' ? res.table.x : newTable.x,
        y: typeof res?.table?.y === 'number' ? res.table.y : newTable.y,
        width: typeof res?.table?.width === 'number' ? res.table.width : (newTable.width || 18),
        height: typeof res?.table?.height === 'number' ? res.table.height : (newTable.height || 15),
        status: res?.table?.status || newTable.status || 'available',
      };

      const nextTables = [...currentList, addedTable];
      setBackendTables(nextTables);
      setSelectedTableForDetails(addedTable);
      
      if (newTable.status) {
        setTableOverrides((prev) => ({ ...prev, [addedTable.id]: newTable.status as TableState }));
      }

      if (onUpdateRestaurantTables) {
        onUpdateRestaurantTables(targetRestId, nextTables);
      }

      if (onToast) {
        onToast(`Table ${addedTable.tableNumber} added successfully to ${newTable.floorName || 'floor'}.`);
      }
      return true;
    } catch (err: any) {
      // Fallback local save to guarantee no table additions are lost
      const currentList = backendTables.length > 0 ? backendTables : activeRestaurant.tables;
      const nextTables = [...currentList, newTable];
      setBackendTables(nextTables);
      setSelectedTableForDetails(newTable);
      if (onUpdateRestaurantTables) {
        onUpdateRestaurantTables(targetRestId, nextTables);
      }
      if (onToast) {
        onToast(`Table ${newTable.tableNumber} added to ${newTable.floorName || 'floor'}.`);
      }
      return true;
    }
  };

  // Remove Table from Restaurant Floor Plan & Backend
  const handleRemoveTable = async (tableId: string): Promise<boolean> => {
    const targetRestId = activeRestaurant.id;
    try {
      const res = await removeTableFromBackend(targetRestId, tableId);
      if (res.success) {
        const currentList = backendTables.length > 0 ? backendTables : activeRestaurant.tables;
        const nextTables = currentList.filter(
          (t) => t.id !== tableId && (t as any).tableId !== tableId
        );
        setBackendTables(nextTables);

        // If removed table was currently inspected, reset selection
        if (
          selectedTableForDetails && 
          (selectedTableForDetails.id === tableId || (selectedTableForDetails as any).tableId === tableId)
        ) {
          setSelectedTableForDetails(nextTables[0] || null);
        }

        if (onUpdateRestaurantTables) {
          onUpdateRestaurantTables(targetRestId, nextTables);
        }

        if (onToast) {
          onToast(`Table ${res.tableNumber || ''} removed successfully from ${activeRestaurant.name}.`);
        }
        return true;
      } else {
        if (onToast && res.message) {
          onToast(res.message);
        }
        return false;
      }
    } catch (err: any) {
      if (onToast) {
        onToast(`Error removing table: ${err?.message || 'Unknown network error'}`);
      }
      return false;
    }
  };

  const [completingDiningId, setCompletingDiningId] = useState<string | null>(null);

  // Staff completes dining session and persists final bill to Google Sheets
  const handleCompleteDining = async (res: Reservation) => {
    setCompletingDiningId(res.id);
    try {
      const computedBill = res.diningBill || generateDiningBill(res);
      const foodAndBeverageTotal = computedBill.subtotal;
      const depositAmount = res.depositAmount || 0;
      const depositAdjustment = -depositAmount;
      const finalAmount = computedBill.netPayable;
      const resUserId = res.userId || '';

      const billResult = await createBillOnBackend({
        reservationId: res.id,
        userId: resUserId,
        restaurantId: res.restaurantId,
        foodAmount: foodAndBeverageTotal,
        depositAmount: depositAmount,
        depositAdjustment: depositAdjustment,
        finalAmount: finalAmount,
        sentToMobile: Boolean(res.billSent),
      });

      if (!billResult.success) {
        if (onToast) {
          onToast(`Failed to record final bill: ${billResult.message || 'Backend error'}`);
        }
        return;
      }

      onUpdateReservationStatus(res.id, 'completed');
      const updatedRes: Reservation = { 
        ...res, 
        status: 'completed',
        diningBill: {
          ...computedBill,
          billNumber: billResult.billId || computedBill.billNumber,
          paymentStatus: 'settled',
        }
      };
      setSelectedBillReservation(updatedRes);
      if (onToast) {
        onToast(`Dining completed for Table ${res.tableNumber} (${res.customerName}). Final bill (${billResult.billId || 'Final'}) saved to Google Sheets.`);
      }
    } catch (err: any) {
      if (onToast) {
        onToast(`Error completing dining: ${err?.message || 'Network error'}`);
      }
    } finally {
      setCompletingDiningId(null);
    }
  };

  // Staff dispatches bill to customer's registered phone
  const handleSendBillToCustomer = (resId: string) => {
    if (onSendBill) {
      onSendBill(resId);
    }
    setSelectedBillReservation((prev) => (prev && prev.id === resId ? { ...prev, billSent: true } : prev));
  };

  // Selected table for Live Tables inspector panel
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<Table | null>(() => {
    return (
      activeRestaurant.tables.find((t) => t.tableNumber === 'T-07' || t.tableNumber === 'T07') ||
      activeRestaurant.tables[0] ||
      null
    );
  });

  const handleCallGuest = (customPhone?: string, customName?: string) => {
    const phone = customPhone || currentActiveGuest?.reservation.customerPhone || smartArrivalState.customerPhone || '+91 98450 12260';
    const name = customName || currentActiveGuest?.reservation.customerName || smartArrivalState.customerName || 'customer';
    if (onToast) {
      onToast(`Calling ${name} (${phone})... Connecting call via cellular dialer.`);
    }
    try {
      window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
    } catch {
      // Graceful fallback in sandbox
    }
  };

  // Unified restaurant-scoped reservations:
  // Shows EVERY customer reservation belonging to activeRestaurant.id.
  // Combines backendReservations from Google Sheets, active reservations prop,
  // and any live arrivals (such as smart arrival guests).
  // Strictly NOT filtered by Sanketh, not filtered by hardcoded userId, not filtered by logged-in customer.
  const currentReservations = useMemo(() => {
    const seen = new Set<string>();
    
    // Extract any reservations constructed in activeSmartArrivalGuests
    const arrivalReservations: Reservation[] = activeSmartArrivalGuests.map(g => g.reservation);

    // Also check liveArrivalRecords directly to guarantee any arrival not yet in activeSmartArrivalGuests is included
    const extraArrivalReservations: Reservation[] = [];
    liveArrivalRecords.forEach(arrival => {
      const arrResId = (arrival.reservationId || '').trim();
      if (!arrResId) return;
      const alreadyInArrivals = arrivalReservations.some(r => r.id.toLowerCase() === arrResId.toLowerCase());
      if (alreadyInArrivals) return;
      
      const isRestMatch = isMatchingRestaurant(arrival.restaurantId, activeRestaurant.id);
      if (!isRestMatch) return;

        const guestName = arrival.customerName || (arrival.userId ? `Guest (${arrival.userId})` : `Guest #${arrival.reservationId.slice(-4)}`);
        const tableNum = arrival.tableNumber || 'T03';
        extraArrivalReservations.push({
          id: arrival.reservationId,
          userId: arrival.userId || 'usr-guest',
          bookingRef: arrival.reservationId.startsWith('RES-') ? `FT-${arrival.reservationId.slice(-6)}` : arrival.reservationId,
          restaurantId: activeRestaurant.id,
          restaurantName: activeRestaurant.name,
          restaurantAddress: activeRestaurant.address,
          tableId: `tbl-${tableNum.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          tableNumber: tableNum,
          section: 'Main Dining',
          date: arrival.updatedAt ? arrival.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0],
          timeSlot: 'Upcoming Reservation',
          guests: 2,
          customerName: guestName,
          customerPhone: arrival.customerPhone || '+91 98450 12260',
          customerEmail: 'guest@flashtable.in',
          specialRequests: 'Smart Arrival active guest',
          status: 'confirmed',
          createdAt: arrival.updatedAt || new Date().toISOString(),
          depositAmount: 200,
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          qrCodeData: `FT-${activeRestaurant.id.toUpperCase()}-${arrival.reservationId}`,
          noShowRiskScore: 'Low',
        });
    });

    const combined = [
      ...backendReservations,
      ...reservations,
      ...arrivalReservations,
      ...extraArrivalReservations,
    ];

    return combined.filter((r) => {
      if (!r || !r.id) return false;
      if (!isMatchingRestaurant(r.restaurantId, activeRestaurant.id)) return false;
      const normalizedId = r.id.trim().toLowerCase();
      if (seen.has(normalizedId)) return false;
      seen.add(normalizedId);
      return true;
    });
  }, [backendReservations, reservations, activeSmartArrivalGuests, liveArrivalRecords, activeRestaurant.id, activeRestaurant.name, activeRestaurant.address, isMatchingRestaurant]);

  // Filtered reservations for Master Log and Penalty metrics
  const cancelledReservations = useMemo(() => {
    return currentReservations.filter((r) => r.status === 'cancelled' || r.cancellationStatus === 'cancelled');
  }, [currentReservations]);

  const activeReservationsList = useMemo(() => {
    return currentReservations.filter((r) => r.status !== 'cancelled' && r.cancellationStatus !== 'cancelled');
  }, [currentReservations]);

  const travelReservationsCount = useMemo(() => {
    return currentReservations.filter((r) => Boolean(r.travelDetails?.isTravellingByBus || r.id.includes('travel') || r.bookingRef.includes('TRV'))).length;
  }, [currentReservations]);

  const totalPenaltyRevenue = useMemo(() => {
    return cancelledReservations.reduce((sum, r) => {
      const isFirst = r.cancellationCount === 1 || r.penaltyAmount === 0 || (r.cancellationPenalty === 0 && r.cancellationPenalty !== undefined);
      const fee = r.penaltyAmount ?? r.cancellationPenalty ?? (isFirst ? 0 : 100);
      return sum + fee;
    }, 0);
  }, [cancelledReservations]);

  const firstTimeCancellationsCount = useMemo(() => {
    return cancelledReservations.filter((r) => r.cancellationCount === 1 || r.penaltyAmount === 0 || (r.cancellationPenalty === 0 && r.cancellationPenalty !== undefined)).length;
  }, [cancelledReservations]);

  const penalizedCancellationsCount = useMemo(() => {
    return cancelledReservations.filter((r) => !(r.cancellationCount === 1 || r.penaltyAmount === 0 || (r.cancellationPenalty === 0 && r.cancellationPenalty !== undefined))).length;
  }, [cancelledReservations]);

  const displayedReservations = useMemo(() => {
    if (resFilter === 'active') return activeReservationsList;
    if (resFilter === 'cancelled') return cancelledReservations;
    return currentReservations;
  }, [resFilter, activeReservationsList, cancelledReservations, currentReservations]);

  // Tables manual overrides for staff live management during shift
  const [tableOverrides, setTableOverrides] = useState<Record<string, TableState>>({});

  const handleSetTableStatus = async (tableId: string, newStatus: TableState) => {
    setTableOverrides((prev) => ({
      ...prev,
      [tableId]: newStatus,
    }));
    const currentTables = backendTables && backendTables.length > 0 ? backendTables : activeRestaurant.tables;
    const found = currentTables.find((t) => t.id === tableId || t.tableNumber === tableId);
    if (found) setSelectedTableForDetails(found);
    if (onToast) {
      const tableName = found ? found.tableNumber : tableId;
      onToast(`Table ${tableName} status set to ${newStatus.toUpperCase()}`);
    }

    // Persist to Google Sheets backend asynchronously
    try {
      const targetRestId = activeRestaurant.id;
      await updateTableStatusOnBackend(targetRestId, tableId, newStatus);
    } catch {
      // Keep UI responsive
    }
  };

  const handleResetStatuses = () => {
    setTableOverrides({});
    if (onToast) {
      onToast('Floor table statuses reset to live schedule.');
    }
  };

  const getTableStaffStatus = useCallback((table: Table): TableState => {
    if (tableOverrides[table.id]) return tableOverrides[table.id];
    if (tableOverrides[table.tableNumber]) return tableOverrides[table.tableNumber];
    
    // Check if table has a reservation active for the selected slot window
    const slotMinutes = parseTimeToMinutes(selectedSlot);

    const activeRes = currentReservations.find((r) => {
      const isMatch =
        r.tableId === table.id ||
        r.tableId === table.tableNumber ||
        (Boolean(r.tableNumber) && r.tableNumber.trim().toLowerCase() === table.tableNumber.trim().toLowerCase()) ||
        (r.tableId && r.tableId.replace('t-', 'T').toLowerCase() === table.tableNumber.toLowerCase()) ||
        (table.id && table.id.replace('t-', 'T').toLowerCase() === (r.tableNumber || '').toLowerCase());

      if (!isMatch) return false;

      // Active reservation states that hold or occupy the table
      if (!['confirmed', 'arrived', 'checked-in', 'seated'].includes(r.status)) return false;

      // Determine reservation duration: 90 mins if food pre-order, otherwise 120 mins
      const hasFoodOrder = Boolean(
        (r.foodOrder && r.foodOrder.items && r.foodOrder.items.length > 0) ||
        dashboardFoodOrders.some(
          (fo) =>
            (fo.reservationId?.toLowerCase() === r.id?.toLowerCase() ||
             (r.bookingRef && fo.reservationId?.toLowerCase() === r.bookingRef?.toLowerCase())) &&
            fo.items && fo.items.length > 0
        )
      );
      const durationMinutes = hasFoodOrder ? 90 : 120;
      const startMinutes = parseTimeToMinutes(r.timeSlot);
      const endMinutes = startMinutes + durationMinutes;

      // Overlap condition: selectedSlot falls inside [startMinutes, endMinutes)
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });

    if (activeRes) {
      if (activeRes.status === 'checked-in' || activeRes.status === 'seated') {
        return 'occupied';
      }
      return 'reserved';
    }

    return 'available';
  }, [tableOverrides, selectedSlot, currentReservations, dashboardFoodOrders]);

  // Memoized restaurant model incorporating backend table data
  const currentRestaurantWithBackendTables = useMemo(() => {
    if (backendTables && backendTables.length > 0) {
      return {
        ...activeRestaurant,
        tables: backendTables,
      };
    }
    return activeRestaurant;
  }, [activeRestaurant, backendTables]);

  const handleCycleTableState = (tableId: string) => {
    const current = getTableStaffStatus(
      activeRestaurant.tables.find((t) => t.id === tableId) || { id: tableId } as Table
    );
    const next: TableState = 
      current === 'available' ? 'occupied' :
      current === 'occupied' ? 'reserved' :
      current === 'reserved' ? 'unavailable' : 'available';
    
    setTableOverrides({
      ...tableOverrides,
      [tableId]: next,
    });
  };

  // Check in customer from QR scan verification or manual action with backend persistence
  const [isCheckingInId, setIsCheckingInId] = useState<string | null>(null);

  const handleCheckInCustomer = async (
    targetRes: Reservation,
    method: 'Manual' | 'QR' = 'Manual'
  ): Promise<{ success: boolean; message: string }> => {
    setIsCheckingInId(targetRes.id);
    try {
      const restaurantId = targetRes.restaurantId || activeRestaurant.id;
      const tableId = targetRes.tableId || 't-203';

      const result = await createCheckInOnBackend({
        reservationId: targetRes.id,
        restaurantId,
        tableId,
        method,
      });

      if (result.success) {
        onUpdateReservationStatus(targetRes.id, 'checked-in');
        setTableOverrides((prev) => ({
          ...prev,
          [targetRes.tableId]: 'occupied',
        }));

        const hydrated = hydrateReservationWithSoloSafety(targetRes);
        let soloSafetyInfo = '';
        if (hydrated.soloDinerSafety?.enabled) {
          const dispatchRes = dispatchSoloSafetyNotification(hydrated, method);
          if (dispatchRes) {
            soloSafetyInfo = ` • Solo Diner Safety alert sent to ${hydrated.soloDinerSafety.contactName} (${hydrated.soloDinerSafety.contactPhone})`;
          }
        }

        const successMsg = `Guest check-in verified. Customer seated at exact reserved table.${soloSafetyInfo}`;
        setScanMessage(successMsg);
        if (onToast) {
          onToast(successMsg);
        }
        return { success: true, message: successMsg };
      } else {
        const errorMsg = result.message || 'Check-in failed. Please verify reservation details.';
        setScanMessage(`✕ ${errorMsg}`);
        if (onToast) {
          onToast(`Check-in failed: ${errorMsg}`);
        }
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Network error during check-in.';
      setScanMessage(`✕ ${errorMsg}`);
      if (onToast) {
        onToast(`Check-in error: ${errorMsg}`);
      }
      return { success: false, message: errorMsg };
    } finally {
      setIsCheckingInId(null);
    }
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrScanInput.trim()) return;

    const query = qrScanInput.trim().toLowerCase();
    const matchedRes = currentReservations.find(
      (r) =>
        (r.bookingRef && r.bookingRef.toLowerCase() === query) ||
        (r.qrCodeData && r.qrCodeData.toLowerCase().includes(query)) ||
        (r.customerName && r.customerName.toLowerCase().includes(query)) ||
        (r.tableNumber && r.tableNumber.toLowerCase() === query) ||
        (query.includes('07') && (r.tableNumber === 'T-07' || r.tableNumber === 'T07')) ||
        (query.includes('sanketh') && r.customerName && r.customerName.toLowerCase().includes('sanketh'))
    );

    if (matchedRes) {
      const res = await handleCheckInCustomer(matchedRes, 'Manual');
      if (res.success) {
        setQrScanInput('');
      }
    } else {
      setScanMessage('✕ Reservation code not found for this restaurant. Try FT-BLR-0730 or FT-BLR-9812.');
    }
  };

  // Occupancy metrics
  const totalTables = activeRestaurant.tables.length;
  const occupiedOrReservedCount = activeRestaurant.tables.filter((t) => {
    const state = getTableStaffStatus(t);
    return state === 'occupied' || state === 'reserved';
  }).length;
  const occupancyPercentage = Math.round((occupiedOrReservedCount / totalTables) * 100);

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* 1. RESTAURANT HEADER: Display ONLY Restaurant Name and Restaurant Location */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E6E1]" id="restaurant-owner-header">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-[#2C3333] tracking-tight">
            {activeRestaurant.name}
          </h1>
          <p className="text-sm sm:text-base text-stone-500 mt-1 flex items-center gap-1.5 font-sans">
            <MapPin className="w-4 h-4 text-[#4F6F52] shrink-0" />
            <span>{activeRestaurant.address || `${activeRestaurant.neighborhood}, Bengaluru, Karnataka`}</span>
          </p>
        </div>

        {/* Minimal utility buttons (Customer View & Sign Out preserved) */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {onSwitchToCustomer && (
            <button
              onClick={onSwitchToCustomer}
              className="px-3.5 py-2 bg-white hover:bg-[#FAF9F6] border border-[#E8E6E1] text-[#2C3333] hover:text-[#4F6F52] rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Switch to Customer Mode"
              id="dashboard-switch-to-customer-btn"
            >
              <Compass className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Customer View</span>
            </button>
          )}

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-[#E8E6E1] hover:border-rose-300 text-[#2C3333]/70 hover:text-rose-600 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Sign Out"
              id="dashboard-signout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Expired Subscription Warning Banner on Restaurant Owner Dashboard */}
      {currentSubscription.status === 'expired' && (
        <div 
          className="bg-rose-50 border-2 border-rose-400 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in"
          id="dashboard-expired-subscription-banner"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-rose-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full border border-rose-300">
                  ⚠️ Subscription Expired
                </span>
                <span className="text-xs sm:text-sm font-bold text-rose-950 font-serif">
                  Partner plan for {activeRestaurant.name} is no longer active
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1">
                Live table inventory modifications and seating tools are temporarily paused. <strong>Your venue profile, customer reservations, and past records remain completely safe.</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDashboardView('subscription-plans')}
            className="py-2.5 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            id="btn-banner-renew-sub"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>Renew Subscription Now</span>
          </button>
        </div>
      )}

      {/* Dashboard Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E6E1] pb-3 overflow-x-auto no-scrollbar" id="dashboard-view-tabs">
        {/* 1. SUMMARY */}
        <button
          type="button"
          onClick={() => setDashboardView('summary')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'summary' || dashboardView === 'overview'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-summary"
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>1. SUMMARY</span>
        </button>

        {/* 2. RESERVATIONS */}
        <button
          type="button"
          onClick={() => setDashboardView('reservations')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'reservations'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-reservations"
        >
          <Users className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>2. RESERVATIONS ({currentReservations.length})</span>
        </button>

        {/* 3. TRAVEL BOOKINGS */}
        <button
          type="button"
          onClick={() => setDashboardView('travel-bookings')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'travel-bookings'
              ? 'bg-amber-500 text-stone-950 font-extrabold shadow-sm'
              : 'bg-white hover:bg-amber-50 text-stone-800 border border-amber-200'
          }`}
          id="tab-travel-bookings"
        >
          <Bus className="w-3.5 h-3.5 text-amber-700" />
          <span>3. TRAVEL BOOKINGS</span>
          {travelReservationsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950 font-mono">
              {travelReservationsCount}
            </span>
          )}
        </button>

        {/* 4. FOOD ORDERS */}
        <button
          type="button"
          onClick={() => setDashboardView('food-orders')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'food-orders'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-food-orders"
        >
          <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
          <span>4. FOOD ORDERS</span>
        </button>

        {/* 5. MENU & STOCK */}
        <button
          type="button"
          onClick={() => setDashboardView('menu-management')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'menu-management'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-menu-stock"
        >
          <UtensilsCrossed className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>5. MENU & STOCK</span>
        </button>

        {/* 6. LIVE TABLES */}
        <button
          type="button"
          onClick={() => setDashboardView('live-tables')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'live-tables' || dashboardView === 'floor-plan'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-live-tables"
        >
          <Armchair className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>6. LIVE TABLES</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {/* 7. GUEST ARRIVAL */}
        <button
          type="button"
          onClick={() => setDashboardView('guest-arrival')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'guest-arrival'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-guest-arrival"
        >
          <Radio className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>7. GUEST ARRIVAL</span>
          {smartArrivalState.isEnabled && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              smartArrivalState.isInsideGeofence
                ? 'bg-emerald-500 text-white animate-pulse'
                : 'bg-[#4F6F521A] text-[#4F6F52]'
            }`}>
              {smartArrivalState.isInsideGeofence ? '500m' : 'Approaching'}
            </span>
          )}
        </button>

        {/* 8. INSIGHTS */}
        <button
          type="button"
          onClick={() => setDashboardView('insights')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'insights'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-insights"
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>8. INSIGHTS</span>
        </button>

        {/* 9. DIGITAL MENU */}
        <button
          type="button"
          onClick={() => setDashboardView('digital-menu')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'digital-menu'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-digital-menu"
        >
          <QrCode className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>9. DIGITAL MENU</span>
        </button>

        {/* 10. TABLE MANAGEMENT */}
        <button
          type="button"
          onClick={() => setDashboardView('table-management')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'table-management'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-table-management"
        >
          <Armchair className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>10. TABLE MANAGEMENT</span>
        </button>

        {/* 11. FLOOR MANAGEMENT */}
        <button
          type="button"
          onClick={() => setDashboardView('floor-management')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'floor-management'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-floor-management"
        >
          <Layers className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>11. FLOOR MANAGEMENT</span>
        </button>

        {/* 12. CANCELLATIONS & PENALTIES */}
        <button
          type="button"
          onClick={() => setDashboardView('cancellations')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'cancellations'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-cancellations"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>12. CANCELLATIONS & PENALTIES</span>
          {cancelledReservations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-mono">
              {cancelledReservations.length}
            </span>
          )}
        </button>

        {/* 13. OWNER CONSOLE */}
        <button
          type="button"
          onClick={() => setDashboardView('owner-console')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'owner-console' || dashboardView === 'owner-details' || dashboardView === 'settings'
              ? 'bg-[#2C3333] text-white shadow-xs'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-owner-console"
        >
          <Store className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span>13. OWNER CONSOLE</span>
        </button>

        {/* 14. SUBSCRIPTION & PLANS */}
        <button
          type="button"
          onClick={() => setDashboardView('subscription-plans')}
          className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            dashboardView === 'subscription-plans'
              ? 'bg-[#4F6F52] text-white shadow-xs font-bold'
              : currentSubscription.status === 'expired'
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 font-bold'
              : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]'
          }`}
          id="tab-subscription-plans"
        >
          <Crown className={`w-3.5 h-3.5 ${dashboardView === 'subscription-plans' ? 'text-amber-300' : 'text-amber-500'}`} />
          <span>14. SUBSCRIPTION & PLANS</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
            currentSubscription.status === 'expired'
              ? 'bg-rose-600 text-white'
              : currentSubscription.status === 'expiring_soon'
              ? 'bg-amber-400 text-stone-950'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {currentSubscription.status === 'expired' 
              ? 'EXPIRED' 
              : currentSubscription.daysRemaining <= 7 
              ? `${currentSubscription.daysRemaining}d left` 
              : 'ACTIVE'}
          </span>
        </button>
      </div>

      {/* VIEW 0: SUMMARY (Most Demanded Food & Restaurant Crowd Analysis) */}
      {(dashboardView === 'summary' || dashboardView === 'overview') && (
        <RestaurantSummaryAnalytics
          restaurant={activeRestaurant}
          reservations={currentReservations}
          foodOrders={dashboardFoodOrders}
          activeSmartArrivalGuests={activeSmartArrivalGuests}
          liveArrivalRecords={liveArrivalRecords}
        />
      )}

      {/* VIEW 2: LIVE TABLES & FLOOR BLUEPRINT */}
      {(dashboardView === 'live-tables' || dashboardView === 'floor-plan') && (
        <LiveTablesTab
          restaurant={currentRestaurantWithBackendTables}
          reservations={currentReservations}
          tableOverrides={tableOverrides}
          onSetTableStatus={handleSetTableStatus}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          selectedTable={selectedTableForDetails}
          onSelectTable={setSelectedTableForDetails}
          onResetStatuses={handleResetStatuses}
          getTableStaffStatus={getTableStaffStatus}
          isSyncingTables={isSyncingTables}
          lastTablesSyncTime={lastTablesSyncTime}
          onSyncTables={() => syncTablesFromGoogleSheet(true)}
          onAddTable={handleAddTable}
          onRemoveTable={handleRemoveTable}
          onUpdateFloors={(updatedFloors) => {
            if (onUpdateRestaurantFloors) {
              onUpdateRestaurantFloors(activeRestaurant.id, updatedFloors);
            }
          }}
          onTableReposition={(tableId, newX, newY) => {
            const currentList = backendTables && backendTables.length > 0 ? backendTables : activeRestaurant.tables;
            const updated = currentList.map((t) => (t.id === tableId ? { ...t, x: newX, y: newY } : t));
            setBackendTables(updated);
            if (onUpdateRestaurantTables) {
              onUpdateRestaurantTables(activeRestaurant.id, updated);
            }
          }}
          isSubscriptionExpired={currentSubscription.status === 'expired'}
          onLockedFeatureClick={(msg) => setFeatureLockedModalMessage(msg)}
        />
      )}

      {/* VIEW 4: INSIGHTS & METRICS */}
      {dashboardView === 'insights' && (
        <InsightsTab restaurant={activeRestaurant} />
      )}

      {/* VIEW 13: OWNER CONSOLE & VENUE DETAILS */}
      {(dashboardView === 'owner-console' || dashboardView === 'owner-details' || dashboardView === 'settings') && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-6 animate-in fade-in duration-150" id="section-admin-details">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Restaurant Owner Console & Venue Details
                </h3>
                <span className="text-xs font-semibold text-[#4F6F52] bg-[#4F6F521A] px-3 py-1 rounded-full border border-[#4F6F52]/20">
                  Authorized Owner Console
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 mt-1">
                Enter, edit, and manage your restaurant identity, owner name, venue address, and customer care number. These details are stored in the restaurant profile and displayed clearly to customers on information and reservation pages.
              </p>
            </div>
            {isAuthorizedOwner && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authorized Admin</span>
              </span>
            )}
          </div>

          {!isAuthorizedOwner ? (
            <div className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
              <h4 className="text-base font-bold text-rose-950">Access Restricted</h4>
              <p className="text-xs text-rose-800">
                Only the authorized restaurant owner/admin can enter, edit, or manage these details.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Column */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E6E1]">
                  <h4 className="text-sm font-bold text-[#2C3333] flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#4F6F52]" />
                    <span>Venue Profile & Contact Management</span>
                  </h4>
                  {isProfileSaved && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Changes Saved in Database!</span>
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveRestaurantProfile} className="space-y-4">
                  <div>
                    <label htmlFor="admin-rest-name" className="block text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/70 mb-1">
                      Restaurant Name *
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-[#2C3333]/40 absolute left-3 top-3" />
                      <input
                        id="admin-rest-name"
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold text-[#2C3333] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] focus:ring-1 focus:ring-[#4F6F52]"
                        placeholder="e.g. The Ember Room"
                      />
                    </div>
                    <p className="text-[10px] text-[#2C3333]/50 mt-1">
                      Official venue name displayed across search cards, 2D floor plans, and digital booking tickets.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="admin-owner-name" className="block text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/70 mb-1">
                      Restaurant Owner / Admin Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#2C3333]/40 absolute left-3 top-3" />
                      <input
                        id="admin-owner-name"
                        type="text"
                        required
                        value={profileOwnerName}
                        onChange={(e) => setProfileOwnerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold text-[#2C3333] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] focus:ring-1 focus:ring-[#4F6F52]"
                        placeholder="e.g. Vikramaditya Rathore"
                      />
                    </div>
                    <p className="text-[10px] text-[#2C3333]/50 mt-1">
                      Authorized proprietor, General Manager, or host stand administrator.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="admin-address" className="block text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/70 mb-1">
                      Restaurant Address *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#2C3333]/40 absolute left-3 top-3" />
                      <textarea
                        id="admin-address"
                        required
                        rows={2}
                        value={profileAddress}
                        onChange={(e) => setProfileAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs font-medium text-[#2C3333] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] focus:ring-1 focus:ring-[#4F6F52]"
                        placeholder="e.g. 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038"
                      />
                    </div>
                    <p className="text-[10px] text-[#2C3333]/50 mt-1">
                      Full street address shown to customers on cards, directions, and reservation passes.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="admin-care-number" className="block text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/70 mb-1">
                      Restaurant Customer Care Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#4F6F52] absolute left-3 top-3" />
                      <input
                        id="admin-care-number"
                        type="text"
                        required
                        value={profileCustomerCare}
                        onChange={(e) => setProfileCustomerCare(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-[#4F6F52] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] focus:ring-1 focus:ring-[#4F6F52]"
                        placeholder="e.g. +91 98450 12260"
                      />
                    </div>
                    <p className="text-[10px] text-[#2C3333]/50 mt-1">
                      Direct customer care helpline. Displayed clearly on restaurant information and reservation pages for customer support.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="admin-number-of-floors" className="block text-[11px] font-bold uppercase tracking-wider text-[#2C3333]/70 mb-1">
                      Number of Floors *
                    </label>
                    <div className="relative">
                      <Layers className="w-4 h-4 text-[#4F6F52] absolute left-3 top-3" />
                      <input
                        id="admin-number-of-floors"
                        type="number"
                        min={1}
                        max={15}
                        required
                        value={profileNumberOfFloors}
                        onChange={(e) => setProfileNumberOfFloors(Number(e.target.value) || 1)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-[#4F6F52] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] focus:ring-1 focus:ring-[#4F6F52]"
                        placeholder="e.g. 3"
                      />
                    </div>
                    <p className="text-[10px] text-[#2C3333]/50 mt-1">
                      Total floors in your restaurant. Entering 3 creates Ground Floor, Floor 1, Floor 2. Entering 5 creates Ground Floor, Floor 1, Floor 2, Floor 3, Floor 4.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      id="btn-save-admin-details"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Restaurant Details</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Preview Column */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E6E1]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
                      Live Diner Preview
                    </span>
                    <span className="text-[10px] font-bold text-[#4F6F52] bg-[#4F6F5214] px-2 py-0.5 rounded-full">
                      Customer Facing
                    </span>
                  </div>

                  {/* Mock Discovery Card */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#4F6F52]">Discovery Card</span>
                      <span className="text-[9px] text-[#2C3333]/40">Bengaluru Dining</span>
                    </div>
                    <h5 className="font-bold font-serif text-base text-[#2C3333]">{profileName || 'Your Restaurant'}</h5>
                    <div className="flex items-start gap-1.5 text-xs text-[#2C3333]/70">
                      <MapPin className="w-3.5 h-3.5 text-[#4F6F52] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{profileAddress || 'Venue address in Bengaluru'}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#4F6F5214] border border-[#4F6F52]/20 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#4F6F52] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Care Helpline:
                      </span>
                      <span className="font-mono font-bold text-[#4F6F52]">{profileCustomerCare || '+91 98450 12260'}</span>
                    </div>
                  </div>

                  {/* Mock Reservation Pass */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#4F6F52]">Reservation Pass</span>
                      <span className="text-[9px] font-mono text-[#2C3333]/40">Ref: FT-BLR-0730</span>
                    </div>
                    <p className="text-xs font-semibold text-[#2C3333]">Table 04 • 2 Guests • 07:30 PM</p>
                    <p className="text-[11px] text-[#2C3333]/60">Host: {profileOwnerName || 'Owner Name'}</p>
                    <p className="text-[11px] text-[#2C3333]/70">{profileAddress || 'Venue Address'}</p>
                    <div className="text-[11px] font-semibold text-[#4F6F52] flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>Direct Customer Care: {profileCustomerCare || '+91 98450 12260'}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] space-y-2 text-xs text-[#2C3333]/70 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6F52] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Host Stand Service Parameters</span>
                    </span>
                    <div className="flex justify-between py-1 border-b border-[#E8E6E1]/60">
                      <span>Avg Dining Duration:</span>
                      <span className="font-semibold text-[#2C3333]">75 minutes</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E8E6E1]/60">
                      <span>Smart Arrival Geofence:</span>
                      <span className="font-semibold text-[#4F6F52]">500 meters</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E8E6E1]/60">
                      <span>No-Show Auto-Release:</span>
                      <span className="font-semibold text-[#2C3333]">15 min grace period</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Total Floor Capacity:</span>
                      <span className="font-semibold text-[#2C3333]">{totalTables} Tables ({totalTables * 2} Seats)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ALL RESERVATIONS QUEUE */}
      {dashboardView === 'reservations' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-6 animate-in fade-in duration-150" id="section-all-reservations">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Reservation Master Log
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Google Sheets Live
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 mt-0.5">
                All guest bookings for {activeRestaurant.name} (Google Sheet "Reservations" tab)
                {lastSyncTime && (
                  <span className="ml-1 text-[11px] text-[#4F6F52] font-mono">
                    • Last synced: {lastSyncTime}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => syncReservationsFromGoogleSheet(true)}
                disabled={isSyncingBackend}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#4F6F52] hover:text-white bg-[#4F6F5214] hover:bg-[#4F6F52] border border-[#4F6F52]/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Fetch latest reservations from Google Sheet"
                id="btn-sync-reservations-sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBackend ? 'animate-spin' : ''}`} />
                <span>{isSyncingBackend ? 'Syncing...' : 'Sync Sheet'}</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs text-[#2C3333]/70 font-medium bg-[#FAF9F6] px-3 py-1.5 rounded-full border border-[#E8E6E1]" id="reservations-sync-indicator">
                <span className={`w-2 h-2 rounded-full ${isSyncingBackend ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
                <span>{isSyncingBackend ? 'Syncing...' : (lastSyncTime ? `Last synced: ${lastSyncTime}` : 'Synced')}</span>
              </div>
              <span className="text-xs text-[#2C3333]/70 font-semibold bg-[#FAF9F6] px-3 py-1.5 rounded-full border border-[#E8E6E1]">
                Total: {currentReservations.length} Bookings
              </span>
            </div>
          </div>

          {/* Reservation Status Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-[#E8E6E1] pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setResFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                resFilter === 'all'
                  ? 'bg-[#2C3333] text-white shadow-xs'
                  : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1] border border-[#E8E6E1]'
              }`}
              id="filter-all-reservations"
            >
              <span>All Bookings</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${resFilter === 'all' ? 'bg-white/20' : 'bg-stone-200 text-stone-700'}`}>
                {currentReservations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResFilter('active')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                resFilter === 'active'
                  ? 'bg-[#4F6F52] text-white shadow-xs'
                  : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1] border border-[#E8E6E1]'
              }`}
              id="filter-active-reservations"
            >
              <span>Active Bookings</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${resFilter === 'active' ? 'bg-white/20' : 'bg-stone-200 text-stone-700'}`}>
                {activeReservationsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResFilter('cancelled')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                resFilter === 'cancelled'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
              id="filter-cancelled-reservations"
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Cancellations & Penalty Log</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${resFilter === 'cancelled' ? 'bg-white/20' : 'bg-rose-200 text-rose-900'}`}>
                {cancelledReservations.length}
              </span>
            </button>
          </div>

          <div className="space-y-3">
            {displayedReservations.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1] space-y-2">
                <AlertCircle className="w-8 h-8 text-[#2C3333]/40 mx-auto" />
                <p className="text-sm font-semibold text-[#2C3333]">
                  {resFilter === 'cancelled'
                    ? 'No cancelled reservations found for this restaurant.'
                    : 'No reservations found matching the current filter.'}
                </p>
                <p className="text-xs text-[#2C3333]/60">
                  {resFilter === 'cancelled'
                    ? 'All confirmed table reservations are active or completed with ₹0 penalty disputes.'
                    : 'Upcoming bookings will appear here in real time.'}
                </p>
              </div>
            ) : (
              displayedReservations.map((res) => {
              const hasSmartArrival = activeSmartArrivalGuests.some(
                (g) => g.reservation.id.toLowerCase() === res.id.toLowerCase()
              );
              const isCheckedIn = res.status === 'seated' || res.status === 'checked-in';
              const isCompleted = res.status === 'completed';

              return (
                <div
                  key={res.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    hasSmartArrival
                      ? 'bg-[#4F6F5214] border-[#4F6F52]/40 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#E8E6E1]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm font-serif text-[#2C3333]">
                        {res.customerName}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#4F6F52] bg-white px-2.5 py-0.5 rounded-full border border-[#E8E6E1]">
                        Table {res.tableNumber} — {res.timeIn && res.timeOut ? `${res.timeIn} → ${res.timeOut}` : res.timeSlot} — {res.status === 'confirmed' ? 'Reserved' : res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                      </span>
                      {res.durationFormatted && (
                        <span className="text-[10px] font-semibold text-[#2C3333]/70 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                          {res.durationFormatted}
                        </span>
                      )}
                      {hasSmartArrival && !isCompleted && (
                        <span className="text-[10px] font-bold text-white bg-[#4F6F52] px-2 py-0.5 rounded-full">
                          Smart Arrival Active
                        </span>
                      )}
                      {(() => {
                        const session = getDiningClockSession(res.id) || res.diningClockSession;
                        if (session?.status === 'clocked_in') {
                          return (
                            <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                              <span>Dining: In at {session.clockInDisplayTime}</span>
                            </span>
                          );
                        }
                        if (session?.status === 'clocked_out') {
                          return (
                            <span className="text-[10px] font-bold text-stone-700 bg-stone-200 border border-stone-300 px-2 py-0.5 rounded-full">
                              Duration: {session.durationFormatted} ({session.clockInDisplayTime} - {session.clockOutDisplayTime})
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-[#2C3333]/70">
                      <span>{res.guests} Guests • Slot: {res.timeSlot} • Ref: {res.bookingRef}</span>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {res.depositAmount && res.depositAmount > 0 ? `₹${res.depositAmount} Deposit Paid` : '₹200 Booking Deposit Paid'}
                      </span>
                    </div>
                    {res.seatingPreferences && (
                      <div className="text-[11px] text-[#4F6F52] font-medium">
                        Preferences: {res.seatingPreferences.join(', ')}
                      </div>
                    )}
                    {res.foodOrder && res.foodOrder.items && res.foodOrder.items.length > 0 && (
                      <div className="text-[11px] text-amber-900 font-medium flex items-center gap-1.5 mt-0.5">
                        <UtensilsCrossed className="w-3 h-3 text-amber-700" />
                        <span>Pre-Ordered Food: ₹{res.foodOrder.foodTotal} ({res.foodOrder.items.length} items • Status: {res.foodOrder.status})</span>
                      </div>
                    )}

                    {/* Cancellation & ₹100 Penalty Card for Restaurant Owner */}
                    {res.status === 'cancelled' && (() => {
                      const isFirst = res.cancellationCount === 1 || res.penaltyAmount === 0 || (res.cancellationPenalty === 0 && res.cancellationPenalty !== undefined) || res.penaltyApplicability === 'none_first_cancellation';
                      const fee = res.penaltyAmount ?? res.cancellationPenalty ?? (isFirst ? 0 : 100);
                      const applicability = res.penaltyApplicability === 'none_first_cancellation' || isFirst 
                        ? '1st Cancellation Grace (₹0 Fee)' 
                        : 'Applicable (₹100 Penalty)';
                      const pStatus = isFirst 
                        ? 'Waived (Grace Period)' 
                        : (res.penaltyStatus === 'paid' ? 'PAID' : (res.penaltyStatus || 'PAID'));

                      return (
                        <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-2 mt-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-rose-200/60">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="font-bold text-rose-950 font-serif text-sm">
                                {isFirst ? '1st Cancellation (Grace Exemption)' : `Cancellation #${res.cancellationCount || '2+'} Record`}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isFirst 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : 'bg-rose-100 text-rose-900 border-rose-300'
                              }`}>
                                {isFirst ? '₹0 Fee (1st Cancel)' : '₹100 Penalty Charged'}
                              </span>
                            </div>
                            {res.cancellationDate && (
                              <span className="text-[11px] text-rose-800/80 font-mono">
                                Cancelled: {res.cancellationDate}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div className="p-1.5 rounded-lg bg-white/70 border border-rose-100">
                              <span className="text-rose-900/60 block text-[10px]">Cancellation Count</span>
                              <span className="font-bold text-rose-950">
                                {res.cancellationCount ? `#${res.cancellationCount} for Diner` : (isFirst ? '1st for Diner' : '2nd+ for Diner')}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-white/70 border border-rose-100">
                              <span className="text-rose-900/60 block text-[10px]">Penalty Amount</span>
                              <span className={`font-bold font-mono ${isFirst ? 'text-emerald-700' : 'text-rose-700'}`}>
                                ₹{fee}.00 {isFirst ? '(Waived)' : ''}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-white/70 border border-rose-100">
                              <span className="text-rose-900/60 block text-[10px]">Applicability</span>
                              <span className="font-semibold text-rose-950 truncate block" title={applicability}>
                                {applicability}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-white/70 border border-rose-100">
                              <span className="text-rose-900/60 block text-[10px]">Payment Status</span>
                              <span className="font-bold uppercase text-[10px] text-emerald-800">
                                {pStatus}
                              </span>
                            </div>
                          </div>

                          {(res.cancellationTransactionId || res.cancellationPaymentMethod) && (
                            <div className="flex items-center justify-between text-[10px] text-rose-800 pt-1 border-t border-rose-200/50">
                              <span>Method: <strong>{res.cancellationPaymentMethod || (isFirst ? 'Grace Period Exemption' : 'Digital Payment')}</strong></span>
                              {res.cancellationTransactionId && (
                                <span className="font-mono bg-white/90 px-1.5 py-0.5 rounded border border-rose-200">
                                  Ref: {res.cancellationTransactionId}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      res.status === 'cancelled'
                        ? (res.cancellationCount === 1 || res.penaltyAmount === 0 || (res.cancellationPenalty === 0 && res.cancellationPenalty !== undefined)
                            ? 'bg-stone-100 text-stone-800 border border-stone-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300')
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : isCheckedIn
                        ? 'bg-[#2C3333] text-white'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {res.status === 'cancelled' 
                        ? (res.cancellationCount === 1 || res.penaltyAmount === 0 || (res.cancellationPenalty === 0 && res.cancellationPenalty !== undefined)
                            ? 'Cancelled (1st Cancel • ₹0 Fee)' 
                            : 'Cancelled (₹100 Penalty Paid)')
                        : isCompleted ? 'Completed' : isCheckedIn ? 'Seated' : 'Confirmed'}
                    </span>

                    {res.billSent && res.status !== 'cancelled' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Digital bill sent</span>
                      </span>
                    )}

                    {res.status === 'cancelled' && (
                      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                        Table Freed on Live 2D Plan
                      </span>
                    )}

                    {/* Complete Dining button for Checked In / Seated diners */}
                    {isCheckedIn && !isCompleted && res.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleCompleteDining(res)}
                        disabled={completingDiningId === res.id}
                        className="px-4 py-1.5 bg-[#4F6F52] hover:bg-[#2C3333] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        id={`btn-complete-dining-${res.id}`}
                      >
                        {completingDiningId === res.id ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Completing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete Dining</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Dining Bill / Settle Action */}
                    {res.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => setSelectedBillReservation(res)}
                        className="px-3.5 py-1.5 bg-[#FAF9F6] hover:bg-[#E8E6E1] text-[#2C3333] border border-[#E8E6E1] text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        title={isCompleted ? "View final dining bill and dispatch console" : "Generate dining bill with deposit deduction"}
                        id={`btn-staff-bill-${res.id}`}
                      >
                        <Receipt className="w-3.5 h-3.5 text-[#4F6F52]" />
                        <span>{isCompleted ? 'Final Dining Bill' : 'Dining Bill'}</span>
                      </button>
                    )}

                    {/* Manual Time In / Time Out — Restaurant Side */}
                    {res.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTimesReservation(res);
                          setRestaurantTimeIn(res.timeIn || '07:30 PM');
                          setRestaurantTimeOut(res.timeOut || '09:15 PM');
                          setRestaurantTimeReason('');
                        }}
                        className="px-3.5 py-1.5 bg-white hover:bg-[#FAF9F6] text-[#4F6F52] border border-[#4F6F52]/30 text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        title="Manually enter or adjust diner's Time In and Time Out"
                        id={`btn-edit-staff-times-${res.id}`}
                      >
                        <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
                        <span>Edit Times</span>
                      </button>
                    )}

                    {!isCheckedIn && !isCompleted && res.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleCheckInCustomer(res, 'Manual')}
                        disabled={isCheckingInId === res.id}
                        className="px-4 py-2 bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isCheckingInId === res.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Checking In...</span>
                          </>
                        ) : (
                          'Check In'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* VIEW: TRAVEL BOOKINGS FOR BUS PASSENGERS */}
      {dashboardView === 'travel-bookings' && (
        <TravelBookingsTab
          restaurant={activeRestaurant}
          reservations={reservations}
          onUpdateReservation={(resId, updated) => {
            const nextReservations = reservations.map((r) =>
              r.id === resId ? { ...r, ...updated } : r
            );
            if (onSyncReservations) {
              onSyncReservations(nextReservations);
            }
          }}
          onToast={onToast}
          onOpenQrScanner={() => setIsScannerModalOpen(true)}
        />
      )}

      {/* VIEW: FOOD ORDERS & KITCHEN QUEUE */}
      {dashboardView === 'food-orders' && (
        <FoodOrdersTab
          restaurant={activeRestaurant}
          reservations={currentReservations}
          onToast={onToast}
        />
      )}

      {/* VIEW: MENU MANAGEMENT & OUT OF STOCK */}
      {dashboardView === 'menu-management' && (
        <MenuManagementTab
          restaurant={activeRestaurant}
          onOpenDigitalMenu={() => setIsMenuOpen(true)}
          onToast={onToast}
        />
      )}

      {/* VIEW: RESTAURANT PARTNER SUBSCRIPTION PLANS */}
      {dashboardView === 'subscription-plans' && (
        <RestaurantSubscriptionPlansTab
          restaurant={activeRestaurant}
          onToast={onToast}
        />
      )}

      {/* VIEW 7: GUEST ARRIVAL & SMART GEOFENCING */}
      {dashboardView === 'guest-arrival' && (
        <div className="space-y-6 animate-in fade-in duration-150" id="section-guest-arrival">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Guest Arrival & Live Geofencing
                </h3>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Radar Active • 500m Indiranagar Perimeter</span>
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 mt-1">
                Real-time proximity detection for approaching guests with reserved tables at {activeRestaurant.name}. Kitchen staff receives automated timing signals to time food prep with arrival.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => syncReservationsFromGoogleSheet(true)}
                disabled={isSyncingBackend}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#4F6F52] bg-[#4F6F5214] hover:bg-[#4F6F52] hover:text-white border border-[#4F6F52]/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBackend ? 'animate-spin' : ''}`} />
                <span>Refresh Radar</span>
              </button>
            </div>
          </div>

          {/* Interactive Geofence Map */}
          <div className="bg-white p-6 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#2C3333] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#4F6F52]" />
                <span>Live Venue Radar & Approaching Coordinates</span>
              </h4>
              <span className="text-xs text-[#2C3333]/50">
                {activeSmartArrivalGuests.length} Active Geofenced Diner(s)
              </span>
            </div>
            <SmartArrivalMap
              activeRestaurant={activeRestaurant}
              liveArrivalRecords={liveArrivalRecords}
              currentActiveGuest={currentActiveGuest}
            />
          </div>

          {/* Approaching Diners Queue */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-4">
            <h4 className="text-base font-bold text-[#2C3333] font-serif flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4F6F52]" />
              <span>Approaching Diners & Kitchen Prep Recommendations</span>
            </h4>
            {activeSmartArrivalGuests.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E8E6E1] space-y-2">
                <Radio className="w-8 h-8 text-[#4F6F52]/40 mx-auto animate-pulse" />
                <p className="text-sm font-bold text-[#2C3333]">No diners currently approaching within the 500m geofence buffer</p>
                <p className="text-xs text-[#2C3333]/60 max-w-md mx-auto">
                  When a customer with an active reservation travels towards {activeRestaurant.name}, their ETA, distance, and kitchen preparation alerts will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSmartArrivalGuests.map(({ arrival, reservation, prepRecommendation }) => (
                  <div
                    key={arrival.reservationId}
                    className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3 shadow-2xs hover:border-[#4F6F52]/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#2C3333]">{reservation.customerName}</span>
                          <span className="text-[10px] font-mono font-bold text-[#4F6F52] bg-white px-2 py-0.5 rounded-full border border-[#E8E6E1]">
                            Table {reservation.tableNumber}
                          </span>
                        </div>
                        <p className="text-xs text-[#2C3333]/60 mt-0.5">
                          {reservation.guests} Guests • Ref: {reservation.bookingRef}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500 text-white animate-pulse">
                          ETA {arrival.etaMinutes || 5} mins
                        </span>
                        <p className="text-[10px] text-stone-500 mt-1 font-mono">
                          Dist: {formatDistance(arrival.distance || 450)}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-[#E8E6E1] text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                        Kitchen Recommendation
                      </span>
                      <p className="text-[#2C3333] font-medium">
                        {prepRecommendation?.summary || 'Prepare table setting and fire appetizers.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleCallGuest(arrival.customerPhone || reservation.customerPhone, reservation.customerName)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-[#E8E6E1] text-[#2C3333] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#4F6F52]" />
                        <span>Call Guest</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCheckInCustomer(reservation, 'Manual')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Seat & Check In
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 9: DIGITAL MENU */}
      {dashboardView === 'digital-menu' && (
        <div className="space-y-6 animate-in fade-in duration-150" id="section-digital-menu">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Digital Guest Menu
                </h3>
                <span className="text-xs font-semibold text-[#4F6F52] bg-[#4F6F521A] px-3 py-1 rounded-full border border-[#4F6F52]/20">
                  Interactive Table QR Menu
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 mt-1">
                Preview the live contactless dining menu for {activeRestaurant.name}. Diners scan table QR codes to browse dishes, check allergen tags, and place pre-orders.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsMenuQrOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer"
                id="btn-open-menu-qr"
              >
                <QrCode className="w-4 h-4" />
                <span>Show Menu QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setDashboardView('menu-management')}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#E8E6E1] text-[#2C3333] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <UtensilsCrossed className="w-4 h-4 text-[#4F6F52]" />
                <span>Manage Stock</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-sm">
            <DigitalMenuView
              restaurant={activeRestaurant}
              onClose={() => setDashboardView('summary')}
            />
          </div>
        </div>
      )}

      {/* VIEW 10: TABLE MANAGEMENT */}
      {dashboardView === 'table-management' && (
        <div className="space-y-6 animate-in fade-in duration-150" id="section-table-management">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Table Inventory & Capacity Management
                </h3>
                <span className="text-xs font-semibold text-[#4F6F52] bg-[#4F6F521A] px-3 py-1 rounded-full border border-[#4F6F52]/20">
                  Host Stand Controls
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 mt-1">
                Configure table seating capacities, dining zones, shapes, and live shift statuses for {activeRestaurant.name}.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (currentSubscription.status === 'expired') {
                    setFeatureLockedModalMessage('Adding tables to your live floor plan requires an active FlashTable Partner Plan. Renew your subscription to unlock this feature.');
                  } else {
                    setIsAddTableModalOpen(true);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
                id="btn-add-table-mgmt"
              >
                <Armchair className="w-4 h-4" />
                <span>+ Add Table</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTableToRemove(backendTables && backendTables.length > 0 ? backendTables[0] : activeRestaurant.tables[0]);
                  setIsRemoveTableModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-[#E8E6E1] hover:border-rose-300 text-[#2C3333] hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                id="btn-remove-table-mgmt"
              >
                <span>Remove Table</span>
              </button>
              <button
                type="button"
                onClick={() => syncTablesFromGoogleSheet(true)}
                disabled={isSyncingTables}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-[#E8E6E1] text-[#2C3333] text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTables ? 'animate-spin' : ''}`} />
                <span>Sync Tables</span>
              </button>
            </div>
          </div>

          {/* Table Metrics Summary Cards */}
          {(() => {
            const tableList = backendTables && backendTables.length > 0 ? backendTables : activeRestaurant.tables;
            const totalCapacity = tableList.reduce((acc, t) => acc + (t.capacity || 2), 0);
            const availCount = tableList.filter(t => getTableStaffStatus(t) === 'available').length;
            const resCount = tableList.filter(t => getTableStaffStatus(t) === 'reserved').length;
            const occCount = tableList.filter(t => getTableStaffStatus(t) === 'occupied').length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/60 block">Total Tables</span>
                  <span className="text-2xl font-bold font-serif text-[#2C3333] mt-1 block">{tableList.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/60 block">Total Seats</span>
                  <span className="text-2xl font-bold font-serif text-[#4F6F52] mt-1 block">{totalCapacity}</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Available</span>
                  <span className="text-2xl font-bold font-serif text-emerald-900 mt-1 block">{availCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Reserved</span>
                  <span className="text-2xl font-bold font-serif text-amber-900 mt-1 block">{resCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 block">Occupied</span>
                  <span className="text-2xl font-bold font-serif text-stone-900 mt-1 block">{occCount}</span>
                </div>
              </div>
            );
          })()}

          {/* Table Inventory Master List */}
          <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6E1]">
              <h4 className="text-sm font-bold text-[#2C3333] uppercase tracking-wider">
                Active Tables Master Register ({backendTables && backendTables.length > 0 ? backendTables.length : activeRestaurant.tables.length})
              </h4>
              <button
                type="button"
                onClick={handleResetStatuses}
                className="text-xs text-[#4F6F52] hover:underline font-semibold cursor-pointer"
              >
                Reset Shift Statuses
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(backendTables && backendTables.length > 0 ? backendTables : activeRestaurant.tables).map((table) => {
                const currentStatus = getTableStaffStatus(table);
                return (
                  <div
                    key={table.id}
                    className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] hover:border-[#4F6F52]/40 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#E8E6E1] flex items-center justify-center font-bold text-xs font-mono text-[#2C3333]">
                          {table.tableNumber}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#2C3333] block">Table {table.tableNumber}</span>
                          <span className="text-[10px] text-[#2C3333]/60">{table.section || 'Main Dining'}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        currentStatus === 'available'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : currentStatus === 'reserved'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : currentStatus === 'occupied'
                          ? 'bg-stone-200 text-stone-900 border border-stone-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {currentStatus}
                      </span>
                    </div>

                    <div className="text-xs text-[#2C3333]/70 space-y-1">
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span className="font-semibold text-[#2C3333]">{table.capacity} Guests (Min {table.minCapacity || 1})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shape:</span>
                        <span className="font-semibold capitalize text-[#2C3333]">{table.shape || 'rect'}</span>
                      </div>
                      {table.features && table.features.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          {table.features.map(f => (
                            <span key={f} className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-[#E8E6E1] text-[#2C3333]/70">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="pt-2 border-t border-[#E8E6E1] flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetTableStatus(table.id, 'available')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            currentStatus === 'available' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          Avail
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetTableStatus(table.id, 'reserved')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            currentStatus === 'reserved' ? 'bg-amber-500 text-white' : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          Res
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetTableStatus(table.id, 'occupied')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            currentStatus === 'occupied' ? 'bg-stone-700 text-white' : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200'
                          }`}
                        >
                          Occ
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTableToRemove(table);
                          setIsRemoveTableModalOpen(true);
                        }}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Remove Table"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 11: FLOOR MANAGEMENT */}
      {dashboardView === 'floor-management' && (
        <div className="space-y-6 animate-in fade-in duration-150" id="section-floor-management">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Floor Management & Multi-Level Layout
                </h3>
                <span className="text-xs font-semibold text-[#4F6F52] bg-[#4F6F521A] px-3 py-1 rounded-full border border-[#4F6F52]/20">
                  Multi-Level Dining
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 mt-1">
                Configure dining levels, floor titles, and seating zones for {activeRestaurant.name}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (currentSubscription.status === 'expired') {
                  setFeatureLockedModalMessage('Multi-level floor layout configuration requires an active FlashTable Partner Plan. Renew your subscription to unlock this feature.');
                } else {
                  setIsManageFloorsModalOpen(true);
                }
              }}
              className="px-4 py-2 rounded-xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
              id="btn-manage-floors-modal"
            >
              <Layers className="w-4 h-4" />
              <span>Configure Floors</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(activeRestaurant.floors && activeRestaurant.floors.length > 0 ? activeRestaurant.floors : getDefaultFloors(profileNumberOfFloors)).map((floor, idx) => (
              <div
                key={floor.id || idx}
                className="p-6 rounded-3xl bg-white border border-[#E8E6E1] space-y-4 shadow-sm hover:border-[#4F6F52]/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center font-bold text-sm">
                    {idx === 0 ? 'GF' : `F${idx}`}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Active Level
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2C3333] font-serif">{floor.name}</h4>
                  <p className="text-xs text-[#2C3333]/60 mt-0.5">
                    Level {floor.level} • {floor.tables ? floor.tables.length : Math.round(activeRestaurant.tables.length / profileNumberOfFloors)} Tables Configured
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs text-[#2C3333]/70 space-y-1">
                  <div className="flex justify-between">
                    <span>Floor Area:</span>
                    <span className="font-semibold text-[#2C3333]">Main Dining & Bar</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Layout:</span>
                    <span className="font-semibold text-[#4F6F52]">2D Interactive</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 12: CANCELLATIONS & PENALTIES */}
      {dashboardView === 'cancellations' && (
        <div className="space-y-6 animate-in fade-in duration-150" id="section-cancellations-penalties">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Cancellations & Penalty Auditing
                </h3>
                <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  Transparency & Fraud Deterrence
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 mt-1">
                Master audit trail for booking cancellations, automatic fee calculations, and table release tracking for {activeRestaurant.name}.
              </p>
            </div>
            <span className="text-xs font-bold text-[#4F6F52] bg-[#FAF9F6] px-3.5 py-1.5 rounded-full border border-[#E8E6E1]">
              Total Records: {cancelledReservations.length}
            </span>
          </div>

          {/* Cancellation KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E8E6E1] shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/60 block">Total Cancellations</span>
              <span className="text-3xl font-bold font-serif text-[#2C3333] mt-1 block">{cancelledReservations.length}</span>
            </div>
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">1st-Time Free (Grace)</span>
              <span className="text-3xl font-bold font-serif text-emerald-900 mt-1 block">{firstTimeCancellationsCount}</span>
              <span className="text-[10px] text-emerald-700 font-medium">₹0 Fee Waived</span>
            </div>
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Penalized Cancellations</span>
              <span className="text-3xl font-bold font-serif text-rose-900 mt-1 block">{penalizedCancellationsCount}</span>
              <span className="text-[10px] text-rose-700 font-medium">₹100 Deterrent Fee</span>
            </div>
            <div className="p-5 rounded-2xl bg-stone-900 text-white shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Penalties Paid</span>
              <span className="text-3xl font-bold font-serif text-emerald-400 mt-1 block">₹{totalPenaltyRevenue}.00</span>
              <span className="text-[10px] text-stone-400 font-medium">Credited to Restaurant</span>
            </div>
          </div>

          {/* Cancellation Log Table */}
          <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-[#2C3333] font-serif">
              Master Cancellation & Penalty Register
            </h4>
            {cancelledReservations.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E8E6E1]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#2C3333]">Zero cancellations recorded</p>
                <p className="text-xs text-[#2C3333]/60 mt-1">All reservations are active or completed with 100% turn reliability.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E6E1] overflow-x-auto">
                {cancelledReservations.map((res) => {
                  const isFirst = res.cancellationCount === 1 || res.penaltyAmount === 0 || (res.cancellationPenalty === 0 && res.cancellationPenalty !== undefined);
                  const fee = res.penaltyAmount ?? res.cancellationPenalty ?? (isFirst ? 0 : 100);

                  return (
                    <div key={res.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#2C3333]">{res.customerName}</span>
                          <span className="font-mono text-[11px] text-[#4F6F52] bg-[#4F6F5214] px-2 py-0.5 rounded">
                            {res.bookingRef}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#2C3333]/60 mt-0.5">
                          Table {res.tableNumber} • Slot: {res.timeSlot} • Date: {res.date}
                        </p>
                        {res.cancellationReason && (
                          <p className="text-[11px] text-stone-600 italic mt-0.5">
                            Reason: "{res.cancellationReason}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 self-start sm:self-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                          isFirst ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isFirst ? '₹0.00 (Grace Period)' : `₹${fee}.00 Penalty Paid`}
                        </span>
                        <span className="text-[11px] text-[#4F6F52] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                          Table Freed on 2D Plan
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dedicated QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        activeRestaurant={activeRestaurant}
        reservations={reservations}
        onCheckInCustomer={(res) => handleCheckInCustomer(res, 'QR')}
        onSwitchToManual={() => {
          setActiveCheckInMethod('manual');
          setTimeout(() => manualInputRef.current?.focus(), 100);
        }}
      />

      {/* Digital Menu Modal for Active Restaurant */}
      {isMenuOpen && (
        <DigitalMenuView
          restaurant={activeRestaurant}
          onClose={() => setIsMenuOpen(false)}
        />
      )}

      {/* Menu QR Modal for Active Restaurant */}
      {isMenuQrOpen && (
        <MenuQrModal
          restaurant={activeRestaurant}
          onClose={() => setIsMenuQrOpen(false)}
          onViewFullMenu={() => {
            setIsMenuQrOpen(false);
            setIsMenuOpen(true);
          }}
        />
      )}

      {/* Dining Bill Modal for Staff Settle/Checkout */}
      {selectedBillReservation && (
        <DiningBillModal
          reservation={reservations.find((r) => r.id === selectedBillReservation.id) || selectedBillReservation}
          isStaffView={true}
          onSendBill={handleSendBillToCustomer}
          onClose={() => setSelectedBillReservation(null)}
        />
      )}

      {/* Staff Manual Time In / Time Out Modal */}
      {editingTimesReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E8E6E1] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6E1]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#2C3333]">Update Time In & Time Out</h3>
                  <p className="text-xs text-stone-500">
                    {editingTimesReservation.customerName} • Table {editingTimesReservation.tableNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTimesReservation(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2C3333] mb-1">
                  Time In (Manual Entry):
                </label>
                <input
                  type="text"
                  value={restaurantTimeIn}
                  onChange={(e) => setRestaurantTimeIn(e.target.value)}
                  placeholder="e.g. 07:30 PM"
                  className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs font-bold font-mono text-[#2C3333] focus:border-[#4F6F52] outline-none"
                  id="staff-timein-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3333] mb-1">
                  Time Out (Manual Entry):
                </label>
                <input
                  type="text"
                  value={restaurantTimeOut}
                  onChange={(e) => setRestaurantTimeOut(e.target.value)}
                  placeholder="e.g. 09:15 PM"
                  className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs font-bold font-mono text-[#2C3333] focus:border-[#4F6F52] outline-none"
                  id="staff-timeout-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3333] mb-1">
                  Reason / Modification Note (Audit Trail):
                </label>
                <input
                  type="text"
                  value={restaurantTimeReason}
                  onChange={(e) => setRestaurantTimeReason(e.target.value)}
                  placeholder="e.g. Customer arrived 15 mins late; session extended"
                  className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#2C3333] focus:border-[#4F6F52] outline-none"
                  id="staff-timereason-input"
                />
              </div>

              <p className="text-[11px] text-stone-500 bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E8E6E1]">
                Changes are saved to the reservation record, reflected immediately on the diner's view, and logged to the Company Administration audit trail.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingTimesReservation(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingRestaurantTimes || !restaurantTimeIn.trim() || !restaurantTimeOut.trim()}
                onClick={handleSaveStaffTimeInOut}
                className="px-5 py-2 rounded-xl bg-[#4F6F52] hover:bg-[#3D5A40] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                id="staff-save-times-btn"
              >
                {isSavingRestaurantTimes ? 'Saving...' : 'Save & Sync Times'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {isAddTableModalOpen && (
        <AddTableModal
          restaurantId={activeRestaurant.id}
          restaurantName={activeRestaurant.name}
          existingTables={backendTables && backendTables.length > 0 ? backendTables : activeRestaurant.tables}
          floors={ensureRestaurantFloors(activeRestaurant)}
          onClose={() => setIsAddTableModalOpen(false)}
          onAddTable={handleAddTable}
        />
      )}

      {/* Remove Table Modal */}
      {isRemoveTableModalOpen && (
        <RemoveTableModal
          table={tableToRemove || (backendTables && backendTables.length > 0 ? backendTables[0] : activeRestaurant.tables[0])}
          restaurantId={activeRestaurant.id}
          restaurantName={activeRestaurant.name}
          reservations={currentReservations}
          onClose={() => {
            setIsRemoveTableModalOpen(false);
            setTableToRemove(null);
          }}
          onConfirmRemove={handleRemoveTable}
        />
      )}

      {/* Manage Floors Modal */}
      {isManageFloorsModalOpen && (
        <ManageFloorsModal
          restaurantName={activeRestaurant.name}
          floors={activeRestaurant.floors || getDefaultFloors(profileNumberOfFloors)}
          onClose={() => setIsManageFloorsModalOpen(false)}
          onUpdateFloors={(updatedFloors) => {
            if (onUpdateRestaurantFloors) {
              onUpdateRestaurantFloors(activeRestaurant.id, updatedFloors);
            }
            setActiveRestaurant({
              ...activeRestaurant,
              floors: updatedFloors,
              numberOfFloors: updatedFloors.length,
            });
            setProfileNumberOfFloors(updatedFloors.length);
          }}
          tableCountsByFloor={{}}
        />
      )}

      {/* Subscription Expiry Modal (Automated 7d, 3d, 1d, and Expired Popups) */}
      <SubscriptionExpiryModal
        isOpen={isExpiryModalOpen}
        tier={expiryModalTier}
        subscription={currentSubscription}
        restaurant={activeRestaurant}
        onClose={handleCloseExpiryModal}
        onRenew={handleRenewFromExpiryModal}
        onViewPlans={handleViewPlansFromExpiryModal}
      />

      {/* Feature Locked Modal for Expired Subscription */}
      {featureLockedModalMessage && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          id="modal-feature-locked"
        >
          <div className="bg-white rounded-3xl border border-[#E8E6E1] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6E1]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2C3333] font-serif">Feature Locked — Expired Plan</h4>
                  <p className="text-[11px] text-stone-500">FlashTable Partner Service</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeatureLockedModalMessage(null)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {featureLockedModalMessage}
            </p>
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Data Safe:</strong> Your restaurant profile, customer bookings, check-in logs, and historical analytics remain completely preserved and accessible.
              </span>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFeatureLockedModalMessage(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeatureLockedModalMessage(null);
                  setDashboardView('subscription-plans');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Renew Subscription</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

