import React, { useState } from 'react';
import { 
  ShieldAlert, 
  KeyRound, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Building2,
  ArrowRight
} from 'lucide-react';
import { setupInitialCompanyAdmin } from '../services/authService';
import { AdminSetupFormData } from '../types';

interface CompanyAdminSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminSummary: any) => void;
}

export const CompanyAdminSetupModal: React.FC<CompanyAdminSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<AdminSetupFormData>({
    masterKey: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.masterKey.trim()) {
      setError('Authorized Company Master Setup Key is required.');
      return;
    }
    if (!formData.fullName.trim()) {
      setError('Administrator full name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Official corporate email address is required.');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Administrator password must be at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setupInitialCompanyAdmin(formData);
      setIsSubmitting(false);
      if (res.success && res.userSummary) {
        onSuccess(res.userSummary);
      } else {
        setError(res.errors?.general || res.message || 'Authorization failed. Please verify your Master Key.');
      }
    } catch {
      setIsSubmitting(false);
      setError('Unable to complete administrative setup. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-setup-title"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-emerald-900 to-stone-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldAlert className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Restricted Company Portal
              </span>
              <h3 id="admin-setup-title" className="text-base font-bold text-white mt-1">
                Authorized Admin Setup & Provisioning
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 text-xs text-stone-600 leading-relaxed">
          <p>
            This portal is strictly restricted to authorized Flash Table corporate personnel. Creation of a Company Administrator profile requires the Authorized Master Key.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Master Key */}
          <div>
            <label className="block text-xs font-bold text-[#2C3333] mb-1.5">
              Authorized Master Setup Key <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={formData.masterKey}
                onChange={(e) => setFormData({ ...formData, masterKey: e.target.value })}
                placeholder="Enter company master provisioning key"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-mono bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-emerald-600 focus:bg-white"
                required
              />
            </div>
            <p className="text-[10px] text-stone-500 mt-1">
              • Configured via <code>COMPANY_ADMIN_SETUP_KEY</code> on server. Default: <code>FLASHTABLE_SECURE_ADMIN_KEY_2026</code>
            </p>
          </div>

          {/* Admin Name */}
          <div>
            <label className="block text-xs font-bold text-[#2C3333] mb-1.5">
              Administrator Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Srushti Halagi (Compliance Officer)"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-emerald-600 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Corporate Email */}
          <div>
            <label className="block text-xs font-bold text-[#2C3333] mb-1.5">
              Official Corporate Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. admin@flashtable.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-emerald-600 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#2C3333] mb-1.5">
                Admin Password (Min 8) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full pl-10 pr-9 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-emerald-600 focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3333] mb-1.5">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-9 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-emerald-600 focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Provisioning Admin Account...</span>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Authorize & Provision Admin Account</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
