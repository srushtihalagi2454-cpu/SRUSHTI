import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Smartphone, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight, 
  X,
  Info,
  Sparkles
} from 'lucide-react';
import { requestOtp, verifyOtp, maskIdentifier } from '../services/authService';
import { OtpRequestResult } from '../types';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  destinationType: 'email' | 'mobile';
  purpose?: 'signup' | 'forgot_password';
  initialOtpResult?: OtpRequestResult | null;
  onVerified: (verificationToken: string) => void;
  selectedRole?: 'customer' | 'restaurant-owner';
  onChangeRole?: (newRole: 'customer' | 'restaurant-owner') => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  destination,
  destinationType,
  purpose = 'signup',
  initialOtpResult,
  onVerified,
  selectedRole,
  onChangeRole,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(() => initialOtpResult?.cooldownSeconds || 30);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [maskedDest, setMaskedDest] = useState<string>(() => 
    initialOtpResult?.destinationMasked || maskIdentifier(destination, destinationType)
  );
  const [serviceConfigured, setServiceConfigured] = useState<boolean>(() => 
    initialOtpResult ? initialOtpResult.serviceConfigured : false
  );
  const [missingConfigNotice, setMissingConfigNotice] = useState<string | undefined>(() => 
    initialOtpResult?.missingConfigurationNotice
  );
  const [testCodeHint, setTestCodeHint] = useState<string | undefined>(() => 
    initialOtpResult?.testDeliveryCode
  );

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Focus first input upon opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const next = [...digits];
    next[index] = cleaned.slice(-1);
    setDigits(next);
    setError(null);

    // Auto-advance to next input
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setDigits(next);
    setError(null);

    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const currentCode = digits.join('');
  const isComplete = currentCode.length === 6;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isComplete || isVerifying) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await verifyOtp(destination, currentCode, purpose);
      setIsVerifying(false);

      if (res.success && res.verified && res.verificationToken) {
        onVerified(res.verificationToken);
      } else {
        if (res.attemptsRemaining !== undefined) {
          setAttemptsRemaining(res.attemptsRemaining);
        }
        setError(res.message || 'Invalid verification code. Please check and re-enter.');
      }
    } catch {
      setIsVerifying(false);
      setError('An error occurred during verification. Please try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      const res = await requestOtp(destination, destinationType, purpose);
      setIsResending(false);
      if (res.success) {
        setCooldown(res.cooldownSeconds || 30);
        setMaskedDest(res.destinationMasked);
        setServiceConfigured(res.serviceConfigured);
        setMissingConfigNotice(res.missingConfigurationNotice);
        if (res.testDeliveryCode) {
          setTestCodeHint(res.testDeliveryCode);
        }
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(res.message || 'Unable to request new OTP. Please try again.');
      }
    } catch {
      setIsResending(false);
      setError('Failed to resend code. Please check your connection.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-modal-title"
      >
        {/* Header Bar */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-[#FAF9F6] to-white border-b border-[#E8E6E1]/60 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center border border-[#4F6F52]/20 shadow-xs">
              {destinationType === 'email' ? (
                <Mail className="w-5 h-5 text-[#4F6F52]" />
              ) : (
                <Smartphone className="w-5 h-5 text-[#4F6F52]" />
              )}
            </div>
            <div>
              <h3 id="otp-modal-title" className="text-base font-bold text-[#2C3333]">
                {destinationType === 'email' ? 'Verify Your Email Address' : 'Verify Your Mobile Number'}
              </h3>
              <p className="text-xs text-[#2C3333]/70">
                Step 2 of 2: Security OTP Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close verification modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Target destination banner */}
          <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between text-xs">
            <span className="text-[#2C3333]/70">Verification code sent to:</span>
            <span className="font-bold text-[#2C3333] font-mono tracking-wide bg-white px-2.5 py-1 rounded-lg border border-[#E8E6E1]/80">
              {maskedDest}
            </span>
          </div>

          {/* Selected Role Confirmation Banner */}
          {selectedRole && (
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-medium">Entering App As:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full border text-[11px] flex items-center gap-1 ${
                  selectedRole === 'customer'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {selectedRole === 'customer' ? '🌟 Customer / Diner' : '🏪 Restaurant Owner'}
                </span>
              </div>
              {onChangeRole && (
                <button
                  type="button"
                  onClick={() => onChangeRole(selectedRole === 'customer' ? 'restaurant-owner' : 'customer')}
                  className="text-[11px] font-bold text-[#4F6F52] hover:text-[#3D5A40] hover:underline cursor-pointer"
                >
                  Change to {selectedRole === 'customer' ? 'Restaurant Owner' : 'Customer'}
                </button>
              )}
            </div>
          )}

          {/* Default OTP Notification Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900 block">Default OTP Sent to Customer:</span>
                <span className="text-[11px] text-emerald-800">Use default code <strong className="font-mono text-xs">123456</strong> to verify instantly.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDigits(['1', '2', '3', '4', '5', '6']);
                setError(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
              id="fill-default-otp-btn"
            >
              Auto-Fill 123456
            </button>
          </div>

          {/* Missing SMS/Email service notice if applicable */}
          {!serviceConfigured && testCodeHint && testCodeHint !== '123456' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                <span>Messaging Gateway Configuration Notice</span>
              </div>
              <p>
                {missingConfigNotice || 'External SMS/Email messaging service is running in sandbox mode.'}
              </p>
            </div>
          )}

          {/* 6 Digit Inputs */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2C3333] mb-2 text-center">
                Enter the 6-Digit Verification Code
              </label>
              <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                  <input
                    key={`otp-input-${index}`}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-11 h-12 sm:w-12 sm:h-13 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border transition-all outline-none ${
                      digit
                        ? 'border-[#4F6F52] bg-[#4F6F520A] text-[#2C3333]'
                        : 'border-[#E8E6E1] bg-[#FAF9F6] focus:border-[#4F6F52] focus:bg-white text-[#2C3333]'
                    } ${error ? 'border-rose-400 bg-rose-50/40' : ''}`}
                    aria-label={`Digit ${index + 1}`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Verify CTA */}
            <button
              type="submit"
              disabled={!isComplete || isVerifying}
              className={`w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow-md flex items-center justify-center gap-2 ${
                isComplete && !isVerifying
                  ? 'bg-[#4F6F52] hover:bg-[#3D5A40] cursor-pointer shadow-[#4F6F52]/20'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed'
              }`}
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Activate Account</span>
                </>
              )}
            </button>
          </form>

          {/* Resend & Cooldown Footer */}
          <div className="pt-2 border-t border-[#E8E6E1]/60 flex items-center justify-between text-xs text-[#2C3333]/70">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>Valid for 10 minutes</span>
            </span>

            {cooldown > 0 ? (
              <span className="text-stone-400 font-semibold font-mono">
                Resend in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#4F6F52] hover:text-[#3D5A40] font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                <span>Resend OTP</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
