import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  Lock, 
  Info,
  Sparkles,
  Zap
} from 'lucide-react';
import { Restaurant, Table, PaymentDetails } from '../types';

interface DepositPaymentStepProps {
  restaurant: Restaurant;
  table?: Table;
  tableNumber?: string;
  guests: number;
  date: string;
  timeSlot: string;
  customerName: string;
  customerPhone?: string;
  depositAmount?: number;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onBack: () => void;
  onPaymentSuccess: (paymentDetails: PaymentDetails) => void;
}

type PaymentMethodType = 'upi' | 'rupay' | 'netbanking';

export const DepositPaymentStep: React.FC<DepositPaymentStepProps> = ({
  restaurant,
  table,
  tableNumber,
  guests,
  date,
  timeSlot,
  customerName,
  customerPhone = '',
  depositAmount = 200,
  isSubmitting = false,
  errorMessage = null,
  onBack,
  onPaymentSuccess,
}) => {
  const displayTableNumber = table?.tableNumber || tableNumber || 'T01';
  const [method, setMethod] = useState<PaymentMethodType>('upi');
  
  // Form values
  const [upiId, setUpiId] = useState('diner@oksbi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [rupayNumber, setRupayNumber] = useState('6071 8244 5590 1238');
  const [rupayExpiry, setRupayExpiry] = useState('11/28');
  const [rupayCvv, setRupayCvv] = useState('892');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      let methodLabel: 'UPI' | 'RuPay' | 'Net Banking' = 'UPI';
      let detail = 'UPI (Google Pay)';

      if (method === 'upi') {
        methodLabel = 'UPI';
        const appNames: Record<string, string> = {
          gpay: 'Google Pay',
          phonepe: 'PhonePe',
          paytm: 'Paytm',
          bhim: 'BHIM UPI',
        };
        detail = `UPI (${appNames[selectedUpiApp] || 'Instant'}) - ${upiId}`;
      } else if (method === 'rupay') {
        methodLabel = 'RuPay';
        detail = `RuPay Debit Card •••• ${rupayNumber.slice(-4)}`;
      } else {
        methodLabel = 'Net Banking';
        detail = `Net Banking (${selectedBank})`;
      }

      const txId = `FT-TXN-${Math.floor(100000 + Math.random() * 900000)}`;

      onPaymentSuccess({
        depositAmount,
        paymentStatus: 'paid',
        paymentMethod: methodLabel,
        paymentMethodDetail: detail,
        transactionId: txId,
        paidAt: `${date} ${timeSlot}`,
        isRefundable: true,
      });
    }, 950);
  };

  return (
    <form onSubmit={handleProcessPayment} className="p-5 sm:p-7 space-y-6 max-h-[85vh] overflow-y-auto">
      
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52] bg-[#4F6F521A] px-2.5 py-0.5 rounded-full border border-[#4F6F52]/20">
            Step 3: Table Booking Deposit
          </span>
          <span className="text-[10px] font-semibold text-[#2C3333]/50">
            100% Adjusted on Dining Bill
          </span>
        </div>
        <h3 className="text-2xl font-bold font-serif text-[#2C3333] mt-1">
          Lock Table {displayTableNumber} with ₹{depositAmount} Deposit
        </h3>
        <p className="text-xs text-[#2C3333]/70 mt-0.5">
          FlashTable guarantees your physical seat at {restaurant.name}. This nominal ₹{depositAmount} deposit secures your table booking and is deducted in full from your final restaurant bill.
        </p>
      </div>

      {/* Deposit Fee Breakdown Box */}
      <div className="p-5 rounded-2xl bg-white border border-[#E8E6E1] shadow-xs space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
              Reservation Guarantee Deposit
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold font-serif text-[#2C3333]">
                ₹{depositAmount}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                100% Adjusted on Dining Bill
              </span>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-[10px] text-[#2C3333]/50 block">Reservation Spec</span>
            <span className="font-semibold text-[#4F6F52]">
              Table {displayTableNumber} • {guests} Guests
            </span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-[#FAF9F6] text-xs text-[#2C3333]/70 space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Diner Name</span>
            <span className="font-medium text-[#2C3333]">{customerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Slot</span>
            <span className="font-medium text-[#2C3333]">{date} at {timeSlot} IST</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Adjustment Policy</span>
            <span className="text-[#4F6F52] font-semibold">Exact ₹{depositAmount} subtracted from table bill</span>
          </div>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-[#2C3333] block">
          Select Indian Payment Method
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* UPI */}
          <button
            type="button"
            onClick={() => setMethod('upi')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              method === 'upi'
                ? 'bg-[#4F6F5212] border-[#4F6F52] ring-1 ring-[#4F6F52]/20'
                : 'bg-white border-[#E8E6E1] hover:bg-[#FAF9F6]'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${method === 'upi' ? 'bg-[#4F6F52] text-white' : 'bg-[#FAF9F6] text-[#2C3333]/70'}`}>
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#2C3333] block">Instant UPI</span>
              <span className="text-[10px] text-[#2C3333]/60">GPay, PhonePe, Paytm</span>
            </div>
          </button>

          {/* RuPay Cards */}
          <button
            type="button"
            onClick={() => setMethod('rupay')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              method === 'rupay'
                ? 'bg-[#4F6F5212] border-[#4F6F52] ring-1 ring-[#4F6F52]/20'
                : 'bg-white border-[#E8E6E1] hover:bg-[#FAF9F6]'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${method === 'rupay' ? 'bg-[#4F6F52] text-white' : 'bg-[#FAF9F6] text-[#2C3333]/70'}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#2C3333] block">RuPay Card</span>
              <span className="text-[10px] text-[#2C3333]/60">Debit / Credit Cards</span>
            </div>
          </button>

          {/* Net Banking */}
          <button
            type="button"
            onClick={() => setMethod('netbanking')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              method === 'netbanking'
                ? 'bg-[#4F6F5212] border-[#4F6F52] ring-1 ring-[#4F6F52]/20'
                : 'bg-white border-[#E8E6E1] hover:bg-[#FAF9F6]'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${method === 'netbanking' ? 'bg-[#4F6F52] text-white' : 'bg-[#FAF9F6] text-[#2C3333]/70'}`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#2C3333] block">Net Banking</span>
              <span className="text-[10px] text-[#2C3333]/60">HDFC, SBI, ICICI</span>
            </div>
          </button>

        </div>
      </div>

      {/* Dynamic Payment Details Input */}
      <div className="p-5 rounded-2xl bg-white border border-[#E8E6E1] space-y-4 shadow-xs">
        {method === 'upi' && (
          <div className="space-y-3.5">
            <span className="text-xs font-bold text-[#2C3333] block">
              Fast UPI Checkout
            </span>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { id: 'gpay', label: 'Google Pay' },
                { id: 'phonepe', label: 'PhonePe' },
                { id: 'paytm', label: 'Paytm' },
                { id: 'bhim', label: 'BHIM UPI' },
              ].map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedUpiApp(app.id as any)}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                    selectedUpiApp === app.id
                      ? 'border-[#4F6F52] bg-[#4F6F521A] text-[#4F6F52] ring-1 ring-[#4F6F52]'
                      : 'border-[#E8E6E1] bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-white'
                  }`}
                >
                  {app.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#2C3333]/60 block mb-1">
                UPI ID / VPA
              </label>
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@bank"
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] font-mono text-[#2C3333]"
              />
            </div>
          </div>
        )}

        {method === 'rupay' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#2C3333] block">
              RuPay Card Credentials
            </span>

            <div>
              <label className="text-[11px] font-bold text-[#2C3333]/60 block mb-1">
                RuPay Card Number
              </label>
              <input
                type="text"
                required
                value={rupayNumber}
                onChange={(e) => setRupayNumber(e.target.value)}
                placeholder="6071 XXXX XXXX XXXX"
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] font-mono text-[#2C3333]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#2C3333]/60 block mb-1">
                  Valid Thru (MM/YY)
                </label>
                <input
                  type="text"
                  required
                  value={rupayExpiry}
                  onChange={(e) => setRupayExpiry(e.target.value)}
                  placeholder="12/28"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] font-mono text-[#2C3333]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2C3333]/60 block mb-1">
                  CVV
                </label>
                <input
                  type="password"
                  maxLength={3}
                  required
                  value={rupayCvv}
                  onChange={(e) => setRupayCvv(e.target.value)}
                  placeholder="•••"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] font-mono text-[#2C3333]"
                />
              </div>
            </div>
          </div>
        )}

        {method === 'netbanking' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#2C3333] block">
              Select Your Bank
            </span>

            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52] text-[#2C3333] cursor-pointer"
            >
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="State Bank of India">State Bank of India (SBI)</option>
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="Axis Bank">Axis Bank</option>
              <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
              <option value="Bank of Baroda">Bank of Baroda</option>
            </select>
          </div>
        )}

        {/* Security Assurance */}
        <div className="flex items-center gap-2 text-[11px] text-[#2C3333]/60 pt-2 border-t border-[#FAF9F6]">
          <Lock className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
          <span>256-Bit Encrypted Simulation • Instant refund on timely cancellations</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-700">
          <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900">Payment Failed</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Buttons: Back and Pay */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing || isSubmitting}
          className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 hover:text-[#2C3333] rounded-full border border-[#E8E6E1] bg-white cursor-pointer transition-colors disabled:opacity-50"
        >
          ← Back to Details
        </button>

        <button
          type="submit"
          disabled={isProcessing || isSubmitting}
          className="px-8 py-3.5 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white font-bold uppercase tracking-widest text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          id="btn-pay-deposit-confirm"
        >
          {isProcessing || isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying & Locking Table...</span>
            </>
          ) : (
            <>
              <span>Pay ₹{depositAmount} & Lock Table</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

    </form>
  );
};
