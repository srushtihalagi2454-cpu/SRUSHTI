import React, { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import heroDiningImage from '../assets/images/flashtable_dining_hero_1793466674565.jpg';
import imgDiscovery from '../assets/images/flashtable_step1_map_1793467393316.jpg';
import imgFloorPlan from '../assets/images/flashtable_step2_tables_1793467408762.jpg';
import imgPreOrder from '../assets/images/flashtable_step3_order_1793467423373.jpg';
import imgQrArrival from '../assets/images/flashtable_step4_qr_1793467436471.jpg';
import imgDiningExperience from '../assets/images/flashtable_step5_serve_1793467450031.jpg';
import imgDigitalBill from '../assets/images/flashtable_step6_bill_1793467464306.jpg';

interface LandingFirstPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
}

// Fallback high-resolution restaurant interior photograph in case of asset loading issue
const FALLBACK_HERO_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=85';

export const LandingFirstPage: React.FC<LandingFirstPageProps> = ({
  onSignUp,
  onSignIn,
}) => {
  const [heroImgSrc, setHeroImgSrc] = useState<string>(heroDiningImage);

  const galleryImages = [
    { src: imgDiscovery, alt: 'Flash Table restaurant discovery on mobile phone' },
    { src: imgFloorPlan, alt: 'Flash Table digital restaurant floor plan table selection' },
    { src: imgPreOrder, alt: 'Flash Table restaurant table booking and food pre-ordering' },
    { src: imgQrArrival, alt: 'Flash Table QR check-in and restaurant arrival' },
    { src: imgDiningExperience, alt: 'Flash Table customers enjoying zero-wait restaurant dining' },
    { src: imgDigitalBill, alt: 'Flash Table digital restaurant billing and payment' },
  ];

  const scrollToGallery = () => {
    const el = document.getElementById('visual-gallery-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2C3333] flex flex-col selection:bg-[#4F6F52]/20 selection:text-[#2C3333] relative overflow-x-hidden">
      
      {/* ============================================================ */}
      {/* 1. TOP HEADER: FLASH TABLE BRANDING & LOGO */}
      {/* ============================================================ */}
      <header className="w-full px-6 py-6 sm:px-12 sm:py-7 lg:px-16 z-20 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 select-none" id="landing-brand-logo">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#4F6F52] flex items-center justify-center text-white shadow-md">
              {/* Visual Table & Seating Icon */}
              <div className="relative flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded-[3px] bg-white/10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
                <div className="absolute -top-1 w-3 h-0.5 bg-white/80 rounded-full"></div>
                <div className="absolute -bottom-1 w-3 h-0.5 bg-white/80 rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#4F6F52] font-display flex items-center gap-1.5">
                Flash<span className="text-[#2C3333]">Table</span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 bg-[#4F6F521A] text-[#4F6F52] rounded-sm">
                  IN
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2 & 3. HERO SECTION: "Your Table. Your Time. Your Choice." */}
      {/* + Existing Premium Restaurant Hero Image */}
      {/* NO buttons above or between images */}
      {/* ============================================================ */}
      <section className="w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12 lg:py-16 flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full">
          
          {/* Centre-Left Area: Main Heading Prominently Displayed */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-serif font-bold text-[#2C3333] tracking-tight leading-[1.14]">
              Your Table.
              <br />
              Your Time.
              <br />
              <span className="text-[#4F6F52] inline-block mt-1">Your Choice.</span>
            </h1>
          </div>

          {/* Right Side: Existing Premium Restaurant Dining Hero Image */}
          <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center">
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-[#E8E6E1] bg-stone-200 group">
              <img
                src={heroImgSrc}
                alt="Premium Restaurant Dining Experience with Neatly Arranged Tables"
                onError={() => {
                  if (heroImgSrc !== FALLBACK_HERO_IMAGE) {
                    setHeroImgSrc(FALLBACK_HERO_IMAGE);
                  }
                }}
                className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Subtle scroll down indicator */}
        <div 
          className="w-full pt-10 pb-2 flex flex-col items-center justify-center text-stone-400 hover:text-[#4F6F52] transition-colors cursor-pointer group select-none" 
          onClick={scrollToGallery}
          aria-label="Scroll to gallery"
        >
          <ChevronDown className="w-5 h-5 animate-bounce text-[#4F6F52]" />
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. ALL SIX WORKING IMAGES TOGETHER IN ONE GALLERY */}
      {/* 3-column × 2-row layout on desktop, equal size & consistent proportions */}
      {/* Strictly NO titles, captions, descriptions, step numbers or labels */}
      {/* ============================================================ */}
      <section 
        id="visual-gallery-section" 
        className="w-full bg-[#FAF9F6] border-t border-[#E8E6E1] py-14 sm:py-20 lg:py-24 px-6 sm:px-12 lg:px-16"
      >
        <div className="max-w-7xl mx-auto">
          {/* Clean, attractive, professionally aligned 3-column × 2-row grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {galleryImages.map((item, index) => (
              <div 
                key={index}
                className="group relative rounded-3xl overflow-hidden bg-stone-100 border border-[#E8E6E1] shadow-md hover:shadow-2xl hover:border-[#4F6F52]/40 transition-all duration-500"
              >
                {/* Equal size and consistent proportions (aspect 16/10) */}
                <div className="aspect-[16/10] w-full overflow-hidden">
                  <img 
                    src={item.src} 
                    alt={item.alt}
                    className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SIGN UP AND SIGN IN BELOW THE IMAGES */}
      {/* "Ready for a Better Dining Experience?" */}
      {/* [ SIGN UP ] [ SIGN IN ] */}
      {/* ============================================================ */}
      <section className="w-full bg-[#FAF9F6] border-t border-[#E8E6E1] py-20 sm:py-24 px-6 sm:px-12 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#2C3333] tracking-tight">
            Ready for a Better Dining Experience?
          </h2>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onSignUp}
              id="btn-bottom-signup"
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white font-bold text-xs sm:text-sm uppercase tracking-widest transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group text-center"
            >
              <span>SIGN UP</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={onSignIn}
              id="btn-bottom-signin"
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-white hover:bg-[#2C3333] text-[#2C3333] hover:text-white border-2 border-[#2C3333] font-bold text-xs sm:text-sm uppercase tracking-widest transition-all duration-200 shadow-xs hover:shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center text-center"
            >
              <span>SIGN IN</span>
            </button>
          </div>
        </div>
      </section>

      {/* Clean minimal footer */}
      <footer className="w-full border-t border-[#E8E6E1] bg-[#FAF9F6] py-8 px-6 sm:px-12 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#4F6F52]">FlashTable</span>
            <span className="text-stone-400">•</span>
            <span>Your Table. Your Time. Your Choice.</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} Flash Table. All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
