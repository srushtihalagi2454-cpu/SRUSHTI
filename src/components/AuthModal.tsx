import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  User, 
  MapPin,
  CalendarDays
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (name: string, phone: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpSent(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess(name, `+91 ${mobileNumber}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white w-full max-w-md rounded-3xl border border-[#E8E6E1] shadow-2xl p-7 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-[#FAF9F6]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center font-bold font-serif border border-[#4F6F52]/20">
            FT
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif text-[#2C3333]">
              Sign In to FlashTable
            </h3>
            <p className="text-xs text-[#2C3333]/60">
              Access saved reservations & exact table history
            </p>
          </div>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/70 block mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/70 block mb-1.5">
                Indian Mobile Number (+91)
              </label>
              <div className="flex rounded-2xl border border-[#E8E6E1] bg-[#FAF9F6] overflow-hidden focus-within:border-[#4F6F52]">
                <span className="px-3.5 py-2.5 text-xs font-semibold text-[#2C3333]/60 border-r border-[#E8E6E1] bg-[#FAF9F6]">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="98450 12345"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-transparent outline-none text-[#2C3333]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-xs"
            >
              Send Verification Code (OTP)
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center py-2">
              <span className="text-xs text-[#2C3333]/60">OTP sent to +91 {mobileNumber}</span>
              <p className="text-sm font-bold font-serif text-[#2C3333] mt-1">Enter 4-digit verification code</p>
            </div>

            <div className="flex justify-center gap-2">
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-36 text-center tracking-[0.5em] text-lg font-mono font-bold py-2.5 bg-[#FAF9F6] border border-[#4F6F52] rounded-2xl outline-none text-[#2C3333]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-xs"
            >
              Verify & Enter FlashTable
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-xs text-[#2C3333]/60 hover:underline"
              >
                Change mobile number
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-3 border-t border-[#E8E6E1] text-center text-[10px] text-[#2C3333]/40">
          Protected by FlashTable Zero-Spam Guarantee • Bengaluru, India
        </div>

      </div>
    </div>
  );
};
