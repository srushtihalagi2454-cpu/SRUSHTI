import { useState, useRef, useEffect, useCallback } from 'react';

export interface CustomerCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type GeolocationStatus = 'idle' | 'requesting' | 'active' | 'error' | 'unsupported';

export interface UseCustomerGeolocationReturn {
  isTracking: boolean;
  coordinates: CustomerCoordinates | null;
  error: string | null;
  errorCode: number | null;
  status: GeolocationStatus;
  startTracking: () => void;
  stopTracking: () => void;
  clearError: () => void;
}

/**
 * Reusable React hook for Real Customer GPS tracking via the native browser Geolocation API.
 * Uses navigator.geolocation.watchPosition() for live updates and clearWatch() to stop.
 * Completely free of cost - no external APIs or keys required.
 */
export function useCustomerGeolocation(): UseCustomerGeolocationReturn {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [coordinates, setCoordinates] = useState<CustomerCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');

  const watchIdRef = useRef<number | null>(null);

  // Stop tracking and clear active watcher
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setStatus('idle');
    setCoordinates(null);
  }, []);

  // Clear any existing error message
  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  // Start real browser geolocation watching
  const startTracking = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setErrorCode(0);
      setStatus('unsupported');
      setIsTracking(false);
      return;
    }

    // Clear previous watcher if already active
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setError(null);
    setErrorCode(null);
    setStatus('requesting');

    try {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const coords: CustomerCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp || Date.now(),
          };

          setCoordinates(coords);
          setIsTracking(true);
          setStatus('active');
          setError(null);
          setErrorCode(null);
        },
        (geoError) => {
          let friendlyMessage = 'An error occurred while tracking your location.';
          switch (geoError.code) {
            case 1: // PERMISSION_DENIED
              friendlyMessage = 'Location permission denied. Please allow location access in your browser settings to start Smart Arrival.';
              break;
            case 2: // POSITION_UNAVAILABLE
              friendlyMessage = 'Location unavailable. Please verify that device GPS or location services are turned on.';
              break;
            case 3: // TIMEOUT
              friendlyMessage = 'Location request timed out. Retrying or please check your device GPS connection.';
              break;
            default:
              friendlyMessage = geoError.message || 'Unable to retrieve your current location.';
              break;
          }

          setError(friendlyMessage);
          setErrorCode(geoError.code);
          setStatus('error');

          // If permission is permanently denied, release watcher
          if (geoError.code === 1) {
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            setIsTracking(false);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );

      watchIdRef.current = id;
    } catch (err: any) {
      setError(err?.message || 'Failed to start geolocation tracking.');
      setStatus('error');
      setIsTracking(false);
    }
  }, []);

  // Cleanup watcher on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    isTracking,
    coordinates,
    error,
    errorCode,
    status,
    startTracking,
    stopTracking,
    clearError,
  };
}
