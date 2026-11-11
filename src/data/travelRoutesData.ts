import { Restaurant } from '../types';

export interface BusStop {
  id: string;
  name: string;
  landmark: string;
  locality: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  supportedOperators: string[]; // e.g. ['BMTC', 'KSRTC', 'Intercity Private']
}

export interface TravelRoute {
  id: string;
  routeCode: string;
  name: string;
  highwayOrCorridor: string;
  origin: string;
  destination: string;
  majorStops: BusStop[];
  associatedRestaurantIds: string[];
  description: string;
}

// Verified Bengaluru & Karnataka Bus Transit Corridors and Stops
export const VERIFIED_BUS_STOPS: BusStop[] = [
  {
    id: 'stop-majestic',
    name: 'Kempegowda Bus Station (Majestic)',
    landmark: 'Terminal 1 & Terminal 2 Hub',
    locality: 'Majestic / Central',
    coordinates: { lat: 12.9767, lng: 77.5713 },
    supportedOperators: ['BMTC', 'KSRTC', 'NWKRTC', 'KKRTC', 'Private Luxury'],
  },
  {
    id: 'stop-indiranagar-100ft',
    name: 'Indiranagar 100 Feet Road Bus Stop',
    landmark: 'Near 6th Main & 12th Main Junction',
    locality: 'Indiranagar',
    coordinates: { lat: 12.9745, lng: 77.6405 },
    supportedOperators: ['BMTC', 'Airport Vayu Vajra', 'KSRTC Pick-up'],
  },
  {
    id: 'stop-indiranagar-cmh',
    name: 'CMH Road Metro / Bus Terminal',
    landmark: 'Chinmaya Mission Hospital Rd',
    locality: 'Indiranagar',
    coordinates: { lat: 12.9785, lng: 77.6385 },
    supportedOperators: ['BMTC', 'Feeder Buses'],
  },
  {
    id: 'stop-hebbal',
    name: 'Hebbal Esteem Mall Bus Stop',
    landmark: 'NH 44 Airport Flyover Junction',
    locality: 'Hebbal',
    coordinates: { lat: 13.0358, lng: 77.597 },
    supportedOperators: ['BMTC', 'KSRTC', 'Airport Vayu Vajra', 'Private Intercity'],
  },
  {
    id: 'stop-yelahanka-nes',
    name: 'Yelahanka NES Bus Stop / Bypass',
    landmark: 'Major Sandeep Unnikrishnan Rd & NH 44 Bypass',
    locality: 'Yelahanka New Town',
    coordinates: { lat: 13.1008, lng: 77.5862 },
    supportedOperators: ['BMTC', 'KSRTC', 'Airport Express', 'Private Buses'],
  },
  {
    id: 'stop-yelahanka-phase4',
    name: 'Yelahanka 4th Phase / 16th Main Stop',
    landmark: 'Sector B & 4th Phase Bus Stand',
    locality: 'Yelahanka New Town',
    coordinates: { lat: 13.1025, lng: 77.5878 },
    supportedOperators: ['BMTC'],
  },
  {
    id: 'stop-soladevanahalli',
    name: 'Soladevanahalli Bus Stop & Railway Gate',
    landmark: 'Hesaraghatta Main Road Junction',
    locality: 'Soladevanahalli',
    coordinates: { lat: 13.0725, lng: 77.4988 },
    supportedOperators: ['BMTC', 'Tumkur Road Connectors', 'KSRTC Rural'],
  },
  {
    id: 'stop-yeshwantpur',
    name: 'Yeshwantpur Govardhan Bus Stop',
    landmark: 'Near Yeshwantpur Metro & NH 48 Junction',
    locality: 'Yeshwantpur',
    coordinates: { lat: 13.0195, lng: 77.5545 },
    supportedOperators: ['BMTC', 'KSRTC', 'Intercity Private'],
  },
  {
    id: 'stop-silkboard',
    name: 'Silk Board Junction / Hosur Road Toll',
    landmark: 'NH 44 South Corridor Junction',
    locality: 'Central Silk Board',
    coordinates: { lat: 12.9172, lng: 77.6228 },
    supportedOperators: ['BMTC', 'KSRTC', 'SETC Tamil Nadu', 'Private Luxury'],
  },
  {
    id: 'stop-kr-puram',
    name: 'K.R. Puram Hanging Bridge Bus Stop',
    landmark: 'NH 75 / Old Madras Road Flyover',
    locality: 'K.R. Puram',
    coordinates: { lat: 13.0005, lng: 77.6852 },
    supportedOperators: ['BMTC', 'KSRTC', 'APSRTC', 'Private Luxury'],
  },
];

export const VERIFIED_TRAVEL_ROUTES: TravelRoute[] = [
  {
    id: 'route-nh75-east',
    routeCode: 'Route 1 (NH 75 East)',
    name: 'Majestic ⇄ Indiranagar ⇄ Old Madras Road / K.R. Puram',
    highwayOrCorridor: 'NH 75 & 100 Feet Road Corridor',
    origin: 'Kempegowda Bus Station (Majestic)',
    destination: 'Whitefield / K.R. Puram',
    majorStops: [
      VERIFIED_BUS_STOPS[0], // Majestic
      VERIFIED_BUS_STOPS[2], // CMH Road
      VERIFIED_BUS_STOPS[1], // Indiranagar 100ft
      VERIFIED_BUS_STOPS[9], // K.R. Puram
    ],
    associatedRestaurantIds: ['rest-1', 'rest-2', 'rest-3', 'rest-4', 'rest-5'],
    description: 'Busiest east transit corridor connecting city center with Indiranagar dining hubs, HAL, and Old Madras Road.',
  },
  {
    id: 'route-nh44-north',
    routeCode: 'Route 2 (NH 44 North)',
    name: 'Majestic ⇄ Hebbal ⇄ Yelahanka ⇄ Airport Corridor',
    highwayOrCorridor: 'NH 44 Kempegowda International Airport Highway',
    origin: 'Kempegowda Bus Station (Majestic)',
    destination: 'Kempegowda International Airport (BLR)',
    majorStops: [
      VERIFIED_BUS_STOPS[0], // Majestic
      VERIFIED_BUS_STOPS[3], // Hebbal Esteem Mall
      VERIFIED_BUS_STOPS[4], // Yelahanka NES Stop
      VERIFIED_BUS_STOPS[5], // Yelahanka 4th Phase
    ],
    associatedRestaurantIds: ['rest-6', 'rest-7', 'rest-8', 'rest-9'],
    description: 'Premier north transit and airport corridor featuring major bus stops along Yelahanka New Town bypass and Hebbal.',
  },
  {
    id: 'route-nh48-northwest',
    routeCode: 'Route 3 (NH 48 Northwest)',
    name: 'Majestic ⇄ Yeshwantpur ⇄ Soladevanahalli / Tumkur Road',
    highwayOrCorridor: 'NH 48 & Hesaraghatta Main Road',
    origin: 'Kempegowda Bus Station (Majestic)',
    destination: 'Soladevanahalli / Hesaraghatta / Nelamangala',
    majorStops: [
      VERIFIED_BUS_STOPS[0], // Majestic
      VERIFIED_BUS_STOPS[7], // Yeshwantpur Govardhan
      VERIFIED_BUS_STOPS[6], // Soladevanahalli Bus Stop
    ],
    associatedRestaurantIds: ['rest-10', 'rest-9'],
    description: 'Major outbound highway connecting northwest Bengaluru, Tumkur Road commuters, and Soladevanahalli educational & dining clusters.',
  },
  {
    id: 'route-nh44-south',
    routeCode: 'Route 4 (NH 44 South)',
    name: 'Majestic ⇄ Shantinagar ⇄ Silk Board ⇄ Electronic City',
    highwayOrCorridor: 'Hosur Road / NH 44 Elevated Highway',
    origin: 'Kempegowda Bus Station (Majestic)',
    destination: 'Electronic City Toll / Attibele',
    majorStops: [
      VERIFIED_BUS_STOPS[0], // Majestic
      VERIFIED_BUS_STOPS[8], // Silk Board
    ],
    associatedRestaurantIds: ['rest-1', 'rest-3', 'rest-5'],
    description: 'Southern transit corridor linking intercity bus routes from Tamil Nadu and Kerala into Bengaluru.',
  },
];

// Calculate Haversine distance in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Find nearest verified bus stop for a given restaurant
export function findNearestBusStop(restaurant: Restaurant): { stop: BusStop; distanceKm: number } {
  let minDistance = Infinity;
  let nearestStop = VERIFIED_BUS_STOPS[0];

  for (const stop of VERIFIED_BUS_STOPS) {
    const dist = calculateDistanceKm(
      restaurant.coordinates.lat,
      restaurant.coordinates.lng,
      stop.coordinates.lat,
      stop.coordinates.lng
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearestStop = stop;
    }
  }

  return { stop: nearestStop, distanceKm: minDistance };
}

// Calculate dynamic travel arrival ETA string
export function calculateTravelArrivalEta(expectedArrivalTime: string): {
  isImminent: boolean;
  minutesUntilArrival: number;
  displayText: string;
} {
  if (!expectedArrivalTime) {
    return { isImminent: false, minutesUntilArrival: 30, displayText: 'In ~30 mins' };
  }

  // Parse time
  const match = expectedArrivalTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) {
    return { isImminent: false, minutesUntilArrival: 30, displayText: expectedArrivalTime };
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = (match[3] || 'PM').toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const targetMinutes = hours * 60 + minutes;

  // Current local time in minutes
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let diff = targetMinutes - currentMinutes;
  if (diff < -720) diff += 1440; // Next day
  if (diff < 0) diff = 15; // Assume imminent if time has just passed today

  const isImminent = diff <= 20;
  const hoursRemaining = Math.floor(diff / 60);
  const minsRemaining = diff % 60;

  const displayText =
    hoursRemaining > 0
      ? `In ~${hoursRemaining} hr ${minsRemaining} min`
      : `In ~${minsRemaining} mins`;

  return { isImminent, minutesUntilArrival: diff, displayText };
}

// Determine recommended food preparation status based on expected arrival and configured prep time
export function getRecommendedTravelPrepStatus(
  expectedArrivalTime: string,
  configuredPrepMinutes: number = 20
): {
  status: 'Prepare Soon' | 'Preparing' | 'Ready';
  countdownMinutes: number;
  advice: string;
} {
  const { minutesUntilArrival } = calculateTravelArrivalEta(expectedArrivalTime);

  // If arrival is within 10 mins -> Food should be 'Ready'
  if (minutesUntilArrival <= 10) {
    return {
      status: 'Ready',
      countdownMinutes: Math.max(0, minutesUntilArrival),
      advice: 'Passenger arrival imminent! Package parcel or set on reserved table.',
    };
  }

  // If arrival is within configuredPrepMinutes + 10 mins -> 'Preparing'
  if (minutesUntilArrival <= configuredPrepMinutes + 10) {
    return {
      status: 'Preparing',
      countdownMinutes: minutesUntilArrival,
      advice: `Chef actively cooking to align with arrival at ${expectedArrivalTime}.`,
    };
  }

  // More than configuredPrepMinutes away -> 'Prepare Soon'
  return {
    status: 'Prepare Soon',
    countdownMinutes: minutesUntilArrival - configuredPrepMinutes,
    advice: `Cooking starts ~${configuredPrepMinutes} mins before passenger arrival.`,
  };
}
