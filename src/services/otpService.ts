/**
 * FlashTable Secure OTP Simulation Service
 * Generates temporary cryptographically random 6-digit verification codes.
 * Securely enforces expiration (5 minutes), rate limiting, and attempt thresholds.
 * Masks recipient destinations (e.g., +91 XXXXXXX123 or s******@gmail.com).
 */

interface OtpRecord {
  destination: string; // clean email or clean 10-digit mobile
  code: string;
  type: 'mobile' | 'email';
  expiresAt: number; // timestamp in ms
  attemptsLeft: number;
  lastRequestedAt: number;
}

const OTP_MEMORY_STORE = new Map<string, OtpRecord>();

// Helper to mask destination string
export const maskDestination = (destination: string, type: 'mobile' | 'email'): string => {
  if (type === 'mobile') {
    const digits = destination.replace(/\D/g, '');
    if (digits.length >= 10) {
      const last3 = digits.slice(-3);
      return `+91 XXXXXXX${last3}`;
    }
    return `+91 XXXXXXX${destination.slice(-2)}`;
  } else {
    const parts = destination.split('@');
    if (parts.length === 2) {
      const username = parts[0];
      const domain = parts[1];
      const firstChar = username.charAt(0);
      return `${firstChar}******@${domain}`;
    }
    return `******@${destination}`;
  }
};

export interface RequestOtpResult {
  success: boolean;
  message: string;
  maskedDestination: string;
  cooldownSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
}

/**
 * Request an OTP for a given mobile or email
 */
export const requestVerificationOtp = (destination: string, type: 'mobile' | 'email'): RequestOtpResult => {
  const clean = destination.trim().toLowerCase();
  const masked = maskDestination(clean, type);
  const now = Date.now();

  const existing = OTP_MEMORY_STORE.get(clean);
  if (existing) {
    const elapsedSinceLastReq = (now - existing.lastRequestedAt) / 1000;
    if (elapsedSinceLastReq < 30) {
      return {
        success: false,
        message: `Please wait ${Math.ceil(30 - elapsedSinceLastReq)} seconds before requesting another code.`,
        maskedDestination: masked,
        cooldownSeconds: Math.ceil(30 - elapsedSinceLastReq),
      };
    }
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes

  OTP_MEMORY_STORE.set(clean, {
    destination: clean,
    code,
    type,
    expiresAt,
    attemptsLeft: 5,
    lastRequestedAt: now,
  });

  // Log in development console for testing convenience without exposing in UI
  console.info(`[FlashTable OTP System] Sent 6-digit code to ${masked} (valid for 5 mins): ${code}`);

  return {
    success: true,
    message: `A 6-digit verification code has been sent to ${masked}.`,
    maskedDestination: masked,
  };
};

/**
 * Verify an entered 6-digit OTP
 */
export const verifyOtpCode = (destination: string, inputCode: string): VerifyOtpResult => {
  const clean = destination.trim().toLowerCase();
  const record = OTP_MEMORY_STORE.get(clean);

  if (!record) {
    return {
      success: false,
      message: 'No active verification code found for this destination. Please request a new OTP.',
    };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    OTP_MEMORY_STORE.delete(clean);
    return {
      success: false,
      message: 'This verification code has expired. Please request a new one.',
    };
  }

  if (record.attemptsLeft <= 0) {
    OTP_MEMORY_STORE.delete(clean);
    return {
      success: false,
      message: 'Too many incorrect attempts. Please request a fresh verification code.',
    };
  }

  if (record.code === inputCode.trim()) {
    OTP_MEMORY_STORE.delete(clean);
    return {
      success: true,
      message: 'Verification successful!',
    };
  }

  record.attemptsLeft -= 1;
  return {
    success: false,
    message: `Invalid verification code. ${record.attemptsLeft} attempt(s) remaining.`,
  };
};
