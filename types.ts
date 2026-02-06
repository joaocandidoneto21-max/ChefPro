
export type Unit = 'kg' | 'g' | 'L' | 'ml' | 'un';

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  packageSize: number;
  packagePrice: number;
  pricePerUnit: number;
  lastPriceChange?: number; // Percentual de mudança
  usageFrequency?: number; // Vezes usado
  category?: string;
}

export interface RecipeItem {
  ingredientId: string;
  amount: number;
  percentage: number;
}

export interface NutritionData {
  calories: number;
  carbs: number;
  protein: number;
  fats: number;
  fiber: number;
  sodium: number;
}

export interface SaleRecord {
  date: string;
  quantity: number;
  totalValue: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  items: RecipeItem[];
  fillingItems?: RecipeItem[];
  sauceItems?: RecipeItem[];
  laborTime: number;
  laborHourlyRate: number;
  otherExpenses: number;
  markup: number;
  yield: number; // Peso Total
  quantity: number; // Qtd Unidades
  weightPerUnit: number;
  instructions: string;
  nutrition?: NutritionData;
  salesHistory?: SaleRecord[];
  createdAt: string;
}
