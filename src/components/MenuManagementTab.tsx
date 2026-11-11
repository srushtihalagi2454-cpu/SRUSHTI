import React, { useState, useMemo, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Trash2, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  ExternalLink,
  Flame,
  Tag,
  Sparkles,
  PackageX,
  PackageCheck,
  Filter
} from 'lucide-react';
import { Restaurant, MenuItem, DietaryType } from '../types';
import { 
  getCustomizedMenu, 
  deleteRestaurantMenuItem, 
  toggleRestaurantMenuItemStock,
  resetRestaurantMenuToDefaults,
  subscribeToMenuChanges
} from '../services/menuService';
import { AddMenuItemModal } from './AddMenuItemModal';
import { FoodRateBadge } from './FoodRateBadge';

interface MenuManagementTabProps {
  restaurant: Restaurant;
  onOpenDigitalMenu?: () => void;
  onToast?: (message: string) => void;
}

export const MenuManagementTab: React.FC<MenuManagementTabProps> = ({
  restaurant,
  onOpenDigitalMenu,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | DietaryType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load menu dynamically
  const [menu, setMenu] = useState(() => 
    getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines)
  );

  // Sync menu on external updates or edits
  useEffect(() => {
    const refresh = () => {
      setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
    };
    refresh();
    const unsubscribe = subscribeToMenuChanges((detail) => {
      if (!detail?.restaurantId || detail.restaurantId === restaurant.id) {
        refresh();
      }
    });
    return unsubscribe;
  }, [restaurant.id, restaurant.name, restaurant.cuisines]);

  // Extract all categories
  const categoriesList = useMemo(() => {
    return menu.categories.map((c) => c.name);
  }, [menu]);

  // Flatten all items
  const allItems = useMemo(() => {
    const list: MenuItem[] = [];
    menu.categories.forEach((cat) => {
      cat.items.forEach((item) => list.push(item));
    });
    return list;
  }, [menu]);

  // Inventory stats
  const totalItemsCount = allItems.length;
  const outOfStockCount = allItems.filter((i) => i.isOutOfStock).length;
  const inStockCount = totalItemsCount - outOfStockCount;

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Stock status filter
      if (stockFilter === 'in_stock' && item.isOutOfStock) {
        return false;
      }
      if (stockFilter === 'out_of_stock' && !item.isOutOfStock) {
        return false;
      }
      // Dietary filter
      if (dietaryFilter !== 'all' && item.dietary !== dietaryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCat = item.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [allItems, selectedCategory, stockFilter, dietaryFilter, searchQuery]);

  // Handlers
  const handleToggleStock = (item: MenuItem) => {
    const nextState = toggleRestaurantMenuItemStock(restaurant.id, item.id);
    const msg = nextState 
      ? `"${item.name}" is now marked OUT OF STOCK` 
      : `"${item.name}" is now marked IN STOCK`;
    if (onToast) onToast(msg);
    setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
  };

  const handleDeleteItem = (item: MenuItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}" from the menu?`)) {
      deleteRestaurantMenuItem(restaurant.id, item.id);
      if (onToast) onToast(`"${item.name}" removed from menu.`);
      setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
    }
  };

  const handleResetMenu = () => {
    if (window.confirm(`Reset ${restaurant.name}'s menu to default items and clear inventory changes?`)) {
      resetRestaurantMenuToDefaults(restaurant.id);
      if (onToast) onToast('Menu inventory reset to defaults.');
      setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150" id="section-menu-management">
      {/* Top Banner & Metric Snapshot */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E6E1] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#4F6F521A] text-[#4F6F52]">
                Kitchen & Inventory
              </span>
              <span className="text-xs text-[#2C3333]/50">
                • {menu.lastUpdated}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#2C3333] mt-1">
              Menu Items & Stock Availability
            </h3>
            <p className="text-xs text-[#2C3333]/60 mt-0.5 max-w-2xl">
              Add new kitchen specials, delete old items, and toggle out-of-stock items in real time. Changes immediately update the Customer Digital Menu and Pre-Order Cart.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
              id="btn-add-menu-item"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dish</span>
            </button>

            {onOpenDigitalMenu && (
              <button
                type="button"
                onClick={onOpenDigitalMenu}
                className="px-3.5 py-2.5 bg-white hover:bg-[#FAF9F6] border border-[#E8E6E1] text-[#2C3333] text-xs font-bold uppercase tracking-wider rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Preview full customer-facing digital menu"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#4F6F52]" />
                <span>View Digital Menu</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetMenu}
              className="p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
              title="Reset menu to default template"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Total Menu Dishes
              </span>
              <span className="text-2xl font-bold font-serif text-[#2C3333] mt-0.5 block">
                {totalItemsCount}
              </span>
              <span className="text-[11px] text-stone-500">Across {categoriesList.length} categories</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8E6E1] flex items-center justify-center text-[#4F6F52]">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                In Stock & Ready
              </span>
              <span className="text-2xl font-bold font-serif text-emerald-950 mt-0.5 block">
                {inStockCount}
              </span>
              <span className="text-[11px] text-emerald-700">Available to diners</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            outOfStockCount > 0 
              ? 'bg-rose-50/70 border-rose-200' 
              : 'bg-stone-50 border-stone-200'
          }`}>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                outOfStockCount > 0 ? 'text-rose-800' : 'text-stone-500'
              }`}>
                Out of Stock
              </span>
              <span className={`text-2xl font-bold font-serif mt-0.5 block ${
                outOfStockCount > 0 ? 'text-rose-900' : 'text-stone-700'
              }`}>
                {outOfStockCount}
              </span>
              <span className="text-[11px] text-stone-500">
                {outOfStockCount > 0 ? 'Unavailable for ordering' : 'All dishes in stock'}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-2xl bg-white border flex items-center justify-center ${
              outOfStockCount > 0 ? 'border-rose-200 text-rose-600' : 'border-stone-200 text-stone-400'
            }`}>
              <PackageX className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E6E1] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dish by name, ingredients, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[#E8E6E1] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-xs text-[#2C3333]"
            />
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl self-start md:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                stockFilter === 'all'
                  ? 'bg-[#2C3333] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({totalItemsCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              In Stock ({inStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                stockFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
          </div>
        </div>

        {/* Category & Dietary Filters Row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E8E6E1] flex-wrap text-xs">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl font-medium transition-colors cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-[#4F6F52] text-white font-bold'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              All Categories
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#4F6F52] text-white font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dietary dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-stone-500 font-semibold">Diet:</span>
            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] text-xs font-medium text-[#2C3333] focus:outline-none"
            >
              <option value="all">All Diets</option>
              <option value="veg">Vegetarian</option>
              <option value="non-veg">Non-Veg</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dishes Cards Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                item.isOutOfStock
                  ? 'bg-stone-50/90 border-rose-200 opacity-90 shadow-2xs'
                  : 'bg-white border-[#E8E6E1] hover:border-[#4F6F52]/40 shadow-xs'
              }`}
            >
              <div className="space-y-3">
                {/* Header: Dietary Dot + Category + Out of Stock Alert */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Dietary indicator dot */}
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                      item.dietary === 'veg' 
                        ? 'border-emerald-600' 
                        : item.dietary === 'vegan'
                        ? 'border-teal-600'
                        : 'border-rose-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        item.dietary === 'veg' 
                          ? 'bg-emerald-600' 
                          : item.dietary === 'vegan'
                          ? 'bg-teal-600'
                          : 'bg-rose-600'
                      }`} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 truncate max-w-[140px]">
                      {item.category}
                    </span>
                  </div>

                  {/* Stock Status Badge */}
                  {item.isOutOfStock ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>Out of Stock</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>In Stock</span>
                    </span>
                  )}
                </div>

                {/* Dish Name & Food Rate */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <h4 className={`text-base font-bold font-serif ${
                      item.isOutOfStock ? 'text-stone-700 line-through decoration-rose-400' : 'text-[#2C3333]'
                    }`}>
                      {item.name}
                    </h4>
                    <FoodRateBadge item={item} size="md" showLabel={true} className="shrink-0" />
                  </div>

                  <p className="text-xs text-[#2C3333]/70 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Dietary Tags Pills */}
                {item.dietaryTags && item.dietaryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.dietaryTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium bg-[#FAF9F6] text-stone-600 border border-[#E8E6E1] px-2 py-0.2 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Action Footer: Toggle Stock + Delete */}
              <div className="mt-4 pt-3 border-t border-[#E8E6E1] flex items-center justify-between gap-2">
                {/* Stock Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleStock(item)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    item.isOutOfStock
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      : 'bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-800 border border-stone-200 hover:border-rose-300'
                  }`}
                  title={item.isOutOfStock ? 'Mark this dish as available' : 'Mark dish unavailable'}
                >
                  {item.isOutOfStock ? (
                    <>
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Mark In Stock</span>
                    </>
                  ) : (
                    <>
                      <PackageX className="w-3.5 h-3.5 text-stone-500" />
                      <span>Mark Out of Stock</span>
                    </>
                  )}
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item)}
                  className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title={`Delete "${item.name}" from menu`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white p-12 rounded-3xl border border-[#E8E6E1] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 mx-auto flex items-center justify-center text-stone-400">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold font-serif text-[#2C3333]">
            No Dishes Found
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all'
              ? 'No dishes match your active filters. Try adjusting your search query or reset filters.'
              : 'No menu items have been added to this restaurant yet.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStockFilter('all');
              setDietaryFilter('all');
            }}
            className="text-xs text-[#4F6F52] font-bold hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {isAddModalOpen && (
        <AddMenuItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          existingCategories={categoriesList}
          onItemAdded={(newItem) => {
            if (onToast) onToast(`"${newItem.name}" added to menu successfully!`);
            setMenu(getCustomizedMenu(restaurant.id, restaurant.name, restaurant.cuisines));
          }}
        />
      )}
    </div>
  );
};
