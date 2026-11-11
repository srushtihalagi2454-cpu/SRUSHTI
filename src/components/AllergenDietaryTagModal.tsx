import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  ChefHat, 
  Check, 
  Sparkles, 
  User, 
  Info,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { MenuItem, AllergenSeverity } from '../types';
import { 
  COMMON_ALLERGENS, 
  SPECIAL_DIETARY_OPTIONS 
} from '../services/allergenSafetyService';

export interface DietaryTagFormData {
  intendedFor: string;
  dietaryTag: string;
  allergenTags: string[];
  severity: AllergenSeverity;
  kitchenNotes: string;
}

interface AllergenDietaryTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem;
  initialData?: Partial<DietaryTagFormData>;
  onSave: (data: DietaryTagFormData) => void;
  suggestedGuests?: string[];
}

export const AllergenDietaryTagModal: React.FC<AllergenDietaryTagModalProps> = ({
  isOpen,
  onClose,
  item,
  initialData,
  onSave,
  suggestedGuests = ['Guest 1', 'Guest 2', 'Guest 3', 'Guest 4'],
}) => {
  const [intendedFor, setIntendedFor] = useState<string>(
    initialData?.intendedFor || suggestedGuests[0] || 'Guest 1'
  );
  const [dietaryTag, setDietaryTag] = useState<string>(
    initialData?.dietaryTag || (item.isJain ? 'Jain' : item.isGlutenFree ? 'Gluten-Free' : item.dietary === 'vegan' ? 'Vegan' : 'Standard')
  );
  const [allergenTags, setAllergenTags] = useState<string[]>(
    initialData?.allergenTags || []
  );
  const [severity, setSeverity] = useState<AllergenSeverity>(
    initialData?.severity || (allergenTags.length > 0 ? 'severe' : 'preference')
  );
  const [kitchenNotes, setKitchenNotes] = useState<string>(
    initialData?.kitchenNotes || ''
  );

  if (!isOpen) return null;

  const toggleAllergen = (shortLabel: string) => {
    setAllergenTags((prev) => {
      const exists = prev.includes(shortLabel);
      const next = exists ? prev.filter((t) => t !== shortLabel) : [...prev, shortLabel];
      // Automatically elevate severity if first allergen added
      if (!exists && prev.length === 0 && severity === 'preference') {
        setSeverity('severe');
      }
      return next;
    });
  };

  const handleQuickNote = (noteSnippet: string) => {
    setKitchenNotes((prev) => {
      if (!prev) return noteSnippet;
      if (prev.includes(noteSnippet)) return prev;
      return `${prev}, ${noteSnippet}`;
    });
  };

  const handleSave = () => {
    onSave({
      intendedFor: intendedFor.trim() || 'Guest 1',
      dietaryTag: dietaryTag || 'Standard',
      allergenTags,
      severity,
      kitchenNotes: kitchenNotes.trim(),
    });
    onClose();
  };

  const hasSpecialPrep = allergenTags.length > 0 || (dietaryTag && dietaryTag !== 'Standard') || kitchenNotes.trim().length > 0;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        id="allergen-dietary-modal"
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-serif text-white">
                  Kitchen Dietary & Allergen Safety Tag
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Kitchen Prep
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Customizing: <span className="font-semibold text-white">{item.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/50">
          {/* Section 1: Who is this dish intended for? */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-600" />
                Who is this dish intended for at the table?
              </label>
              <span className="text-[10px] text-stone-600">Personalized per diner</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestedGuests.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setIntendedFor(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    intendedFor === g
                      ? 'bg-amber-100 text-amber-900 border-2 border-amber-500 font-bold shadow-2xs'
                      : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                  }`}
                >
                  👤 {g}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <input
                type="text"
                value={intendedFor}
                onChange={(e) => setIntendedFor(e.target.value)}
                placeholder="Or type diner's name (e.g., Rahul, Priya, Auntie, Kid)"
                className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white text-stone-900"
              />
            </div>
            <p className="text-[11px] text-stone-600 italic">
              Helps kitchen and waitstaff ensure the right dish reaches the right person without cross-contamination.
            </p>
          </div>

          {/* Section 2: Dietary Preparation */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-emerald-600" />
                Special Dietary Preparation Required
              </label>
              <span className="text-[10px] text-stone-600">Recipe adjustment</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDietaryTag('Standard')}
                className={`p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer border ${
                  dietaryTag === 'Standard'
                    ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="block font-bold">Standard</span>
                <span className="text-[10px] opacity-80 block">Standard recipe</span>
              </button>

              {SPECIAL_DIETARY_OPTIONS.map((diet) => (
                <button
                  key={diet.id}
                  type="button"
                  onClick={() => setDietaryTag(diet.tag)}
                  className={`p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer border ${
                    dietaryTag === diet.tag
                      ? 'bg-emerald-700 text-white border-emerald-700 font-semibold shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span className="block font-bold">{diet.tag}</span>
                  <span className="text-[10px] opacity-80 block truncate">{diet.label}</span>
                </button>
              ))}
            </div>

            {dietaryTag && dietaryTag !== 'Standard' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Kitchen Instruction: </span>
                  {SPECIAL_DIETARY_OPTIONS.find((d) => d.tag === dietaryTag)?.kitchenInstruction ||
                    'Prepare with customized dietary ingredients.'}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Allergen Restrictions (Zero Cross-Contact) */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Allergen Restrictions (Select all that apply)
              </label>
              <span className="text-[10px] text-rose-600 font-semibold">Zero Cross-Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_ALLERGENS.map((alg) => {
                const isSelected = allergenTags.includes(alg.shortLabel);
                return (
                  <div
                    key={alg.id}
                    onClick={() => toggleAllergen(alg.shortLabel)}
                    className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium shadow-2xs ring-1 ring-rose-400'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100/80'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'border-stone-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-2" />}
                    </div>
                    <div>
                      <div className="font-bold">{alg.label}</div>
                      <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                        {alg.riskDescription}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Allergy Severity Level */}
          {allergenTags.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Allergy Severity & Cross-Contamination Urgency
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSeverity('severe')}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    severity === 'severe'
                      ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span className="block text-xs font-bold">🚨 Severe / Anaphylaxis</span>
                  <span className="text-[10px] opacity-90 block mt-0.5">
                    Strict zero-trace. Sanitize woks, ladles & gloves.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeverity('intolerance')}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    severity === 'intolerance'
                      ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span className="block text-xs font-bold">⚠️ Intolerance / Sensitive</span>
                  <span className="text-[10px] opacity-90 block mt-0.5">
                    Omit allergen ingredients. Separate cook space.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeverity('preference')}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    severity === 'preference'
                      ? 'bg-stone-800 text-white border-stone-800 font-bold shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span className="block text-xs font-bold">🌿 Lifestyle / Preference</span>
                  <span className="text-[10px] opacity-90 block mt-0.5">
                    Standard kitchen modification without emergency protocol.
                  </span>
                </button>
              </div>

              {severity === 'severe' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Severe Allergy Protocol Activated: </span>
                    Kitchen display will flash a high-priority red alert. Chef must sanitize cookware and use non-contaminated oils.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 5: Specific Kitchen Prep Notes */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-stone-700" />
              Kitchen Chef Preparation Note (Printed on KDS Queue)
            </label>

            <textarea
              rows={2}
              value={kitchenNotes}
              onChange={(e) => setKitchenNotes(e.target.value)}
              placeholder="e.g., Strictly no cashew nut paste, clean pan before cooking, do not brush with butter..."
              className="w-full p-3 text-xs bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white text-stone-900"
            />

            {/* Quick helper prompts */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
                Quick Chef Instructions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Clean wok/pan before cooking',
                  'Strictly zero cashew or nut paste',
                  'No butter or ghee brushing',
                  'Separate fryer oil',
                  'Dedicated clean ladle',
                  'No onion or garlic',
                ].map((snip) => (
                  <button
                    key={snip}
                    type="button"
                    onClick={() => handleQuickNote(snip)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] rounded-lg border border-stone-200 transition-colors cursor-pointer"
                  >
                    + {snip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-stone-200 flex items-center justify-between gap-3">
          <div className="text-xs">
            {hasSpecialPrep ? (
              <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                Special prep instructions armed for {intendedFor}
              </span>
            ) : (
              <span className="text-stone-500">Standard restaurant preparation</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-dietary-tag-btn"
              onClick={handleSave}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save Dietary & Allergen Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
