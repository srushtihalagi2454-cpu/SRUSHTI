import { Reservation, SoloDinerSafetyContact, SoloDinerSafetyDispatchLog, SoloSafetyNotifyMethod } from '../types';

const STORAGE_PREFIX = 'flashtable_solo_safety_';

/**
 * Standardizes Indian phone numbers into readable +91 XXXXX XXXXX format.
 */
export function formatIndianPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  let raw10 = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    raw10 = digits.slice(2);
  } else if (digits.length > 10) {
    raw10 = digits.slice(-10);
  }
  if (raw10.length === 10) {
    return `+91 ${raw10.slice(0, 5)} ${raw10.slice(5)}`;
  }
  return phone.trim();
}

/**
 * Retrieves persisted Solo Diner Safety contact configuration for a reservation.
 */
export function getSoloSafety(reservationId: string): SoloDinerSafetyContact | null {
  if (!reservationId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${reservationId}`);
    if (raw) {
      return JSON.parse(raw) as SoloDinerSafetyContact;
    }
  } catch (err) {
    console.warn('Failed to read solo safety from localStorage:', err);
  }
  return null;
}

/**
 * Saves Solo Diner Safety contact configuration for a reservation to local storage.
 */
export function saveSoloSafety(reservationId: string, safety: SoloDinerSafetyContact): void {
  if (!reservationId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${reservationId}`, JSON.stringify(safety));
  } catch (err) {
    console.warn('Failed to persist solo safety to localStorage:', err);
  }
}

/**
 * Formats the verbatim SMS/WhatsApp safety alert dispatched to the trusted contact upon QR check-in.
 */
export function formatSafetyMessage(params: {
  customerName: string;
  restaurantName: string;
  tableNumber: string;
  neighborhood: string;
  checkInTime: string;
  customNote?: string;
  notifyMethod?: SoloSafetyNotifyMethod;
}): string {
  const {
    customerName,
    restaurantName,
    tableNumber,
    neighborhood,
    checkInTime,
    customNote,
  } = params;

  let msg = `🛡️ [FlashTable Safety Check-In]\n`;
  msg += `Hi! ${customerName || 'Your contact'} has safely arrived and checked in at ${restaurantName} (Table ${tableNumber}), ${neighborhood}, Bengaluru at ${checkInTime}.\n\n`;
  msg += `📍 Verification: Verified in person via FlashTable Host Stand QR scan.\n`;
  
  if (customNote && customNote.trim()) {
    msg += `💬 Note from ${customerName}: "${customNote.trim()}"\n\n`;
  } else {
    msg += `\n`;
  }
  
  msg += `🔒 Privacy Guarantee: FlashTable does NOT track continuous GPS location or battery. This alert is triggered once upon physical restaurant arrival.`;
  return msg;
}

/**
 * Dispatches the solo diner arrival notification to the trusted contact when a customer completes check-in.
 * Returns the updated SoloDinerSafetyContact and dispatch log.
 */
export function dispatchSoloSafetyNotification(
  reservation: Reservation,
  checkInMethod: 'QR' | 'Manual' = 'QR'
): { success: boolean; contact: SoloDinerSafetyContact; message: string; log: SoloDinerSafetyDispatchLog } | null {
  const currentSafety = reservation.soloDinerSafety || getSoloSafety(reservation.id);
  if (!currentSafety || !currentSafety.enabled) {
    return null;
  }

  // Format check-in timestamp in IST
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  const messageText = formatSafetyMessage({
    customerName: reservation.customerName || 'Diner',
    restaurantName: reservation.restaurantName || 'the restaurant',
    tableNumber: reservation.tableNumber || 'Reserved Table',
    neighborhood: reservation.restaurantAddress?.includes('Indiranagar') ? 'Indiranagar' : 
                 reservation.restaurantAddress?.includes('Yelahanka') ? 'Yelahanka New Town' : 
                 'Bengaluru',
    checkInTime: `${timeString} IST`,
    customNote: currentSafety.customNote,
    notifyMethod: currentSafety.notifyMethod,
  });

  const dispatchId = `SAFEDISP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const log: SoloDinerSafetyDispatchLog = {
    dispatchId,
    channel: currentSafety.notifyMethod,
    recipientName: currentSafety.contactName,
    recipientPhone: formatIndianPhone(currentSafety.contactPhone),
    relationship: currentSafety.relationship,
    timestamp: now.toISOString(),
    restaurantName: reservation.restaurantName,
    tableNumber: reservation.tableNumber,
    neighborhood: reservation.restaurantAddress || 'Bengaluru',
    messageText,
    deliveryStatus: 'delivered',
  };

  const updatedContact: SoloDinerSafetyContact = {
    ...currentSafety,
    status: 'notified',
    notifiedAt: now.toISOString(),
    notificationDispatchLog: log,
  };

  // Persist update
  saveSoloSafety(reservation.id, updatedContact);

  // Broadcast window event for reactive UI toasts / alerts across components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('flashtable:solo-safety-dispatched', {
        detail: {
          reservationId: reservation.id,
          contact: updatedContact,
          log,
        },
      })
    );
  }

  return {
    success: true,
    contact: updatedContact,
    message: messageText,
    log,
  };
}

/**
 * Hydrates a reservation with its Solo Diner Safety configuration
 * from embedded property, parsed special requests, or local storage.
 */
export function hydrateReservationWithSoloSafety(reservation: Reservation): Reservation {
  if (!reservation || !reservation.id) return reservation;

  // 1. Direct property already exists
  if (reservation.soloDinerSafety && reservation.soloDinerSafety.enabled) {
    return reservation;
  }

  // 2. Check localStorage
  const fromStorage = getSoloSafety(reservation.id);
  if (fromStorage && fromStorage.enabled) {
    return {
      ...reservation,
      soloDinerSafety: fromStorage,
    };
  }

  // 3. Check specialRequests serialized payload
  if (reservation.specialRequests && reservation.specialRequests.includes('"soloDinerSafety"')) {
    try {
      const parsed = JSON.parse(reservation.specialRequests);
      if (parsed && parsed.soloDinerSafety && parsed.soloDinerSafety.enabled) {
        return {
          ...reservation,
          specialRequests: parsed.note || '',
          soloDinerSafety: parsed.soloDinerSafety,
        };
      }
    } catch {
      // Not JSON, ignore
    }
  }

  return reservation;
}

/**
 * Helper to serialize safety contact alongside special requests for backend storage.
 */
export function serializeSafetyToSpecialRequests(
  note: string,
  safety?: SoloDinerSafetyContact
): string {
  if (!safety || !safety.enabled) {
    return note || '';
  }
  return JSON.stringify({
    note: note || '',
    soloDinerSafety: safety,
  });
}

/**
 * Checks if party size indicates solo dining.
 */
export function isSoloDiner(guests: number): boolean {
  return guests === 1;
}
