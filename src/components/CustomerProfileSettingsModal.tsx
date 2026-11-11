import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Languages, 
  Trash2, 
  AlertTriangle, 
  Check, 
  ShieldCheck, 
  CalendarDays, 
  AlertCircle,
  LogOut,
  Info
} from 'lucide-react';
import { SupportedLanguage, Reservation } from '../types';
import { LANGUAGE_OPTIONS, saveLanguagePreference, t } from '../utils/languageUtils';
import { deleteUserAccount } from '../services/adminService';

interface CustomerProfileSettingsModalProps {
  currentUser: {
    userId?: string;
    fullName: string;
    email: string;
    phone: string;
  };
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  reservations: Reservation[];
  onClose: () => void;
  onSignOut: () => void;
  onAccountDeleted: () => void;
}

export const CustomerProfileSettingsModal: React.FC<CustomerProfileSettingsModalProps> = ({
  currentUser,
  currentLanguage,
  onLanguageChange,
  reservations,
  onClose,
  onSignOut,
  onAccountDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'language' | 'delete'>('profile');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(currentLanguage);
  
  // Delete account workflow state
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Active / upcoming reservations for this user
  const activeUpcomingReservations = reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'seated'
  );

  const handleSelectLanguage = (langCode: SupportedLanguage) => {
    setSelectedLang(langCode);
    saveLanguagePreference(langCode);
    onLanguageChange(langCode);
  };

  const handleConfirmDeleteAccount = () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type "DELETE" to confirm permanent account deactivation.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const uId = currentUser.userId || `USR-${currentUser.email}`;
      deleteUserAccount(uId, currentUser.fullName);
      
      // Clear sessions and localStorage
      onAccountDeleted();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to process account deletion request.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-[#E8E6E1] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E8E6E1] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52]">
              {t('profile.title', selectedLang)}
            </span>
            <h3 className="text-xl font-bold font-serif text-[#2C3333] mt-0.5">
              Account Preferences
            </h3>
            <p className="text-xs text-[#2C3333]/60">
              Manage personal details, interface language, and account privacy
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E6E1] flex items-center justify-center text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            id="close-profile-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E8E6E1] px-6 bg-white gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#4F6F52] text-[#4F6F52]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'language'
                ? 'border-[#4F6F52] text-[#4F6F52]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{t('profile.language', selectedLang)}</span>
          </button>

          <button
            onClick={() => setActiveTab('delete')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'delete'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-stone-500 hover:text-rose-600'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('profile.deleteAccount', selectedLang)}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-[#2C3333]">
          
          {/* TAB 1: PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                <div className="w-12 h-12 rounded-full bg-[#4F6F52] text-white flex items-center justify-center font-bold text-lg font-serif">
                  {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2C3333]">{currentUser.fullName || 'FlashTable Customer'}</h4>
                  <span className="text-[11px] text-[#4F6F52] font-semibold bg-[#4F6F521A] px-2 py-0.5 rounded-full inline-block mt-0.5">
                    Verified Diner Account
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-[#E8E6E1] bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Email Address</span>
                      <span className="font-semibold text-[#2C3333]">{currentUser.email || '—'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {t('profile.verified', selectedLang)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#E8E6E1] bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Mobile Number</span>
                      <span className="font-semibold text-[#2C3333]">{currentUser.phone || '+91 98450 12345'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {t('profile.verified', selectedLang)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('nav.logout', selectedLang)}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PREFERRED LANGUAGE */}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs text-stone-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#4F6F52] shrink-0 mt-0.5" />
                <span>
                  Select your preferred language. The navigation, reservation instructions, buttons, and booking cards will automatically adapt. English is always available.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isSelected = selectedLang === lang.code;

                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#4F6F52] bg-[#4F6F521A] text-[#4F6F52] font-bold ring-2 ring-[#4F6F52]/20'
                          : 'border-[#E8E6E1] bg-white hover:border-[#4F6F52]/40 text-[#2C3333]'
                      }`}
                      id={`lang-btn-${lang.code}`}
                    >
                      <div>
                        <div className="text-xs font-bold">{lang.label}</div>
                        <div className="text-[11px] text-stone-500 font-normal">{lang.nativeName}</div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#4F6F52] text-white flex items-center justify-center text-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-stone-400 text-center">
                Preference saved automatically to your profile session.
              </p>
            </div>
          )}

          {/* TAB 3: DELETE ACCOUNT */}
          {activeTab === 'delete' && (
            <div className="space-y-4">
              {/* Mandatory clear warning */}
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-800 text-sm">Permanent Account Deletion Warning</h4>
                  <p className="mt-1 font-medium">
                    "Are you sure you want to delete your account? This action may permanently remove your account and personal information."
                  </p>
                </div>
              </div>

              {/* Notice regarding active reservations */}
              {activeUpcomingReservations.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <CalendarDays className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Active Reservation Alert ({activeUpcomingReservations.length})
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      You currently have {activeUpcomingReservations.length} upcoming or confirmed reservation(s). Deleting your account will anonymize your profile. For dining fulfillment and audit compliance, existing booking records will remain logged with the restaurant host stand.
                    </p>
                  </div>
                </div>
              )}

              {/* Privacy and audit retention compliance notice */}
              <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs text-stone-600 space-y-1">
                <p className="font-bold text-[#2C3333]">What happens after deletion:</p>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 text-stone-500">
                  <li>Your name, phone number, and email will be immediately anonymized.</li>
                  <li>You will be signed out permanently and prevented from logging in.</li>
                  <li>Financial and statutory audit transactions will be preserved for administration compliance without exposing your identity.</li>
                </ul>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              {/* Confirmation input */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Type <span className="text-rose-600 font-mono">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-300 text-xs font-mono uppercase outline-none focus:border-rose-500"
                  id="confirm-delete-account-input"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel & Keep Account
                </button>
                <button
                  disabled={deleteConfirmationText.trim().toUpperCase() !== 'DELETE' || isDeleting}
                  onClick={handleConfirmDeleteAccount}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  id="confirm-delete-account-submit-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete My Account'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
