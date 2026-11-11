import React from 'react';
import { 
  Sparkles, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Maximize2, 
  Compass, 
  Zap, 
  MapPin, 
  Armchair, 
  ShieldCheck,
  Radio
} from 'lucide-react';
interface LandingHeroProps {
  onExploreClick: () => void;
  onHowItWorksClick: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedTime?: string;
  setSelectedTime?: (time: string) => void;
  timeIn?: string;
  setTimeIn?: (time: string) => void;
  timeOut?: string;
  setTimeOut?: (time: string) => void;
  guestCount: number;
  setGuestCount: (count: number) => void;
  selectedNeighborhood: string;
  setSelectedNeighborhood: (loc: string) => void;
  onQuickBookDemo: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onExploreClick,
  onHowItWorksClick,
  selectedDate,
  setSelectedDate,
  selectedTime = '7:30 PM',
  setSelectedTime,
  timeIn,
  setTimeIn,
  timeOut,
  setTimeOut,
  guestCount,
  setGuestCount,
  selectedNeighborhood,
  setSelectedNeighborhood,
  onQuickBookDemo,
}) => {
  const [localTimeIn, setLocalTimeIn] = React.useState(timeIn || '');
  const [localTimeOut, setLocalTimeOut] = React.useState(timeOut || '');

  const effectiveTimeIn = timeIn !== undefined ? timeIn : localTimeIn;
  const effectiveTimeOut = timeOut !== undefined ? timeOut : localTimeOut;
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-[#FAF9F6]">
      {/* Subtle warm decorative background elements */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full bg-[#4F6F52]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-[#E8E6E1]/50 blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top badge */}
        <div className="inline-block px-3.5 py-1.5 bg-[#4F6F521A] text-[#4F6F52] text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm mb-6">
          The Premium Dining Standard • Bengaluru, India
        </div>

        {/* Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.05] tracking-tight text-[#2C3333]">
                Your table.<br />
                Your time.<br />
                <span className="italic font-serif text-[#4F6F52]">Your choice.</span>
              </h1>
              <p className="text-base sm:text-lg text-[#2C3333]/70 font-normal leading-relaxed max-w-xl">
                Experience Bengaluru's first interactive reservation platform. Browse real-time floor plans and reserve the exact table you desire at India's finest establishments.
              </p>
            </div>

            {/* Core Differentiator Callout Box */}
            <div className="p-4 rounded-2xl bg-white/80 border border-[#E8E6E1] max-w-xl flex items-start gap-3.5 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#4F6F521A] flex items-center justify-center shrink-0 text-[#4F6F52]">
                <Armchair className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm text-[#2C3333]">
                <span className="font-bold text-[#2C3333]">Stop settling for host-assigned tables.</span>
                <p className="text-[#2C3333]/60 mt-0.5">
                  FlashTable gives you an interactive 2D blueprint of the restaurant so you can select Table #05 by the courtyard garden or Table #11 in the quiet velvet alcove before you arrive.
                </p>
              </div>
            </div>

            {/* Primary & Secondary Action Buttons */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <button
                onClick={onExploreClick}
                className="bg-[#2C3333] text-white px-8 py-4 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest hover:bg-black transition-all shadow-sm flex items-center gap-2.5 cursor-pointer group"
                id="hero-explore-cta-btn"
              >
                <span>Explore Restaurants</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onHowItWorksClick}
                className="text-[#2C3333] border-b-2 border-[#4F6F52] pb-1 text-xs sm:text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-all cursor-pointer"
                id="hero-how-it-works-cta-btn"
              >
                How FlashTable works
              </button>
            </div>

            {/* Micro Highlights */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-[#2C3333]/70">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4F6F52]" />
                <span className="font-medium">Zero waiting at the door</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4F6F52]" />
                <span className="font-medium">Exact 2D seat reservation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4F6F52]" />
                <span className="font-medium">Contactless QR Check-in</span>
              </div>
            </div>
          </div>

          {/* Right Visual Column — Interactive 2D Blueprint Preview with High-end Indian Dining Hero Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[36px] overflow-hidden shadow-2xl border border-[#E8E6E1] bg-[#E8E6E1] group">
              
              {/* Image Banner with overlay */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
                  alt="Saffron Courtyard Fine Dining, Bengaluru"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#4F6F52]/60 via-black/20 to-transparent" />
                
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
                    <MapPin className="w-3.5 h-3.5 text-[#E8F0EC]" />
                    Lavelle Road, Bengaluru
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-white/90 uppercase tracking-widest mb-0.5">Currently Featured</div>
                    <h3 className="text-white font-serif italic font-bold text-xl">Saffron Courtyard</h3>
                    <p className="text-white/80 text-xs">Royal Awadhi & Modern Indian • ₹2,800 for two</p>
                  </div>
                  <div className="h-10 w-10 bg-[#4F6F52] rounded-full flex items-center justify-center text-white shrink-0 shadow-md">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Live 2D Floor Plan Demo Widget */}
              <div className="p-5 bg-white border-t border-[#E8E6E1]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4F6F52] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4F6F52]"></span>
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#4F6F52]">
                      Live Floor Plan View
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#2C3333]/50 font-semibold">Tap to test table booking</span>
                </div>

                {/* Simulated mini floor map */}
                <div className="grid grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
                  {/* Table 1: Garden Window */}
                  <div 
                    onClick={onQuickBookDemo}
                    className="p-2 rounded-xl border-2 border-[#4F6F52] bg-[#4F6F521A] cursor-pointer text-center hover:scale-105 transition-all"
                  >
                    <div className="text-[11px] font-bold text-[#4F6F52]">T-01</div>
                    <div className="text-[9px] text-[#2C3333]/70">2 Seats</div>
                    <div className="mt-1 text-[8px] uppercase tracking-wider font-bold text-[#4F6F52] bg-white rounded px-1">
                      Available
                    </div>
                  </div>

                  {/* Table 2: Window Booth */}
                  <div 
                    onClick={onQuickBookDemo}
                    className="p-2 rounded-xl border-2 border-[#4F6F52] bg-[#4F6F52] text-white cursor-pointer text-center shadow-sm hover:scale-105 transition-all"
                  >
                    <div className="text-[11px] font-bold text-white">T-05</div>
                    <div className="text-[9px] text-white/80">4 Seats</div>
                    <div className="mt-1 text-[8px] uppercase tracking-wider font-bold text-[#4F6F52] bg-white rounded px-1">
                      Selected
                    </div>
                  </div>

                  {/* Table 3: Occupied */}
                  <div className="p-2 rounded-xl border border-dashed border-[#E8E6E1] bg-white text-center opacity-60">
                    <div className="text-[11px] font-bold text-[#2C3333]/60">T-08</div>
                    <div className="text-[9px] text-[#2C3333]/50">8 Seats</div>
                    <div className="mt-1 text-[8px] uppercase tracking-wider font-medium text-[#2C3333]/60 bg-[#E8E6E1] rounded px-1">
                      Occupied
                    </div>
                  </div>

                  {/* Table 4: Reserved */}
                  <div className="p-2 rounded-xl border border-[#E8E6E1] bg-white text-center opacity-70">
                    <div className="text-[11px] font-bold text-[#2C3333]/60">T-11</div>
                    <div className="text-[9px] text-[#2C3333]/50">4 Seats</div>
                    <div className="mt-1 text-[8px] uppercase tracking-wider font-medium text-amber-900 bg-amber-100/80 rounded px-1">
                      Reserved
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-[#2C3333]/80">
                    <Sparkles className="w-3.5 h-3.5 text-[#4F6F52]" />
                    <span className="font-medium text-[11px]">Smart Match: Table T-05 matches your party</span>
                  </div>
                  <button
                    onClick={onQuickBookDemo}
                    className="text-xs font-bold uppercase tracking-wider text-[#4F6F52] hover:underline cursor-pointer"
                  >
                    Select Table →
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Interactive Discovery Search Bar Strip */}
        <div className="mt-14 bg-white p-3 sm:p-5 rounded-3xl border border-[#E8E6E1] shadow-sm max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center">
            
            {/* Neighborhood */}
            <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#4F6F52]" /> Location
              </label>
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="w-full mt-1 bg-transparent text-xs font-semibold text-[#2C3333] outline-none cursor-pointer"
                id="search-strip-neighborhood"
              >
                <option value="All Bengaluru">All Bengaluru</option>
                <option value="Indiranagar">Indiranagar</option>
                <option value="Lavelle Road">Lavelle Road & UB City</option>
                <option value="Koramangala">Koramangala</option>
                <option value="Church Street">Church Street</option>
                <option value="Whitefield">Whitefield</option>
              </select>
            </div>

            {/* Date */}
            <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#4F6F52]" /> Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full mt-1 bg-transparent text-xs font-semibold text-[#2C3333] outline-none cursor-pointer"
                id="search-strip-date"
              />
            </div>

            {/* Time In (Arrival) */}
            <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-600" /> Time In (Arrival)
              </label>
              <input
                type="text"
                value={effectiveTimeIn}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalTimeIn(val);
                  if (setTimeIn) setTimeIn(val);
                  if (setSelectedTime) setSelectedTime(val);
                }}
                placeholder="e.g. 7:30 PM"
                className="w-full mt-1 bg-transparent text-xs font-semibold text-[#2C3333] outline-none"
                id="search-strip-time-in"
              />
            </div>

            {/* Time Out (Departure) */}
            <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" /> Time Out (Leave)
              </label>
              <input
                type="text"
                value={effectiveTimeOut}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalTimeOut(val);
                  if (setTimeOut) setTimeOut(val);
                }}
                placeholder="e.g. 9:15 PM"
                className="w-full mt-1 bg-transparent text-xs font-semibold text-[#2C3333] outline-none"
                id="search-strip-time-out"
              />
            </div>

            {/* Guests Count */}
            <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/60 flex items-center gap-1">
                <Users className="w-3 h-3 text-[#4F6F52]" /> Party Size
              </label>
              <select
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full mt-1 bg-transparent text-xs font-semibold text-[#2C3333] outline-none cursor-pointer"
                id="search-strip-guests"
              >
                <option value={1}>1 Guest (Solo)</option>
                <option value={2}>2 Guests (Couple)</option>
                <option value={3}>3 Guests</option>
                <option value={4}>4 Guests (Standard)</option>
                <option value={5}>5 Guests</option>
                <option value={6}>6 Guests (Family)</option>
                <option value={8}>8+ Guests (Celebration)</option>
              </select>
            </div>

            {/* Search Submit Button */}
            <button
              onClick={onExploreClick}
              className="w-full h-full min-h-[50px] rounded-full bg-[#4F6F52] hover:bg-[#3D5A40] text-white font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              id="search-strip-find-tables-btn"
            >
              <Search className="w-4 h-4" />
              <span>Find Tables</span>
            </button>

          </div>
        </div>

        {/* 4 Concise Capabilities section matching Editorial Aesthetic */}
        <div className="mt-16 pt-12 border-t border-[#E8E6E1]">
          <div className="text-center mb-10">
            <div className="inline-block px-3 py-1 bg-[#4F6F521A] text-[#4F6F52] text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm mb-3">
              Why FlashTable
            </div>
            <h2 className="text-3xl font-light text-[#2C3333] tracking-tight">
              Hospitality Designed Around Your Preferences
            </h2>
            <p className="text-sm text-[#2C3333]/60 mt-1 max-w-md mx-auto">
              Precision reservations crafted for seamless dining experiences across Bengaluru.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            
            {/* 1. Choose your table */}
            <div className="space-y-3 p-6 bg-white rounded-3xl border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-all group">
              <div className="w-10 h-10 bg-[#4F6F521A] rounded-xl flex items-center justify-center text-[#4F6F52] group-hover:scale-105 transition-transform">
                <Armchair className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-[#2C3333]">
                Choose Your Table
              </h3>
              <p className="text-xs leading-relaxed text-[#2C3333]/60">
                Interactive 2D floor plans let you pick the exact view, romantic terrace seat, or quiet corner you prefer.
              </p>
            </div>

            {/* 2. Smart Match */}
            <div className="space-y-3 p-6 bg-white rounded-3xl border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-all group">
              <div className="w-10 h-10 bg-[#4F6F521A] rounded-xl flex items-center justify-center text-[#4F6F52] group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-[#2C3333]">
                Smart Match
              </h3>
              <p className="text-xs leading-relaxed text-[#2C3333]/60">
                Rule-based suggestions tailored to your group size, preferred section atmosphere, and live slot availability.
              </p>
            </div>

            {/* 3. Instant confirmation */}
            <div className="space-y-3 p-6 bg-white rounded-3xl border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-all group">
              <div className="w-10 h-10 bg-[#4F6F521A] rounded-xl flex items-center justify-center text-[#4F6F52] group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-[#2C3333]">
                Instant Confirmation
              </h3>
              <p className="text-xs leading-relaxed text-[#2C3333]/60">
                Real-time availability syncing ensures zero waiting for booking approvals. Includes digital QR boarding pass.
              </p>
            </div>

            {/* 4. Smart Arrival */}
            <div className="space-y-3 p-6 bg-white rounded-3xl border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-all group">
              <div className="w-10 h-10 bg-[#4F6F521A] rounded-xl flex items-center justify-center text-[#4F6F52] group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-[#2C3333]">
                Smart Arrival
              </h3>
              <p className="text-xs leading-relaxed text-[#2C3333]/60">
                Seamless proximity geofencing that automatically prepares your check-in QR pass as you reach the entrance.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
