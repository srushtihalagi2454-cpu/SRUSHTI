import React from 'react';
import { 
  Star, 
  MapPin, 
  Clock, 
  Sparkles, 
  Armchair, 
  ArrowRight, 
  ShieldCheck,
  UtensilsCrossed,
  QrCode,
  Phone,
  Bus,
  Package
} from 'lucide-react';
import { Restaurant, Table } from '../types';
import { getFormattedOperatingHours } from '../utils/operatingHours';

interface RestaurantCardProps {
  restaurant: Restaurant;
  date: string;
  timeSlot: string;
  guests: number;
  availableTablesCount: number;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onViewMenu?: (restaurant: Restaurant) => void;
  onOpenMenuQr?: (restaurant: Restaurant) => void;
  onBookForTravel?: (restaurant: Restaurant) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  date,
  timeSlot,
  guests,
  availableTablesCount,
  onSelectRestaurant,
  onViewMenu,
  onOpenMenuQr,
  onBookForTravel,
}) => {
  const operatingHours = getFormattedOperatingHours(restaurant.openingHours);

  return (
    <div 
      onClick={() => onSelectRestaurant(restaurant)}
      className="bg-white rounded-3xl border border-[#E8E6E1] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#4F6F52]/50 transition-all duration-300 flex flex-col group cursor-pointer relative"
      id={`restaurant-card-${restaurant.id}`}
    >
      {/* Image Container */}
      <div className="relative h-56 sm:h-60 w-full overflow-hidden bg-[#FAF9F6]">
        <img
          src={restaurant.heroImage}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700"
          loading="lazy"
        />
        
        {/* Rating Badge */}
        <div className="absolute top-3.5 right-3.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#2C3333] flex items-center gap-1.5 shadow-sm border border-[#E8E6E1]">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>{restaurant.rating}</span>
          <span className="text-[#2C3333]/40 font-medium text-[10px]">({restaurant.reviewCount})</span>
        </div>

        {/* Neighborhood Pill */}
        <div className="absolute top-3.5 left-3.5 bg-[#2C3333]/85 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-[#FAF9F6]" />
          <span>{restaurant.neighborhood}</span>
        </div>

        {/* ⭐ Popular Travel Stop Badge */}
        {restaurant.isPopularTravelStop && (
          <div 
            className="absolute top-12 left-3.5 bg-amber-500/95 backdrop-blur-md text-stone-950 font-bold px-2.5 py-1 rounded-full text-[10px] tracking-wide flex items-center gap-1.5 shadow-md border border-amber-300 z-10"
            title="Frequently selected by travelling passengers"
          >
            <span>⭐</span>
            <span>Popular Travel Stop</span>
          </div>
        )}

        {/* Live Available Tables Pill */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-[#4F6F52] border border-[#4F6F52]/20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-md">
          <Armchair className="w-3.5 h-3.5" />
          <span>{availableTablesCount} Tables open • {timeSlot}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold font-serif text-[#2C3333] group-hover:text-[#4F6F52] transition-colors">
                {restaurant.name}
              </h3>
              <p className="text-xs text-[#2C3333]/60 mt-1 line-clamp-1">
                {restaurant.tagline}
              </p>
            </div>
          </div>

          {/* Cuisine Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {restaurant.cuisines.slice(0, 3).map((cuisine) => (
              <span
                key={cuisine}
                className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FAF9F6] text-[#2C3333]/70 border border-[#E8E6E1]"
              >
                {cuisine}
              </span>
            ))}
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20 font-serif flex items-center gap-1">
              <span className="line-through text-stone-600 font-semibold">₹{Math.round(restaurant.costForTwo * 1.25)}</span>
              <span className="text-stone-400 font-bold">/</span>
              <span className="text-[#4F6F52] font-bold">₹{restaurant.costForTwo}</span>
              <span className="font-sans text-[9px] text-stone-500">for 2</span>
            </span>
          </div>

          {/* Address */}
          <div className="mt-3 flex items-start gap-1.5 text-xs text-[#2C3333]/75">
            <MapPin className="w-3.5 h-3.5 text-[#4F6F52] shrink-0 mt-0.5" />
            <span className="line-clamp-2">{restaurant.address}</span>
          </div>

          {/* Operating Hours */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#2C3333]/70">
            <Clock className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
            <span className="font-medium">Hours: {operatingHours}</span>
          </div>

          {/* Customer Care Helpline */}
          {(restaurant.customerCareNumber || restaurant.contactNumber) && (
            <div className="mt-2.5 p-2 rounded-xl bg-[#4F6F5214] border border-[#4F6F52]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#4F6F52] font-bold">
                <Phone className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
                <span>Customer Care:</span>
              </div>
              <a
                href={`tel:${restaurant.customerCareNumber || restaurant.contactNumber}`}
                onClick={(e) => e.stopPropagation()}
                className="font-mono font-bold text-[#4F6F52] hover:underline"
                title="Direct Customer Care Helpline"
              >
                {restaurant.customerCareNumber || restaurant.contactNumber}
              </a>
            </div>
          )}

          {/* Nearby Bus Stop & Transit Info */}
          {restaurant.nearbyBusStops && restaurant.nearbyBusStops.length > 0 && (
            <div className="mt-2.5 p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-[#2C3333]">
              <div className="flex items-center justify-between font-semibold text-amber-900">
                <span className="flex items-center gap-1.5 truncate">
                  <Bus className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">{restaurant.nearbyBusStops[0].stopName}</span>
                </span>
                <span className="text-[11px] font-bold text-amber-800 shrink-0 ml-1">
                  {restaurant.nearbyBusStops[0].distanceKm} km
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-stone-600">
                <span className="truncate">{restaurant.nearbyBusStops[0].highwayRoute}</span>
                <span className="font-semibold text-emerald-800 shrink-0">
                  🍽️ Dine-In & 🥡 Parcel
                </span>
              </div>
            </div>
          )}

          {/* Highlights / Popular dish */}
          <div className="mt-2.5 pt-2.5 border-t border-[#E8E6E1] text-xs text-[#2C3333]/70 flex items-center gap-1.5">
            <span className="text-[#4F6F52] font-bold uppercase tracking-widest text-[10px]">Signature:</span>
            <span className="truncate text-[#2C3333]/70 text-[11px] font-medium">{restaurant.popularDishes[0]}</span>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="mt-5 pt-3.5 border-t border-[#E8E6E1] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onViewMenu && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMenu(restaurant);
                }}
                className="px-3 py-1.5 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6E1] text-[#2C3333] border border-[#E8E6E1] text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="View Digital Menu"
                id={`btn-menu-${restaurant.id}`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span>Menu</span>
              </button>
            )}

            {onOpenMenuQr && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMenuQr(restaurant);
                }}
                className="p-1.5 rounded-full bg-white hover:bg-[#FAF9F6] text-[#2C3333] border border-[#E8E6E1] transition-colors cursor-pointer shadow-2xs"
                title="Scan Menu QR"
                id={`btn-menu-qr-${restaurant.id}`}
              >
                <QrCode className="w-4 h-4 text-[#4F6F52]" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {restaurant.isTravelStopPartner && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onBookForTravel) {
                    onBookForTravel(restaurant);
                  } else {
                    onSelectRestaurant(restaurant);
                  }
                }}
                className="px-2.5 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Book food or table while travelling on bus"
                id={`btn-travel-book-${restaurant.id}`}
              >
                <Bus className="w-3 h-3 text-amber-700" />
                <span>Travel</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRestaurant(restaurant);
              }}
              className="px-3.5 py-2 rounded-full bg-[#2C3333] group-hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm group/btn cursor-pointer"
              id={`btn-choose-table-${restaurant.id}`}
            >
              <span>Choose Table</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
