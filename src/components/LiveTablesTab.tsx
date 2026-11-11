import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Armchair, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Trash2, 
  Layers
} from 'lucide-react';
import { Table, TableState, Restaurant, Reservation, RestaurantFloor } from '../types';
import { TIME_SLOTS } from '../data/mockData';
import { AddTableModal } from './AddTableModal';
import { RemoveTableModal } from './RemoveTableModal';
import { ensureRestaurantFloors, ensureTablesHaveFloors } from '../utils/floorUtils';

interface LiveTablesTabProps {
  restaurant: Restaurant;
  reservations: Reservation[];
  tableOverrides: Record<string, TableState>;
  onSetTableStatus: (tableId: string, status: TableState) => void;
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  selectedTable: Table | null;
  onSelectTable: (table: Table) => void;
  onResetStatuses: () => void;
  getTableStaffStatus: (table: Table) => TableState;
  isSyncingTables?: boolean;
  lastTablesSyncTime?: string | null;
  onSyncTables?: () => void;
  onAddTable?: (table: Table) => Promise<boolean>;
  onRemoveTable?: (tableId: string) => Promise<boolean>;
  onUpdateFloors?: (floors: RestaurantFloor[]) => void;
  onTableReposition?: (tableId: string, x: number, y: number) => void;
  isSubscriptionExpired?: boolean;
  onLockedFeatureClick?: (message: string) => void;
}

export const LiveTablesTab: React.FC<LiveTablesTabProps> = ({
  restaurant,
  reservations,
  tableOverrides,
  onSetTableStatus,
  selectedSlot,
  onSelectSlot,
  selectedTable,
  onSelectTable,
  onResetStatuses,
  getTableStaffStatus,
  isSyncingTables = false,
  lastTablesSyncTime = null,
  onSyncTables,
  onAddTable,
  onRemoveTable,
  onUpdateFloors,
  onTableReposition,
  isSubscriptionExpired = false,
  onLockedFeatureClick,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [tablePendingRemoval, setTablePendingRemoval] = useState<Table | null>(null);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dynamic floors state
  const [floors, setFloors] = useState<RestaurantFloor[]>(() => ensureRestaurantFloors(restaurant));
  const [activeFloorId, setActiveFloorId] = useState<string>(() => floors[0]?.id || 'floor-0');

  useEffect(() => {
    const nextF = ensureRestaurantFloors(restaurant);
    setFloors(nextF);
    if (!nextF.some((f) => f.id === activeFloorId)) {
      setActiveFloorId(nextF[0]?.id || 'floor-0');
    }
  }, [restaurant]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => {
      setActionToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Ensure tables have assigned floors and rectangular shapes
  const allTablesWithFloors = useMemo(() => {
    return ensureTablesHaveFloors(restaurant.tables, floors);
  }, [restaurant.tables, floors]);

  // Tables strictly for the selected active floor - fixing floor overlapping completely!
  const activeFloorTables = useMemo(() => {
    return allTablesWithFloors.filter((t) => (t.floorId || 'floor-0') === activeFloorId);
  }, [allTablesWithFloors, activeFloorId]);

  // Compute table counts per floor
  const tableCountsByFloor = useMemo(() => {
    const counts: Record<string, number> = {};
    floors.forEach((f) => { counts[f.id] = 0; });
    allTablesWithFloors.forEach((t) => {
      const fId = t.floorId || 'floor-0';
      if (counts[fId] !== undefined) {
        counts[fId] += 1;
      } else {
        counts[fId] = 1;
      }
    });
    return counts;
  }, [allTablesWithFloors, floors]);

  // Active floor object
  const currentFloor = useMemo(() => {
    return floors.find((f) => f.id === activeFloorId) || floors[0];
  }, [floors, activeFloorId]);

  // Selected table: if current selection is not on this floor, default to first table on this floor
  const activeTable = useMemo(() => {
    if (selectedTable && activeFloorTables.some((t) => t.id === selectedTable.id)) {
      return selectedTable;
    }
    return activeFloorTables[0] || null;
  }, [selectedTable, activeFloorTables]);

  // Floor Management: (+) Add Floor
  const handleAddFloor = () => {
    const nextFloorNum = floors.length === 0 ? 0 : Math.max(...floors.map((f) => f.floorNumber)) + 1;
    const newFloorId = `floor-${nextFloorNum}`;
    const newFloorName = nextFloorNum === 0 ? 'Ground Floor' : `Floor ${nextFloorNum}`;

    const newFloor: RestaurantFloor = {
      id: newFloorId,
      floorNumber: nextFloorNum,
      name: newFloorName,
      description: `Level ${nextFloorNum} dining space`,
      order: nextFloorNum,
      objects: [
        { id: `obj-${nextFloorNum}-door`, floorId: newFloorId, type: 'entrance', name: 'Entrance', x: 2, y: 48, width: 6, height: 12 },
        { id: `obj-${nextFloorNum}-service`, floorId: newFloorId, type: 'counter', name: 'Service Station', x: 78, y: 12, width: 16, height: 12 },
      ],
    };

    const updatedFloors = [...floors, newFloor];
    setFloors(updatedFloors);
    setActiveFloorId(newFloorId);

    if (onUpdateFloors) {
      onUpdateFloors(updatedFloors);
    }

    showToast(`${newFloorName} added successfully.`, 'success');
  };

  // Floor Management: (-) Remove Selected Floor
  const handleRemoveSelectedFloor = () => {
    if (floors.length <= 1) {
      showToast('Cannot remove Ground Floor. A restaurant must have at least one floor.', 'error');
      return;
    }

    if (!currentFloor || currentFloor.floorNumber === 0) {
      showToast('Cannot remove Ground Floor. Please select Floor 1 or above to remove.', 'error');
      return;
    }

    // Protection: check if this floor contains tables
    const tablesOnThisFloor = allTablesWithFloors.filter((t) => (t.floorId || 'floor-0') === currentFloor.id);
    if (tablesOnThisFloor.length > 0) {
      showToast(
        `Cannot remove ${currentFloor.name}: it contains ${tablesOnThisFloor.length} table(s). Please delete or move tables first to protect layout and booking integrity.`,
        'error'
      );
      return;
    }

    // Protection: check if any reservations exist for tables on this floor
    const hasActiveBookings = reservations.some((r) => 
      tablesOnThisFloor.some((t) => t.id === r.tableId || t.tableNumber === r.tableNumber)
    );
    if (hasActiveBookings) {
      showToast(`Cannot remove ${currentFloor.name}: active reservations are assigned to tables on this floor.`, 'error');
      return;
    }

    // Remove floor
    const updatedFloors = floors.filter((f) => f.id !== currentFloor.id);
    setFloors(updatedFloors);
    // Switch to previous floor
    const fallbackFloor = updatedFloors[updatedFloors.length - 1] || updatedFloors[0];
    setActiveFloorId(fallbackFloor.id);

    if (onUpdateFloors) {
      onUpdateFloors(updatedFloors);
    }

    showToast(`${currentFloor.name} removed successfully.`, 'success');
  };

  // Table Drag-and-Drop Repositioning State
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    tableId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent, table: Table) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    dragStartRef.current = {
      tableId: table.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: table.x,
      initialY: table.y,
      hasMoved: false,
    };

    setDraggingTableId(table.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const deltaXPixels = e.clientX - dragStartRef.current.startX;
    const deltaYPixels = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(deltaXPixels, deltaYPixels) > 5) {
      dragStartRef.current.hasMoved = true;
    }

    if (dragStartRef.current.hasMoved && onTableReposition) {
      const deltaXPercent = (deltaXPixels / rect.width) * 100;
      const deltaYPercent = (deltaYPixels / rect.height) * 100;
      const newX = Math.max(2, Math.min(80, Math.round(dragStartRef.current.initialX + deltaXPercent)));
      const newY = Math.max(2, Math.min(78, Math.round(dragStartRef.current.initialY + deltaYPercent)));
      onTableReposition(dragStartRef.current.tableId, newX, newY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent, table: Table) => {
    if (dragStartRef.current) {
      if (!dragStartRef.current.hasMoved) {
        // Simple click -> select table
        onSelectTable(table);
      }
    }
    dragStartRef.current = null;
    setDraggingTableId(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Status visual mapping (🟢 Available, 🟠 Reserved, 🔴 Occupied)
  const getTableColorConfig = (status: TableState) => {
    switch (status) {
      case 'available':
        return {
          label: 'Available',
          badgeText: '🟢 Available',
          border: 'border-emerald-500',
          bg: 'bg-emerald-50/90 hover:bg-emerald-100',
          text: 'text-emerald-950',
          dot: 'bg-emerald-500',
        };
      case 'reserved':
        return {
          label: 'Reserved',
          badgeText: '🟠 Reserved',
          border: 'border-amber-500',
          bg: 'bg-amber-50/90 hover:bg-amber-100',
          text: 'text-amber-950',
          dot: 'bg-amber-500',
        };
      case 'occupied':
      case 'cleaning':
      case 'unavailable':
      default:
        return {
          label: 'Occupied',
          badgeText: '🔴 Occupied',
          border: 'border-rose-500',
          bg: 'bg-rose-50/90 hover:bg-rose-100',
          text: 'text-rose-950',
          dot: 'bg-rose-600',
        };
    }
  };

  // Active table status
  const currentTableStatus = activeTable ? getTableStaffStatus(activeTable) : 'available';

  // Stats for the active floor
  const floorAvailableCount = activeFloorTables.filter((t) => getTableStaffStatus(t) === 'available').length;
  const floorReservedCount = activeFloorTables.filter((t) => getTableStaffStatus(t) === 'reserved').length;
  const floorOccupiedCount = activeFloorTables.filter((t) => {
    const s = getTableStaffStatus(t);
    return s === 'occupied' || s === 'cleaning' || s === 'unavailable';
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150" id="section-live-tables">
      
      {/* Live Tables Header & Action Controls */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8E6E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4F6F521A] text-[#4F6F52] text-[10px] font-bold uppercase tracking-widest mb-2 border border-[#4F6F52]/20">
            <Armchair className="w-3.5 h-3.5" />
            <span>2D Floor Blueprint</span>
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#2C3333]">
            Floor Blueprint & Table Management
          </h2>
          <p className="text-xs text-[#2C3333]/60 mt-0.5">
            {restaurant.name} • {currentFloor?.name} ({activeFloorTables.length} Tables)
          </p>
        </div>

        {/* Action Controls: Slot Selector + Add Table + (+) Add Floor + (-) Remove Floor */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Slot Selector */}
          <div className="flex items-center gap-2 bg-[#FAF9F6] px-3.5 py-2 rounded-full border border-[#E8E6E1]">
            <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
            <span className="text-xs font-semibold text-[#2C3333]/70">Slot:</span>
            <select
              value={selectedSlot}
              onChange={(e) => onSelectSlot(e.target.value)}
              className="text-xs font-bold text-[#4F6F52] bg-transparent outline-none cursor-pointer pr-1"
              id="live-tables-slot-select"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>

          {/* Sync tables */}
          {onSyncTables && (
            <button
              type="button"
              onClick={onSyncTables}
              disabled={isSyncingTables}
              className="px-3.5 py-2 text-xs font-semibold text-[#4F6F52] hover:bg-[#FAF9F6] border border-[#E8E6E1] rounded-full flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Sync table states"
              id="live-tables-sync-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTables ? 'animate-spin' : ''}`} />
              <span>{isSyncingTables ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}

          {/* Add Table Button */}
          {onAddTable && (
            <button
              type="button"
              onClick={() => {
                if (isSubscriptionExpired) {
                  onLockedFeatureClick?.('Adding tables to your live floor plan requires an active FlashTable Partner Plan. Renew your subscription to unlock this feature.');
                  return;
                }
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-[#4F6F52] hover:bg-[#3D563F] rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Add a new rectangular table to this floor"
              id="btn-open-add-table"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Table</span>
            </button>
          )}

          {/* (+) Add Floor control placed beside Add Table */}
          <button
            type="button"
            onClick={() => {
              if (isSubscriptionExpired) {
                onLockedFeatureClick?.('Multi-level floor layout configuration requires an active partner subscription. Renew your plan to add floors.');
                return;
              }
              handleAddFloor();
            }}
            className="px-3.5 py-2 text-xs font-bold text-[#4F6F52] bg-[#4F6F521A] hover:bg-[#4F6F5226] border border-[#4F6F52]/30 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Add one additional floor level"
            id="btn-add-floor"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Floor</span>
          </button>

          {/* (-) Remove Floor control placed beside Add Table */}
          <button
            type="button"
            onClick={() => {
              if (isSubscriptionExpired) {
                onLockedFeatureClick?.('Modifying dining floors requires an active partner subscription. Renew your plan to customize floors.');
                return;
              }
              handleRemoveSelectedFloor();
            }}
            disabled={floors.length <= 1 || currentFloor?.floorNumber === 0}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title={floors.length <= 1 ? "Cannot remove Ground Floor" : `Remove ${currentFloor?.name}`}
            id="btn-remove-floor"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Remove Floor</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionToast && (
        <div 
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 border ${
            actionToast.type === 'error' 
              ? 'bg-rose-50 text-rose-800 border-rose-200' 
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{actionToast.message}</span>
          </div>
          <button 
            onClick={() => setActionToast(null)}
            className="text-current/60 hover:text-current font-bold text-xs p-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Dynamic Floor Navigation Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E8E6E1] shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#4F6F52]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333]">
            Select Floor Blueprint:
          </span>
        </div>

        {/* Dynamic Floor Tabs: Ground Floor, Floor 1, Floor 2... */}
        <div className="flex items-center gap-2 flex-wrap" id="dynamic-floors-container">
          {floors.map((fl) => {
            const isSelected = fl.id === activeFloorId;
            const count = tableCountsByFloor[fl.id] || 0;

            return (
              <button
                key={fl.id}
                type="button"
                onClick={() => {
                  setActiveFloorId(fl.id);
                  // Update selected table to first table on this floor if available
                  const tablesOnFl = allTablesWithFloors.filter((t) => (t.floorId || 'floor-0') === fl.id);
                  if (tablesOnFl.length > 0) {
                    onSelectTable(tablesOnFl[0]);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#2C3333] text-white border-[#2C3333] shadow-xs'
                    : 'bg-[#FAF9F6] text-[#2C3333]/80 hover:bg-white border-[#E8E6E1]'
                }`}
                id={`btn-select-floor-${fl.id}`}
              >
                <span>{fl.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#E8E6E1] text-[#2C3333]'
                }`}>
                  {count} {count === 1 ? 'Table' : 'Tables'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floor Status Summary: 🟢 Available, 🟠 Reserved, 🔴 Occupied */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Available</span>
          </div>
          <span className="text-sm font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            {floorAvailableCount}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Reserved</span>
          </div>
          <span className="text-sm font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
            {floorReservedCount}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">Occupied</span>
          </div>
          <span className="text-sm font-bold text-rose-900 bg-rose-100 px-2.5 py-0.5 rounded-full">
            {floorOccupiedCount}
          </span>
        </div>
      </div>

      {/* Main Grid: Clean 2D Blueprint (7 cols) + Simplified Table Inspection Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: 2D Floor Plan Blueprint (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-serif text-[#2C3333]">
                {currentFloor?.name} 2D Blueprint
              </h3>
              <p className="text-xs text-[#2C3333]/60">
                Click to inspect and update status • Drag to arrange table position
              </p>
            </div>
            <span className="text-xs font-semibold text-[#4F6F52] bg-[#4F6F521A] px-3 py-1 rounded-full border border-[#4F6F52]/20">
              2D Layout • Only {currentFloor?.name}
            </span>
          </div>

          {/* 2D Floor Canvas with Rectangular Tables strictly for this floor */}
          <div 
            ref={containerRef}
            onPointerMove={handlePointerMove}
            className="relative w-full aspect-[16/11] bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1] p-4 select-none overflow-hidden touch-none" 
            id="live-tables-blueprint-container"
          >
            {/* Subtle architectural grid */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#4F6F52 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />

            {/* Floor architectural indicators */}
            <div className="absolute top-2 left-4 pointer-events-none text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40">
              {currentFloor?.name}
            </div>

            {/* Empty floor notice if no tables configured on this floor */}
            {activeFloorTables.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E6E1] flex items-center justify-center text-[#4F6F52] mb-3 shadow-2xs">
                  <Armchair className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#2C3333]">
                  No Tables on {currentFloor?.name} Yet
                </h4>
                <p className="text-xs text-[#2C3333]/60 max-w-xs mt-1 mb-4">
                  This floor has its own independent layout. Click below to add your first table to {currentFloor?.name}.
                </p>
                {onAddTable && (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 rounded-full bg-[#4F6F52] hover:bg-[#3D563F] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Table to {currentFloor?.name}</span>
                  </button>
                )}
              </div>
            )}

            {/* Rectangular Tables on 2D Blueprint (Strictly active floor tables!) */}
            {activeFloorTables.map((table) => {
              const state = getTableStaffStatus(table);
              const isSelected = activeTable?.id === table.id;
              const colorCfg = getTableColorConfig(state);
              const isDragging = draggingTableId === table.id;

              return (
                <div
                  key={table.id}
                  onPointerDown={(e) => handlePointerDown(e, table)}
                  onPointerUp={(e) => handlePointerUp(e, table)}
                  style={{
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    width: `${table.width || 18}%`,
                    height: `${table.height || 15}%`,
                  }}
                  className={`absolute cursor-grab active:cursor-grabbing transition-shadow duration-150 flex flex-col items-center justify-center ${
                    isSelected ? 'z-30' : 'z-10'
                  } ${isDragging ? 'opacity-90 scale-105 z-40' : ''}`}
                  id={`live-table-node-${table.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                >
                  {/* Fixed RECTANGULAR Table Shape */}
                  <div className={`w-full h-full p-1.5 text-center flex flex-col items-center justify-center rounded-xl border-2 transition-all ${
                    colorCfg.bg
                  } ${colorCfg.border} ${colorCfg.text} ${
                    isSelected ? 'ring-3 ring-[#4F6F52] ring-offset-2 shadow-md' : 'shadow-2xs'
                  }`}>
                    {/* Table Number & Status Indicator */}
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>{table.tableNumber}</span>
                      <span className={`w-2 h-2 rounded-full ${colorCfg.dot}`} />
                    </div>
                    
                    {/* Table Status Text */}
                    <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5">
                      {colorCfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Table Switcher Chips (Only for this floor) */}
          {activeFloorTables.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#2C3333]/70 mb-2.5 flex items-center justify-between">
                <span>Tables on {currentFloor?.name}:</span>
                <span className="text-[11px] text-[#4F6F52]">
                  {activeTable ? `Selected: Table ${activeTable.tableNumber}` : 'Select a table'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeFloorTables.map((table) => {
                  const state = getTableStaffStatus(table);
                  const isSelected = activeTable?.id === table.id;
                  const colorCfg = getTableColorConfig(state);

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => onSelectTable(table)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-[#2C3333] text-white border-[#2C3333] shadow-xs'
                          : 'bg-white hover:bg-[#FAF9F6] text-[#2C3333] border-[#E8E6E1]'
                      }`}
                      id={`table-chip-${table.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${colorCfg.dot}`} />
                      <span>{table.tableNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Blueprint Legend */}
          <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1] flex flex-wrap items-center justify-between gap-3 text-xs text-[#2C3333]/70">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>🟢 Available</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>🟠 Reserved</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>🔴 Occupied</span>
              </span>
            </div>
            <span className="text-[11px] text-[#2C3333]/50">
              Drag tables to reposition on this floor
            </span>
          </div>

        </div>

        {/* Right: SIMPLIFIED Table Inspection and Control Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-6" id="live-table-details-panel">
          
          {activeTable ? (
            <>
              {/* Panel Header: Table Number */}
              <div className="border-b border-[#E8E6E1] pb-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50 block mb-1">
                  Table Inspection & Control
                </span>
                <h3 className="text-2xl font-bold font-serif text-[#2C3333] flex items-center justify-between">
                  <span>Table {activeTable.tableNumber}</span>
                  <span className="text-xs text-[#2C3333]/60 font-sans font-normal">
                    {currentFloor?.name}
                  </span>
                </h3>
              </div>

              {/* Status Display: 🟢 Available, 🟠 Reserved, 🔴 Occupied */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 block">
                  Table Status
                </span>
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                  currentTableStatus === 'available'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : currentTableStatus === 'reserved'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <span className={`w-3.5 h-3.5 rounded-full ${
                    currentTableStatus === 'available'
                      ? 'bg-emerald-500'
                      : currentTableStatus === 'reserved'
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                  }`} />
                  <span className="text-base font-bold">
                    {currentTableStatus === 'available'
                      ? '🟢 Available'
                      : currentTableStatus === 'reserved'
                      ? '🟠 Reserved'
                      : '🔴 Occupied'}
                  </span>
                </div>
              </div>

              {/* Quick Status Control Buttons */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 block">
                  Set Table Status
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSetTableStatus(activeTable.id, 'available');
                      showToast(`Table ${activeTable.tableNumber} set to Available.`, 'success');
                    }}
                    className={`py-3 px-2 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      currentTableStatus === 'available'
                        ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'bg-white hover:bg-emerald-50 text-emerald-900 border-[#E8E6E1]'
                    }`}
                    id="btn-set-status-available"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>Available</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSetTableStatus(activeTable.id, 'reserved');
                      showToast(`Table ${activeTable.tableNumber} set to Reserved.`, 'success');
                    }}
                    className={`py-3 px-2 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      currentTableStatus === 'reserved'
                        ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                        : 'bg-white hover:bg-amber-50 text-amber-900 border-[#E8E6E1]'
                    }`}
                    id="btn-set-status-reserved"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Reserved</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSetTableStatus(activeTable.id, 'occupied');
                      showToast(`Table ${activeTable.tableNumber} set to Occupied.`, 'success');
                    }}
                    className={`py-3 px-2 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      currentTableStatus === 'occupied' || currentTableStatus === 'cleaning' || currentTableStatus === 'unavailable'
                        ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                        : 'bg-white hover:bg-rose-50 text-rose-900 border-[#E8E6E1]'
                    }`}
                    id="btn-set-status-occupied"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span>Occupied</span>
                  </button>
                </div>
              </div>

              {/* Quick Action: Remove Table */}
              {onRemoveTable && (
                <div className="pt-4 border-t border-[#E8E6E1]">
                  <button
                    type="button"
                    onClick={() => setTablePendingRemoval(activeTable)}
                    className="w-full py-2.5 px-4 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    id="btn-remove-active-table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Table {activeTable.tableNumber}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-[#2C3333]/60 space-y-2">
              <Armchair className="w-8 h-8 mx-auto text-[#4F6F52]/40" />
              <p className="text-xs">
                No table selected on {currentFloor?.name}.
              </p>
              <p className="text-[11px] text-[#2C3333]/40">
                Click any table on the 2D blueprint to inspect and control its status.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Add Table Modal */}
      {isAddModalOpen && onAddTable && (
        <AddTableModal
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          existingTables={allTablesWithFloors}
          floors={floors}
          activeFloorId={activeFloorId}
          onClose={() => setIsAddModalOpen(false)}
          onAddTable={async (newTable) => {
            const ok = await onAddTable(newTable);
            if (ok) {
              showToast(`Table ${newTable.tableNumber} added to ${currentFloor?.name}.`, 'success');
            }
            return ok;
          }}
        />
      )}

      {/* Remove Table Confirmation Modal */}
      {tablePendingRemoval && onRemoveTable && (
        <RemoveTableModal
          restaurantName={restaurant.name}
          table={tablePendingRemoval}
          activeReservations={reservations}
          onClose={() => setTablePendingRemoval(null)}
          onConfirmRemove={async (tableId) => {
            const ok = await onRemoveTable(tableId);
            if (ok) {
              showToast(`Table ${tablePendingRemoval.tableNumber} removed.`, 'success');
              setTablePendingRemoval(null);
            }
            return ok;
          }}
        />
      )}

    </div>
  );
};
