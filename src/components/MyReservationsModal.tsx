import React, { useState, useMemo } from 'react';
import { 
  X, 
  CalendarDays, 
  MapPin, 
  Clock, 
  Users, 
  Armchair, 
  QrCode, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Phone
} from 'lucide-react';
import { Reservation, CancellationRecord, Restaurant } from '../types';
import { ReservationTimerBadge } from './ReservationTimerBadge';
import { DiningTimerCard } from './DiningTimerCard';
import { CancellationPenaltyModal } from './CancellationPenaltyModal';
import { hydrateReservationWithSoloSafety, dispatchSoloSafetyNotification } from '../services/soloSafetyService';

interface MyReservationsModalProps {
  reservations: Reservation[];
  isOpen: boolean;
  onClose: () => void;
  onCancelReservation: (id: string, penaltyRecord?: CancellationRecord) => void;
  onSimulateCheckIn: (id: string) => void;
  restaurants?: Restaurant[];
  currentUser?: {
    userId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
}

export const MyReservationsModal: React.FC<MyReservationsModalProps> = ({
  reservations,
  isOpen,
  onClose,
  onCancelReservation,
  onSimulateCheckIn,
  restaurants = [],
  currentUser,
}) => {
  const uniqueReservations = useMemo(() => {
    const seen = new Set<string>();
    return reservations.filter((r) => {
      if (!r || !r.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [reservations]);

  const [selectedQrRes, setSelectedQrRes] = useState<Reservation | null>(
    uniqueReservations.length > 0 ? uniqueReservations[0] : null
  );
  const [penaltyCancelRes, setPenaltyCancelRes] = useState<Reservation | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-[#FAF9F6] w-full max-w-4xl rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left column: List of reservations */}
        <div className="md:w-3/5 p-6 border-b md:border-b-0 md:border-r border-[#E8E6E1] overflow-y-auto">
          
          <div className="flex items-center justify-between pb-5 border-b border-[#E8E6E1]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  My Reservations
                </h3>
                <p className="text-xs text-[#2C3333]/60">
                  Your confirmed dining tables and passes
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-2 rounded-full text-[#2C3333]/60 hover:text-[#2C3333]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List items */}
          <div className="mt-5 space-y-3.5">
            {uniqueReservations.length > 0 ? (
              uniqueReservations.map((res) => {
                const isSelected = selectedQrRes?.id === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => setSelectedQrRes(res)}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#4F6F52] shadow-sm ring-1 ring-[#4F6F52]/20'
                        : 'bg-white/70 hover:bg-white border-[#E8E6E1]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold font-serif text-base text-[#2C3333]">
                            {res.restaurantName}
                          </h4>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                            res.status === 'confirmed'
                              ? 'bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20'
                              : res.status === 'arrived'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-[#FAF9F6] text-[#2C3333]/60 border border-[#E8E6E1]'
                          }`}>
                            {res.status.toUpperCase()}
                          </span>
                          {res.status !== 'cancelled' && (
                            <ReservationTimerBadge reservation={res} />
                          )}
                        </div>
                        <p className="text-xs text-[#2C3333]/70 mt-0.5">
                          {res.restaurantAddress}
                        </p>
                        {(() => {
                          const careNum = restaurants.find((r) => r.id === res.restaurantId)?.customerCareNumber || res.restaurantCustomerCareNumber;
                          if (!careNum) return null;
                          return (
                            <p className="text-[11px] font-semibold text-[#4F6F52] mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>Customer Care: {careNum}</span>
                            </p>
                          );
                        })()}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40 block">Ref</span>
                        <span className="text-xs font-mono font-bold text-[#4F6F52]">{res.bookingRef}</span>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3.5 border-t border-[#E8E6E1] grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40 block">Table</span>
                        <span className="font-bold font-serif text-[#4F6F52]">Table {res.tableNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40 block">Schedule</span>
                        <span className="font-semibold text-[#2C3333]">{res.date} • {res.timeSlot}</span>
                        {res.status !== 'cancelled' && (
                          <div className="mt-1">
                            <ReservationTimerBadge reservation={res} variant="inline" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/40 block">Party</span>
                        <span className="font-semibold text-[#2C3333]">{res.guests} Guests</span>
                      </div>
                    </div>

                    {/* Solo Diner Safety Badge */}
                    {(() => {
                      const hydrated = hydrateReservationWithSoloSafety(res);
                      if (!hydrated.soloDinerSafety?.enabled) return null;
                      return (
                        <div className="mt-2.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Solo Diner Safety Active
                          </span>
                          <span className="font-mono text-emerald-700">{hydrated.soloDinerSafety.contactName}</span>
                        </div>
                      );
                    })()}

                    {/* Clock In / Clock Out Dining Timer */}
                    {res.status !== 'cancelled' && (
                      <div className="mt-3">
                        <DiningTimerCard reservation={res} />
                      </div>
                    )}

                    <div className="mt-3.5 flex items-center justify-between text-xs pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQrRes(res);
                        }}
                        className="text-xs font-semibold text-[#4F6F52] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View Check-In Pass</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPenaltyCancelRes(res);
                        }}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                        id={`cancel-table-btn-${res.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel Table</span>
                      </button>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#E8E6E1] p-6">
                <AlertCircle className="w-8 h-8 text-[#2C3333]/30 mx-auto mb-2" />
                <p className="text-xs text-[#2C3333]/80 font-medium">No upcoming table reservations.</p>
                <p className="text-[11px] text-[#2C3333]/50 mt-0.5">Explore restaurants to pick an available 2D table.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right column: Selected QR Pass & Fast Check-in Simulator */}
        <div className="md:w-2/5 p-6 bg-white flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold font-serif text-[#2C3333]">
                Digital Boarding Pass
              </h4>
              <button
                onClick={onClose}
                className="hidden md:block p-1.5 rounded-full text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedQrRes ? (
              <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E8E6E1] text-center space-y-3">
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#4F6F521A] text-[#4F6F52] text-[10px] font-bold uppercase tracking-widest">
                  <span>Contactless Check-In</span>
                </div>

                <div>
                  <h5 className="font-bold text-base font-serif text-[#2C3333]">
                    {selectedQrRes.restaurantName}
                  </h5>
                  <p className="text-xs text-[#2C3333]/70">
                    Table {selectedQrRes.tableNumber} • {selectedQrRes.section}
                  </p>
                  <p className="text-[11px] text-[#2C3333]/50">
                    {selectedQrRes.date} at {selectedQrRes.timeSlot} IST
                  </p>
                </div>

                {/* QR Code graphic (Standard Black on White) */}
                <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border border-black/10 shadow-sm flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                    <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" />
                    {/* Corner Finders (Standard Black) */}
                    <rect x="5" y="5" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                    <rect x="11" y="11" width="14" height="14" rx="1" fill="#000000" />
                    <rect x="69" y="5" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                    <rect x="75" y="11" width="14" height="14" rx="1" fill="#000000" />
                    <rect x="5" y="69" width="26" height="26" rx="2" fill="none" stroke="#000000" strokeWidth="4" />
                    <rect x="11" y="75" width="14" height="14" rx="1" fill="#000000" />

                    {/* Black Data Modules */}
                    <rect x="38" y="12" width="10" height="8" fill="#000000" />
                    <rect x="52" y="16" width="10" height="6" fill="#000000" />
                    <rect x="42" y="26" width="14" height="8" fill="#000000" />
                    <rect x="12" y="42" width="14" height="8" fill="#000000" />
                    <rect x="36" y="38" width="12" height="12" fill="#000000" />
                    <rect x="58" y="42" width="10" height="8" fill="#000000" />
                    <rect x="76" y="46" width="14" height="8" fill="#000000" />
                    <rect x="40" y="58" width="12" height="8" fill="#000000" />
                    <rect x="62" y="60" width="12" height="14" fill="#000000" />
                    <rect x="80" y="76" width="12" height="12" fill="#000000" />
                    <rect x="40" y="76" width="14" height="10" fill="#000000" />
                  </svg>
                </div>

                <div className="font-mono text-xs font-bold text-[#4F6F52]">
                  {selectedQrRes.bookingRef}
                </div>

                {/* Solo Diner Safety Pass Badge */}
                {(() => {
                  const hydrated = hydrateReservationWithSoloSafety(selectedQrRes);
                  if (!hydrated.soloDinerSafety?.enabled) return null;
                  return (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2 text-left">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Solo Diner Safety Check-In</span>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Trusted Contact: {hydrated.soloDinerSafety.contactName} ({hydrated.soloDinerSafety.contactPhone}) via {hydrated.soloDinerSafety.notifyMethod}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Simulate Check In at Door */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const hydrated = hydrateReservationWithSoloSafety(selectedQrRes);
                      if (hydrated.soloDinerSafety?.enabled) {
                        dispatchSoloSafetyNotification(hydrated, 'QR');
                      }
                      onSimulateCheckIn(selectedQrRes.id);
                    }}
                    className="w-full py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simulate Staff Host Check-In</span>
                  </button>
                  <p className="text-[10px] text-[#2C3333]/50 mt-2">
                    Demonstrates how staff podium scans QR to mark table as 'Occupied/Seated'.
                  </p>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 text-xs text-[#2C3333]/60">
                Select a reservation on the left to display QR check-in ticket.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E6E1] text-center">
            <span className="text-[11px] text-[#2C3333]/50">Need assistance? Bengaluru Concierge: +91 80 4122 8899</span>
          </div>
        </div>

      </div>

      {/* Cancellation & ₹100 Penalty Modal */}
      {penaltyCancelRes && (
        <CancellationPenaltyModal
          reservation={penaltyCancelRes}
          onClose={() => setPenaltyCancelRes(null)}
          onConfirmCancellation={(penaltyRecord) => {
            onCancelReservation(penaltyCancelRes.id, penaltyRecord);
            if (selectedQrRes?.id === penaltyCancelRes.id) setSelectedQrRes(null);
            setPenaltyCancelRes(null);
          }}
          customerCareNumber={
            restaurants.find((r) => r.id === penaltyCancelRes.restaurantId)?.customerCareNumber ||
            restaurants.find((r) => r.id === penaltyCancelRes.restaurantId)?.contactNumber ||
            penaltyCancelRes.restaurantCustomerCareNumber
          }
          userId={currentUser?.userId || penaltyCancelRes.userId}
          allReservations={reservations}
        />
      )}
    </div>
  );
};
