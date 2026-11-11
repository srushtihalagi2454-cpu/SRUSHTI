import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  X, 
  AlertCircle, 
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserRole } from '../types';
import { submitSignIn, setupInitialCompanyAdmin, saveStoredSession } from '../services/authService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminSession: any) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [adminIdentifier, setAdminIdentifier] = useState('admin@flashtable.com');
  const [password, setPassword] = useState('Admin@FlashTable2025!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Direct login attempt with company-admin role
      const res = await submitSignIn(
        { email: adminIdentifier.trim(), loginIdentifier: adminIdentifier.trim(), password },
        'company-admin'
      );

      if (res.success && res.userSummary) {
        setIsLoading(false);
        onSuccess(res.userSummary);
        onClose();
        return;
      }

      // 2. If initial admin needs provisioning via Master Key
      if (password === 'Admin@FlashTable2025!' || adminIdentifier === 'admin@flashtable.com') {
        const setupRes = await setupInitialCompanyAdmin({
          masterKey: 'FLASHTABLE_SECURE_ADMIN_KEY_2026',
          fullName: 'FlashTable Security Team',
          email: 'admin@flashtable.com',
          password: 'Admin@FlashTable2025!',
          confirmPassword: 'Admin@FlashTable2025!',
        });

        if (setupRes.success && setupRes.userSummary) {
          setIsLoading(false);
          onSuccess(setupRes.userSummary);
          onClose();
          return;
        }
      }

      setIsLoading(false);
      setError(res.message || 'Access Denied: Invalid Administrator Credentials.');
    } catch (err: any) {
      setIsLoading(false);
      setError('Unable to authenticate administrator. Please verify credentials.');
    }
  };

  const fillDemoAdmin = () => {
    setAdminIdentifier('admin@flashtable.com');
    setPassword('Admin@FlashTable2025!');
    setError(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      id="modal-admin-login"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white w-full max-w-md rounded-3xl border border-emerald-900/20 shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Security Badge */}
        <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            id="close-admin-login-modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block">
                Enterprise Security Portal
              </span>
              <h3 className="text-lg font-bold font-serif text-white">
                Admin Console Access
              </h3>
            </div>
          </div>
          <p className="text-xs text-stone-300 leading-snug">
            Restricted to authorized FlashTable corporate administrators, compliance officers, and platform operators.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333] mb-1.5">
                Official Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  placeholder="admin@flashtable.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-emerald-700 font-medium text-[#2C3333]"
                  id="admin-login-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333] mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-emerald-700 font-medium text-[#2C3333]"
                  id="admin-login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              id="admin-login-submit-btn"
            >
              {isLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate & Enter Console</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="pt-3 border-t border-[#E8E6E1]/70 flex items-center justify-between text-xs text-stone-500">
            <span>Demo evaluation key?</span>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
              id="btn-fill-demo-admin-creds"
            >
              <Sparkles className="w-3 h-3" />
              <span>Fill Admin Credentials</span>
            </button>
          </div>
        </div>

        <div className="bg-[#FAF9F6] px-6 py-3 border-t border-[#E8E6E1] text-center text-[10px] text-stone-400 font-mono">
          Security Protocol 2026 • FlashTable Platform Oversight
        </div>
      </div>
    </div>
  );
};
