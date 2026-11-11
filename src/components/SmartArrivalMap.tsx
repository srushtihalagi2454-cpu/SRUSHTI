import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  SmartArrivalDistanceOption, 
  SmartArrivalState 
} from '../types';
import { 
  MapPin, 
  Layers,
  Compass,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  GEOFENCE_RADIUS_METERS,
  DEFAULT_RESTAURANT_COORDINATES,
  calculateHaversineDistance,
  formatDistance,
  formatDistanceWithAway,
  calculateEstimatedEta
} from '../utils/smartArrival';

export interface SmartArrivalMapProps {
  /** Customer latitude for real GPS integration */
  customerLat?: number;
  /** Customer longitude for real GPS integration */
  customerLng?: number;
  /** Customer GPS accuracy in meters */
  customerAccuracy?: number;
  /** Restaurant latitude for destination */
  restaurantLat?: number;
  /** Restaurant longitude for destination */
  restaurantLng?: number;
  /** Restaurant name */
  restaurantName?: string;
  /** Compatibility with existing state objects */
  state?: SmartArrivalState;
  /** Optional legacy callback kept for compatibility */
  onSimulateDistance?: (option: SmartArrivalDistanceOption) => void;
  /** Whether to show simulation control bar (deprecated in Step 3) */
  showSimulationBar?: boolean;
  /** Enable or disable map dragging/interaction */
  interactive?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Height of the map viewport */
  height?: string | number;
}

// Custom FlashTable Restaurant Destination Pin - Distinct from Customer GPS Pin
const createRestaurantPin = (label: string = 'Restaurant') => {
  return L.divIcon({
    className: 'flashtable-restaurant-pin',
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 56px;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="
          background-color: #2C3333;
          color: #FFFFFF;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #FAF9F6;
          box-shadow: 0 4px 14px rgba(44, 51, 51, 0.35);
          transform: rotate(-45deg);
        ">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E28F54" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
          </div>
        </div>
        <div style="
          margin-top: 4px;
          background: #2C3333;
          color: #FAF9F6;
          font-size: 10px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 2.5px 8px;
          border-radius: 9999px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          border: 1px solid rgba(255, 255, 255, 0.3);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${label}
        </div>
      </div>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 56],
    popupAnchor: [0, -52],
  });
};

// Custom Real Customer Live GPS pin - Concentric and anchored precisely on GPS coordinates
const createCustomerGpsPin = (label: string = 'You (Live GPS)') => {
  return L.divIcon({
    className: 'flashtable-customer-gps-pin',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Animated pulsing radar wave -->
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.4);
          animation: flashtable-gps-halo 2s cubic-bezier(0.1, 0, 0.3, 1) infinite;
          pointer-events: none;
        "></div>
        
        <!-- Subtle pulsing glow behind core -->
        <div style="
          position: absolute;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.25);
          animation: flashtable-gps-beacon 2s ease-in-out infinite;
          pointer-events: none;
        "></div>

        <!-- High-visibility core location dot -->
        <div style="
          position: relative;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #059669;
          border: 3px solid #FFFFFF;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        ">
          <!-- Inner white center bead -->
          <div style="
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: #FFFFFF;
          "></div>
        </div>

        <!-- Distinct label pill above the dot -->
        <div style="
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 6px;
          background: #064E3B;
          color: #ECFDF5;
          font-size: 11px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 3px 8px;
          border-radius: 9999px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.45);
          display: flex;
          align-items: center;
          gap: 4.5px;
          pointer-events: none;
          z-index: 10;
        ">
          <span style="
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: #34D399;
          "></span>
          <span>${label}</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -26],
  });
};

export const SmartArrivalMap: React.FC<SmartArrivalMapProps> = ({
  customerLat,
  customerLng,
  customerAccuracy,
  restaurantLat,
  restaurantLng,
  restaurantName,
  state,
  interactive = true,
  className = '',
  height = '380px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const restaurantMarkerRef = useRef<L.Marker | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const customerCircleRef = useRef<L.Circle | null>(null);
  const hasInitiallyFramedRef = useRef<boolean>(false);

  // Resolve restaurant coordinates & details
  const resolvedRestaurantLat = restaurantLat ?? (state?.restaurantLat ?? DEFAULT_RESTAURANT_COORDINATES.lat);
  const resolvedRestaurantLng = restaurantLng ?? (state?.restaurantLng ?? DEFAULT_RESTAURANT_COORDINATES.lng);
  const resolvedRestaurantName = restaurantName ?? (state?.restaurantName ?? 'The Ember Room');

  // Resolve customer GPS from explicit props or state
  const resolvedCustomerLat = customerLat ?? (state?.customerLat ?? undefined);
  const resolvedCustomerLng = customerLng ?? (state?.customerLng ?? undefined);
  const resolvedCustomerAccuracy = customerAccuracy ?? (state?.customerAccuracy ?? undefined);

  const hasRealGps = typeof resolvedCustomerLat === 'number' && typeof resolvedCustomerLng === 'number' && !isNaN(resolvedCustomerLat) && !isNaN(resolvedCustomerLng);

  // Real geodesic distance in meters (local Haversine, 100% free)
  const distanceMeters = hasRealGps
    ? calculateHaversineDistance(
        resolvedCustomerLat,
        resolvedCustomerLng,
        resolvedRestaurantLat,
        resolvedRestaurantLng
      )
    : (state?.distanceMeters ?? null);

  const distanceDisplay = formatDistance(distanceMeters);
  const distanceAwayText = formatDistanceWithAway(distanceMeters);
  const isInsideGeofence = typeof distanceMeters === 'number' && distanceMeters <= GEOFENCE_RADIUS_METERS;
  const etaResult = calculateEstimatedEta(distanceMeters);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = hasRealGps
      ? [resolvedCustomerLat, resolvedCustomerLng]
      : [resolvedRestaurantLat, resolvedRestaurantLng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: hasRealGps ? 15 : 15,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });

    // 100% Free OpenStreetMap tile layer (no Google Maps, no API keys, no billing)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      restaurantMarkerRef.current = null;
      geofenceCircleRef.current = null;
      customerMarkerRef.current = null;
      customerCircleRef.current = null;
      hasInitiallyFramedRef.current = false;
    };
  }, [interactive]);

  // Render & Update Destination Restaurant Marker & 500m Geofence Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const restLatLng: [number, number] = [resolvedRestaurantLat, resolvedRestaurantLng];

    // 1. Restaurant Destination Marker
    if (!restaurantMarkerRef.current) {
      const restMarker = L.marker(restLatLng, {
        icon: createRestaurantPin(resolvedRestaurantName),
        zIndexOffset: 800,
      }).addTo(map);

      restMarker.bindPopup(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 4px;">
          <strong style="color: #2C3333; font-size: 13px; display: flex; align-items: center; gap: 5px;">
            <span style="width: 8px; height: 8px; border-radius: 2px; background: #4F6F52; display: inline-block;"></span>
            ${resolvedRestaurantName}
          </strong>
          <p style="color: #4F6F52; font-weight: 600; font-size: 11px; margin: 3px 0 0 0;">
            Destination Venue • 500m Geofence Center
          </p>
          <p style="color: #666; font-size: 10px; font-family: monospace; margin: 3px 0 0 0;">
            ${resolvedRestaurantLat.toFixed(5)}, ${resolvedRestaurantLng.toFixed(5)}
          </p>
        </div>
      `);

      restaurantMarkerRef.current = restMarker;
    } else {
      restaurantMarkerRef.current.setLatLng(restLatLng);
      restaurantMarkerRef.current.setIcon(createRestaurantPin(resolvedRestaurantName));
    }

    // 2. Exact 500m Radius Geofence Circle around the restaurant
    const circleColor = isInsideGeofence ? '#059669' : '#4F6F52';
    const circleFill = isInsideGeofence ? '#10B981' : '#4F6F52';
    const circleFillOpacity = isInsideGeofence ? 0.16 : 0.08;

    if (!geofenceCircleRef.current) {
      const circle = L.circle(restLatLng, {
        radius: GEOFENCE_RADIUS_METERS, // Exactly 500 meters
        color: circleColor,
        fillColor: circleFill,
        fillOpacity: circleFillOpacity,
        weight: 2,
        dashArray: isInsideGeofence ? '4, 4' : '6, 6',
      }).addTo(map);

      circle.bindTooltip(`500 m Arrival Zone (${resolvedRestaurantName})`, {
        direction: 'top',
        permanent: false,
        opacity: 0.85,
      });

      geofenceCircleRef.current = circle;
    } else {
      geofenceCircleRef.current.setLatLng(restLatLng);
      geofenceCircleRef.current.setStyle({
        color: circleColor,
        fillColor: circleFill,
        fillOpacity: circleFillOpacity,
        dashArray: isInsideGeofence ? '4, 4' : '6, 6',
      });
    }
  }, [resolvedRestaurantLat, resolvedRestaurantLng, resolvedRestaurantName, isInsideGeofence]);

  // Render & Update Real Customer GPS Marker & Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hasRealGps && resolvedCustomerLat !== undefined && resolvedCustomerLng !== undefined) {
      const customerLatLng: [number, number] = [resolvedCustomerLat, resolvedCustomerLng];
      const restLatLng: [number, number] = [resolvedRestaurantLat, resolvedRestaurantLng];

      // 1. Customer Live Marker
      if (!customerMarkerRef.current) {
        const marker = L.marker(customerLatLng, {
          icon: createCustomerGpsPin('You (Live GPS)'),
          zIndexOffset: 1200,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 4px;">
            <strong style="color: #059669; font-size: 13px; display: flex; align-items: center; gap: 5px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
              Live Customer Location
            </strong>
            <p style="color: #2C3333; font-size: 11px; font-weight: 600; margin: 4px 0 0 0; font-family: monospace;">
              ${resolvedCustomerLat.toFixed(6)}, ${resolvedCustomerLng.toFixed(6)}
            </p>
            ${resolvedCustomerAccuracy ? `<p style="color: #666; font-size: 10px; margin: 2px 0 0 0;">GPS Accuracy: ±${Math.round(resolvedCustomerAccuracy)} m</p>` : ''}
            <p style="color: #4F6F52; font-size: 11px; font-weight: 700; margin: 3px 0 0 0;">
              ${distanceAwayText} • ${etaResult ? etaResult.fullEtaText : ''}
            </p>
            <p style="color: #666; font-size: 10px; margin: 2px 0 0 0;">
              Geofence: <strong>${isInsideGeofence ? 'Within 500 m' : 'Outside 500 m'}</strong>
            </p>
          </div>
        `);

        customerMarkerRef.current = marker;
      } else {
        customerMarkerRef.current.setLatLng(customerLatLng);
        customerMarkerRef.current.setPopupContent(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 4px;">
            <strong style="color: #059669; font-size: 13px; display: flex; align-items: center; gap: 5px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
              Live Customer Location
            </strong>
            <p style="color: #2C3333; font-size: 11px; font-weight: 600; margin: 4px 0 0 0; font-family: monospace;">
              ${resolvedCustomerLat.toFixed(6)}, ${resolvedCustomerLng.toFixed(6)}
            </p>
            ${resolvedCustomerAccuracy ? `<p style="color: #666; font-size: 10px; margin: 2px 0 0 0;">GPS Accuracy: ±${Math.round(resolvedCustomerAccuracy)} m</p>` : ''}
            <p style="color: #4F6F52; font-size: 11px; font-weight: 700; margin: 3px 0 0 0;">
              ${distanceAwayText} • ${etaResult ? etaResult.fullEtaText : ''}
            </p>
            <p style="color: #666; font-size: 10px; margin: 2px 0 0 0;">
              Geofence: <strong>${isInsideGeofence ? 'Within 500 m' : 'Outside 500 m'}</strong>
            </p>
          </div>
        `);
      }

      // 2. Customer Accuracy Circle
      if (resolvedCustomerAccuracy && resolvedCustomerAccuracy > 0) {
        if (!customerCircleRef.current) {
          customerCircleRef.current = L.circle(customerLatLng, {
            radius: resolvedCustomerAccuracy,
            color: '#10B981',
            fillColor: '#10B981',
            fillOpacity: 0.12,
            weight: 1.5,
          }).addTo(map);
        } else {
          customerCircleRef.current.setLatLng(customerLatLng);
          customerCircleRef.current.setRadius(resolvedCustomerAccuracy);
        }
      }

      map.invalidateSize();

      // Automatically frame both markers on initial GPS lock
      if (!hasInitiallyFramedRef.current) {
        hasInitiallyFramedRef.current = true;
        const bounds = L.latLngBounds([customerLatLng, restLatLng]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else {
        map.panTo(customerLatLng, { animate: true });
      }
    } else {
      // If GPS stopped, clean up customer marker and reset camera
      hasInitiallyFramedRef.current = false;
      if (customerMarkerRef.current) {
        map.removeLayer(customerMarkerRef.current);
        customerMarkerRef.current = null;
      }
      if (customerCircleRef.current) {
        map.removeLayer(customerCircleRef.current);
        customerCircleRef.current = null;
      }
    }
  }, [
    hasRealGps, 
    resolvedCustomerLat, 
    resolvedCustomerLng, 
    resolvedCustomerAccuracy, 
    resolvedRestaurantLat, 
    resolvedRestaurantLng,
    distanceDisplay,
    isInsideGeofence
  ]);

  return (
    <div 
      className={`relative w-full rounded-3xl bg-[#FAF9F6] border border-[#E8E6E1] overflow-hidden shadow-xs flex flex-col ${className}`}
      id="smart-arrival-map-container"
    >
      {/* Top Map HUD Banner */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between gap-2 pointer-events-none flex-wrap">
        
        {/* Left: Location & Real GPS / Distance & Estimated ETA Pill */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E8E6E1] shadow-xs flex items-center gap-2 pointer-events-auto flex-wrap">
          <div className={`w-2 h-2 rounded-full ${hasRealGps ? 'bg-emerald-500 animate-ping' : 'bg-[#4F6F52] animate-pulse'}`} />
          <span className="text-[11px] font-bold text-[#2C3333]">
            {hasRealGps
              ? distanceAwayText
              : resolvedRestaurantName}
          </span>
          {hasRealGps && etaResult && (
            <>
              <span className="text-stone-300">•</span>
              <span className="text-[11px] font-bold text-[#4F6F52] flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-700" />
                <span>{etaResult.fullEtaText}</span>
              </span>
            </>
          )}
          <span className="text-[10px] text-[#2C3333]/50 font-mono hidden sm:inline">
            {hasRealGps ? '• Real-Time GPS' : '• Indiranagar Destination'}
          </span>
        </div>

        {/* Right: 500m Geofence Status Pill */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {hasRealGps ? (
            isInsideGeofence ? (
              <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Within 500 m</span>
              </div>
            ) : (
              <div className="bg-white/95 text-[#2C3333] border border-[#E8E6E1] font-bold px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Outside 500 m</span>
              </div>
            )
          ) : (
            <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-[#E8E6E1] shadow-xs flex items-center gap-1.5 text-[10px] font-semibold text-[#2C3333]/70">
              <Compass className="w-3 h-3 text-[#4F6F52]" />
              <span>500 m Geofence Perimeter</span>
            </div>
          )}
        </div>

      </div>

      {/* Real Leaflet OpenStreetMap Container */}
      <div 
        ref={mapContainerRef} 
        style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: '320px' }}
        className="w-full relative z-0"
        id="leaflet-osm-map"
      />

      {/* Bottom info strip showing real destination coordinates & transparent ETA note */}
      <div className="px-4 py-2 bg-white border-t border-[#E8E6E1] flex items-center justify-between text-[11px] text-[#2C3333]/70 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#4F6F52]" />
          <span className="font-semibold text-[#2C3333]">{resolvedRestaurantName}</span>
          <span className="font-mono text-[10px] text-[#2C3333]/50 hidden sm:inline">
            ({resolvedRestaurantLat.toFixed(4)}, {resolvedRestaurantLng.toFixed(4)})
          </span>
          {hasRealGps && etaResult && (
            <span className="text-[10px] text-stone-500 hidden md:inline ml-1 font-sans">
              • ETA estimated at ~25 km/h urban speed
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-[10px] text-[#4F6F52]">
          <Layers className="w-3 h-3" />
          <span>Leaflet + OpenStreetMap (100% Free)</span>
        </div>
      </div>
    </div>
  );
};
