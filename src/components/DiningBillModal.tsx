import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  CheckCircle2, 
  Send, 
  Smartphone, 
  ArrowDownRight, 
  ShieldCheck, 
  Sparkles, 
  Share2, 
  Printer,
  Copy,
  Check,
  Timer
} from 'lucide-react';
import { Reservation, DiningBill } from '../types';
import { generateDiningBill } from '../data/restaurantMenus';
import { createBillOnBackend } from '../services/billService';
import { getDiningClockSession } from '../services/diningTimerService';

interface DiningBillModalProps {
  reservation: Reservation;
  isOpen?: boolean;
  onClose: () => void;
  onToast?: (message: string) => void;
  onMarkCompleted?: (reservationId: string) => void;
  isStaffView?: boolean;
  onSendBill?: (reservationId: string) => void;
}

export const DiningBillModal: React.FC<DiningBillModalProps> = ({
  reservation,
  isOpen = true,
  onClose,
  onToast,
  onMarkCompleted,
  isStaffView = false,
  onSendBill,
}) => {
  const [bill] = useState<DiningBill>(() => {
    return reservation.diningBill || generateDiningBill(reservation);
  });

  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSent, setSmsSent] = useState(Boolean(reservation.billSent));
  const [copiedLink, setCopiedLink] = useState(false);

  const [persistedBillId, setPersistedBillId] = useState<string | null>(() => {
    if (reservation.diningBill?.billNumber && reservation.diningBill.billNumber.startsWith('BILL-')) {
      return reservation.diningBill.billNumber;
    }
    return null;
  });
  const [persistedSuccess, setPersistedSuccess] = useState<boolean>(() => {
    return Boolean(reservation.diningBill?.billNumber && reservation.diningBill.billNumber.startsWith('BILL-'));
  });
  const [isPersistingBill, setIsPersistingBill] = useState(false);

  const foodAndBeverageTotal = bill.subtotal;
  // Reservation table booking deposit (defaults to ₹200 credited against the bill)
  const depositAmount = typeof reservation.depositAmount === 'number' && reservation.depositAmount > 0 
    ? reservation.depositAmount 
    : 200;
  const depositAdjustment = -depositAmount;
  // Calculate final amount after deducting the ₹200 table booking deposit
  const grossBillTotal = bill.grossTotal > 0 ? bill.grossTotal : (foodAndBeverageTotal + bill.gstAmount + bill.serviceCharge);
  const finalAmount = Math.max(0, grossBillTotal - depositAmount);

  useEffect(() => {
    if (reservation.billSent) {
      setSmsSent(true);
    }
  }, [reservation.billSent]);

  // Persist bill to Google Sheets Bills sheet if viewed by staff
  useEffect(() => {
    if (isStaffView && reservation && !persistedSuccess) {
      let isMounted = true;
      setIsPersistingBill(true);
      const resUserId = reservation.userId || '';

      createBillOnBackend({
        reservationId: reservation.id,
        userId: resUserId,
        restaurantId: reservation.restaurantId,
        foodAmount: foodAndBeverageTotal,
        depositAmount: depositAmount,
        depositAdjustment: depositAdjustment,
        finalAmount: finalAmount,
        sentToMobile: Boolean(reservation.billSent || smsSent),
      }).then((result) => {
        if (!isMounted) return;
        setIsPersistingBill(false);
        if (result.success) {
          setPersistedSuccess(true);
          if (result.billId) {
            setPersistedBillId(result.billId);
          }
        }
      }).catch(() => {
        if (isMounted) {
          setIsPersistingBill(false);
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [reservation.id, isStaffView, persistedSuccess, foodAndBeverageTotal, depositAmount, depositAdjustment, finalAmount]);

  if (isOpen === false) return null;

  const handleSendDigitalBill = async () => {
    setIsSendingSms(true);
    try {
      const resUserId = reservation.userId || 'USR-1788787060247';
      const result = await createBillOnBackend({
        reservationId: reservation.id,
        userId: resUserId,
        restaurantId: reservation.restaurantId,
        foodAmount: foodAndBeverageTotal,
        depositAmount: depositAmount,
        depositAdjustment: depositAdjustment,
        finalAmount: finalAmount,
        sentToMobile: true,
      });

      setIsSendingSms(false);

      if (!result.success) {
        if (onToast) {
          onToast(`Failed to record digital bill: ${result.message || 'Error'}`);
        }
        return;
      }

      setSmsSent(true);
      setPersistedSuccess(true);
      if (result.billId) {
        setPersistedBillId(result.billId);
      }
      if (onSendBill) {
        onSendBill(reservation.id);
      }
      const message = `Digital bill ${result.billId || bill.billNumber} sent to ${reservation.customerName}'s registered mobile number and saved to Google Sheets.`;
      if (onToast) {
        onToast(message);
      }
    } catch (err: any) {
      setIsSendingSms(false);
      if (onToast) {
        onToast(`Error sending bill: ${err?.message || 'Network error'}`);
      }
    }
  };

  const activeBillNumber = persistedBillId || bill.billNumber;
  const billUrl = `https://flashtable.app/receipt/${activeBillNumber}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard?.writeText(billUrl);
    } catch {
      // Fallback
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    if (onToast) {
      onToast('Receipt link copied to clipboard.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF9F6] w-full max-w-xl rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        id={`dining-bill-modal-${reservation.id}`}
      >
        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-[#E8E6E1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-serif text-[#2C3333]">
                  Final Dining Bill
                </h3>
                <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {persistedSuccess ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{persistedBillId ? `Bill Saved (${persistedBillId})` : 'Bill Saved (Final)'}</span>
                    </>
                  ) : isPersistingBill ? (
                    <span>Saving bill...</span>
                  ) : isStaffView ? (
                    'Staff Console'
                  ) : (
                    smsSent || reservation.billSent ? 'Digital Bill Sent' : 'Completed'
                  )}
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60">
                Deposit Adjustment Included • Table {bill.tableNumber} • Ref: {reservation.bookingRef}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            id="close-dining-bill-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Bill Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* Restaurant & Customer Meta Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-xs">
            <div className="flex items-start justify-between border-b border-[#E8E6E1] pb-3">
              <div>
                <h4 className="text-lg font-bold font-serif text-[#2C3333]">
                  {bill.restaurantName}
                </h4>
                <p className="text-xs text-[#2C3333]/60">
                  GSTIN: 29AABCT1334M1Z2 • FSSAI: 11223334000189
                </p>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="text-[10px] text-[#2C3333]/50 block">Bill Number</span>
                <span className="font-bold text-[#4F6F52]">{activeBillNumber}</span>
                {persistedSuccess && (
                  <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full inline-block mt-0.5">
                    Verified
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
              <div>
                <span className="text-[10px] text-[#2C3333]/50 block">Guest Name</span>
                <span className="font-bold text-[#2C3333] truncate block">{bill.customerName}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#2C3333]/50 block">Registered Mobile</span>
                <span className="font-medium text-[#2C3333]">{bill.customerPhone}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#2C3333]/50 block">Date & Time</span>
                <span className="font-medium text-[#2C3333]">{bill.date} • {bill.timeSlot}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#2C3333]/50 block">Table Locked</span>
                <span className="font-bold text-[#4F6F52]">Table {bill.tableNumber}</span>
              </div>
            </div>

            {/* Dining Clock In / Out & Duration Summary */}
            {(() => {
              const session = getDiningClockSession(reservation.id) || reservation.diningClockSession;
              if (!session || (!session.clockInDisplayTime && !session.durationFormatted)) return null;
              return (
                <div className="mt-3 pt-3 border-t border-[#E8E6E1]/70 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <Timer className="w-3.5 h-3.5 text-[#4F6F52]" />
                    <span className="font-semibold text-[#2C3333]">Dining Session:</span>
                    <span>{session.clockInDisplayTime} {session.clockOutDisplayTime ? `→ ${session.clockOutDisplayTime}` : '(Active)'}</span>
                  </div>
                  {session.durationFormatted && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                      <span>Total Duration:</span>
                      <strong className="text-emerald-950 font-mono">{session.durationFormatted}</strong>
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Itemized Order Table */}
          <div className="bg-white rounded-2xl border border-[#E8E6E1] overflow-hidden shadow-xs">
            <div className="bg-[#FAF9F6] px-4 py-2.5 border-b border-[#E8E6E1] text-[10px] font-bold uppercase tracking-wider text-[#2C3333]/60 grid grid-cols-12">
              <span className="col-span-7">Item Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-3 text-right">Amount (₹)</span>
            </div>

            <div className="divide-y divide-[#FAF9F6]">
              {bill.items.map((item, index) => (
                <div key={item.id || index} className="px-4 py-3 text-xs grid grid-cols-12 items-center">
                  <div className="col-span-7 pr-2 space-y-0.5">
                    <span className="font-semibold text-[#2C3333] block">{item.name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="text-[#2C3333]/50">₹{item.unitPrice} each</span>
                      {item.intendedFor && (
                        <span className="bg-[#FAF9F6] text-[#2C3333] px-1.5 py-0.2 rounded border border-[#E8E6E1] font-medium">
                          👤 {item.intendedFor}
                        </span>
                      )}
                      {item.dietaryTag && item.dietaryTag !== 'Standard' && (
                        <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
                          🌱 {item.dietaryTag}
                        </span>
                      )}
                      {Array.isArray(item.allergenTags) && item.allergenTags.length > 0 && (
                        <span className="bg-rose-50 text-rose-800 px-1.5 py-0.2 rounded font-bold border border-rose-200">
                          🚨 {item.allergenTags.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-center font-medium text-[#2C3333]">
                    {item.quantity}
                  </div>
                  <div className="col-span-3 text-right font-semibold text-[#2C3333]">
                    ₹{item.totalPrice}
                  </div>
                </div>
              ))}
            </div>

            {/* FINAL DINING BILL Summary Calculation */}
            <div className="bg-[#FAF9F6] p-5 border-t border-[#E8E6E1] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E8E6E1] pb-2.5">
                <span className="text-xs font-bold font-serif uppercase tracking-widest text-[#2C3333]">
                  FINAL DINING BILL
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6F52] bg-[#4F6F5214] px-2.5 py-0.5 rounded-full border border-[#4F6F52]/30">
                  Settled Post-Dining
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#2C3333]">
                  <span className="font-medium text-[#2C3333]/80">Food & Beverages Subtotal</span>
                  <span className="font-semibold text-sm">₹{foodAndBeverageTotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-[#2C3333]/70">
                  <span>Taxes (GST 5% + Service 5%)</span>
                  <span className="font-medium">₹{(bill.gstAmount + bill.serviceCharge).toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-[#2C3333] pt-1 border-t border-[#E8E6E1]/60">
                  <span className="font-semibold">Gross Bill Amount</span>
                  <span className="font-semibold text-sm">₹{grossBillTotal.toLocaleString()}</span>
                </div>

                {/* Minus 200 Rupees Table Booking Deposit */}
                <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Minus Table Booking Deposit</span>
                  </span>
                  <span className="text-sm font-mono text-emerald-700">-₹{depositAmount.toLocaleString()}</span>
                </div>

                <div className="pt-2 border-t-2 border-[#2C3333]/15 flex justify-between items-center text-sm font-bold text-[#2C3333]">
                  <div>
                    <span className="block">Total Payable Amount</span>
                    <span className="text-[10px] text-stone-500 font-normal block">(After minusing ₹{depositAmount} deposit)</span>
                  </div>
                  <span className="text-2xl font-bold font-serif text-[#2C3333]">
                    ₹{finalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Deposit Refunded/Adjusted Statement */}
              <div className="mt-3 p-3.5 bg-[#4F6F5214] border border-[#4F6F52]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#4F6F52]">
                <ShieldCheck className="w-4 h-4 text-[#4F6F52] shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  {depositAmount > 0
                    ? `Your ₹${depositAmount} reservation deposit has been credited/adjusted against your final dining bill.`
                    : 'Your table booking deposit has been credited against your final dining bill.'}
                </p>
              </div>
            </div>
          </div>

          {/* Conditional: Staff Console vs Customer View */}
          {isStaffView ? (
            /* RESTAURANT STAFF SIDE: Send Bill to Registered Mobile */
            <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-xs space-y-3" id="staff-send-bill-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#4F6F52]" />
                  <span className="text-xs font-bold text-[#2C3333]">Send Bill to Registered Mobile</span>
                </div>
                <span className="text-[11px] text-[#2C3333]/60 font-medium">
                  Staff Dispatch Console
                </span>
              </div>

              <p className="text-xs text-[#2C3333]/70">
                Customer: <strong className="text-[#2C3333]">{bill.customerName}</strong> • Registered Mobile: <strong className="text-[#2C3333]">{bill.customerPhone}</strong>
              </p>

              {/* Simulated Digital Bill Dispatch Notice */}
              {smsSent && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1 animate-in fade-in duration-200" id="sms-sent-confirmation">
                  <div className="flex items-center gap-2 font-bold text-[#4F6F52]">
                    <CheckCircle2 className="w-4 h-4 text-[#4F6F52] shrink-0" />
                    <span>Digital bill sent to {reservation.customerName}'s registered mobile number.</span>
                  </div>
                  <p className="text-[11px] text-[#2C3333]/70 pl-6">
                    {persistedSuccess
                      ? `Confirmed and persisted in Google Sheets Bills tab as ${activeBillNumber}. Digital invoice dispatched to registered number (${bill.customerPhone}).`
                      : `Digital invoice dispatched to diner's registered number (${bill.customerPhone}).`}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSendingSms}
                  onClick={handleSendDigitalBill}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  id="btn-send-digital-bill"
                >
                  {isSendingSms ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending to registered mobile number...</span>
                    </>
                  ) : smsSent ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Resend Bill to Registered Mobile</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Bill to Registered Mobile</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-4 rounded-full border border-[#E8E6E1] hover:bg-[#FAF9F6] text-[#2C3333] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4F6F52]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#2C3333]/70" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* CUSTOMER SIDE: View Only with Digital Bill Sent status */
            <div className="space-y-3" id="customer-bill-actions">
              {(smsSent || reservation.billSent) && (
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs flex items-center justify-between gap-3 text-xs" id="customer-bill-sent-status">
                  <div className="flex items-center gap-2.5 text-[#4F6F52]">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4F6F52]" />
                    <div>
                      <span className="font-bold text-[#2C3333] block">Digital bill sent</span>
                      <span className="text-[11px] text-[#2C3333]/60">Sent to your registered mobile number ({bill.customerPhone})</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                    Digital bill sent
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2 px-3.5 rounded-full border border-[#E8E6E1] bg-white hover:bg-[#FAF9F6] text-[#2C3333] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4F6F52]" />
                      <span>Receipt Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#2C3333]/70" />
                      <span>Copy Receipt Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-white p-4 border-t border-[#E8E6E1] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#2C3333]/50">
            GST compliant invoice • Advance deposit verified
          </span>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6E1] text-[#2C3333] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
