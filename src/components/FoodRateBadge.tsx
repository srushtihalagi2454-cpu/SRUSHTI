import React from 'react';
import { getItemPrices } from '../utils/priceUtils';
import { Tag } from 'lucide-react';

interface FoodRateBadgeProps {
  item?: any;
  actualPrice?: number;
  discountPrice?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercent?: boolean;
  className?: string;
}

/**
 * FoodRateBadge
 * Renders the food pricing format with:
 * LEFT SIDE: Actual Rate (original price)
 * SEPARATOR: /
 * RIGHT SIDE: Discount Rate (offer price)
 */
export const FoodRateBadge: React.FC<FoodRateBadgeProps> = ({
  item,
  actualPrice: propActual,
  discountPrice: propDiscount,
  size = 'md',
  showLabel = true,
  showPercent = true,
  className = '',
}) => {
  const prices = item ? getItemPrices(item) : {
    actualPrice: propActual ?? 450,
    discountPrice: propDiscount ?? 350,
    discountPercent: propActual && propDiscount && propActual > propDiscount 
      ? Math.round(((propActual - propDiscount) / propActual) * 100) 
      : 20,
    isDiscounted: true,
    rateDisplay: `₹${propActual ?? 450} / ₹${propDiscount ?? 350}`,
  };

  const actualPrice = propActual !== undefined ? propActual : prices.actualPrice;
  const discountPrice = propDiscount !== undefined ? propDiscount : prices.discountPrice;
  const discountPercent = actualPrice > discountPrice 
    ? Math.round(((actualPrice - discountPrice) / actualPrice) * 100)
    : prices.discountPercent;

  // Text sizes
  const actualTextSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const slashSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const discountTextSize = size === 'sm' ? 'text-sm font-bold' : size === 'lg' ? 'text-xl font-bold' : 'text-base font-bold';
  const badgeTextSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className={`inline-flex flex-col items-start ${className}`} id="food-rate-container">
      <div className="flex items-center flex-wrap gap-1.5 font-serif" title={`Actual Rate: ₹${actualPrice} / Discount Rate: ₹${discountPrice}`}>
        {/* LEFT SIDE: ACTUAL RATE */}
        <span className={`line-through text-stone-600 font-semibold ${actualTextSize} tracking-tight`}>
          ₹{actualPrice}
        </span>

        {/* SEPARATOR */}
        <span className={`text-stone-400 font-bold ${slashSize} select-none`}>
          /
        </span>

        {/* RIGHT SIDE: DISCOUNT RATE */}
        <span className={`text-[#4F6F52] dark:text-emerald-700 ${discountTextSize} tracking-tight`}>
          ₹{discountPrice}
        </span>

        {/* DISCOUNT PERCENTAGE BADGE */}
        {showPercent && discountPercent > 0 && (
          <span className={`ml-0.5 font-sans font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md ${badgeTextSize}`}>
            {discountPercent}% OFF
          </span>
        )}
      </div>

      {/* CLARIFYING SUB-LABEL: ACTUAL RATE / DISCOUNT RATE */}
      {showLabel && (
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#2C3333]/50 flex items-center gap-0.5 mt-0.5">
          <Tag className="w-2.5 h-2.5 text-[#4F6F52]" />
          <span>Actual Rate / Discount Rate</span>
        </span>
      )}
    </div>
  );
};
