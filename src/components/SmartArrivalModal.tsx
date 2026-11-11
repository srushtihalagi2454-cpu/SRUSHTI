import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  QrCode, 
  CheckCircle2, 
  ShieldCheck, 
  Navigation, 
  Compass,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { Reservation, SmartArrivalDistanceOption, SmartArrivalState } from '../types';
import { SmartArrivalMap } from './SmartArrivalMap';
import { formatDistance, formatDistanceWithAway, calculateEstimatedEta, GEOFENCE_RADIUS_METERS } from '../utils/smartArrival';
import { cleanDateString, cleanTimeString, formatSyncedTimeIST } from '../utils/dateTime';

interface SmartArrivalModalProps {
  reservations: Reservation[];
  reservation?: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenQrPass: (reservation: Reservation) => void;
  smartArrivalState: SmartArrivalState;
  onToggleSmartArrival: (enabled: boolean) => void;
  onSimulateDistance?: (distance: SmartArrivalDistanceOption) => void;
  // Real Customer GPS Props
  isGpsTracking?: boolean;
  customerGpsCoords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  gpsError?: string | null;
  gpsStatus?: 'idle' | 'requesting' | 'active' | 'error' | 'unsupported';
  onStartSmartArrival?: (res?: Reservation) => void;
  onStopSmartArrival?: () => void;
  onClearGpsError?: () => void;
}

export const SmartArrivalModal: React.FC<SmartArrivalModalProps> = ({
  reservations,
  reservation = null,
  isOpen,
  onClose,
  onOpenQrPass,
  smartArrivalState,
  onToggleSmartArrival,
  isGpsTracking = false,
  customerGpsCoords = null,
  gpsError = null,
  onStartSmartArrival,
  onStopSmartArrival,
  onClearGpsError,
}) => {
  const [hasDismissedGeofencePrompt, setHasDismissedGeofencePrompt] = useState<boolean>(false);

  if (!isOpen) return null;

  // Primary active reservation: prioritize explicitly passed reservation object from selected card
  const activeBooking = reservation || reservations.find(
    (r) => r && r.id && r.id === smartArrivalState.reservationId
  ) || reservations.find(
    (r) => r && r.id && r.id !== 'res-ember-07' && r.id !== 'RES-1788787060247'
  ) || reservations[0];

  const isTrackingActive = isGpsTracking || smartArrivalState.isGpsActive;
  const activeLat = customerGpsCoords?.latitude ?? smartArrivalState.customerLat ?? undefined;
  const activeLng = customerGpsCoords?.longitude ?? smartArrivalState.customerLng ?? undefined;
  const activeAccuracy = customerGpsCoords?.accuracy ?? smartArrivalState.customerAccuracy ?? undefined;

  // Real distance and geofence calculation
  const distanceText = smartArrivalState.distanceText ?? formatDistance(smartArrivalState.distanceMeters);
  const distanceAwayText = formatDistanceWithAway(smartArrivalState.distanceMeters);
  const isInside500m = isTrackingActive && smartArrivalState.isInsideGeofence;
  const etaResult = calculateEstimatedEta(smartArrivalState.distanceMeters);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      id="smart-arrival-modal-overlay"
    >
      <div 
        className="bg-white w-full max-w-xl rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        id="smart-arrival-modal-content"
      >
        {/* Header */}
        <div className="bg-[#FAF9F6] p-5 sm:p-6 border-b border-[#E8E6E1] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              isTrackingActive
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-[#4F6F521A] text-[#4F6F52] border-[#4F6F52]/20'
            }`}>
              <Navigation className={`w-5 h-5 ${isTrackingActive ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Smart Arrival
                </h3>
                {isTrackingActive ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    SMART ARRIVAL ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20">
                    500m Geofence
                  </span>
                )}
              </div>
              <p className="text-xs text-[#2C3333]/70 mt-1 leading-relaxed">
                {isTrackingActive
                  ? 'Real-time GPS tracking active. Your live location is monitored against the 500m restaurant geofence.'
                  : 'Share your real-time location while you are en route so the restaurant can prepare your table.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-white transition-colors cursor-pointer"
            id="close-smart-arrival-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Reservation Context Card */}
          {activeBooking ? (
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50">
                  Active Reservation Destination
                </span>
                <span className="font-mono font-bold text-[#4F6F52]">
                  {activeBooking.bookingRef}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-base text-[#2C3333]">
                  {activeBooking.restaurantName}
                </span>
                <span className="font-semibold text-xs text-[#4F6F52] bg-white px-2.5 py-0.5 rounded-full border border-[#E8E6E1]">
                  Table {activeBooking.tableNumber}
                </span>
              </div>
              <div className="text-[#2C3333]/70 text-[11px]">
                {activeBooking.guests} Guests • {cleanDateString(activeBooking.date)} at {cleanTimeString(activeBooking.timeSlot)} IST • {activeBooking.section}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Demonstration mode with primary restaurant: {smartArrivalState.restaurantName}.</span>
            </div>
          )}

          {/* Location Sharing Controls & Status Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2C3333] block">
                    Real Customer Geolocation
                  </span>
                  {isTrackingActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Live Stream
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#2C3333]/60">
                  {isTrackingActive
                    ? 'Using native browser Geolocation API (watchPosition)'
                    : 'Permission requested only when you start Smart Arrival'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isTrackingActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onStopSmartArrival) {
                        onStopSmartArrival();
                      } else {
                        onToggleSmartArrival(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    id="btn-stop-smart-arrival-modal"
                  >
                    <span>STOP SMART ARRIVAL</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onStartSmartArrival) {
                        onStartSmartArrival(activeBooking);
                      } else {
                        onToggleSmartArrival(true);
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-[#4F6F52] hover:bg-[#3D563F] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1.5 hover:shadow-md"
                    id="btn-start-smart-arrival-modal"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>START SMART ARRIVAL</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live GPS Coordinates Readout */}
            {isTrackingActive && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    Live Browser Coordinates
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800">
                    Free & Private • No Google APIs
                  </span>
                </div>
                {activeLat && activeLng ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono">
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[9px] uppercase text-stone-500 font-sans block">Latitude</span>
                      <span className="font-bold text-stone-800 text-xs">{activeLat.toFixed(6)}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[9px] uppercase text-stone-500 font-sans block">Longitude</span>
                      <span className="font-bold text-stone-800 text-xs">{activeLng.toFixed(6)}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 col-span-2 sm:col-span-1">
                      <span className="text-[9px] uppercase text-stone-500 font-sans block">Accuracy</span>
                      <span className="font-bold text-emerald-700 text-xs">
                        {activeAccuracy ? `±${Math.round(activeAccuracy)}m` : 'High precision'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-800 py-1 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Requesting browser permission and waiting for GPS fix...</span>
                  </div>
                )}

                {/* Non-blocking Backend Sync Status */}
                {smartArrivalState.backendSyncStatus === 'syncing' && (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#4F6F52] font-medium animate-pulse" id="smart-arrival-sync-status">
                    <Loader2 className="w-3 h-3 animate-spin text-[#4F6F52]" />
                    <span>Syncing live GPS & ETA with restaurant backend...</span>
                  </div>
                )}
                {smartArrivalState.backendSyncStatus === 'synced' && (
                  <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-800 font-medium" id="smart-arrival-sync-status">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Live GPS & ETA connected to restaurant</span>
                    </span>
                    {smartArrivalState.lastSyncedAt && (
                      <span className="text-[10px] text-stone-500 font-mono">
                        {formatSyncedTimeIST(smartArrivalState.lastSyncedAt)}
                      </span>
                    )}
                  </div>
                )}
                {smartArrivalState.backendSyncStatus === 'error' && (
                  <div className="flex items-start gap-1.5 pt-1 text-[11px] text-amber-800 font-medium bg-amber-50/80 p-2 rounded-lg border border-amber-200/60" id="smart-arrival-sync-status">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-tight">
                      <span>Backend update pending · Local GPS & ETA tracking continues</span>
                      {smartArrivalState.backendSyncError && (
                        <span className="text-[10px] text-amber-700 block font-normal mt-0.5">{smartArrivalState.backendSyncError}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Geolocation Error Feedback */}
            {gpsError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-2.5 text-xs text-amber-900 animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-800 block">Location Access Issue</span>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">{gpsError}</p>
                  </div>
                </div>
                {onClearGpsError && (
                  <button
                    type="button"
                    onClick={onClearGpsError}
                    className="text-amber-800/60 hover:text-amber-900 p-1 cursor-pointer"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-start gap-2 pt-1 text-[11px] text-[#2C3333]/60 border-t border-[#E8E6E1]/60">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4F6F52] shrink-0 mt-0.5" />
              <span>
                Zero-cost Leaflet & OpenStreetMap implementation. No paid tracking APIs, no external billing, and no location sharing outside your active reservation.
              </span>
            </div>
          </div>

          {/* Interactive Leaflet & OpenStreetMap Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 block">
                {isTrackingActive ? 'Live Real GPS Map (Leaflet + OpenStreetMap)' : 'Interactive OpenStreetMap Preview'}
              </span>
              {isTrackingActive && (
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  Customer & Restaurant Markers
                </span>
              )}
            </div>

            <SmartArrivalMap
              state={smartArrivalState}
              customerLat={activeLat}
              customerLng={activeLng}
              customerAccuracy={activeAccuracy}
              restaurantLat={smartArrivalState.restaurantLat}
              restaurantLng={smartArrivalState.restaurantLng}
              restaurantName={smartArrivalState.restaurantName}
              showSimulationBar={false}
            />
          </div>

          {/* Real-Time Arrival, Estimated ETA & 500m Geofence Status Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50">
                Real-Time Arrival & 500m Geofence
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                smartArrivalState.isInsideGeofence
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : isTrackingActive
                    ? 'bg-[#4F6F521A] text-[#4F6F52]'
                    : 'bg-stone-100 text-stone-600'
              }`}>
                {isTrackingActive ? smartArrivalState.customerStatus : 'GPS Inactive'}
              </span>
            </div>

            {/* Core 3 Status Metrics: Current Distance, Estimated ETA, Geofence Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* 1. Current Distance */}
              <div className="p-3 bg-white rounded-xl border border-[#E8E6E1]">
                <div className="flex items-center gap-1.5 text-[#2C3333]/60">
                  <MapPin className="w-3.5 h-3.5 text-[#4F6F52]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Current Distance</span>
                </div>
                <span className="text-sm font-bold text-[#2C3333] block mt-1 font-mono">
                  {isTrackingActive ? distanceAwayText : 'Start GPS'}
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  Direct Geodesic Distance
                </span>
              </div>

              {/* 2. Estimated ETA */}
              <div className="p-3 bg-white rounded-xl border border-[#E8E6E1]">
                <div className="flex items-center gap-1.5 text-[#2C3333]/60">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Estimated ETA</span>
                </div>
                <span className="text-sm font-bold text-[#4F6F52] block mt-1">
                  {isTrackingActive ? (etaResult ? etaResult.fullEtaText : 'Calculating...') : 'Start GPS'}
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  @ 25 km/h urban speed
                </span>
              </div>

              {/* 3. 500m Geofence Status */}
              <div className="p-3 bg-white rounded-xl border border-[#E8E6E1]">
                <div className="flex items-center gap-1.5 text-[#2C3333]/60">
                  <Compass className="w-3.5 h-3.5 text-[#4F6F52]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Geofence Status</span>
                </div>
                <span className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${
                  smartArrivalState.isInsideGeofence ? 'text-emerald-700' : 'text-[#2C3333]'
                }`}>
                  {isTrackingActive ? (
                    smartArrivalState.isInsideGeofence ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Within 500 m</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span>Outside 500 m</span>
                      </>
                    )
                  ) : (
                    <span className="text-stone-500 font-normal text-xs">Pending GPS</span>
                  )}
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  500 m Arrival Boundary
                </span>
              </div>
            </div>

            {/* Destination & Assigned Table Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8E6E1]/70 text-[11px] text-[#2C3333]/70">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-[#2C3333]">{smartArrivalState.restaurantName}</span>
                <span className="text-stone-300">•</span>
                <span className="font-semibold text-[#4F6F52]">Table {smartArrivalState.tableNumber}</span>
              </div>
              <div className="text-[10px] text-stone-500">
                Transparent local estimate • Free of cost
              </div>
            </div>
          </div>

          {/* Prominent Geofence Arrival Notification Banner when real customer is within 500 m */}
          {isInside500m && !hasDismissedGeofencePrompt && (
            <div 
              className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 space-y-3 animate-in fade-in zoom-in-95 duration-200"
              id="customer-geofence-notification-prompt"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-serif text-[#2C3333]">
                      You're near {smartArrivalState.restaurantName} ({distanceAwayText} • {etaResult?.fullEtaText})
                    </h4>
                    <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                      Within the 500 m geofence. Your table is ready—open your QR pass for instant check-in.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (activeBooking) {
                      onOpenQrPass(activeBooking);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  id="btn-open-qr-prompt"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Open QR Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasDismissedGeofencePrompt(true)}
                  className="py-2.5 px-4 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E8E6E1] text-[#2C3333]/70 hover:text-[#2C3333] text-xs font-semibold transition-colors cursor-pointer"
                  id="btn-not-now-prompt"
                >
                  Not now
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF9F6] border-t border-[#E8E6E1] flex items-center justify-between text-xs text-[#2C3333]/60">
          <span className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4F6F52]" />
            <span>FlashTable Smart Arrival • Real Geofence Integration</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white border border-[#E8E6E1] hover:bg-[#FAF9F6] text-[#2C3333] text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
