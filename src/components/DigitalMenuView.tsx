import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  Clock, 
  MapPin, 
  Star, 
  QrCode, 
  Leaf, 
  Flame, 
  ChevronRight,
  ArrowLeft,
  CalendarCheck,
  Wheat,
  Nut,
  Egg,
  HeartHandshake
} from 'lucide-react';
import { Restaurant, MenuItem, DietaryType } from '../types';
import { getDishFallbackImage } from '../data/restaurantMenus';
import { getCustomizedMenu, subscribeToMenuChanges } from '../services/menuService';
import { getFormattedOperatingHours } from '../utils/operatingHours';
import { FoodRateBadge } from './FoodRateBadge';

interface DigitalMenuViewProps {
  restaurant: Restaurant;
  isOpen?: boolean;
  onClose: () => void;
  onOpenBooking?: () => void;
  onOpenMenuQr?: () => void;
}

export type DietaryFilterOption = 
  | 'all' 
  | 'veg' 
  | 'vegan' 
  | 'jain' 
  | 'egg' 
  | 'gluten-free' 
  | 'contains-nuts' 
  | 'non-veg' 
  | 'chef-specials';

export const DigitalMenuView: React.FC<DigitalMenuViewProps> = ({
  restaurant,
  isOpen = true,
  onClose,
  onOpenBooking,
  onOpenMenuQr,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilterOption>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showTablesideQr, setShowTablesideQr] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lock background body scroll when full-screen menu is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Live customized menu state synced with restaurant manager edits
  const [menu, setMenu] = useState(() =>
    getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines)
  );

  useEffect(() => {
    setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
    const unsubscribe = subscribeToMenuChanges((detail) => {
      if (!detail?.restaurantId || detail.restaurantId === restaurant.id) {
        setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
      }
    });
    return unsubscribe;
  }, [restaurant.id, restaurant.name, restaurant.cuisines]);

  const operatingHoursDisplay = useMemo(() => {
    return getFormattedOperatingHours(restaurant.openingHours);
  }, [restaurant.openingHours]);

  // Flatten all items for total counts
  const allMenuItems = useMemo(() => {
    const items: MenuItem[] = [];
    menu.categories.forEach((cat) => items.push(...cat.items));
    return items;
  }, [menu]);

  // Filtered categories & items based on search query, dietary filter, and category tab
  const filteredCategories = useMemo(() => {
    return menu.categories
      .map((cat) => {
        // If specific category is selected and not 'all', skip other categories
        if (activeCategory !== 'all' && cat.name !== activeCategory) {
          return null;
        }

        const filteredItems = cat.items.filter((item) => {
          // 1. Dietary Filtering
          if (dietaryFilter === 'veg' && item.dietary !== 'veg' && item.dietary !== 'vegan') {
            return false;
          }
          if (dietaryFilter === 'vegan' && item.dietary !== 'vegan') {
            return false;
          }
          if (dietaryFilter === 'non-veg' && item.dietary !== 'non-veg') {
            return false;
          }
          if (dietaryFilter === 'jain') {
            const hasJainTag = item.dietaryTags?.some((t) => t.toLowerCase().includes('jain'));
            if (!item.isJain && !hasJainTag) return false;
          }
          if (dietaryFilter === 'egg') {
            const hasEggTag = item.dietaryTags?.some((t) => t.toLowerCase().includes('egg'));
            if (!item.hasEgg && !hasEggTag) return false;
          }
          if (dietaryFilter === 'gluten-free') {
            const hasGfTag = item.dietaryTags?.some((t) => t.toLowerCase().includes('gluten'));
            if (!item.isGlutenFree && !hasGfTag) return false;
          }
          if (dietaryFilter === 'contains-nuts') {
            const hasNutsTag = item.dietaryTags?.some((t) => t.toLowerCase().includes('nut'));
            if (!item.containsNuts && !hasNutsTag) return false;
          }
          if (dietaryFilter === 'chef-specials') {
            if (!item.isChefSpecial && !item.isBestseller) return false;
          }

          // 2. Search Query Filtering
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = item.name.toLowerCase().includes(q);
            const matchDesc = item.description.toLowerCase().includes(q);
            const matchCat = item.category.toLowerCase().includes(q);
            const matchTags = (item.dietaryTags || []).some((tag) => tag.toLowerCase().includes(q));
            if (!matchName && !matchDesc && !matchCat && !matchTags) return false;
          }

          return true;
        });

        if (filteredItems.length === 0) return null;

        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter(Boolean) as typeof menu.categories;
  }, [menu, searchQuery, dietaryFilter, activeCategory]);

  const totalVisibleItems = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [filteredCategories]);

  // Scroll to category smoothly if in 'all' view
  const handleSelectCategory = (catName: string) => {
    setActiveCategory(catName);
    if (catName !== 'all') {
      // Find element and scroll
      setTimeout(() => {
        const el = document.getElementById(`category-section-${catName.replace(/[^a-zA-Z0-9]/g, '-')}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  if (isOpen === false) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-[#FAF9F6] text-[#2C3333] flex flex-col transition-opacity duration-200"
      id={`digital-menu-fullscreen-${restaurant.id}`}
      tabIndex={-1}
    >
      {/* ========================================================
          1. TOP RESTAURANT HEADER (Sticky, Premium, Informative)
         ======================================================== */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E8E6E1] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            
            {/* Left: Prominent Back Button + Restaurant Meta */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full border border-[#E8E6E1] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#2C3333] transition-colors cursor-pointer shrink-0 shadow-2xs group"
                id="btn-back-from-menu"
                title="Back to Restaurants"
              >
                <ArrowLeft className="w-4 h-4 text-[#2C3333] group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Back</span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52] bg-[#4F6F52]/10 px-2.5 py-0.5 rounded-full border border-[#4F6F52]/20">
                    Digital Restaurant Menu
                  </span>
                  <span className="text-[10px] font-medium text-[#2C3333]/50 hidden md:inline">
                    {menu.lastUpdated}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif text-[#2C3333] mt-0.5 truncate tracking-tight">
                  {restaurant.name}
                </h1>
              </div>
            </div>

            {/* Right: Quick Actions (Scan QR, Reserve Table, Close) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => {
                  if (onOpenMenuQr) {
                    onOpenMenuQr();
                  } else {
                    setShowTablesideQr(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full border border-[#E8E6E1] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#2C3333] transition-colors cursor-pointer shadow-2xs"
                title="Scan to View Menu"
                id={`btn-scan-to-view-menu-${restaurant.id}`}
              >
                <QrCode className="w-4 h-4 text-[#4F6F52]" />
                <span className="hidden sm:inline">Scan to View Menu</span>
                <span className="sm:hidden text-[11px]">Menu QR</span>
              </button>

              {onOpenBooking && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenBooking();
                  }}
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  id="btn-reserve-table-top"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-white/90" />
                  <span>Reserve Table</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-full text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-[#E8E6E1]"
                id="btn-close-digital-menu"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* Restaurant Subtitle Meta Details (Location, Rating, Hours, Cuisines) */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 sm:gap-x-4 text-xs text-[#2C3333]/70 mt-2 pt-2 border-t border-[#E8E6E1]/60">
            <span className="flex items-center gap-1 font-medium text-[#2C3333]">
              <MapPin className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
              <span>{restaurant.neighborhood}, {restaurant.city}</span>
            </span>

            <span className="text-[#2C3333]/30 hidden sm:inline">•</span>

            <span className="flex items-center gap-1 text-[#4F6F52] font-medium">
              <span>{restaurant.cuisines.join(' · ')}</span>
            </span>

            <span className="text-[#2C3333]/30 hidden sm:inline">•</span>

            <span className="flex items-center gap-1 font-semibold text-[#2C3333]">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>{restaurant.rating}</span>
              <span className="text-[#2C3333]/50 font-normal">({restaurant.reviewCount} reviews)</span>
            </span>

            <span className="text-[#2C3333]/30 hidden md:inline">•</span>

            <span className="flex items-center gap-1 text-[#2C3333]/80">
              <Clock className="w-3.5 h-3.5 text-[#4F6F52] shrink-0" />
              <span>Hours: {operatingHoursDisplay}</span>
            </span>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. MAIN MENU CONTENT (Spacious, Full Screen, Natural Scroll)
         ======================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 2A. Subtle Environmental Zero-Paper Dining Banner */}
        <div className="bg-[#4F6F52]/8 border border-[#4F6F52]/20 rounded-2xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-xs text-[#4F6F52]">
            <div className="w-6 h-6 rounded-full bg-[#4F6F52]/15 flex items-center justify-center shrink-0">
              <Leaf className="w-3.5 h-3.5 text-[#4F6F52]" />
            </div>
            <div>
              <strong className="font-semibold text-[#2C3333]">Zero-Paper Dining:</strong>{' '}
              <span className="text-[#2C3333]/80">View the menu digitally and skip the printed menu. Real-time kitchen availability with allergens and spices.</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (onOpenMenuQr) {
                onOpenMenuQr();
              } else {
                setShowTablesideQr(true);
              }
            }}
            className="text-xs font-bold text-[#4F6F52] hover:text-[#2C3333] hover:underline cursor-pointer shrink-0 flex items-center gap-1 transition-colors pl-8 sm:pl-0"
          >
            <span>Open tableside QR</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* 2B. Prominent Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#2C3333]/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search dishes, ingredients, starters, curries, desserts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-11 py-3 bg-white border border-[#E8E6E1] rounded-2xl text-sm text-[#2C3333] placeholder-[#2C3333]/45 shadow-xs outline-none focus:border-[#4F6F52] focus:ring-1 focus:ring-[#4F6F52] transition-all"
            id="menu-dish-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#2C3333]/40 hover:text-[#2C3333] cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2C. Dietary Preference Filters Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#2C3333]/60">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#2C3333]/50">
              Dietary Preferences
            </span>
            <span className="font-medium text-[11px]">
              Showing {totalVisibleItems} {totalVisibleItems === 1 ? 'dish' : 'dishes'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
            {/* All */}
            <button
              onClick={() => setDietaryFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'all'
                  ? 'bg-[#2C3333] text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              All ({allMenuItems.length})
            </button>

            {/* Vegetarian */}
            <button
              onClick={() => setDietaryFilter('veg')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'veg'
                  ? 'bg-[#4F6F52] text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-xs border border-emerald-600 flex items-center justify-center p-0.5 bg-white">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </span>
              <span>Vegetarian</span>
            </button>

            {/* Vegan */}
            <button
              onClick={() => setDietaryFilter('vegan')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'vegan'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vegan</span>
            </button>

            {/* Jain */}
            <button
              onClick={() => setDietaryFilter('jain')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'jain'
                  ? 'bg-[#2C3333] text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 text-amber-500" />
              <span>Jain</span>
            </button>

            {/* Egg */}
            <button
              onClick={() => setDietaryFilter('egg')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'egg'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              <Egg className="w-3.5 h-3.5 text-amber-600" />
              <span>Egg</span>
            </button>

            {/* Gluten-Free */}
            <button
              onClick={() => setDietaryFilter('gluten-free')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'gluten-free'
                  ? 'bg-[#2C3333] text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              <Wheat className="w-3.5 h-3.5 text-amber-600" />
              <span>Gluten-Free</span>
            </button>

            {/* Contains Nuts */}
            <button
              onClick={() => setDietaryFilter('contains-nuts')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'contains-nuts'
                  ? 'bg-[#2C3333] text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              <Nut className="w-3.5 h-3.5 text-stone-600" />
              <span>Contains Nuts</span>
            </button>

            {/* Non-Veg */}
            <button
              onClick={() => setDietaryFilter('non-veg')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'non-veg'
                  ? 'bg-rose-900 text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-xs border border-rose-600 flex items-center justify-center p-0.5 bg-white">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              </span>
              <span>Non-Veg</span>
            </button>

            {/* Chef Specials */}
            <button
              onClick={() => setDietaryFilter('chef-specials')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                dietaryFilter === 'chef-specials'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-[#2C3333]/80 hover:bg-[#E8E6E1]/50 border border-[#E8E6E1]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Chef Specials</span>
            </button>
          </div>
        </div>

        {/* 2D. Category Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSelectCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#4F6F52] text-white shadow-xs'
                  : 'text-[#2C3333]/70 hover:text-[#2C3333] hover:bg-[#FAF9F6]'
              }`}
            >
              All Categories
            </button>
            {menu.categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleSelectCategory(cat.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.name
                    ? 'bg-[#4F6F52] text-white shadow-xs'
                    : 'text-[#2C3333]/70 hover:text-[#2C3333] hover:bg-[#FAF9F6]'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === cat.name ? 'bg-white/20 text-white' : 'bg-[#E8E6E1] text-[#2C3333]/60'
                }`}>
                  {cat.items.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2E. Food Menu Items Content (Natural, Expansive Grid) */}
        <div className="space-y-10 pt-2 pb-12">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <section 
                key={category.name} 
                id={`category-section-${category.name.replace(/[^a-zA-Z0-9]/g, '-')}`}
                className="space-y-4 scroll-mt-28"
              >
                {/* Category Header */}
                <div className="border-b border-[#E8E6E1] pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#2C3333]">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="text-xs sm:text-sm text-[#2C3333]/65 mt-0.5">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[#2C3333]/50 shrink-0">
                    {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Responsive Food Card Grid: 1 col on mobile, 2 cols on tablet, 2-3 cols on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between group ${
                        item.isOutOfStock
                          ? 'border-rose-200 bg-stone-50/75 opacity-85'
                          : 'border-[#E8E6E1] hover:border-[#4F6F52]/50 hover:shadow-md'
                      }`}
                      id={`menu-item-${item.id}`}
                    >
                      {/* Top Food Photography Image */}
                      {item.imageUrl && (
                        <div className="relative h-48 w-full overflow-hidden bg-[#FAF9F6]">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.dataset.triedFallback) {
                                target.dataset.triedFallback = 'true';
                                target.src = getDishFallbackImage(item);
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                          {/* Top Left Dietary Icon */}
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs p-1.5 rounded-lg shadow-sm">
                            {item.dietary === 'vegan' ? (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[10px]">VEGAN</span>
                              </div>
                            ) : item.dietary === 'veg' ? (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <span className="w-3 h-3 rounded-xs border border-emerald-600 flex items-center justify-center p-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                </span>
                                <span className="text-[10px]">VEG</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                <span className="w-3 h-3 rounded-xs border border-rose-600 flex items-center justify-center p-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                </span>
                                <span className="text-[10px]">NON-VEG</span>
                              </div>
                            )}
                          </div>

                          {/* Top Right Badges (Out of Stock / Chef Special / Bestseller) */}
                          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                            {item.isOutOfStock ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Out of Stock
                              </span>
                            ) : (
                              <>
                                {item.isChefSpecial && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Chef Special
                                  </span>
                                )}
                                {item.isBestseller && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                                    Bestseller
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Price Overlay on Image bottom right */}
                          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl shadow-md border border-white/80">
                            <FoodRateBadge item={item} size="sm" showLabel={false} />
                          </div>
                        </div>
                      )}

                      {/* Card Body */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {/* If no image was present, fallback top row with icons and price */}
                          {!item.imageUrl && (
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                {item.dietary === 'vegan' ? (
                                  <Leaf className="w-4 h-4 text-emerald-600" />
                                ) : item.dietary === 'veg' ? (
                                  <span className="w-3.5 h-3.5 rounded-xs border border-emerald-600 flex items-center justify-center p-0.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                  </span>
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-xs border border-rose-600 flex items-center justify-center p-0.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                                  </span>
                                )}

                                {item.isOutOfStock ? (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                    <span>Out of Stock</span>
                                  </span>
                                ) : item.isChefSpecial ? (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    Chef Special
                                  </span>
                                ) : null}
                              </div>

                              <FoodRateBadge item={item} size="sm" showLabel={false} />
                            </div>
                          )}

                          {/* Dish Name & Food Rate Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`text-lg font-bold font-serif leading-snug transition-colors ${
                              item.isOutOfStock 
                                ? 'text-stone-600 line-through decoration-rose-400' 
                                : 'text-[#2C3333] group-hover:text-[#4F6F52]'
                            }`}>
                              {item.name}
                            </h3>
                            {item.isOutOfStock ? (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                Unavailable
                              </span>
                            ) : (
                              <FoodRateBadge item={item} size="sm" showLabel={false} className="shrink-0 sm:hidden" />
                            )}
                          </div>

                          {/* Food Rate Badge with Actual Rate / Discount Rate */}
                          <div className="mt-2 py-1 border-y border-[#FAF9F6]">
                            <FoodRateBadge item={item} size="md" showLabel={true} />
                          </div>

                          {/* Description */}
                          <p className="text-xs sm:text-sm text-[#2C3333]/75 mt-1.5 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Dietary Tags Pill Badges */}
                          {item.dietaryTags && item.dietaryTags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-3">
                              {item.dietaryTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-semibold text-[#2C3333]/70 bg-[#FAF9F6] border border-[#E8E6E1] px-2 py-0.5 rounded-md"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: Spice Level & Portion */}
                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#FAF9F6] text-xs text-[#2C3333]/60">
                          <div className="flex items-center gap-3">
                            {item.spiceLevel && (
                              <span className="flex items-center gap-1">
                                <Flame className={`w-3.5 h-3.5 ${
                                  item.spiceLevel === 'Spicy' ? 'text-rose-500' : 'text-amber-500'
                                }`} />
                                <span>{item.spiceLevel}</span>
                              </span>
                            )}
                            {item.portionSize && (
                              <span>{item.portionSize}</span>
                            )}
                          </div>

                          {item.isOutOfStock ? (
                            <span className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">
                              Kitchen: Out of Stock
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#4F6F52] font-semibold">
                              Authentic Recipe
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            /* Empty State */
            <div className="text-center py-20 px-4 bg-white rounded-3xl border border-[#E8E6E1] shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] flex items-center justify-center mx-auto mb-3 text-[#2C3333]/40">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-serif text-[#2C3333]">No dishes match your filters</h3>
              <p className="text-xs sm:text-sm text-[#2C3333]/60 mt-1 max-w-md mx-auto leading-relaxed">
                Try searching for a different dish name, or select "All" in the dietary preference filters above to browse the full culinary catalog.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDietaryFilter('all');
                  setActiveCategory('all');
                }}
                className="mt-5 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#2C3333] hover:bg-[#4F6F52] rounded-full transition-colors cursor-pointer shadow-xs"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* 2E-2. What Diners Say / Reviews Section */}
        {restaurant.reviews && restaurant.reviews.length > 0 && (
          <section className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 shadow-xs space-y-5" id="digital-menu-reviews-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8E6E1]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-serif font-bold text-[#2C3333]">
                    What Diners Say
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6F52] bg-[#4F6F52]/10 px-2.5 py-0.5 rounded-full border border-[#4F6F52]/20">
                    Verified Reviews
                  </span>
                </div>
                <p className="text-xs text-[#2C3333]/60 mt-1">
                  Authentic feedback from verified guests at {restaurant.name}
                </p>
              </div>

              {/* Prominent Star Rating */}
              <div className="flex items-center gap-3 bg-[#FAF9F6] px-4 py-2 rounded-2xl border border-[#E8E6E1] self-start sm:self-auto">
                <div className="flex items-center gap-1.5">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                  <span className="text-lg font-bold text-[#2C3333]">{restaurant.rating}</span>
                  <span className="text-xs text-[#2C3333]/50">/ 5.0</span>
                </div>
                <div className="h-4 w-px bg-[#E8E6E1]" />
                <span className="text-xs font-medium text-[#2C3333]/70">
                  {restaurant.reviewCount.toLocaleString()} reviews
                </span>
              </div>
            </div>

            {/* 2-3 Review Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {restaurant.reviews.map((rev, idx) => (
                <div
                  key={idx}
                  className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E8E6E1] flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-[#2C3333]/85 italic leading-relaxed">
                      "{rev.comment || rev.quote}"
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#E8E6E1]/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#2C3333]">
                      — {rev.author}
                    </span>
                    <span className="text-[10px] text-[#4F6F52] font-medium bg-[#4F6F52]/10 px-2 py-0.5 rounded-full">
                      Verified Diner
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2F. Bottom Reservation Banner */}
        <div className="bg-white rounded-3xl border border-[#E8E6E1] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div>
            <div className="inline-block text-[10px] font-bold uppercase tracking-widest text-[#4F6F52] bg-[#4F6F52]/10 px-2.5 py-0.5 rounded-full mb-1">
              Table Reservation Ready
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#2C3333]">
              Experience {restaurant.name} live
            </h3>
            <p className="text-xs sm:text-sm text-[#2C3333]/70 mt-1 max-w-xl">
              Choose your exact table position with FlashTable 2D visual floor plan. Instant confirmation with zero paper waste.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {onOpenBooking && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBooking();
                }}
                className="flex-1 md:flex-none px-6 py-3 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                id="btn-reserve-table-bottom"
              >
                <span>Reserve Table</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-3 rounded-full border border-[#E8E6E1] hover:bg-[#FAF9F6] text-[#2C3333] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Back to Explore
            </button>
          </div>
        </div>

      </main>

      {/* ========================================================
          3. TABLESIDE MENU QR MODAL (Realistic Black on White QR)
         ======================================================== */}
      {showTablesideQr && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowTablesideQr(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#E8E6E1] shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52] bg-[#4F6F52]/10 px-2.5 py-0.5 rounded-full">
                Paperless Menu QR
              </span>
              <button 
                onClick={() => setShowTablesideQr(false)}
                className="p-1 text-[#2C3333]/50 hover:text-[#2C3333] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-bold font-serif text-[#2C3333]">
                {restaurant.name}
              </h3>
              <p className="text-xs text-[#2C3333]/60 mt-1">
                Scan with any phone camera to view this live digital menu tableside
              </p>
            </div>

            {/* Realistic Black QR on White Background */}
            <div className="p-4 bg-white rounded-2xl border-2 border-[#E8E6E1] inline-block mx-auto shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://flashtable.app/menu/${restaurant.id}`)}`}
                alt={`${restaurant.name} Digital Menu QR`}
                className="w-48 h-48 rounded-lg mx-auto"
              />
            </div>

            <p className="text-[11px] text-[#2C3333]/60 font-light">
              Zero-Paper Dining • Live ingredients & real-time kitchen updates
            </p>

            <button
              onClick={() => setShowTablesideQr(false)}
              className="w-full py-2.5 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
            >
              Return to Menu
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
