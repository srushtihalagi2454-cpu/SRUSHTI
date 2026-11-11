import React from 'react';
import { 
  X, 
  Armchair, 
  MapPin, 
  Clock, 
  QrCode, 
  Sparkles, 
  BellRing, 
  Radio, 
  ArrowRight,
  Check,
  AlertCircle
} from 'lucide-react';

interface HowItWorksViewProps {
  onClose?: () => void;
  onExploreClick: () => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ onClose, onExploreClick }) => {
  return (
    <div className="bg-[#FAF9F6] py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-8 border-b border-[#E8E6E1]">
        <div>
          <div className="inline-block px-3 py-1 bg-[#4F6F521A] text-[#4F6F52] text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm mb-2">
            The FlashTable Paradigm
          </div>
          <h2 className="text-3xl sm:text-4xl font-light text-[#2C3333] tracking-tight">
            How FlashTable Elevates Dining in India
          </h2>
          <p className="text-sm text-[#2C3333]/60 mt-1 max-w-2xl">
            Never be surprised by a random table assignment again. Know exactly where you sit, what your view is, and enjoy a seamless VIP arrival.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Comparison: Old Way vs FlashTable Way */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
        
        {/* Old Way */}
        <div className="p-8 rounded-3xl bg-white border border-[#E8E6E1] relative overflow-hidden shadow-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-900 text-[10px] font-bold uppercase tracking-widest mb-4">
            <AlertCircle className="w-3 h-3 text-amber-700" />
            <span>Traditional Booking Apps</span>
          </div>
          <h3 className="text-xl font-bold font-serif text-[#2C3333] mb-3">
            Generic Restaurant Reservation
          </h3>
          <ul className="space-y-3.5 text-xs text-[#2C3333]/70">
            <li className="flex items-start gap-2.5">
              <span className="text-red-500 font-bold mt-0.5">✕</span>
              <span>You reserve a slot, but have <strong>zero control</strong> over which table you are allocated.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-red-500 font-bold mt-0.5">✕</span>
              <span>High risk of being seated right next to kitchen doors, high-traffic corridors, or washroom passages.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-red-500 font-bold mt-0.5">✕</span>
              <span>Awkward negotiation with the host stand upon arrival during busy weekend hours.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-red-500 font-bold mt-0.5">✕</span>
              <span>No visibility into whether garden verandahs or cozy velvet booths are vacant.</span>
            </li>
          </ul>
        </div>

        {/* The FlashTable Way */}
        <div className="p-8 rounded-3xl bg-[#4F6F52]/5 border-2 border-[#4F6F52] relative overflow-hidden shadow-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F6F52] text-white text-[10px] font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-3 h-3" />
            <span>The FlashTable Difference</span>
          </div>
          <h3 className="text-xl font-bold font-serif text-[#2C3333] mb-3">
            Exact Table Self-Selection
          </h3>
          <ul className="space-y-3.5 text-xs text-[#2C3333]">
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#4F6F52] shrink-0 font-bold mt-0.5" />
              <span><strong>Interactive 2D Floor Plan:</strong> View the live layout of the restaurant with exact dimensions, seating styles, and window vistas.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#4F6F52] shrink-0 font-bold mt-0.5" />
              <span><strong>Smart Match Rule Engine:</strong> Instantly finds optimal tables matching your party size and preferred ambience (romantic booth, garden terrace, quiet alcove).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#4F6F52] shrink-0 font-bold mt-0.5" />
              <span><strong>Contactless QR Check-in:</strong> Instant digital confirmation pass that the staff scans directly at the host podium.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#4F6F52] shrink-0 font-bold mt-0.5" />
              <span><strong>Smart Arrival Geofencing:</strong> Proximity prompt opens your check-in code smoothly when you are near the venue.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* 4-Step Process Journey */}
      <div className="my-14">
        <h3 className="text-2xl font-light text-[#2C3333] tracking-tight text-center mb-8">
          Four Steps to Your Exact Table
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] text-center shadow-sm">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#4F6F52] text-white font-bold text-sm flex items-center justify-center mb-3">
              1
            </div>
            <h4 className="font-bold text-sm uppercase tracking-wide text-[#2C3333] mb-1">Discover & Slot</h4>
            <p className="text-xs text-[#2C3333]/60 leading-relaxed">
              Pick your preferred Bengaluru hotspot, date, time slot (IST), and party size.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] text-center shadow-sm">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#4F6F52] text-white font-bold text-sm flex items-center justify-center mb-3">
              2
            </div>
            <h4 className="font-bold text-sm uppercase tracking-wide text-[#2C3333] mb-1">2D Floor Plan</h4>
            <p className="text-xs text-[#2C3333]/60 leading-relaxed">
              Explore live table availability. Tap Table #05 (Booth) or Table #01 (Garden Verandah).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] text-center shadow-sm">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#4F6F52] text-white font-bold text-sm flex items-center justify-center mb-3">
              3
            </div>
            <h4 className="font-bold text-sm uppercase tracking-wide text-[#2C3333] mb-1">Lock & QR Pass</h4>
            <p className="text-xs text-[#2C3333]/60 leading-relaxed">
              Confirm your reservation. Your exact table is held securely with zero overlap.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] text-center shadow-sm">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#4F6F52] text-white font-bold text-sm flex items-center justify-center mb-3">
              4
            </div>
            <h4 className="font-bold text-sm uppercase tracking-wide text-[#2C3333] mb-1">Smart Arrival</h4>
            <p className="text-xs text-[#2C3333]/60 leading-relaxed">
              Walk in, show your QR pass at the entrance, and be escorted directly to your chosen table.
            </p>
          </div>

        </div>
      </div>

      {/* Action Footer */}
      <div className="text-center pt-4">
        <button
          onClick={onExploreClick}
          className="px-8 py-4 rounded-full bg-[#2C3333] hover:bg-black text-white font-bold uppercase tracking-widest text-xs transition-all shadow-sm inline-flex items-center gap-2.5 cursor-pointer"
        >
          <span>Explore Restaurants & Pick Your Table</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
