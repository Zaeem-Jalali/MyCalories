export type FoodSearchResult = {
  id: string;
  name: string;
  brand?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

type OffProduct = {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
};

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const url = new URL("https://world.openfoodfacts.org/api/v2/search");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("page_size", "20");
  url.searchParams.set(
    "fields",
    "code,product_name,brands,nutriments",
  );

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open Food Facts search failed: ${response.status}`);
  }

  const data: { products?: OffProduct[] } = await response.json();

  return (data.products ?? [])
    .filter((product) => product.product_name && product.nutriments?.["energy-kcal_100g"] != null)
    .map((product) => ({
      id: product.code,
      name: product.product_name as string,
      brand: product.brands,
      caloriesPer100g: product.nutriments?.["energy-kcal_100g"] ?? 0,
      proteinPer100g: product.nutriments?.proteins_100g ?? 0,
      carbsPer100g: product.nutriments?.carbohydrates_100g ?? 0,
      fatPer100g: product.nutriments?.fat_100g ?? 0,
    }));
}
