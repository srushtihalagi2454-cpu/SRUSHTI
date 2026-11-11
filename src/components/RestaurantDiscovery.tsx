import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Armchair, 
  Sparkles, 
  X,
  Filter,
  Bus
} from 'lucide-react';
import { Restaurant, Reservation } from '../types';
import { RestaurantCard } from './RestaurantCard';
import { NEIGHBORHOODS, CUISINES, getTableState } from '../data/mockData';
import { DigitalMenuView } from './DigitalMenuView';
import { MenuQrModal } from './MenuQrModal';

interface RestaurantDiscoveryProps {
  restaurants: Restaurant[];
  reservations: Reservation[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  guestCount: number;
  setGuestCount: (count: number) => void;
  selectedNeighborhood: string;
  setSelectedNeighborhood: (loc: string) => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onNavigateTravelDining?: () => void;
  onBookForTravel?: (restaurant: Restaurant) => void;
}

export const RestaurantDiscovery: React.FC<RestaurantDiscoveryProps> = ({
  restaurants,
  reservations,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  guestCount,
  setGuestCount,
  selectedNeighborhood,
  setSelectedNeighborhood,
  onSelectRestaurant,
  onNavigateTravelDining,
  onBookForTravel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All Cuisines');
  const [priceFilter, setPriceFilter] = useState<'all' | 'under2000' | 'above2000'>('all');
  const [selectedMenuRestaurant, setSelectedMenuRestaurant] = useState<Restaurant | null>(null);
  const [selectedMenuQrRestaurant, setSelectedMenuQrRestaurant] = useState<Restaurant | null>(null);

  // Filter restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = restaurant.name.toLowerCase().includes(q);
        const matchesCuisine = restaurant.cuisines.some((c) => c.toLowerCase().includes(q));
        const matchesDishes = restaurant.popularDishes.some((d) => d.toLowerCase().includes(q));
        const matchesNeighborhood = restaurant.neighborhood.toLowerCase().includes(q);
        if (!matchesName && !matchesCuisine && !matchesDishes && !matchesNeighborhood) {
          return false;
        }
      }

      // Neighborhood
      if (selectedNeighborhood !== 'All Bengaluru') {
        if (!restaurant.neighborhood.toLowerCase().includes(selectedNeighborhood.toLowerCase())) {
          return false;
        }
      }

      // Cuisine
      if (selectedCuisine !== 'All Cuisines') {
        if (!restaurant.cuisines.some((c) => c.toLowerCase().includes(selectedCuisine.toLowerCase().split(' ')[0]))) {
          return false;
        }
      }

      // Price filter
      if (priceFilter === 'under2000' && restaurant.costForTwo > 2000) return false;
      if (priceFilter === 'above2000' && restaurant.costForTwo <= 2000) return false;

      return true;
    });
  }, [restaurants, searchQuery, selectedNeighborhood, selectedCuisine, priceFilter]);

  return (
    <section id="explore-section" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-block px-3 py-1 bg-[#4F6F521A] text-[#4F6F52] text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm mb-2">
            Real-Time Table Availability
          </div>
          <h2 className="text-3xl sm:text-4xl font-light text-[#2C3333] tracking-tight">
            Curated Bengaluru Establishments
          </h2>
          <p className="text-sm text-[#2C3333]/60 mt-1">
            Pick your dining time to explore live 2D floor blueprints and claim your exact preferred seat.
          </p>
        </div>

        {/* Quick Result Counter */}
        <div className="text-xs font-semibold uppercase tracking-wider text-[#2C3333]/50">
          Showing <span className="text-[#4F6F52] font-bold">{filteredRestaurants.length}</span> Verified Restaurants in Bengaluru
        </div>
      </div>

      {/* Travel Dining Journey Banner */}
      {onNavigateTravelDining && (
        <div 
          className="bg-linear-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 border border-amber-300 rounded-3xl p-4 sm:p-5 mb-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          id="discovery-travel-banner"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 shadow-xs border border-amber-300">
              <Bus className="w-6 h-6 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full">
                  Travel Dining & Food Booking
                </span>
                <span className="text-[10px] font-bold text-amber-800">
                  ⭐ Popular Travel Stops
                </span>
              </div>
              <h4 className="text-sm font-bold font-serif text-[#2C3333] mt-0.5">
                Travelling by bus? Book meals or tables along your journey
              </h4>
              <p className="text-xs text-[#2C3333]/70">
                Filter verified restaurants near major highway corridors & bus stops (NH 75, NH 44, Outer Ring Road).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateTravelDining}
            className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
            id="btn-discovery-journey"
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Restaurants Along My Journey</span>
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#E8E6E1] mb-8 space-y-4 shadow-sm">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#2C3333]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by restaurant name, cuisine (e.g. Awadhi, Mangalorean), or specialty dish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] transition-colors text-[#2C3333]"
            id="restaurant-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2C3333]/40 hover:text-[#2C3333]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          
          {/* Neighborhood filter */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[#2C3333]/50 font-bold uppercase tracking-widest text-[10px] mr-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#4F6F52]" /> Area:
            </span>
            {NEIGHBORHOODS.map((nh) => (
              <button
                key={nh}
                onClick={() => setSelectedNeighborhood(nh)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedNeighborhood === nh
                    ? 'bg-[#4F6F52] text-white shadow-xs'
                    : 'bg-[#FAF9F6] text-[#2C3333]/70 hover:text-[#4F6F52] hover:bg-white border border-[#E8E6E1]'
                }`}
              >
                {nh}
              </button>
            ))}
          </div>

          {/* Cuisine dropdown & Price filter */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="px-3.5 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E8E6E1] text-[#2C3333] font-semibold text-xs outline-none cursor-pointer"
            >
              {CUISINES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as any)}
              className="px-3.5 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E8E6E1] text-[#2C3333] font-semibold text-xs outline-none cursor-pointer"
            >
              <option value="all">All Prices</option>
              <option value="under2000">Under ₹2,000 for 2</option>
              <option value="above2000">₹2,000+ for 2</option>
            </select>
          </div>

        </div>
      </div>

      {/* Grid of Restaurants */}
      {filteredRestaurants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRestaurants.map((restaurant) => {
            // Calculate available tables for the currently selected date and time
            const openTables = restaurant.tables.filter((t) => {
              const state = getTableState(t, restaurant.id, selectedDate, selectedTime, reservations);
              return state === 'available';
            }).length;

            return (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                date={selectedDate}
                timeSlot={selectedTime}
                guests={guestCount}
                availableTablesCount={openTables}
                onSelectRestaurant={onSelectRestaurant}
                onBookForTravel={onBookForTravel}
                onViewMenu={(r) => setSelectedMenuRestaurant(r)}
                onOpenMenuQr={(r) => setSelectedMenuQrRestaurant(r)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#E8E6E1] shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#2C3333] uppercase tracking-wide">No restaurants matched your criteria</h3>
          <p className="text-xs text-[#2C3333]/60 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, neighborhood, or cuisine filter to explore available restaurants.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedNeighborhood('All Bengaluru');
              setSelectedCuisine('All Cuisines');
              setPriceFilter('all');
            }}
            className="mt-5 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-[#4F6F52] hover:bg-[#3D5A40] rounded-full transition-colors cursor-pointer shadow-sm"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Digital Menu Modal */}
      {selectedMenuRestaurant && (
        <DigitalMenuView
          restaurant={selectedMenuRestaurant}
          onClose={() => setSelectedMenuRestaurant(null)}
          onOpenBooking={() => {
            const r = selectedMenuRestaurant;
            setSelectedMenuRestaurant(null);
            onSelectRestaurant(r);
          }}
          onOpenMenuQr={() => {
            setSelectedMenuQrRestaurant(selectedMenuRestaurant);
          }}
        />
      )}

      {/* Menu QR Modal */}
      {selectedMenuQrRestaurant && (
        <MenuQrModal
          restaurant={selectedMenuQrRestaurant}
          onClose={() => setSelectedMenuQrRestaurant(null)}
          onViewFullMenu={(r) => {
            setSelectedMenuQrRestaurant(null);
            setSelectedMenuRestaurant(r);
          }}
        />
      )}

    </section>
  );
};
