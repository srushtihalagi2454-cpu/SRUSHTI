import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Shield, 
  CheckCircle2, 
  Clock, 
  Phone, 
  User, 
  Heart, 
  Send, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Lock, 
  MessageSquare, 
  Radio,
  ExternalLink,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Reservation, SoloDinerSafetyContact, SoloSafetyNotifyMethod } from '../types';
import { 
  formatIndianPhone, 
  formatSafetyMessage, 
  saveSoloSafety, 
  dispatchSoloSafetyNotification 
} from '../services/soloSafetyService';

interface SoloSafetyModalProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onUpdateReservationSafety?: (updatedReservation: Reservation) => void;
  onToast?: (message: string) => void;
}

export const SoloSafetyModal: React.FC<SoloSafetyModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onUpdateReservationSafety,
  onToast,
}) => {
  const existingSafety = reservation.soloDinerSafety;

  const [isEnabled, setIsEnabled] = useState<boolean>(existingSafety?.enabled ?? true);
  const [contactName, setContactName] = useState<string>(existingSafety?.contactName || '');
  const [contactPhone, setContactPhone] = useState<string>(existingSafety?.contactPhone || '');
  const [relationship, setRelationship] = useState<string>(existingSafety?.relationship || 'Parent / Family');
  const [notifyMethod, setNotifyMethod] = useState<SoloSafetyNotifyMethod>(existingSafety?.notifyMethod || 'Both');
  const [customNote, setCustomNote] = useState<string>(existingSafety?.customNote || '');
  const [isEditing, setIsEditing] = useState<boolean>(!existingSafety?.enabled);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [justSimulated, setJustSimulated] = useState<boolean>(false);

  if (!isOpen) return null;

  const isCheckedIn = reservation.status === 'checked-in' || reservation.status === 'seated';
  const isNotified = existingSafety?.status === 'notified' || justSimulated;

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    const updatedContact: SoloDinerSafetyContact = {
      enabled: isEnabled,
      contactName: contactName.trim(),
      contactPhone: formatIndianPhone(contactPhone),
      relationship,
      notifyMethod,
      customNote: customNote.trim(),
      status: existingSafety?.status || 'pending',
      notifiedAt: existingSafety?.notifiedAt,
      notificationDispatchLog: existingSafety?.notificationDispatchLog,
    };

    saveSoloSafety(reservation.id, updatedContact);

    const updatedRes: Reservation = {
      ...reservation,
      soloDinerSafety: updatedContact,
    };

    if (onUpdateReservationSafety) {
      onUpdateReservationSafety(updatedRes);
    }

    setIsEditing(false);
    if (onToast) {
      onToast(`Solo Diner Safety contact updated for Table ${reservation.tableNumber}.`);
    }
  };

  const handleSimulateTestDispatch = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const result = dispatchSoloSafetyNotification(reservation, 'QR');
      setIsSimulating(false);
      setJustSimulated(true);

      if (result && onUpdateReservationSafety) {
        const updatedRes: Reservation = {
          ...reservation,
          soloDinerSafety: result.contact,
        };
        onUpdateReservationSafety(updatedRes);
      }

      if (onToast) {
        onToast(`Arrival alert dispatched to ${contactName || 'trusted contact'} via ${notifyMethod}!`);
      }
    }, 600);
  };

  const previewMessage = formatSafetyMessage({
    customerName: reservation.customerName || 'Diner',
    restaurantName: reservation.restaurantName,
    tableNumber: reservation.tableNumber,
    neighborhood: reservation.restaurantAddress?.includes('Indiranagar') ? 'Indiranagar' : 'Bengaluru',
    checkInTime: '07:35 PM IST',
    customNote: customNote || existingSafety?.customNote,
    notifyMethod,
  });

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF9F6] w-full max-w-4xl rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-[#E8E6E1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                  Solo Diner Safety Check-In
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Privacy First
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 mt-0.5">
                {reservation.restaurantName} • Table {reservation.tableNumber} • Ref: {reservation.bookingRef}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            id="close-solo-safety-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Privacy Guarantee Banner */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] shadow-2xs flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-[#2C3333]">
                Zero Continuous Tracking • 100% Privacy-Preserving
              </p>
              <p className="text-[#2C3333]/70 leading-relaxed">
                FlashTable does <span className="font-semibold text-[#2C3333]">not</span> track your route, broadcast your live coordinates, or drain your battery. Your trusted contact is notified <span className="font-semibold text-emerald-800">only once</span>, the exact moment your QR code is scanned at the host stand.
              </p>
            </div>
          </div>

          {/* Current Status Card */}
          {existingSafety && existingSafety.enabled && !isEditing ? (
            <div className="space-y-5">
              {/* Status Header Badge */}
              <div className={`p-5 rounded-2xl border ${
                isNotified 
                  ? 'bg-emerald-50/80 border-emerald-200' 
                  : 'bg-white border-[#E8E6E1]'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isNotified ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-[#2C3333]">
                        {isNotified 
                          ? 'Arrival Notification Dispatched' 
                          : 'Safety Armed • Awaiting Host QR Scan'}
                      </h4>
                      <p className="text-xs text-[#2C3333]/60">
                        {isNotified
                          ? `Delivered to ${existingSafety.contactName} via ${existingSafety.notifyMethod}`
                          : `Alert triggers automatically when you scan in at ${reservation.restaurantName}`}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    isNotified
                      ? 'bg-emerald-200/80 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {isNotified ? 'Verified Delivered' : 'Armed'}
                  </span>
                </div>

                {/* Details Table */}
                <div className="mt-4 pt-4 border-t border-[#E8E6E1] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#2C3333]/50 block">Trusted Contact</span>
                    <span className="font-bold text-[#2C3333]">{existingSafety.contactName}</span>
                    <span className="text-[10px] text-[#2C3333]/60 block">{existingSafety.relationship}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#2C3333]/50 block">Mobile Number</span>
                    <span className="font-mono font-semibold text-[#2C3333]">{existingSafety.contactPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#2C3333]/50 block">Dispatch Channel</span>
                    <span className="font-semibold text-[#4F6F52] flex items-center gap-1 mt-0.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {existingSafety.notifyMethod === 'Both' ? 'WhatsApp & SMS' : existingSafety.notifyMethod}
                    </span>
                  </div>
                </div>

                {existingSafety.customNote && (
                  <div className="mt-3 pt-3 border-t border-[#E8E6E1]/60 text-xs">
                    <span className="text-[10px] text-[#2C3333]/50 block">Attached Safety Note</span>
                    <p className="text-[#2C3333]/80 italic mt-0.5">"{existingSafety.customNote}"</p>
                  </div>
                )}
              </div>

              {/* Message Sent / Preview Box */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#2C3333] flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#4F6F52]" />
                    {isNotified ? 'Delivered Alert Message' : 'Live Alert Message Preview'}
                  </span>
                  <span className="text-[10px] text-[#2C3333]/50 font-mono">
                    Channel: {existingSafety.notifyMethod}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#2C3333]/5 border border-[#E8E6E1] text-xs font-mono text-[#2C3333] whitespace-pre-line leading-relaxed">
                  {existingSafety.notificationDispatchLog?.messageText || previewMessage}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white border border-[#E8E6E1] hover:border-[#4F6F52] text-xs font-semibold text-[#2C3333] transition-colors cursor-pointer"
                >
                  Edit Trusted Contact
                </button>

                {!isNotified && (
                  <button
                    type="button"
                    onClick={handleSimulateTestDispatch}
                    disabled={isSimulating}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSimulating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Alert...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Test Send Arrival Alert</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Editing / Adding Form */
            <form onSubmit={handleSaveContact} className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#E8E6E1]">
                <div>
                  <h4 className="text-sm font-bold text-[#2C3333]">
                    Enable Solo Diner Safety Check-In
                  </h4>
                  <p className="text-xs text-[#2C3333]/60">
                    Automatically text your trusted contact when your table QR code is verified.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E8E6E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F6F52]"></div>
                </label>
              </div>

              {isEnabled && (
                <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Contact Name */}
                    <div>
                      <label className="text-xs font-bold text-[#2C3333] block mb-1">
                        Trusted Contact Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Priya Sharma, Vikram, Mom"
                        className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
                      />
                    </div>

                    {/* Contact Mobile */}
                    <div>
                      <label className="text-xs font-bold text-[#2C3333] block mb-1">
                        Contact Mobile Number (+91) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 98450 12260"
                        className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
                      />
                    </div>
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="text-xs font-bold text-[#2C3333] block mb-1.5">
                      Relationship
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Parent / Family', 'Partner', 'Best Friend', 'Sibling', 'Colleague', 'Roommate'].map((rel) => (
                        <button
                          key={rel}
                          type="button"
                          onClick={() => setRelationship(rel)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            relationship === rel
                              ? 'bg-[#4F6F52] text-white'
                              : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:bg-[#E8E6E1] border border-[#E8E6E1]'
                          }`}
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notify Channel */}
                  <div>
                    <label className="text-xs font-bold text-[#2C3333] block mb-1.5">
                      Dispatch Channel
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Both', 'WhatsApp', 'SMS'] as SoloSafetyNotifyMethod[]).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setNotifyMethod(method)}
                          className={`py-2 px-3 rounded-2xl text-xs font-medium border text-center transition-colors cursor-pointer ${
                            notifyMethod === method
                              ? 'bg-[#4F6F521A] border-[#4F6F52] text-[#4F6F52] font-bold'
                              : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2C3333]/70 hover:bg-[#E8E6E1]'
                          }`}
                        >
                          {method === 'Both' ? 'WhatsApp & SMS' : method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Note */}
                  <div>
                    <label className="text-xs font-bold text-[#2C3333] block mb-1">
                      Custom Note to Contact (Optional)
                    </label>
                    <input
                      type="text"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="e.g. Having a quiet dinner, will text once finished by 10 PM!"
                      className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333]"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {existingSafety?.enabled && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#2C3333]/70 hover:text-[#2C3333] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                >
                  Save Safety Contact
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
