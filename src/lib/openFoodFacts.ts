import type { NutrientValue, ProductDetails } from '../types'

const requestedFields = [
  'code',
  'product_name',
  'generic_name',
  'ingredients_text',
  'brands',
  'image_url',
  'nutriments',
].join(',')

const importantNutrients: Array<{
  id: string
  label: string
  unit: string
}> = [
  { id: 'energy-kcal_100g', label: 'Energy', unit: 'kcal' },
  { id: 'fat_100g', label: 'Fat', unit: 'g' },
  { id: 'sugars_100g', label: 'Sugars', unit: 'g' },
  { id: 'salt_100g', label: 'Salt', unit: 'g' },
  { id: 'proteins_100g', label: 'Protein', unit: 'g' },
]

interface OpenFoodFactsProduct {
  product_name?: string
  generic_name?: string
  ingredients_text?: string
  brands?: string
  image_url?: string
  nutriments?: Record<string, number | string | undefined>
}

interface OpenFoodFactsResponse {
  code?: string
  product?: OpenFoodFactsProduct
  status: 0 | 1
}

const readNumber = (value: number | string | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  return null
}

const buildNutrients = (
  nutriments: Record<string, number | string | undefined> | undefined,
): NutrientValue[] =>
  importantNutrients.map((nutrient) => ({
    ...nutrient,
    value:
      nutriments && nutrient.id in nutriments
        ? readNumber(nutriments[nutrient.id])
        : null,
  }))

export async function fetchProductDetails(
  barcode: string,
): Promise<ProductDetails> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${requestedFields}`,
  )

  if (!response.ok) {
    throw new Error(
      'Open Food Facts could not be reached right now. Please try again shortly.',
    )
  }

  const data = (await response.json()) as OpenFoodFactsResponse
  const product = data.product

  return {
    barcode: data.code ?? barcode,
    name: product?.product_name?.trim() || product?.generic_name?.trim() || null,
    ingredients: product?.ingredients_text?.trim() || null,
    brands: product?.brands?.trim() || null,
    imageUrl: product?.image_url?.trim() || null,
    nutrients: buildNutrients(product?.nutriments),
    isProductFound: data.status === 1,
  }
}
