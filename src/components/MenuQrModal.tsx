import React, { useState } from 'react';
import { X, QrCode, Sparkles, ExternalLink, Leaf, Share2, Check } from 'lucide-react';
import { Restaurant } from '../types';

interface MenuQrModalProps {
  restaurant: Restaurant;
  isOpen?: boolean;
  onClose: () => void;
  onOpenMenuDirectly?: () => void;
  onViewFullMenu?: (restaurant: Restaurant) => void;
}

export const MenuQrModal: React.FC<MenuQrModalProps> = ({
  restaurant,
  isOpen = true,
  onClose,
  onOpenMenuDirectly,
  onViewFullMenu,
}) => {
  const [copied, setCopied] = useState(false);

  if (isOpen === false) return null;

  const menuUrl = `https://flashtable.app/menu/${restaurant.id}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard?.writeText(menuUrl);
    } catch {
      // Fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#FAF9F6] p-6 border-b border-[#E8E6E1] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-[#2C3333]">
                Scan to View Menu
              </h3>
              <p className="text-xs text-[#2C3333]/60">
                {restaurant.name} • {restaurant.neighborhood}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            id="close-menu-qr-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Environmental Messaging Ribbon */}
        <div className="bg-[#4F6F5210] border-b border-[#4F6F52]/20 px-6 py-3 flex items-center gap-2.5 text-xs text-[#4F6F52] font-medium">
          <Leaf className="w-4 h-4 shrink-0 text-[#4F6F52]" />
          <span>
            <strong>Zero-Paper Initiative:</strong> Skip the paper menu. Browse live kitchen items with fresh daily specials on your smartphone.
          </span>
        </div>

        {/* QR Code Container */}
        <div className="p-7 text-center flex flex-col items-center space-y-4">
          <div className="p-4 bg-white border border-[#E8E6E1] rounded-3xl shadow-sm inline-block">
            {/* Standard realistic black QR code on crisp white background */}
            <div className="w-52 h-52 bg-white rounded-2xl flex flex-col items-center justify-center p-3 relative border border-[#E8E6E1]">
              <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                {/* 3 Corner position detection patterns - Solid Black */}
                <rect x="5" y="5" width="26" height="26" rx="4" fill="none" stroke="#000000" strokeWidth="4" />
                <rect x="11" y="11" width="14" height="14" rx="2" fill="#000000" />
                
                <rect x="69" y="5" width="26" height="26" rx="4" fill="none" stroke="#000000" strokeWidth="4" />
                <rect x="75" y="11" width="14" height="14" rx="2" fill="#000000" />
                
                <rect x="5" y="69" width="26" height="26" rx="4" fill="none" stroke="#000000" strokeWidth="4" />
                <rect x="11" y="75" width="14" height="14" rx="2" fill="#000000" />

                {/* Standard black QR modules */}
                <rect x="38" y="8" width="8" height="6" fill="#000000" />
                <rect x="50" y="8" width="12" height="6" fill="#000000" />
                <rect x="38" y="18" width="6" height="12" fill="#000000" />
                <rect x="48" y="18" width="16" height="6" fill="#000000" />
                <rect x="8" y="38" width="16" height="6" fill="#000000" />
                <rect x="28" y="38" width="10" height="8" fill="#000000" />
                <rect x="42" y="32" width="8" height="14" fill="#000000" />
                <rect x="54" y="28" width="10" height="12" fill="#000000" />
                <rect x="68" y="38" width="12" height="6" fill="#000000" />
                <rect x="84" y="38" width="10" height="8" fill="#000000" />

                <rect x="8" y="48" width="8" height="14" fill="#000000" />
                <rect x="22" y="48" width="12" height="8" fill="#000000" />
                <rect x="38" y="50" width="14" height="8" fill="#000000" />
                <rect x="56" y="46" width="8" height="12" fill="#000000" />
                <rect x="68" y="50" width="14" height="10" fill="#000000" />
                <rect x="86" y="52" width="8" height="12" fill="#000000" />

                <rect x="38" y="68" width="12" height="10" fill="#000000" />
                <rect x="54" y="64" width="10" height="14" fill="#000000" />
                <rect x="68" y="68" width="8" height="12" fill="#000000" />
                <rect x="80" y="70" width="14" height="8" fill="#000000" />
                <rect x="40" y="82" width="16" height="10" fill="#000000" />
                <rect x="62" y="84" width="14" height="8" fill="#000000" />
                <rect x="82" y="82" width="10" height="10" fill="#000000" />
              </svg>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#2C3333]">
              Point your phone camera to scan
            </p>
            <p className="text-[11px] text-[#2C3333]/50">
              Tableside QR for {restaurant.name} • Indiranagar, Bengaluru
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2 pt-2">
            {onOpenMenuDirectly && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMenuDirectly();
                }}
                className="w-full py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                id="btn-open-digital-menu-direct"
              >
                <span>Open Digital Menu Directly</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 rounded-full border border-[#E8E6E1] hover:bg-[#FAF9F6] text-[#2C3333] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4F6F52]" />
                  <span>Menu Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#2C3333]/70" />
                  <span>Copy Menu Web Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subtle footer */}
        <div className="bg-[#FAF9F6] p-4 border-t border-[#E8E6E1] text-center text-[10px] text-[#2C3333]/50">
          Operates separately from table reservation passes • Powered by FlashTable Digital Hospitality
        </div>
      </div>
    </div>
  );
};
