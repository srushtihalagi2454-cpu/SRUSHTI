import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  Receipt, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Armchair, 
  Store, 
  User, 
  Lock,
  Phone,
  HelpCircle,
  Check,
  AlertCircle
} from 'lucide-react';
import { Reservation, CancellationRecord } from '../types';
import { prepareCancellationPlan, recordCancellationToStorage } from '../services/cancellationService';

interface CancellationPenaltyModalProps {
  reservation: Reservation;
  onClose: () => void;
  onConfirmCancellation: (cancellationRecord: CancellationRecord) => void;
  customerCareNumber?: string;
  userId?: string;
  allReservations?: Reservation[];
}

type PaymentMethodType = 'upi' | 'rupay' | 'netbanking';

export const CancellationPenaltyModal: React.FC<CancellationPenaltyModalProps> = ({
  reservation,
  onClose,
  onConfirmCancellation,
  customerCareNumber,
  userId,
  allReservations,
}) => {
  // Track live countdown for 3-minute grace window if applicable
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine cancellation policy:
  // 1) Free if within 3 minutes of booking
  // 2) 1st cancellation free
  // 3) 2nd+ cancellation after 3 minutes charges ₹100 penalty
  const plan = prepareCancellationPlan(
    userId || reservation.userId,
    reservation.customerPhone,
    allReservations,
    reservation.createdAt
  );

  // Recalculate seconds remaining in real time
  const createdMs = reservation.createdAt ? new Date(reservation.createdAt).getTime() : NaN;
  const isWithinGrace3Mins = !isNaN(createdMs)
    ? Math.max(0, (3 * 60 * 1000) - (nowTimestamp - createdMs)) > 0
    : plan.isWithin3Minutes;

  const secondsRemaining = !isNaN(createdMs)
    ? Math.max(0, Math.floor(((3 * 60 * 1000) - (nowTimestamp - createdMs)) / 1000))
    : plan.secondsRemainingInGrace;

  const isFreeCancellation = isWithinGrace3Mins || plan.isFirstCancellation;
  const cancellationAttemptCount = plan.attemptNumber;

  // Step 1: 'notice' (Review policy, acknowledge terms)
  // Step 2: 'payment' (Process ₹100 penalty fee - only for 2nd and subsequent cancellations after 3 mins)
  // Step 3: 'success' (Cancellation completed with audit record and warning banner)
  const [step, setStep] = useState<'notice' | 'payment' | 'success'>('notice');

  // Second/subsequent cancellation acknowledgement checkbox
  const [acknowledgedPenalty, setAcknowledgedPenalty] = useState(false);

  // Payment form state
  const [method, setMethod] = useState<PaymentMethodType>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [upiId, setUpiId] = useState('diner@oksbi');
  const [rupayNumber, setRupayNumber] = useState('6071 8244 5590 1238');
  const [rupayExpiry, setRupayExpiry] = useState('11/28');
  const [rupayCvv, setRupayCvv] = useState('892');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<CancellationRecord | null>(null);

  const displayTimeIn = reservation.timeIn || (reservation.timeSlot?.includes('→') ? reservation.timeSlot.split('→')[0].trim() : reservation.timeSlot);
  const displayTimeOut = reservation.timeOut || (reservation.timeSlot?.includes('→') ? reservation.timeSlot.split('→')[1].trim() : 'Scheduled end');

  const effectiveCareNumber = customerCareNumber || reservation.restaurantCustomerCareNumber || '+91 98450 12260';

  // Handle Free Cancellation (either within 3 minutes of booking, OR customer's 1st cancellation)
  const handleConfirmFreeCancellation = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);

      const formattedDate = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });
      const txId = isWithinGrace3Mins
        ? `FT-3MIN-FREE-${Math.floor(100000 + Math.random() * 900000)}`
        : `FT-FREE-${Math.floor(100000 + Math.random() * 900000)}`;

      const cancellationCountNumber = isWithinGrace3Mins
        ? Math.max(1, cancellationAttemptCount)
        : 1;

      const recordNotes = isWithinGrace3Mins
        ? 'Cancelled within 3-minute grace window. Cancellation is free with ₹0 penalty.'
        : 'First cancellation exemption: 1st cancellation is free of charge (₹0 penalty). Warning displayed that future cancellations incur ₹100 penalty.';

      const record: CancellationRecord = {
        reservationId: reservation.id,
        userId: userId || reservation.userId,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerEmail: reservation.customerEmail,
        restaurantId: reservation.restaurantId,
        restaurantName: reservation.restaurantName,
        restaurantAddress: reservation.restaurantAddress,
        restaurantCustomerCareNumber: effectiveCareNumber,
        bookingDate: reservation.date,
        timeIn: displayTimeIn,
        timeOut: displayTimeOut,
        tableNumber: reservation.tableNumber,
        cancellationDate: `${formattedDate} IST`,
        cancellationCount: cancellationCountNumber,
        penaltyAmount: 0, // ₹0 penalty
        cancellationPenalty: 0,
        penaltyApplicability: isWithinGrace3Mins ? 'none_first_cancellation' : 'none_first_cancellation',
        paymentStatus: 'waived',
        cancellationStatus: 'cancelled',
        penaltyStatus: 'waived',
        paymentMethod: isWithinGrace3Mins ? 'Free (3-Minute Grace Window)' : 'Free (First Cancellation Exemption)',
        transactionId: txId,
        notes: recordNotes,
      };

      recordCancellationToStorage(record);
      setCompletedRecord(record);
      setStep('success');
      onConfirmCancellation(record);
    }, 400);
  };

  // Handle Second and Subsequent Cancellations (Process ₹100 penalty fee via payment gateway)
  const handleProcessPenaltyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);

      let methodLabel = 'UPI (Google Pay)';
      if (method === 'upi') {
        const appNames: Record<string, string> = {
          gpay: 'Google Pay',
          phonepe: 'PhonePe',
          paytm: 'Paytm',
          bhim: 'BHIM UPI',
        };
        methodLabel = `UPI (${appNames[selectedUpiApp] || 'Instant'}) - ${upiId}`;
      } else if (method === 'rupay') {
        methodLabel = `RuPay Debit Card •••• ${rupayNumber.slice(-4)}`;
      } else {
        methodLabel = `Net Banking (${selectedBank})`;
      }

      const txId = `FT-PEN-${Math.floor(100000 + Math.random() * 900000)}`;
      const formattedDate = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });

      const record: CancellationRecord = {
        reservationId: reservation.id,
        userId: userId || reservation.userId,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerEmail: reservation.customerEmail,
        restaurantId: reservation.restaurantId,
        restaurantName: reservation.restaurantName,
        restaurantAddress: reservation.restaurantAddress,
        restaurantCustomerCareNumber: effectiveCareNumber,
        bookingDate: reservation.date,
        timeIn: displayTimeIn,
        timeOut: displayTimeOut,
        tableNumber: reservation.tableNumber,
        cancellationDate: `${formattedDate} IST`,
        cancellationCount: cancellationAttemptCount,
        penaltyAmount: 100, // ₹100 penalty for second and subsequent cancellations
        cancellationPenalty: 100,
        penaltyApplicability: 'applicable',
        paymentStatus: 'paid',
        cancellationStatus: 'cancelled',
        penaltyStatus: 'paid',
        paymentMethod: methodLabel,
        transactionId: txId,
        notes: `Cancellation #${cancellationAttemptCount}: ₹100 penalty paid via ${methodLabel}.`,
      };

      recordCancellationToStorage(record);
      setCompletedRecord(record);
      setStep('success');
      onConfirmCancellation(record);
    }, 900);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl border border-[#E8E6E1] shadow-2xl p-6 sm:p-7 space-y-5 my-auto text-[#2C3333]"
        onClick={(e) => e.stopPropagation()}
        id="cancellation-penalty-modal"
      >
        {/* STEP 1: NOTICE & CONFIRMATION */}
        {step === 'notice' && (
          <div className="space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isFreeCancellation
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border border-amber-200 text-amber-600'
                }`}>
                  {isFreeCancellation ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isWithinGrace3Mins
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : plan.isFirstCancellation
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}>
                    {isWithinGrace3Mins
                      ? `Within 3 Mins Window (${secondsRemaining}s left) • Free (₹0)`
                      : plan.isFirstCancellation
                        ? '1st Cancellation • Free (₹0 Penalty)'
                        : `Cancellation #${cancellationAttemptCount} • ₹100 Penalty Applies`}
                  </div>
                  <h3 className="text-xl font-bold font-serif text-[#2C3333] mt-0.5">
                    Cancel Table Reservation
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-center text-[#2C3333]/60 hover:text-[#2C3333] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Case 1: Cancelled within 3 minutes grace window */}
            {isWithinGrace3Mins ? (
              <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Within 3 Minutes of Booking: Free Cancellation
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-white/90 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                    Fee: ₹0.00
                  </span>
                </div>
                <p className="text-xs text-[#2C3333]/80 leading-relaxed">
                  You can cancel your booked table <strong className="text-emerald-950 font-bold">within 3 minutes of booking</strong> with <strong className="text-emerald-800">no penalty</strong>! If not cancelled within 3 minutes, penalties apply (1st cancellation is free, and from 2nd cancellation ₹100 will be taken).
                </p>
                <div className="flex items-center justify-between bg-white/80 border border-emerald-200 rounded-xl px-3 py-2 text-xs">
                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Time remaining in 3-min free window:
                  </span>
                  <span className="font-mono font-bold text-emerald-950 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>
            ) : plan.isFirstCancellation ? (
              /* Case 2: 1st Cancellation is Free */
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    1st Cancellation: Free (₹0 Penalty)
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-white/90 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                    Fee: ₹0.00
                  </span>
                </div>
                <p className="text-xs text-[#2C3333]/80 leading-relaxed">
                  As this is your <strong className="text-emerald-900 font-bold">1st cancellation</strong> on FlashTable, you can cancel <strong className="text-[#2C3333]">Table {reservation.tableNumber}</strong> at <strong className="text-[#2C3333]">{reservation.restaurantName}</strong> <span className="font-semibold text-emerald-800">completely free of charge</span>! The table will be immediately freed.
                </p>
                <div className="pt-1.5 border-t border-emerald-200/80 flex items-start gap-1.5 text-[11px] text-amber-900 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/70">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold">Cancellation Policy Notice:</strong> 1st cancellation is free. From your 2nd cancellation onward, a <strong className="font-bold text-rose-700">₹100 penalty fee</strong> will be charged if not cancelled within 3 minutes of booking.
                  </span>
                </div>
              </div>
            ) : (
              /* Case 3: 2nd and Subsequent Cancellations (> 3 mins) */
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-rose-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ₹100 Penalty Applies (Past 3 Mins & 2nd+ Cancel)
                  </span>
                  <span className="text-xs font-bold text-rose-700 bg-white px-2.5 py-0.5 rounded-full border border-rose-300 font-mono">
                    Penalty: ₹100.00
                  </span>
                </div>
                <p className="text-xs text-[#2C3333]/80 leading-relaxed">
                  Your 3-minute grace window has expired and this is your <strong className="font-bold text-[#2C3333]">Cancellation #{cancellationAttemptCount}</strong> (1st cancellation was free). In accordance with policy, <span className="font-bold text-rose-700">₹100 penalty will be taken</span> to complete this cancellation and release your table.
                </p>
                <p className="text-[11px] text-[#2C3333]/70">
                  Your payment will be processed securely through the integrated gateway. Your table will be released only after successful payment.
                </p>
              </div>
            )}

            {/* Reservation Details Summary */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-2.5 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/50 pb-1 border-b border-[#E8E6E1]">
                Reservation Details
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[#2C3333]/60 block text-[11px]">Reservation Ref:</span>
                  <span className="font-mono font-bold text-[#2C3333]">{reservation.bookingRef || reservation.id}</span>
                </div>
                <div>
                  <span className="text-[#2C3333]/60 block text-[11px]">Customer:</span>
                  <span className="font-semibold text-[#2C3333]">{reservation.customerName}</span>
                </div>
                <div>
                  <span className="text-[#2C3333]/60 block text-[11px]">Restaurant:</span>
                  <span className="font-semibold text-[#2C3333]">{reservation.restaurantName}</span>
                </div>
                <div>
                  <span className="text-[#2C3333]/60 block text-[11px]">Table:</span>
                  <span className="font-semibold text-[#4F6F52]">Table {reservation.tableNumber} ({reservation.section})</span>
                </div>
                <div>
                  <span className="text-[#2C3333]/60 block text-[11px]">Booking Date:</span>
                  <span className="font-semibold text-[#2C3333]">{reservation.date}</span>
                </div>
                <div>
                  <span className="text-[#2C3333]/60 block text-[11px]">Time Window:</span>
                  <span className="font-semibold text-[#2C3333] font-mono">{displayTimeIn} → {displayTimeOut}</span>
                </div>
              </div>

              {effectiveCareNumber && (
                <div className="pt-2 border-t border-[#E8E6E1] flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] text-[#2C3333]/60">Questions regarding your table?</span>
                  <a 
                    href={`tel:${effectiveCareNumber}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F6F52] hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Customer Care: {effectiveCareNumber}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Mandatory Acknowledgement Checkbox for 2nd+ Cancellations after 3 mins */}
            {!isFreeCancellation && (
              <label className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledgedPenalty}
                  onChange={(e) => setAcknowledgedPenalty(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                  id="chk-acknowledge-penalty"
                />
                <span className="text-xs text-[#2C3333] leading-relaxed">
                  <strong className="font-bold text-rose-900 block">Confirm & Acknowledge Penalty:</strong>
                  I acknowledge that after 3 mins and from 2nd cancellation, a <span className="font-bold text-rose-700">₹100 penalty will be taken</span> to cancel this table, and agree to settle this fee via the payment gateway.
                </span>
              </label>
            )}

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-full border border-[#E8E6E1] hover:bg-[#FAF9F6] text-xs font-bold uppercase tracking-wider text-[#2C3333] transition-colors cursor-pointer text-center"
                id="btn-keep-table"
              >
                Keep Table (Don't Cancel)
              </button>

              {isFreeCancellation ? (
                <button
                  type="button"
                  onClick={handleConfirmFreeCancellation}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm text-center flex items-center justify-center gap-2 disabled:opacity-50"
                  id="btn-confirm-free-cancellation"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Cancellation (Free — ₹0)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep('payment')}
                  disabled={!acknowledgedPenalty}
                  className={`w-full py-3 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm text-center flex items-center justify-center gap-2 ${
                    acknowledgedPenalty
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                  id="btn-proceed-cancel-penalty"
                >
                  <span>Acknowledge & Pay ₹100</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: INTEGRATED PAYMENT GATEWAY FOR ₹100 PENALTY (2ND+ CANCELLATIONS) */}
        {step === 'payment' && (
          <form onSubmit={handleProcessPenaltyPayment} className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Step 2 of 2: Payment Process
                </span>
                <h3 className="text-xl font-bold font-serif text-[#2C3333] mt-1">
                  Pay ₹100 Cancellation Penalty
                </h3>
                <p className="text-xs text-[#2C3333]/70 mt-0.5">
                  Cancellation #{cancellationAttemptCount} for Table {reservation.tableNumber} at {reservation.restaurantName}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep('notice')}
                className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-center text-[#2C3333]/60 hover:text-[#2C3333] transition-colors cursor-pointer"
                title="Back to Notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/60 block">
                  Penalty Amount (INR)
                </span>
                <span className="text-2xl font-bold font-serif text-[#2C3333]">
                  ₹100.00
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Encrypted 256-bit
                </span>
                <span className="text-[11px] text-[#2C3333]/60 block mt-1">
                  Ref: {reservation.bookingRef}
                </span>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  method === 'upi'
                    ? 'border-[#4F6F52] bg-[#4F6F5214] text-[#4F6F52] shadow-xs'
                    : 'border-[#E8E6E1] bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70'
                }`}
                id="penalty-pay-upi"
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI Fast</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('rupay')}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  method === 'rupay'
                    ? 'border-[#4F6F52] bg-[#4F6F5214] text-[#4F6F52] shadow-xs'
                    : 'border-[#E8E6E1] bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70'
                }`}
                id="penalty-pay-rupay"
              >
                <CreditCard className="w-4 h-4" />
                <span>RuPay / Card</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('netbanking')}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  method === 'netbanking'
                    ? 'border-[#4F6F52] bg-[#4F6F5214] text-[#4F6F52] shadow-xs'
                    : 'border-[#E8E6E1] bg-white hover:bg-[#FAF9F6] text-[#2C3333]/70'
                }`}
                id="penalty-pay-netbanking"
              >
                <Building2 className="w-4 h-4" />
                <span>Net Banking</span>
              </button>
            </div>

            {/* Dynamic Method Details */}
            {method === 'upi' && (
              <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
                <span className="text-[11px] font-bold text-[#2C3333] block">Select UPI App:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'gpay', label: 'GPay' },
                    { id: 'phonepe', label: 'PhonePe' },
                    { id: 'paytm', label: 'Paytm' },
                    { id: 'bhim', label: 'BHIM' },
                  ].map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedUpiApp(app.id as any)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedUpiApp === app.id
                          ? 'bg-[#2C3333] text-white border-[#2C3333]'
                          : 'bg-white border-[#E8E6E1] text-[#2C3333]/80 hover:bg-[#FAF9F6]'
                      }`}
                    >
                      {app.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label htmlFor="upi-vpa-input" className="block text-[11px] font-semibold text-[#2C3333]/70 mb-1">
                    Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <input
                    id="upi-vpa-input"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                    placeholder="username@okhdfcbank"
                    className="w-full px-3 py-2 text-xs font-medium text-[#2C3333] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                  />
                </div>
              </div>
            )}

            {method === 'rupay' && (
              <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
                <div>
                  <label htmlFor="rupay-card-number-input" className="block text-[11px] font-semibold text-[#2C3333]/70 mb-1">
                    Card Number (RuPay / Debit / Credit)
                  </label>
                  <input
                    id="rupay-card-number-input"
                    type="text"
                    value={rupayNumber}
                    onChange={(e) => setRupayNumber(e.target.value)}
                    required
                    placeholder="6071 8244 5590 1238"
                    className="w-full px-3 py-2 text-xs font-mono font-medium text-[#2C3333] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rupay-card-expiry-input" className="block text-[11px] font-semibold text-[#2C3333]/70 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      id="rupay-card-expiry-input"
                      type="text"
                      value={rupayExpiry}
                      onChange={(e) => setRupayExpiry(e.target.value)}
                      required
                      placeholder="11/28"
                      className="w-full px-3 py-2 text-xs font-mono font-medium text-[#2C3333] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                    />
                  </div>
                  <div>
                    <label htmlFor="rupay-card-cvv-input" className="block text-[11px] font-semibold text-[#2C3333]/70 mb-1">
                      CVV
                    </label>
                    <input
                      id="rupay-card-cvv-input"
                      type="password"
                      maxLength={3}
                      value={rupayCvv}
                      onChange={(e) => setRupayCvv(e.target.value)}
                      required
                      placeholder="•••"
                      className="w-full px-3 py-2 text-xs font-mono font-medium text-[#2C3333] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
                <label htmlFor="bank-selector" className="block text-[11px] font-semibold text-[#2C3333]/70">
                  Select Bank:
                </label>
                <select
                  id="bank-selector"
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-[#2C3333] bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] cursor-pointer"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Canara Bank">Canara Bank</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep('notice')}
                disabled={isProcessing}
                className="py-3 px-4 rounded-full border border-[#E8E6E1] hover:bg-[#FAF9F6] text-xs font-bold uppercase tracking-wider text-[#2C3333] transition-colors cursor-pointer text-center disabled:opacity-50"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isProcessing}
                className="py-3 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm text-center flex items-center justify-center gap-2 disabled:opacity-50"
                id="btn-pay-penalty-submit"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing ₹100...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pay ₹100 & Cancel</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS & CANCELLATION SUMMARY / RECEIPT */}
        {step === 'success' && completedRecord && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold font-serif text-[#2C3333]">
                Reservation Cancelled
              </h3>
              <p className="text-xs text-[#2C3333]/70 max-w-sm mx-auto">
                Your reservation for <strong className="font-semibold text-[#2C3333]">Table {completedRecord.tableNumber}</strong> at {completedRecord.restaurantName} has been cancelled and the table is freed.
              </p>
            </div>

            {/* CRITICAL REQUIREMENT FOR 1ST CANCELLATION:
                "After the cancellation is completed, display a warning informing the customer that any future cancellation will have a ₹100 penalty." */}
            {completedRecord.cancellationCount === 1 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2" id="first-cancellation-future-warning">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Important Future Cancellation Warning
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-amber-900 font-medium">
                  This was your <strong className="font-bold underline">1st cancellation</strong> and was processed <strong className="text-emerald-800 font-bold">without any penalty (₹0 fee)</strong>.
                </p>
                <div className="p-2.5 rounded-xl bg-white/90 border border-amber-300 text-xs font-semibold text-rose-700">
                  ⚠️ Notice: Any future cancellation will have a ₹100 penalty.
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  ₹100 cancellation penalty has been confirmed and paid via {completedRecord.paymentMethod}.
                </span>
              </div>
            )}

            {/* Official Cancellation Record Audit Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E6E1]">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#4F6F52]" />
                  <span className="font-bold text-[#2C3333] uppercase tracking-wider text-[11px]">
                    Cancellation Audit Record
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  completedRecord.penaltyAmount === 0
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-rose-800 bg-rose-50 border-rose-200'
                }`}>
                  {completedRecord.penaltyAmount === 0 ? 'Fee Waived (₹0)' : 'Paid ₹100 Penalty'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Reservation ID:</span>
                  <span className="font-mono font-bold text-[#2C3333]">{completedRecord.reservationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Cancellation Count:</span>
                  <span className="font-semibold text-[#2C3333]">
                    {completedRecord.cancellationCount === 1 ? '1st Cancellation (First-Time Grace)' : `Cancellation #${completedRecord.cancellationCount}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Customer:</span>
                  <span className="font-semibold text-[#2C3333]">{completedRecord.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Restaurant:</span>
                  <span className="font-semibold text-[#2C3333]">{completedRecord.restaurantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Booking Date & Window:</span>
                  <span className="font-semibold text-[#2C3333] font-mono">{completedRecord.bookingDate} ({completedRecord.timeIn} → {completedRecord.timeOut})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Cancellation Date / Time:</span>
                  <span className="font-semibold text-[#2C3333]">{completedRecord.cancellationDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Penalty Amount:</span>
                  <span className={`font-bold font-mono ${completedRecord.penaltyAmount === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₹{completedRecord.penaltyAmount}.00 {completedRecord.penaltyAmount === 0 ? '(Waived)' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Penalty Applicability:</span>
                  <span className="font-semibold text-[#2C3333]">
                    {completedRecord.penaltyApplicability === 'none_first_cancellation' ? 'First-Time Grace Exemption' : 'Applicable (Standard ₹100)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2C3333]/60">Payment Status:</span>
                  <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-800">
                    {completedRecord.paymentStatus} {completedRecord.paymentMethod ? `(${completedRecord.paymentMethod})` : ''}
                  </span>
                </div>
                {completedRecord.transactionId && (
                  <div className="flex justify-between pt-1 border-t border-[#E8E6E1]">
                    <span className="text-[#2C3333]/60">Transaction Reference:</span>
                    <span className="font-mono text-[11px] font-bold text-[#4F6F52]">{completedRecord.transactionId}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center shadow-xs"
              id="btn-close-cancellation-receipt"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
