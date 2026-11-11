import React, { useState, useMemo } from 'react';
import { 
  Bus, 
  MapPin, 
  Navigation, 
  Clock, 
  UtensilsCrossed, 
  Package, 
  Star, 
  ArrowRight, 
  SlidersHorizontal, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Info,
  Calendar,
  Users,
  Compass
} from 'lucide-react';
import { Restaurant, Reservation } from '../types';
import { 
  VERIFIED_TRAVEL_ROUTES, 
  VERIFIED_BUS_STOPS, 
  TravelRoute, 
  BusStop, 
  calculateDistanceKm, 
  calculateTravelArrivalEta 
} from '../data/travelRoutesData';
import { getFormattedOperatingHours } from '../utils/operatingHours';
import { DigitalMenuView } from './DigitalMenuView';
import { MenuQrModal } from './MenuQrModal';

interface TravelDiningDiscoveryProps {
  restaurants: Restaurant[];
  onSelectTravelRestaurant: (restaurant: Restaurant, travelParams?: {
    route?: TravelRoute;
    busStop?: BusStop;
    expectedArrival?: string;
    fulfillmentType?: 'dine_in' | 'parcel';
  }) => void;
  onViewMenu?: (restaurant: Restaurant) => void;
  onOpenMenuQr?: (restaurant: Restaurant) => void;
  onBackToNormalExplore?: () => void;
}

export const TravelDiningDiscovery: React.FC<TravelDiningDiscoveryProps> = ({
  restaurants,
  onSelectTravelRestaurant,
  onViewMenu,
  onOpenMenuQr,
  onBackToNormalExplore,
}) => {
  // Route selection
  const [selectedRouteId, setSelectedRouteId] = useState<string>(VERIFIED_TRAVEL_ROUTES[0].id);
  const [selectedStopId, setSelectedStopId] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | 'dine_in' | 'parcel'>('all');
  const [popularOnlyFilter, setPopularOnlyFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Route Object
  const currentRoute = useMemo(() => {
    return VERIFIED_TRAVEL_ROUTES.find((r) => r.id === selectedRouteId) || VERIFIED_TRAVEL_ROUTES[0];
  }, [selectedRouteId]);

  // Available stops for this route
  const routeStops = useMemo(() => {
    return currentRoute.majorStops;
  }, [currentRoute]);

  // Travel-friendly restaurants filtered for this route / stop
  const matchingRestaurants = useMemo(() => {
    return restaurants.filter((rest) => {
      // Must support travel booking
      if (rest.isTravelStopPartner === false) return false;

      // Filter by popular if toggled
      if (popularOnlyFilter && !rest.isPopularTravelStop) return false;

      // Filter by fulfillment type
      if (fulfillmentFilter !== 'all') {
        const services = rest.travelServices || ['dine_in', 'parcel'];
        if (!services.includes(fulfillmentFilter)) return false;
      }

      // Filter by text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rest.name.toLowerCase().includes(q);
        const matchesCuisine = rest.cuisines.some((c) => c.toLowerCase().includes(q));
        const matchesDishes = rest.popularDishes.some((d) => d.toLowerCase().includes(q));
        const matchesArea = rest.neighborhood.toLowerCase().includes(q);
        if (!matchesName && !matchesCuisine && !matchesDishes && !matchesArea) return false;
      }

      // Filter by route association
      const isAssociatedWithRoute = currentRoute.associatedRestaurantIds.includes(rest.id);
      
      // If a specific bus stop is selected, ensure proximity within 3.5 km
      if (selectedStopId !== 'all') {
        const stop = VERIFIED_BUS_STOPS.find((s) => s.id === selectedStopId);
        if (stop) {
          const dist = calculateDistanceKm(
            rest.coordinates.lat,
            rest.coordinates.lng,
            stop.coordinates.lat,
            stop.coordinates.lng
          );
          if (dist > 3.0) return false;
        }
      } else if (!isAssociatedWithRoute) {
        // Fallback: check if close to any stop on this route
        const isNearAnyRouteStop = currentRoute.majorStops.some((st) => {
          const dist = calculateDistanceKm(
            rest.coordinates.lat,
            rest.coordinates.lng,
            st.coordinates.lat,
            st.coordinates.lng
          );
          return dist <= 2.8;
        });
        if (!isNearAnyRouteStop) return false;
      }

      return true;
    });
  }, [restaurants, currentRoute, selectedStopId, fulfillmentFilter, popularOnlyFilter, searchQuery]);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-[#2C3333] via-[#384444] to-[#1F2421] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-stone-700/50 relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold uppercase tracking-widest rounded-full mb-3">
              <Bus className="w-3.5 h-3.5 text-amber-400" />
              <span>Travel Dining & Food Booking</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-light text-white tracking-tight">
              Restaurants Along My Journey
            </h1>
            <p className="mt-2 text-stone-300 text-sm sm:text-base leading-relaxed">
              Travelling by bus? Book hot restaurant meals or reserve your exact dining table <span className="text-amber-300 font-medium">while you are still on the road</span>. Choose dine-in for a prepared table upon arrival or quick express parcel pickup when your bus reaches the stop.
            </p>
          </div>

          {onBackToNormalExplore && (
            <button
              onClick={onBackToNormalExplore}
              className="self-start md:self-center px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Standard City Booking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Route Selector Strip */}
        <div className="mt-8 pt-6 border-t border-white/15">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Select Your Verified Bus Transit Corridor:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {VERIFIED_TRAVEL_ROUTES.map((route) => {
              const isSelected = route.id === selectedRouteId;
              return (
                <button
                  key={route.id}
                  onClick={() => {
                    setSelectedRouteId(route.id);
                    setSelectedStopId('all');
                  }}
                  className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md font-medium'
                      : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-stone-900' : 'text-amber-400'}`}>
                      {route.routeCode}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-stone-950" />}
                  </div>
                  <div className="mt-1.5 text-xs font-bold line-clamp-1">
                    {route.highwayOrCorridor}
                  </div>
                  <div className={`mt-1 text-[11px] line-clamp-1 ${isSelected ? 'text-stone-800' : 'text-stone-400'}`}>
                    {route.origin.split(' ')[0]} ⇄ {route.destination.split(' ')[0]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and Bus Stop Bar */}
      <div className="bg-white rounded-2xl border border-[#E8E6E1] p-4 sm:p-6 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Specific Stop Filter */}
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2C3333]">
              <MapPin className="w-4 h-4 text-[#4F6F52]" />
              <span>Bus Stop / Highway Halt:</span>
            </div>
            <select
              value={selectedStopId}
              onChange={(e) => setSelectedStopId(e.target.value)}
              className="bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl px-3 py-2 text-xs font-medium text-[#2C3333] focus:outline-none focus:border-[#4F6F52]"
            >
              <option value="all">All Stops along {currentRoute.routeCode}</option>
              {routeStops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name} ({stop.locality})
                </option>
              ))}
            </select>

            {/* Fulfillment Type Toggle */}
            <div className="flex items-center bg-[#FAF9F6] p-1 rounded-xl border border-[#E8E6E1] text-xs">
              <button
                onClick={() => setFulfillmentFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  fulfillmentFilter === 'all' ? 'bg-[#2C3333] text-white shadow-xs' : 'text-stone-600 hover:text-[#2C3333]'
                }`}
              >
                All Options
              </button>
              <button
                onClick={() => setFulfillmentFilter('dine_in')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  fulfillmentFilter === 'dine_in' ? 'bg-[#4F6F52] text-white shadow-xs' : 'text-stone-600 hover:text-[#2C3333]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Dine-In</span>
              </button>
              <button
                onClick={() => setFulfillmentFilter('parcel')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  fulfillmentFilter === 'parcel' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-600 hover:text-[#2C3333]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Takeaway Parcel</span>
              </button>
            </div>

            {/* Popular Stop Filter */}
            <button
              onClick={() => setPopularOnlyFilter(!popularOnlyFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                popularOnlyFilter
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-xs'
                  : 'bg-[#FAF9F6] text-stone-700 border-[#E8E6E1] hover:bg-stone-100'
              }`}
            >
              <span>⭐</span>
              <span>Popular Travel Stops Only</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, cuisine, dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs focus:outline-none focus:border-[#4F6F52]"
            />
          </div>

        </div>
      </div>

      {/* Discovery Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#2C3333] flex items-center gap-2">
            <span>Verified Travel Restaurants</span>
            <span className="text-xs font-sans font-bold px-2 py-0.5 rounded-full bg-[#4F6F52]/10 text-[#4F6F52]">
              {matchingRestaurants.length} Available
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real distance calculated from verified highway bus stops along {currentRoute.name}
          </p>
        </div>
      </div>

      {/* Restaurant Cards Grid */}
      {matchingRestaurants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E8E6E1] p-8">
          <Bus className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-700">No matching restaurants for this stop filter</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Try switching to "All Stops" along this corridor or removing the filter to view all verified travel partner restaurants.
          </p>
          <button
            onClick={() => {
              setSelectedStopId('all');
              setFulfillmentFilter('all');
              setPopularOnlyFilter(false);
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-full bg-[#4F6F52] text-white text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matchingRestaurants.map((restaurant) => {
            const nearest = restaurant.nearbyBusStops?.[0];
            const prepTime = restaurant.averageFoodPrepMinutes || 20;

            return (
              <div
                key={restaurant.id}
                className="bg-white rounded-3xl border border-[#E8E6E1] overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-400/50 transition-all duration-300 flex flex-col group cursor-pointer"
                onClick={() => onSelectTravelRestaurant(restaurant, {
                  route: currentRoute,
                  busStop: nearest ? VERIFIED_BUS_STOPS.find(s => s.name === nearest.stopName) : undefined,
                  fulfillmentType: fulfillmentFilter !== 'all' ? fulfillmentFilter : 'dine_in'
                })}
              >
                {/* Hero Image */}
                <div className="relative h-52 w-full overflow-hidden bg-[#FAF9F6]">
                  <img
                    src={restaurant.heroImage}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700"
                    loading="lazy"
                  />

                  {/* Rating */}
                  <div className="absolute top-3.5 right-3.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#2C3333] flex items-center gap-1 shadow-sm border border-[#E8E6E1]">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{restaurant.rating}</span>
                  </div>

                  {/* ⭐ Popular Travel Stop Badge */}
                  {restaurant.isPopularTravelStop && (
                    <div 
                      className="absolute top-3.5 left-3.5 bg-amber-500 text-stone-950 font-bold px-3 py-1 rounded-full text-[10px] tracking-wide flex items-center gap-1.5 shadow-md border border-amber-300"
                      title="Frequently selected by travelling passengers"
                    >
                      <span>⭐</span>
                      <span>Popular Travel Stop</span>
                    </div>
                  )}

                  {/* Travel Badges Bar on Image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                    <div className="bg-[#2C3333]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-md">
                      <Bus className="w-3 h-3 text-amber-300" />
                      <span>{nearest ? `${nearest.distanceKm} km from ${nearest.stopName.split(' ')[0]}` : 'Highway Route'}</span>
                    </div>
                    
                    <div className="bg-emerald-600/90 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md">
                      ⚡ {prepTime}m Fresh Prep
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold font-serif text-[#2C3333] group-hover:text-[#4F6F52] transition-colors">
                        {restaurant.name}
                      </h3>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                      {restaurant.tagline}
                    </p>

                    {/* Verified Bus Stop Details Card */}
                    {nearest && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-[11px]">
                        <div className="flex items-center justify-between font-bold text-amber-950">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="truncate">{nearest.stopName}</span>
                          </span>
                          <span className="text-xs text-amber-900 font-extrabold shrink-0 ml-1">
                            {nearest.distanceKm} km away
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-stone-600">
                          <span>{nearest.highwayRoute}</span>
                          <span className="font-semibold text-emerald-800">
                            ~{nearest.walkingOrTransitTimeMin} min transit/walk
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Supported Services Badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                        🍽️ Dine-In Reserved
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold flex items-center gap-1">
                        🥡 Express Parcel
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-medium">
                        ₹{restaurant.costForTwo} for 2
                      </span>
                    </div>

                    {/* Popular Dish */}
                    <div className="mt-3 pt-2.5 border-t border-[#E8E6E1] text-[11px] text-stone-600 flex items-center gap-1.5">
                      <span className="text-amber-800 font-bold uppercase tracking-wider text-[9px]">Travel Favorite:</span>
                      <span className="truncate font-medium">{restaurant.popularDishes[0]}</span>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <div className="mt-4 pt-3 border-t border-[#E8E6E1] flex items-center justify-between gap-2">
                    {onViewMenu && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewMenu(restaurant);
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6E1] text-[#2C3333] border border-[#E8E6E1] text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5 text-[#4F6F52]" />
                        <span>Menu</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTravelRestaurant(restaurant, {
                          route: currentRoute,
                          busStop: nearest ? VERIFIED_BUS_STOPS.find(s => s.name === nearest.stopName) : undefined,
                          fulfillmentType: fulfillmentFilter !== 'all' ? fulfillmentFilter : 'dine_in'
                        });
                      }}
                      className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
                    >
                      <Bus className="w-3.5 h-3.5" />
                      <span>Book for Travel</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
