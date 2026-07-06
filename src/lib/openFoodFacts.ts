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

const openFoodFactsOrigin = 'https://world.openfoodfacts.org'
const openFoodFactsDevProxyPrefix = '/__openfoodfacts'

const getProductLookupPath = (barcode: string) => {
  const pathname = `/api/v2/product/${encodeURIComponent(barcode)}.json`
  const query = `fields=${encodeURIComponent(requestedFields)}`

  return `${pathname}?${query}`
}

const getDevProxyProductLookupUrl = (barcode: string) =>
  `${openFoodFactsDevProxyPrefix}/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(requestedFields)}`

const getDirectProductLookupUrl = (barcode: string) =>
  `${openFoodFactsOrigin}${getProductLookupPath(barcode)}`

const getLookupCandidates = (barcode: string) =>
  import.meta.env.DEV
    ? [getDevProxyProductLookupUrl(barcode), getDirectProductLookupUrl(barcode)]
    : [getDirectProductLookupUrl(barcode)]

const importantNutrients: Array<{
  id: string
  label: string
  unit: string
  indent?: boolean
}> = [
  { id: 'fat_100g', label: 'Fat', unit: 'g' },
  { id: 'saturated-fat_100g', label: 'of which saturates', unit: 'g', indent: true },
  { id: 'carbohydrates_100g', label: 'Carbohydrate', unit: 'g' },
  { id: 'sugars_100g', label: 'of which sugars', unit: 'g', indent: true },
  { id: 'proteins_100g', label: 'Protein', unit: 'g' },
  { id: 'salt_100g', label: 'Salt', unit: 'g' },
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

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1)

const buildEnergyRow = (
  nutriments: Record<string, number | string | undefined> | undefined,
): NutrientValue => {
  const kilojoules = readNumber(nutriments?.['energy-kj_100g'])
  const kilocalories = readNumber(nutriments?.['energy-kcal_100g'])

  const parts: string[] = []
  if (kilojoules !== null) {
    parts.push(`${formatNumber(kilojoules)} kJ`)
  }
  if (kilocalories !== null) {
    parts.push(`${formatNumber(kilocalories)} kcal`)
  }

  return {
    id: 'energy',
    label: 'Energy',
    unit: '',
    value: kilocalories,
    text: parts.length > 0 ? parts.join(' / ') : null,
  }
}

const buildNutrients = (
  nutriments: Record<string, number | string | undefined> | undefined,
): NutrientValue[] => [
  buildEnergyRow(nutriments),
  ...importantNutrients.map((nutrient) => ({
    ...nutrient,
    value:
      nutriments && nutrient.id in nutriments
        ? readNumber(nutriments[nutrient.id])
        : null,
  })),
]

const buildMissingProductDetails = (barcode: string): ProductDetails => ({
  barcode,
  name: null,
  ingredients: null,
  brands: null,
  imageUrl: null,
  nutrients: buildNutrients(undefined),
  isProductFound: false,
})

export async function fetchProductDetails(
  barcode: string,
): Promise<ProductDetails> {
  let lastErrorStatus: number | null = null
  let lastError: Error | null = null

  for (const url of getLookupCandidates(barcode)) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        const data = (await response.json()) as OpenFoodFactsResponse
        const product = data.product

        return {
          barcode: data.code ?? barcode,
          name:
            product?.product_name?.trim() ||
            product?.generic_name?.trim() ||
            null,
          ingredients: product?.ingredients_text?.trim() || null,
          brands: product?.brands?.trim() || null,
          imageUrl: product?.image_url?.trim() || null,
          nutrients: buildNutrients(product?.nutriments),
          isProductFound: data.status === 1,
        }
      }

      lastErrorStatus = response.status
    } catch (error) {
      lastError = error instanceof Error ? error : null
    }
  }

  if (lastErrorStatus === 404) {
    return buildMissingProductDetails(barcode)
  }

  throw new Error(
    lastErrorStatus
      ? `Open Food Facts could not be reached right now (HTTP ${lastErrorStatus}). Please try again shortly.`
      : lastError?.message
        ? `Open Food Facts could not be reached right now (${lastError.message}). Please try again shortly.`
      : 'Open Food Facts could not be reached right now. Please try again shortly.',
  )
}
