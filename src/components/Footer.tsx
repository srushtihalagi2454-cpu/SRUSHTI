import React from 'react';
import { Armchair, MapPin, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { UserRole } from '../types';

interface FooterProps {
  onDiscoverClick: () => void;
  onHowItWorksClick: () => void;
  onRestaurantClick: () => void;
  onNavigateAuth?: (mode: 'login' | 'signup') => void;
  userRole?: UserRole;
  onAdminClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onDiscoverClick,
  onHowItWorksClick,
  onRestaurantClick,
  onNavigateAuth,
  userRole = 'customer',
  onAdminClick,
}) => {
  return (
    <footer className="bg-white/60 border-t border-[#E8E6E1] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#4F6F52] text-white flex items-center justify-center font-bold text-xs">
                FT
              </div>
              <span className="text-xl font-bold tracking-tight text-[#4F6F52] font-display">
                Flash<span className="text-[#2C3333]">Table</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#4F6F521A] text-[#4F6F52] px-1.5 py-0.5 rounded-sm">IN</span>
            </div>
            <p className="text-xs text-[#2C3333]/70 leading-relaxed">
              India's first exact table reservation platform. Discover top restaurants, view interactive 2D floor plans, and reserve the exact table you desire.
            </p>
            <div className="text-[11px] text-[#2C3333]/50 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>HQ: Indiranagar, Bengaluru 560038</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#2C3333] mb-3">
              Explore FlashTable
            </h4>
            <ul className="space-y-2 text-xs text-[#2C3333]/70">
              <li>
                <button onClick={onDiscoverClick} className="hover:text-[#4F6F52] transition-colors cursor-pointer uppercase tracking-wider text-[11px] font-medium">
                  Discover Restaurants
                </button>
              </li>
              <li>
                <button onClick={onHowItWorksClick} className="hover:text-[#4F6F52] transition-colors cursor-pointer uppercase tracking-wider text-[11px] font-medium">
                  How 2D Table Booking Works
                </button>
              </li>
              <li>
                <button 
                  onClick={onHowItWorksClick} 
                  className="hover:text-[#4F6F52] transition-colors cursor-pointer uppercase tracking-wider text-[11px] font-medium text-left"
                >
                  For Restaurant Owners (Learn More)
                </button>
              </li>
              {onNavigateAuth && (
                <>
                  <li>
                    <button 
                      onClick={() => onNavigateAuth('login')} 
                      className="hover:text-[#4F6F52] transition-colors cursor-pointer uppercase tracking-wider text-[11px] font-medium"
                    >
                      {userRole === 'restaurant-owner' ? 'Owner Sign In' : 'Diner Sign In'}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => onNavigateAuth('signup')} 
                      className="hover:text-[#4F6F52] transition-colors cursor-pointer uppercase tracking-wider text-[11px] font-medium"
                    >
                      Create Account
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Bengaluru Locations */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#2C3333] mb-3">
              Featured Neighborhoods
            </h4>
            <ul className="space-y-2 text-xs text-[#2C3333]/70">
              <li>Lavelle Road & UB City</li>
              <li>Indiranagar 100 Feet Road</li>
              <li>Koramangala 4th & 5th Block</li>
              <li>Church Street & MG Road</li>
              <li>Whitefield ITPL Corridor</li>
            </ul>
          </div>

          {/* Prototype Context */}
          <div className="p-5 rounded-3xl bg-white border border-[#E8E6E1] space-y-2 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C3333] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Smart India Hackathon 2026</span>
            </div>
            <p className="text-[11px] text-[#2C3333]/60 leading-relaxed">
              Designed as a production-grade Indian hospitality product. Interactive 2D floor plans, Smart Match section scoring, and zero-wait QR arrivals.
            </p>
            <div className="text-[10px] text-[#4F6F52] font-semibold uppercase tracking-widest pt-1">
              Bengaluru, Karnataka • IST (UTC+5:30)
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#E8E6E1] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2C3333]/40">
          <div>
            FlashTable Prototype • Smart India Hackathon 2026
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#4F6F52] cursor-pointer">Bengaluru • India</span>
            <span className="hover:text-[#4F6F52] cursor-pointer">Privacy</span>
            <span className="hover:text-[#4F6F52] cursor-pointer">Terms</span>
            <span className="hover:text-[#4F6F52] cursor-pointer">Support</span>
            {onAdminClick && (
              <button 
                onClick={onAdminClick} 
                className="hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider"
                title="Authorized Corporate Administrator Portal"
                id="footer-admin-portal-link"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin Portal</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </footer>
  );
};
