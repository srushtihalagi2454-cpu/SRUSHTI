import React, { useState } from 'react';
import { 
  X, 
  BellRing, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Users, 
  Armchair, 
  Sparkles,
  Phone,
  Mail
} from 'lucide-react';
import { Restaurant, NotifyRequest } from '../types';
import { createNotifyMeOnBackend } from '../services/notifyService';
import { formatTimeIST } from '../utils/dateTime';
import { getStoredSession } from '../services/authService';

interface NotifyMeModalProps {
  restaurant: Restaurant | null;
  date: string;
  timeSlot: string;
  guests: number;
  preference: string;
  onClose: () => void;
  onSubmitNotify: (req: NotifyRequest) => void;
  userId?: string;
}

export const NotifyMeModal: React.FC<NotifyMeModalProps> = ({
  restaurant,
  date,
  timeSlot,
  guests,
  preference,
  onClose,
  onSubmitNotify,
  userId,
}) => {
  const session = getStoredSession();
  const [phone, setPhone] = useState(session?.phone || session?.mobile || '');
  const [email, setEmail] = useState(session?.email || '');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedNotifyId, setConfirmedNotifyId] = useState<string | null>(null);

  if (!restaurant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const activeUserId = userId || session?.userId || '';

    try {
      const res = await createNotifyMeOnBackend({
        userId: activeUserId,
        restaurantId: restaurant.id,
        date,
        time: timeSlot,
        guests,
        preferences: preference,
      });

      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.message || 'Failed to record table vacancy notification.');
        return;
      }

      const generatedId = res.notifyId || `NOTIFY-${Date.now()}`;
      setConfirmedNotifyId(generatedId);

      const newReq: NotifyRequest = {
        id: generatedId,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        date,
        timeSlot,
        guests,
        seatingPreference: preference,
        phone,
        email,
        createdAt: formatTimeIST(new Date()),
        status: 'active',
      };
      onSubmitNotify(newReq);
      setIsSubmitted(true);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Unable to register table alert at this time. Please try again.');
    }
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

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center shrink-0 border border-[#4F6F52]/20">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Table Vacancy Alert
                </h3>
                <p className="text-xs text-[#2C3333]/60">
                  {restaurant.name} • {restaurant.neighborhood}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#2C3333]/70 leading-relaxed">
              No endless waiting in line. If another guest cancels or an earlier table clears out, we’ll instantly send you an SMS alert with a 5-minute priority booking link.
            </p>

            {/* Parameter badges */}
            <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] grid grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-[#2C3333]/70">
                <Calendar className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span className="font-semibold text-[#2C3333]">{date}</span>
              </div>
              <div className="flex items-center gap-2 text-[#2C3333]/70">
                <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span className="font-semibold text-[#2C3333]">{timeSlot}</span>
              </div>
              <div className="flex items-center gap-2 text-[#2C3333]/70">
                <Users className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span>{guests} Guests</span>
              </div>
              <div className="flex items-center gap-2 text-[#2C3333]/70">
                <Armchair className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span className="capitalize">{preference || 'Any Seating'}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/70 block mb-1.5">
                Indian Mobile (+91)
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/70 block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
              />
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Setting Alert...</span>
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4" />
                  <span>Set Table Vacancy Alert</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-4 space-y-3.5">
            <div className="w-12 h-12 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center mx-auto border border-[#4F6F52]/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold font-serif text-[#2C3333]">
              Notification Alert Active
            </h4>
            <p className="text-xs text-[#2C3333]/70 leading-relaxed">
              We have set an active watcher for <strong>{guests} guests</strong> at <strong>{restaurant.name}</strong> on <strong>{date} ({timeSlot})</strong>.
            </p>
            <p className="text-[11px] text-[#2C3333]/50">
              You will receive an immediate SMS on {phone} as soon as a suitable table opens.
            </p>
            {confirmedNotifyId && (
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono text-emerald-800">
                Registered Ref: {confirmedNotifyId}
              </div>
            )}
            <button
              onClick={onClose}
              className="mt-3 px-6 py-2.5 rounded-full bg-[#FAF9F6] hover:bg-[#F2EFE9] text-[#2C3333] text-xs font-bold uppercase tracking-widest border border-[#E8E6E1] cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
