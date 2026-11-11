import React from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Smartphone,
  PartyPopper
} from 'lucide-react';

interface FirstTimeWelcomeModalProps {
  isOpen: boolean;
  onProceed: () => void;
  customerName?: string;
  email?: string;
  mobile?: string;
}

export const FirstTimeWelcomeModal: React.FC<FirstTimeWelcomeModalProps> = ({
  isOpen,
  onProceed,
  customerName,
  email,
  mobile,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        {/* Banner with celebratory FlashTable aesthetic */}
        <div className="px-6 pt-8 pb-6 bg-gradient-to-br from-[#4F6F5214] via-[#FAF9F6] to-white text-center relative overflow-hidden border-b border-[#E8E6E1]/60">
          <div className="w-16 h-16 rounded-3xl bg-[#4F6F52] text-white mx-auto flex items-center justify-center shadow-lg shadow-[#4F6F52]/25 mb-4 animate-in bounce-in duration-300">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            First-Time Account Activation
          </span>

          <h2 id="welcome-modal-title" className="text-xl sm:text-2xl font-bold text-[#2C3333]">
            {customerName ? `Welcome to Flash Table, ${customerName}!` : 'Welcome to Flash Table!'}
          </h2>
        </div>

        {/* Message Body - displaying verbatim required message */}
        <div className="p-6 sm:p-7 space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-sm leading-relaxed font-medium">
            <p className="font-semibold text-emerald-900">
              &ldquo;Welcome to Flash Table! Your account has been successfully created and verified. You have successfully logged in for the first time. You can now access your account using your registered email ID or mobile number and password.&rdquo;
            </p>
          </div>

          {/* Account credentials summary card */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-2.5 text-xs text-[#2C3333]">
            <span className="font-bold uppercase tracking-wider text-[10px] text-stone-500 block">
              Your Registered Account Credentials
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
              {email && (
                <div className="p-2.5 rounded-xl bg-white border border-[#E8E6E1] flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              )}
              {mobile && (
                <div className="p-2.5 rounded-xl bg-white border border-[#E8E6E1] flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
                  <span>+91 {mobile.replace(/\D/g, '').slice(-10)}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#2C3333]/70 pt-1">
              • On future visits, simply log in using your registered Email ID or Mobile Number and your password. No OTP is required for subsequent normal logins.
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={onProceed}
            className="w-full py-3.5 rounded-2xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-[#4F6F52]/20 flex items-center justify-center gap-2 cursor-pointer"
            id="first-time-proceed-btn"
          >
            <span>Proceed to Flash Table Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
