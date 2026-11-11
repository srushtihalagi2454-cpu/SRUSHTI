import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  AlertCircle, 
  Layers, 
  Loader2
} from 'lucide-react';
import { Table, RestaurantFloor } from '../types';

interface AddTableModalProps {
  restaurantId: string;
  restaurantName: string;
  existingTables: Table[];
  floors?: RestaurantFloor[];
  activeFloorId?: string;
  onClose: () => void;
  onAddTable: (newTable: Table) => Promise<boolean>;
}

export const AddTableModal: React.FC<AddTableModalProps> = ({
  restaurantId,
  restaurantName,
  existingTables,
  floors = [],
  activeFloorId,
  onClose,
  onAddTable,
}) => {
  // Suggest next table number based on existing tables
  const suggestedNumber = React.useMemo(() => {
    const numbers = existingTables
      .map((t) => {
        const match = t.tableNumber.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((n) => n > 0);
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : existingTables.length;
    const nextVal = maxNum + 1;
    const prefix = existingTables[0]?.tableNumber.replace(/\d+.*$/, '') || 'T';
    return `${prefix}${nextVal < 10 ? '0' + nextVal : nextVal}`;
  }, [existingTables]);

  const [tableNumber, setTableNumber] = useState<string>(suggestedNumber);
  const [selectedFloorId, setSelectedFloorId] = useState<string>(activeFloorId || floors[0]?.id || 'floor-0');
  const [capacity, setCapacity] = useState<number>(4);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Calculate default floor plan coordinates on target floor to prevent overlap
  const calculateCoordinates = (targetFloorId: string) => {
    const tablesOnThisFloor = existingTables.filter(
      (t) => (t.floorId || 'floor-0') === targetFloorId
    );
    const count = tablesOnThisFloor.length;
    const col = count % 4;
    const row = Math.floor(count / 4);
    const x = Math.min(76, 8 + col * 22);
    const y = Math.min(74, 12 + row * 20);
    return { x, y, width: 18, height: 15 };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanNum = tableNumber.trim();
    if (!cleanNum) {
      setErrorMessage('Please enter a table number or name.');
      return;
    }

    // Check duplicate table number on same floor
    const duplicate = existingTables.some(
      (t) => (t.floorId || 'floor-0') === selectedFloorId && t.tableNumber.toLowerCase() === cleanNum.toLowerCase()
    );
    if (duplicate) {
      setErrorMessage(`Table number "${cleanNum}" already exists on this floor. Please choose a distinct table number.`);
      return;
    }

    if (capacity < 1) {
      setErrorMessage('Capacity must be at least 1 guest.');
      return;
    }

    setIsSubmitting(true);
    const coords = calculateCoordinates(selectedFloorId);
    const uniqueTableId = `tbl-${restaurantId}-${cleanNum.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
    const matchedFloor = floors.find((f) => f.id === selectedFloorId) || floors[0];

    const newTableObj: Table = {
      id: uniqueTableId,
      tableId: uniqueTableId,
      restaurantId,
      tableNumber: cleanNum,
      capacity,
      minCapacity: 1,
      shape: 'rect', // Fixed strictly as RECTANGLE
      section: matchedFloor?.name || 'Main Dining',
      category: 'Standard',
      floorId: matchedFloor?.id || 'floor-0',
      floorNumber: matchedFloor?.floorNumber || 0,
      floorName: matchedFloor?.name || 'Ground Floor',
      features: ['Indoor Seating'],
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      status: 'available', // Default available status
    };

    try {
      const success = await onAddTable(newTableObj);
      if (success) {
        onClose();
      } else {
        setErrorMessage('Could not save table. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to add table.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-3xl border border-[#E8E6E1] w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        id="add-table-modal"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E8E6E1] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4F6F52]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52]">
                Floor Blueprint
              </span>
            </div>
            <h3 className="text-xl font-bold font-serif text-[#2C3333] mt-0.5">
              Add Table
            </h3>
            <p className="text-xs text-[#2C3333]/60">
              Adding to <span className="font-semibold text-[#2C3333]">{restaurantName}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E6E1] flex items-center justify-center text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            id="btn-close-add-table"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-[#2C3333]">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Floor Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Floor Level *</span>
            </label>
            {floors && floors.length > 0 ? (
              <select
                value={selectedFloorId}
                onChange={(e) => setSelectedFloorId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-sm font-semibold text-[#2C3333] focus:outline-none focus:border-[#4F6F52] focus:bg-white cursor-pointer"
                id="select-add-table-floor"
              >
                {floors.map((fl) => (
                  <option key={fl.id} value={fl.id}>
                    {fl.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 bg-stone-100 rounded-xl text-xs text-stone-600 font-medium">
                Ground Floor (Default)
              </div>
            )}
          </div>

          {/* Table Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 mb-1.5">
              Table Number *
            </label>
            <input
              type="text"
              required
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. T01, T02, T03"
              className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-sm font-semibold text-[#2C3333] focus:outline-none focus:border-[#4F6F52] focus:bg-white"
              id="input-add-table-number"
            />
          </div>

          {/* Max Capacity */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 mb-1.5">
              Capacity (Guests) *
            </label>
            <div className="flex items-center gap-2">
              {[2, 4, 6, 8].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setCapacity(cap)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    capacity === cap
                      ? 'bg-[#4F6F52] text-white border-[#4F6F52] shadow-xs'
                      : 'bg-[#FAF9F6] text-[#2C3333]/70 border-[#E8E6E1] hover:bg-white'
                  }`}
                >
                  {cap}p
                </button>
              ))}
              <div className="w-20">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={capacity}
                  onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-2.5 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs font-bold text-center text-[#2C3333] focus:outline-none focus:border-[#4F6F52]"
                  title="Custom capacity"
                />
              </div>
            </div>
          </div>

          {/* Rectangular Table Preview */}
          <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 block">
                Shape & Format
              </span>
              <span className="text-xs font-bold text-[#2C3333] block mt-0.5">
                Rectangular Table ({capacity} Guests)
              </span>
            </div>
            <div className="w-16 h-10 rounded-lg border-2 border-emerald-500 bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs font-mono">
              {tableNumber || 'T--'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-[#E8E6E1] text-[#2C3333]/70 font-semibold text-xs hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              id="btn-cancel-add-table"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#4F6F52] hover:bg-[#3D563F] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              id="btn-submit-add-table"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding Table...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Table</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
