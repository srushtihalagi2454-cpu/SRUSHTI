import { SmartArrivalDistanceOption, SmartArrivalState } from '../types';

export const GEOFENCE_RADIUS_METERS = 500;

export interface RestaurantCoordinates {
  lat: number;
  lng: number;
}

/**
 * Clean frontend configuration structure mapping existing Bengaluru restaurants to fixed demo coordinates.
 * These correspond to each restaurant's stated Bengaluru neighborhood/address in the app data.
 * Can later be moved to backend data without redesigning the Smart Arrival feature.
 */
export const RESTAURANT_COORDINATES_MAP: Record<string, RestaurantCoordinates> = {
  // 1. The Ember Room - Indiranagar (12th Main Road, HAL 2nd Stage)
  'rest-1': { lat: 12.9716, lng: 77.6412 },
  // 2. The Glasshouse Trattoria - Indiranagar (840, 12th Main Road)
  'rest-2': { lat: 12.9725, lng: 77.6425 },
  // 3. Coast & Coconut Coastal Kitchen - Indiranagar (772, 100 Feet Road)
  'rest-3': { lat: 12.9784, lng: 77.6408 },
  // 4. Roast & Brew Artisan Cafe - Indiranagar (100 Feet Road, near 6th Main)
  'rest-4': { lat: 12.9730, lng: 77.6410 },
  // 5. Urban Masala Bistro - Indiranagar (CMH Road, Near Metro Station)
  'rest-5': { lat: 12.9790, lng: 77.6380 },
  // 6. Malnad Heritage Grand - Yelahanka New Town (Major Sandeep Unnikrishnan Road)
  'rest-6': { lat: 13.1005, lng: 77.5855 },
  // 7. Northern Spice Route - Yelahanka New Town (16th Main, 4th Phase)
  'rest-7': { lat: 13.1020, lng: 77.5880 },
  // 8. Cafe Botanica Garden Lounge - Yelahanka New Town (Near Allalasandra Lake Road)
  'rest-8': { lat: 13.0980, lng: 77.5840 },
  // 9. Curry & Claypot Diner - Yelahanka New Town (Sector A, Near Rail Wheel Factory)
  'rest-9': { lat: 13.1040, lng: 77.5890 },
  // 10. Aroma Dawat Biryani House - Soladevanahalli (Hesaraghatta Main Road)
  'rest-10': { lat: 13.0720, lng: 77.4980 },
};

export const DEFAULT_RESTAURANT_COORDINATES: RestaurantCoordinates = {
  lat: 12.9716,
  lng: 77.6412, // The Ember Room default (Indiranagar)
};

/**
 * Retrieve coordinates for an existing restaurant by ID or fallback matching on name.
 */
export function getRestaurantCoordinates(restaurantId?: string, restaurantName?: string): RestaurantCoordinates {
  if (restaurantId && RESTAURANT_COORDINATES_MAP[restaurantId]) {
    return RESTAURANT_COORDINATES_MAP[restaurantId];
  }
  if (restaurantName) {
    const normalized = restaurantName.toLowerCase();
    if (normalized.includes('ember')) return RESTAURANT_COORDINATES_MAP['rest-1'];
    if (normalized.includes('glasshouse')) return RESTAURANT_COORDINATES_MAP['rest-2'];
    if (normalized.includes('coconut') || normalized.includes('coast')) return RESTAURANT_COORDINATES_MAP['rest-3'];
    if (normalized.includes('roast') || normalized.includes('brew')) return RESTAURANT_COORDINATES_MAP['rest-4'];
    if (normalized.includes('urban masala')) return RESTAURANT_COORDINATES_MAP['rest-5'];
    if (normalized.includes('malnad')) return RESTAURANT_COORDINATES_MAP['rest-6'];
    if (normalized.includes('spice route') || normalized.includes('northern')) return RESTAURANT_COORDINATES_MAP['rest-7'];
    if (normalized.includes('botanica')) return RESTAURANT_COORDINATES_MAP['rest-8'];
    if (normalized.includes('claypot') || normalized.includes('curry')) return RESTAURANT_COORDINATES_MAP['rest-9'];
    if (normalized.includes('aroma') || normalized.includes('dawat') || normalized.includes('biryani')) return RESTAURANT_COORDINATES_MAP['rest-10'];
  }
  return DEFAULT_RESTAURANT_COORDINATES;
}

/**
 * Calculate the great-circle distance between two geographic coordinates in meters
 * using the standard Haversine formula locally in the browser (100% free, no external APIs).
 * Earth radius = 6,371,000 meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance in meters when close (< 1000m) and kilometers when farther away (>= 1000m).
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return '--';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Format distance with "away" suffix (e.g. "1.8 km away", "420 m away").
 */
export function formatDistanceWithAway(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return '--';
  }
  const formatted = formatDistance(meters);
  return `${formatted} away`;
}

/** Assumed average urban travel speed in km/h for transparent local estimate */
export const DEFAULT_ESTIMATED_URBAN_SPEED_KMH = 25;

export interface EstimatedEtaResult {
  /** Distance in kilometers used for calculation */
  distanceKm: number;
  /** ETA in hours = distance in km / 25 */
  etaHours: number;
  /** Unrounded ETA in minutes = ETA in hours * 60 */
  etaRawMinutes: number;
  /** Sensible whole number of rounded minutes (0 when arriving now) */
  etaMinutes: number;
  /** Clean display string, e.g. "4 min", "1 min", "Arriving now" */
  etaDisplay: string;
  /** Full labeled string matching prompt, e.g. "Estimated ETA · 4 min", or "Arriving now" */
  fullEtaText: string;
  /** Whether the user is within negligible distance */
  isArrivingNow: boolean;
}

/**
 * Calculate transparent local estimated arrival time (ETA) based on real geodesic distance
 * and an assumed average urban travel speed (25 km/h).
 *
 * Formula:
 * ETA in hours = distance in km / 25
 * ETA in minutes = ETA in hours * 60
 *
 * 100% Free of cost, client-side only, no external APIs or routing services.
 */
export function calculateEstimatedEta(
  distanceMeters: number | null | undefined,
  speedKmh: number = DEFAULT_ESTIMATED_URBAN_SPEED_KMH
): EstimatedEtaResult | null {
  if (distanceMeters === null || distanceMeters === undefined || isNaN(distanceMeters)) {
    return null;
  }

  const distanceKm = distanceMeters / 1000;
  const etaHours = distanceKm / speedKmh;
  const etaRawMinutes = etaHours * 60;
  const roundedMinutes = Math.round(etaRawMinutes);

  // If distance is extremely small (< 60 meters or rounds to 0 minutes), display "Arriving now"
  if (roundedMinutes <= 0 || distanceMeters < 60) {
    return {
      distanceKm,
      etaHours,
      etaRawMinutes,
      etaMinutes: 0,
      etaDisplay: 'Arriving now',
      fullEtaText: 'Arriving now',
      isArrivingNow: true,
    };
  }

  const etaDisplay = roundedMinutes === 1 ? '1 min' : `${roundedMinutes} min`;
  return {
    distanceKm,
    etaHours,
    etaRawMinutes,
    etaMinutes: roundedMinutes,
    etaDisplay,
    fullEtaText: `Estimated ETA · ${etaDisplay}`,
    isArrivingNow: false,
  };
}

/**
 * Evaluate whether distance is within the 500m geofence radius and return appropriate status strings.
 */
export function evaluateGeofenceStatus(distanceMeters: number | null | undefined): {
  isInsideGeofence: boolean;
  geofenceLabel: string;
  customerStatus: string;
  restaurantStatus: string;
} {
  if (distanceMeters === null || distanceMeters === undefined || isNaN(distanceMeters)) {
    return {
      isInsideGeofence: false,
      geofenceLabel: 'Outside 500 m',
      customerStatus: 'Ready to depart',
      restaurantStatus: 'Awaiting departure',
    };
  }

  const isInside = distanceMeters <= GEOFENCE_RADIUS_METERS;

  if (isInside) {
    return {
      isInsideGeofence: true,
      geofenceLabel: 'Within 500 m',
      customerStatus: 'Within 500 m • Table ready for check-in',
      restaurantStatus: 'Guest is within 500m • Table ready',
    };
  } else {
    return {
      isInsideGeofence: false,
      geofenceLabel: 'Outside 500 m',
      customerStatus: 'En route to restaurant',
      restaurantStatus: 'Guest en route (Outside 500m)',
    };
  }
}

export interface MapPoint {
  x: number;
  y: number;
  label: string;
  roadName: string;
}

export const RESTAURANT_MAP_POINT: MapPoint = {
  x: 490,
  y: 350,
  label: 'The Ember Room',
  roadName: '12th Main Road, HAL 2nd Stage',
};

// SVG positions corresponding to simulated distance options
export const SIMULATED_MAP_POSITIONS: Record<SmartArrivalDistanceOption, MapPoint> = {
  '1.2 km': {
    x: 180,
    y: 120,
    label: 'Near CMH Road & Metro Station',
    roadName: 'CMH Road / 100 Feet Rd Jn',
  },
  '800 m': {
    x: 320,
    y: 175,
    label: 'Approaching 100 Feet Road',
    roadName: '100 Feet Road (Southbound)',
  },
  '500 m': {
    x: 405,
    y: 225,
    label: 'Entering 500m Geofence Perimeter',
    roadName: '12th Main Road Entrance',
  },
  '300 m': {
    x: 450,
    y: 285,
    label: 'Inside Arrival Zone (Near Venue)',
    roadName: '12th Main Road (Podium Approach)',
  },
};

export function getSmartArrivalConfig(option: SmartArrivalDistanceOption) {
  switch (option) {
    case '1.2 km':
      return {
        distanceMeters: 1200,
        distanceText: '1.2 km',
        etaMinutes: 7,
        customerStatus: 'On the way',
        restaurantStatus: 'On the way',
        isInsideGeofence: false,
      };
    case '800 m':
      return {
        distanceMeters: 800,
        distanceText: '0.8 km',
        etaMinutes: 4,
        customerStatus: 'Approaching',
        restaurantStatus: 'Guest is approaching',
        isInsideGeofence: false,
      };
    case '500 m':
      return {
        distanceMeters: 500,
        distanceText: '500 m',
        etaMinutes: 2,
        customerStatus: 'Entering arrival zone',
        restaurantStatus: 'Guest has arrived nearby',
        isInsideGeofence: true,
      };
    case '300 m':
      return {
        distanceMeters: 300,
        distanceText: '300 m',
        etaMinutes: 1,
        customerStatus: 'Guest has arrived nearby',
        restaurantStatus: 'Guest has arrived nearby',
        isInsideGeofence: true,
      };
  }
}

export function createInitialSmartArrivalState(): SmartArrivalState {
  const defaultCoords = DEFAULT_RESTAURANT_COORDINATES;
  return {
    isEnabled: false,
    reservationId: '',
    userId: undefined,
    restaurantId: '',
    customerName: '',
    customerPhone: '',
    restaurantName: '',
    restaurantLocation: '',
    restaurantLat: defaultCoords.lat,
    restaurantLng: defaultCoords.lng,
    tableNumber: '',
    timeSlot: '',
    guests: 2,
    preferences: '',
    distanceMeters: null,
    distanceText: '--',
    etaMinutes: null,
    etaText: undefined,
    customerStatus: 'Ready to depart',
    restaurantStatus: 'Awaiting departure',
    isInsideGeofence: false,
    geofenceRadiusMeters: GEOFENCE_RADIUS_METERS,
    isGpsActive: false,
    customerLat: null,
    customerLng: null,
    customerAccuracy: null,
    gpsStatus: 'idle',
    gpsError: null,
    backendSyncStatus: 'idle',
    backendSyncError: null,
    lastSyncedAt: null,
  };
}

export interface KitchenPrepRecommendation {
  label: 'Not yet' | 'Prepare soon' | 'Prepare now';
  isGuestNearby: boolean;
  colorClass: string;
  badgeClass: string;
  description: string;
}

/**
 * Kitchen preparation recommendation based on real customer Estimated ETA and geofence proximity.
 * Rules:
 * - ETA > 10 minutes → "Not yet"
 * - ETA 5–10 minutes → "Prepare soon"
 * - ETA <= 5 minutes → "Prepare now"
 * - If guest is within 500 m → additionally show "Guest nearby"
 * Recommendation only — restaurant owner and staff remain in complete manual control of food order status.
 */
export function getKitchenPrepRecommendation(
  etaMinutes: number | null | undefined,
  distanceMeters: number | null | undefined,
  geofenceStatus?: string
): KitchenPrepRecommendation {
  const dist = distanceMeters !== null && distanceMeters !== undefined ? distanceMeters : Infinity;
  const statusLower = (geofenceStatus || '').toLowerCase();
  const isGuestNearby = dist <= 500 || statusLower.includes('within 500') || statusLower.includes('inside');

  const eta = etaMinutes !== null && etaMinutes !== undefined ? etaMinutes : 99;

  let label: 'Not yet' | 'Prepare soon' | 'Prepare now' = 'Not yet';
  let colorClass = 'text-stone-700 bg-stone-100 border-stone-200';
  let badgeClass = 'bg-stone-500 text-white';
  let description = 'Estimated ETA > 10 mins. Hold hot preparation to ensure peak dining freshness.';

  if (eta <= 5) {
    label = 'Prepare now';
    colorClass = 'text-emerald-800 bg-emerald-50 border-emerald-200';
    badgeClass = 'bg-emerald-600 text-white';
    description = 'Estimated ETA ≤ 5 mins. Kitchen should commence hot preparation/plating.';
  } else if (eta <= 10) {
    label = 'Prepare soon';
    colorClass = 'text-amber-800 bg-amber-50 border-amber-200';
    badgeClass = 'bg-amber-500 text-white';
    description = 'Estimated ETA 5–10 mins. Ready ingredients, garnishes, and table setting.';
  }

  return {
    label,
    isGuestNearby,
    colorClass,
    badgeClass,
    description,
  };
}

