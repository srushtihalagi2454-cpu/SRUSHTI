import React, { useState, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  Loader2,
  History
} from 'lucide-react';
import { Table, Reservation } from '../types';

interface RemoveTableModalProps {
  table: Table;
  restaurantId: string;
  restaurantName: string;
  reservations: Reservation[];
  onClose: () => void;
  onConfirmRemove: (tableId: string) => Promise<boolean>;
}

export const RemoveTableModal: React.FC<RemoveTableModalProps> = ({
  table,
  restaurantId,
  restaurantName,
  reservations,
  onClose,
  onConfirmRemove,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Find all reservations linked to this table, deduplicated by id
  const tableReservations = useMemo(() => {
    const seen = new Set<string>();
    return reservations.filter(
      (r) => {
        if (!r || !r.id || seen.has(r.id)) return false;
        const matches = r.restaurantId === restaurantId &&
          (r.tableId === table.id ||
            r.tableNumber?.toLowerCase() === table.tableNumber.toLowerCase() ||
            r.tableId?.toLowerCase() === table.tableNumber.toLowerCase());
        if (matches) {
          seen.add(r.id);
          return true;
        }
        return false;
      }
    );
  }, [reservations, restaurantId, table]);

  // Identify active / current reservations (confirmed, seated, checked-in)
  const activeReservations = useMemo(() => {
    return tableReservations.filter((r) => {
      const status = (r.status || '').toLowerCase();
      return status === 'confirmed' || status === 'seated' || status === 'checked-in';
    });
  }, [tableReservations]);

  // Past / completed reservations (history preserved)
  const historicalReservations = useMemo(() => {
    return tableReservations.filter((r) => {
      const status = (r.status || '').toLowerCase();
      return status !== 'confirmed' && status !== 'seated' && status !== 'checked-in';
    });
  }, [tableReservations]);

  const hasActiveReservations = activeReservations.length > 0;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const success = await onConfirmRemove(table.id);
      if (success) {
        onClose();
      } else {
        setErrorMsg('Failed to remove table. Please verify connection and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove table.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-3xl border border-[#E8E6E1] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        id="remove-table-modal"
      >
        {/* Header */}
        <div className={`p-6 pb-4 border-b border-[#E8E6E1] flex items-center justify-between ${
          hasActiveReservations ? 'bg-amber-50/60' : 'bg-rose-50/60'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasActiveReservations ? 'bg-amber-600' : 'bg-rose-600'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                hasActiveReservations ? 'text-amber-800' : 'text-rose-800'
              }`}>
                {hasActiveReservations ? 'Safe Table Deactivation' : 'Confirm Table Removal'}
              </span>
            </div>
            <h3 className="text-xl font-bold font-serif text-[#2C3333] mt-0.5">
              Remove Table {table.tableNumber}
            </h3>
            <p className="text-xs text-[#2C3333]/60">
              {restaurantName} • {table.section}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E6E1] flex items-center justify-center text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            id="btn-close-remove-table"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-[#2C3333]">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Table Summary Card */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 block">
                Target Table
              </span>
              <h4 className="text-lg font-bold font-serif text-[#2C3333] mt-0.5">
                Table {table.tableNumber}
              </h4>
              <p className="text-xs text-[#2C3333]/70 mt-0.5">
                {table.section} • Capacity: {table.capacity} guests • {table.shape}
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white rounded-lg border border-[#E8E6E1] text-[#2C3333]/70">
              ID: {table.id.split('-').slice(-2).join('-')}
            </span>
          </div>

          {/* Branch 1: Has Active Reservations (Safe Inactivation Flow) */}
          {hasActiveReservations ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Preserving Active & Historical Reservations</span>
                </div>
                <p className="text-xs text-amber-800/90 leading-relaxed">
                  Table {table.tableNumber} currently has <span className="font-bold">{activeReservations.length} active reservation(s)</span>. 
                  To protect your guests and reservation records, removing this table will safely mark it as <span className="font-bold">Inactive/Deactivated</span> in Google Sheets. 
                  No historical or active booking data will be deleted, and this table will immediately stop being offered for any new customer bookings.
                </p>
              </div>

              {/* Active Reservations List */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 block">
                  Preserved Active Reservations on Table {table.tableNumber}:
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activeReservations.map((res) => (
                    <div 
                      key={res.id} 
                      className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#2C3333]">
                          {res.customerName}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                          {res.bookingRef}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#2C3333]/70">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#4F6F52]" />
                          {res.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#4F6F52]" />
                          {res.timeSlot}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#4F6F52]" />
                          {res.guests}p
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Branch 2: Safe to Remove (Zero active reservations) */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>Floor Plan & Inventory Update</span>
                </div>
                <p className="text-xs text-rose-900/90 leading-relaxed">
                  Are you sure you want to remove <span className="font-bold">Table {table.tableNumber}</span>? 
                  This will remove the table from your live floor plan and it will no longer be offered for customer bookings.
                </p>
              </div>

              {/* Data Safety Notice */}
              <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2C3333]/70">
                  <History className="w-3.5 h-3.5 text-[#4F6F52]" />
                  <span>Reservation History Intact</span>
                </div>
                <p className="text-xs text-[#2C3333]/70 leading-relaxed">
                  Past completed or cancelled reservations ({historicalReservations.length} records) 
                  are safely retained in your master booking logs. No historical data will ever be lost.
                </p>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#E8E6E1] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-xl border border-[#E8E6E1] text-[#2C3333]/70 font-semibold text-xs hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              id="btn-cancel-remove-table"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50 text-white ${
                hasActiveReservations ? 'bg-amber-700 hover:bg-amber-800' : 'bg-rose-600 hover:bg-rose-700'
              }`}
              id="btn-confirm-remove-table"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{hasActiveReservations ? 'Deactivating...' : 'Removing Table...'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{hasActiveReservations ? 'Confirm Safe Deactivation' : 'Confirm Remove Table'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
