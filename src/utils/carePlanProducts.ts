import type { StoredCareRoutineItem } from '@/composables/useCareRoutinePlan';

export interface CarePlanProduct {
    id: string;
    name: string;
    category: string;
    categoryKey: string;
    ingredients: string[];
    image: string;
}

const INGREDIENT_ALIASES: Record<string, string[]> = {
    minoxidil: ['minoxidil', '米诺地尔'],
    biotin: ['biotin', '生物素'],
    ketoconazole: ['ketoconazole', '酮康唑'],
    'salicylic acid': ['salicylic', 'salicylic acid', '水杨酸'],
    'zinc pyrithione': ['zinc pyrithione', 'zinc', '吡硫翁锌'],
    'caffeine': ['caffeine', '咖啡因'],
    'finasteride': ['finasteride', '非那雄胺'],
    'omega-3': ['omega-3', 'omega 3', 'fish oil', '鱼油', 'dha', 'epa'],
    'vitamin d': ['vitamin d', '维生素d', 'vit d'],
    'iron': ['iron', '铁', 'ferritin'],
    'peptide': ['peptide', 'peptides', '铜肽', 'peptide complex'],
    'rosemary': ['rosemary', '迷迭香'],
    'niacinamide': ['niacinamide', '烟酰胺'],
};

export const CARE_PRODUCT_CATALOG: CarePlanProduct[] = [
    {
        id: 'p1',
        name: 'Regrowth Minoxidil 5% Topical Solution',
        category: 'Topical treatment',
        categoryKey: 'routine.productCategoryTopical',
        ingredients: ['minoxidil'],
        image: '/static/routine/product1.png',
    },
    {
        id: 'p2',
        name: 'Scalp Recovery Ketoconazole Shampoo',
        category: 'Shampoo',
        categoryKey: 'routine.productCategoryShampoo',
        ingredients: ['ketoconazole', 'salicylic acid'],
        image: '/static/routine/product2.png',
    },
    {
        id: 'p3',
        name: 'Clarifying Salicylic Scalp Wash',
        category: 'Shampoo',
        categoryKey: 'routine.productCategoryShampoo',
        ingredients: ['salicylic acid', 'zinc pyrithione'],
        image: '/static/routine/product3.png',
    },
    {
        id: 'p4',
        name: 'Hair Density Biotin + Vitamin D Supplement',
        category: 'Supplement',
        categoryKey: 'routine.productCategorySupplement',
        ingredients: ['biotin', 'vitamin d', 'iron'],
        image: '/static/routine/product4.png',
    },
    {
        id: 'p5',
        name: 'Omega-3 + Iron Hair Support',
        category: 'Supplement',
        categoryKey: 'routine.productCategorySupplement',
        ingredients: ['omega-3', 'iron'],
        image: '/static/routine/product5.png',
    },
    {
        id: 'p6',
        name: 'Caffeine + Rosemary Root Serum',
        category: 'Serum',
        categoryKey: 'routine.productCategorySerum',
        ingredients: ['caffeine', 'rosemary', 'niacinamide'],
        image: '/static/routine/product1.png',
    },
    {
        id: 'p7',
        name: 'Peptide Scalp Renewal Serum',
        category: 'Serum',
        categoryKey: 'routine.productCategorySerum',
        ingredients: ['peptide', 'niacinamide', 'caffeine'],
        image: '/static/routine/product2.png',
    },
];

function normalizeIngredient(value: string): string {
    return value.toLowerCase().trim();
}

export function extractRecommendedIngredients(items: StoredCareRoutineItem[]): string[] {
    const ingredientItems = items.filter((item) => item.period === 'ingredient');
    const source = ingredientItems.length ? ingredientItems : items;
    const names = source.map((item) => item.name).filter(Boolean);
    return [...new Set(names)];
}

function productMatchesIngredient(product: CarePlanProduct, ingredientLabel: string): boolean {
    const needle = normalizeIngredient(ingredientLabel);
    return product.ingredients.some((key) => {
        const aliases = INGREDIENT_ALIASES[key] || [key];
        return aliases.some((alias) => needle.includes(normalizeIngredient(alias)) || normalizeIngredient(alias).includes(needle));
    });
}

export function productCoversAllIngredients(product: CarePlanProduct, ingredients: string[]): boolean {
    if (!ingredients.length) return false;
    return ingredients.every((ingredient) => productMatchesIngredient(product, ingredient));
}

export function productMatchedIngredients(product: CarePlanProduct, ingredients: string[]): string[] {
    return ingredients.filter((ingredient) => productMatchesIngredient(product, ingredient));
}

export function groupProductsByPlanIngredients(
    items: StoredCareRoutineItem[],
): {
    ingredients: string[];
    fullMatch: CarePlanProduct[];
    partialMatch: { product: CarePlanProduct; matched: string[] }[];
} {
    const ingredients = extractRecommendedIngredients(items);
    const fullMatch = CARE_PRODUCT_CATALOG.filter((product) => productCoversAllIngredients(product, ingredients));
    const partialMatch = CARE_PRODUCT_CATALOG
        .filter((product) => !productCoversAllIngredients(product, ingredients))
        .map((product) => ({
            product,
            matched: productMatchedIngredients(product, ingredients),
        }))
        .filter((entry) => entry.matched.length > 0);

    return { ingredients, fullMatch, partialMatch };
}

export const PRODUCT_LOG_STORAGE_KEY = 'care_plan_logged_products';

export function loadLoggedProductIds(): string[] {
    try {
        const raw = uni.getStorageSync(PRODUCT_LOG_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
}

export function saveLoggedProductIds(ids: string[]) {
    try {
        uni.setStorageSync(PRODUCT_LOG_STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
        console.warn('[carePlanProducts] save failed', e);
    }
}
