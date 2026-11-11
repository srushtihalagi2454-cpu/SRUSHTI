import { FoodOrderItem, FoodOrder, AllergenSeverity } from '../types';

export interface AllergenOption {
  id: string;
  label: string;
  shortLabel: string;
  icon?: string;
  riskDescription: string;
}

export const COMMON_ALLERGENS: AllergenOption[] = [
  {
    id: 'nuts',
    label: 'Peanuts & Tree Nuts (Cashew/Badam)',
    shortLabel: 'Nut-Free',
    riskDescription: 'Common in rich Indian gravies, pastes & garnishes. High risk of anaphylaxis.',
  },
  {
    id: 'dairy',
    label: 'Dairy & Lactose (Ghee/Butter/Paneer/Cream)',
    shortLabel: 'Dairy-Free',
    riskDescription: 'Present in butter gravies, naan brushing, paneer and curd marinades.',
  },
  {
    id: 'gluten',
    label: 'Gluten & Wheat (Maida/Atta/Roti)',
    shortLabel: 'Gluten-Free',
    riskDescription: 'Present in tandoori rotis, naans, samosas, batters and certain soy sauces.',
  },
  {
    id: 'soy',
    label: 'Soy & Soya Chunks',
    shortLabel: 'Soy-Free',
    riskDescription: 'Present in Manchurian woks, soya chaap, and Asian stir-fries.',
  },
  {
    id: 'eggs',
    label: 'Eggs & Egg Wash',
    shortLabel: 'Egg-Free',
    riskDescription: 'Present in baked flatbreads, desserts, noodles, and batters.',
  },
  {
    id: 'shellfish',
    label: 'Fish & Crustaceans / Shellfish',
    shortLabel: 'Seafood-Free',
    riskDescription: 'Strictly separate oils and pans required to avoid seafood protein transfer.',
  },
  {
    id: 'sesame',
    label: 'Sesame Seeds (Til)',
    shortLabel: 'Sesame-Free',
    riskDescription: 'Used in naan toppings, coastal gravies, and oriental sauces.',
  },
  {
    id: 'mustard',
    label: 'Mustard (Sarson / Rai)',
    shortLabel: 'Mustard-Free',
    riskDescription: 'Common tempering oil and paste in North and East Indian cooking.',
  },
];

export interface DietaryOption {
  id: string;
  label: string;
  tag: string;
  kitchenInstruction: string;
}

export const SPECIAL_DIETARY_OPTIONS: DietaryOption[] = [
  {
    id: 'jain',
    label: 'Jain Preparation',
    tag: 'Jain',
    kitchenInstruction: 'Strictly NO onion, garlic, potatoes, carrots, beetroot or underground roots. Dedicated clean ladle.',
  },
  {
    id: 'vegan',
    label: 'Vegan Preparation',
    tag: 'Vegan',
    kitchenInstruction: 'Zero dairy, ghee, butter, paneer, cream or honey. Use cold-pressed oil.',
  },
  {
    id: 'gluten_free',
    label: 'Gluten-Free / Celiac',
    tag: 'Gluten-Free',
    kitchenInstruction: 'Zero wheat/maida. Wipe station & use dedicated gluten-free cookware to prevent cross-contact.',
  },
  {
    id: 'dairy_free',
    label: 'Dairy-Free / Lactose-Free',
    tag: 'Dairy-Free',
    kitchenInstruction: 'No butter, ghee, cream or malai. Substitute with oil or plant-based emulsion.',
  },
  {
    id: 'sattvic',
    label: 'Sattvic / Pure Veg',
    tag: 'Sattvic',
    kitchenInstruction: 'Pure vegetarian without onion, garlic or heavy fermentation.',
  },
  {
    id: 'halal',
    label: 'Halal Prepared',
    tag: 'Halal',
    kitchenInstruction: 'Prepared according to Halal culinary standards.',
  },
  {
    id: 'diabetic',
    label: 'Low Carb / No Added Sugar',
    tag: 'Diabetic-Friendly',
    kitchenInstruction: 'Strictly zero added sugar, syrups or sweet thickeners in curries.',
  },
];

/**
 * Checks if a dish item has any active dietary or allergen flags.
 */
export function hasSpecialPrepRequirements(item: FoodOrderItem): boolean {
  const hasAllergens = Array.isArray(item.allergenTags) && item.allergenTags.length > 0;
  const hasDietary = Boolean(item.dietaryTag && item.dietaryTag !== 'None' && item.dietaryTag !== 'Standard');
  const hasNotes = Boolean(item.kitchenNotes && item.kitchenNotes.trim().length > 0);
  const hasSevere = item.severity === 'severe';
  return hasAllergens || hasDietary || hasNotes || hasSevere;
}

/**
 * Computes an overall allergen summary for an entire food order.
 */
export function computeOrderAllergenSummary(items: FoodOrderItem[]): {
  hasAllergenAlert: boolean;
  allergenSummary: string[];
  severeCount: number;
  distinctDietaryTags: string[];
  dinerDietaryBreakdown: { diner: string; requirements: string[] }[];
} {
  const summaryList: string[] = [];
  let severeCount = 0;
  const dietarySet = new Set<string>();
  const dinerMap = new Map<string, Set<string>>();

  (items || []).forEach((item) => {
    const diner = item.intendedFor?.trim() || 'Guest';
    if (!dinerMap.has(diner)) {
      dinerMap.set(diner, new Set());
    }
    const currentDinerReqs = dinerMap.get(diner)!;

    if (item.severity === 'severe') {
      severeCount += 1;
    }

    if (item.dietaryTag && item.dietaryTag !== 'None' && item.dietaryTag !== 'Standard') {
      dietarySet.add(item.dietaryTag);
      currentDinerReqs.add(item.dietaryTag);
      const tagText = `${item.dietaryTag} (${diner})`;
      if (!summaryList.includes(tagText)) {
        summaryList.push(tagText);
      }
    }

    if (Array.isArray(item.allergenTags) && item.allergenTags.length > 0) {
      item.allergenTags.forEach((alg) => {
        const severityPrefix = item.severity === 'severe' ? '⚠️ Severe ' : '';
        const algText = `${severityPrefix}${alg} (${diner})`;
        currentDinerReqs.add(`${alg}${item.severity === 'severe' ? ' [Severe]' : ''}`);
        if (!summaryList.includes(algText)) {
          summaryList.push(algText);
        }
      });
    }

    if (item.kitchenNotes && item.kitchenNotes.trim()) {
      currentDinerReqs.add(`Note: ${item.kitchenNotes.trim()}`);
    }
  });

  const dinerDietaryBreakdown = Array.from(dinerMap.entries())
    .filter(([_, reqs]) => reqs.size > 0)
    .map(([diner, reqs]) => ({
      diner,
      requirements: Array.from(reqs),
    }));

  return {
    hasAllergenAlert: summaryList.length > 0 || severeCount > 0,
    allergenSummary: summaryList,
    severeCount,
    distinctDietaryTags: Array.from(dietarySet),
    dinerDietaryBreakdown,
  };
}

const KITCHEN_ACK_PREFIX = 'ft_kitchen_allergen_ack_';

/**
 * Check if kitchen staff has acknowledged the allergen safety protocol for an order
 */
export function isKitchenAllergenAcknowledged(orderId: string): boolean {
  if (typeof window === 'undefined' || !orderId) return false;
  try {
    return localStorage.getItem(`${KITCHEN_ACK_PREFIX}${orderId}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persist kitchen staff acknowledgment of allergen protocol
 */
export function setKitchenAllergenAcknowledged(orderId: string, ack: boolean): void {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    if (ack) {
      localStorage.setItem(`${KITCHEN_ACK_PREFIX}${orderId}`, 'true');
    } else {
      localStorage.removeItem(`${KITCHEN_ACK_PREFIX}${orderId}`);
    }
  } catch (e) {
    console.warn('Could not save kitchen allergen acknowledgment to localStorage', e);
  }
}
