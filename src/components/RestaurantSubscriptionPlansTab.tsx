import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  Calendar, 
  CreditCard, 
  ArrowRight, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Receipt,
  QrCode,
  Building2,
  X,
  RotateCw,
  TrendingUp,
  History,
  FileText
} from 'lucide-react';
import { 
  Restaurant, 
  RestaurantSubscriptionPlan, 
  RestaurantSubscriptionStatus, 
  SubscriptionPlanId,
  RestaurantSubscriptionHistoryItem
} from '../types';
import { 
  RESTAURANT_SUBSCRIPTION_PLANS, 
  getRestaurantSubscription, 
  activateRestaurantSubscription,
  simulateSubscriptionExpiry,
  getRestaurantSubscriptionHistory
} from '../services/subscriptionService';
import { formatINR } from '../utils/priceUtils';

interface RestaurantSubscriptionPlansTabProps {
  restaurant: Restaurant;
  onToast?: (message: string) => void;
  onRequestRenew?: () => void;
}

export const RestaurantSubscriptionPlansTab: React.FC<RestaurantSubscriptionPlansTabProps> = ({
  restaurant,
  onToast,
}) => {
  const [currentSub, setCurrentSub] = useState<RestaurantSubscriptionStatus>(() => 
    getRestaurantSubscription(restaurant.id)
  );
  const [historyItems, setHistoryItems] = useState<RestaurantSubscriptionHistoryItem[]>(() =>
    getRestaurantSubscriptionHistory(restaurant.id)
  );
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<RestaurantSubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState<string>('partner@okaxis');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<RestaurantSubscriptionStatus | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<RestaurantSubscriptionHistoryItem | null>(null);

  // Sync state if subscription changes
  useEffect(() => {
    const refreshData = () => {
      const sub = getRestaurantSubscription(restaurant.id);
      setCurrentSub(sub);
      setHistoryItems(getRestaurantSubscriptionHistory(restaurant.id));
    };

    refreshData();
    const handleUpdate = (e: any) => {
      if (!e.detail || e.detail.restaurantId === restaurant.id) {
        refreshData();
      }
    };
    window.addEventListener('flashtable_subscription_updated', handleUpdate);
    return () => window.removeEventListener('flashtable_subscription_updated', handleUpdate);
  }, [restaurant.id]);

  const handleOpenCheckout = (plan: RestaurantSubscriptionPlan) => {
    setSelectedPlanForCheckout(plan);
    setCheckoutSuccess(null);
  };

  const handleConfirmActivation = () => {
    if (!selectedPlanForCheckout) return;
    setIsProcessing(true);

    setTimeout(() => {
      const paymentLabel = selectedPlanForCheckout.isFree
        ? 'Free 1st Month Trial Promotion'
        : paymentMethod === 'upi'
        ? `UPI (${upiId || 'partner@okaxis'})`
        : paymentMethod === 'card'
        ? 'Credit / Debit Card (Online Settlement)'
        : 'Net Banking (Commercial Account)';

      const updated = activateRestaurantSubscription(
        restaurant.id, 
        selectedPlanForCheckout.id, 
        paymentLabel
      );

      setIsProcessing(false);
      setCurrentSub(updated);
      setHistoryItems(getRestaurantSubscriptionHistory(restaurant.id));
      setCheckoutSuccess(updated);

      if (onToast) {
        onToast(`🎉 Subscription Activated: ${selectedPlanForCheckout.name} for ${restaurant.name}!`);
      }
    }, 750);
  };

  const handleSimulateTier = (days: number) => {
    const updated = simulateSubscriptionExpiry(restaurant.id, days);
    setCurrentSub(updated);
    if (onToast) {
      if (days <= 0) {
        onToast(`⚠️ Simulated: Subscription Expired (0 Days Remaining)`);
      } else {
        onToast(`⏳ Simulated: ${days} Days Remaining until expiry`);
      }
    }
  };

  const scrollToPlans = () => {
    const el = document.getElementById('subscription-plans-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isExpired = currentSub.status === 'expired' || currentSub.daysRemaining <= 0;
  const isExpiringSoon = currentSub.status === 'expiring_soon' && currentSub.daysRemaining > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-150" id="section-subscription-plans">
      
      {/* 1. Header Hero Card */}
      <div className="bg-gradient-to-br from-[#2C3333] via-[#33423b] to-[#1e2424] text-white p-6 sm:p-8 rounded-3xl shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#4F6F52]/30 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4F6F52]/30 border border-[#4F6F52]/40 text-emerald-300 text-xs font-bold uppercase tracking-widest">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Restaurant Partner Memberships</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
            Subscription Plans & Partner Management
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Manage your FlashTable restaurant partnership for <strong className="text-white">{restaurant.name}</strong>. Enjoy full 2D live table seating, dining timer pacing, digital QR menus, smart arrival radar, and zero-commission dine-in settlements.
          </p>
        </div>
      </div>

      {/* 2. Expired Warning Banner (if status is expired) */}
      {isExpired && (
        <div 
          className="bg-rose-50 border-2 border-rose-400 p-5 sm:p-6 rounded-3xl shadow-sm space-y-3 animate-in fade-in"
          id="banner-subscription-expired"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-900 border border-rose-300 mb-1">
                  <span>Status: Expired</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-rose-950">
                  Your FlashTable subscription has expired!
                </h3>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed max-w-2xl">
                  Your restaurant subscription is no longer active. Premium table modifications and live seat allocation controls are temporarily paused. <strong>Your venue profile, customer reservations, and past records remain completely safe.</strong> Renew your plan to restore full administrative services.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  const popularPlan = RESTAURANT_SUBSCRIPTION_PLANS.find(p => p.isPopular) || RESTAURANT_SUBSCRIPTION_PLANS[1];
                  handleOpenCheckout(popularPlan);
                }}
                className="py-3 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer"
                id="btn-banner-renew-expired"
              >
                <RotateCw className="w-4 h-4" />
                <span>Renew Subscription</span>
              </button>
              <button
                type="button"
                onClick={scrollToPlans}
                className="py-3 px-4 rounded-full bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2b. Expiring Soon Warning Banner (if within 7 days) */}
      {!isExpired && isExpiringSoon && (
        <div className="bg-amber-50 border border-amber-300 p-5 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Subscription Expiring Soon ({currentSub.daysRemaining} {currentSub.daysRemaining === 1 ? 'Day' : 'Days'} Remaining)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Your partner plan will expire on <strong>{new Date(currentSub.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>. Renew now to avoid any interruption.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const popularPlan = RESTAURANT_SUBSCRIPTION_PLANS.find(p => p.isPopular) || RESTAURANT_SUBSCRIPTION_PLANS[1];
              handleOpenCheckout(popularPlan);
            }}
            className="py-2.5 px-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Renew Subscription
          </button>
        </div>
      )}

      {/* 3. DEDICATED SUBSCRIPTION MANAGEMENT SECTION */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8E6E1] shadow-xs space-y-6" id="subscription-management-panel">
        
        {/* Panel Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E8E6E1]">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isExpired 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Active Partner Plan:</span>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-[#2C3333]">
                  {currentSub.planName}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isExpired
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : isExpiringSoon
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active Plan'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Venue: <strong>{restaurant.name}</strong> • Ref ID: <code className="font-mono text-stone-700">{currentSub.transactionId || 'SUB-REF-01'}</code>
              </p>
            </div>
          </div>

          {/* Action Buttons: Renew Subscription & Upgrade Plan */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                const currentOrPopular = RESTAURANT_SUBSCRIPTION_PLANS.find(p => p.id === currentSub.planId) || RESTAURANT_SUBSCRIPTION_PLANS[1];
                handleOpenCheckout(currentOrPopular);
              }}
              className="py-2.5 px-4 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              id="btn-renew-subscription-panel"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Renew Subscription</span>
            </button>

            <button
              type="button"
              onClick={scrollToPlans}
              className="py-2.5 px-4 rounded-full bg-stone-100 hover:bg-stone-200 text-[#2C3333] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              id="btn-upgrade-plan-panel"
            >
              <span>Upgrade Plan</span>
            </button>
          </div>
        </div>

        {/* 6 Key Subscription Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
          {/* Current Plan */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
            <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">Current Plan</span>
            <span className="font-bold text-[#2C3333] text-sm mt-1 block truncate">
              {currentSub.planName}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              {currentSub.planId === 'free-month' ? '30 Days' : currentSub.planId === '3-months' ? '3 Months' : currentSub.planId === '6-months' ? '6 Months' : '12 Months'}
            </span>
          </div>

          {/* Activation Date */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
            <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">Activation Date</span>
            <span className="font-bold text-[#2C3333] text-sm mt-1 block font-mono">
              {new Date(currentSub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              {new Date(currentSub.startDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Expiry Date */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
            <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">Expiry Date</span>
            <span className="font-bold text-[#2C3333] text-sm mt-1 block font-mono">
              {new Date(currentSub.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              {new Date(currentSub.expiryDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Remaining Days */}
          <div className={`p-4 rounded-2xl border ${
            isExpired 
              ? 'bg-rose-50 border-rose-200' 
              : isExpiringSoon 
              ? 'bg-amber-50 border-amber-200' 
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            <span className="text-stone-600 block text-[10px] uppercase font-bold tracking-wider">Remaining Days</span>
            <span className={`font-extrabold text-base mt-1 block font-mono ${
              isExpired ? 'text-rose-700' : isExpiringSoon ? 'text-amber-800' : 'text-emerald-800'
            }`}>
              {isExpired ? '0 Days (Expired)' : `${currentSub.daysRemaining} Days`}
            </span>
            <span className="text-[10px] text-stone-500 mt-0.5 block">
              {isExpired ? 'Renewal Required' : 'Full Access Active'}
            </span>
          </div>

          {/* Amount Paid */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
            <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">Amount Paid</span>
            <span className="font-extrabold text-emerald-800 text-sm mt-1 block font-serif">
              {currentSub.amountPaid === 0 ? '₹0 (Free Trial)' : formatINR(currentSub.amountPaid)}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block truncate">
              {currentSub.paymentMethod || 'Zero Fee'}
            </span>
          </div>

          {/* Payment Status */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
            <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">Payment Status</span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                isExpired ? 'bg-rose-500' : 'bg-emerald-500'
              }`} />
              <span className="font-bold text-xs uppercase tracking-wider text-[#2C3333]">
                {isExpired ? 'Expired' : currentSub.amountPaid === 0 ? 'Free Trial' : 'Paid & Verified'}
              </span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              Direct Settlement
            </span>
          </div>
        </div>

        {/* Expiry Simulation Controls (for interactive testing & verification) */}
        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-dashed border-[#E8E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-stone-600">
              <strong>Interactive Expiry Simulator:</strong> Test the automated 7-day, 3-day, 1-day, and Expired reminder system:
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleSimulateTier(30)}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#E8E6E1] hover:bg-stone-50 text-[11px] font-bold text-emerald-800 cursor-pointer"
            >
              Reset: 30 Days (Active)
            </button>
            <button
              type="button"
              onClick={() => handleSimulateTier(7)}
              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-50 text-[11px] font-bold text-amber-800 cursor-pointer"
            >
              Simulate 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleSimulateTier(3)}
              className="px-2.5 py-1 rounded-lg bg-white border border-amber-400 hover:bg-amber-50 text-[11px] font-bold text-amber-900 cursor-pointer"
            >
              Simulate 3 Days
            </button>
            <button
              type="button"
              onClick={() => handleSimulateTier(1)}
              className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 hover:bg-rose-50 text-[11px] font-bold text-rose-800 cursor-pointer"
            >
              Simulate 1 Day
            </button>
            <button
              type="button"
              onClick={() => handleSimulateTier(0)}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-bold text-white cursor-pointer shadow-xs"
            >
              Simulate Expired
            </button>
          </div>
        </div>

      </div>

      {/* 4. THE FOUR OFFICIAL SUBSCRIPTION PLANS */}
      <div className="space-y-4 pt-2" id="subscription-plans-grid">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#2C3333]">
              Partner Subscription Plans
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Select or renew a plan. Zero commission on food orders, instant activation, and direct tableside payments.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#4F6F52] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            Guaranteed Partner Pricing • All Features Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {RESTAURANT_SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = currentSub.planId === plan.id && !isExpired;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl border-2 transition-all p-5 sm:p-6 flex flex-col justify-between relative bg-white ${
                  plan.isPopular
                    ? 'border-[#4F6F52] shadow-lg ring-2 ring-[#4F6F52]/30 scale-[1.01]'
                    : plan.isBestValue
                    ? 'border-amber-400 shadow-md ring-1 ring-amber-300'
                    : 'border-[#E8E6E1] hover:border-[#4F6F52]/60 hover:shadow-sm'
                }`}
                id={`card-plan-${plan.id}`}
              >
                {/* Popular / Best Value Ribbon */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className={`px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xs ${
                      plan.isPopular
                        ? 'bg-[#4F6F52] text-white'
                        : plan.isBestValue
                        ? 'bg-amber-400 text-stone-950 border border-amber-500'
                        : 'bg-[#2C3333] text-white'
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4 pt-1">
                  {/* Plan Name & Tagline */}
                  <div>
                    <h4 className="text-lg font-bold font-serif text-[#2C3333]">
                      {plan.name}
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 min-h-[34px] leading-snug">
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="py-3.5 border-y border-[#E8E6E1]/80">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-serif text-[#2C3333]">
                        {plan.isFree ? '₹0' : `₹${plan.price}`}
                      </span>
                      {plan.regularPrice && !plan.isFree && (
                        <span className="text-sm font-semibold text-stone-500 line-through">
                          ₹{plan.regularPrice}
                        </span>
                      )}
                      {plan.discountBadge && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {plan.discountBadge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                      Duration: <strong className="text-stone-800">{plan.durationLabel}</strong>
                    </span>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Included Capabilities:
                    </span>
                    <ul className="space-y-2">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#2C3333]">
                          <Check className="w-3.5 h-3.5 text-[#4F6F52] shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-6 mt-4 border-t border-[#E8E6E1]/70">
                  {isCurrentPlan ? (
                    <div className="w-full py-2.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Current Active Plan</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenCheckout(plan)}
                      className={`w-full py-3 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                        plan.isPopular
                          ? 'bg-[#4F6F52] hover:bg-[#3D5A40] text-white shadow-md'
                          : plan.isBestValue
                          ? 'bg-amber-400 hover:bg-amber-500 text-stone-950 font-black'
                          : 'bg-[#2C3333] hover:bg-[#4F6F52] text-white'
                      }`}
                      id={`btn-select-plan-${plan.id}`}
                    >
                      <span>
                        {plan.isFree 
                          ? 'Start 1st Month Free' 
                          : isExpired 
                          ? `Renew (${plan.name})` 
                          : `Select Plan (₹${plan.price})`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SUBSCRIPTION HISTORY SECTION */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8E6E1] shadow-xs space-y-4" id="subscription-history-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E6E1]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#4F6F52]" />
            <h3 className="text-base sm:text-lg font-bold font-serif text-[#2C3333]">
              Subscription History & Invoices
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            {historyItems.length} {historyItems.length === 1 ? 'record' : 'records'} logged
          </span>
        </div>

        {historyItems.length === 0 ? (
          <div className="p-8 text-center bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E8E6E1] text-xs text-stone-500">
            No previous billing records found. Activate a plan to generate your first partner invoice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E6E1] text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                  <th className="pb-2.5">Date & Time</th>
                  <th className="pb-2.5">Plan Name</th>
                  <th className="pb-2.5">Duration</th>
                  <th className="pb-2.5">Expiry Date</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Payment Method</th>
                  <th className="pb-2.5">Tx ID</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1]/60">
                {historyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 font-mono text-stone-700">
                      {new Date(item.activatedAt || item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 font-bold text-[#2C3333]">
                      {item.planName}
                    </td>
                    <td className="py-3 text-stone-600">
                      {item.durationLabel}
                    </td>
                    <td className="py-3 font-mono text-stone-700">
                      {new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 font-serif font-bold text-emerald-800">
                      {item.amountPaid === 0 ? '₹0.00' : formatINR(item.amountPaid)}
                    </td>
                    <td className="py-3 text-stone-600 truncate max-w-[120px]">
                      {item.paymentMethod}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-stone-500">
                      {item.transactionId}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {item.paymentStatus === 'paid' ? 'Paid' : 'Free Trial'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(item)}
                        className="p-1.5 rounded-lg hover:bg-stone-200 text-[#4F6F52] cursor-pointer inline-flex items-center gap-1 font-semibold"
                        title="View Official Receipt"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. INTERACTIVE CHECKOUT & ACTIVATION MODAL */}
      {selectedPlanForCheckout && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          id="modal-subscription-checkout"
        >
          <div className="relative bg-white rounded-3xl border border-[#E8E6E1] shadow-2xl max-w-lg w-full overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-[#FAF9F6] p-5 sm:p-6 border-b border-[#E8E6E1] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4F6F52]/10 text-[#4F6F52] flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-[#2C3333]">
                    {selectedPlanForCheckout.isFree ? 'Activate Free Month Trial' : 'Confirm Subscription Plan'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {restaurant.name} • {selectedPlanForCheckout.durationLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForCheckout(null)}
                className="w-8 h-8 rounded-full border border-[#E8E6E1] bg-white hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-5">
              {checkoutSuccess ? (
                /* Success View */
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-serif text-[#2C3333]">
                      Subscription Successfully Activated!
                    </h4>
                    <p className="text-xs text-stone-600 mt-1">
                      {restaurant.name} is now active on <strong>{checkoutSuccess.planName}</strong>. All live table features and partner tools are unlocked.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Transaction ID:</span>
                      <span className="font-mono font-bold text-[#2C3333]">{checkoutSuccess.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Activation Date:</span>
                      <span className="font-mono text-[#2C3333]">
                        {new Date(checkoutSuccess.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Expiry Date (Calculated):</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {new Date(checkoutSuccess.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Valid Duration:</span>
                      <span className="font-bold text-[#2C3333]">{checkoutSuccess.daysRemaining} Days</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E8E6E1]">
                      <span className="text-stone-500">Amount Paid:</span>
                      <span className="font-bold text-emerald-700 font-serif">
                        {checkoutSuccess.amountPaid === 0 ? '₹0.00 (Free Trial)' : formatINR(checkoutSuccess.amountPaid)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPlanForCheckout(null)}
                    className="w-full py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Return to Partner Console
                  </button>
                </div>
              ) : (
                /* Checkout Form View */
                <>
                  {/* Order Summary Box */}
                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600">Selected Plan:</span>
                      <span className="font-bold text-[#2C3333]">{selectedPlanForCheckout.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600">Validity Period:</span>
                      <span className="font-bold text-[#2C3333]">{selectedPlanForCheckout.durationLabel}</span>
                    </div>
                    {selectedPlanForCheckout.regularPrice && !selectedPlanForCheckout.isFree && (
                      <div className="flex justify-between items-center text-stone-500">
                        <span>Standard Rate:</span>
                        <span className="line-through">₹{selectedPlanForCheckout.regularPrice}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-[#E8E6E1] text-sm">
                      <span className="font-bold text-[#2C3333]">Total Payable:</span>
                      <span className="font-extrabold font-serif text-emerald-700 text-lg">
                        {selectedPlanForCheckout.isFree ? '₹0 (FREE TRIAL)' : `₹${selectedPlanForCheckout.price}`}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector (if non-free) */}
                  {!selectedPlanForCheckout.isFree && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80">
                        Select Payment Method:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('upi')}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            paymentMethod === 'upi'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                              : 'border-[#E8E6E1] bg-white text-stone-600'
                          }`}
                        >
                          <QrCode className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
                          <span className="text-xs block">UPI / GPay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            paymentMethod === 'card'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                              : 'border-[#E8E6E1] bg-white text-stone-600'
                          }`}
                        >
                          <CreditCard className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
                          <span className="text-xs block">Credit Card</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('netbanking')}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            paymentMethod === 'netbanking'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                              : 'border-[#E8E6E1] bg-white text-stone-600'
                          }`}
                        >
                          <Building2 className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
                          <span className="text-xs block">NetBanking</span>
                        </button>
                      </div>

                      {paymentMethod === 'upi' && (
                        <div className="space-y-1">
                          <label className="text-[11px] text-stone-500 font-medium">Enter Virtual Payment Address (VPA / UPI ID):</label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="restaurant@okaxis"
                            className="w-full px-3.5 py-2 rounded-xl border border-[#E8E6E1] bg-white text-xs text-[#2C3333] focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                          />
                        </div>
                      )}

                      {paymentMethod === 'card' && (
                        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
                          <p className="font-semibold text-stone-800">Simulated Card Gateway</p>
                          <p className="text-[11px]">Instant settlement via secure partner card payment processing.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleConfirmActivation}
                    className="w-full py-3.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    id="btn-confirm-subscription"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>
                          {selectedPlanForCheckout.isFree 
                            ? 'Activate Free Month Now' 
                            : `Pay ₹${selectedPlanForCheckout.price} & Activate Subscription`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 7. RECEIPT / INVOICE MODAL */}
      {selectedReceipt && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in"
          id="modal-subscription-receipt"
        >
          <div className="relative bg-white rounded-3xl border border-[#E8E6E1] shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6E1]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#4F6F52]" />
                <h4 className="font-bold font-serif text-base text-[#2C3333]">
                  FlashTable Partner Invoice
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Invoice ID:</span>
                  <span className="font-mono font-bold text-[#2C3333]">{selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Restaurant:</span>
                  <span className="font-bold text-[#2C3333]">{restaurant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Plan:</span>
                  <span className="font-bold text-[#2C3333]">{selectedReceipt.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Duration:</span>
                  <span>{selectedReceipt.durationLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Valid Through:</span>
                  <span className="font-mono font-semibold">
                    {new Date(selectedReceipt.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Payment:</span>
                  <span>{selectedReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#E8E6E1] text-sm font-bold">
                  <span>Total Settled:</span>
                  <span className="text-emerald-700 font-serif">
                    {selectedReceipt.amountPaid === 0 ? '₹0.00 (Free)' : formatINR(selectedReceipt.amountPaid)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 text-center">
                FlashTable Technologies India Pvt. Ltd. • GST Registered
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
