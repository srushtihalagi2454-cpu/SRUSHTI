import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Armchair, 
  Sparkles, 
  Calendar, 
  Users, 
  ShieldCheck, 
  Info, 
  ArrowUpRight,
  Store,
  Compass
} from 'lucide-react';
import { Restaurant } from '../types';

interface InsightsTabProps {
  restaurant: Restaurant;
}

interface HourlySlotData {
  time: string;
  label: string;
  utilization: number;
  reservations: number;
  guests: number;
  isPeak?: boolean;
}

const HOURLY_DEMO_DATA: HourlySlotData[] = [
  { time: '12:00 PM', label: '12 PM', utilization: 28, reservations: 3, guests: 8 },
  { time: '01:00 PM', label: '1 PM', utilization: 58, reservations: 6, guests: 18 },
  { time: '02:00 PM', label: '2 PM', utilization: 42, reservations: 4, guests: 12 },
  { time: '06:00 PM', label: '6 PM', utilization: 50, reservations: 5, guests: 16 },
  { time: '07:00 PM', label: '7 PM', utilization: 85, reservations: 9, guests: 28 },
  { time: '08:00 PM', label: '8 PM', utilization: 92, reservations: 10, guests: 32, isPeak: true },
  { time: '09:00 PM', label: '9 PM', utilization: 78, reservations: 8, guests: 24 },
  { time: '10:00 PM', label: '10 PM', utilization: 35, reservations: 3, guests: 9 },
];

export const InsightsTab: React.FC<InsightsTabProps> = ({ restaurant }) => {
  const [activeMetric, setActiveMetric] = useState<'utilization' | 'reservations'>('utilization');
  const [hoveredSlot, setHoveredSlot] = useState<HourlySlotData | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-150" id="section-insights">
      
      {/* Insights Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4F6F521A] text-[#4F6F52] text-[10px] font-bold uppercase tracking-widest mb-2 border border-[#4F6F52]/20">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Operational Insights</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#2C3333]">
            Insights & Performance
          </h2>
          <p className="text-xs text-[#2C3333]/60 mt-1">
            Service metrics, demand pacing, and floor turnover for {restaurant.name} (Indiranagar, Bengaluru)
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#4F6F52] bg-[#FAF9F6] px-4 py-2 rounded-full border border-[#E8E6E1]">
          <span className="w-2 h-2 rounded-full bg-[#4F6F52]" />
          <span>Realistic Demo Values</span>
        </div>
      </div>

      {/* 6 Key Restaurant-Owner Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Metric 1: Table Utilization */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
              Table Utilization
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
              <Armchair className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-light font-serif text-[#2C3333]">
              74%
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>+6% vs last week</span>
            </span>
          </div>
          <p className="text-[11px] text-[#2C3333]/60 mt-2">
            High seating efficiency across dinner shifts.
          </p>
        </div>

        {/* Metric 2: Peak Reservation Period */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
              Peak Reservation Period
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-light font-serif text-[#2C3333]">
              7:00 PM – 9:00 PM
            </span>
          </div>
          <p className="text-[11px] text-[#2C3333]/60 mt-2">
            Highest concentration of table bookings (92% at 8:00 PM).
          </p>
        </div>

        {/* Metric 3: Average Occupancy */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
              Average Occupancy
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-light font-serif text-[#2C3333]">
              68%
            </span>
            <span className="text-xs text-[#2C3333]/60">
              (All day avg)
            </span>
          </div>
          <p className="text-[11px] text-[#2C3333]/60 mt-2">
            Healthy turnover rate of 1.4 dining seatings per table.
          </p>
        </div>

        {/* Metric 4: Most Requested Seating Preference */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
              Most Requested Preference
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#4F6F52] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-light font-serif text-[#4F6F52]">
              Window
            </span>
            <span className="text-xs text-[#2C3333]/60">
              (46% of requests)
            </span>
          </div>
          <p className="text-[11px] text-[#2C3333]/60 mt-2">
            Courtyard garden view and window alcoves fill first.
          </p>
        </div>

        {/* Metric 5: Reservations Today */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
              Reservations Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-light font-serif text-[#2C3333]">
              10
            </span>
            <span className="text-xs font-bold text-[#4F6F52] bg-[#4F6F521A] px-2 py-0.5 rounded-full">
              All Confirmed
            </span>
          </div>
          <p className="text-[11px] text-[#2C3333]/60 mt-2">
            100% pre-assigned to tables with zero overlap.
          </p>
        </div>

        {/* Metric 6: Expected Guests */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8E6E1] shadow-sm hover:border-[#4F6F52]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
              Expected Guests
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-light font-serif text-[#2C3333]">
              32
            </span>
            <span className="text-xs text-[#2C3333]/60">
              (Avg 3.2 guests / booking)
            </span>
          </div>
          <p className="text-[11px] text-[#2C3333]/60 mt-2">
            Includes Sanketh's 4-guest party at Table T07.
          </p>
        </div>

      </div>

      {/* Visual Chart: Table Utilization & Reservations by Time */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
          <div>
            <h3 className="text-xl font-bold font-serif text-[#2C3333]">
              Table Utilization & Reservations by Time
            </h3>
            <p className="text-xs text-[#2C3333]/60 mt-0.5">
              Hourly occupancy pace across lunch and dinner services
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#FAF9F6] p-1 rounded-full border border-[#E8E6E1]">
            <button
              type="button"
              onClick={() => setActiveMetric('utilization')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeMetric === 'utilization'
                  ? 'bg-[#2C3333] text-white shadow-2xs'
                  : 'text-[#2C3333]/70 hover:text-[#2C3333]'
              }`}
            >
              Utilization %
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('reservations')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeMetric === 'reservations'
                  ? 'bg-[#2C3333] text-white shadow-2xs'
                  : 'text-[#2C3333]/70 hover:text-[#2C3333]'
              }`}
            >
              Bookings Count
            </button>
          </div>
        </div>

        {/* Clean Bar Visualizer */}
        <div className="pt-6 pb-2">
          <div className="grid grid-cols-8 gap-2 sm:gap-4 items-end h-56 px-2">
            {HOURLY_DEMO_DATA.map((item) => {
              const heightPct = activeMetric === 'utilization'
                ? item.utilization
                : (item.reservations / 10) * 100;

              const isPeak = item.isPeak;

              return (
                <div 
                  key={item.time}
                  onMouseEnter={() => setHoveredSlot(item)}
                  onMouseLeave={() => setHoveredSlot(null)}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* Top value badge */}
                  <div className="mb-2 text-[10px] sm:text-xs font-bold transition-transform group-hover:scale-110">
                    {activeMetric === 'utilization' ? (
                      <span className={`${isPeak ? 'text-[#4F6F52] font-black' : 'text-[#2C3333]/70'}`}>
                        {item.utilization}%
                      </span>
                    ) : (
                      <span className={`${isPeak ? 'text-[#4F6F52] font-black' : 'text-[#2C3333]/70'}`}>
                        {item.reservations}
                      </span>
                    )}
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full max-w-[48px] bg-[#FAF9F6] rounded-t-xl overflow-hidden h-40 flex items-end p-1 border border-[#E8E6E1]">
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isPeak 
                          ? 'bg-[#4F6F52] shadow-sm' 
                          : 'bg-[#4F6F52]/60 hover:bg-[#4F6F52]/80'
                      }`}
                    />
                  </div>

                  {/* Time label */}
                  <div className="mt-2 text-center">
                    <span className={`block text-[11px] font-semibold ${isPeak ? 'text-[#4F6F52] font-bold' : 'text-[#2C3333]/70'}`}>
                      {item.label}
                    </span>
                    {isPeak && (
                      <span className="hidden sm:inline-block text-[8px] font-bold text-white bg-[#4F6F52] px-1 rounded uppercase tracking-tighter">
                        PEAK
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover slot detail banner */}
        <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-[#E8E6E1] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#2C3333]">
          {hoveredSlot ? (
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#4F6F52]">{hoveredSlot.time}:</span>
              <span>{hoveredSlot.utilization}% Table Utilization</span>
              <span>•</span>
              <span>{hoveredSlot.reservations} Bookings</span>
              <span>•</span>
              <span>{hoveredSlot.guests} Expected Guests</span>
              {hoveredSlot.isPeak && (
                <span className="text-[10px] font-bold uppercase bg-[#4F6F52] text-white px-2 py-0.5 rounded-full">
                  Peak Service
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#2C3333]/60">
              <Info className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Hover over any time slot bar above to inspect detailed guest and booking volume.</span>
            </div>
          )}

          <div className="flex items-center gap-3 shrink-0 text-[#2C3333]/60 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#4F6F52]" />
              <span>Peak Demand</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#4F6F52]/60" />
              <span>Regular Service</span>
            </span>
          </div>
        </div>
      </div>

      {/* Keep Existing No-Show Risk and Turnover Insight Cards Intact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Existing No-Show Risk Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8E6E1] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C3333]/50">
              No-Show Risk Analysis
            </span>
            <ShieldCheck className="w-5 h-5 text-[#4F6F52]" />
          </div>
          <div>
            <span className="text-3xl font-light font-serif text-[#4F6F52]">
              Low (3.8%)
            </span>
          </div>
          <p className="text-xs text-[#2C3333]/70 leading-relaxed">
            Dynamic scoring based on phone OTP verification and customer Smart Arrival GPS opt-in.
          </p>
          <div className="pt-2 text-[11px] text-[#4F6F52] font-semibold flex items-center gap-1">
            ✓ Smart Arrival geofencing reduces late cancellations by 82%
          </div>
        </div>

        {/* Existing Turnover Insight Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#4F6F521A] border border-[#4F6F52]/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52]">
              Turnover Insight
            </span>
            <Sparkles className="w-5 h-5 text-[#4F6F52]" />
          </div>
          <div>
            <span className="text-lg font-bold font-serif text-[#2C3333]">
              Safe Buffer: +1 Table at 08:30 PM
            </span>
          </div>
          <p className="text-xs text-[#2C3333]/70 leading-relaxed">
            Based on average dining duration (75 mins), Table T-01 clears by 08:25 PM. Safe to accept an extra late walk-in.
          </p>
          <div className="pt-2 text-[11px] text-[#2C3333]/60 flex items-center gap-1 font-medium">
            Turnover Pace: 75 min turn cycle • Next buffer window: 09:45 PM
          </div>
        </div>

      </div>

      {/* Disclaimer note */}
      <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] text-[11px] text-[#2C3333]/60 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
        <span>
          These metrics use realistic demo values for The Ember Room, Indiranagar to demonstrate table turnover and operational demand pacing.
        </span>
      </div>

    </div>
  );
};
