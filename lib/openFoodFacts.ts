export type FoodSearchResult = {
  id: string;
  name: string;
  brand?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  // Declared package size in grams (or ml, treated as ~1g/ml), when the
  // product listing has it — lets us default the amount instead of
  // forcing the user to guess it from a bare per-100g number.
  packageGrams?: number;
};

type OffProduct = {
  code: string;
  product_name?: string;
  brands?: string;
  product_quantity?: number | string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
};

function toResult(product: OffProduct): FoodSearchResult {
  const packageGrams = product.product_quantity
    ? Number(product.product_quantity)
    : undefined;

  return {
    id: product.code,
    name: product.product_name as string,
    brand: product.brands,
    caloriesPer100g: product.nutriments?.["energy-kcal_100g"] ?? 0,
    proteinPer100g: product.nutriments?.proteins_100g ?? 0,
    carbsPer100g: product.nutriments?.carbohydrates_100g ?? 0,
    fatPer100g: product.nutriments?.fat_100g ?? 0,
    packageGrams:
      packageGrams && packageGrams > 0 ? packageGrams : undefined,
  };
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const url = new URL("https://world.openfoodfacts.org/api/v2/search");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("page_size", "20");
  url.searchParams.set(
    "fields",
    "code,product_name,brands,product_quantity,nutriments",
  );

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open Food Facts search failed: ${response.status}`);
  }

  const data: { products?: OffProduct[] } = await response.json();

  return (data.products ?? [])
    .filter((product) => product.product_name && product.nutriments?.["energy-kcal_100g"] != null)
    .map(toResult);
}

export async function getProductByBarcode(
  barcode: string,
): Promise<FoodSearchResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=code,product_name,brands,product_quantity,nutriments`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open Food Facts lookup failed: ${response.status}`);
  }

  const data: { status: number; product?: OffProduct } = await response.json();
  if (data.status !== 1 || !data.product || !data.product.product_name) {
    return null;
  }

  return toResult(data.product);
}
