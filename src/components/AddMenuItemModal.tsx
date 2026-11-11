import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  UtensilsCrossed, 
  Sparkles, 
  Check, 
  Flame, 
  Tag, 
  IndianRupee,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { MenuItem, DietaryType } from '../types';
import { addRestaurantMenuItem } from '../services/menuService';

interface AddMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  existingCategories: string[];
  onItemAdded: (item: MenuItem) => void;
}

const COMMON_TAG_OPTIONS = [
  'Chef Special',
  'Bestseller',
  'Jain Option',
  'Gluten-Free',
  'Contains Nuts',
  'Has Egg',
  'Organic',
  'Seasonal Special'
];

export const AddMenuItemModal: React.FC<AddMenuItemModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  existingCategories,
  onItemAdded,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [actualPrice, setActualPrice] = useState<string>('450');
  const [discountPrice, setDiscountPrice] = useState<string>('350');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    existingCategories[0] || 'Starters & Small Plates'
  );
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCat, setIsCustomCat] = useState(false);

  const [dietary, setDietary] = useState<DietaryType>('veg');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Chef Special']);
  const [spiceLevel, setSpiceLevel] = useState<'Mild' | 'Medium' | 'Spicy'>('Medium');
  const [portionSize, setPortionSize] = useState('Serves 2');
  const [isOutOfStock, setIsOutOfStock] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter a dish name.');
      return;
    }

    const numActual = parseFloat(actualPrice);
    const numDiscount = parseFloat(discountPrice);

    if (isNaN(numActual) || numActual <= 0) {
      setErrorMsg('Please enter a valid Actual Rate in ₹.');
      return;
    }

    if (isNaN(numDiscount) || numDiscount <= 0) {
      setErrorMsg('Please enter a valid Discount Rate in ₹.');
      return;
    }

    const finalCategory = isCustomCat 
      ? (customCategory.trim() || 'House Specials')
      : selectedCategory;

    const newItem = addRestaurantMenuItem(restaurantId, {
      name: name.trim(),
      description: description.trim() || `${name.trim()} prepared fresh to order with house-crafted spices.`,
      price: Math.round(numDiscount),
      actualPrice: Math.round(numActual),
      discountPrice: Math.round(numDiscount),
      category: finalCategory,
      dietary,
      isChefSpecial: selectedTags.includes('Chef Special'),
      isBestseller: selectedTags.includes('Bestseller'),
      isJain: selectedTags.includes('Jain Option'),
      isGlutenFree: selectedTags.includes('Gluten-Free'),
      containsNuts: selectedTags.includes('Contains Nuts'),
      hasEgg: selectedTags.includes('Has Egg'),
      dietaryTags: selectedTags,
      spiceLevel,
      portionSize: portionSize.trim() || 'Serves 2',
      isOutOfStock,
      imageUrl: imageUrl.trim() || undefined,
    });

    onItemAdded(newItem);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E8E6E1] overflow-hidden my-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-item-title"
      >
        {/* Header */}
        <div className="bg-[#2C3333] text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6F52] flex items-center justify-center text-white shadow-xs">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-add-item-title" className="text-lg sm:text-xl font-serif font-bold text-[#FAF9F6]">
                Add Dish to Menu
              </h2>
              <p className="text-xs text-stone-300">
                {restaurantName} • Live Kitchen Catalog
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="p-3 mx-5 mt-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Dish Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80 mb-1.5">
              Dish Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Truffle Mushroom Kulcha, Smoked Lamb Chops"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-sm text-[#2C3333]"
            />
          </div>

          {/* Food Rate: Left Side Actual Rate / Discount Rate Grid */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333]">
                Food Rate (Left Side Actual Rate / Discount Rate)
              </span>
              <span className="text-[10px] text-stone-500 font-semibold">
                Format: Actual / Discount
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left Side: Actual Rate */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-stone-500" />
                  <span>Left Side: Actual Rate (₹) *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="450"
                    value={actualPrice}
                    onChange={(e) => setActualPrice(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-sm font-bold text-stone-700"
                  />
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">Original Standard / MRP Rate</span>
              </div>

              {/* Right Side: Discount Rate */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4F6F52] mb-1.5 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#4F6F52]" />
                  <span>Right Side: Discount Rate (₹) *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#4F6F52]">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="350"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-sm font-bold text-[#4F6F52]"
                  />
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">Special Flash Discount Offer</span>
              </div>
            </div>

            {/* Live Pricing Preview */}
            <div className="pt-2 border-t border-[#E8E6E1] flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-stone-500">Live Rate Format Preview:</span>
              <div className="flex items-center gap-1.5 font-serif font-bold">
                <span className="line-through text-stone-600 text-xs">₹{actualPrice || '0'}</span>
                <span className="text-stone-400">/</span>
                <span className="text-emerald-700 text-sm">₹{discountPrice || '0'}</span>
                {parseFloat(actualPrice) > parseFloat(discountPrice) && (
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-sans">
                    {Math.round(((parseFloat(actualPrice) - parseFloat(discountPrice)) / parseFloat(actualPrice)) * 100)}% OFF
                  </span>
                )}
              </div>
            </div>
          </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80 mb-1.5">
                Category *
              </label>
              {!isCustomCat ? (
                <div className="space-y-1.5">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomCat(true);
                      } else {
                        setSelectedCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-sm text-[#2C3333]"
                  >
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ Add New Category...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New category name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-sm text-[#2C3333]"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomCat(false)}
                    className="text-xs text-stone-500 hover:text-stone-800 underline px-1 cursor-pointer shrink-0"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>

          {/* Dietary Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80 mb-1.5">
              Dietary Classification *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDietary('veg')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  dietary === 'veg'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                    : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2C3333]/70 hover:bg-stone-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
                <span>Vegetarian</span>
              </button>

              <button
                type="button"
                onClick={() => setDietary('non-veg')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  dietary === 'non-veg'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-2xs'
                    : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2C3333]/70 hover:bg-stone-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-rose-600 ring-2 ring-rose-200" />
                <span>Non-Veg</span>
              </button>

              <button
                type="button"
                onClick={() => setDietary('vegan')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  dietary === 'vegan'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-2xs'
                    : 'bg-[#FAF9F6] border-[#E8E6E1] text-[#2C3333]/70 hover:bg-stone-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-teal-600 ring-2 ring-teal-200" />
                <span>Vegan</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80 mb-1.5">
              Description & Ingredients
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Smoked tandoori paneer skewers tossed with crushed coriander seeds and Kashmiri red chillies."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-sm text-[#2C3333] leading-relaxed resize-none"
            />
          </div>

          {/* Spice & Portion Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80 mb-1.5 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Spice Level</span>
              </label>
              <select
                value={spiceLevel}
                onChange={(e) => setSpiceLevel(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-sm text-[#2C3333]"
              >
                <option value="Mild">Mild (Gentle & fragrant)</option>
                <option value="Medium">Medium (Balanced heat)</option>
                <option value="Spicy">Spicy (Traditional Indian kick)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80 mb-1.5">
                Portion Size
              </label>
              <input
                type="text"
                placeholder="e.g. Serves 2, 4 Pieces"
                value={portionSize}
                onChange={(e) => setPortionSize(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6F52] text-sm text-[#2C3333]"
              />
            </div>
          </div>

          {/* Dietary & Allergen Badges / Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3333]/80 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Safety & Dietary Tags</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAG_OPTIONS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#2C3333] text-white shadow-2xs'
                        : 'bg-[#FAF9F6] text-stone-700 border border-[#E8E6E1] hover:bg-stone-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Initial Inventory & Availability Toggle */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-950 block">
                Availability Status
              </span>
              <p className="text-[11px] text-amber-900/75 mt-0.5">
                {isOutOfStock ? 'Dish will be listed as "Out of Stock" immediately' : 'Dish will be available to order'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOutOfStock(!isOutOfStock)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isOutOfStock
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-emerald-600 text-white shadow-2xs'
              }`}
            >
              {isOutOfStock ? 'Out of Stock' : 'In Stock'}
            </button>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E6E1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dish to Menu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
