import React, { useState } from 'react';
import { 
  Sparkles, 
  Users, 
  Info, 
  Check, 
  Lock, 
  Armchair, 
  Compass, 
  Sun, 
  Wind, 
  Wine, 
  ShieldCheck, 
  BellRing,
  AlertCircle
} from 'lucide-react';
import { Table, TableState, SeatingPreference, SmartMatchResult, RestaurantFloor } from '../types';

interface InteractiveFloorPlanProps {
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (table: Table) => void;
  date: string;
  timeSlot: string;
  guests: number;
  seatingPreference: SeatingPreference;
  getTableStatus: (table: Table) => TableState;
  smartMatch: SmartMatchResult | null;
  onApplySmartMatch: () => void;
  onOpenNotifyMe: () => void;
  floors?: RestaurantFloor[];
  activeFloorId?: string;
  onSelectFloor?: (floorId: string) => void;
}

export const InteractiveFloorPlan: React.FC<InteractiveFloorPlanProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
  date,
  timeSlot,
  guests,
  seatingPreference,
  getTableStatus,
  smartMatch,
  onApplySmartMatch,
  onOpenNotifyMe,
  floors,
  activeFloorId,
  onSelectFloor,
}) => {
  const [hoveredTable, setHoveredTable] = useState<Table | null>(null);

  // Compute availability stats for the active slot
  const tableStatusList = tables.map((t) => ({
    table: t,
    status: getTableStatus(t),
  }));

  const availableCount = tableStatusList.filter((item) => item.status === 'available').length;
  const suitableCount = tableStatusList.filter(
    (item) => item.status === 'available' && item.table.capacity >= guests
  ).length;

  return (
    <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-sm">
      
      {/* Top Header & Slot Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8E6E1]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-light text-[#2C3333] tracking-tight">
              Interactive 2D Floor Plan
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20">
              Live Blueprint
            </span>
          </div>
          <p className="text-xs text-[#2C3333]/60 mt-1">
            Table availability is locked to <span className="font-semibold text-[#2C3333]">{date}</span> for <span className="font-semibold text-[#4F6F52]">{timeSlot} IST</span> for <span className="font-semibold text-[#2C3333]">{guests} {guests === 1 ? 'Guest' : 'Guests'}</span>.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border-2 border-[#4F6F52] bg-[#4F6F521A]"></span>
            <span className="text-[#2C3333] text-[11px] font-medium">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#4F6F52] text-white flex items-center justify-center text-[9px] font-bold">✓</span>
            <span className="text-[#2C3333] font-bold text-[11px]">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-amber-300 bg-amber-50 flex items-center justify-center text-[9px] text-amber-700 font-bold">•</span>
            <span className="text-[#2C3333]/60 text-[11px]">Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-[#E8E6E1] bg-[#FAF9F6]"></span>
            <span className="text-[#2C3333]/40 text-[11px]">Occupied</span>
          </div>
        </div>
      </div>

      {/* Smart Match Suggestion Banner */}
      {smartMatch && smartMatch.table && (
        <div className="my-4 p-4 rounded-2xl bg-[#4F6F521A] border border-[#4F6F52]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F6F52] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#4F6F52] uppercase tracking-widest">
                  Smart Match Recommendation
                </span>
                <span className="text-[10px] bg-white text-[#4F6F52] font-bold px-2 py-0.5 rounded-full border border-[#4F6F52]/20">
                  {smartMatch.matchScore}% Match
                </span>
              </div>
              <p className="text-xs font-bold text-[#2C3333] mt-0.5">
                Table {smartMatch.table.tableNumber} ({smartMatch.table.section}) • Seats up to {smartMatch.table.capacity}
              </p>
              <p className="text-[11px] text-[#2C3333]/70">
                {smartMatch.matchReasons.join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={onApplySmartMatch}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer whitespace-nowrap shadow-xs ${
              selectedTableId === smartMatch.table.id
                ? 'bg-[#4F6F52] text-white'
                : 'bg-white hover:bg-[#FAF9F6] text-[#4F6F52] border border-[#4F6F52]/40'
            }`}
          >
            {selectedTableId === smartMatch.table.id ? '✓ Selected' : 'Select This Table'}
          </button>
        </div>
      )}

      {/* If No Tables are available for this party size */}
      {suitableCount === 0 && (
        <div className="my-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                All tables for {guests} {guests === 1 ? 'guest' : 'guests'} are currently reserved for {timeSlot}
              </h4>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                FlashTable does not operate an uncertain waiting line. Set a notification to be alerted the moment a suitable table becomes vacant.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenNotifyMe}
            className="px-4 py-2 text-xs font-semibold rounded-full bg-amber-900 hover:bg-amber-950 text-white transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Notify Me When Available</span>
          </button>
        </div>
      )}

      {/* Multi-Floor Selector Navigation */}
      {floors && floors.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 border-b border-[#E8E6E1]/60">
          <span className="text-xs font-bold text-[#2C3333] shrink-0 mr-1">Floor Level:</span>
          {floors.map((floor) => {
            const isSelected = floor.id === activeFloorId;
            const floorTablesCount = tables.filter((t) => (t.floorId || 'floor-0') === floor.id).length;
            return (
              <button
                key={floor.id}
                type="button"
                onClick={() => onSelectFloor && onSelectFloor(floor.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-[#4F6F52] text-white shadow-xs'
                    : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
                }`}
              >
                <span>{floor.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#E8E6E1] text-[#2C3333]/80'
                }`}>
                  {floorTablesCount} tables
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2D Architectural Floor Stage Canvas */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[380px] bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1] overflow-hidden p-4 select-none">
        
        {/* Subtle Architectural Grid Lines & Wall Guides */}
        <div 
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: 'radial-gradient(#4F6F52 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Section Banners & Architectural Markings */}
        {/* Top: Courtyard Verandah with Garden View */}
        <div className="absolute top-2 left-6 right-6 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[#4F6F52]/20 text-[#4F6F52] text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
            <Sun className="w-3 h-3" />
            <span>Courtyard Terrace & Garden Vista</span>
          </div>
          <span className="text-[10px] text-[#2C3333]/40 font-medium tracking-wide">
            WINDOW EXPANSION ➔
          </span>
        </div>

        {/* Middle: Main Dining Hall */}
        <div className="absolute top-[35%] left-6 pointer-events-none">
          <div className="px-2.5 py-0.5 rounded bg-white/80 border border-[#E8E6E1] text-[#2C3333]/60 text-[9px] font-bold uppercase tracking-widest">
            Main Dining Hall
          </div>
        </div>

        {/* Bottom Left: Cocktail Bar */}
        <div className="absolute bottom-3 left-6 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#E8E6E1] text-[#2C3333] text-[10px] font-bold">
            <Wine className="w-3 h-3 text-[#4F6F52]" />
            <span>Craft Mixology Bar</span>
          </div>
        </div>

        {/* Bottom Right: Private Alcoves */}
        <div className="absolute bottom-3 right-6 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#E8E6E1] text-[#2C3333] text-[10px] font-bold">
            <Armchair className="w-3 h-3 text-[#4F6F52]" />
            <span>Curtained Private Alcoves</span>
          </div>
        </div>

        {/* Entrance Marker */}
        <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 flex items-center pointer-events-none">
          <div className="bg-[#2C3333] text-white text-[8px] font-bold uppercase tracking-widest py-2 px-1 rounded-r-md writing-vertical">
            Entrance
          </div>
        </div>

        {/* Render Tables */}
        {(activeFloorId ? tables.filter((t) => (t.floorId || 'floor-0') === activeFloorId) : tables).map((table) => {
          const rawStatus = getTableStatus(table);
          const isSelected = selectedTableId === table.id;
          const isAvailable = rawStatus === 'available';
          const isRecommended = smartMatch?.table.id === table.id;
          const fitsParty = table.capacity >= guests;

          let displayState = rawStatus;
          if (isSelected) {
            displayState = 'selected';
          }

          return (
            <div
              key={table.id}
              onClick={() => {
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
              }}
              className={`absolute transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
                isAvailable ? 'hover:scale-105 z-10' : 'cursor-not-allowed opacity-75'
              }`}
              id={`table-node-${table.id}`}
            >
              {/* Visual Table Container */}
              <div
                className={`relative w-full h-full flex flex-col items-center justify-center p-1 shadow-xs transition-all ${
                  table.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                } ${
                  displayState === 'selected'
                    ? 'bg-[#4F6F52] text-white border-2 border-[#3D5A40] shadow-md ring-4 ring-[#4F6F52]/20'
                    : displayState === 'available'
                    ? fitsParty
                      ? 'bg-white hover:bg-[#4F6F521A] border-2 border-[#4F6F52] text-[#2C3333]'
                      : 'bg-[#FAF9F6] border border-[#4F6F52]/40 text-[#2C3333]/60'
                    : displayState === 'reserved'
                    ? 'bg-[#FAF9F6] border border-amber-300 text-[#2C3333]/60'
                    : 'bg-[#F2EFE9] border border-[#E8E6E1] text-[#2C3333]/40'
                }`}
              >
                {/* Smart Match Recommendation Star Icon */}
                {isRecommended && displayState !== 'selected' && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 p-1 rounded-full shadow-xs animate-bounce">
                    <Sparkles className="w-3 h-3" />
                  </span>
                )}

                {/* Table Number */}
                <div className={`text-xs sm:text-sm font-bold tracking-tight ${
                  displayState === 'selected' ? 'text-white' : 'text-[#2C3333]'
                }`}>
                  {table.tableNumber}
                </div>

                {/* Capacity & Icon */}
                <div className={`flex items-center gap-0.5 text-[9px] font-semibold ${
                  displayState === 'selected' ? 'text-white/80' : 'text-[#2C3333]/60'
                }`}>
                  <Users className="w-2.5 h-2.5" />
                  <span>{table.capacity}p</span>
                </div>

                {/* Mini Status Tag */}
                <div className="mt-0.5">
                  {displayState === 'selected' ? (
                    <span className="text-[8px] bg-white text-[#4F6F52] px-1 rounded font-bold uppercase">
                      Chosen
                    </span>
                  ) : displayState === 'available' ? (
                    <span className="text-[8px] text-[#4F6F52] font-bold">
                      Free
                    </span>
                  ) : displayState === 'reserved' ? (
                    <span className="text-[8px] text-amber-800 font-medium">
                      Hold
                    </span>
                  ) : (
                    <span className="text-[8px] text-[#2C3333]/40 font-medium">
                      Busy
                    </span>
                  )}
                </div>

              </div>

              {/* Decorative Chairs around table */}
              {table.shape === 'rect' && (
                <>
                  <div className="absolute -top-1 w-1/2 h-1 bg-[#E8E6E1] rounded-full" />
                  <div className="absolute -bottom-1 w-1/2 h-1 bg-[#E8E6E1] rounded-full" />
                </>
              )}
            </div>
          );
        })}

        {/* Dynamic Tooltip on Hover */}
        {hoveredTable && (
          <div 
            style={{
              left: `${Math.min(hoveredTable.x + 12, 70)}%`,
              top: `${Math.max(hoveredTable.y - 12, 5)}%`,
            }}
            className="absolute z-30 pointer-events-none p-3.5 rounded-2xl bg-[#2C3333] text-white text-xs shadow-xl min-w-[190px] border border-[#2C3333] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <span className="font-bold text-sm text-[#FAF9F6]">Table {hoveredTable.tableNumber}</span>
              <span className="text-[10px] text-[#FAF9F6]/70 capitalize px-1.5 py-0.5 bg-white/10 rounded-full">
                {getTableStatus(hoveredTable)}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-[#FAF9F6]/80">
              <div className="flex items-center justify-between">
                <span>Section:</span>
                <span className="text-white font-medium">{hoveredTable.section}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Capacity:</span>
                <span className="text-white font-medium">{hoveredTable.capacity} guests</span>
              </div>
              <div className="pt-1 text-[10px] text-[#FAF9F6]/60">
                {hoveredTable.features.join(' • ')}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Selected Table Action Footer */}
      <div className="mt-5 p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          {selectedTableId ? (
            (() => {
              const currentTable = tables.find((t) => t.id === selectedTableId);
              return (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#2C3333]/60">Your Selected Table:</span>
                    <span className="text-sm font-bold font-serif text-[#2C3333]">
                      Table {currentTable?.tableNumber || selectedTableId} ({currentTable?.section || 'Main Dining'})
                    </span>
                  </div>
                  <p className="text-xs text-[#2C3333]/70 mt-0.5">
                    Seats up to {currentTable?.capacity || 2} guests{currentTable?.features?.length ? ` • ${currentTable.features.join(', ')}` : ''}
                  </p>
                </div>
              );
            })()
          ) : (
            <div>
              <span className="text-xs font-semibold text-[#2C3333]">No table selected yet</span>
              <p className="text-xs text-[#2C3333]/60">
                Click on any open table on the floor plan above, or use Smart Match recommendation.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNotifyMe}
            className="px-4 py-2 text-xs font-medium text-[#2C3333]/70 hover:text-[#4F6F52] hover:bg-white rounded-full border border-[#E8E6E1] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5 text-[#4F6F52]" />
            <span>Notify Me of Cancellations</span>
          </button>
        </div>
      </div>

    </div>
  );
};
