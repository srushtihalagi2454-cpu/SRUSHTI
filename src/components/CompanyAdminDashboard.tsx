import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, 
  Store, 
  Users, 
  CalendarCheck, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  Ban, 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  Building2, 
  Lock, 
  LogOut, 
  FileText, 
  Sliders, 
  X, 
  Info,
  Calendar,
  Layers,
  MapPin,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Restaurant, Reservation, UserAccount, AuditLogEntry } from '../types';
import { 
  getAuditLogs, 
  getUserAccounts, 
  suspendAccount, 
  restoreAccount,
  recordAuditLog 
} from '../services/adminService';

interface CompanyAdminDashboardProps {
  restaurants: Restaurant[];
  reservations: Reservation[];
  onSignOut: () => void;
  onUpdateRestaurants?: (restaurants: Restaurant[]) => void;
  onUpdateReservations?: (reservations: Reservation[]) => void;
  onNavigateHome?: () => void;
}

type AdminTab = 'overview' | 'restaurants' | 'owners' | 'customers' | 'bookings' | 'misuse' | 'audit-logs';

export const CompanyAdminDashboard: React.FC<CompanyAdminDashboardProps> = ({
  restaurants,
  reservations,
  onSignOut,
  onUpdateRestaurants,
  onUpdateReservations,
  onNavigateHome,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getAuditLogs());
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => getUserAccounts());

  // Modal for suspending an account or restaurant
  const [suspensionModal, setSuspensionModal] = useState<{
    isOpen: boolean;
    type: 'user' | 'restaurant';
    id: string;
    name: string;
    reason: string;
  } | null>(null);

  // Selected reservation details drawer
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const refreshAdminData = () => {
    setAuditLogs(getAuditLogs());
    setUserAccounts(getUserAccounts());
  };

  useEffect(() => {
    refreshAdminData();
  }, []);

  // Filtered customer accounts
  const customerAccounts = useMemo(() => {
    return userAccounts.filter((u) => u.role === 'customer');
  }, [userAccounts]);

  // Filtered owner accounts
  const ownerAccounts = useMemo(() => {
    return userAccounts.filter((u) => u.role === 'restaurant-owner');
  }, [userAccounts]);

  // Key platform metrics
  const stats = useMemo(() => {
    const totalRest = restaurants.length;
    const suspendedRest = restaurants.filter((r) => r.isSuspended).length;
    const totalUsers = userAccounts.length;
    const suspendedUsers = userAccounts.filter((u) => u.isSuspended).length;
    const totalBookings = reservations.length;
    const cancelledBookings = reservations.filter((r) => r.status === 'cancelled').length;
    const suspiciousLogs = auditLogs.filter((l) => l.isSuspicious).length;

    const timeModificationsCount = auditLogs.filter(
      (l) => l.action === 'time_in_changed' || l.action === 'time_out_changed'
    ).length;

    return {
      totalRest,
      suspendedRest,
      totalUsers,
      suspendedUsers,
      totalBookings,
      cancelledBookings,
      suspiciousLogs,
      timeModificationsCount,
    };
  }, [restaurants, userAccounts, reservations, auditLogs]);

  // Suspend action handler
  const handleConfirmSuspension = () => {
    if (!suspensionModal || !suspensionModal.reason.trim()) return;

    if (suspensionModal.type === 'restaurant') {
      const updated = restaurants.map((r) =>
        r.id === suspensionModal.id
          ? { ...r, isSuspended: true, suspensionReason: suspensionModal.reason }
          : r
      );
      if (onUpdateRestaurants) onUpdateRestaurants(updated);

      recordAuditLog({
        userId: 'USR-ADMIN-1',
        userName: 'Company Super Admin',
        userRole: 'company-admin',
        action: 'restaurant_details_changed',
        entityType: 'restaurant',
        entityId: suspensionModal.id,
        restaurantId: suspensionModal.id,
        restaurantName: suspensionModal.name,
        details: `Suspended venue operation. Reason: ${suspensionModal.reason}`,
        isSuspicious: true,
        suspiciousReason: suspensionModal.reason,
      });
    } else {
      suspendAccount(suspensionModal.id, suspensionModal.reason, 'Company Super Admin');
    }

    refreshAdminData();
    setSuspensionModal(null);
  };

  // Restore action handler
  const handleRestore = (type: 'user' | 'restaurant', id: string, name: string) => {
    if (type === 'restaurant') {
      const updated = restaurants.map((r) =>
        r.id === id ? { ...r, isSuspended: false, suspensionReason: undefined } : r
      );
      if (onUpdateRestaurants) onUpdateRestaurants(updated);

      recordAuditLog({
        userId: 'USR-ADMIN-1',
        userName: 'Company Super Admin',
        userRole: 'company-admin',
        action: 'restaurant_details_changed',
        entityType: 'restaurant',
        entityId: id,
        restaurantId: id,
        restaurantName: name,
        details: `Restored venue operations for ${name}`,
      });
    } else {
      restoreAccount(id, 'Company Super Admin');
    }

    refreshAdminData();
  };

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.bookingRef && r.bookingRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        selectedStatusFilter === 'all' || r.status.toLowerCase() === selectedStatusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [reservations, searchQuery, selectedStatusFilter]);

  // Suspicious & misuse events list
  const suspiciousEvents = useMemo(() => {
    return auditLogs.filter((l) => l.isSuspicious);
  }, [auditLogs]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2C3333] flex flex-col font-sans">
      {/* Top Admin Security Bar */}
      <div className="bg-[#1C2524] text-white border-b border-[#2C3836] px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
            <ShieldAlert className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white font-display text-base">
                Flash<span className="text-emerald-400">Table</span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Super Admin Console
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden sm:block">
              Platform Governance, Integrity Monitoring & Misuse Prevention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={refreshAdminData}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh System Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync Logs</span>
          </button>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Customer Portal</span>
            </button>
          )}

          <button
            onClick={onSignOut}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            id="admin-signout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8E6E1]">
          {[
            { id: 'overview', label: 'Platform Overview', icon: TrendingUp },
            { id: 'restaurants', label: `Restaurants (${restaurants.length})`, icon: Store },
            { id: 'owners', label: `Restaurant Owners (${ownerAccounts.length})`, icon: Building2 },
            { id: 'customers', label: `Customers (${customerAccounts.length})`, icon: Users },
            { id: 'bookings', label: `Reservations (${reservations.length})`, icon: CalendarCheck },
            { id: 'misuse', label: `Misuse & Alerts (${suspiciousEvents.length})`, icon: AlertTriangle, badgeColor: suspiciousEvents.length > 0 ? 'bg-amber-500 text-stone-950 font-bold' : undefined },
            { id: 'audit-logs', label: `Audit Log (${auditLogs.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#4F6F52] text-white shadow-xs'
                    : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333]/80 border border-[#E8E6E1]'
                }`}
                id={`tab-${tab.id}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#4F6F52]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C3333]/60 uppercase tracking-wider">Restaurants</span>
                  <Store className="w-4 h-4 text-[#4F6F52]" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-serif text-[#2C3333]">{stats.totalRest}</span>
                  {stats.suspendedRest > 0 && (
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      {stats.suspendedRest} Suspended
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#2C3333]/50 mt-1">Managed dining venues</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C3333]/60 uppercase tracking-wider">Total Diners</span>
                  <Users className="w-4 h-4 text-[#4F6F52]" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-serif text-[#2C3333]">{customerAccounts.length}</span>
                  {stats.suspendedUsers > 0 && (
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      {stats.suspendedUsers} Suspended
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#2C3333]/50 mt-1">Registered customer accounts</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C3333]/60 uppercase tracking-wider">Bookings</span>
                  <CalendarCheck className="w-4 h-4 text-[#4F6F52]" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-serif text-[#2C3333]">{stats.totalBookings}</span>
                  <span className="text-[11px] font-semibold text-stone-500">
                    ({stats.cancelledBookings} Cancelled)
                  </span>
                </div>
                <p className="text-[11px] text-[#2C3333]/50 mt-1">Total dining reservations</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C3333]/60 uppercase tracking-wider">Security Alerts</span>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-2xl font-bold font-serif ${stats.suspiciousLogs > 0 ? 'text-amber-700' : 'text-[#2C3333]'}`}>
                    {stats.suspiciousLogs}
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {stats.timeModificationsCount} Time Shifts
                  </span>
                </div>
                <p className="text-[11px] text-[#2C3333]/50 mt-1">Misuse & schedule modifications</p>
              </div>
            </div>

            {/* Quick Overview Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Audit Activity */}
              <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 shadow-xs flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-[#E8E6E1]">
                  <div>
                    <h3 className="font-bold text-base text-[#2C3333]">Live System Governance Log</h3>
                    <p className="text-xs text-[#2C3333]/60">Platform actions recorded in real-time</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('audit-logs')}
                    className="text-xs font-bold text-[#4F6F52] hover:underline"
                  >
                    View All →
                  </button>
                </div>

                <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-96 pr-1">
                  {auditLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-2xl border text-xs flex flex-col gap-1.5 transition-colors ${
                        log.isSuspicious
                          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                          : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2C3333]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold px-2 py-0.5 rounded-md bg-white border border-[#E8E6E1] text-[10px] uppercase">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-[#2C3333]/70 font-semibold">{log.userName}</span>
                        </div>
                        <span className="text-[10px] text-stone-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs">{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Reservations with Time In / Out */}
              <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 shadow-xs flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-[#E8E6E1]">
                  <div>
                    <h3 className="font-bold text-base text-[#2C3333]">Latest Reservations & Schedule</h3>
                    <p className="text-xs text-[#2C3333]/60">Monitor diner Time In and Time Out status</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-[#4F6F52] hover:underline"
                  >
                    View All →
                  </button>
                </div>

                <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-96 pr-1">
                  {reservations.slice(0, 6).map((res) => (
                    <div
                      key={res.id}
                      onClick={() => setSelectedReservation(res)}
                      className="p-3.5 rounded-2xl border border-[#E8E6E1] bg-[#FAF9F6] hover:bg-white hover:border-[#4F6F52]/40 text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#2C3333]">{res.customerName}</span>
                          <span className="text-[10px] text-stone-500">({res.bookingRef || res.id})</span>
                        </div>
                        <p className="text-[11px] text-[#2C3333]/70 mt-0.5">
                          {res.restaurantName} • Table {res.tableNumber}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F6F52]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{res.timeIn && res.timeOut ? `${res.timeIn} - ${res.timeOut}` : res.timeSlot}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          res.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                          res.status === 'seated' ? 'bg-blue-50 text-blue-700' :
                          res.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-700'
                        }`}>
                          {res.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESTAURANTS */}
        {activeTab === 'restaurants' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E8E6E1]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search restaurant name, ID, neighborhood..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs outline-none focus:border-[#4F6F52]"
                />
              </div>
              <span className="text-xs text-stone-500">{restaurants.length} Registered Venues</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {restaurants
                .filter(
                  (r) =>
                    searchQuery === '' ||
                    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((rest) => {
                  const isSuspended = Boolean(rest.isSuspended);
                  const activeBookingsCount = reservations.filter(
                    (res) => res.restaurantId === rest.id && res.status !== 'cancelled'
                  ).length;

                  return (
                    <div
                      key={rest.id}
                      className={`bg-white rounded-3xl border p-5 flex flex-col justify-between transition-all shadow-2xs ${
                        isSuspended ? 'border-rose-300 bg-rose-50/20' : 'border-[#E8E6E1] hover:border-[#4F6F52]/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                              {rest.id}
                            </span>
                            <h4 className="font-bold text-base text-[#2C3333] mt-0.5">{rest.name}</h4>
                            <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#4F6F52]" />
                              <span>{rest.neighborhood}, {rest.city}</span>
                            </p>
                          </div>
                          {isSuspended ? (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="mt-4 pt-3 border-t border-[#E8E6E1] grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E8E6E1]">
                            <span className="block text-stone-400 text-[10px]">Floors</span>
                            <span className="font-bold text-[#2C3333]">{rest.numberOfFloors || rest.floors?.length || 2}</span>
                          </div>
                          <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E8E6E1]">
                            <span className="block text-stone-400 text-[10px]">Tables</span>
                            <span className="font-bold text-[#2C3333]">{rest.tables?.length || 10}</span>
                          </div>
                          <div className="bg-[#FAF9F6] p-2 rounded-xl border border-[#E8E6E1]">
                            <span className="block text-stone-400 text-[10px]">Bookings</span>
                            <span className="font-bold text-[#4F6F52]">{activeBookingsCount}</span>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-[#2C3333]/70 space-y-1">
                          <p><strong className="text-stone-600">Owner:</strong> {rest.ownerName || 'Vikramaditya Rathore'}</p>
                          <p><strong className="text-stone-600">Contact:</strong> {rest.contactNumber || rest.customerCareNumber || '+91 98450 12260'}</p>
                          {isSuspended && rest.suspensionReason && (
                            <p className="text-rose-700 bg-rose-50 p-2 rounded-lg mt-2 text-[11px]">
                              <strong>Suspension Note:</strong> {rest.suspensionReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-5 pt-3 border-t border-[#E8E6E1] flex items-center justify-between gap-2">
                        {isSuspended ? (
                          <button
                            onClick={() => handleRestore('restaurant', rest.id, rest.name)}
                            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore Restaurant Account</span>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setSuspensionModal({
                                isOpen: true,
                                type: 'restaurant',
                                id: rest.id,
                                name: rest.name,
                                reason: '',
                              })
                            }
                            className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Suspend Venue Operations</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 3: RESTAURANT OWNERS */}
        {activeTab === 'owners' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-[#E8E6E1] overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#E8E6E1] flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#2C3333]">Restaurant Owner Accounts ({ownerAccounts.length})</h3>
                <span className="text-xs text-stone-500">Partner Credentials & Access Control</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#2C3333]">
                  <thead className="bg-[#FAF9F6] border-b border-[#E8E6E1] text-stone-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">User / Owner</th>
                      <th className="py-3 px-4 font-bold">Venue</th>
                      <th className="py-3 px-4 font-bold">Contact</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1]/60">
                    {ownerAccounts.map((owner) => {
                      const rest = restaurants.find((r) => r.id === owner.restaurantId);
                      const isSuspended = Boolean(owner.isSuspended);

                      return (
                        <tr key={owner.userId} className="hover:bg-[#FAF9F6] transition-colors">
                          <td className="py-3.5 px-4 font-semibold">
                            <div>{owner.fullName}</div>
                            <span className="text-[10px] text-stone-400">{owner.userId}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-[#4F6F52]">{rest ? rest.name : (owner.restaurantId || 'Assigned Venue')}</span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-600">
                            <div>{owner.email || '—'}</div>
                            <div className="text-[11px] text-stone-400">{owner.phone || owner.mobile || '—'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {isSuspended ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                                Suspended
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isSuspended ? (
                              <button
                                onClick={() => handleRestore('user', owner.userId, owner.fullName)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                Restore Account
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setSuspensionModal({
                                    isOpen: true,
                                    type: 'user',
                                    id: owner.userId,
                                    name: owner.fullName,
                                    reason: '',
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Suspend Account
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-[#E8E6E1] overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#E8E6E1] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#2C3333]">Customer Accounts ({customerAccounts.length})</h3>
                  <p className="text-[11px] text-[#2C3333]/60">View registered diners, status, and account activity</p>
                </div>
                <span className="text-xs text-stone-500">Platform Users</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#2C3333]">
                  <thead className="bg-[#FAF9F6] border-b border-[#E8E6E1] text-stone-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Customer</th>
                      <th className="py-3 px-4 font-bold">Contact</th>
                      <th className="py-3 px-4 font-bold">Language</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1]/60">
                    {customerAccounts.map((cust) => {
                      const isSuspended = Boolean(cust.isSuspended);
                      const isDeleted = Boolean(cust.isDeleted);

                      return (
                        <tr key={cust.userId} className="hover:bg-[#FAF9F6] transition-colors">
                          <td className="py-3.5 px-4 font-semibold">
                            <div>{cust.fullName}</div>
                            <span className="text-[10px] text-stone-400">{cust.userId}</span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-600">
                            <div>{cust.email || '—'}</div>
                            <div className="text-[11px] text-stone-400">{cust.phone || cust.mobile || '—'}</div>
                          </td>
                          <td className="py-3.5 px-4 uppercase text-[11px] font-bold text-stone-600">
                            {cust.preferredLanguage || 'en'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isDeleted ? (
                              <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                                Deactivated / Deleted
                              </span>
                            ) : isSuspended ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                                Suspended
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isDeleted ? (
                              <span className="text-stone-400 text-xs italic">Personal data anonymized</span>
                            ) : isSuspended ? (
                              <button
                                onClick={() => handleRestore('user', cust.userId, cust.fullName)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setSuspensionModal({
                                    isOpen: true,
                                    type: 'user',
                                    id: cust.userId,
                                    name: cust.fullName,
                                    reason: '',
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Suspend Account
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RESERVATIONS / BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E8E6E1]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by ref, diner name, table, venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs outline-none focus:border-[#4F6F52]"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="seated">Seated</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <span className="text-xs text-stone-500 whitespace-nowrap">
                  {filteredReservations.length} Bookings
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8E6E1] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#2C3333]">
                  <thead className="bg-[#FAF9F6] border-b border-[#E8E6E1] text-stone-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Booking Ref</th>
                      <th className="py-3 px-4 font-bold">Customer</th>
                      <th className="py-3 px-4 font-bold">Venue & Table</th>
                      <th className="py-3 px-4 font-bold">Date & Times (In / Out)</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold">Audit / Modifications</th>
                      <th className="py-3 px-4 font-bold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1]/60">
                    {filteredReservations.map((res) => {
                      const hasManualTimeChange = Boolean(res.lastUpdated);

                      return (
                        <tr key={res.id} className="hover:bg-[#FAF9F6] transition-colors">
                          <td className="py-3.5 px-4 font-bold font-mono text-stone-700">
                            {res.bookingRef || res.id}
                          </td>
                          <td className="py-3.5 px-4 font-semibold">
                            <div>{res.customerName}</div>
                            <div className="text-[11px] text-stone-400 font-normal">{res.customerPhone || '—'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#4F6F52]">{res.restaurantName}</div>
                            <div className="text-[11px] text-stone-500">
                              Table {res.tableNumber} {res.floorName ? `• ${res.floorName}` : ''}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-stone-700">{res.date}</div>
                            <div className="text-[11px] text-[#4F6F52] font-bold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Time In: {res.timeIn || '—'}</span>
                              <span className="text-stone-300">|</span>
                              <span>Time Out: {res.timeOut || '—'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                              res.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                              res.status === 'seated' ? 'bg-blue-50 text-blue-700' :
                              res.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-700'
                            }`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {hasManualTimeChange ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Modified by {res.lastUpdated?.updatedRole || 'User'}
                              </span>
                            ) : (
                              <span className="text-stone-400 text-[11px]">Original booking</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedReservation(res)}
                              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MISUSE & SUSPICIOUS MONITORING */}
        {activeTab === 'misuse' && (
          <div className="space-y-6">
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 text-amber-950 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-900">Platform Misuse & Integrity Shield</h4>
                <p className="text-xs text-amber-800/90 mt-1">
                  Automatic heuristic flags identify suspicious behavior such as repeat cancellations, abnormal manual shifts in Time In/Time Out, penalty disputes, or rapid booking churn.
                </p>
              </div>
            </div>

            {/* List of Suspicious Events */}
            <div className="bg-white rounded-3xl border border-[#E8E6E1] overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#E8E6E1] flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#2C3333]">Flagged Activity Log ({suspiciousEvents.length})</h3>
                <span className="text-xs text-stone-500">Live Security Intercepts</span>
              </div>

              {suspiciousEvents.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-sm text-stone-700">No suspicious activity flagged</p>
                  <p className="text-stone-400 mt-0.5">Platform health and reservation booking patterns are clean.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8E6E1]/60">
                  {suspiciousEvents.map((evt) => (
                    <div key={evt.id} className="p-4 hover:bg-amber-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] uppercase">
                            {evt.action.replace(/_/g, ' ')}
                          </span>
                          <span className="font-bold text-[#2C3333]">{evt.userName}</span>
                          <span className="text-stone-400 text-[11px]">({evt.userId})</span>
                        </div>
                        <p className="text-xs text-[#2C3333] mt-1 font-medium">{evt.details}</p>
                        {evt.suspiciousReason && (
                          <p className="text-[11px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Flag Reason: {evt.suspiciousReason}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-stone-400 block">
                          {new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-[#E8E6E1] overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#E8E6E1] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#2C3333]">System Audit Logs ({auditLogs.length})</h3>
                  <p className="text-[11px] text-[#2C3333]/60">Immutable administrative record of modifications</p>
                </div>
                <button
                  onClick={refreshAdminData}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs font-bold text-stone-700 hover:bg-white flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#2C3333]">
                  <thead className="bg-[#FAF9F6] border-b border-[#E8E6E1] text-stone-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Timestamp</th>
                      <th className="py-3 px-4 font-bold">Action</th>
                      <th className="py-3 px-4 font-bold">Initiated By</th>
                      <th className="py-3 px-4 font-bold">Details</th>
                      <th className="py-3 px-4 font-bold">Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1]/60 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.isSuspicious ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-sans font-semibold text-[#2C3333]">{log.userName}</span>
                          <span className="text-[10px] text-stone-400 block font-sans">({log.userRole})</span>
                        </td>
                        <td className="py-3 px-4 font-sans text-stone-700 max-w-md">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-stone-500">
                          {log.previousValue && log.newValue ? (
                            <div>
                              <span className="text-rose-600 line-through mr-1">{log.previousValue}</span>
                              <span className="text-emerald-700 font-bold">→ {log.newValue}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SUSPENSION MODAL */}
      {suspensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E8E6E1] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Ban className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#2C3333]">
                  Suspend {suspensionModal.type === 'restaurant' ? 'Restaurant' : 'Account'}
                </h3>
                <p className="text-xs text-stone-500">{suspensionModal.name}</p>
              </div>
            </div>

            <p className="text-xs text-[#2C3333]/70">
              This will disable access for this {suspensionModal.type}. They will not be able to log in or create/accept bookings until reinstated by Company Administration.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#2C3333] mb-1.5">
                Official Suspension Reason (Recorded in Audit Trail):
              </label>
              <textarea
                rows={3}
                placeholder="Enter regulatory violation, policy non-compliance, or reason for suspension..."
                value={suspensionModal.reason}
                onChange={(e) => setSuspensionModal({ ...suspensionModal, reason: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E8E6E1] text-xs outline-none focus:border-rose-500 bg-[#FAF9F6]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSuspensionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!suspensionModal.reason.trim()}
                onClick={handleConfirmSuspension}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-colors cursor-pointer"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESERVATION INSPECTION DRAWER */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E8E6E1] w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6E1]">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                  {selectedReservation.bookingRef || selectedReservation.id}
                </span>
                <h3 className="font-bold text-lg text-[#2C3333]">Reservation Integrity Record</h3>
              </div>
              <button
                onClick={() => setSelectedReservation(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]">
                <div>
                  <span className="text-stone-400 text-[10px] block">Customer</span>
                  <span className="font-bold text-[#2C3333]">{selectedReservation.customerName}</span>
                  <span className="text-stone-500 text-[11px] block">{selectedReservation.customerPhone}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block">Venue</span>
                  <span className="font-bold text-[#4F6F52]">{selectedReservation.restaurantName}</span>
                  <span className="text-stone-500 text-[11px] block">Table {selectedReservation.tableNumber}</span>
                </div>
              </div>

              {/* Time In and Time Out Details */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 block mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  Manual Dining Pacing Schedule
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase">Customer Time In</span>
                    <span className="text-sm font-bold text-[#2C3333] block">
                      {selectedReservation.timeIn || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase">Customer Time Out</span>
                    <span className="text-sm font-bold text-[#2C3333] block">
                      {selectedReservation.timeOut || 'Not specified'}
                    </span>
                  </div>
                </div>

                {selectedReservation.lastUpdated && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 text-[11px] text-emerald-900">
                    <strong>Last Modified:</strong> {new Date(selectedReservation.lastUpdated.updatedAt).toLocaleString()} by {selectedReservation.lastUpdated.updatedRole} ({selectedReservation.lastUpdated.updatedBy})
                    {selectedReservation.lastUpdated.reason && (
                      <p className="mt-0.5 italic">Note: "{selectedReservation.lastUpdated.reason}"</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]">
                  <span className="text-stone-400 text-[10px] block">Booking Status</span>
                  <span className="font-bold uppercase text-stone-700">{selectedReservation.status}</span>
                </div>
                <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]">
                  <span className="text-stone-400 text-[10px] block">Deposit Paid</span>
                  <span className="font-bold text-[#4F6F52]">₹{selectedReservation.depositAmount || 200}</span>
                </div>
              </div>

              {selectedReservation.specialRequests && (
                <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]">
                  <span className="text-stone-400 text-[10px] block">Diner Requests</span>
                  <p className="text-stone-700">{selectedReservation.specialRequests}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E8E6E1] flex justify-end">
              <button
                onClick={() => setSelectedReservation(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-white font-bold text-xs hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
