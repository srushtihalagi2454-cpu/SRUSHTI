import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Sparkles, 
  Check, 
  Lock, 
  Info, 
  Sliders, 
  Eye, 
  Compass, 
  ShieldCheck, 
  Armchair,
  Wrench,
  Search,
  Filter
} from 'lucide-react';
import { Table, TableState, TableCategory, RestaurantFloor, SeatingPreference, SmartMatchResult } from '../types';

interface Restaurant3DFloorPlanProps {
  floors: RestaurantFloor[];
  activeFloorId: string;
  onSelectFloor: (floorId: string) => void;
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (table: Table) => void;
  getTableStatus: (table: Table) => TableState;
  date?: string;
  timeSlot?: string;
  guests?: number;
  seatingPreference?: SeatingPreference;
  smartMatch?: SmartMatchResult | null;
  onApplySmartMatch?: () => void;
  // Read-only customer view vs Interactive admin view
  isAdminView?: boolean;
  onTableReposition?: (tableId: string, newX: number, newY: number) => void;
  onToggleTableMaintenance?: (tableId: string) => void;
}

export const Restaurant3DFloorPlan: React.FC<Restaurant3DFloorPlanProps> = ({
  floors,
  activeFloorId,
  onSelectFloor,
  tables,
  selectedTableId,
  onSelectTable,
  getTableStatus,
  date,
  timeSlot,
  guests = 2,
  seatingPreference = 'all',
  smartMatch,
  onApplySmartMatch,
  isAdminView = false,
  onTableReposition,
  onToggleTableMaintenance,
}) => {
  // 3D View Transformation Controls
  const [rotationX, setRotationX] = useState<number>(38); // tilt angle in degrees (0 = top-down 2D, 60 = steep 3D)
  const [rotationZ, setRotationZ] = useState<number>(-12); // yaw/rotation angle
  const [zoom, setZoom] = useState<number>(1); // 0.8 to 1.5
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewPreset, setViewPreset] = useState<'isometric' | 'topDown' | 'angled' | 'perspective'>('isometric');
  
  // Table category and status filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hoveredTable, setHoveredTable] = useState<Table | null>(null);

  // Admin Drag & Reposition table state
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Floor details
  const activeFloor = useMemo(() => {
    return floors.find((f) => f.id === activeFloorId) || floors[0];
  }, [floors, activeFloorId]);

  // Filter tables belonging to the active floor
  const floorTables = useMemo(() => {
    if (!activeFloor) return [];
    return tables.filter((t) => (t.floorId ? t.floorId === activeFloor.id : t.floorNumber === activeFloor.floorNumber || activeFloor.floorNumber === 0));
  }, [tables, activeFloor]);

  // Filtered by Category
  const displayedTables = useMemo(() => {
    if (categoryFilter === 'all') return floorTables;
    return floorTables.filter((t) => (t.category || 'Standard').toLowerCase() === categoryFilter.toLowerCase());
  }, [floorTables, categoryFilter]);

  // Status counts for active floor
  const floorStatusSummary = useMemo(() => {
    let available = 0;
    let reserved = 0;
    let occupied = 0;
    let maintenance = 0;

    floorTables.forEach((t) => {
      const st = getTableStatus(t);
      if (st === 'available') available++;
      else if (st === 'reserved') reserved++;
      else if (st === 'occupied' || st === 'cleaning') occupied++;
      else if (st === 'unavailable' || st === 'inactive') maintenance++;
    });

    return { available, reserved, occupied, maintenance, total: floorTables.length };
  }, [floorTables, getTableStatus]);

  // Apply View Presets
  const applyPreset = (preset: 'isometric' | 'topDown' | 'angled' | 'perspective') => {
    setViewPreset(preset);
    if (preset === 'isometric') {
      setRotationX(38);
      setRotationZ(-12);
      setZoom(1);
    } else if (preset === 'topDown') {
      setRotationX(0);
      setRotationZ(0);
      setZoom(1);
    } else if (preset === 'angled') {
      setRotationX(45);
      setRotationZ(18);
      setZoom(1.05);
    } else if (preset === 'perspective') {
      setRotationX(52);
      setRotationZ(-24);
      setZoom(1.1);
    }
  };

  // Mouse drag handlers for 3D viewport rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking a table or admin dragging table, ignore canvas rotation
    if ((e.target as HTMLElement).closest('.table-3d-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingTableId && isAdminView && onTableReposition && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(5, Math.min(85, Math.round(rawX)));
      const clampedY = Math.max(5, Math.min(85, Math.round(rawY)));
      onTableReposition(draggingTableId, clampedX, clampedY);
      return;
    }

    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setRotationZ((prev) => Math.max(-60, Math.min(60, prev + deltaX * 0.4)));
    setRotationX((prev) => Math.max(0, Math.min(65, prev - deltaY * 0.4)));
    setDragStart({ x: e.clientX, y: e.clientY });
    setViewPreset('isometric'); // Custom free rotate
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingTableId(null);
  };

  // Touch handlers for mobile
  const [touchStart, setTouchStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.table-3d-node')) return;
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;
      setRotationZ((prev) => Math.max(-60, Math.min(60, prev + deltaX * 0.3)));
      setRotationX((prev) => Math.max(0, Math.min(65, prev - deltaY * 0.3)));
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  // Category Colors
  const getCategoryBadge = (cat?: string) => {
    switch ((cat || '').toLowerCase()) {
      case 'vip':
        return { bg: 'bg-amber-500/10 text-amber-900 border-amber-300', dot: 'bg-amber-500' };
      case 'couple':
        return { bg: 'bg-rose-500/10 text-rose-900 border-rose-300', dot: 'bg-rose-500' };
      case 'family':
        return { bg: 'bg-blue-500/10 text-blue-900 border-blue-300', dot: 'bg-blue-500' };
      case 'private':
        return { bg: 'bg-purple-500/10 text-purple-900 border-purple-300', dot: 'bg-purple-500' };
      case 'outdoor':
        return { bg: 'bg-emerald-500/10 text-emerald-900 border-emerald-300', dot: 'bg-emerald-500' };
      case 'bar':
        return { bg: 'bg-orange-500/10 text-orange-900 border-orange-300', dot: 'bg-orange-500' };
      default:
        return { bg: 'bg-stone-100 text-stone-800 border-stone-200', dot: 'bg-stone-500' };
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E6E1] p-5 sm:p-7 shadow-sm space-y-5">
      {/* Dynamic Floor Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl sm:text-2xl font-serif text-[#2C3333]">
              3D Interactive Floor & Table View
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20">
              {floors.length} {floors.length === 1 ? 'Floor' : 'Floors'} Configured
            </span>
            {isAdminView && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-300">
                Admin Editor Mode
              </span>
            )}
          </div>
          <p className="text-xs text-[#2C3333]/60 mt-1">
            {activeFloor?.name}: {activeFloor?.description || 'Floor plan arranged according to actual physical restaurant layout.'}
          </p>
        </div>

        {/* Dynamic Floor Selection Tabs (Supports 2, 5, 10+ dynamic floors) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 mr-1 shrink-0 flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#4F6F52]" /> Floors:
          </span>
          {floors.map((fl) => {
            const isFloorActive = fl.id === activeFloor?.id;
            return (
              <button
                key={fl.id}
                type="button"
                onClick={() => onSelectFloor(fl.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isFloorActive
                    ? 'bg-[#4F6F52] text-white shadow-xs ring-2 ring-[#4F6F52]/30 scale-102'
                    : 'bg-[#FAF9F6] hover:bg-[#F2EFE9] text-[#2C3333] border border-[#E8E6E1]'
                }`}
                id={`floor-tab-${fl.id}`}
              >
                <span>{fl.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isFloorActive ? 'bg-white/20 text-white' : 'bg-stone-200/80 text-stone-700'
                }`}>
                  {tables.filter((t) => t.floorId === fl.id || (t.floorNumber === fl.floorNumber)).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Camera Controls & Legend Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#FAF9F6] p-3 rounded-2xl border border-[#E8E6E1]/70">
        {/* Preset angles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 mr-1 flex items-center gap-1">
            <Compass className="w-3 h-3 text-[#4F6F52]" /> Perspective:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('isometric')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              viewPreset === 'isometric'
                ? 'bg-white text-[#4F6F52] shadow-2xs font-bold border border-[#4F6F52]/30'
                : 'text-[#2C3333]/70 hover:text-[#2C3333]'
            }`}
          >
            3D Isometric
          </button>
          <button
            type="button"
            onClick={() => applyPreset('perspective')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              viewPreset === 'perspective'
                ? 'bg-white text-[#4F6F52] shadow-2xs font-bold border border-[#4F6F52]/30'
                : 'text-[#2C3333]/70 hover:text-[#2C3333]'
            }`}
          >
            3D Deep Angled
          </button>
          <button
            type="button"
            onClick={() => applyPreset('topDown')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              viewPreset === 'topDown'
                ? 'bg-white text-[#4F6F52] shadow-2xs font-bold border border-[#4F6F52]/30'
                : 'text-[#2C3333]/70 hover:text-[#2C3333]'
            }`}
          >
            2D Blueprint
          </button>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg bg-white border border-[#E8E6E1] hover:bg-stone-50 text-stone-700 shadow-2xs cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg bg-white border border-[#E8E6E1] hover:bg-stone-50 text-stone-700 shadow-2xs cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyPreset('isometric')}
            className="p-1.5 rounded-lg bg-white border border-[#E8E6E1] hover:bg-stone-50 text-stone-700 shadow-2xs cursor-pointer flex items-center gap-1 text-[11px]"
            title="Reset View"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <span className="text-[10px] text-stone-500 font-mono">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-[#4F6F52]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-white border border-[#E8E6E1] rounded-lg px-2 py-1 font-medium text-stone-800 cursor-pointer focus:ring-1 focus:ring-[#4F6F52]"
          >
            <option value="all">All Table Categories</option>
            <option value="VIP">VIP</option>
            <option value="Couple">Couple</option>
            <option value="Family">Family</option>
            <option value="Standard">Standard</option>
            <option value="Private">Private</option>
            <option value="Outdoor">Outdoor</option>
            <option value="Bar">Bar</option>
          </select>
        </div>
      </div>

      {/* Smart Match Recommendation Banner (Customer side) */}
      {smartMatch && smartMatch.table && (
        <div className="bg-[#4F6F521A] border border-[#4F6F52]/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#4F6F52] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#2C3333]">
                  AI Smart Table Match
                </span>
                <span className="text-[10px] font-bold bg-[#4F6F52] text-white px-2 py-0.2 rounded-full">
                  Table {smartMatch.table.tableNumber}
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/80">
                {smartMatch.reason}
              </p>
            </div>
          </div>
          {onApplySmartMatch && (
            <button
              type="button"
              onClick={onApplySmartMatch}
              className="px-4 py-2 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs shrink-0"
            >
              Select Table {smartMatch.table.tableNumber}
            </button>
          )}
        </div>
      )}

      {/* 3D Viewport Stage Container */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[380px] sm:min-h-[460px] bg-linear-to-b from-stone-100 via-stone-50 to-[#FAF9F6] rounded-3xl border border-[#E8E6E1] overflow-hidden select-none cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center"
        id="restaurant-3d-viewport-canvas"
        style={{ perspective: '1100px' }}
      >
        {/* Background Ambient Lighting Grid */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(79, 111, 82, 0.08) 0%, transparent 70%),
                              linear-gradient(rgba(44, 51, 51, 0.05) 1px, transparent 1px), 
                              linear-gradient(90deg, rgba(44, 51, 51, 0.05) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 32px 32px, 32px 32px',
          }}
        />

        {/* 3D Rotatable & Tilting Floor Slab Platform */}
        <div
          className="relative transition-transform duration-100 ease-out"
          style={{
            width: '88%',
            height: '84%',
            transformStyle: 'preserve-3d',
            transform: `scale(${zoom}) rotateX(${rotationX}deg) rotateZ(${rotationZ}deg)`,
            boxShadow: '0 25px 50px -12px rgba(44, 51, 51, 0.25), 0 0 0 1px rgba(232, 230, 225, 0.8)',
          }}
        >
          {/* Floor Base Slab (Realistic Wood/Marble Parquet Look) */}
          <div 
            className="absolute inset-0 rounded-3xl bg-[#FAF9F6] border-2 border-stone-300 overflow-hidden"
            style={{
              boxShadow: `inset 0 0 40px rgba(0,0,0,0.03), 0 15px 0 0 #D7D3CA, 0 16px 20px rgba(0,0,0,0.15)`,
            }}
          >
            {/* Parquet / Floor pattern */}
            <div 
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: `linear-gradient(45deg, #4F6F52 25%, transparent 25%), 
                                  linear-gradient(-45deg, #4F6F52 25%, transparent 25%), 
                                  linear-gradient(45deg, transparent 75%, #4F6F52 75%), 
                                  linear-gradient(-45deg, transparent 75%, #4F6F52 75%)`,
                backgroundSize: '40px 40px',
                backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
              }}
            />

            {/* Architectural Section Zones on the Floor Slab */}
            <div className="absolute top-2 left-3 right-3 flex justify-between pointer-events-none opacity-60 text-[9px] font-bold uppercase tracking-widest text-stone-600">
              <span className="bg-white/80 px-2 py-0.5 rounded border border-stone-200">Courtyard & Windows</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-stone-200">Live Kitchen View</span>
            </div>

            <div className="absolute bottom-2 left-3 right-3 flex justify-between pointer-events-none opacity-60 text-[9px] font-bold uppercase tracking-widest text-stone-600">
              <span className="bg-white/80 px-2 py-0.5 rounded border border-stone-200">Bar & High Tables</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-stone-200">Private Alcoves</span>
            </div>

            {/* Entrance Doorway Marker */}
            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 pointer-events-none bg-[#2C3333] text-white text-[8px] font-bold tracking-widest px-1.5 py-2 rounded-r-md uppercase shadow-md">
              Door
            </div>
          </div>

          {/* Render 3D Table Meshes on the Floor Platform */}
          {displayedTables.map((table) => {
            const status = getTableStatus(table);
            const isSelected = selectedTableId === table.id;
            const isAvailable = status === 'available';
            const isUnderMaintenance = status === 'unavailable' || status === 'inactive';
            const isReserved = status === 'reserved';
            const isOccupied = status === 'occupied' || status === 'cleaning';
            const category = (table.category || 'Standard') as TableCategory;
            const catBadge = getCategoryBadge(category);
            const fitsParty = table.capacity >= guests;

            // 3D Table Top Styling depending on status
            let tableColorClass = 'bg-white border-2 border-stone-300 text-stone-800 shadow-sm';
            let tableShadow3D = '0 6px 0 0 #D7D3CA, 0 10px 14px rgba(0,0,0,0.12)';

            if (isSelected) {
              tableColorClass = 'bg-[#4F6F52] text-white border-2 border-[#3D5A40] ring-4 ring-[#4F6F52]/30 shadow-lg';
              tableShadow3D = '0 9px 0 0 #2E4230, 0 16px 22px rgba(46,66,48,0.35)';
            } else if (isAvailable) {
              tableColorClass = fitsParty 
                ? 'bg-emerald-50 hover:bg-emerald-100/80 border-2 border-emerald-500 text-emerald-950 cursor-pointer'
                : 'bg-stone-50 border-2 border-stone-300 text-stone-600 cursor-pointer';
              tableShadow3D = '0 6px 0 0 #A7D7B5, 0 10px 14px rgba(16,185,129,0.15)';
            } else if (isReserved) {
              tableColorClass = 'bg-amber-50 border-2 border-amber-400 text-amber-900 cursor-not-allowed';
              tableShadow3D = '0 6px 0 0 #FDE047, 0 10px 14px rgba(245,158,11,0.15)';
            } else if (isOccupied) {
              tableColorClass = 'bg-rose-50 border-2 border-rose-300 text-rose-800 cursor-not-allowed opacity-90';
              tableShadow3D = '0 6px 0 0 #FECDD3, 0 10px 14px rgba(244,63,94,0.15)';
            } else if (isUnderMaintenance) {
              tableColorClass = 'bg-stone-200 border-2 border-dashed border-stone-400 text-stone-600 cursor-not-allowed opacity-75';
              tableShadow3D = '0 4px 0 0 #A8A29E, 0 6px 10px rgba(0,0,0,0.1)';
            }

            // Shape border-radius
            const isRound = table.shape === 'circle';
            const isBooth = table.shape === 'booth';

            return (
              <div
                key={table.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAdminView) {
                    onSelectTable(table);
                    return;
                  }
                  if (isAvailable) {
                    onSelectTable(table);
                  }
                }}
                onMouseEnter={() => setHoveredTable(table)}
                onMouseLeave={() => setHoveredTable(null)}
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  width: `${table.width}%`,
                  height: `${table.height}%`,
                  transform: isSelected ? 'translateZ(14px) scale(1.05)' : 'translateZ(8px)',
                  transition: 'transform 0.18s ease-out, box-shadow 0.18s ease-out',
                }}
                className={`table-3d-node absolute flex items-center justify-center select-none ${
                  isAdminView ? 'cursor-grab active:cursor-grabbing z-20' : isAvailable ? 'cursor-pointer z-10 hover:translate-y-[-2px]' : 'cursor-not-allowed'
                }`}
                title={`Table ${table.tableNumber} (${table.capacity} Seats) - ${status.toUpperCase()} - Category: ${category}`}
                id={`table-3d-${table.id}`}
              >
                {/* 3D Elevated Table Mesh Top */}
                <div
                  className={`relative w-full h-full p-1.5 flex flex-col items-center justify-center transition-all ${tableColorClass} ${
                    isRound ? 'rounded-full' : isBooth ? 'rounded-2xl border-t-4 border-t-amber-700/40' : 'rounded-xl'
                  }`}
                  style={{
                    boxShadow: tableShadow3D,
                  }}
                >
                  {/* Category Pill Tag on Top */}
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full border shadow-2xs whitespace-nowrap ${catBadge.bg}`}>
                      {category}
                    </span>
                  </div>

                  {/* Table ID / Number */}
                  <span className="font-extrabold text-xs sm:text-sm tracking-tight leading-none mt-1">
                    {table.tableNumber}
                  </span>

                  {/* Seat Count with Icon */}
                  <div className="flex items-center gap-0.5 text-[9px] font-bold opacity-80 mt-0.5">
                    <Armchair className="w-2.5 h-2.5" />
                    <span>{table.capacity}p</span>
                  </div>

                  {/* Status Indicator Dot / Admin Maintenance Icon */}
                  <div className="absolute -bottom-1.5 right-1">
                    {isUnderMaintenance ? (
                      <span className="w-4 h-4 rounded-full bg-stone-500 text-white flex items-center justify-center text-[8px] shadow-xs" title="Under Maintenance">
                        <Wrench className="w-2.5 h-2.5" />
                      </span>
                    ) : isSelected ? (
                      <span className="w-4 h-4 rounded-full bg-white text-[#4F6F52] flex items-center justify-center text-[9px] font-bold shadow-xs">
                        ✓
                      </span>
                    ) : isReserved ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[7px] font-bold">
                        •
                      </span>
                    ) : isOccupied ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-400 text-rose-950 flex items-center justify-center text-[7px] font-bold">
                        ✕
                      </span>
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs" />
                    )}
                  </div>

                  {/* 3D Chair Silhouettes Surrounding Table */}
                  <div className="absolute -top-1.5 left-1/4 w-1.5 h-1 rounded-t-xs bg-stone-400/50 pointer-events-none" />
                  <div className="absolute -top-1.5 right-1/4 w-1.5 h-1 rounded-t-xs bg-stone-400/50 pointer-events-none" />
                  <div className="absolute -bottom-1.5 left-1/4 w-1.5 h-1 rounded-b-xs bg-stone-400/50 pointer-events-none" />
                  <div className="absolute -bottom-1.5 right-1/4 w-1.5 h-1 rounded-b-xs bg-stone-400/50 pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>

        {/* 3D Viewport Hint Overlay */}
        <div className="absolute bottom-3 left-4 pointer-events-none bg-white/90 backdrop-blur-xs border border-stone-200/90 rounded-full px-3 py-1 shadow-xs flex items-center gap-1.5 text-[10px] text-stone-700 font-medium">
          <RotateCw className="w-3 h-3 text-[#4F6F52]" />
          <span>Click & drag to rotate 3D floor • Use +/- to zoom</span>
        </div>
      </div>

      {/* Legend & Availability Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-2 border-t border-[#E8E6E1]">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <div className="font-bold text-emerald-950 text-[11px]">Available</div>
            <div className="text-[10px] text-emerald-700 font-medium">{floorStatusSummary.available} tables</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-[#4F6F52]/10 border border-[#4F6F52]/30 text-xs">
          <span className="w-3.5 h-3.5 rounded-full bg-[#4F6F52] text-white flex items-center justify-center text-[9px] font-bold shrink-0">✓</span>
          <div>
            <div className="font-bold text-[#2C3333] text-[11px]">Selected</div>
            <div className="text-[10px] text-[#2C3333]/70 font-medium">{selectedTableId ? '1 selected' : 'None'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0" />
          <div>
            <div className="font-bold text-amber-950 text-[11px]">Reserved</div>
            <div className="text-[10px] text-amber-700 font-medium">{floorStatusSummary.reserved} tables</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/60 border border-rose-200 text-xs">
          <span className="w-3.5 h-3.5 rounded-full bg-rose-400 shrink-0" />
          <div>
            <div className="font-bold text-rose-950 text-[11px]">Occupied</div>
            <div className="text-[10px] text-rose-700 font-medium">{floorStatusSummary.occupied} tables</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-100 border border-stone-200 text-xs col-span-2 sm:col-span-1">
          <span className="w-3.5 h-3.5 rounded-full bg-stone-400 shrink-0" />
          <div>
            <div className="font-bold text-stone-800 text-[11px]">Maintenance</div>
            <div className="text-[10px] text-stone-600 font-medium">{floorStatusSummary.maintenance} tables</div>
          </div>
        </div>
      </div>

      {/* Selected Table Detail Card (if table is selected) */}
      {selectedTableId && (() => {
        const sel = tables.find((t) => t.id === selectedTableId);
        if (!sel) return null;
        const selStatus = getTableStatus(sel);
        const selFloor = floors.find((f) => f.id === sel.floorId || f.floorNumber === sel.floorNumber) || activeFloor;

        return (
          <div className="bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#4F6F52] text-white flex flex-col items-center justify-center font-bold shadow-xs">
                <span className="text-[10px] uppercase opacity-80 leading-none">Table</span>
                <span className="text-base leading-none mt-0.5">{sel.tableNumber}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-[#2C3333]">
                    Table {sel.tableNumber} • {selFloor?.name}
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBadge(sel.category).bg}`}>
                    {sel.category || 'Standard'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    {sel.section || 'Main Dining'}
                  </span>
                </div>
                <p className="text-xs text-[#2C3333]/70 mt-0.5">
                  Seats {sel.capacity} guests • Shape: {sel.shape} • Features: {sel.features?.join(', ') || 'Indoor seating'}
                </p>
              </div>
            </div>

            {isAdminView && onToggleTableMaintenance && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onToggleTableMaintenance(sel.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    selStatus === 'unavailable'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                      : 'bg-stone-800 hover:bg-stone-900 text-white shadow-xs'
                  }`}
                >
                  <Wrench className="w-3 h-3" />
                  <span>{selStatus === 'unavailable' ? 'Mark Available' : 'Mark for Maintenance'}</span>
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
