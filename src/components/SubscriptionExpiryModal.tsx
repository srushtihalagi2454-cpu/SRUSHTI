import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Crown, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowRight, 
  X, 
  Calendar,
  Sparkles,
  Zap,
  RotateCw
} from 'lucide-react';
import { RestaurantSubscriptionStatus, Restaurant } from '../types';
import { ExpiryTier } from '../services/subscriptionService';

interface SubscriptionExpiryModalProps {
  isOpen: boolean;
  tier: ExpiryTier | null;
  subscription: RestaurantSubscriptionStatus;
  restaurant: Restaurant;
  onClose: () => void;
  onRenew: () => void;
  onViewPlans: () => void;
}

export const SubscriptionExpiryModal: React.FC<SubscriptionExpiryModalProps> = ({
  isOpen,
  tier,
  subscription,
  restaurant,
  onClose,
  onRenew,
  onViewPlans,
}) => {
  if (!isOpen || !tier) return null;

  const isExpired = tier === 'expired' || subscription.daysRemaining <= 0;
  const is1Day = tier === '1d';
  const is3Day = tier === '3d';
  const is7Day = tier === '7d';

  const formattedExpiry = new Date(subscription.expiryDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      id="modal-subscription-expiry"
    >
      <div 
        className="relative bg-white rounded-3xl border border-[#E8E6E1] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Accent Banner Top */}
        <div className={`h-2.5 w-full ${
          isExpired 
            ? 'bg-rose-600' 
            : is1Day 
            ? 'bg-amber-500' 
            : is3Day 
            ? 'bg-amber-400' 
            : 'bg-[#4F6F52]'
        }`} />

        {/* Modal Header */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                isExpired 
                  ? 'bg-rose-100 text-rose-600 border border-rose-200' 
                  : is1Day 
                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                  : is3Day 
                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {isExpired ? (
                  <ShieldAlert className="w-8 h-8 animate-pulse text-rose-600" />
                ) : is1Day ? (
                  <AlertTriangle className="w-8 h-8 text-amber-600 animate-bounce" />
                ) : (
                  <Clock className="w-8 h-8 text-[#4F6F52]" />
                )}
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5 border shadow-2xs">
                  {isExpired ? (
                    <span className="bg-rose-100 text-rose-800 border-rose-300">
                      ⚠️ Subscription Expired
                    </span>
                  ) : is1Day ? (
                    <span className="bg-amber-100 text-amber-900 border-amber-300">
                      🚨 Final Notice • 1 Day Remaining
                    </span>
                  ) : is3Day ? (
                    <span className="bg-amber-50 text-amber-800 border-amber-200">
                      ⏳ Renewal Reminder • 3 Days Left
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-800 border-emerald-200">
                      🗓️ Expiry Notice • 7 Days Left
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#2C3333] tracking-tight leading-snug">
                  {isExpired 
                    ? 'Your FlashTable subscription has expired!' 
                    : is1Day 
                    ? 'Urgent: Subscription Expires Tomorrow!' 
                    : is3Day 
                    ? 'Subscription Expiring in 3 Days' 
                    : 'Subscription Renewal Notice (7 Days Left)'}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#E8E6E1] bg-white hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
              id="btn-close-expiry-modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="text-xs sm:text-sm text-stone-600 leading-relaxed space-y-2">
            {isExpired ? (
              <p>
                Your restaurant subscription for <strong className="text-stone-900">{restaurant.name}</strong> is no longer active. Renew your plan to continue enjoying FlashTable's premium restaurant management services, live table modifications, and instant guest seating controls.
              </p>
            ) : is1Day ? (
              <p>
                Only <strong className="text-amber-800 font-bold">1 day remains</strong> on your FlashTable partner plan for <strong className="text-stone-900">{restaurant.name}</strong> (expires on <strong>{formattedExpiry}</strong>). Renew today to prevent service interruption or live table holds.
              </p>
            ) : is3Day ? (
              <p>
                Your partner plan for <strong className="text-stone-900">{restaurant.name}</strong> will expire in <strong className="text-amber-800 font-bold">3 days</strong> on <strong>{formattedExpiry}</strong>. Renew early to maintain smooth guest arrivals and priority seat allocation.
              </p>
            ) : (
              <p>
                Your partner subscription for <strong className="text-stone-900">{restaurant.name}</strong> is scheduled to expire in <strong className="text-emerald-800 font-bold">7 days</strong> on <strong>{formattedExpiry}</strong>. Select a quarterly, half-yearly, or annual plan to secure your partner rates.
              </p>
            )}
          </div>

          {/* Plan Summary Card */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] text-xs space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-stone-500">Current Plan:</span>
              <span className="font-bold text-[#2C3333] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>{subscription.planName}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500">Official Expiry Date:</span>
              <span className="font-mono font-bold text-[#2C3333]">{formattedExpiry}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#E8E6E1]">
              <span className="text-stone-500">Remaining Time:</span>
              <span className={`font-bold font-mono text-sm ${
                isExpired ? 'text-rose-600' : is1Day ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {isExpired ? '0 Days (Expired)' : `${subscription.daysRemaining} Days Left`}
              </span>
            </div>
          </div>

          {/* Safety Reassurance Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong>Your Data is 100% Protected:</strong> Restaurant profile, confirmed guest reservations, customer contact numbers, and historical analytics remain completely safe, preserved, and accessible.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onRenew}
              className={`flex-1 py-3.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                isExpired 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-[#4F6F52] hover:bg-[#3D5A40] text-white'
              }`}
              id="btn-modal-renew-subscription"
            >
              <RotateCw className="w-4 h-4" />
              <span>Renew Subscription</span>
            </button>

            <button
              type="button"
              onClick={onViewPlans}
              className="py-3.5 px-6 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
              id="btn-modal-view-plans"
            >
              <span>View Plans</span>
            </button>
          </div>

          {!isExpired && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-stone-500 hover:text-stone-800 hover:underline cursor-pointer"
              >
                Remind Me Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
